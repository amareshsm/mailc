/**
 * Reusable props-driven diagnostic console. Shows mailc compile errors,
 * warnings, and info with a collapsible body, severity filters, and clear.
 * Fully controlled — see the prop types for the wiring.
 */
import React from 'react'
import { cn } from '@/lib/utils'
import type { ConsoleEntry } from '@/lib/console-entries'
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  AlertCircle,
  AlertTriangle,
  Info,
  Lightbulb,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SEVERITY_CONFIG = {
  error: {
    icon: AlertCircle,
    label: 'Error',
    text: 'text-red-400',
    bg: 'bg-red-500/5',
    badge: 'bg-red-500/15 text-red-400',
    dot: 'bg-red-500',
    badgeDot: 'bg-red-500',
    badgeText: 'bg-red-500/15 text-red-400',
  },
  warning: {
    icon: AlertTriangle,
    label: 'Warning',
    text: 'text-amber-400',
    bg: 'bg-amber-500/5',
    badge: 'bg-amber-500/15 text-amber-400',
    dot: 'bg-amber-500',
    badgeDot: 'bg-amber-500',
    badgeText: 'bg-amber-500/15 text-amber-400',
  },
  info: {
    icon: Info,
    label: 'Info',
    text: 'text-blue-400',
    bg: 'bg-blue-500/5',
    badge: 'bg-blue-500/15 text-blue-400',
    dot: 'bg-blue-400',
    badgeDot: 'bg-blue-400',
    badgeText: 'bg-blue-500/15 text-blue-400',
  },
} as const

export type ConsoleFilter = 'all' | 'error' | 'warning' | 'info'
const FILTER_TABS: ConsoleFilter[] = ['all', 'error', 'warning', 'info']

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ConsolePanelProps {
  entries: ConsoleEntry[]
  open: boolean
  filter: ConsoleFilter
  onToggle: () => void
  onClear: () => void
  onFilterChange: (f: ConsoleFilter) => void
  /** Optional callback when a source location is clicked. */
  onLocClick?: (loc: { line: number; col: number }) => void
  /** Optional extra className for the root element. */
  className?: string
  /** Optional inline style for the root element. */
  style?: React.CSSProperties
  /**
   * Controls flex sizing.
   * When true (default), uses flex-[3] when open and h-8 when closed, matching
   * the original playground layout. Pass false to let the parent control sizing.
   */
  flexSizing?: boolean
}

// ---------------------------------------------------------------------------
// ConsolePanel
// ---------------------------------------------------------------------------

/**
 * Reusable diagnostic console panel.
 * Fully controlled — caller owns open/filter/entries state.
 */
export function ConsolePanel({
  entries,
  open,
  filter,
  onToggle,
  onClear,
  onFilterChange,
  onLocClick,
  className,
  style,
  flexSizing = true,
}: ConsolePanelProps) {
  const errorCount = entries.filter((e) => e.severity === 'error').length
  const warningCount = entries.filter((e) => e.severity === 'warning').length
  const infoCount = entries.filter((e) => e.severity === 'info').length

  const filtered =
    filter === 'all' ? entries : entries.filter((e) => e.severity === filter)

  return (
    <div
      className={cn(
        'flex flex-col border-t border-border bg-card transition-all overflow-hidden',
        flexSizing ? (open ? 'flex-3 min-h-75' : 'h-8 shrink-0') : '',
        className,
      )}
      style={style}
    >
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-border shrink-0 h-8">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className="flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-foreground/80 transition-colors"
          >
            {open ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
            Console
          </button>

          {/* Severity count badges */}
          {errorCount > 0 && (
            <SeverityBadge count={errorCount} dotClass="bg-red-500" badgeClass="bg-red-500/15 text-red-400" />
          )}
          {warningCount > 0 && (
            <SeverityBadge count={warningCount} dotClass="bg-amber-500" badgeClass="bg-amber-500/15 text-amber-400" />
          )}
          {infoCount > 0 && (
            <SeverityBadge count={infoCount} dotClass="bg-blue-400" badgeClass="bg-blue-500/15 text-blue-400" />
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Filter tabs — only shown when open */}
          {open && (
            <div className="flex items-center gap-0.5 mr-2">
              {FILTER_TABS.map((f) => (
                <button
                  key={f}
                  onClick={() => onFilterChange(f)}
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-medium transition-colors capitalize',
                    filter === f
                      ? 'bg-surface text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={onClear}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
            title="Clear console"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────── */}
      {open && (
        <div className="flex-1 overflow-y-auto font-mono text-xs">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-12 text-muted-foreground/50 text-xs">
              No messages
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filtered.map((entry) => (
                <ConsoleEntryRow key={entry.id} entry={entry} onLocClick={onLocClick} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SeverityBadge({
  count,
  dotClass,
  badgeClass,
}: {
  count: number
  dotClass: string
  badgeClass: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono', badgeClass)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', dotClass)} />
      {count}
    </span>
  )
}

function ConsoleEntryRow({
  entry,
  onLocClick,
}: {
  entry: ConsoleEntry
  onLocClick?: (loc: { line: number; col: number }) => void
}) {
  const config = SEVERITY_CONFIG[entry.severity]
  const Icon = config.icon

  return (
    <div className={cn('flex items-start gap-2.5 px-3 py-2 group', config.bg)}>
      <Icon className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', config.text)} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', config.badge)}>
            {entry.code}
          </span>
          {entry.loc && (
            <button
              type="button"
              onClick={() => onLocClick?.(entry.loc!)}
              className={cn(
                'text-[10px] text-muted-foreground',
                onLocClick ? 'hover:text-foreground underline underline-offset-2' : 'cursor-default',
              )}
              disabled={!onLocClick}
              title={onLocClick ? 'Jump to this line in editor' : undefined}
            >
              line {entry.loc.line}:{entry.loc.col}
            </button>
          )}
        </div>

        <p className={cn('mt-1 leading-relaxed whitespace-pre-wrap', config.text)}>
          {entry.message}
        </p>

        {entry.fix && (
          <div className="mt-1.5 flex items-start gap-1.5 text-[11px] text-muted-foreground bg-surface/50 rounded px-2 py-1.5">
            <Lightbulb className="h-3 w-3 mt-0.5 shrink-0 text-amber-500/70" />
            <span>{entry.fix}</span>
          </div>
        )}
      </div>

      <span className="text-[9px] text-muted-foreground/40 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {new Date(entry.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })}
      </span>
    </div>
  )
}
