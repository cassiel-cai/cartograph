"use client";

import {
  clearSupabaseToken,
  createBrowserSupabase,
  isSupabaseTokenReady,
  noteSupabaseTokenReady,
  subscribeSupabaseToken,
  writeSupabaseToken,
} from "@/lib/supabase/browser";
import { useAuth } from "@clerk/nextjs";
import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

const SupabaseContext = createContext<SupabaseClient | null>(null);

// Clerk tokens are short. Refresh before they expire so a long parse keeps
// its socket. Subscribers render only after the first token is in the cookie
// and on the socket, because their effects run before this one otherwise.
const REFRESH_MS = 45_000;

export function SupabaseSession({ children }: { children: ReactNode }) {
  const { getToken, isSignedIn } = useAuth();
  const client = useMemo(() => createBrowserSupabase(), []);
  const tokenReady = useSyncExternalStore(
    subscribeSupabaseToken,
    isSupabaseTokenReady,
    () => false,
  );

  useEffect(() => {
    if (!isSignedIn) {
      clearSupabaseToken();
      return;
    }

    let stop = false;
    const sync = async () => {
      const token = await getToken();
      if (stop || !token) return;
      writeSupabaseToken(token);
      await client.realtime.setAuth(token);
      if (!stop) noteSupabaseTokenReady();
    };

    void sync();
    const id = window.setInterval(() => void sync(), REFRESH_MS);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [client, getToken, isSignedIn]);

  return (
    <SupabaseContext.Provider value={isSignedIn && tokenReady ? client : null}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useBrowserSupabase(): SupabaseClient | null {
  return useContext(SupabaseContext);
}
