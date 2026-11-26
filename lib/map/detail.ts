import { fallbackRole, GENERIC_ADAPTER } from "@/parser/taxonomy";
import { extensionOf, fileCategories } from "@/lib/map/categories";
import type { ParseResult } from "@/parser/types";

export type RankedFile = {
  path: string;
  fanIn: number;
};

export type QuietFile = {
  path: string;
  lines: number;
};

export type LinkedFile = {
  path: string;
  typeOnly: boolean;
};

export type RepositorySummary = {
  name: string;
  framework: string;
  files: number;
  filesSkipped: number;
  imports: number;
  importsUnresolved: number;
  routes: number | null;
  unidentified: number;
  leanedOn: RankedFile[];
  startHere: QuietFile[];
};

export type FileDetail = {
  path: string;
  folder: string;
  kinds: string[];
  lines: number;
  dependsOn: LinkedFile[];
  dependedOnBy: LinkedFile[];
};

// Neighbours are distinct parsed files. The pane counts these lists, so the
// number it prints cannot drift from the rows under it.
function neighbors(result: ParseResult): {
  incoming: Map<string, LinkedFile[]>;
  outgoing: Map<string, LinkedFile[]>;
} {
  const incoming = new Map<string, Map<string, boolean>>();
  const outgoing = new Map<string, Map<string, boolean>>();
  for (const file of result.files) {
    incoming.set(file.path, new Map());
    outgoing.set(file.path, new Map());
  }
  for (const edge of result.edges) {
    if (edge.from === edge.to) continue;
    merge(outgoing.get(edge.from), edge.to, edge.typeOnly);
    merge(incoming.get(edge.to), edge.from, edge.typeOnly);
  }
  return {
    incoming: new Map([...incoming].map(([path, values]) => [path, listed(values)])),
    outgoing: new Map([...outgoing].map(([path, values]) => [path, listed(values)])),
  };
}

function merge(links: Map<string, boolean> | undefined, path: string, typeOnly: boolean) {
  if (!links) return;
  const previous = links.get(path);
  links.set(path, previous === undefined ? typeOnly : previous && typeOnly);
}

function listed(links: Map<string, boolean>): LinkedFile[] {
  return [...links]
    .map(([path, typeOnly]) => ({ path, typeOnly }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

export function repositorySummary(result: ParseResult): RepositorySummary {
  const links = neighbors(result);
  const leanedOn = result.files
    .map((file) => ({
      path: file.path,
      fanIn: links.incoming.get(file.path)?.length ?? 0,
    }))
    .filter((file) => file.fanIn > 0)
    .sort(
      (left, right) =>
        right.fanIn - left.fanIn || left.path.localeCompare(right.path),
    );
  const startHere = result.files
    .filter((file) => (links.incoming.get(file.path)?.length ?? 0) === 0)
    .map((file) => ({ path: file.path, lines: file.lines }))
    .sort(
      (left, right) =>
        right.lines - left.lines || left.path.localeCompare(right.path),
    );

  return {
    name: repositoryName(result.root),
    framework: result.adapter,
    files: result.files.length,
    filesSkipped: result.counts.filesSkipped,
    imports: result.counts.importsSeen,
    importsUnresolved: result.counts.importsUnresolved,
    // With no adapter there is nothing to count; a dash, not a zero.
    routes: result.adapter === GENERIC_ADAPTER ? null : result.routes.length,
    unidentified: result.files.filter(
      (file) => file.role === fallbackRole(result.adapter),
    ).length,
    leanedOn,
    startHere,
  };
}

export function fileDetail(result: ParseResult, path: string): FileDetail | null {
  const file = result.files.find((item) => item.path === path);
  if (!file) return null;
  const links = neighbors(result);
  return {
    path: file.path,
    folder: file.folder,
    kinds: [extensionOf(file.path)],
    lines: file.lines,
    dependsOn: links.outgoing.get(file.path) ?? [],
    dependedOnBy: links.incoming.get(file.path) ?? [],
  };
}

// A folded folder uses the same fields as a file. Counts are the files inside
// it; the two lists are files outside it, so an internal import is not a dependency of the folder.
export function nodeDetail(
  result: ParseResult,
  folder: string,
  files: readonly string[],
): FileDetail | null {
  if (files.length === 0) return null;
  const members = new Set(files);
  const links = neighbors(result);
  const depends = new Map<string, boolean>();
  const depended = new Map<string, boolean>();
  let lines = 0;
  for (const path of files) {
    lines += result.files.find((file) => file.path === path)?.lines ?? 0;
    for (const link of links.outgoing.get(path) ?? []) {
      if (!members.has(link.path)) merge(depends, link.path, link.typeOnly);
    }
    for (const link of links.incoming.get(path) ?? []) {
      if (!members.has(link.path)) merge(depended, link.path, link.typeOnly);
    }
  }
  return {
    path: folder,
    folder: parentFolder(folder),
    kinds: fileCategories(files.map((path) => ({ path }))).map((kind) => kind.extension),
    lines,
    dependsOn: listed(depends),
    dependedOnBy: listed(depended),
  };
}

function parentFolder(folder: string): string {
  const slash = folder.lastIndexOf("/");
  return slash === -1 ? "." : folder.slice(0, slash);
}

function repositoryName(root: string): string {
  const parts = root.split(/[\\/]/).filter((part) => part.length > 0);
  return parts[parts.length - 1] ?? "repository";
}
