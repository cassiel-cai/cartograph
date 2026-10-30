"use client";

import {
  applyTheme,
  readThemePreference,
  THEME_CHANGE_EVENT,
  THEME_VALUES,
  writeThemePreference,
  type ThemePreference,
} from "@/lib/theme";
import { useSyncExternalStore } from "react";

const LABELS: Record<ThemePreference, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

function subscribe(onStoreChange: () => void) {
  const onChange = () => {
    applyTheme(readThemePreference());
    onStoreChange();
  };
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    media.removeEventListener("change", onChange);
  };
}

export function ThemeControl() {
  const preference = useSyncExternalStore(
    subscribe,
    readThemePreference,
    () => "system" as const,
  );

  function choose(next: ThemePreference) {
    writeThemePreference(next);
    applyTheme(next);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="flex border border-border"
    >
      {THEME_VALUES.map((value) => {
        const selected = preference === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => choose(value)}
            className={`px-2 py-0.5 text-[11px] ${
              selected
                ? "bg-foreground text-background"
                : "bg-surface text-muted hover:text-foreground"
            }`}
          >
            {LABELS[value]}
          </button>
        );
      })}
    </div>
  );
}
