import type { FrameworkAdapter } from "../adapter"
import { ROLE } from "../taxonomy"
import type { Manifest } from "./manifests"

const JSX_FILE = /\.[jt]sx$/
const HOOK_FILE = /^use[A-Z0-9]/

// Shared with the Next.js adapter: whatever its own conventions leave over is
// read as React. Hooks by filename, components by the JSX file extension.
export function reactRole(path: string): string {
  const name = path.slice(path.lastIndexOf("/") + 1)
  if (HOOK_FILE.test(name)) return ROLE.hooks
  if (JSX_FILE.test(name)) return ROLE.components
  return ROLE.other
}

export function detectReact(manifests: readonly Manifest[]): FrameworkAdapter | null {
  if (!manifests.some((manifest) => manifest.dependencies.has("react"))) return null
  return {
    name: "react",
    excludedDirectories: () => [],
    entryPoints: () => [],
    roleOf: (file) => reactRole(file.path),
    routes: () => [],
  }
}
