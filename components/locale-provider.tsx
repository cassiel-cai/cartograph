"use client";

import {
  LOCALE_CHANGE_EVENT,
  readLocalePreference,
  type Locale,
} from "@/lib/locale";
import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";

const LocaleContext = createContext<Locale>("en");

function subscribe(onStoreChange: () => void) {
  window.addEventListener(LOCALE_CHANGE_EVENT, onStoreChange);
  return () => window.removeEventListener(LOCALE_CHANGE_EVENT, onStoreChange);
}

export function LocaleRoot({ children }: { children: ReactNode }) {
  const locale = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return children;
}

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): Locale {
  const provided = useContext(LocaleContext);
  // The server snapshot is the locale read inside the request. The client
  // snapshot is the cookie, so a switch updates without waiting for a reload.
  return useSyncExternalStore(
    subscribe,
    readLocalePreference,
    () => provided,
  );
}
