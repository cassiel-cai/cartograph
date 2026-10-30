"use client";

import { useLocale } from "@/components/locale-provider";
import { enUS, zhCN } from "@clerk/localizations";
import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";

const clerkLocales = {
  en: enUS,
  zh: zhCN,
} as const;

const appearance = {
  variables: {
    borderRadius: "2px",
    fontFamily: "var(--font-geist-sans)",
  },
};

export function AppClerkProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();

  return (
    <ClerkProvider
      localization={clerkLocales[locale]}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignOutUrl="/sign-in"
      appearance={appearance}
    >
      {children}
    </ClerkProvider>
  );
}
