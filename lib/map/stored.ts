import { assertParseResult } from "../../parser/load";
import { PARSE_RESULT_VERSION, type ParseResult } from "../../parser/types";

// The archive folder name is not stored. The repository name is what the map
// uses for the root node, and it comes from the URL the analysis recorded.
export function parseResultFromGraph(value: unknown): ParseResult {
  const graph = asRecord(value);
  const files = readList(graph.files, "files");
  const parsed = [];
  const skipped = [];
  for (const row of files) {
    const file = asRecord(row);
    if (file.skip_reason === null) {
      parsed.push({
        path: readString(file.path, "file path"),
        folder: readString(file.folder, "file folder"),
        module: readString(file.module, "file module"),
        role: readString(file.role, "file role"),
        lines: readCount(file.lines, "file lines"),
        hash: readString(file.hash, "file hash"),
        fanIn: readCount(file.fan_in, "file fan-in"),
        fanOut: readCount(file.fan_out, "file fan-out"),
      });
    } else {
      skipped.push({
        path: readString(file.path, "skipped path"),
        folder: readString(file.folder, "skipped folder"),
        reason: readString(file.skip_reason, "skip reason"),
      });
    }
  }

  return assertParseResult({
    version: PARSE_RESULT_VERSION,
    root: repositoryName(readString(graph.repository_url, "repository")),
    adapter: readString(graph.adapter, "adapter"),
    hashAlgorithm: "sha256",
    files: parsed,
    skipped,
    excludedDirectories: readList(graph.exclusions, "exclusions").map((row) => {
      const directory = asRecord(row);
      return {
        path: readString(directory.path, "excluded path"),
        reason: readString(directory.reason, "excluded reason"),
      };
    }),
    edges: readList(graph.edges, "edges").map((row) => {
      const edge = asRecord(row);
      return {
        from: readString(edge.from, "edge source"),
        to: readString(edge.to, "edge target"),
        kind: edge.kind,
        specifier: typeof edge.specifier === "string" ? edge.specifier : missing("edge specifier"),
        typeOnly: readBoolean(edge.type_only, "edge type-only"),
      };
    }),
    imports: readList(graph.imports, "imports").map((row) => {
      const item = asRecord(row);
      return {
        from: readString(item.from, "import source"),
        specifier: typeof item.specifier === "string" ? item.specifier : missing("import specifier"),
        kind: item.kind,
        typeOnly: readBoolean(item.type_only, "import type-only"),
        status: item.status,
        line: readCount(item.line, "import line"),
        target: item.target,
        reason: item.reason,
      };
    }),
    routes: readList(graph.routes, "routes").map((row) => {
      const route = asRecord(row);
      return {
        method: readString(route.method, "route method"),
        pattern: readString(route.pattern, "route pattern"),
        file: readString(route.file, "route file"),
        line: readCount(route.line, "route line"),
      };
    }),
    counts: {
      filesFound: readCount(graph.files_found, "files found"),
      filesParsed: readCount(graph.files_parsed, "files parsed"),
      filesSkipped: readCount(graph.files_skipped, "files skipped"),
      folders: readCount(graph.folder_count, "folders"),
      edges: readCount(graph.edge_count, "edges"),
      importsSeen: readCount(graph.imports_seen, "imports seen"),
      importsResolved: readCount(graph.imports_resolved, "imports resolved"),
      importsExternal: readCount(graph.imports_external, "imports external"),
      importsExcluded: readCount(graph.imports_excluded, "imports excluded"),
      importsUnresolved: readCount(graph.imports_unresolved, "imports unresolved"),
      reexportsFound: readCount(graph.reexports_found, "re-exports found"),
      reexportsResolved: readCount(graph.reexports_resolved, "re-exports resolved"),
    },
  });
}

function repositoryName(url: string): string {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    const name = parts[1]?.replace(/\.git$/, "");
    if (name) return name;
  } catch {
    // The validator below reports a missing name.
  }
  return missing("repository name");
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return missing("stored map");
  }
  return value as Record<string, unknown>;
}

function readList(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) return missing(`${label} list`);
  return value;
}

function readString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") return missing(label);
  return value;
}

function readCount(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return missing(label);
  }
  return value;
}

function readBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") return missing(label);
  return value;
}

function missing(label: string): never {
  throw new Error(`The stored map is missing ${label}.`);
}
