import { AnalysisList } from "@/components/analysis-list";
import { AnalysesLoading, DashboardFrame } from "@/components/dashboard-frame";
import { LocaleProvider } from "@/components/locale-provider";
import { Shell } from "@/components/shell";
import { listAnalyses } from "@/lib/analyses";
import { getLocale } from "@/lib/locale-server";
import { auth } from "@clerk/nextjs/server";
import { Suspense } from "react";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-background">
          <AnalysesLoading />
        </div>
      }
    >
      <Workspace />
    </Suspense>
  );
}

async function Workspace() {
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
          <Suspense fallback={<AnalysesLoading />}>
            <AnalysisSection teamFallback={orgSlug ?? orgId} />
          </Suspense>
        </DashboardFrame>
      </Shell>
    </LocaleProvider>
  );
}

async function AnalysisSection({ teamFallback }: { teamFallback: string }) {
  const { analyses, now } = await listAnalyses();
  return (
    <AnalysisList analyses={analyses} now={now} teamFallback={teamFallback} />
  );
}
