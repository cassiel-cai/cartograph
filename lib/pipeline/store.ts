import type { SupabaseClient } from "@supabase/supabase-js";

import type { ParseResult } from "../../parser/types";

const BATCH = 500;

export type StoredAnalysis = {
  id: number;
  repositoryUrl: string;
  state: string;
  stage: string | null;
  commitSha: string | null;
  detail: string | null;
  filesParsed: number | null;
  edgeCount: number | null;
};

type AnalysisWrite = {
  state: string;
  stage: string | null;
  detail: string | null;
  commitSha?: string;
  finishedAt?: string;
  result?: ParseResult;
};

export async function ensureOrganization(
  client: SupabaseClient,
  organizationId: string,
): Promise<void> {
  const { error } = await client
    .from("organizations")
    .upsert({ id: organizationId }, { onConflict: "id", ignoreDuplicates: true });
  if (error) {
    throw new Error(`Could not record organization: ${error.message}`);
  }
}

export async function findAnalysis(
  client: SupabaseClient,
  organizationId: string,
  repositoryUrl: string,
): Promise<StoredAnalysis | null> {
  const { data, error } = await client
    .from("analyses")
    .select(
      "id, repository_url, state, stage, commit_sha, detail, files_parsed, edge_count",
    )
    .eq("organization_id", organizationId)
    .eq("repository_url", repositoryUrl)
    .limit(1);

  if (error) throw new Error(`Could not read analyses: ${error.message}`);
  const rows = readRows(data);
  return rows.length === 0 ? null : readStored(rows[0]);
}

export async function insertAnalysis(
  client: SupabaseClient,
  organizationId: string,
  repositoryUrl: string,
): Promise<StoredAnalysis | "duplicate"> {
  const { data, error } = await client
    .from("analyses")
    .insert({
      organization_id: organizationId,
      repository_url: repositoryUrl,
      state: "fetch",
      stage: "fetch",
      detail: "Downloading the repository archive.",
      started_at: new Date().toISOString(),
    })
    .select(
      "id, repository_url, state, stage, commit_sha, detail, files_parsed, edge_count",
    );

  if (error) {
    if (error.code === "23505") return "duplicate";
    throw new Error(`Could not start analysis: ${error.message}`);
  }

  const rows = readRows(data);
  if (rows.length !== 1) {
    throw new Error("Starting an analysis did not return the new row.");
  }
  return readStored(rows[0]);
}

// Puts a finished or abandoned analysis back on the first stage. The row goes
// first: analysis_graph only serves complete rows, so nothing can read the
// half-deleted graph while it is being cleared.
export async function restartAnalysis(
  client: SupabaseClient,
  id: number,
): Promise<StoredAnalysis> {
  const { data, error } = await client
    .from("analyses")
    .update({
      state: "fetch",
      stage: "fetch",
      detail: "Downloading the repository archive.",
      started_at: new Date().toISOString(),
      finished_at: null,
      commit_sha: null,
      parse_version: null,
      adapter: null,
      files_found: null,
      files_parsed: null,
      files_skipped: null,
      folder_count: null,
      edge_count: null,
      imports_seen: null,
      imports_resolved: null,
      imports_external: null,
      imports_excluded: null,
      imports_unresolved: null,
      reexports_found: null,
      reexports_resolved: null,
    })
    .eq("id", id)
    .select(
      "id, repository_url, state, stage, commit_sha, detail, files_parsed, edge_count",
    );
  if (error) throw new Error(`Could not restart analysis ${id}: ${error.message}`);
  const rows = readRows(data);
  if (rows.length !== 1) throw new Error(`Analysis ${id} was not found.`);
  await deleteGraph(client, id);
  return readStored(rows[0]);
}

export async function writeStage(
  client: SupabaseClient,
  id: number,
  write: AnalysisWrite,
): Promise<void> {
  const update: Record<string, string | number | null> = {
    state: write.state,
    stage: write.stage,
    detail: write.detail,
  };
  if (write.commitSha !== undefined) update.commit_sha = write.commitSha;
  if (write.finishedAt !== undefined) update.finished_at = write.finishedAt;
  if (write.result) {
    const counts = write.result.counts;
    update.parse_version = write.result.version;
    update.adapter = write.result.adapter;
    update.files_found = counts.filesFound;
    update.files_parsed = counts.filesParsed;
    update.files_skipped = counts.filesSkipped;
    update.folder_count = counts.folders;
    update.edge_count = counts.edges;
    update.imports_seen = counts.importsSeen;
    update.imports_resolved = counts.importsResolved;
    update.imports_external = counts.importsExternal;
    update.imports_excluded = counts.importsExcluded;
    update.imports_unresolved = counts.importsUnresolved;
    update.reexports_found = counts.reexportsFound;
    update.reexports_resolved = counts.reexportsResolved;
  }

  const { error } = await client.from("analyses").update(update).eq("id", id);
  if (error) throw new Error(`Could not update analysis ${id}: ${error.message}`);
}

export async function storeGraph(
  client: SupabaseClient,
  organizationId: string,
  analysisId: number,
  result: ParseResult,
): Promise<void> {
  const files = [
    ...result.files.map((file) => ({
      organization_id: organizationId,
      analysis_id: analysisId,
      path: file.path,
      folder: file.folder,
      module: file.module,
      role: file.role,
      line_count: file.lines,
      content_hash: file.hash,
      fan_in: file.fanIn,
      fan_out: file.fanOut,
      skip_reason: null,
    })),
    ...result.skipped.map((file) => ({
      organization_id: organizationId,
      analysis_id: analysisId,
      path: file.path,
      folder: file.folder,
      module: null,
      role: null,
      line_count: null,
      content_hash: null,
      fan_in: null,
      fan_out: null,
      skip_reason: file.reason,
    })),
  ];
  await insertBatches(client, "files", files);
  await insertBatches(
    client,
    "edges",
    result.edges.map((edge) => ({
      organization_id: organizationId,
      analysis_id: analysisId,
      from_path: edge.from,
      to_path: edge.to,
      kind: edge.kind,
      specifier: edge.specifier,
      type_only: edge.typeOnly,
    })),
  );
  await insertBatches(
    client,
    "routes",
    result.routes.map((route) => ({
      organization_id: organizationId,
      analysis_id: analysisId,
      method: route.method,
      pattern: route.pattern,
      file_path: route.file,
      line: route.line,
    })),
  );
  await insertBatches(
    client,
    "exclusions",
    result.excludedDirectories.map((directory) => ({
      organization_id: organizationId,
      analysis_id: analysisId,
      path: directory.path,
      reason: directory.reason,
    })),
  );
  await insertBatches(
    client,
    "imports",
    result.imports.map((item) => ({
      organization_id: organizationId,
      analysis_id: analysisId,
      from_path: item.from,
      specifier: item.specifier,
      kind: item.kind,
      type_only: item.typeOnly,
      status: item.status,
      line: item.line,
      target: item.target,
      reason: item.reason,
    })),
  );
}

export async function deleteGraph(
  client: SupabaseClient,
  analysisId: number,
): Promise<void> {
  for (const table of ["imports", "exclusions", "routes", "edges", "files"] as const) {
    const { error } = await client.from(table).delete().eq("analysis_id", analysisId);
    if (error) {
      throw new Error(`Could not clear ${table} for analysis ${analysisId}: ${error.message}`);
    }
  }
}

async function insertBatches(
  client: SupabaseClient,
  table: "files" | "edges" | "exclusions" | "imports" | "routes",
  rows: readonly Record<string, string | number | boolean | null>[],
): Promise<void> {
  for (let index = 0; index < rows.length; index += BATCH) {
    const batch = rows.slice(index, index + BATCH);
    const { error } = await client.from(table).insert(batch);
    if (error) throw new Error(`Could not write ${table}: ${error.message}`);
  }
}

function readRows(data: unknown): Record<string, unknown>[] {
  if (!Array.isArray(data)) throw new Error("Analyses query did not return a list.");
  return data.map((row, index) => {
    if (!isRecord(row)) throw new Error(`Analysis row ${index} is not an object.`);
    return row;
  });
}

function readStored(row: Record<string, unknown>): StoredAnalysis {
  const id = readId(row.id);
  if (id === null || typeof row.repository_url !== "string" || typeof row.state !== "string") {
    throw new Error("Analysis row is missing id, repository_url, or state.");
  }
  return {
    id,
    repositoryUrl: row.repository_url,
    state: row.state,
    stage: readOptionalText(row.stage, "stage"),
    commitSha: readOptionalText(row.commit_sha, "commit_sha"),
    detail: readOptionalText(row.detail, "detail"),
    filesParsed: readOptionalCount(row.files_parsed, "files_parsed"),
    edgeCount: readOptionalCount(row.edge_count, "edge_count"),
  };
}

function readId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^[0-9]+$/.test(value)) return Number(value);
  return null;
}

function readOptionalText(value: unknown, column: string): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  throw new Error(`Analysis ${column} is not text.`);
}

function readOptionalCount(value: unknown, column: string): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isInteger(value)) return value;
  throw new Error(`Analysis ${column} is not a count.`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
