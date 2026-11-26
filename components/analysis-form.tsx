"use client";

import { useLocale } from "@/components/locale-provider";
import { startAnalysis, type StartState } from "@/lib/pipeline/start";
import { messagesFor } from "@/lib/messages";
import { useActionState } from "react";

const initial: StartState = { error: null };

export function AnalysisForm() {
  const copy = messagesFor(useLocale());
  const [state, action, pending] = useActionState(startAnalysis, initial);

  return (
    <form action={action} className="relative w-full max-w-sm min-w-60 flex-1">
      <div className="flex items-center gap-2">
        <input
          name="repository"
          required
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder={copy.repositoryPlaceholder}
          aria-label={copy.repository}
          readOnly={pending}
          className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2 py-1 font-mono text-[13px] text-foreground outline-none read-only:opacity-60"
        />
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-accent px-2.5 py-1 text-[12px] text-white disabled:opacity-70"
        >
          {pending ? <Spinner /> : null}
          {pending ? copy.analysing : copy.analyse}
        </button>
      </div>
      {state.error ? (
        <p className="absolute top-full left-0 z-10 mt-1 text-[12px] text-foreground">{state.error}</p>
      ) : null}
    </form>
  );
}

function Spinner() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      aria-hidden="true"
      className="animate-spin motion-reduce:animate-none"
    >
      <circle cx="6" cy="6" r="4.25" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
      <path d="M6 1.75a4.25 4.25 0 0 1 4.25 4.25" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
