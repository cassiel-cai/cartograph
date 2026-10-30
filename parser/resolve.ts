import fs from "node:fs"
import path from "node:path"
import ts from "typescript"

import type { ExcludedDirectory } from "./types"

const EXTENSION_ALTERNATES: Record<string, readonly string[]> = {
  ".js": [".ts", ".tsx", ".d.ts"],
  ".jsx": [".tsx", ".ts"],
  ".mjs": [".mts"],
  ".cjs": [".cts"],
}

export type Location =
  | { kind: "source"; path: string }
  | { kind: "excluded"; path: string; reason: string }
  | { kind: "external"; reason: string }
  | { kind: "unresolved"; reason: string }

export type LocateContext = {
  root: string
  candidates: ReadonlyMap<string, string>
  skipped: ReadonlyMap<string, string>
  excludedDirectories: readonly ExcludedDirectory[]
  resolution: ResolutionState
}

type CachedResolution = {
  options: ts.CompilerOptions
  host: ts.ModuleResolutionHost
  cache: ts.ModuleResolutionCache
  configDirectory: string | null
}

export type ResolutionState = {
  byKey: Map<string, CachedResolution>
}

export function createResolutionState(): ResolutionState {
  return { byKey: new Map() }
}

export function locate(
  specifier: string,
  containingAbsolute: string,
  context: LocateContext,
): Location {
  if (specifier.startsWith("node:")) {
    return { kind: "external", reason: "node builtin" }
  }
  const resolvedWith = resolutionFor(
    context.root,
    containingAbsolute,
    context.resolution,
  )
  const resolved = ts.resolveModuleName(
    specifier,
    containingAbsolute,
    resolvedWith.options,
    resolvedWith.host,
    resolvedWith.cache,
  )
  const found = resolved.resolvedModule
  if (!found) {
    if (specifier.startsWith("./") || specifier.startsWith("../")) {
      const exact = locateExact(specifier, containingAbsolute, context)
      if (exact) return exact
    }
    const mapped = locateMapped(
      specifier,
      resolvedWith.options,
      resolvedWith.configDirectory,
      context,
    )
    if (mapped) return mapped
    if (pointsInside(specifier, resolvedWith.options)) {
      return { kind: "unresolved", reason: "module not found" }
    }
    return { kind: "external", reason: "package" }
  }
  return classifyResolved(
    found.resolvedFileName,
    found.isExternalLibraryImport === true,
    context,
  )
}

function locateExact(
  specifier: string,
  containingAbsolute: string,
  context: LocateContext,
): Location | null {
  return locateAbsolute(
    path.resolve(path.dirname(containingAbsolute), specifier),
    context,
  )
}

function locateMapped(
  specifier: string,
  options: ts.CompilerOptions,
  configDirectory: string | null,
  context: LocateContext,
): Location | null {
  const paths = options.paths
  // Paths with no baseUrl are relative to the config file.
  const baseUrl = options.baseUrl ?? configDirectory
  if (!paths || !baseUrl) return null
  let bestLength = -1
  const matches: { captured: string; targets: readonly string[] }[] = []
  for (const [pattern, targets] of Object.entries(paths)) {
    const captured = capture(pattern, specifier)
    if (captured === null) continue
    const star = pattern.indexOf("*")
    const prefixLength = star === -1 ? pattern.length : star
    if (prefixLength > bestLength) {
      bestLength = prefixLength
      matches.length = 0
    }
    if (prefixLength === bestLength) matches.push({ captured, targets })
  }
  for (const match of matches) {
    for (const target of match.targets) {
      const star = target.indexOf("*")
      const substituted =
        star === -1
          ? target
          : target.slice(0, star) + match.captured + target.slice(star + 1)
      const located = locateAbsolute(path.resolve(baseUrl, substituted), context)
      if (located) return located
    }
  }
  return null
}

function capture(pattern: string, specifier: string): string | null {
  const star = pattern.indexOf("*")
  if (star === -1) return pattern === specifier ? "" : null
  const prefix = pattern.slice(0, star)
  const suffix = pattern.slice(star + 1)
  if (!specifier.startsWith(prefix) || !specifier.endsWith(suffix)) return null
  if (specifier.length < prefix.length + suffix.length) return null
  return specifier.slice(prefix.length, specifier.length - suffix.length)
}

function locateAbsolute(absolute: string, context: LocateContext): Location | null {
  if (!fs.existsSync(absolute)) return null
  const real = fs.realpathSync.native(absolute)
  const relativeToRoot = path.relative(context.root, real)
  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    return { kind: "external", reason: "resolved outside the repository" }
  }
  const relative = relativeToRoot.split(path.sep).join("/")
  if (fs.statSync(real).isDirectory()) {
    const excluded = excludedReason(relative, context.excludedDirectories)
    if (excluded) return { kind: "excluded", path: relative, reason: excluded }
    return null
  }
  const known = lookup(relative, context)
  if (known) return known
  throw new Error(`Resolved ${relative} but the walk did not see it`)
}

function classifyResolved(
  resolvedFileName: string,
  externalLibrary: boolean,
  context: LocateContext,
): Location {
  if (
    externalLibrary ||
    resolvedFileName.split(path.sep).includes("node_modules")
  ) {
    return { kind: "external", reason: "package" }
  }
  let absolute = resolvedFileName
  if (fs.existsSync(absolute)) {
    absolute = fs.realpathSync.native(absolute)
  }
  const relativeToRoot = path.relative(context.root, absolute)
  if (
    relativeToRoot.startsWith("..") ||
    path.isAbsolute(relativeToRoot)
  ) {
    return { kind: "external", reason: "resolved outside the repository" }
  }
  const relative = relativeToRoot.split(path.sep).join("/")
  return classifyInside(relative, absolute, context)
}

function classifyInside(
  relative: string,
  absolute: string,
  context: LocateContext,
): Location {
  const direct = lookup(relative, context)
  if (direct) return direct
  if (!fs.existsSync(absolute)) {
    // Node resolution reports a .js path when the file on disk is .ts.
    // Use the substitute only when exactly one file we walked matches.
    return classifyMissing(relative, context)
  }
  const excluded = excludedReason(relative, context.excludedDirectories)
  if (excluded) {
    return { kind: "excluded", path: relative, reason: excluded }
  }
  throw new Error(`Resolved ${relative} but the walk did not see it`)
}

function classifyMissing(relative: string, context: LocateContext): Location {
  const hits: Location[] = []
  const extension = path.posix.extname(relative)
  const alternates = EXTENSION_ALTERNATES[extension] ?? []
  const stem = relative.slice(0, relative.length - extension.length)
  for (const alternate of alternates) {
    const candidate = `${stem}${alternate}`
    const found = lookup(candidate, context)
    if (found) hits.push(found)
  }
  if (hits.length === 1) return hits[0]
  if (hits.length > 1) {
    return { kind: "unresolved", reason: "more than one file matches" }
  }
  return { kind: "unresolved", reason: "module not found" }
}

function lookup(relative: string, context: LocateContext): Location | null {
  if (context.candidates.has(relative)) {
    return { kind: "source", path: relative }
  }
  const reason = context.skipped.get(relative)
  if (reason !== undefined) {
    return { kind: "excluded", path: relative, reason }
  }
  const excluded = excludedReason(relative, context.excludedDirectories)
  if (excluded) {
    return { kind: "excluded", path: relative, reason: excluded }
  }
  return null
}

function excludedReason(
  relative: string,
  directories: readonly ExcludedDirectory[],
): string | null {
  let match: ExcludedDirectory | null = null
  for (const directory of directories) {
    if (
      relative === directory.path ||
      relative.startsWith(`${directory.path}/`)
    ) {
      if (!match || directory.path.length > match.path.length) {
        match = directory
      }
    }
  }
  return match?.reason ?? null
}

function pointsInside(specifier: string, options: ts.CompilerOptions): boolean {
  return (
    specifier.startsWith("./") ||
    specifier.startsWith("../") ||
    path.isAbsolute(specifier) ||
    pathsMatch(specifier, options)
  )
}

function pathsMatch(specifier: string, options: ts.CompilerOptions): boolean {
  const paths = options.paths
  if (!paths) return false
  for (const pattern of Object.keys(paths)) {
    if (pathPatternMatches(pattern, specifier)) return true
  }
  return false
}

function pathPatternMatches(pattern: string, specifier: string): boolean {
  const star = pattern.indexOf("*")
  if (star === -1) return pattern === specifier
  const prefix = pattern.slice(0, star)
  const suffix = pattern.slice(star + 1)
  if (!specifier.startsWith(prefix)) return false
  if (suffix.length === 0) return specifier.length >= prefix.length
  if (!specifier.endsWith(suffix)) return false
  return specifier.length >= prefix.length + suffix.length
}

function resolutionFor(
  root: string,
  containingAbsolute: string,
  state: ResolutionState,
): CachedResolution {
  const config = nearestConfig(root, containingAbsolute)
  const key = config ?? `default:${root}`
  const existing = state.byKey.get(key)
  if (existing) return existing
  const options = config ? readConfig(config) : defaultOptions()
  const configDirectory = config ? path.dirname(config) : null
  const cached = {
    options,
    host: ts.createCompilerHost(options),
    cache: ts.createModuleResolutionCache(
      configDirectory ?? root,
      canonicalFileName,
      options,
    ),
    configDirectory,
  }
  state.byKey.set(key, cached)
  return cached
}

function nearestConfig(root: string, fileAbsolute: string): string | null {
  let directory = path.dirname(fileAbsolute)
  const stop = path.resolve(root)
  for (;;) {
    if (!inside(stop, directory)) return null
    const candidate = path.join(directory, "tsconfig.json")
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate
    }
    if (path.resolve(directory) === stop) return null
    directory = path.dirname(directory)
  }
}

function inside(root: string, directory: string): boolean {
  const relative = path.relative(root, directory)
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  )
}

function readConfig(configPath: string): ts.CompilerOptions {
  const read = ts.readConfigFile(configPath, ts.sys.readFile)
  if (read.error) {
    throw new Error(
      ts.flattenDiagnosticMessageText(read.error.messageText, "\n"),
    )
  }
  const parsed = ts.parseJsonConfigFileContent(
    read.config,
    ts.sys,
    path.dirname(configPath),
    undefined,
    configPath,
  )
  const options: ts.CompilerOptions = { ...parsed.options }
  delete options.plugins
  options.noEmit = true
  options.allowJs = true
  // This flag prints every lookup to stdout and buries the report.
  // Turning it off does not change where a module resolves.
  delete options.traceResolution
  return options
}

function defaultOptions(): ts.CompilerOptions {
  return {
    allowJs: true,
    noEmit: true,
    jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ESNext,
    esModuleInterop: true,
    strict: true,
    skipLibCheck: true,
    resolvePackageJsonExports: true,
    resolvePackageJsonImports: true,
  }
}

function canonicalFileName(fileName: string): string {
  return ts.sys.useCaseSensitiveFileNames
    ? fileName
    : fileName.toLowerCase()
}
