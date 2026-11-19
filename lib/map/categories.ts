// Extension colours. Not the incoming, outgoing, or selection colours.
const EXTENSION_COLORS: Record<string, string> = {
  ".ts": "#a78bfa",
  ".tsx": "#f472b6",
  ".js": "#a8a29e",
  ".jsx": "#fb7185",
  ".mjs": "#94a3b8",
  ".cjs": "#78716c",
  ".mts": "#64748b",
  ".cts": "#57534e",
};

export type FileCategory = {
  extension: string;
  count: number;
  color: string;
};

export function extensionOf(path: string): string {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return name;
  return name.slice(dot);
}

export function extensionColor(extension: string): string {
  return EXTENSION_COLORS[extension] ?? "#71717a";
}

export function fileCategories(
  files: readonly { path: string }[],
): FileCategory[] {
  const counts = new Map<string, number>();
  for (const file of files) {
    const extension = extensionOf(file.path);
    counts.set(extension, (counts.get(extension) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )
    .map(([extension, count]) => ({
      extension,
      count,
      color: extensionColor(extension),
    }));
}