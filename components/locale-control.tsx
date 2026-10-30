"use client";

import { useLocale } from "@/components/locale-provider";
import {
  LOCALE_CHANGE_EVENT,
  LOCALES,
  writeLocalePreference,
  type Locale,
} from "@/lib/locale";
import { messagesFor } from "@/lib/messages";

const LABELS: Record<Locale, string> = {
  en: "EN",
  zh: "中文",
};

export function LocaleControl() {
  const locale = useLocale();
  const copy = messagesFor(locale);

  function choose(next: Locale) {
    if (next === locale) {
      return;
    }

    writeLocalePreference(next);
    window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT));
  }

  return (
    <div
      role="radiogroup"
      aria-label={copy.language}
      className="flex border border-border"
    >
      {LOCALES.map((value) => {
        const selected = locale === value;
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
