"use client";

import { useLocale } from "@/components/locale-provider";
import type { RailItem } from "@/lib/map/rail";
import { messagesFor } from "@/lib/messages";
import { useState } from "react";

export function CategoryRail({
  items,
  selected,
  onSelect,
}: {
  items: readonly RailItem[];
  selected: string | null;
  onSelect: (key: string) => void;
}) {
  const copy = messagesFor(useLocale());
  const [open, setOpen] = useState(true);
  const total = items.reduce((sum, category) => sum + category.count, 0);

  return (
    <div className="py-1">
      <button
        type="button"
        className="flex w-full items-center px-2 py-1 text-left font-mono text-[12px]"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Chevron open={open} />
        <span className="min-w-0">{copy.categoriesSummary(total)}</span>
      </button>
      {open ? (
        <ul>
          {items.map((category) => {
            const active = selected === category.key;
            return (
              <li key={category.key}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-2 px-2 py-0.5 text-left ${active ? "bg-accent/15" : ""}`}
                  aria-pressed={active}
                  onClick={() => onSelect(category.key)}
                >
                  {category.color ? (
                    <span
                      className="size-2 shrink-0"
                      style={{ background: category.color }}
                      aria-hidden
                    />
                  ) : null}
                  <span
                    className={`min-w-0 flex-1 font-mono text-[12px] ${active ? "text-accent" : ""}`}
                  >
                    {category.label}
                  </span>
                  <span className="font-mono text-[12px] text-muted tabular-nums">
                    {category.count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 10 10"
      className="mr-1.5 size-2.5 shrink-0"
      aria-hidden
    >
      {open ? (
        <path d="M1.5 3.5 5 7 8.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      ) : (
        <path d="M1.5 6.5 5 3 8.5 6.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      )}
    </svg>
  );
}