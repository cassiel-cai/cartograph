import { HeaderActions } from '@/components/header-actions'
import { OrgControls } from '@/components/org-controls'
import Link from 'next/link'
import { type ReactNode } from 'react'

export function Shell({ organization, children }: { organization: { id: string; slug: string | null }; children: ReactNode }) {
  return (
    <div className="flex h-full min-h-dvh flex-col bg-background text-foreground">
      <header className="flex h-11 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
        <Link href="/" className="text-[14px] font-medium tracking-tight">
          cartograph
        </Link>
        <OrgControls />
        <HeaderActions organization={organization} />
      </header>
      <main className="flex min-h-0 flex-1 flex-col overflow-auto">{children}</main>
    </div>
  )
}
