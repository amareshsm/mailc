/**
 * JsonCanvasNode — renders a single MCNode in the canvas (recursive).
 *
 * Handles section/column layout and leaf content nodes.
 * Selected nodes get a blue ring. Click any node to select.
 */

import type { MCNode } from 'mailc'
import { useJsonBuilderStore } from '@/store/json-builder-store'
import { cn } from '@/lib/utils'
import {
  LayoutList,
  Columns2,
  Type,
  MousePointerClick,
  Image,
  Minus,
  Space,
  ChevronRight,
} from 'lucide-react'

const TYPE_ICONS: Record<string, React.ElementType> = {
  'mc-section': LayoutList,
  'mc-column': Columns2,
  'mc-text': Type,
  'mc-button': MousePointerClick,
  'mc-image': Image,
  'mc-divider': Minus,
  'mc-spacer': Space,
}

const TYPE_LABELS: Record<string, string> = {
  'mc-section': 'Section',
  'mc-column': 'Column',
  'mc-text': 'Text',
  'mc-button': 'Button',
  'mc-image': 'Image',
  'mc-divider': 'Divider',
  'mc-spacer': 'Spacer',
}

interface Props {
  node: MCNode
  depth?: number
}

export function JsonCanvasNode({ node, depth = 0 }: Props) {
  const selectedId = useJsonBuilderStore((s) => s.selectedId)
  const selectNode = useJsonBuilderStore((s) => s.selectNode)

  const isSelected = node.id === selectedId
  const Icon = TYPE_ICONS[node.type] ?? ChevronRight
  const label = TYPE_LABELS[node.type] ?? node.type

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    selectNode(node.id ?? null)
  }

  // ─── Section ──────────────────────────────────────────────────────────────
  if (node.type === 'mc-section') {
    return (
      <div
        className={cn(
          'rounded-lg border transition-all cursor-pointer',
          isSelected
            ? 'border-blue-500 ring-2 ring-blue-500 ring-offset-1'
            : 'border-border hover:border-blue-300'
        )}
        onClick={handleClick}
      >
        {/* Section header */}
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-xs font-medium',
            isSelected
              ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
              : 'bg-surface text-muted-foreground'
          )}
        >
          <LayoutList className="h-3.5 w-3.5" />
          Section
          {node.attributes?.class && (
            <span className="ml-auto font-mono text-[10px] opacity-60 truncate max-w-[120px]">
              {node.attributes.class}
            </span>
          )}
        </div>

        {/* Columns inside section */}
        <div className="flex gap-0 p-2 bg-background/50 rounded-b-lg min-h-[48px]">
          {node.children && node.children.length > 0 ? (
            node.children.map((child) => (
              <div key={child.id} className="flex-1 min-w-0">
                <JsonCanvasNode node={child} depth={depth + 1} />
              </div>
            ))
          ) : (
            <div className="flex-1 flex items-center justify-center text-[11px] text-muted-foreground/50 py-4 border border-dashed border-border rounded">
              No columns
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── Column ───────────────────────────────────────────────────────────────
  if (node.type === 'mc-column') {
    return (
      <div
        className={cn(
          'rounded border m-1 transition-all cursor-pointer min-h-[40px]',
          isSelected
            ? 'border-blue-400 ring-1 ring-blue-400 bg-blue-50/50 dark:bg-blue-950/10'
            : 'border-border/50 hover:border-blue-200 bg-background/30'
        )}
        onClick={handleClick}
      >
        <div
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium border-b border-border/30',
            isSelected ? 'text-blue-600 dark:text-blue-300' : 'text-muted-foreground/60'
          )}
        >
          <Columns2 className="h-3 w-3" />
          Column
        </div>

        <div className="p-1.5 space-y-1.5">
          {node.children && node.children.length > 0 ? (
            node.children.map((child) => (
              <JsonCanvasNode key={child.id} node={child} depth={depth + 1} />
            ))
          ) : (
            <div className="flex items-center justify-center text-[10px] text-muted-foreground/40 py-3 border border-dashed border-border/30 rounded">
              Empty column
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── Divider ──────────────────────────────────────────────────────────────
  if (node.type === 'mc-divider') {
    return (
      <div
        className={cn(
          'px-2 py-1.5 rounded border cursor-pointer transition-all',
          isSelected
            ? 'border-blue-500 ring-2 ring-blue-500 ring-offset-1'
            : 'border-border/40 hover:border-blue-300'
        )}
        onClick={handleClick}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <Minus className="h-3 w-3 text-muted-foreground/60" />
          <span className="text-[10px] text-muted-foreground/60">Divider</span>
        </div>
        <hr className="border-border" />
      </div>
    )
  }

  // ─── Spacer ───────────────────────────────────────────────────────────────
  if (node.type === 'mc-spacer') {
    return (
      <div
        className={cn(
          'px-2 py-1 rounded border cursor-pointer transition-all',
          isSelected
            ? 'border-blue-500 ring-2 ring-blue-500 ring-offset-1'
            : 'border-dashed border-border/40 hover:border-blue-300'
        )}
        onClick={handleClick}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
            <Space className="h-3 w-3" />
            Spacer
          </span>
          {node.attributes?.class && (
            <span className="text-[10px] font-mono text-muted-foreground/40">
              {node.attributes.class}
            </span>
          )}
        </div>
        {/* Visual space indicator */}
        <div className="h-4 mt-1 rounded bg-surface/50 border border-dashed border-border/20" />
      </div>
    )
  }

  // ─── Image ────────────────────────────────────────────────────────────────
  if (node.type === 'mc-image') {
    return (
      <div
        className={cn(
          'px-2 py-1.5 rounded border cursor-pointer transition-all',
          isSelected
            ? 'border-blue-500 ring-2 ring-blue-500 ring-offset-1'
            : 'border-border/40 hover:border-blue-300'
        )}
        onClick={handleClick}
      >
        <div className="flex items-center gap-2 mb-1">
          <Image className="h-3 w-3 text-muted-foreground/60" />
          <span className="text-[10px] text-muted-foreground/60">Image</span>
        </div>
        <div className="h-12 rounded bg-surface border border-border/30 flex items-center justify-center overflow-hidden">
          {node.attributes?.src ? (
            <img
              src={node.attributes.src}
              alt={node.attributes.alt ?? ''}
              className="h-full w-full object-cover"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          ) : (
            <span className="text-[10px] text-muted-foreground/40">No source</span>
          )}
        </div>
        {node.attributes?.src && (
          <p className="text-[10px] text-muted-foreground/40 font-mono truncate mt-0.5">
            {node.attributes.src}
          </p>
        )}
      </div>
    )
  }

  // ─── Button ───────────────────────────────────────────────────────────────
  if (node.type === 'mc-button') {
    return (
      <div
        className={cn(
          'px-2 py-1.5 rounded border cursor-pointer transition-all',
          isSelected
            ? 'border-blue-500 ring-2 ring-blue-500 ring-offset-1'
            : 'border-border/40 hover:border-blue-300'
        )}
        onClick={handleClick}
      >
        <div className="flex items-center gap-2 mb-1">
          <MousePointerClick className="h-3 w-3 text-muted-foreground/60" />
          <span className="text-[10px] text-muted-foreground/60">Button</span>
        </div>
        <div className="inline-flex items-center px-3 py-1 rounded bg-blue-600 text-white text-xs font-medium">
          {node.content ?? 'Button'}
        </div>
      </div>
    )
  }

  // ─── Text ─────────────────────────────────────────────────────────────────
  if (node.type === 'mc-text') {
    const preview = node.content?.slice(0, 80) ?? ''
    return (
      <div
        className={cn(
          'px-2 py-1.5 rounded border cursor-pointer transition-all',
          isSelected
            ? 'border-blue-500 ring-2 ring-blue-500 ring-offset-1'
            : 'border-border/40 hover:border-blue-300'
        )}
        onClick={handleClick}
      >
        <div className="flex items-center gap-2 mb-0.5">
          <Type className="h-3 w-3 text-muted-foreground/60" />
          <span className="text-[10px] text-muted-foreground/60">Text</span>
        </div>
        <p className="text-xs text-foreground/70 leading-snug truncate">
          {preview || <em className="text-muted-foreground/40">Empty text</em>}
        </p>
      </div>
    )
  }

  // ─── Fallback ─────────────────────────────────────────────────────────────
  return (
    <div
      className={cn(
        'px-2 py-1.5 rounded border text-xs cursor-pointer transition-all',
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-500'
          : 'border-border/40 hover:border-blue-300'
      )}
      onClick={handleClick}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}
