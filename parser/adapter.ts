import type { SourceFile } from "ts-morph"

import { GENERIC_ADAPTER, ROLE } from "./taxonomy"
import type { Route } from "./types"

// An adapter is the only place framework knowledge lives. The parser hands it
// each parsed file with its syntax tree and takes back a role and routes. An
// empty entry list means every source file stays.
export type AdapterFile = {
  path: string
  source: SourceFile
}

export type FrameworkAdapter = {
  name: string
  excludedDirectories(): readonly string[]
  entryPoints(): readonly string[]
  roleOf(file: AdapterFile): string
  // Exact or absent: a route is returned only when its method and its full
  // pattern are both read straight from the syntax.
  routes(files: readonly AdapterFile[]): Route[]
}

export const noFramework: FrameworkAdapter = {
  name: GENERIC_ADAPTER,
  excludedDirectories() {
    return []
  },
  entryPoints() {
    return []
  },
  roleOf() {
    return ROLE.source
  },
  routes() {
    return []
  },
}
