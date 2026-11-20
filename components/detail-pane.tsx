"use client";

import { InsightsPanel } from "@/components/insights-panel";
import { PathText } from "@/components/path-text";
import { useLocale } from "@/components/locale-provider";
import { extensionColor } from "@/lib/map/categories";
import {
  fileDetail,
  nodeDetail,
  repositorySummary,
  type FileDetail,
  type LinkedFile,
} from "@/lib/map/detail";
import type { MapHighlight, MapSelection } from "@/lib/map/selection";
import { walkFiles, type Walk, type WalkDirection } from "@/lib/map/walk";
import { messagesFor } from "@/lib/messages";
import type { ParseResult } from "@/parser/types";
import { useState, type ReactNode } from "react";

type Tab = "structure" | "explanation";

const LIST_LIMIT = 10;

export function DetailPane({
  result,
  selection,
  highlight,
  nodes,
  onSelectFile,
  onHoverPath,
}: {
  result: ParseResult;
  selection: MapSelection;
  highlight: MapHighlight;
  nodes: readonly { id: string; label: string; files: string[] }[];
  onSelectFile: (path: string) => void;
  onHoverPath: (path: string | null) => void;
}) {
  const copy = messagesFor(useLocale());
  const [tab, setTab] = useState<Tab>("structure");
  const [walk, setWalk] = useState<WalkDirection | null>(null);
  const summary = repositorySummary(result);
  const selected = selectedDetail(result, selection, nodes);

  return (
    <div className="flex h-full min-h-0 flex-col text-[12px]">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {!selection ? (
          <RepositorySummaryView
            summary={summary}
            highlight={highlight}
            nodes={nodes}
            onSelectFile={onSelectFile}
            onHoverPath={onHoverPath}
          />
        ) : (
          <>
            <div className="px-3 pt-3">
              <p className="text-[11px] text-muted">{copy.file}</p>
              <p className="mt-1 font-mono text-[13px] leading-snug break-all">
                <PathText text={selected?.path ?? ""} />
              </p>
            </div>
            <div className="mt-3 flex border-b border-border px-3">
              <TabButton
                active={tab === "structure"}
                label={copy.structure}
                onClick={() => setTab("structure")}
              />
              <TabButton
                active={tab === "explanation"}
                label={copy.explanation}
                onClick={() => setTab("explanation")}
              />
            </div>
            {tab === "explanation" ? (
              <p className="px-3 py-3 text-muted">{copy.explanationEmpty}</p>
            ) : (
              <FileStructure
                detail={selected}
                result={result}
                walk={walk}
                onWalk={setWalk}
                highlight={highlight}
                nodes={nodes}
                onSelectFile={onSelectFile}
                onHoverPath={onHoverPath}
              />
            )}
          </>
        )}
        <InsightsPanel
          result={result}
          highlight={highlight}
          nodes={nodes}
          onSelectFile={onSelectFile}
          onHoverPath={onHoverPath}
        />
      </div>
    </div>
  );
}

function selectedDetail(
  result: ParseResult,
  selection: MapSelection,
  nodes: readonly { id: string; files: string[] }[],
): FileDetail | null {
  if (!selection) return null;
  if (selection.kind === "file") return fileDetail(result, selection.path);
  const node = nodes.find((item) => item.id === selection.id);
  return nodeDetail(result, node?.id ?? selection.id, node?.files ?? []);
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`mr-4 border-b py-1.5 ${active ? "border-accent text-foreground" : "border-transparent text-muted"}`}
      aria-pressed={active}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function RepositorySummaryView({
  summary,
  highlight,
  nodes,
  onSelectFile,
  onHoverPath,
}: {
  summary: ReturnType<typeof repositorySummary>;
  highlight: MapHighlight;
  nodes: readonly { id: string; files: string[] }[];
  onSelectFile: (path: string) => void;
  onHoverPath: (path: string | null) => void;
}) {
  const copy = messagesFor(useLocale());
  const leaned = summary.leanedOn.slice(0, LIST_LIMIT);
  const quiet = summary.startHere.slice(0, LIST_LIMIT);
  return (
    <div>
      <div className="px-3 pt-3 pb-3">
        <p className="text-[15px] leading-tight">{summary.name}</p>
        <p className="mt-1 text-muted">{copy.frameworkDetected(summary.framework)}</p>
      </div>
      <div className="grid grid-cols-3 border-y border-border">
        <Stat
          label={copy.files}
          value={String(summary.files)}
          note={copy.skippedCount(summary.filesSkipped)}
        />
        <Stat
          label={copy.imports}
          value={String(summary.imports)}
          note={copy.unresolvedCount(summary.importsUnresolved)}
          divided
        />
        <Stat
          label={copy.routes}
          value={summary.routes === null ? "—" : String(summary.routes)}
          note={summary.routes === null ? copy.noAdapter : ""}
          divided
        />
      </div>
      <section className="px-3 pt-3">
        <header className="mb-1 flex items-baseline gap-2">
          <h2>
            <span>{copy.mostDepended}</span>{" "}
            <span className="text-muted">{copy.byImporting}</span>
          </h2>
          <span className="ml-auto font-mono text-muted tabular-nums">
            {summary.leanedOn.length}
          </span>
        </header>
        <ul>
          {leaned.map((file) => (
            <PathRow
              key={file.path}
              path={file.path}
              lit={pathHighlighted(file.path, highlight, nodes)}
              onSelect={() => onSelectFile(file.path)}
              onHover={onHoverPath}
              trailing={<span className="text-in tabular-nums">←{file.fanIn}</span>}
            />
          ))}
        </ul>
        <Remainder shown={leaned.length} total={summary.leanedOn.length} />
      </section>
      <section className="px-3 pt-4">
        <header className="mb-1 flex items-baseline gap-2">
          <h2>
            <span>{copy.importedByNothing}</span>{" "}
            <span className="text-muted">{copy.whereReadingStarts}</span>
          </h2>
          <span className="ml-auto font-mono text-muted tabular-nums">
            {summary.startHere.length}
          </span>
        </header>
        <ul>
          {quiet.map((file) => (
            <PathRow
              key={file.path}
              path={file.path}
              lit={pathHighlighted(file.path, highlight, nodes)}
              onSelect={() => onSelectFile(file.path)}
              onHover={onHoverPath}
              trailing={<span className="text-muted tabular-nums">{file.lines}</span>}
            />
          ))}
        </ul>
        <Remainder shown={quiet.length} total={summary.startHere.length} />
      </section>
      <section className="px-3 pt-4 pb-3">
        <header className="flex items-baseline">
          <h2>{copy.unidentifiedTitle}</h2>
          <span className="ml-auto font-mono tabular-nums">{summary.unidentified}</span>
        </header>
        <p className="mt-1 text-muted">{copy.unidentifiedNone}</p>
      </section>
    </div>
  );
}

function FileStructure({
  detail,
  result,
  walk,
  onWalk,
  highlight,
  nodes,
  onSelectFile,
  onHoverPath,
}: {
  detail: FileDetail | null;
  result: ParseResult;
  walk: WalkDirection | null;
  onWalk: (walk: WalkDirection | null) => void;
  highlight: MapHighlight;
  nodes: readonly { id: string; files: string[] }[];
  onSelectFile: (path: string) => void;
  onHoverPath: (path: string | null) => void;
}) {
  const copy = messagesFor(useLocale());
  if (!detail) return null;
  const isFile = result.files.some((file) => file.path === detail.path);
  const walked = isFile && walk ? walkFiles(detail.path, result.edges, walk) : null;
  return (
    <div>
      <dl className="border-b border-border px-3 py-2">
        <Fact label={copy.kind}>
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono">
            {detail.kinds.map((kind) => (
              <span key={kind} className="inline-flex items-center gap-2">
                <span
                  className="size-2 shrink-0"
                  style={{ background: extensionColor(kind) }}
                />
                {kind}
              </span>
            ))}
          </span>
        </Fact>
        <Fact label={copy.folderLabel}>
          <span className="font-mono break-all">{detail.folder}</span>
        </Fact>
        <Fact label={copy.length}>
          <span className="font-mono">{copy.linesCount(detail.lines)}</span>
        </Fact>
        <Fact label={copy.dependsOn}>
          <span className="font-mono text-out">{copy.filesCount(detail.dependsOn.length)}</span>
        </Fact>
        <Fact label={copy.dependedOn}>
          <span className="font-mono text-in">{copy.filesCount(detail.dependedOnBy.length)}</span>
        </Fact>
      </dl>
      {isFile ? (
        <WalkSection
          walk={walk}
          walked={walked}
          onWalk={onWalk}
          highlight={highlight}
          nodes={nodes}
          onSelectFile={onSelectFile}
          onHoverPath={onHoverPath}
        />
      ) : null}
      <LinkSection
        title={copy.imports}
        mark={<span className="text-out tabular-nums">{detail.dependsOn.length}→</span>}
        links={detail.dependsOn}
        highlight={highlight}
        nodes={nodes}
        onSelectFile={onSelectFile}
        onHoverPath={onHoverPath}
      />
      <LinkSection
        title={copy.importedBy}
        mark={<span className="text-in tabular-nums">←{detail.dependedOnBy.length}</span>}
        links={detail.dependedOnBy}
        highlight={highlight}
        nodes={nodes}
        onSelectFile={onSelectFile}
        onHoverPath={onHoverPath}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  note,
  divided,
}: {
  label: string;
  value: string;
  note: string;
  divided?: boolean;
}) {
  return (
    <div className={`px-3 py-2 ${divided ? "border-l border-border" : ""}`}>
      <p className="text-muted">{label}</p>
      <p className="font-mono text-[18px] leading-tight tabular-nums">{value}</p>
      <p className="text-[11px] text-muted">{note}</p>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 py-0.5">
      <dt className="w-28 shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function WalkSection({
  walk,
  walked,
  onWalk,
  highlight,
  nodes,
  onSelectFile,
  onHoverPath,
}: {
  walk: WalkDirection | null;
  walked: Walk | null;
  onWalk: (walk: WalkDirection | null) => void;
  highlight: MapHighlight;
  nodes: readonly { id: string; files: string[] }[];
  onSelectFile: (path: string) => void;
  onHoverPath: (path: string | null) => void;
}) {
  const copy = messagesFor(useLocale());
  const choose = (direction: WalkDirection) => {
    onWalk(walk === direction ? null : direction);
  };
  const incoming = walk === "dependents";
  const steps = walked?.steps ?? [];
  const near = steps.filter((step) => step.depth === 1);
  const far = steps.filter((step) => step.depth === 2);
  return (
    <section className="border-b border-border px-3 py-2">
      <div className="flex gap-2">
        <WalkButton
          label={copy.blastRadius}
          active={walk === "dependents"}
          onClick={() => choose("dependents")}
        />
        <WalkButton
          label={copy.dependencyChain}
          active={walk === "needs"}
          onClick={() => choose("needs")}
        />
      </div>
      {walk && walked ? (
        <div className="pt-3">
          <header className="flex items-baseline gap-3">
            <p className="min-w-0 flex-1">
              {incoming ? copy.blastRadiusAbout : copy.dependencyChainAbout}
            </p>
            <span className={`shrink-0 font-mono text-[13px] tabular-nums ${incoming ? "text-in" : "text-out"}`}>
              {steps.length}
            </span>
          </header>
          <StepGroup
            label={copy.stepAway(1, near.length)}
            steps={near}
            highlight={highlight}
            nodes={nodes}
            onSelectFile={onSelectFile}
            onHoverPath={onHoverPath}
          />
          <StepGroup
            label={copy.stepAway(2, far.length)}
            steps={far}
            highlight={highlight}
            nodes={nodes}
            onSelectFile={onSelectFile}
            onHoverPath={onHoverPath}
          />
          {walked.omitted > 0 ? (
            <p className="pt-2 text-muted">{copy.furtherNotListed(walked.omitted)}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function StepGroup({
  label,
  steps,
  highlight,
  nodes,
  onSelectFile,
  onHoverPath,
}: {
  label: string;
  steps: readonly { path: string }[];
  highlight: MapHighlight;
  nodes: readonly { id: string; files: string[] }[];
  onSelectFile: (path: string) => void;
  onHoverPath: (path: string | null) => void;
}) {
  if (steps.length === 0) return null;
  return (
    <div className="pt-2">
      <p className="text-muted">{label}</p>
      <ul>
        {steps.map((step) => (
          <PathRow
            key={step.path}
            path={step.path}
            label={filePathLabel(step.path)}
            lit={pathHighlighted(step.path, highlight, nodes)}
            onSelect={() => onSelectFile(step.path)}
            onHover={onHoverPath}
          />
        ))}
      </ul>
    </div>
  );
}

function WalkButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`flex-1 border px-2 py-1 ${active ? "border-accent bg-accent/15 text-foreground" : "border-border bg-background text-foreground"}`}
      aria-pressed={active}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function LinkSection({
  title,
  mark,
  links,
  highlight,
  nodes,
  onSelectFile,
  onHoverPath,
}: {
  title: string;
  mark: ReactNode;
  links: readonly LinkedFile[];
  highlight: MapHighlight;
  nodes: readonly { id: string; files: string[] }[];
  onSelectFile: (path: string) => void;
  onHoverPath: (path: string | null) => void;
}) {
  const copy = messagesFor(useLocale());
  return (
    <section className="px-3 pt-3">
      <header className="mb-1 flex items-baseline">
        <h2>{title}</h2>
        <span className="ml-auto font-mono">{mark}</span>
      </header>
      <ul>
        {links.map((link) => (
          <PathRow
            key={link.path}
            path={link.path}
            lit={pathHighlighted(link.path, highlight, nodes)}
            onSelect={() => onSelectFile(link.path)}
            onHover={onHoverPath}
            trailing={
              link.typeOnly ? <span className="text-muted">{copy.typeOnly}</span> : null
            }
          />
        ))}
      </ul>
    </section>
  );
}

function PathRow({
  path,
  label,
  lit,
  trailing,
  onSelect,
  onHover,
}: {
  path: string;
  label?: string;
  lit: boolean;
  trailing?: ReactNode;
  onSelect: () => void;
  onHover: (path: string | null) => void;
}) {
  return (
    <li>
      <button
        type="button"
        title={path}
        className={`flex w-full items-baseline gap-2 py-0.5 text-left font-mono ${lit ? "bg-accent/15" : ""}`}
        onClick={onSelect}
        onMouseEnter={() => onHover(path)}
        onMouseLeave={() => onHover(null)}
      >
        <span className="min-w-0 flex-1 truncate">
          <PathText text={label ?? middleEllipsis(path)} />
        </span>
        {trailing ? <span className="shrink-0">{trailing}</span> : null}
      </button>
    </li>
  );
}

function Remainder({ shown, total }: { shown: number; total: number }) {
  const copy = messagesFor(useLocale());
  const rest = total - shown;
  if (rest <= 0) return null;
  return <p className="py-1 text-muted">{copy.moreNotListed(rest)}</p>;
}

function filePathLabel(path: string): string {
  const max = 42;
  if (path.length <= max) return path;
  const slash = path.lastIndexOf("/");
  const file = slash === -1 ? path : path.slice(slash + 1);
  const mark = "…/";
  if (file.length + mark.length >= max) return file;
  return `${path.slice(0, max - file.length - mark.length)}${mark}${file}`;
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
