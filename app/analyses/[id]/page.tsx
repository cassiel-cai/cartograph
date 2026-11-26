import { AnalysisProgress } from "@/components/analysis-progress";
import { AnalysesLoading, DashboardFrame } from "@/components/dashboard-frame";
import { LocaleProvider } from "@/components/locale-provider";
import { Shell } from "@/components/shell";
import { analysisPath } from "@/lib/analysis-path";
import { getAnalysis } from "@/lib/analyses";
import { getLocale } from "@/lib/locale-server";
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
      <Progress params={params} />
    </Suspense>
  );
}

async function Progress({ params }: { params: Promise<{ id: string }> }) {
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
  if (loaded.analysis.state === "complete") redirect(analysisPath(id, loaded.analysis.state));

  return (
    <LocaleProvider locale={locale}>
      <Shell organization={{ id: orgId, slug: orgSlug ?? null }}>
        <DashboardFrame serverOrgId={orgId}>
          <AnalysisProgress analysis={loaded.analysis} now={loaded.now} />
        </DashboardFrame>
      </Shell>
    </LocaleProvider>
  );
}
