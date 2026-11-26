"use client";

import { useLocale } from "@/components/locale-provider";
import { messagesFor } from "@/lib/messages";
import { GENERIC_ADAPTER } from "@/parser/taxonomy";
import type { Route } from "@/parser/types";

export function routeKey(route: Route): string {
  return `${route.method} ${route.pattern} ${route.file}:${route.line}`;
}

export function RoutesTable({
  routes,
  adapter,
  selectedKey,
  onSelect,
}: {
  routes: readonly Route[];
  adapter: string;
  selectedKey: string | null;
  onSelect: (route: Route) => void;
}) {
  const copy = messagesFor(useLocale());
  if (routes.length === 0) {
    return (
      <p className="px-4 py-3 text-[12px] text-muted">
        {adapter === GENERIC_ADAPTER ? copy.routesNoAdapter : copy.routesNone}
      </p>
    );
  }
  return (
    <table className="w-full border-collapse px-4 text-left text-[12px]">
      <thead className="text-muted">
        <tr className="border-b border-border">
          <th className="py-1 pr-4 pl-4 font-normal">{copy.routesMethod}</th>
          <th className="py-1 pr-4 font-normal">{copy.routesPattern}</th>
          <th className="py-1 pr-4 font-normal">{copy.routesFile}</th>
        </tr>
      </thead>
      <tbody className="font-mono">
        {routes.map((route) => {
          const key = routeKey(route);
          const selected = key === selectedKey;
          return (
            <tr
              key={key}
              tabIndex={0}
              aria-selected={selected}
              onClick={() => onSelect(route)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                onSelect(route);
              }}
              className={`cursor-pointer border-b border-border outline-none focus-visible:bg-accent/20 ${selected ? "bg-[color-mix(in_srgb,var(--accent)_32%,var(--surface))]" : "hover:bg-foreground/5"}`}
            >
              <td className="py-0.5 pr-4 pl-4">{route.method}</td>
              <td className="py-0.5 pr-4">{route.pattern}</td>
              <td className={`py-0.5 pr-4 ${selected ? "" : "text-muted"}`}>
                {route.file}:{route.line}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
