import { AnalysisList } from "@/components/analysis-list";
import { AnalysesLoading, DashboardFrame } from "@/components/dashboard-frame";
import { Shell } from "@/components/shell";
import { listAnalyses } from "@/lib/analyses";
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

  return (
    <Shell organization={{ id: orgId, slug: orgSlug ?? null }}>
      <DashboardFrame serverOrgId={orgId}>
        <Suspense fallback={<AnalysesLoading />}>
          <AnalysisSection teamFallback={orgSlug ?? orgId} />
        </Suspense>
      </DashboardFrame>
    </Shell>
  );
}

async function AnalysisSection({ teamFallback }: { teamFallback: string }) {
  const analyses = await listAnalyses();
  return <AnalysisList analyses={analyses} teamFallback={teamFallback} />;
}
