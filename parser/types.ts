// The file the parse command writes. Later phases read this shape.

export const PARSE_RESULT_VERSION = 1

export const EDGE_KINDS = ["import", "reexport", "dynamic"] as const

export type EdgeKind = (typeof EDGE_KINDS)[number]

export const IMPORT_STATUSES = [
  "resolved",
  "external",
  "excluded",
  "unresolved",
] as const

export type ImportStatus = (typeof IMPORT_STATUSES)[number]

export type ParsedFile = {
  path: string
  folder: string
  module: string
  lines: number
  hash: string
  fanIn: number
  fanOut: number
}

export type SkippedFile = {
  path: string
  folder: string
  reason: string
}

export type ExcludedDirectory = {
  path: string
  reason: string
}

export type Edge = {
  from: string
  to: string
  kind: EdgeKind
  specifier: string
  typeOnly: boolean
}

export type ImportRecord = {
  from: string
  specifier: string
  kind: EdgeKind
  typeOnly: boolean
  status: ImportStatus
  line: number
  target: string | null
  reason: string | null
}

export type ParseCounts = {
  filesFound: number
  filesParsed: number
  filesSkipped: number
  folders: number
  edges: number
  importsSeen: number
  importsResolved: number
  importsExternal: number
  importsExcluded: number
  importsUnresolved: number
  reexportsFound: number
  reexportsResolved: number
}

export type ParseResult = {
  version: typeof PARSE_RESULT_VERSION
  root: string
  adapter: string
  hashAlgorithm: "sha256"
  files: ParsedFile[]
  skipped: SkippedFile[]
  excludedDirectories: ExcludedDirectory[]
  edges: Edge[]
  imports: ImportRecord[]
  counts: ParseCounts
}
