'use client'

import { ThemeControl } from '@/components/theme-control'
import { UserButton } from '@clerk/nextjs'

const appearance = {
  variables: {
    borderRadius: '2px',
  },
  elements: {
    userButtonAvatarBox: {
      width: '24px',
      height: '24px',
    },
  },
}

export function HeaderActions() {
  return (
    <div className="ml-auto flex items-center gap-2">
      <ThemeControl />
      <UserButton appearance={appearance} />
    </div>
  )
}
