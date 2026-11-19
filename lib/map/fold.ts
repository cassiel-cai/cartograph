export type FoldedNode = {
  id: string;
  files: string[];
};

// First pass merges a directory with fewer than two files into its parent.
// If that still leaves more than two dozen nodes, the threshold goes up and
// the whole fold is computed again from the original files.
const FIRST_THRESHOLD = 2;
const NODE_BUDGET = 24;

export function foldRepository(
  files: readonly { path: string; folder: string }[],
): { threshold: number; nodes: FoldedNode[] } {
  let threshold = FIRST_THRESHOLD;
  let nodes = foldAt(files, threshold);
  while (nodes.length > NODE_BUDGET && threshold < files.length) {
    threshold += 1;
    nodes = foldAt(files, threshold);
  }
  return { threshold, nodes };
}

function foldAt(
  files: readonly { path: string; folder: string }[],
  threshold: number,
): FoldedNode[] {
  const members = new Map<string, string[]>();
  ensure(".", members);
  for (const file of files) {
    ensure(file.folder, members);
    members.get(file.folder)?.push(file.path);
  }

  let maxDepth = 0;
  for (const folder of members.keys()) {
    maxDepth = Math.max(maxDepth, depthOf(folder));
  }

  for (let depth = maxDepth; depth >= 1; depth -= 1) {
    const layer = [...members.keys()]
      .filter((folder) => depthOf(folder) === depth)
      .sort();
    const counts = new Map(
      layer.map((folder) => [folder, members.get(folder)?.length ?? 0]),
    );
    for (const folder of layer) {
      const count = counts.get(folder) ?? 0;
      if (count >= threshold) continue;
      const moving = members.get(folder);
      if (!moving || moving.length === 0) continue;
      const parent = parentOf(folder);
      if (!parent) continue;
      members.set(folder, []);
      const existing = members.get(parent) ?? [];
      members.set(parent, existing.concat(moving));
    }
  }

  const nodes: FoldedNode[] = [];
  for (const [id, paths] of members) {
    if (paths.length === 0) continue;
    nodes.push({ id, files: [...paths].sort() });
  }
  nodes.sort((left, right) => left.id.localeCompare(right.id));
  return nodes;
}

function ensure(folder: string, members: Map<string, string[]>): void {
  let current: string | null = folder;
  while (current) {
    if (!members.has(current)) members.set(current, []);
    current = parentOf(current);
  }
}

function parentOf(folder: string): string | null {
  if (folder === ".") return null;
  const slash = folder.lastIndexOf("/");
  return slash === -1 ? "." : folder.slice(0, slash);
}

function depthOf(folder: string): number {
  if (folder === ".") return 0;
  return folder.split("/").length;
}
