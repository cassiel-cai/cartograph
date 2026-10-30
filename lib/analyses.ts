import { createServerSupabaseClient } from "@/lib/supabase/server";
import { io } from "next/cache";

export type Analysis = {
  id: number;
  repositoryUrl: string;
  state: string;
  commitSha: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  detail: string | null;
};

export type AnalysisListResult = {
  analyses: Analysis[];
  now: number;
};

// A list read names its columns and stops. Nothing pages yet.
const LIST_LIMIT = 100;

export async function listAnalyses(): Promise<AnalysisListResult> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("analyses")
    .select(
      "id, repository_url, state, commit_sha, started_at, finished_at, detail",
    )
    .order("started_at", { ascending: false, nullsFirst: false })
    .limit(LIST_LIMIT);

  if (error) {
    throw new Error(`Could not read analyses: ${error.message}`);
  }

  // The client formats relative times from this instant. Capturing it here,
  // behind io(), keeps Date.now() out of the prerender and gives both renders
  // the same value.
  await io();
  return { analyses: readAnalyses(data), now: Date.now() };
}

function readAnalyses(rows: unknown): Analysis[] {
  if (!Array.isArray(rows)) {
    throw new Error("Analyses query did not return a list.");
  }

  return rows.map((row, index) => {
    if (!isRecord(row)) {
      throw new Error(`Analysis row ${index} is not an object.`);
    }

    const id = readId(row.id);
    const startedAt = readOptionalTime(row.started_at, index, "started_at");
    const finishedAt = readOptionalTime(row.finished_at, index, "finished_at");
    if (
      id === null ||
      typeof row.repository_url !== "string" ||
      typeof row.state !== "string"
    ) {
      throw new Error(
        `Analysis row ${index} is missing id, repository_url, or state.`,
      );
    }

    return {
      id,
      repositoryUrl: row.repository_url,
      state: row.state,
      commitSha: readOptionalText(row.commit_sha, index, "commit_sha"),
      startedAt,
      finishedAt,
      detail: readOptionalText(row.detail, index, "detail"),
    };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string" && /^[0-9]+$/.test(value)) {
    return Number(value);
  }

  return null;
}

function readOptionalTime(
  value: unknown,
  index: number,
  column: string,
): string | null {
  const text = readOptionalText(value, index, column);
  if (text != null && Number.isNaN(Date.parse(text))) {
    throw new Error(`Analysis row ${index} has an unreadable ${column}.`);
  }

  return text;
}

function readOptionalText(
  value: unknown,
  index: number,
  column: string,
): string | null {
  if (value == null) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  throw new Error(`Analysis row ${index} has a non-text ${column}.`);
}
