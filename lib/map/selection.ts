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

// A category keeps every file on screen and dims the rest. Combined with a
// selection, a file stays bright only when both want it bright.
export function shownFiles(
  selection: MapSelection,
  category: ReadonlySet<string> | null,
  nodes: readonly MapNode[],
  links: readonly { from: string; to: string }[],
): ReadonlySet<string> | null {
  const selected = brightFiles(selection, nodes, links);
  if (category === null) return selected;
  if (selected === null) return category;
  const both = new Set<string>();
  for (const path of selected) {
    if (category.has(path)) both.add(path);
  }
  return both;
}

export function edgeInView(
  edge: Pick<MapEdge, "from" | "to">,
  selection: MapSelection,
  shown: ReadonlySet<string> | null,
  category: ReadonlySet<string> | null,
): boolean {
  if (shown === null) return true;
  if (selection) {
    if (!edgeIsLit(edge, selection, shown)) return false;
    if (category === null) return true;
    return category.has(edge.from) && category.has(edge.to);
  }
  return category !== null && category.has(edge.from) && category.has(edge.to);
}

// File selection lights only its own edges. Node selection lights any edge touching the neighbourhood.
export function edgeIsLit(
  edge: Pick<MapEdge, "from" | "to">,
  selection: MapSelection,
  bright: ReadonlySet<string> | null,
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