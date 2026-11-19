import { AnalysesLoading, DashboardFrame } from "@/components/dashboard-frame";
import { LocaleProvider } from "@/components/locale-provider";
import { MapCanvas } from "@/components/map-canvas";
import { Shell } from "@/components/shell";
import { getLocale } from "@/lib/locale-server";
import { assertParseResult } from "@/parser/load";
import preview from "@/data/preview.json";
import { auth } from "@clerk/nextjs/server";
import { Suspense } from "react";

export default function PreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-background">
          <AnalysesLoading />
        </div>
      }
    >
      <Preview />
    </Suspense>
  );
}

async function Preview() {
  const { orgId, orgSlug } = await auth.protect();

  if (!orgId) {
    throw new Error(
      "Signed in with no active organization. The session token should already carry one.",
    );
  }

  const locale = await getLocale();

  return (
    <LocaleProvider locale={locale}>
      <Shell organization={{ id: orgId, slug: orgSlug ?? null }}>
        <DashboardFrame serverOrgId={orgId}>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <MapCanvas result={assertParseResult(preview)} />
          </div>
        </DashboardFrame>
      </Shell>
    </LocaleProvider>
  );
}
