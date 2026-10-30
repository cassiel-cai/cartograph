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
      <header className="flex h-8 shrink-0 items-center gap-3 border-b border-border bg-surface px-3">
        <span className="text-[12px] font-medium tracking-tight">
          cartograph
        </span>
        <OrgControls />
        <HeaderActions organization={organization} />
      </header>
      <main className="flex min-h-0 flex-1 flex-col overflow-auto">
        {children}
      </main>
    </div>
  );
}
