"use client";

import { useAnalysisChannel } from "@/components/analysis-channel";
import { useLocale } from "@/components/locale-provider";
import { analysisPath } from "@/lib/analysis-path";
import type { Analysis } from "@/lib/analyses";
import { messagesFor } from "@/lib/messages";
import { STALE_AFTER_MS, isStale } from "@/lib/stale";
import { PathText } from "@/components/path-text";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const STEPS = ["fetch", "select", "parse", "store"] as const;

export function AnalysisProgress({
  analysis,
  now,
}: {
  analysis: Analysis;
  now: number;
}) {
  const copy = messagesFor(useLocale());
  const router = useRouter();
  const { update, error, subscribed } = useAnalysisChannel(analysis.id);
  const stage = update?.stage ?? analysis.state;
  const message = update ? update.message : analysis.detail;
  const [lastStep, setLastStep] = useState<string | null>(null);
  if (STEPS.includes(stage as (typeof STEPS)[number]) && stage !== lastStep) setLastStep(stage);
  const [clock, setClock] = useState(now);
  const stale = isStale(stage, analysis.startedAt, clock, update?.movedAt ?? null);

  // A stage published before the socket joined is gone. One read of the row
  // once subscribed picks up wherever the run has got to; after that the
  // channel carries every change.
  useEffect(() => {
    if (subscribed) router.refresh();
  }, [router, subscribed]);

  useEffect(() => {
    if (stage !== "complete") return;
    router.replace(analysisPath(analysis.id, stage));
  }, [analysis.id, router, stage]);

  const active = stage !== "complete" && stage !== "failed";
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);

  useEffect(() => {
    const basis = update?.movedAt ?? (analysis.startedAt ? Date.parse(analysis.startedAt) : Number.NaN);
    if (!Number.isFinite(basis) || stage === "complete" || stage === "failed") return;
    const wait = basis + STALE_AFTER_MS - Date.now();
    if (wait <= 0) return;
    const id = window.setTimeout(() => setClock(Date.now()), wait);
    return () => window.clearTimeout(id);
  }, [analysis.startedAt, stage, update?.movedAt]);

  const started = analysis.startedAt ? Date.parse(analysis.startedAt) : Number.NaN;
  const elapsed = Number.isFinite(started) ? Math.max(0, Math.floor((clock - started) / 1000)) : null;
  const running = !stale && stage !== "complete" && stage !== "failed";
  const headline = stale
    ? copy.stateLabel("stale")
    : running
      ? copy.running
      : copy.stateLabel(stage);
  const position = STEPS.indexOf(stage as (typeof STEPS)[number]);
  const failedAt = STEPS.indexOf((lastStep ?? analysis.stage) as (typeof STEPS)[number]);

  return (
    <div>
      <div className="flex items-center gap-3 border-b border-border px-4 py-2">
        <span className="text-[13px]">
          <PathText text={repositoryName(analysis.repositoryUrl)} />
        </span>
        <span className="flex items-center gap-1.5 text-[12px] text-muted" aria-live="polite">
          <Dot kind={stale ? "pending" : running ? "active" : stage === "failed" ? "failed" : "done"} />
          {headline}
          {running && elapsed !== null ? <span className="font-mono tabular-nums">{elapsed}s</span> : null}
        </span>
        {running ? (
          <span className="ml-auto text-[12px] text-muted">
            {subscribed ? copy.live : copy.connecting}
          </span>
        ) : null}
      </div>
      <ol className="px-4 py-4">
        {STEPS.map((step, index) => {
          const kind = stepKind(stage, index, position, failedAt);
          const showMessage = message && (stage === "failed" ? kind === "failed" : kind === "active");
          return (
            <li key={step} className="grid grid-cols-[14px_9rem_1fr] items-baseline gap-x-3 py-1.5 text-[13px]">
              <span className="self-center">
                <Dot kind={kind} />
              </span>
              <span className={kind === "pending" ? "text-muted" : "text-foreground"}>
                {copy.stepLabel(step)}
              </span>
              {showMessage ? <span className="text-muted">{message}</span> : <span />}
            </li>
          );
        })}
      </ol>
      {error ? (
        <p className="px-4 text-[13px] text-foreground">
          {copy.progressChannel} {error}
        </p>
      ) : null}
    </div>
  );
}

type DotKind = "done" | "active" | "pending" | "failed";

function stepKind(stage: string, index: number, position: number, failedAt: number): DotKind {
  if (stage === "complete") return "done";
  if (stage === "failed") {
    if (failedAt < 0) return "pending";
    return index < failedAt ? "done" : index === failedAt ? "failed" : "pending";
  }
  if (position < 0) return "pending";
  return index < position ? "done" : index === position ? "active" : "pending";
}

function Dot({ kind }: { kind: DotKind }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="text-foreground">
      {kind === "done" ? <circle cx="6" cy="6" r="4" fill="currentColor" /> : null}
      {kind === "active" ? (
        <>
          <circle cx="6" cy="6" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.25" />
          <g className="animate-spin motion-reduce:animate-none" style={{ transformOrigin: "6px 6px" }}>
            <path
              d="M6 1.75a4.25 4.25 0 0 1 4.25 4.25"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
            />
          </g>
        </>
      ) : null}
      {kind === "pending" ? (
        <circle cx="6" cy="6" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.25" />
      ) : null}
      {kind === "failed" ? (
        <>
          <circle cx="6" cy="6" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.25" />
          <path d="M4.3 4.3l3.4 3.4M7.7 4.3L4.3 7.7" fill="none" stroke="currentColor" strokeWidth="1.25" />
        </>
      ) : null}
    </svg>
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
