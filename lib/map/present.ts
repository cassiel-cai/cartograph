import dagre, { type GraphLabel, type NodeLabel } from "@dagrejs/dagre";

import {
  extensionColor,
  extensionOf,
  type FileCategory,
  fileCategories,
} from "@/lib/map/categories";
import { foldRepository } from "@/lib/map/fold";
import type { Edge, ParseResult, ParsedFile } from "@/parser/types";

export type { FileCategory };
export { extensionColor, extensionOf, fileCategories };

const CHAR_PX = 8;
const COLLAPSED_HEIGHT = 48;
const ROW_BASE = 22;
const HEADER_HEIGHT = 46;
const PANEL_BODY = 300;

export type MapRow = {
  path: string;
  label: string;
  fanIn: number;
  fanOut: number;
  height: number;
  color: string;
  // Rows outside the panel's viewport keep their place in the list, and their
  // edges attach to the top or bottom of that viewport instead of a handle
  // that has scrolled away.
  placement: "row" | "above" | "below";
};

export type MapNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  open: boolean;
  fileCount: number;
  fanIn: number;
  fanOut: number;
  files: string[];
  rows: MapRow[];
};

export type MapEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
  from: string;
  to: string;
};

export type MapModel = {
  threshold: number;
  nodes: MapNode[];
  edges: MapEdge[];
  links: { from: string; to: string }[];
};

export function buildMap(
  result: ParseResult,
  open: ReadonlySet<string>,
  scrollTops: ReadonlyMap<string, number> = new Map(),
): MapModel {
  const folded = foldRepository(result.files);
  const byPath = new Map(result.files.map((file) => [file.path, file]));
  const owner = new Map<string, string>();
  for (const node of folded.nodes) {
    for (const file of node.files) owner.set(file, node.id);
  }

  const links = fileLinks(result.edges);
  const drafted = folded.nodes.map((node) => {
    const files = node.files.map((path) => {
      const file = byPath.get(path);
      if (!file) throw new Error(`Folded file is not in the parse result: ${path}`);
      return file;
    });
    const degrees = moduleDegrees(
      files.map((file) => file.path),
      links,
    );
    const isOpen = open.has(node.id);
    const packed = isOpen
      ? placeRows(files, scrollTops.get(node.id) ?? 0)
      : { rows: [] as ParsedFile[], placement: new Map<string, RowPlacement>(), body: 0 };
    return {
      id: node.id,
      files: files.map((file) => file.path),
      fileCount: files.length,
      fanIn: degrees.fanIn,
      fanOut: degrees.fanOut,
      open: isOpen,
      packed,
    };
  });

  const labels = uniqueLabels([
    ...drafted.map((node) => ({
      id: `node:${node.id}`,
      segments: nodeSegments(node.id, result.root),
    })),
    ...drafted.flatMap((node) =>
      node.packed.rows.map((row) => ({
        id: `file:${row.path}`,
        segments: row.path.split("/"),
      })),
    ),
  ]);

  const sized = drafted.map((node) => {
    const label = labels.get(`node:${node.id}`) ?? node.id;
    const rows = node.packed.rows.map((row) => ({
      path: row.path,
      label: labels.get(`file:${row.path}`) ?? row.path,
      fanIn: row.fanIn,
      fanOut: row.fanOut,
      height: rowHeight(row.fanIn),
      color: extensionColor(extensionOf(row.path)),
      placement: node.packed.placement.get(row.path) ?? "row",
    }));
    const width = node.open
      ? openWidth(label, node.fileCount, node.fanIn, node.fanOut, rows)
      : collapsedWidth(label, node.fileCount, node.fanIn, node.fanOut);
    const height = node.open ? HEADER_HEIGHT + node.packed.body : COLLAPSED_HEIGHT;
    return {
      id: node.id,
      label,
      width,
      height,
      open: node.open,
      fileCount: node.fileCount,
      fanIn: node.fanIn,
      fanOut: node.fanOut,
      files: node.files,
      rows,
    };
  });

  const placed = place(sized, links, owner);
  const edges = visualEdges(sized, links, owner);
  return { threshold: folded.threshold, nodes: placed, edges, links };
}

function fileLinks(edges: readonly Edge[]): { from: string; to: string }[] {
  const seen = new Set<string>();
  const links: { from: string; to: string }[] = [];
  for (const edge of edges) {
    if (edge.from === edge.to) continue;
    const key = `${edge.from}\0${edge.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({ from: edge.from, to: edge.to });
  }
  links.sort(
    (left, right) =>
      left.from.localeCompare(right.from) || left.to.localeCompare(right.to),
  );
  return links;
}

function moduleDegrees(
  files: readonly string[],
  links: readonly { from: string; to: string }[],
): { fanIn: number; fanOut: number } {
  const inside = new Set(files);
  const incoming = new Set<string>();
  const outgoing = new Set<string>();
  for (const link of links) {
    const fromIn = inside.has(link.from);
    const toIn = inside.has(link.to);
    if (fromIn && !toIn) outgoing.add(link.to);
    if (!fromIn && toIn) incoming.add(link.from);
  }
  return { fanIn: incoming.size, fanOut: outgoing.size };
}

type RowPlacement = MapRow["placement"];

function placeRows(
  files: readonly ParsedFile[],
  scrollTop: number,
): { rows: ParsedFile[]; placement: Map<string, RowPlacement>; body: number } {
  const ordered = [...files].sort((left, right) =>
    left.path.localeCompare(right.path),
  );
  const heights = ordered.map((file) => rowHeight(file.fanIn));
  const total = heights.reduce((sum, height) => sum + height, 0);
  const body = Math.min(total, PANEL_BODY);
  const top = Math.max(0, Math.min(scrollTop, Math.max(0, total - body)));
  const bottom = top + body;
  const placement = new Map<string, RowPlacement>();
  let y = 0;
  for (let index = 0; index < ordered.length; index += 1) {
    const height = heights[index] ?? 0;
    const end = y + height;
    let where: RowPlacement = "row";
    if (end <= top) where = "above";
    else if (y >= bottom) where = "below";
    placement.set(ordered[index].path, where);
    y = end;
  }
  return { rows: ordered, placement, body };
}

function nodeSegments(id: string, root: string): string[] {
  if (id === ".") return [basename(root)];
  return id.split("/");
}

function basename(root: string): string {
  const parts = root.split(/[\\/]/).filter((part) => part.length > 0);
  return parts[parts.length - 1] ?? "repository";
}

function uniqueLabels(
  items: readonly { id: string; segments: string[] }[],
): Map<string, string> {
  const depth = new Map(items.map((item) => [item.id, 1]));
  const labelFor = (item: { id: string; segments: string[] }) => {
    const segments = item.segments.length > 0 ? item.segments : [item.id];
    const take = Math.min(depth.get(item.id) ?? 1, segments.length);
    return segments.slice(segments.length - take).join("/");
  };
  let grew = true;
  let guard = 0;
  while (grew && guard < 64) {
    grew = false;
    guard += 1;
    const groups = new Map<string, string[]>();
    for (const item of items) {
      const label = labelFor(item);
      const ids = groups.get(label) ?? [];
      ids.push(item.id);
      groups.set(label, ids);
    }
    for (const ids of groups.values()) {
      if (ids.length < 2) continue;
      for (const id of ids) {
        const item = items.find((entry) => entry.id === id);
        if (!item) continue;
        const segments = item.segments.length > 0 ? item.segments : [item.id];
        const current = depth.get(id) ?? 1;
        if (current < segments.length) {
          depth.set(id, current + 1);
          grew = true;
        }
      }
    }
  }
  return new Map(items.map((item) => [item.id, labelFor(item)]));
}

function rowHeight(fanIn: number): number {
  return ROW_BASE + Math.round(Math.sqrt(fanIn) * 8);
}

function collapsedWidth(
  label: string,
  fileCount: number,
  fanIn: number,
  fanOut: number,
): number {
  return Math.max(textWidth(label, 24), statsWidth(fileCount, fanIn, fanOut));
}

function openWidth(
  label: string,
  fileCount: number,
  fanIn: number,
  fanOut: number,
  rows: readonly { label: string; fanIn: number; fanOut: number }[],
): number {
  const header =
    textWidth(label, 0) +
    textWidth(String(fileCount), 0) +
    textWidth(`${fanIn} in`, 0) +
    textWidth(`${fanOut} out`, 0) +
    16 +
    24;
  let width = Math.max(header, statsWidth(fileCount, fanIn, fanOut));
  for (const row of rows) {
    width = Math.max(
      width,
      textWidth(row.label, 0) +
        textWidth(`←${row.fanIn}`, 0) +
        textWidth(`${row.fanOut}→`, 0) +
        16 +
        16 +
        14,
    );
  }
  return width;
}

function statsWidth(fileCount: number, fanIn: number, fanOut: number): number {
  const files = fileCount === 1 ? "1 file" : `${fileCount} files`;
  // The summary is three runs with gaps, plus the node's horizontal padding.
  // Sizing it as one string was short, so "21 files" wrapped under the count.
  return (
    textWidth(files, 0) +
    textWidth(`←${fanIn}`, 0) +
    textWidth(`${fanOut}→`, 0) +
    16 +
    16 +
    12
  );
}

function textWidth(label: string, pad: number): number {
  return Math.ceil(label.length * CHAR_PX + pad);
}

function place(
  nodes: Omit<MapNode, "x" | "y">[],
  links: readonly { from: string; to: string }[],
  owner: ReadonlyMap<string, string>,
): MapNode[] {
  const graph = new dagre.graphlib.Graph<GraphLabel, NodeLabel, Record<string, never>>();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: "LR",
    nodesep: 28,
    ranksep: 72,
    marginx: 16,
    marginy: 16,
    ranker: "network-simplex",
  });
  const ordered = [...nodes].sort((left, right) => left.id.localeCompare(right.id));
  for (const node of ordered) {
    graph.setNode(node.id, { width: node.width, height: node.height });
  }
  const seen = new Set<string>();
  const layoutEdges: { source: string; target: string }[] = [];
  for (const link of links) {
    const source = owner.get(link.from);
    const target = owner.get(link.to);
    if (!source || !target || source === target) continue;
    const key = `${source}\0${target}`;
    if (seen.has(key)) continue;
    seen.add(key);
    layoutEdges.push({ source, target });
  }
  layoutEdges.sort(
    (left, right) =>
      left.source.localeCompare(right.source) ||
      left.target.localeCompare(right.target),
  );
  for (const edge of layoutEdges) {
    graph.setEdge(edge.source, edge.target);
  }
  dagre.layout(graph);

  return ordered.map((node) => {
    const position = graph.node(node.id);
    if (position?.x === undefined || position.y === undefined) {
      throw new Error(`Layout did not place ${node.id}`);
    }
    return {
      ...node,
      x: position.x - node.width / 2,
      y: position.y - node.height / 2,
    };
  });
}

function visualEdges(
  nodes: readonly Pick<MapNode, "id" | "open" | "rows">[],
  links: readonly { from: string; to: string }[],
  owner: ReadonlyMap<string, string>,
): MapEdge[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const edges: MapEdge[] = [];
  const seen = new Set<string>();
  for (const link of links) {
    const source = owner.get(link.from);
    const target = owner.get(link.to);
    if (!source || !target) continue;
    const sourceNode = byId.get(source);
    const targetNode = byId.get(target);
    if (!sourceNode || !targetNode) continue;
    if (source === target && !sourceNode.open) continue;
    const sourceHandle = handleFor(sourceNode, link.from, "out");
    const targetHandle = handleFor(targetNode, link.to, "in");
    if (source === target && sourceHandle === targetHandle) continue;
    const id = `${source}|${sourceHandle}|${target}|${targetHandle}|${link.from}|${link.to}`;
    if (seen.has(id)) continue;
    seen.add(id);
    edges.push({
      id,
      source,
      target,
      sourceHandle,
      targetHandle,
      from: link.from,
      to: link.to,
    });
  }
  edges.sort((left, right) => left.id.localeCompare(right.id));
  return edges;
}

function handleFor(
  node: Pick<MapNode, "open" | "rows">,
  file: string,
  side: "in" | "out",
): string {
  if (!node.open) return side;
  const row = node.rows.find((item) => item.path === file);
  if (!row || row.placement === "row") return `${side}:${file}`;
  return `${side}:${row.placement}`;
}
