import { createServerSupabaseClient } from "@/lib/supabase/server";
import { io } from "next/cache";

export type Analysis = {
  id: number;
  repositoryUrl: string;
  state: string;
  commitSha: string | null;
  startedLabel: string | null;
  finishedLabel: string | null;
  detail: string | null;
};

// A list read names its columns and stops. Nothing pages yet.
const LIST_LIMIT = 100;

export async function listAnalyses(): Promise<Analysis[]> {
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

  // Relative labels are the current time. io() keeps that read out of the
  // prerender, which rejects Date.now().
  await io();
  return readAnalyses(data, Date.now());
}

function readAnalyses(rows: unknown, now: number): Analysis[] {
  if (!Array.isArray(rows)) {
    throw new Error("Analyses query did not return a list.");
  }

  return rows.map((row, index) => {
    if (!isRecord(row)) {
      throw new Error(`Analysis row ${index} is not an object.`);
    }

    const id = readId(row.id);
    const startedAt = readOptionalText(row.started_at, index, "started_at");
    const finishedAt = readOptionalText(row.finished_at, index, "finished_at");
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
      startedLabel: startedAt ? formatAgo(startedAt, now) : null,
      finishedLabel: finishedAt ? formatAgo(finishedAt, now) : null,
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

// Hours cover the first two days, so a row from yesterday still reads as
// "24h ago" rather than flipping to days at the first midnight.
export function formatAgo(iso: string, now: number): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) {
    throw new Error(`Could not read a time: ${iso}`);
  }

  const elapsed = Math.max(0, now - then);
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 60) {
    return `${Math.max(1, minutes)}m ago`;
  }

  const hours = Math.floor(elapsed / 3_600_000);
  if (hours < 48) {
    return `${hours}h ago`;
  }

  const days = Math.floor(elapsed / 86_400_000);
  return `${days}d ago`;
}
