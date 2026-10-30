import { HeaderActions } from "@/components/header-actions";
import { OrgControls } from "@/components/org-controls";
import { type ReactNode } from "react";

export function Shell({
  organization,
  children,
}: {
  organization: { id: string; slug: string | null };
  children: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-dvh flex-col bg-background text-foreground">
      <header className="flex h-8 shrink-0 items-center gap-3 border-b border-border bg-surface px-2">
        <span className="text-[12px] font-medium tracking-tight">
          cartograph
        </span>
        <OrgControls />
        <HeaderActions />
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-52 shrink-0 flex-col border-r border-border bg-surface">
          <h2 className="border-b border-border px-2 py-1 text-[11px] text-muted">
            Files
          </h2>
          <p className="px-2 py-2 text-[11px] text-muted">No repository yet.</p>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
        <aside className="flex w-64 shrink-0 flex-col border-l border-border bg-surface">
          <h2 className="border-b border-border px-2 py-1 text-[11px] text-muted">
            Detail
          </h2>
          <dl className="space-y-1 px-2 py-2">
            <dt className="text-[11px] text-muted">Organization</dt>
            <dd className="font-mono text-[11px] break-all">
              {organization.slug ?? organization.id}
            </dd>
            {organization.slug ? (
              <>
                <dt className="text-[11px] text-muted">Organization id</dt>
                <dd className="font-mono text-[11px] break-all">
                  {organization.id}
                </dd>
              </>
            ) : null}
          </dl>
        </aside>
      </div>
    </div>
  );
}
