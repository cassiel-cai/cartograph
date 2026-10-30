// The fallback has no framework. An empty entry list means every source file
// stays. Framework names do not appear in this layer.
export type FrameworkAdapter = {
  name: string
  excludedDirectories(): readonly string[]
  entryPoints(): readonly string[]
}

export const noFramework: FrameworkAdapter = {
  name: "none",
  excludedDirectories() {
    return []
  },
  entryPoints() {
    return []
  },
}
