"use client";

import { useLocale } from "@/components/locale-provider";
import { PathText } from "@/components/path-text";
import { rerunAnalysis, type StartState } from "@/lib/pipeline/start";
import { messagesFor } from "@/lib/messages";
import { useActionState } from "react";

const initial: StartState = { error: null };

// Shown in place of a map that cannot be drawn. The way out is always the
// button in the corner, which runs the analysis again on the same row.
export function StoredMapNotice({
  analysisId,
  repositoryUrl,
  commitSha,
  problem,
}: {
  analysisId: number;
  repositoryUrl: string;
  commitSha: string | null;
  problem: { kind: "outdated" } | { kind: "unreadable"; reason: string };
}) {
  const copy = messagesFor(useLocale());
  const [state, action, pending] = useActionState(
    rerunAnalysis.bind(null, analysisId),
    initial,
  );

  return (
    <div>
      <div className="flex items-center gap-3 border-b border-border px-4 py-2">
        <span className="text-[13px]">
          <PathText text={repositoryName(repositoryUrl)} />
        </span>
        {commitSha ? (
          <span className="font-mono text-[12px] text-muted">{commitSha.slice(0, 7)}</span>
        ) : null}
        <form action={action} className="ml-auto">
          <button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="rounded-md border border-border bg-surface px-2.5 py-1 text-[12px] disabled:opacity-70"
          >
            {pending ? copy.rerunning : copy.rerun}
          </button>
        </form>
      </div>
      <div className="px-4 py-3 text-[13px]">
        {problem.kind === "outdated" ? (
          <>
            <p>{copy.outdatedParser}</p>
            <p className="text-muted">{copy.rerunHint}</p>
          </>
        ) : (
          <>
            <p>{copy.unreadableMap}</p>
            <p className="font-mono text-[12px] text-muted">{problem.reason}</p>
            <p className="text-muted">{copy.rerunHint}</p>
          </>
        )}
        {state.error ? <p className="mt-2">{state.error}</p> : null}
      </div>
    </div>
  );
}

function repositoryName(url: string): string {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    if (parts.length >= 2) return `${parts[0]}/${parts[1].replace(/\.git$/, "")}`;
  } catch {
    return url;
  }
  return url;
}
