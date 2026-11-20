import { reachedByFramework } from "@/lib/map/reached";
import type { Edge, ParsedFile } from "@/parser/types";

export type InsightFile = {
  path: string;
  fanIn: number;
  lines: number;
};

export type ImportCycle = {
  files: string[];
};

export type Insights = {
  unimported: InsightFile[];
  unusual: InsightFile[];
  cycles: ImportCycle[];
  long: InsightFile[];
};

// Both cutoffs are the upper Tukey fence of this repository. The spec names
// the two facts and not a number, and a fixed cutoff would be a grade.
function upperFence(values: readonly number[]): number {
  if (values.length === 0) return Number.POSITIVE_INFINITY;
  const sorted = [...values].sort((left, right) => left - right);
  const at = (portion: number) =>
    sorted[Math.floor(portion * (sorted.length - 1))] ?? 0;
  const lower = at(0.25);
  const upper = at(0.75);
  return upper + 1.5 * (upper - lower);
}

export function insights(
  files: readonly ParsedFile[],
  edges: readonly Pick<Edge, "from" | "to">[],
): Insights {
  const incoming = new Map<string, Set<string>>();
  const outgoing = new Map<string, Set<string>>();
  for (const file of files) {
    incoming.set(file.path, new Set());
    outgoing.set(file.path, new Set());
  }
  for (const edge of edges) {
    if (edge.from === edge.to) {
      outgoing.get(edge.from)?.add(edge.from);
      continue;
    }
    outgoing.get(edge.from)?.add(edge.to);
    incoming.get(edge.to)?.add(edge.from);
  }

  const rows = files.map((file) => ({
    path: file.path,
    fanIn: incoming.get(file.path)?.size ?? 0,
    lines: file.lines,
  }));
  const fanFence = upperFence(rows.map((row) => row.fanIn));
  const lineFence = upperFence(rows.map((row) => row.lines));

  const unimported = rows
    .filter((row) => row.fanIn === 0 && !reachedByFramework(row.path))
    .sort((left, right) => left.path.localeCompare(right.path));
  const unusual = rows
    .filter((row) => row.fanIn > fanFence)
    .sort(
      (left, right) => right.fanIn - left.fanIn || left.path.localeCompare(right.path),
    );
  const long = rows
    .filter((row) => row.lines > lineFence)
    .sort(
      (left, right) => right.lines - left.lines || left.path.localeCompare(right.path),
    );

  return {
    unimported,
    unusual,
    cycles: importCycles(outgoing),
    long,
  };
}

// Iterative. A repository of this size will blow a recursive walk.
function importCycles(outgoing: ReadonlyMap<string, ReadonlySet<string>>): ImportCycle[] {
  const order: string[] = [];
  const seen = new Set<string>();
  for (const start of outgoing.keys()) {
    if (seen.has(start)) continue;
    const frames: { node: string; children: string[]; index: number }[] = [
      { node: start, children: [...(outgoing.get(start) ?? [])].sort(), index: 0 },
    ];
    seen.add(start);
    while (frames.length > 0) {
      const frame = frames[frames.length - 1];
      if (!frame) break;
      if (frame.index >= frame.children.length) {
        order.push(frame.node);
        frames.pop();
        continue;
      }
      const child = frame.children[frame.index];
      frame.index += 1;
      if (!child || seen.has(child) || !outgoing.has(child)) continue;
      seen.add(child);
      frames.push({
        node: child,
        children: [...(outgoing.get(child) ?? [])].sort(),
        index: 0,
      });
    }
  }

  const cycles: ImportCycle[] = [];
  const assigned = new Set<string>();
  for (let index = order.length - 1; index >= 0; index -= 1) {
    const start = order[index];
    if (!start || assigned.has(start)) continue;
    const members: string[] = [];
    const stack = [start];
    assigned.add(start);
    while (stack.length > 0) {
      const node = stack.pop();
      if (!node) continue;
      members.push(node);
      for (const from of outgoing.keys()) {
        if (assigned.has(from)) continue;
        if (!outgoing.get(from)?.has(node)) continue;
        assigned.add(from);
        stack.push(from);
      }
    }
    const loop = simpleCycle(members, outgoing);
    if (loop) cycles.push({ files: loop });
  }
  cycles.sort((left, right) => left.files.join("\0").localeCompare(right.files.join("\0")));
  return cycles;
}

function simpleCycle(
  members: readonly string[],
  outgoing: ReadonlyMap<string, ReadonlySet<string>>,
): string[] | null {
  const inside = new Set(members);
  if (members.length === 1) {
    const only = members[0];
    if (only && outgoing.get(only)?.has(only)) return [only, only];
    return null;
  }
  const state = new Map<string, "stack" | "done">();
  for (const start of [...members].sort()) {
    if (state.has(start)) continue;
    const stack: string[] = [];
    const frames: { node: string; children: string[]; index: number }[] = [
      {
        node: start,
        children: [...(outgoing.get(start) ?? [])].filter((child) => inside.has(child)).sort(),
        index: 0,
      },
    ];
    state.set(start, "stack");
    stack.push(start);
    while (frames.length > 0) {
      const frame = frames[frames.length - 1];
      if (!frame) break;
      if (frame.index >= frame.children.length) {
        state.set(frame.node, "done");
        stack.pop();
        frames.pop();
        continue;
      }
      const child = frame.children[frame.index];
      frame.index += 1;
      if (!child) continue;
      if (state.get(child) === "stack") {
        const at = stack.indexOf(child);
        if (at === -1) continue;
        return rotate([...stack.slice(at), child]);
      }
      if (state.get(child) === "done") continue;
      state.set(child, "stack");
      stack.push(child);
      frames.push({
        node: child,
        children: [...(outgoing.get(child) ?? [])]
          .filter((next) => inside.has(next))
          .sort(),
        index: 0,
      });
    }
  }
  return null;
}

function rotate(loop: string[]): string[] {
  if (loop.length < 2) return loop;
  const body = loop.slice(0, -1);
  let best = 0;
  for (let index = 1; index < body.length; index += 1) {
    const candidate = body[index];
    const current = body[best];
    if (candidate !== undefined && current !== undefined && candidate < current) best = index;
  }
  const turned = [...body.slice(best), ...body.slice(0, best)];
  const first = turned[0];
  if (!first) return loop;
  return [...turned, first];
}
