import fs from "node:fs"
import path from "node:path"

import { loadParseResult } from "./load"
import { parseRepository } from "./parse"
import type { ParseResult } from "./types"

function main(): void {
  const { directory, out } = readArgs(process.argv.slice(2))
  const result = parseRepository(directory)
  process.stdout.write(`${report(result)}\n`)
  if (!out) return
  const destination = path.resolve(out)
  fs.writeFileSync(destination, `${JSON.stringify(result, null, 2)}\n`)
  const loaded = loadParseResult(destination)
  if (loaded.counts.filesParsed !== result.counts.filesParsed) {
    throw new Error("Read back did not match what was written")
  }
  process.stdout.write(`wrote: ${destination}\nread back: ok\n`)
}

function readArgs(args: readonly string[]): { directory: string; out: string | null } {
  if (args.length === 0) {
    throw new Error("Usage: pnpm parse <directory> [--out <file>]")
  }
  let directory: string | null = null
  let out: string | null = null
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === "--out") {
      const next = args[index + 1]
      if (!next) throw new Error("--out needs a file path")
      out = next
      index += 1
      continue
    }
    if (arg.startsWith("-")) throw new Error(`Unknown argument: ${arg}`)
    if (directory) throw new Error("Only one directory can be parsed")
    directory = arg
  }
  if (!directory) throw new Error("Usage: pnpm parse <directory> [--out <file>]")
  return { directory, out }
}

function report(result: ParseResult): string {
  const counts = result.counts
  const lines = [
    `root: ${result.root}`,
    `adapter: ${result.adapter}`,
    `files found: ${counts.filesFound}`,
    `files parsed: ${counts.filesParsed}`,
    `files skipped: ${counts.filesSkipped}`,
    `parsed + skipped = found: ${counts.filesParsed} + ${counts.filesSkipped} = ${counts.filesFound}`,
    `folders: ${counts.folders}`,
    `edges: ${counts.edges} (${edgeBreakdown(result)})`,
    `imports seen: ${counts.importsSeen}`,
    `  resolved: ${counts.importsResolved}`,
    `  external: ${counts.importsExternal}`,
    `  excluded: ${counts.importsExcluded}`,
    `  unresolved: ${counts.importsUnresolved}`,
    `re-exports found: ${counts.reexportsFound}`,
    `re-exports resolved: ${counts.reexportsResolved}`,
    `re-export gaps: ${counts.reexportsFound - counts.reexportsResolved}`,
    `excluded directories: ${result.excludedDirectories.length}`,
  ]
  for (const [reason, count] of grouped(
    result.excludedDirectories.map((directory) => directory.reason),
  )) {
    lines.push(`  ${count}  ${reason}`)
  }
  lines.push("skipped files:")
  for (const [reason, count] of grouped(result.skipped.map((file) => file.reason))) {
    lines.push(`  ${count}  ${reason}`)
  }
  const gaps = result.imports.filter(
    (item) => item.kind === "reexport" && item.status !== "resolved",
  )
  if (gaps.length > 0) {
    lines.push("re-export gap examples:")
    for (const item of gaps.slice(0, 20)) {
      lines.push(
        `  ${item.from}:${item.line}  ${item.specifier}  ${item.status}  ${item.reason}`,
      )
    }
    if (gaps.length > 20) lines.push(`  ${gaps.length - 20} more`)
  }
  const failures = result.imports.filter((item) => item.status === "unresolved")
  if (failures.length > 0) {
    lines.push("unresolved examples:")
    for (const item of failures.slice(0, 20)) {
      lines.push(
        `  ${item.from}:${item.line}  ${item.specifier}  ${item.reason}`,
      )
    }
    if (failures.length > 20) lines.push(`  ${failures.length - 20} more`)
  }
  return lines.join("\n")
}

function edgeBreakdown(result: ParseResult): string {
  let imports = 0
  let reexports = 0
  let dynamic = 0
  for (const edge of result.edges) {
    if (edge.kind === "import") imports += 1
    else if (edge.kind === "reexport") reexports += 1
    else dynamic += 1
  }
  return `import ${imports}, reexport ${reexports}, dynamic ${dynamic}`
}

function grouped(reasons: readonly string[]): [string, number][] {
  const counts = new Map<string, number>()
  for (const reason of reasons) {
    counts.set(reason, (counts.get(reason) ?? 0) + 1)
  }
  return [...counts.entries()].sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
  )
}

try {
  main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`${message}\n`)
  process.exit(1)
}
