import type { MapEdge, MapNode } from "@/lib/map/present";

export type MapSelection =
  | { kind: "node"; id: string }
  | { kind: "file"; path: string }
  | null;

export type MapHighlight =
  | { kind: "node"; id: string }
  | { kind: "file"; path: string }
  | null;

// Neighbourhood lit for dimming nodes and rows. Null means nothing is selected.
export function brightFiles(
  selection: MapSelection,
  nodes: readonly MapNode[],
  links: readonly { from: string; to: string }[],
): Set<string> | null {
  if (!selection) return null;
  const bright = new Set<string>();
  if (selection.kind === "file") {
    bright.add(selection.path);
    for (const link of links) {
      if (link.from === selection.path || link.to === selection.path) {
        bright.add(link.from);
        bright.add(link.to);
      }
    }
    return bright;
  }
  const node = nodes.find((item) => item.id === selection.id);
  if (!node) return bright;
  for (const file of node.files) bright.add(file);
  const inside = new Set(node.files);
  for (const link of links) {
    if (inside.has(link.from) || inside.has(link.to)) {
      bright.add(link.from);
      bright.add(link.to);
    }
  }
  return bright;
}

// File selection lights only its own edges. Node selection lights any edge touching the neighbourhood.
export function edgeIsLit(
  edge: Pick<MapEdge, "from" | "to">,
  selection: MapSelection,
  bright: Set<string> | null,
): boolean {
  if (bright === null) return true;
  if (selection?.kind === "file") {
    return edge.from === selection.path || edge.to === selection.path;
  }
  if (selection?.kind === "node") {
    return bright.has(edge.from) || bright.has(edge.to);
  }
  return true;
}