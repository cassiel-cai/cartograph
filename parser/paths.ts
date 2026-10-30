import path from "node:path"

export function toPosixRelative(root: string, absolute: string): string {
  const relative = path.relative(root, absolute)
  if (
    relative.startsWith("..") ||
    path.isAbsolute(relative)
  ) {
    throw new Error(`Path is outside the repository: ${absolute}`)
  }
  if (relative === "") return ""
  return relative.split(path.sep).join("/")
}

export function folderOf(filePath: string): string {
  const folder = path.posix.dirname(filePath)
  return folder === "" ? "." : folder
}

// The module is the file. Index files keep the index segment so two files
// never share one id.
export function moduleOf(filePath: string): string {
  let stem = filePath
  if (stem.endsWith(".d.ts")) stem = stem.slice(0, -5)
  else if (stem.endsWith(".d.mts")) stem = stem.slice(0, -6)
  else if (stem.endsWith(".d.cts")) stem = stem.slice(0, -6)
  else {
    const extension = path.posix.extname(stem)
    if (extension) stem = stem.slice(0, -extension.length)
  }
  return stem.length === 0 ? "." : stem
}

export function normalizeInside(input: string): string {
  const posix = input.split("\\").join("/")
  const normalized = path.posix.normalize(posix).replace(/^\.\//, "")
  if (
    normalized === ".." ||
    normalized.startsWith("../") ||
    path.posix.isAbsolute(normalized) ||
    normalized === "." ||
    normalized === ""
  ) {
    throw new Error(`Path must stay inside the repository: ${input}`)
  }
  return normalized
}
