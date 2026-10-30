import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";

export function createServerSupabaseClient() {
  const env = serverEnv();

  return createClient(env.supabaseUrl, env.supabasePublishableKey, {
    accessToken: async () => {
      const { getToken } = await auth();
      return getToken();
    },
    // A cached response would keep the previous organization's rows after a
    // switch. The policy is what changes the list, so the request has to run.
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}
