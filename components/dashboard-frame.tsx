'use client'

import { useLocale } from '@/components/locale-provider'
import { messagesFor } from '@/lib/messages'
import { getOrgSwitching, registerServerOrg, subscribeOrgSwitch } from '@/lib/org-switch'
import { useEffect, useSyncExternalStore, type ReactNode } from 'react'

export function DashboardFrame({ serverOrgId, children }: { serverOrgId: string; children: ReactNode }) {
  const switching = useSyncExternalStore(subscribeOrgSwitch, getOrgSwitching, () => false)
  useEffect(() => {
    registerServerOrg(serverOrgId)
  }, [serverOrgId])

  if (switching) {
    return <AnalysesLoading />
  }

  return children
}

export function AnalysesLoading() {
  const copy = messagesFor(useLocale())

  return (
    <div aria-busy="true" aria-live="polite" className="flex-1 px-4 py-3">
      <p className="text-[13px] text-muted">{copy.loading}</p>
    </div>
  )
}
