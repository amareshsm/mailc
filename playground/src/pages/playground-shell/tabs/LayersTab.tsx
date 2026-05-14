/**
 * Layers tab — Figma-style hierarchy of source-map entries. Reads the active
 * store via context so it works against either playground variant.
 */
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getComponentMeta } from '@/lib/component-icons'
import { getAncestorIds } from '@/lib/layer-tree'
import { usePlayground } from '../playground-context'
import type { SourceMapEntry } from '@/types/source-map'

export function LayersTab() {
  const { useStore } = usePlayground()
  const sourceMap = useStore((s) => s.sourceMap)
  const selectedEntryId = useStore((s) => s.selectedEntryId)
  const setSelectedEntry = useStore((s) => s.setSelectedEntry)

  const roots = sourceMap?.entries.filter((e) => e.parentId === null) ?? []
  const ancestorIds =
    selectedEntryId && sourceMap
      ? getAncestorIds(sourceMap.entries, selectedEntryId)
      : new Set<string>()

  return (
    <div className="h-full flex flex-col overflow-hidden bg-card">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between shrink-0 bg-card">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Layers
        </span>
        {sourceMap && (
          <span className="text-[9px] text-muted-foreground/40 font-mono">
            {sourceMap.entries.length}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {roots.length === 0 ? (
          <div className="px-3 py-4 text-[11px] text-muted-foreground/40 text-center">
            Compile to see layers
          </div>
        ) : (
          roots.map((root) => (
            <LayerNode
              key={root.id}
              entry={root}
              allEntries={sourceMap!.entries}
              depth={0}
              selectedEntryId={selectedEntryId}
              ancestorIds={ancestorIds}
              onSelect={setSelectedEntry}
            />
          ))
        )}
      </div>
    </div>
  )
}

const INDENT = 16

interface LayerNodeProps {
  entry: SourceMapEntry
  allEntries: SourceMapEntry[]
  depth: number
  selectedEntryId: string | null
  ancestorIds: Set<string>
  onSelect: (id: string) => void
}

function LayerNode({
  entry,
  allEntries,
  depth,
  selectedEntryId,
  ancestorIds,
  onSelect,
}: LayerNodeProps) {
  const [expanded, setExpanded] = useState(depth < 3)
  const children = entry.children
    .map((id) => allEntries.find((e) => e.id === id))
    .filter((e): e is SourceMapEntry => e !== undefined)
  const hasChildren = children.length > 0
  const isSelected = selectedEntryId === entry.id
  const isAncestor = ancestorIds.has(entry.id)
  const { label, Icon } = getComponentMeta(entry.sourceComponent)

  const isOpen = expanded || isAncestor

  const rowRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (isSelected) {
      rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [isSelected])

  return (
    <div>
      <div
        ref={rowRef}
        className={cn(
          'group flex items-center h-7 pr-2 cursor-pointer select-none transition-colors',
          isSelected
            ? 'bg-surface-hover text-foreground'
            : 'hover:bg-surface text-muted-foreground hover:text-foreground',
        )}
        onClick={() => onSelect(entry.id)}
      >
        <div style={{ width: `${depth * INDENT + 4}px`, flexShrink: 0 }} />

        <button
          className="w-4 h-4 flex items-center justify-center shrink-0 text-muted-foreground/30 hover:text-muted-foreground"
          onClick={(ev) => {
            ev.stopPropagation()
            setExpanded((v) => !v)
          }}
          tabIndex={-1}
        >
          {hasChildren ? (
            isOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )
          ) : (
            <span className="w-3 h-3" />
          )}
        </button>

        <Icon
          className={cn(
            'h-3.5 w-3.5 shrink-0 mx-1.5',
            isSelected
              ? 'text-foreground/80'
              : 'text-muted-foreground/50 group-hover:text-muted-foreground',
          )}
        />

        <span
          className={cn(
            'flex-1 text-[12px] truncate',
            isSelected ? 'text-foreground font-medium' : '',
          )}
        >
          {label}
        </span>

        <span
          className={cn(
            'text-[10px] font-mono shrink-0 tabular-nums transition-opacity',
            isSelected ? 'opacity-50' : 'opacity-0 group-hover:opacity-30',
          )}
        >
          {entry.sourceLoc.startLine}
        </span>
      </div>

      {hasChildren && isOpen && (
        <div>
          {children.map((child) => (
            <LayerNode
              key={child.id}
              entry={child}
              allEntries={allEntries}
              depth={depth + 1}
              selectedEntryId={selectedEntryId}
              ancestorIds={ancestorIds}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}
