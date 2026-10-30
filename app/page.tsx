import { Shell } from "@/components/shell";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { Suspense } from "react";

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <Workspace />
    </Suspense>
  );
}

async function Workspace() {
  const { orgId, orgSlug } = await auth.protect();
  // Bind the Clerk session token on this request. Nothing queries yet.
  const supabase = createServerSupabaseClient();
  void supabase;

  if (!orgId) {
    throw new Error(
      "Signed in with no active organization. The session token should already carry one.",
    );
  }

  return (
    <Shell organization={{ id: orgId, slug: orgSlug ?? null }}>
      <div className="flex h-full min-h-0 flex-col">
        <h2 className="border-b border-border px-2 py-1 text-[11px] text-muted">
          Map
        </h2>
        <p className="px-2 py-2 text-[11px] text-muted">
          Paste a public repository after this workspace is wired.
        </p>
      </div>
    </Shell>
  );
}
