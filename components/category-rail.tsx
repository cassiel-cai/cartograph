"use client";

import { useLocale } from "@/components/locale-provider";
import { fileCategories } from "@/lib/map/categories";
import { messagesFor } from "@/lib/messages";
import { useState } from "react";

export function CategoryRail({
  files,
  selected,
  onSelect,
}: {
  files: readonly { path: string }[];
  selected: string | null;
  onSelect: (extension: string) => void;
}) {
  const categories = fileCategories(files);
  const copy = messagesFor(useLocale());
  const [open, setOpen] = useState(true);
  const total = categories.reduce((sum, category) => sum + category.count, 0);

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
          {categories.map((category) => {
            const active = selected === category.extension;
            return (
              <li key={category.extension}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-2 px-2 py-0.5 text-left ${active ? "bg-accent/15" : ""}`}
                  aria-pressed={active}
                  onClick={() => onSelect(category.extension)}
                >
                  <span
                    className="size-2 shrink-0"
                    style={{ background: category.color }}
                    aria-hidden
                  />
                  <span
                    className={`min-w-0 flex-1 font-mono text-[12px] ${active ? "text-accent" : ""}`}
                  >
                    {category.extension}
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