"use client";

import { useLocale } from "@/components/locale-provider";
import { TeamName } from "@/components/team-name";
import type { Analysis } from "@/lib/analyses";
import { formatAgo } from "@/lib/ago";
import { messagesFor } from "@/lib/messages";

const STATE_ORDER = ["parsing", "queued", "complete", "failed"] as const;

export function AnalysisList({
  analyses,
  now,
  teamFallback,
}: {
  analyses: Analysis[];
  now: number;
  teamFallback: string;
}) {
  const copy = messagesFor(useLocale());
  const summary = summarize(analyses);

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-4 py-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[14px] font-medium">
            <TeamName fallback={teamFallback} />
          </h1>
          <p className="text-[13px] text-muted">
            {copy.analysisCount(analyses.length)}
          </p>
        </div>
        {summary.length > 0 ? (
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
            {summary.map((item) => (
              <li key={item.state} className="flex items-center gap-1.5">
                <StateIcon state={item.state} />
                <span className="tabular-nums">
                  {item.count} {copy.stateLabel(item.state)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {analyses.length === 0 ? (
        <p className="border-t border-border px-4 py-3 text-[13px] text-muted">
          {copy.emptyAnalyses}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-180 border-collapse text-left">
            <thead>
              <tr className="border-y border-border text-[12px] text-muted">
                <th className="px-4 py-2 font-normal">{copy.repository}</th>
                <th className="w-36 px-3 py-2 font-normal">{copy.state}</th>
                <th className="w-28 px-3 py-2 font-normal">{copy.commit}</th>
                <th className="w-28 px-3 py-2 font-normal">{copy.started}</th>
                <th className="w-28 px-3 py-2 font-normal">{copy.finished}</th>
              </tr>
            </thead>
            <tbody>
              {analyses.map((analysis) => (
                <tr key={analysis.id} className="border-b border-border">
                  <td className="px-4 py-2.5 align-top">
                    <div className="font-mono text-[13px]">
                      {repositoryName(analysis.repositoryUrl)}
                    </div>
                    {analysis.detail ? (
                      <div className="mt-0.5 text-[12px] text-muted">
                        {analysis.detail}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <span className="flex items-center gap-1.5 text-[13px]">
                      <StateIcon state={analysis.state} />
                      {copy.stateLabel(analysis.state)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 align-top font-mono text-[13px]">
                    <Cell value={analysis.commitSha} />
                  </td>
                  <td className="px-3 py-2.5 align-top text-[13px]">
                    <Ago iso={analysis.startedAt} now={now} />
                  </td>
                  <td className="px-3 py-2.5 align-top text-[13px]">
                    <Ago iso={analysis.finishedAt} now={now} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Cell({ value }: { value: string | null }) {
  if (!value) {
    return <span className="text-muted">—</span>;
  }

  return value;
}

function Ago({ iso, now }: { iso: string | null; now: number }) {
  const locale = useLocale();
  if (!iso) {
    return <span className="text-muted">—</span>;
  }

  return formatAgo(iso, now, locale);
}

function summarize(analyses: Analysis[]) {
  const counts = new Map<string, number>();
  for (const analysis of analyses) {
    counts.set(analysis.state, (counts.get(analysis.state) ?? 0) + 1);
  }

  const known = STATE_ORDER.filter((state) => (counts.get(state) ?? 0) > 0);
  const rest = [...counts.keys()].filter(
    (state) => !known.includes(state as (typeof STATE_ORDER)[number]),
  );

  return [...known, ...rest].map((state) => ({
    state,
    count: counts.get(state) ?? 0,
  }));
}

function StateIcon({ state }: { state: string }) {
  if (state === "complete") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <circle cx="6" cy="6" r="4" fill="currentColor" />
      </svg>
    );
  }

  if (state === "failed") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <circle
          cx="6"
          cy="6"
          r="4.25"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
        />
        <path
          d="M4.3 4.3l3.4 3.4M7.7 4.3L4.3 7.7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
        />
      </svg>
    );
  }

  if (state === "parsing") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <circle
          cx="6"
          cy="6"
          r="4.25"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
        />
        <circle cx="6" cy="6" r="1.7" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <circle
        cx="6"
        cy="6"
        r="4.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
      />
    </svg>
  );
}

function repositoryName(url: string): string {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1].replace(/\.git$/, "")}`;
    }
  } catch {
    return url;
  }

  return url;
}
