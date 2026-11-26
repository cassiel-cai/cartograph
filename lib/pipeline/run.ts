import type { SupabaseClient } from "@supabase/supabase-js";

import { detectAdapter } from "../../parser/adapters";
import { parseRepository } from "../../parser/parse";
import { walk } from "../../parser/walk";
import { fetchRepository } from "./fetch";
import {
  deleteGraph,
  ensureOrganization,
  findAnalysis,
  insertAnalysis,
  storeGraph,
  writeStage,
  type StoredAnalysis,
} from "./store";
import { canonicalRepositoryUrl } from "./url";

type Stage = "fetch" | "select" | "parse" | "store";

export type AnalysisRun = StoredAnalysis & {
  alreadyExisted: boolean;
};

// Fetch, select, parse, store. A throw anywhere writes failed on the row
// instead of leaving the last stage in place with no explanation.
export async function runAnalysis(
  client: SupabaseClient,
  organizationId: string,
  repositoryUrl: string,
): Promise<AnalysisRun> {
  if (organizationId.trim() === "") {
    throw new Error("An organization id is required.");
  }

  const repository = canonicalRepositoryUrl(repositoryUrl);
  await ensureOrganization(client, organizationId);

  const existing = await findAnalysis(client, organizationId, repository.url);
  if (existing) return { ...existing, alreadyExisted: true };

  const inserted = await insertAnalysis(client, organizationId, repository.url);
  if (inserted === "duplicate") {
    const winner = await findAnalysis(client, organizationId, repository.url);
    if (!winner) {
      throw new Error(`Analysis for ${repository.url} already exists but could not be read.`);
    }
    return { ...winner, alreadyExisted: true };
  }

  const run = await resumeAnalysis(client, organizationId, inserted, repositoryUrl);
  return { ...run, alreadyExisted: false };
}

// The row already exists and is sitting on fetch. The dashboard starts it this
// way so the progress page can open before the archive download finishes.
export async function resumeAnalysis(
  client: SupabaseClient,
  organizationId: string,
  analysis: StoredAnalysis,
  repositoryUrl: string,
): Promise<AnalysisRun> {
  const repository = canonicalRepositoryUrl(repositoryUrl);
  let stage: Stage = "fetch";
  let fetched: Awaited<ReturnType<typeof fetchRepository>> | null = null;
  try {
    fetched = await fetchRepository(repositoryUrl);
    if (fetched.ref.url !== repository.url) {
      throw new Error(`Fetched ${fetched.ref.url} instead of ${repository.url}.`);
    }
    stage = "select";
    await writeStage(client, analysis.id, {
      state: "select",
      stage: "select",
      detail: "Choosing source files.",
      commitSha: fetched.commitSha,
    });

    const selected = walk(fetched.root, []);
    if (selected.candidates.length === 0) {
      throw new Error("No TypeScript or JavaScript files to parse.");
    }

    stage = "parse";
    await writeStage(client, analysis.id, {
      state: "parse",
      stage: "parse",
      detail: `Reading imports in ${selected.candidates.length} files.`,
    });
    // The first adapter that matches decides roles and routes. None matching
    // is a normal result, not a failure.
    const adapter = detectAdapter(
      fetched.root,
      selected.candidates.map((candidate) => candidate.path),
    );
    const result = parseRepository(fetched.root, adapter);

    stage = "store";
    await writeStage(client, analysis.id, {
      state: "store",
      stage: "store",
      detail: `Writing ${result.files.length} files and ${result.edges.length} edges.`,
    });
    await storeGraph(client, organizationId, analysis.id, result);
    await writeStage(client, analysis.id, {
      state: "complete",
      stage: "store",
      detail: null,
      finishedAt: new Date().toISOString(),
      result,
    });

    return {
      ...analysis,
      state: "complete",
      stage: "store",
      commitSha: fetched.commitSha,
      detail: null,
      filesParsed: result.counts.filesParsed,
      edgeCount: result.counts.edges,
      alreadyExisted: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const detail = `Failed during ${stage}. ${message}`;
    try {
      await deleteGraph(client, analysis.id);
      await writeStage(client, analysis.id, {
        state: "failed",
        stage,
        detail,
        finishedAt: new Date().toISOString(),
      });
    } catch (writeError) {
      const writeMessage =
        writeError instanceof Error ? writeError.message : String(writeError);
      throw new Error(`${detail} The failed state could not be saved: ${writeMessage}`);
    }
    return {
      ...analysis,
      state: "failed",
      stage,
      commitSha: fetched?.commitSha ?? null,
      detail,
      filesParsed: null,
      edgeCount: null,
      alreadyExisted: false,
    };
  } finally {
    await fetched?.cleanup();
  }
}
