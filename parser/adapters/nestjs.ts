import {
  Node,
  type ClassDeclaration,
  type Decorator,
  type Expression,
  type SourceFile,
} from "ts-morph"

import type { AdapterFile, FrameworkAdapter } from "../adapter"
import { ROLE } from "../taxonomy"
import type { Route } from "../types"
import type { Manifest } from "./manifests"

const SUFFIX_ROLES: Record<string, string> = {
  controller: ROLE.controllers,
  service: ROLE.services,
  module: ROLE.modules,
  entity: ROLE.entities,
  dto: ROLE.dtos,
  guard: ROLE.guards,
  interceptor: ROLE.interceptors,
  pipe: ROLE.pipes,
  filter: ROLE.filters,
  middleware: ROLE.middleware,
}
const SUFFIX = /\.([a-z]+)\.[cm]?[jt]s$/

const METHOD_DECORATORS: Record<string, string> = {
  Get: "GET",
  Post: "POST",
  Put: "PUT",
  Patch: "PATCH",
  Delete: "DELETE",
  Head: "HEAD",
  Options: "OPTIONS",
  All: "ALL",
}

export function detectNest(manifests: readonly Manifest[]): FrameworkAdapter | null {
  const found = manifests.some(
    (manifest) =>
      manifest.dependencies.has("@nestjs/core") || manifest.dependencies.has("@nestjs/common"),
  )
  if (!found) return null
  return {
    name: "nestjs",
    excludedDirectories: () => [],
    entryPoints: () => [],
    roleOf(file) {
      const suffix = SUFFIX.exec(file.path.slice(file.path.lastIndexOf("/") + 1))
      return (suffix && SUFFIX_ROLES[suffix[1]]) || ROLE.other
    },
    routes(files) {
      const globalPrefix = readGlobalPrefix(files)
      if (globalPrefix === null) return []
      const routes: Route[] = []
      for (const file of files) {
        if (!file.source.getFullText().includes("@Controller")) continue
        routes.push(...controllerRoutes(file, globalPrefix))
      }
      return routes
    },
  }
}

// Something outside the controller can change every URL: a global prefix, URI
// versioning, or RouterModule paths. One literal prefix is read and prepended;
// anything else this code cannot fully read means no routes at all.
function readGlobalPrefix(files: readonly AdapterFile[]): string | null {
  let prefixes = 0
  let prefix = ""
  for (const file of files) {
    const text = file.source.getFullText()
    if (
      !text.includes("setGlobalPrefix") &&
      !text.includes("enableVersioning") &&
      !text.includes("RouterModule")
    ) {
      continue
    }
    for (const call of file.source.getDescendants()) {
      if (!Node.isCallExpression(call)) continue
      const callee = call.getExpression()
      const name = Node.isPropertyAccessExpression(callee) ? callee.getName() : null
      if (name === "enableVersioning") return null
      if (callee.getText() === "RouterModule.register") return null
      if (name !== "setGlobalPrefix") continue
      const args = call.getArguments()
      const value = args.length === 1 ? literalText(args[0] as Expression) : null
      if (value === null) return null
      prefixes += 1
      prefix = value
    }
  }
  return prefixes > 1 ? null : prefix
}

function controllerRoutes(file: AdapterFile, globalPrefix: string): Route[] {
  const nest = nestImports(file.source)
  const routes: Route[] = []
  for (const declaration of file.source.getClasses()) {
    const controller = declaration.getDecorators().find((item) => nestName(item, nest) === "Controller")
    if (!controller) continue
    // A class-level version changes every URL under it.
    if (declaration.getDecorators().some((item) => nestName(item, nest) === "Version")) continue
    const prefix = controllerPath(controller)
    if (prefix === null) continue
    routes.push(...methodRoutes(file.path, declaration, nest, [globalPrefix, prefix]))
  }
  return routes
}

function methodRoutes(
  file: string,
  declaration: ClassDeclaration,
  nest: ReadonlyMap<string, string>,
  prefixes: readonly string[],
): Route[] {
  const routes: Route[] = []
  for (const method of declaration.getMethods()) {
    const decorators = method.getDecorators()
    if (decorators.some((item) => nestName(item, nest) === "Version")) continue
    for (const decorator of decorators) {
      const verb = METHOD_DECORATORS[nestName(decorator, nest) ?? ""]
      if (!verb) continue
      const paths = methodPaths(decorator)
      if (!paths) continue
      for (const path of paths) {
        const pattern = joinPath([...prefixes, path])
        if (pattern) {
          routes.push({ method: verb, pattern, file, line: decorator.getStartLineNumber() })
        }
      }
    }
  }
  return routes
}

// Local name to the name exported by @nestjs/common, so an aliased import still
// reads right and a lookalike decorator from somewhere else is ignored.
function nestImports(source: SourceFile): Map<string, string> {
  const names = new Map<string, string>()
  for (const declaration of source.getImportDeclarations()) {
    if (declaration.getModuleSpecifierValue() !== "@nestjs/common") continue
    for (const specifier of declaration.getNamedImports()) {
      names.set(specifier.getAliasNode()?.getText() ?? specifier.getName(), specifier.getName())
    }
  }
  return names
}

function nestName(decorator: Decorator, nest: ReadonlyMap<string, string>): string | null {
  if (!Node.isIdentifier(decorator.getNameNode())) return null
  return nest.get(decorator.getName()) ?? null
}

function controllerPath(decorator: Decorator): string | null {
  const args = decorator.getArguments()
  if (args.length === 0) return ""
  if (args.length > 1) return null
  const [arg] = args
  const literal = literalText(arg as Expression)
  if (literal !== null) return literal
  if (!Node.isObjectLiteralExpression(arg)) return null
  let path = ""
  for (const property of arg.getProperties()) {
    if (!Node.isPropertyAssignment(property)) return null
    const name = property.getName()
    if (name === "version" || name === "host") return null
    if (name !== "path") continue
    const value = property.getInitializer()
    const text = value ? literalText(value as Expression) : null
    if (text === null) return null
    path = text
  }
  return path
}

function methodPaths(decorator: Decorator): string[] | null {
  const args = decorator.getArguments()
  if (args.length === 0) return [""]
  if (args.length > 1) return null
  const [arg] = args
  const literal = literalText(arg as Expression)
  if (literal !== null) return [literal]
  if (!Node.isArrayLiteralExpression(arg)) return null
  const paths: string[] = []
  for (const element of arg.getElements()) {
    const text = literalText(element as Expression)
    if (text === null) return null
    paths.push(text)
  }
  return paths
}

function literalText(node: Node): string | null {
  if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
    return node.getLiteralValue()
  }
  return null
}

// A doubled or trailing slash could be read either way by the router, so a
// pattern containing one is dropped rather than normalised.
function joinPath(parts: readonly string[]): string | null {
  const segments: string[] = []
  for (const part of parts) {
    if (part.includes("//") || (part.length > 1 && part.endsWith("/"))) return null
    segments.push(...part.split("/").filter((segment) => segment !== ""))
  }
  return `/${segments.join("/")}`
}
