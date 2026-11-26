import fs from "node:fs"
import path from "node:path"

export type Manifest = {
  // Posix path of the directory holding package.json, "" for the repository root.
  directory: string
  dependencies: ReadonlySet<string>
}

// Root and two levels down, which covers apps/web and packages/api. A manifest
// that does not parse is skipped: it only feeds detection, and detection that
// finds nothing falls back to the generic adapter.
export function readManifests(root: string): Manifest[] {
  const manifests: Manifest[] = []
  function visit(directory: string, relative: string, depth: number): void {
    const manifest = readManifest(path.join(directory, "package.json"))
    if (manifest) manifests.push({ directory: relative, dependencies: manifest })
    if (depth === 2) return
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true })
    } catch {
      return
    }
    entries.sort((left, right) => left.name.localeCompare(right.name))
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue
      visit(
        path.join(directory, entry.name),
        relative === "" ? entry.name : `${relative}/${entry.name}`,
        depth + 1,
      )
    }
  }
  visit(root, "", 0)
  return manifests
}

function readManifest(file: string): Set<string> | null {
  let value: unknown
  try {
    value = JSON.parse(fs.readFileSync(file, "utf8")) as unknown
  } catch {
    return null
  }
  if (typeof value !== "object" || value === null) return null
  const record = value as Record<string, unknown>
  const names = new Set<string>()
  for (const key of ["dependencies", "devDependencies", "peerDependencies"]) {
    const section = record[key]
    if (typeof section !== "object" || section === null) continue
    for (const name of Object.keys(section)) names.add(name)
  }
  return names
}
