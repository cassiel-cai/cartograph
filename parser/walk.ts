import fs from "node:fs"
import path from "node:path"

import { createIgnore } from "./ignore"
import { folderOf, toPosixRelative } from "./paths"
import type { ExcludedDirectory, SkippedFile } from "./types"

const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".mts",
  ".cts",
])

export type Candidate = {
  path: string
  absolute: string
  folder: string
}

export type WalkResult = {
  candidates: Candidate[]
  skipped: SkippedFile[]
  excludedDirectories: ExcludedDirectory[]
}

// Whole directories, never a ranking by size. Dependency installs and the
// version-control directory are not the repository. Other build output is
// skipped because a gitignore says so, not because this code knows a framework.
export function walk(
  root: string,
  adapterDirectories: readonly string[],
): WalkResult {
  const ignore = createIgnore()
  const candidates: Candidate[] = []
  const skipped: SkippedFile[] = []
  const excludedDirectories: ExcludedDirectory[] = []
  const seen = new Set<string>()

  function visit(directory: string): void {
    const relativeDir = toPosixRelative(root, directory)
    const gitignorePath = path.join(directory, ".gitignore")
    let pushed = 0
    if (fs.existsSync(gitignorePath) && fs.statSync(gitignorePath).isFile()) {
      pushed = ignore.pushFile(gitignorePath, relativeDir)
    }
    try {
      const entries = fs.readdirSync(directory, { withFileTypes: true })
      entries.sort((left, right) => left.name.localeCompare(right.name))
      for (const entry of entries) {
        const absolute = path.join(directory, entry.name)
        const relative =
          relativeDir.length === 0
            ? entry.name
            : `${relativeDir}/${entry.name}`
        if (seen.has(relative)) {
          throw new Error(`Saw ${relative} twice`)
        }
        seen.add(relative)
        classify(entry, absolute, relative)
      }
    } finally {
      ignore.pop(pushed)
    }
  }

  function classify(
    entry: fs.Dirent,
    absolute: string,
    relative: string,
  ): void {
    if (entry.isSymbolicLink()) {
      classifySymlink(absolute, relative)
      return
    }
    if (entry.isDirectory()) {
      classifyDirectory(entry.name, absolute, relative)
      return
    }
    if (!entry.isFile()) {
      skipped.push({
        path: relative,
        folder: folderOf(relative),
        reason: "not a file",
      })
      return
    }
    classifyFile(entry.name, absolute, relative)
  }

  function classifySymlink(absolute: string, relative: string): void {
    let asDirectory = false
    try {
      asDirectory = fs.lstatSync(absolute).isDirectory()
    } catch (error) {
      skipped.push({
        path: relative,
        folder: folderOf(relative),
        reason: `unreadable: ${messageOf(error)}`,
      })
      return
    }
    // Following a directory link can cycle. A symlink is not a second file.
    if (asDirectory) {
      excludedDirectories.push({ path: relative, reason: "symlink" })
      return
    }
    skipped.push({
      path: relative,
      folder: folderOf(relative),
      reason: "symlink",
    })
  }

  function classifyDirectory(
    name: string,
    absolute: string,
    relative: string,
  ): void {
    if (name === "node_modules") {
      excludedDirectories.push({
        path: relative,
        reason: "dependency directory",
      })
      return
    }
    if (name === ".git") {
      excludedDirectories.push({
        path: relative,
        reason: "version control directory",
      })
      return
    }
    if (insideAdapterDirectory(relative, adapterDirectories)) {
      excludedDirectories.push({
        path: relative,
        reason: "excluded by the framework adapter",
      })
      return
    }
    if (ignore.ignores(relative, true)) {
      excludedDirectories.push({
        path: relative,
        reason: "ignored by gitignore",
      })
      return
    }
    visit(absolute)
  }

  function classifyFile(name: string, absolute: string, relative: string): void {
    if (insideAdapterDirectory(relative, adapterDirectories)) {
      skipped.push({
        path: relative,
        folder: folderOf(relative),
        reason: "excluded by the framework adapter",
      })
      return
    }
    if (ignore.ignores(relative, false)) {
      skipped.push({
        path: relative,
        folder: folderOf(relative),
        reason: "ignored by gitignore",
      })
      return
    }
    const extension = path.posix.extname(name)
    if (SOURCE_EXTENSIONS.has(extension)) {
      candidates.push({
        path: relative,
        absolute,
        folder: folderOf(relative),
      })
      return
    }
    const label = extension.length === 0 ? "(none)" : extension
    skipped.push({
      path: relative,
      folder: folderOf(relative),
      reason: `unsupported extension ${label}`,
    })
  }

  visit(root)
  return { candidates, skipped, excludedDirectories }
}

function insideAdapterDirectory(
  relative: string,
  directories: readonly string[],
): boolean {
  return directories.some(
    (directory) =>
      relative === directory || relative.startsWith(`${directory}/`),
  )
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}
