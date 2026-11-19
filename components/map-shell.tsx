import { type ReactNode } from 'react'

// Column widths are settled here. Later phases fill these; they do not move them.
const RAIL_WIDTH = 'w-56'
const DETAIL_WIDTH = 'w-80'

export function MapShell({
  rail,
  canvas,
  detail,
  zoom,
}: {
  rail?: ReactNode
  canvas?: ReactNode
  detail?: ReactNode
  zoom?: string | null
}) {
  return (
    <div className="flex min-h-0 min-w-3xl flex-1 overflow-hidden">
      <aside aria-label="Categories" className={`${RAIL_WIDTH} shrink-0 overflow-y-auto border-r border-border bg-surface`}>
        {rail}
      </aside>
      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-background">{canvas}</div>
      <aside aria-label="Detail" className={`${DETAIL_WIDTH} relative flex min-h-0 shrink-0 flex-col overflow-hidden border-l border-border bg-surface`}>
        {detail}
        {zoom ? (
          <div className="pointer-events-none absolute top-2 right-2 rounded-md bg-foreground/12 px-1.5 py-0.5 font-mono text-[11px] text-foreground">
            {zoom}
          </div>
        ) : null}
      </aside>
    </div>
  )
}
