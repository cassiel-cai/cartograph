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
  });
}
