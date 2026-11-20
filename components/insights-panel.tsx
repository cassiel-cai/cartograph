"use client";

import { useLocale } from "@/components/locale-provider";
import { PathText } from "@/components/path-text";
import { insights, type ImportCycle } from "@/lib/map/insights";
import type { MapHighlight } from "@/lib/map/selection";
import { messagesFor } from "@/lib/messages";
import type { ParseResult } from "@/parser/types";
import { useMemo, useState, type ReactNode } from "react";

export function InsightsPanel({
  result,
  highlight,
  nodes,
  onSelectFile,
  onHoverPath,
}: {
  result: ParseResult;
  highlight: MapHighlight;
  nodes: readonly { id: string; files: string[] }[];
  onSelectFile: (path: string) => void;
  onHoverPath: (path: string | null) => void;
}) {
  const copy = messagesFor(useLocale());
  const [open, setOpen] = useState(false);
  const found = useMemo(() => insights(result.files, result.edges), [result]);

  return (
    <section className="border-t border-border">
      <button
        type="button"
        className="flex w-full items-center px-3 py-2 text-left"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Chevron open={open} />
        {copy.insights}
      </button>
      {open ? (
        <div className="px-3 pb-3">
          <InsightBlock title={copy.insightUnimportedTitle} sentence={copy.insightUnimported} count={found.unimported.length}>
            <ul>
              {found.unimported.map((file) => (
                <FileButton
                  key={file.path}
                  path={file.path}
                  lit={pathHighlighted(file.path, highlight, nodes)}
                  onSelect={() => onSelectFile(file.path)}
                  onHover={onHoverPath}
                />
              ))}
            </ul>
          </InsightBlock>
          <InsightBlock title={copy.insightUnusualTitle} sentence={copy.insightUnusual} count={found.unusual.length}>
            <ul>
              {found.unusual.map((file) => (
                <FileButton
                  key={file.path}
                  path={file.path}
                  lit={pathHighlighted(file.path, highlight, nodes)}
                  onSelect={() => onSelectFile(file.path)}
                  onHover={onHoverPath}
                  trailing={<span className="text-in tabular-nums">←{file.fanIn}</span>}
                />
              ))}
            </ul>
          </InsightBlock>
          <InsightBlock title={copy.insightCycleTitle} sentence={copy.insightCycle} count={found.cycles.length}>
            <ul>
              {found.cycles.map((cycle) => (
                <CycleRows
                  key={cycle.files.join("\0")}
                  cycle={cycle}
                  highlight={highlight}
                  nodes={nodes}
                  onSelectFile={onSelectFile}
                  onHoverPath={onHoverPath}
                />
              ))}
            </ul>
          </InsightBlock>
          <InsightBlock title={copy.insightLongTitle} sentence={copy.insightLong} count={found.long.length}>
            <ul>
              {found.long.map((file) => (
                <FileButton
                  key={file.path}
                  path={file.path}
                  lit={pathHighlighted(file.path, highlight, nodes)}
                  onSelect={() => onSelectFile(file.path)}
                  onHover={onHoverPath}
                  trailing={<span className="text-muted tabular-nums">{file.lines}</span>}
                />
              ))}
            </ul>
          </InsightBlock>
        </div>
      ) : null}
    </section>
  );
}

function InsightBlock({
  title,
  sentence,
  count,
  children,
}: {
  title: string;
  sentence: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <div className="pt-3">
      <header className="mb-1 flex items-baseline gap-2">
        <h2>{title}</h2>
        <span className="ml-auto font-mono text-muted tabular-nums">{count}</span>
      </header>
      <p className="mb-1 text-muted">{sentence}</p>
      {count > 0 ? children : null}
    </div>
  );
}

function CycleRows({
  cycle,
  highlight,
  nodes,
  onSelectFile,
  onHoverPath,
}: {
  cycle: ImportCycle;
  highlight: MapHighlight;
  nodes: readonly { id: string; files: string[] }[];
  onSelectFile: (path: string) => void;
  onHoverPath: (path: string | null) => void;
}) {
  return (
    <li className="py-1">
      <ol>
        {cycle.files.map((path, index) => (
          <li key={`${path}:${index}`}>
            <FileButton
              path={path}
              lit={pathHighlighted(path, highlight, nodes)}
              onSelect={() => onSelectFile(path)}
              onHover={onHoverPath}
              trailing={<span className="text-muted tabular-nums">{index + 1}</span>}
            />
          </li>
        ))}
      </ol>
    </li>
  );
}

function FileButton({
  path,
  lit,
  trailing,
  onSelect,
  onHover,
}: {
  path: string;
  lit: boolean;
  trailing?: ReactNode;
  onSelect: () => void;
  onHover: (path: string | null) => void;
}) {
  return (
    <button
      type="button"
      title={path}
      className={`flex w-full items-baseline gap-2 py-0.5 text-left font-mono ${lit ? "bg-accent/15" : ""}`}
      onClick={onSelect}
      onMouseEnter={() => onHover(path)}
      onMouseLeave={() => onHover(null)}
    >
      <span className="min-w-0 flex-1 truncate">
        <PathText text={middleEllipsis(path)} />
      </span>
      {trailing ? <span className="shrink-0">{trailing}</span> : null}
    </button>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 10 10" className="mr-1.5 size-2.5 shrink-0" aria-hidden>
      {open ? (
        <path d="M1.5 3.5 5 7 8.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      ) : (
        <path d="M1.5 6.5 5 3 8.5 6.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      )}
    </svg>
  );
}

function middleEllipsis(path: string): string {
  const max = 36;
  if (path.length <= max) return path;
  const mark = "…";
  const body = max - mark.length;
  const head = Math.ceil(body * 0.62);
  return `${path.slice(0, head)}${mark}${path.slice(path.length - (body - head))}`;
}

function pathHighlighted(
  path: string,
  highlight: MapHighlight,
  nodes: readonly { id: string; files: string[] }[],
): boolean {
  if (!highlight) return false;
  if (highlight.kind === "file") return highlight.path === path;
  return nodes.find((node) => node.id === highlight.id)?.files.includes(path) ?? false;
}
