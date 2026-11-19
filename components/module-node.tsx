'use client'

import { useLocale } from '@/components/locale-provider'
import { messagesFor } from '@/lib/messages'
import type { MapHighlight } from '@/lib/map/selection'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { createContext, useContext } from 'react'

export const ListScrollContext = createContext<(id: string, top: number) => void>(() => {})

export const MapHoverContext = createContext<(highlight: MapHighlight) => void>(() => {})

export type ModuleRowData = {
  path: string
  label: string
  fanIn: number
  fanOut: number
  height: number
  color: string
  dimmed: boolean
  selected: boolean
  hovered: boolean
  placement: 'row' | 'above' | 'below'
}

export type ModuleNodeData = {
  label: string
  open: boolean
  fileCount: number
  fanIn: number
  fanOut: number
  rows: ModuleRowData[]
  dimmed: boolean
  selected: boolean
  hovered: boolean
}

export type ModuleFlowNode = Node<ModuleNodeData, 'module'>

function NodeSummary({ label, fileCount, fanIn, fanOut }: { label: string; fileCount: string; fanIn: number; fanOut: number }) {
  return (
    <>
      <span className="font-mono text-[12px] whitespace-nowrap">{label}</span>
      <span className="flex items-center gap-2 font-mono text-[12px] whitespace-nowrap">
        <span className="text-muted">{fileCount}</span>
        <span className="text-in tabular-nums">←{fanIn}</span>
        <span className="text-out tabular-nums">{fanOut}→</span>
      </span>
    </>
  )
}

function EdgeAnchors({ id, top, bottom }: { id: string; top?: number; bottom?: number }) {
  const style = { ...handleStyle, top: top ?? 'auto', bottom: bottom ?? 'auto' }
  return (
    <>
      <Handle type="target" position={Position.Left} id={`in:${id}`} style={style} isConnectable={false} />
      <Handle type="source" position={Position.Right} id={`out:${id}`} style={style} isConnectable={false} />
    </>
  )
}

function rowDimOpacity(nodeDimmed: boolean, rowDimmed: boolean): number {
  if (nodeDimmed) return 1
  return rowDimmed ? 0.2 : 1
}

const handleStyle = {
  opacity: 0,
  width: 1,
  height: 1,
  border: 'none',
  background: 'transparent',
}

export function ModuleNode({ id, data }: NodeProps<ModuleFlowNode>) {
  const copy = messagesFor(useLocale())
  const onListScroll = useContext(ListScrollContext)
  const hover = useContext(MapHoverContext)
  const border = data.selected || data.hovered ? 'border-accent' : 'border-border'
  const above = data.rows.some(row => row.placement === 'above')
  const below = data.rows.some(row => row.placement === 'below')

  return (
    <div
      className={`nopan nowheel h-full w-full rounded-sm border bg-surface ${border}`}
      style={{ opacity: data.dimmed ? 0.2 : 1 }}
      onMouseEnter={event => {
        const target = event.target
        if (target instanceof Element && target.closest('[data-file]')) return
        hover({ kind: 'node', id })
      }}
    >
      {data.open ? (
        <div className="flex h-full flex-col">
          <button
            type="button"
            data-close=""
            className={`nodrag nopan flex h-11.5 shrink-0 flex-col items-start justify-center border-b border-border px-2 text-left ${data.selected ? 'bg-accent/10' : ''}`}
            onClick={event => event.preventDefault()}
          >
            <NodeSummary label={data.label} fileCount={copy.filesLabel(data.fileCount)} fanIn={data.fanIn} fanOut={data.fanOut} />
          </button>
          <div className="relative min-h-0 flex-1">
            {above ? <EdgeAnchors id="above" top={6} /> : null}
            {below ? <EdgeAnchors id="below" bottom={6} /> : null}
            <div
              className="nowheel nopan nodrag h-full overflow-x-hidden overflow-y-auto"
              onScroll={event => onListScroll(id, event.currentTarget.scrollTop)}
              onWheel={event => event.stopPropagation()}
            >
              {data.rows.map(row => (
                <div
                  key={row.path}
                  className="relative shrink-0"
                  style={{
                    height: row.height,
                    opacity: rowDimOpacity(data.dimmed, row.dimmed),
                  }}
                >
                  {row.placement === 'row' ? (
                    <>
                      <Handle type="target" position={Position.Left} id={`in:${row.path}`} style={handleStyle} isConnectable={false} />
                      <Handle type="source" position={Position.Right} id={`out:${row.path}`} style={handleStyle} isConnectable={false} />
                    </>
                  ) : null}
                  <button
                    type="button"
                    data-file={row.path}
                    className={`nodrag nopan flex h-full w-full items-center gap-2 px-2 text-left ${row.selected || row.hovered ? 'bg-accent/15' : ''}`}
                    onClick={event => event.preventDefault()}
                    onMouseEnter={() => hover({ kind: 'file', path: row.path })}
                    onMouseLeave={() => hover({ kind: 'node', id })}
                  >
                    <span className="size-1.5 shrink-0" style={{ background: row.color }} />
                    <span className="min-w-0 flex-1 truncate font-mono text-[12px]">{row.label}</span>
                    <span className="shrink-0 font-mono text-[12px] text-in tabular-nums">←{row.fanIn}</span>
                    <span className="shrink-0 font-mono text-[12px] text-out tabular-nums">{row.fanOut}→</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="relative h-full">
          <Handle type="target" position={Position.Left} id="in" style={handleStyle} isConnectable={false} />
          <Handle type="source" position={Position.Right} id="out" style={handleStyle} isConnectable={false} />
          <button
            type="button"
            data-open=""
            className={`nodrag nopan flex h-full w-full flex-col items-start px-2 py-1.5 text-left ${data.selected ? 'bg-accent/10' : ''}`}
            onClick={event => event.preventDefault()}
          >
            <NodeSummary label={data.label} fileCount={copy.filesLabel(data.fileCount)} fanIn={data.fanIn} fanOut={data.fanOut} />
          </button>
        </div>
      )}
    </div>
  )
}
