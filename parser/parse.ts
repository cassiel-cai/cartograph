import { createHash } from "node:crypto"
import fs from "node:fs"
import { Project } from "ts-morph"
import ts from "typescript"

import { noFramework, type FrameworkAdapter } from "./adapter"
import { computeDegrees, dedupeEdges } from "./graph"
import { readImports, type SeenImport } from "./imports"
import { assertParseResult } from "./load"
import { folderOf, moduleOf, normalizeInside } from "./paths"
import {
  createResolutionState,
  locate,
  type LocateContext,
  type Location,
} from "./resolve"
import type {
  Edge,
  ImportRecord,
  ParseCounts,
  ParseResult,
  SkippedFile,
} from "./types"
import { walk } from "./walk"

// An import that does not resolve is recorded with a reason and never dropped.
// With no entry points, every source file is kept. With entry points, the walk
// follows resolved imports outward, so a leaf is not dropped while the file
// that imports it stays.
export function parseRepository(
  rootInput: string,
  adapter: FrameworkAdapter = noFramework,
): ParseResult {
  if (adapter.name.trim() === "") throw new Error("Adapter name is empty")
  if (!fs.existsSync(rootInput)) {
    throw new Error(`Directory not found: ${rootInput}`)
  }
  const root = fs.realpathSync.native(rootInput)
  if (!fs.statSync(root).isDirectory()) {
    throw new Error(`Not a directory: ${rootInput}`)
  }

  const adapterDirectories = adapter
    .excludedDirectories()
    .map((directory) => normalizeInside(directory))
  const walked = walk(root, adapterDirectories)
  const candidates = new Map(
    walked.candidates.map((candidate) => [candidate.path, candidate.absolute]),
  )
  const skipped: SkippedFile[] = [...walked.skipped]
  const context: LocateContext = {
    root,
    candidates,
    skipped: new Map(walked.skipped.map((file) => [file.path, file.reason])),
    excludedDirectories: walked.excludedDirectories,
    resolution: createResolutionState(),
  }
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    skipLoadingLibFiles: true,
    compilerOptions: {
      allowJs: true,
      noEmit: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
  })

  const status = new Map<string, "visiting" | "done" | "failed">()
  const failures = new Map<string, string>()
  const meta = new Map<string, { hash: string; lines: number }>()
  const imports: ImportRecord[] = []

  function consider(filePath: string): void {
    const current = status.get(filePath)
    if (current) return
    status.set(filePath, "visiting")
    const absolute = candidates.get(filePath)
    if (!absolute) throw new Error(`Missing source file: ${filePath}`)

    let bytes: Buffer
    try {
      bytes = fs.readFileSync(absolute)
    } catch (error) {
      fail(filePath, `unreadable: ${messageOf(error)}`)
      return
    }

    let seen: SeenImport[]
    try {
      seen = readImports(project.addSourceFileAtPath(absolute))
    } catch (error) {
      fail(filePath, `unreadable: ${messageOf(error)}`)
      return
    }

    const placed = seen.map((item) => ({
      item,
      location: locationOf(item, absolute),
    }))
    for (const entry of placed) {
      if (entry.location?.kind === "source") consider(entry.location.path)
    }

    status.set(filePath, "done")
    meta.set(filePath, {
      hash: createHash("sha256").update(bytes).digest("hex"),
      lines: countLines(bytes.toString("utf8")),
    })
    for (const entry of placed) {
      imports.push(toImport(filePath, entry.item, entry.location))
    }
  }

  function locationOf(item: SeenImport, absolute: string): Location | null {
    if (item.specifier === null || item.specifier === "") return null
    return locate(item.specifier, absolute, context)
  }

  function fail(filePath: string, reason: string): void {
    status.set(filePath, "failed")
    failures.set(filePath, reason)
    skipped.push({ path: filePath, folder: folderOf(filePath), reason })
  }

  function toImport(
    from: string,
    item: SeenImport,
    location: Location | null,
  ): ImportRecord {
    const base = {
      from,
      specifier: item.specifier ?? item.text,
      kind: item.kind,
      typeOnly: item.typeOnly,
      line: item.line,
    }
    if (item.specifier === null) {
      return {
        ...base,
        status: "unresolved",
        target: null,
        reason:
          item.text === ""
            ? "missing specifier"
            : "specifier is not a literal string",
      }
    }
    if (item.specifier === "") {
      return {
        ...base,
        status: "unresolved",
        target: null,
        reason: "empty specifier",
      }
    }
    if (!location) throw new Error(`Missing resolution for ${from}`)
    if (location.kind === "source") {
      const targetStatus = status.get(location.path)
      if (targetStatus === "done" || targetStatus === "visiting") {
        return {
          ...base,
          status: "resolved",
          target: location.path,
          reason: null,
        }
      }
      if (targetStatus === "failed") {
        return {
          ...base,
          status: "unresolved",
          target: null,
          reason: failures.get(location.path) ?? "unreadable",
        }
      }
      throw new Error(`Import target was not parsed: ${from} -> ${location.path}`)
    }
    if (location.kind === "excluded") {
      return {
        ...base,
        status: "excluded",
        target: location.path,
        reason: location.reason,
      }
    }
    if (location.kind === "external") {
      return {
        ...base,
        status: "external",
        target: null,
        reason: location.reason,
      }
    }
    return {
      ...base,
      status: "unresolved",
      target: null,
      reason: location.reason,
    }
  }

  const entryPoints = adapter
    .entryPoints()
    .map((entry) => normalizeInside(entry))
  if (entryPoints.length === 0) {
    for (const filePath of [...candidates.keys()].sort()) consider(filePath)
  } else {
    for (const entry of entryPoints) {
      if (!candidates.has(entry)) {
        throw new Error(`Entry point is not a source file: ${entry}`)
      }
    }
    for (const entry of entryPoints) consider(entry)
    for (const filePath of [...candidates.keys()].sort()) {
      if (!status.has(filePath)) {
        skipped.push({
          path: filePath,
          folder: folderOf(filePath),
          reason: "not reachable from an entry point",
        })
      }
    }
  }

  const rawEdges: Edge[] = []
  for (const item of imports) {
    if (item.status === "resolved" && item.target !== null) {
      rawEdges.push({
        from: item.from,
        to: item.target,
        kind: item.kind,
        specifier: item.specifier,
        typeOnly: item.typeOnly,
      })
    }
  }
  const edges = dedupeEdges(rawEdges).sort(compareEdges)
  const parsedPaths = [...meta.keys()].sort()
  const degrees = computeDegrees(parsedPaths, edges)
  const files = parsedPaths.map((filePath) => {
    const info = meta.get(filePath)
    const degree = degrees.get(filePath)
    if (!info || !degree) throw new Error(`Missing parsed file: ${filePath}`)
    return {
      path: filePath,
      folder: folderOf(filePath),
      module: moduleOf(filePath),
      lines: info.lines,
      hash: info.hash,
      fanIn: degree.fanIn,
      fanOut: degree.fanOut,
    }
  })
  skipped.sort((left, right) => left.path.localeCompare(right.path))
  const excludedDirectories = [...walked.excludedDirectories].sort((left, right) =>
    left.path.localeCompare(right.path),
  )
  imports.sort(compareImports)

  const counts = countResult(files, skipped, edges, imports)
  return assertParseResult({
    version: 1,
    root,
    adapter: adapter.name,
    hashAlgorithm: "sha256",
    files,
    skipped,
    excludedDirectories,
    edges,
    imports,
    counts,
  })
}

function countResult(
  files: readonly { folder: string }[],
  skipped: readonly unknown[],
  edges: readonly unknown[],
  imports: readonly ImportRecord[],
): ParseCounts {
  const folders = new Set(files.map((file) => file.folder))
  let importsResolved = 0
  let importsExternal = 0
  let importsExcluded = 0
  let importsUnresolved = 0
  let reexportsFound = 0
  let reexportsResolved = 0
  for (const item of imports) {
    if (item.status === "resolved") importsResolved += 1
    else if (item.status === "external") importsExternal += 1
    else if (item.status === "excluded") importsExcluded += 1
    else importsUnresolved += 1
    if (item.kind === "reexport") {
      reexportsFound += 1
      if (item.status === "resolved") reexportsResolved += 1
    }
  }
  return {
    filesFound: files.length + skipped.length,
    filesParsed: files.length,
    filesSkipped: skipped.length,
    folders: folders.size,
    edges: edges.length,
    importsSeen: imports.length,
    importsResolved,
    importsExternal,
    importsExcluded,
    importsUnresolved,
    reexportsFound,
    reexportsResolved,
  }
}

function compareEdges(left: Edge, right: Edge): number {
  return (
    left.from.localeCompare(right.from) ||
    left.to.localeCompare(right.to) ||
    left.kind.localeCompare(right.kind) ||
    left.specifier.localeCompare(right.specifier) ||
    Number(left.typeOnly) - Number(right.typeOnly)
  )
}

function compareImports(left: ImportRecord, right: ImportRecord): number {
  return (
    left.from.localeCompare(right.from) ||
    left.line - right.line ||
    left.kind.localeCompare(right.kind) ||
    left.specifier.localeCompare(right.specifier) ||
    Number(left.typeOnly) - Number(right.typeOnly) ||
    left.status.localeCompare(right.status)
  )
}

function countLines(text: string): number {
  if (text.length === 0) return 0
  let lines = 1
  for (let index = 0; index < text.length; index += 1) {
    if (text.charCodeAt(index) === 10) lines += 1
  }
  if (text.charCodeAt(text.length - 1) === 10) lines -= 1
  return lines
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}
