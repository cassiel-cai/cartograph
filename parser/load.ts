import fs from "node:fs"

import { computeDegrees, edgeKey } from "./graph"
import { folderOf, moduleOf } from "./paths"
import {
  PARSE_RESULT_VERSION,
  type Edge,
  type EdgeKind,
  type ExcludedDirectory,
  type ImportRecord,
  type ImportStatus,
  type ParseCounts,
  type ParseResult,
  type ParsedFile,
  type SkippedFile,
} from "./types"

export function loadParseResult(file: string): ParseResult {
  const text = fs.readFileSync(file, "utf8")
  return assertParseResult(jsonValue(text))
}

export function assertParseResult(value: unknown): ParseResult {
  const record = asRecord(value, "result")
  if (record.version !== PARSE_RESULT_VERSION) {
    invalid("version is not 1")
  }
  const root = readString(record, "root")
  const adapter = readString(record, "adapter")
  if (record.hashAlgorithm !== "sha256") invalid("hash algorithm is not sha256")
  const files = readArray(record, "files").map(readFileRecord)
  const skipped = readArray(record, "skipped").map(readSkipped)
  const excludedDirectories = readArray(record, "excludedDirectories").map(
    readExcluded,
  )
  const edges = readArray(record, "edges").map(readEdge)
  const imports = readArray(record, "imports").map(readImport)
  const counts = readCounts(asRecord(record.counts, "counts"))

  const parsed = new Set<string>()
  for (const file of files) {
    if (parsed.has(file.path)) invalid(`duplicate parsed file ${file.path}`)
    parsed.add(file.path)
    if (file.folder !== folderOf(file.path)) {
      invalid(`folder does not match the path for ${file.path}`)
    }
    if (file.module !== moduleOf(file.path)) {
      invalid(`module does not match the path for ${file.path}`)
    }
    if (!/^[0-9a-f]{64}$/.test(file.hash)) {
      invalid(`hash is not sha256 for ${file.path}`)
    }
  }
  const skippedPaths = new Set<string>()
  for (const file of skipped) {
    if (file.reason.trim() === "") invalid(`skip has no reason: ${file.path}`)
    if (file.folder !== folderOf(file.path)) {
      invalid(`folder does not match the path for ${file.path}`)
    }
    if (parsed.has(file.path) || skippedPaths.has(file.path)) {
      invalid(`duplicate file ${file.path}`)
    }
    skippedPaths.add(file.path)
  }
  for (const directory of excludedDirectories) {
    if (directory.reason.trim() === "") {
      invalid(`excluded directory has no reason: ${directory.path}`)
    }
  }
  if (files.length + skipped.length !== counts.filesFound) {
    invalid("file totals do not add up")
  }
  if (files.length !== counts.filesParsed) invalid("parsed count does not match")
  if (skipped.length !== counts.filesSkipped) {
    invalid("skipped count does not match")
  }
  const folders = new Set(files.map((file) => file.folder))
  if (folders.size !== counts.folders) {
    invalid("folder count does not match the files")
  }
  if (edges.length !== counts.edges) invalid("edge count does not match")

  const edgeKeys = new Set<string>()
  for (const edge of edges) {
    if (!parsed.has(edge.from) || !parsed.has(edge.to)) {
      invalid(`edge is not between parsed files: ${edge.from} -> ${edge.to}`)
    }
    const key = edgeKey(edge)
    if (edgeKeys.has(key)) invalid("duplicate edge")
    edgeKeys.add(key)
  }

  const statusCounts: Record<ImportStatus, number> = {
    resolved: 0,
    external: 0,
    excluded: 0,
    unresolved: 0,
  }
  let reexportsFound = 0
  let reexportsResolved = 0
  let reexportGaps = 0
  const resolvedKeys = new Set<string>()
  for (const item of imports) {
    if (!parsed.has(item.from)) {
      invalid(`import is not from a parsed file: ${item.from}`)
    }
    statusCounts[item.status] += 1
    if (item.kind === "reexport") {
      reexportsFound += 1
      if (item.status === "resolved") reexportsResolved += 1
      else reexportGaps += 1
    }
    if (item.status === "resolved") {
      if (item.target === null || !parsed.has(item.target)) {
        invalid(`resolved import has no parsed target: ${item.from}`)
      }
      if (item.reason !== null) invalid("resolved import has a reason")
      if (item.target !== null) {
        resolvedKeys.add(
          edgeKey({
            from: item.from,
            to: item.target,
            kind: item.kind,
            typeOnly: item.typeOnly,
            specifier: item.specifier,
          }),
        )
      }
    } else if (item.reason === null || item.reason.trim() === "") {
      invalid(`import has no reason: ${item.from} ${item.specifier}`)
    } else if (item.status === "excluded") {
      if (item.target === null || item.target === "") {
        invalid(`excluded import has no target: ${item.from}`)
      }
    } else if (item.target !== null) {
      invalid(`import target should be empty: ${item.from} ${item.specifier}`)
    }
  }
  if (imports.length !== counts.importsSeen) invalid("import count does not match")
  if (statusCounts.resolved !== counts.importsResolved) {
    invalid("resolved import count does not match")
  }
  if (statusCounts.external !== counts.importsExternal) {
    invalid("external import count does not match")
  }
  if (statusCounts.excluded !== counts.importsExcluded) {
    invalid("excluded import count does not match")
  }
  if (statusCounts.unresolved !== counts.importsUnresolved) {
    invalid("unresolved import count does not match")
  }
  if (
    statusCounts.resolved +
      statusCounts.external +
      statusCounts.excluded +
      statusCounts.unresolved !==
    imports.length
  ) {
    invalid("import statuses do not add up")
  }
  if (reexportsFound !== counts.reexportsFound) {
    invalid("re-export count does not match")
  }
  if (reexportsResolved !== counts.reexportsResolved) {
    invalid("resolved re-export count does not match")
  }
  if (reexportsFound !== reexportsResolved + reexportGaps) {
    invalid("re-export totals do not add up")
  }
  if (edgeKeys.size !== resolvedKeys.size) {
    invalid("edges do not match resolved imports")
  }
  for (const key of edgeKeys) {
    if (!resolvedKeys.has(key)) invalid("edge has no resolved import")
  }

  const degrees = computeDegrees(
    files.map((file) => file.path),
    edges,
  )
  for (const file of files) {
    const degree = degrees.get(file.path)
    if (
      !degree ||
      degree.fanIn !== file.fanIn ||
      degree.fanOut !== file.fanOut
    ) {
      invalid(`fan-in or fan-out does not match the edge list for ${file.path}`)
    }
  }

  return {
    version: PARSE_RESULT_VERSION,
    root,
    adapter,
    hashAlgorithm: "sha256",
    files,
    skipped,
    excludedDirectories,
    edges,
    imports,
    counts,
  }
}

function jsonValue(text: string): unknown {
  return JSON.parse(text) as unknown
}

function invalid(message: string): never {
  throw new Error(`Parse result is not valid: ${message}`)
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) invalid(`${label} is not an object`)
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readArray(record: Record<string, unknown>, key: string): unknown[] {
  const value = record[key]
  if (!Array.isArray(value)) invalid(`${key} is not a list`)
  return value
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== "string" || value.trim() === "") {
    invalid(`${key} is missing`)
  }
  return value
}

function readPath(value: unknown, label: string): string {
  if (typeof value !== "string" || !isRelativePath(value)) invalid(label)
  return value
}

function isRelativePath(value: string): boolean {
  return (
    value.length > 0 &&
    !value.startsWith("/") &&
    !value.startsWith("../") &&
    !value.includes("\\") &&
    !value.split("/").includes("..")
  )
}

function readInteger(value: unknown, label: string, minimum: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < minimum) {
    invalid(label)
  }
  return value
}

function readFileRecord(value: unknown): ParsedFile {
  const record = asRecord(value, "file")
  return {
    path: readPath(record.path, "file path is not inside the repository"),
    folder: readFolder(record.folder),
    module: readString(record, "module"),
    lines: readInteger(record.lines, "line count is not a whole number", 0),
    hash: readString(record, "hash"),
    fanIn: readInteger(record.fanIn, "fan-in is not a whole number", 0),
    fanOut: readInteger(record.fanOut, "fan-out is not a whole number", 0),
  }
}

function readFolder(value: unknown): string {
  if (value === ".") return "."
  return readPath(value, "folder is missing")
}

function readSkipped(value: unknown): SkippedFile {
  const record = asRecord(value, "skipped file")
  return {
    path: readPath(record.path, "skipped path is not inside the repository"),
    folder: readFolder(record.folder),
    reason: readString(record, "reason"),
  }
}

function readExcluded(value: unknown): ExcludedDirectory {
  const record = asRecord(value, "excluded directory")
  return {
    path: readPath(record.path, "excluded path is not inside the repository"),
    reason: readString(record, "reason"),
  }
}

function readEdge(value: unknown): Edge {
  const record = asRecord(value, "edge")
  return {
    from: readPath(record.from, "edge is missing a source"),
    to: readPath(record.to, "edge is missing a target"),
    kind: readKind(record.kind),
    specifier: typeof record.specifier === "string" ? record.specifier : invalidEdge(),
    typeOnly: readBoolean(record.typeOnly, "edge is missing typeOnly"),
  }
}

function invalidEdge(): never {
  invalid("edge is missing a specifier")
}

function readImport(value: unknown): ImportRecord {
  const record = asRecord(value, "import")
  const target = record.target
  const reason = record.reason
  return {
    from: readPath(record.from, "import is missing a source"),
    specifier: typeof record.specifier === "string" ? record.specifier : missingSpecifier(),
    kind: readKind(record.kind),
    typeOnly: readBoolean(record.typeOnly, "import is missing typeOnly"),
    status: readStatus(record.status),
    line: readInteger(record.line, "import line is not a whole number", 1),
    target: target === null ? null : readPath(target, "import target is invalid"),
    reason: reason === null ? null : readReason(reason),
  }
}

function missingSpecifier(): never {
  invalid("import is missing a specifier")
}

function readReason(value: unknown): string {
  if (typeof value !== "string") invalid("import reason is invalid")
  return value
}

function readKind(value: unknown): EdgeKind {
  if (value === "import" || value === "reexport" || value === "dynamic") {
    return value
  }
  invalid("import kind is invalid")
}

function readStatus(value: unknown): ImportStatus {
  if (
    value === "resolved" ||
    value === "external" ||
    value === "excluded" ||
    value === "unresolved"
  ) {
    return value
  }
  invalid("import status is invalid")
}

function readBoolean(value: unknown, message: string): boolean {
  if (typeof value !== "boolean") invalid(message)
  return value
}

function readCounts(record: Record<string, unknown>): ParseCounts {
  return {
    filesFound: readInteger(record.filesFound, "files found is invalid", 0),
    filesParsed: readInteger(record.filesParsed, "files parsed is invalid", 0),
    filesSkipped: readInteger(record.filesSkipped, "files skipped is invalid", 0),
    folders: readInteger(record.folders, "folders is invalid", 0),
    edges: readInteger(record.edges, "edges is invalid", 0),
    importsSeen: readInteger(record.importsSeen, "imports seen is invalid", 0),
    importsResolved: readInteger(
      record.importsResolved,
      "resolved imports is invalid",
      0,
    ),
    importsExternal: readInteger(
      record.importsExternal,
      "external imports is invalid",
      0,
    ),
    importsExcluded: readInteger(
      record.importsExcluded,
      "excluded imports is invalid",
      0,
    ),
    importsUnresolved: readInteger(
      record.importsUnresolved,
      "unresolved imports is invalid",
      0,
    ),
    reexportsFound: readInteger(
      record.reexportsFound,
      "re-exports found is invalid",
      0,
    ),
    reexportsResolved: readInteger(
      record.reexportsResolved,
      "re-exports resolved is invalid",
      0,
    ),
  }
}
