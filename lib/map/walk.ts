import type { Edge } from "@/parser/types";

// Two steps is the list. Anything further is only a count, because the paths stop being an answer.
export const WALK_DEPTH = 2;

export type WalkDirection = "dependents" | "needs";

export type WalkStep = {
  path: string;
  depth: number;
};

export type Walk = {
  steps: WalkStep[];
  omitted: number;
};

// One walk. Dependents are what breaks if this file changes. Needs are what it
// depends on. The direction only swaps which end of an edge is the next step.
export function walkFiles(
  start: string,
  edges: readonly Pick<Edge, "from" | "to">[],
  direction: WalkDirection,
  depthLimit = WALK_DEPTH,
): Walk {
  const next = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (edge.from === edge.to) continue;
    const from = direction === "needs" ? edge.from : edge.to;
    const to = direction === "needs" ? edge.to : edge.from;
    const links = next.get(from);
    if (links) links.add(to);
    else next.set(from, new Set([to]));
  }

  const depth = new Map<string, number>([[start, 0]]);
  const queue = [start];
  let head = 0;
  while (head < queue.length) {
    const current = queue[head];
    head += 1;
    if (!current) continue;
    const here = depth.get(current) ?? 0;
    const children = [...(next.get(current) ?? [])].sort();
    for (const child of children) {
      if (depth.has(child)) continue;
      depth.set(child, here + 1);
      queue.push(child);
    }
  }

  const steps: WalkStep[] = [];
  let omitted = 0;
  for (const [path, at] of depth) {
    if (at === 0) continue;
    if (at > depthLimit) {
      omitted += 1;
      continue;
    }
    steps.push({ path, depth: at });
  }
  steps.sort(
    (left, right) => left.depth - right.depth || left.path.localeCompare(right.path),
  );
  return { steps, omitted };
}
