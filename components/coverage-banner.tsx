"use client";

import { useLocale } from "@/components/locale-provider";
import { coverageOf, isPartial } from "@/lib/map/coverage";
import { messagesFor } from "@/lib/messages";
import type { ParseResult } from "@/parser/types";
import { useState } from "react";

export function CoverageBanner({ result }: { result: ParseResult }) {
  const copy = messagesFor(useLocale());
  const [open, setOpen] = useState(true);
  const coverage = coverageOf(result.counts, result.skipped);
  if (!isPartial(coverage)) return null;

  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-border bg-surface px-3 py-1 text-[11px]">
      <span className="font-medium text-foreground">{copy.coverageLine(coverage.percent)}</span>
      {open ? (
        <>
          <span className="text-muted tabular-nums">
            {copy.coverageFiles(coverage.filesParsed, coverage.sourceFiles)}
          </span>
          {coverage.notCode > 0 ? (
            <span className="text-muted tabular-nums">{copy.coverageNotCode(coverage.notCode)}</span>
          ) : null}
          <span className="text-muted tabular-nums">
            {copy.coverageImports(coverage.importsResolved, coverage.importsInternal)}
          </span>
        </>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="ml-auto text-muted underline"
      >
        {open ? copy.coverageCollapse : copy.coverageExpand}
      </button>
    </div>
  );
}
