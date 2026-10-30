import type { Edge } from "./types"

export type Degrees = {
  fanIn: number
  fanOut: number
}

export function edgeKey(
  edge: Pick<Edge, "from" | "to" | "kind" | "typeOnly" | "specifier">,
): string {
  return [
    edge.from,
    edge.to,
    edge.kind,
    edge.typeOnly ? "1" : "0",
    edge.specifier,
  ].join("\0")
}

export function dedupeEdges(edges: readonly Edge[]): Edge[] {
  const seen = new Set<string>()
  const unique: Edge[] = []
  for (const edge of edges) {
    const key = edgeKey(edge)
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(edge)
  }
  return unique
}

// Fan-in and fan-out count distinct files on the deduped edge list.
// Two imports of the same file are one fan-out.
export function computeDegrees(
  paths: readonly string[],
  edges: readonly Edge[],
): Map<string, Degrees> {
  const incoming = new Map<string, Set<string>>()
  const outgoing = new Map<string, Set<string>>()
  for (const filePath of paths) {
    incoming.set(filePath, new Set())
    outgoing.set(filePath, new Set())
  }
  for (const edge of edges) {
    const out = outgoing.get(edge.from)
    const into = incoming.get(edge.to)
    if (!out || !into) {
      throw new Error(
        `Edge ${edge.from} -> ${edge.to} is not between parsed files`,
      )
    }
    out.add(edge.to)
    into.add(edge.from)
  }
  const degrees = new Map<string, Degrees>()
  for (const filePath of paths) {
    degrees.set(filePath, {
      fanIn: incoming.get(filePath)?.size ?? 0,
      fanOut: outgoing.get(filePath)?.size ?? 0,
    })
  }
  return degrees
}
