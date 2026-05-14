/**
 * Console tab — compile diagnostics with severity filters and a Clear action.
 *
 * Filter pills (all / errors / warnings / info) drive the same store-level
 * `consoleFilter` as the legacy `ConsolePanel`, so the user's choice persists
 * across tab moves and route changes. Each entry is clickable: locating the
 * underlying source line via the store's `setSourceJump` action so the
 * Markup tab scrolls + highlights the offending line.
 *
 * Severity colours use `text-X-600 dark:text-X-400` pairs because the
 * single-tone `text-X-400` look that's fine on a dark card disappears
 * against a white card in light mode.
 */
import { useMemo } from 'react'
import { AlertCircle, AlertTriangle, Info, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePlayground } from '../playground-context'

const SEVERITY_ICON = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
} as const

// Two-tone (light/dark) tokens for every severity-coloured surface.
const SEVERITY = {
  error: {
    fg: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-500/10 dark:bg-rose-500/15',
    border: 'border-rose-500/30 dark:border-rose-500/40',
  },
  warning: {
    fg: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    border: 'border-amber-500/30 dark:border-amber-500/40',
  },
  info: {
    fg: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-500/10 dark:bg-sky-500/15',
    border: 'border-sky-500/30 dark:border-sky-500/40',
  },
} as const

type Filter = 'all' | 'error' | 'warning' | 'info'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all',     label: 'All' },
  { id: 'error',   label: 'Errors' },
  { id: 'warning', label: 'Warnings' },
  { id: 'info',    label: 'Info' },
]

export function ConsoleTab() {
  const { useStore } = usePlayground()
  const entries = useStore((s) => s.consoleEntries)
  const filter = useStore((s) => s.consoleFilter)
  const setFilter = useStore((s) => s.setConsoleFilter)
  const clear = useStore((s) => s.clearConsole)
  const setSourceJump = useStore((s) => s.setSourceJump)

  const counts = useMemo(() => {
    const c = { all: entries.length, error: 0, warning: 0, info: 0 }
    for (const e of entries) c[e.severity]++
    return c
  }, [entries])

  const visible = useMemo(() => {
    if (filter === 'all') return entries
    return entries.filter((e) => e.severity === filter)
  }, [entries, filter])

  return (
    <div className="h-full flex flex-col overflow-hidden bg-card">
      {/* Filter bar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border shrink-0 bg-card">
        {FILTERS.map((f) => {
          const count = counts[f.id]
          const isActive = filter === f.id
          const tone = f.id !== 'all' ? SEVERITY[f.id] : null
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition-colors',
                isActive
                  ? tone
                    ? cn('border', tone.bg, tone.border, tone.fg)
                    : 'bg-muted text-foreground border border-border'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent',
              )}
            >
              <span>{f.label}</span>
              {count > 0 && (
                <span
                  className={cn(
                    'text-[10px] font-mono tabular-nums px-1 rounded',
                    isActive
                      ? 'bg-card/60'
                      : tone
                        ? tone.fg
                        : 'text-muted-foreground',
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
        <button
          type="button"
          onClick={clear}
          disabled={entries.length === 0}
          className="ml-auto flex items-center gap-1 px-2 py-1 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Clear console"
        >
          <Trash2 className="h-3 w-3" />
          Clear
        </button>
      </div>

      {/* Entries */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {visible.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center px-4 gap-1.5">
            <p className="text-xs text-muted-foreground">
              {entries.length === 0
                ? 'No diagnostics — last compile was clean.'
                : `No ${filter}s.`}
            </p>
            {entries.length > 0 && filter !== 'all' && (
              <button
                type="button"
                onClick={() => setFilter('all')}
                className="text-[10px] text-foreground/80 underline underline-offset-2 hover:text-foreground"
              >
                Show all {entries.length} entries
              </button>
            )}
          </div>
        ) : (
          <ul className="text-[12px] font-mono leading-relaxed">
            {visible.map((entry) => {
              const Icon = SEVERITY_ICON[entry.severity]
              const tone = SEVERITY[entry.severity]
              const clickable = !!entry.loc
              return (
                <li
                  key={entry.id}
                  className={cn(
                    'px-3 py-2 flex items-start gap-2 transition-colors border-l-2 border-transparent',
                    clickable && 'cursor-pointer hover:bg-muted/60 hover:border-l-border',
                  )}
                  onClick={() => {
                    if (entry.loc) setSourceJump(entry.loc.line)
                  }}
                >
                  <Icon className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', tone.fg)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className={cn('font-semibold', tone.fg)}>{entry.code}</span>
                      {entry.loc && (
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {entry.loc.line}:{entry.loc.col}
                        </span>
                      )}
                    </div>
                    <p className="text-foreground break-words whitespace-pre-wrap">
                      {entry.message}
                    </p>
                    {entry.fix && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        <span className="text-foreground/70 font-medium">fix:</span>{' '}
                        {entry.fix}
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Footer summary — only when there's something to summarise */}
      {entries.length > 0 && (
        <div className="px-3 py-1.5 border-t border-border flex items-center gap-3 text-[10px] text-muted-foreground bg-muted/40 shrink-0 tabular-nums">
          <SummaryDot dotClass="bg-rose-500" count={counts.error} label="errors" />
          <SummaryDot dotClass="bg-amber-500" count={counts.warning} label="warnings" />
          <SummaryDot dotClass="bg-sky-500" count={counts.info} label="info" />
          <span className="ml-auto">
            showing {visible.length} of {entries.length}
          </span>
        </div>
      )}
    </div>
  )
}

function SummaryDot({
  dotClass,
  count,
  label,
}: {
  dotClass: string
  count: number
  label: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-1', count === 0 && 'opacity-50')}>
      <span className={cn('inline-block w-1.5 h-1.5 rounded-full', dotClass)} />
      {count} {label}
    </span>
  )
}
