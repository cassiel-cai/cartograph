import { AnalysesLoading, DashboardFrame } from "@/components/dashboard-frame";
import { LocaleProvider } from "@/components/locale-provider";
import { MapCanvas } from "@/components/map-canvas";
import { Shell } from "@/components/shell";
import { StoredMapNotice } from "@/components/stored-map-notice";
import { analysisPath } from "@/lib/analysis-path";
import { getAnalysis } from "@/lib/analyses";
import { getLocale } from "@/lib/locale-server";
import { loadStoredMap } from "@/lib/map/load-stored";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-background">
          <AnalysesLoading />
        </div>
      }
    >
      <Map params={params} />
    </Suspense>
  );
}

async function Map({ params }: { params: Promise<{ id: string }> }) {
  const { orgId, orgSlug } = await auth.protect();
  if (!orgId) {
    throw new Error(
      "Signed in with no active organization. The session token should already carry one.",
    );
  }

  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) notFound();

  const [locale, loaded] = await Promise.all([getLocale(), getAnalysis(id)]);
  if (!loaded.analysis) notFound();
  if (loaded.analysis.state !== "complete") redirect(analysisPath(id, loaded.analysis.state));

  const stored = await loadStoredMap(id);
  if (!stored) {
    throw new Error(`Analysis ${id} is complete but its map could not be read.`);
  }
  if (stored.kind !== "current") {
    return (
      <LocaleProvider locale={locale}>
        <Shell organization={{ id: orgId, slug: orgSlug ?? null }}>
          <DashboardFrame serverOrgId={orgId}>
            <StoredMapNotice
              analysisId={id}
              repositoryUrl={loaded.analysis.repositoryUrl}
              commitSha={loaded.analysis.commitSha}
              problem={stored}
            />
          </DashboardFrame>
        </Shell>
      </LocaleProvider>
    );
  }
  const result = stored.result;

  return (
    <LocaleProvider locale={locale}>
      <Shell organization={{ id: orgId, slug: orgSlug ?? null }}>
        <DashboardFrame serverOrgId={orgId}>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <MapCanvas result={result} />
          </div>
        </DashboardFrame>
      </Shell>
    </LocaleProvider>
  );
}
