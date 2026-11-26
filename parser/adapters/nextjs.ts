import fs from "node:fs"
import path from "node:path"
import { Node, type SourceFile } from "ts-morph"

import type { FrameworkAdapter } from "../adapter"
import { ROLE } from "../taxonomy"
import type { Route } from "../types"
import type { Manifest } from "./manifests"
import { reactRole } from "./react"

const SOURCE = "(?:[cm]?[jt]s|[jt]sx)"
const SOURCE_FILE = new RegExp(`\\.${SOURCE}$`)
const CONFIG_FILE = new RegExp(`(?:^|/)next\\.config\\.${SOURCE}$`)
const SPECIAL = new RegExp(`^(page|route|layout)\\.(?:[jt]sx?)$`)
const MIDDLEWARE = new RegExp(`^(?:src/)?(?:middleware|proxy)\\.${SOURCE}$`)
const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]
const NOT_ROUTABLE_PAGES = new Set(["_app", "_document", "_error", "404", "500"])

type NextRoot = {
  // "" for the repository root, otherwise "apps/web/".
  prefix: string
  appDirectory: string | null
  pagesDirectory: string | null
  // Config that changes which files are pages makes every path convention a guess.
  conventions: boolean
  // Config that rewrites the public URL makes a path-derived pattern wrong.
  urls: boolean
}

type Located = {
  kind: "app-page" | "app-route" | "layout" | "pages-page" | "pages-api" | "middleware"
  root: NextRoot
  segments: string[]
}

export function detectNext(
  repositoryRoot: string,
  paths: readonly string[],
  manifests: readonly Manifest[],
): FrameworkAdapter | null {
  const prefixes = new Set<string>()
  for (const manifest of manifests) {
    if (manifest.dependencies.has("next")) {
      prefixes.add(manifest.directory === "" ? "" : `${manifest.directory}/`)
    }
  }
  const configs = new Map<string, string>()
  for (const file of paths) {
    if (!CONFIG_FILE.test(file)) continue
    const slash = file.lastIndexOf("/")
    const prefix = slash === -1 ? "" : file.slice(0, slash + 1)
    prefixes.add(prefix)
    configs.set(prefix, file)
  }
  if (prefixes.size === 0) return null

  const roots: NextRoot[] = [...prefixes]
    .sort((left, right) => right.length - left.length)
    .map((prefix) => {
      const config = configs.get(prefix)
      const text = config
        ? fs.readFileSync(path.join(repositoryRoot, config), "utf8")
        : ""
      return {
        prefix,
        appDirectory: firstWithFiles(paths, [`${prefix}app/`, `${prefix}src/app/`]),
        pagesDirectory: firstWithFiles(paths, [`${prefix}pages/`, `${prefix}src/pages/`]),
        conventions: !/\bpageExtensions\b/.test(text),
        urls: !/\b(basePath|i18n|trailingSlash)\b/.test(text),
      }
    })

  // Longest prefix first, so a nested app owns its files over the repository root.
  function locate(file: string): Located | null {
    const root = roots.find((candidate) => file.startsWith(candidate.prefix))
    if (!root || !root.conventions) return null
    const relative = file.slice(root.prefix.length)
    if (MIDDLEWARE.test(relative)) return { kind: "middleware", root, segments: [] }
    const app = root.appDirectory
    if (app && file.startsWith(app)) {
      const parts = file.slice(app.length).split("/")
      const name = parts.pop() ?? ""
      const special = SPECIAL.exec(name)
      // A folder starting with an underscore is private: nothing in it is routable.
      if (!special || parts.some((part) => part.startsWith("_"))) return null
      const kind =
        special[1] === "page" ? "app-page" : special[1] === "route" ? "app-route" : "layout"
      return { kind, root, segments: parts }
    }
    const pages = root.pagesDirectory
    if (pages && file.startsWith(pages) && SOURCE_FILE.test(file)) {
      const parts = file.slice(pages.length).replace(SOURCE_FILE, "").split("/")
      if (parts[0] === "api") return { kind: "pages-api", root, segments: parts.slice(1) }
      if (parts[parts.length - 1] === "_app" || parts[parts.length - 1] === "_document") {
        return { kind: "layout", root, segments: parts }
      }
      return { kind: "pages-page", root, segments: parts }
    }
    return null
  }

  return {
    name: "nextjs",
    excludedDirectories: () => [],
    entryPoints: () => [],
    roleOf(file) {
      const where = locate(file.path)
      if (where) {
        if (where.kind === "app-page" || where.kind === "pages-page") return ROLE.pageRoutes
        if (where.kind === "app-route" || where.kind === "pages-api") return ROLE.apiEndpoints
        if (where.kind === "layout") return ROLE.layouts
        return ROLE.middleware
      }
      if (hasUseServerDirective(file.source)) return ROLE.serverActions
      return reactRole(file.path)
    },
    routes(files) {
      const routes: Route[] = []
      for (const file of files) {
        const where = locate(file.path)
        if (!where || !where.root.urls) continue
        if (where.kind === "app-page") {
          const pattern = appPattern(where.segments)
          if (pattern) routes.push({ method: "GET", pattern, file: file.path, line: 1 })
        } else if (where.kind === "app-route") {
          const pattern = appPattern(where.segments)
          if (!pattern) continue
          const exported = exportedNames(file.source)
          if (!exported) continue
          for (const method of HTTP_METHODS) {
            const line = exported.get(method)
            if (line !== undefined) routes.push({ method, pattern, file: file.path, line })
          }
        } else if (where.kind === "pages-page") {
          const last = where.segments[where.segments.length - 1]
          if (NOT_ROUTABLE_PAGES.has(last)) continue
          const segments = last === "index" ? where.segments.slice(0, -1) : where.segments
          routes.push({
            method: "GET",
            pattern: `/${segments.join("/")}`,
            file: file.path,
            line: 1,
          })
        }
        // A pages/api handler decides its method at runtime, so there is none to read.
      }
      return routes
    },
  }
}

function firstWithFiles(paths: readonly string[], candidates: readonly string[]): string | null {
  return candidates.find((directory) => paths.some((file) => file.startsWith(directory))) ?? null
}

// Route groups vanish from the URL. Parallel slots and intercepting routes
// need the rest of the tree to resolve, so they give no pattern at all.
function appPattern(segments: readonly string[]): string | null {
  const kept: string[] = []
  for (const segment of segments) {
    if (segment.startsWith("@") || segment.startsWith("(.")) return null
    if (segment.startsWith("(") && segment.endsWith(")")) continue
    kept.push(segment)
  }
  return `/${kept.join("/")}`
}

function hasUseServerDirective(source: SourceFile): boolean {
  for (const statement of source.getStatements()) {
    if (!Node.isExpressionStatement(statement)) return false
    const expression = statement.getExpression()
    if (!Node.isStringLiteral(expression)) return false
    if (expression.getLiteralValue() === "use server") return true
  }
  return false
}

// Exported names with their line. A bare `export *` could add methods this
// file does not show, so it makes the whole file unreadable: null.
function exportedNames(source: SourceFile): Map<string, number> | null {
  const names = new Map<string, number>()
  for (const declaration of source.getFunctions()) {
    const name = declaration.getName()
    if (name && declaration.isExported() && !declaration.isDefaultExport()) {
      names.set(name, declaration.getStartLineNumber())
    }
  }
  for (const statement of source.getVariableStatements()) {
    if (!statement.isExported()) continue
    for (const declaration of statement.getDeclarations()) {
      names.set(declaration.getName(), declaration.getStartLineNumber())
    }
  }
  for (const declaration of source.getExportDeclarations()) {
    if (!declaration.hasNamedExports() && !declaration.getNamespaceExport()) return null
    if (declaration.isTypeOnly()) continue
    for (const specifier of declaration.getNamedExports()) {
      if (specifier.isTypeOnly()) continue
      const exported = specifier.getAliasNode()?.getText() ?? specifier.getName()
      names.set(exported, specifier.getStartLineNumber())
    }
  }
  return names
}
