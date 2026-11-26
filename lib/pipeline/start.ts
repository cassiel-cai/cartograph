"use server";

import { analysisPath } from "@/lib/analysis-path";
import { serverEnv } from "@/lib/env";
import { resumeAnalysis } from "@/lib/pipeline/run";
import { getAnalysis } from "@/lib/analyses";
import {
  ensureOrganization,
  findAnalysis,
  insertAnalysis,
  restartAnalysis,
  type StoredAnalysis,
} from "@/lib/pipeline/store";
import { isUnfinished, isStale } from "@/lib/stale";
import { canonicalRepositoryUrl } from "@/lib/pipeline/url";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { after } from "next/server";
import { redirect } from "next/navigation";

export type StartState = {
  error: string | null;
};

export async function startAnalysis(
  _previous: StartState,
  formData: FormData,
): Promise<StartState> {
  const { userId, orgId, sessionId } = await auth();
  if (!userId || !orgId || !sessionId) {
    return { error: "Sign in to a team before analysing a repository." };
  }

  const raw = formData.get("repository");
  if (typeof raw !== "string" || raw.trim() === "") {
    return { error: "Paste a repository URL." };
  }

  let repository: ReturnType<typeof canonicalRepositoryUrl>;
  try {
    repository = canonicalRepositoryUrl(raw);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "That URL could not be read.",
    };
  }

  const client = createServerSupabaseClient();
  await ensureOrganization(client, orgId);
  const existing = await findAnalysis(client, orgId, repository.url);
  if (existing) redirect(analysisPath(existing.id, existing.state));

  const inserted = await insertAnalysis(client, orgId, repository.url);
  if (inserted === "duplicate") {
    const winner = await findAnalysis(client, orgId, repository.url);
    if (!winner) {
      return {
        error: `Analysis for ${repository.url} already exists but could not be read.`,
      };
    }
    redirect(analysisPath(winner.id, winner.state));
  }

  scheduleRun(orgId, sessionId, inserted, raw);
  redirect(`/analyses/${inserted.id}`);
}

// Deliberate, from an analysis that already exists: same row, same URL, a
// fresh run. A run that is still moving is refused so two cannot write the
// same graph.
export async function rerunAnalysis(id: number): Promise<StartState> {
  const { userId, orgId, sessionId } = await auth();
  if (!userId || !orgId || !sessionId) {
    return { error: "Sign in to a team before re-running an analysis." };
  }
  if (!Number.isInteger(id) || id < 1) return { error: "That analysis does not exist." };

  const { analysis, now } = await getAnalysis(id);
  if (!analysis) return { error: "That analysis does not exist." };
  if (
    isUnfinished(analysis.state) &&
    !isStale(analysis.state, analysis.startedAt, now, null)
  ) {
    return { error: "This analysis is still running." };
  }

  const restarted = await restartAnalysis(createServerSupabaseClient(), id);
  scheduleRun(orgId, sessionId, restarted, analysis.repositoryUrl);
  redirect(`/analyses/${id}`);
}

// The page returns before the parse finishes, and a session token does not
// last that long. Each write asks Clerk for a fresh token from this same
// session. The policy still decides the organization from that token.
function scheduleRun(
  orgId: string,
  sessionId: string,
  analysis: StoredAnalysis,
  url: string,
): void {
  const env = serverEnv();
  after(() => {
    const client = createClient(env.supabaseUrl, env.supabasePublishableKey, {
      accessToken: async () => {
        const clerk = await clerkClient();
        const fresh = await clerk.sessions.getToken(sessionId);
        return fresh.jwt;
      },
      global: {
        fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
      },
    });
    return resumeAnalysis(client, orgId, analysis, url);
  });
}
