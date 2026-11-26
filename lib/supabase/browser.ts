import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// The session belongs to Clerk. This cookie is only a copy of the current
// session token, readable by the page so the realtime socket can send it.
// Supabase does not refresh it and does not store its own session.
export const SUPABASE_TOKEN_COOKIE = "cartograph-token";

let client: SupabaseClient | null = null;

export function createBrowserSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  client = createClient(url, key, {
    accessToken: async () => readSupabaseToken(),
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return client;
}

export function readSupabaseToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${SUPABASE_TOKEN_COOKIE}=([^;]*)`),
  );
  if (!match) return null;
  const token = decodeURIComponent(match[1]);
  return token.length > 0 ? token : null;
}

let tokenReady = false;
const tokenListeners = new Set<() => void>();

export function subscribeSupabaseToken(onStoreChange: () => void): () => void {
  tokenListeners.add(onStoreChange);
  return () => {
    tokenListeners.delete(onStoreChange);
  };
}

export function isSupabaseTokenReady(): boolean {
  return tokenReady;
}

function markSupabaseTokenReady(ready: boolean): void {
  if (tokenReady === ready) return;
  tokenReady = ready;
  for (const listener of tokenListeners) listener();
}

export function clearSupabaseToken(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SUPABASE_TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  markSupabaseTokenReady(false);
}

export function writeSupabaseToken(token: string): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${SUPABASE_TOKEN_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=60; SameSite=Lax${secure}`;
}

export function noteSupabaseTokenReady(): void {
  markSupabaseTokenReady(true);
}
