import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, GitFork, Filter } from 'lucide-react'
import { getIntrospect, type ComponentSpec } from '@/introspect-demo/api'
import { cn } from '@/lib/utils'

type Hover = { parent: string; child: string } | null

export function NestingMatrix() {
  const [specs, setSpecs] = useState<ComponentSpec[]>([])
  // matrix[parent][child] = boolean
  const [matrix, setMatrix] = useState<Record<string, Record<string, boolean>>>({})
  const [hover, setHover] = useState<Hover>(null)
  const [loading, setLoading] = useState(true)
  const [hideLeaves, setHideLeaves] = useState(true)
  const [hideEmpty, setHideEmpty] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function run() {
      const introspect = await getIntrospect()
      const all = introspect.all() as ComponentSpec[]
      if (cancelled) return
      const sorted = [...all].sort((a, b) => a.type.localeCompare(b.type))

      const m: Record<string, Record<string, boolean>> = {}
      for (const p of sorted) {
        m[p.type] = {}
        for (const c of sorted) {
          m[p.type]![c.type] = introspect.canNest(p.type, c.type) === true
        }
      }
      setSpecs(sorted)
      setMatrix(m)
      setLoading(false)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  const visibleParents = useMemo(() => {
    let list = specs
    if (hideLeaves) {
      list = list.filter(
        (s) => s.allowedChildren.length > 0 || s.category === 'logic',
      )
    }
    if (hideEmpty) {
      list = list.filter((p) =>
        specs.some((c) => matrix[p.type]?.[c.type] === true),
      )
    }
    return list
  }, [specs, matrix, hideLeaves, hideEmpty])

  const visibleChildren = useMemo(() => {
    if (!hideEmpty) return specs
    return specs.filter((c) =>
      visibleParents.some((p) => matrix[p.type]?.[c.type] === true),
    )
  }, [specs, matrix, hideEmpty, visibleParents])

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 shrink-0">
        <Link
          to="/introspect"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Introspect
        </Link>
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <GitFork className="h-4 w-4 text-emerald-400" />
              <h1 className="text-xl font-bold text-foreground">
                Nesting Matrix
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Each cell is{' '}
              <code className="text-[11px] font-mono">
                introspect.canNest(parent, child)
              </code>
              . Hover any cell for the answer; click to lock the row & column.
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 text-xs">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={hideLeaves}
                onChange={(e) => setHideLeaves(e.target.checked)}
                className="h-3 w-3"
              />
              <span className="text-muted-foreground">hide leaf parents</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={hideEmpty}
                onChange={(e) => setHideEmpty(e.target.checked)}
                className="h-3 w-3"
              />
              <span className="text-muted-foreground">
                hide rows with no allowed children
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-8 text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="p-6">
            <div className="rounded-lg border border-border bg-surface/30 overflow-auto">
              <table className="text-[11px] font-mono border-collapse">
                <thead>
                  <tr>
                    <th className="sticky top-0 left-0 z-20 bg-background border-b border-r border-border px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium text-left">
                      parent ↓ / child →
                    </th>
                    {visibleChildren.map((c) => (
                      <th
                        key={c.type}
                        className={cn(
                          'sticky top-0 z-10 bg-background border-b border-border px-1.5 py-2 font-normal align-bottom text-left',
                          hover?.child === c.type
                            ? 'text-foreground bg-surface'
                            : 'text-muted-foreground',
                        )}
                        style={{ minWidth: '32px', height: '120px' }}
                      >
                        <div
                          className="whitespace-nowrap"
                          style={{
                            writingMode: 'vertical-rl',
                            transform: 'rotate(180deg)',
                          }}
                        >
                          {c.type}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleParents.map((p) => (
                    <tr key={p.type}>
                      <th
                        className={cn(
                          'sticky left-0 z-10 bg-background border-r border-border px-2.5 py-1.5 text-left font-normal whitespace-nowrap',
                          hover?.parent === p.type
                            ? 'text-foreground bg-surface'
                            : 'text-muted-foreground',
                        )}
                      >
                        {p.type}
                      </th>
                      {visibleChildren.map((c) => {
                        const ok = matrix[p.type]?.[c.type] === true
                        const isHovered =
                          hover?.parent === p.type && hover?.child === c.type
                        const inHoverRow =
                          hover?.parent === p.type || hover?.child === c.type
                        return (
                          <td
                            key={c.type}
                            onMouseEnter={() =>
                              setHover({ parent: p.type, child: c.type })
                            }
                            onMouseLeave={() => setHover(null)}
                            className={cn(
                              'border border-border/30 text-center cursor-pointer transition-colors',
                              ok
                                ? 'bg-emerald-500/10 hover:bg-emerald-500/30'
                                : 'bg-red-500/5 hover:bg-red-500/20',
                              isHovered && (ok ? 'bg-emerald-500/40' : 'bg-red-500/30'),
                              !isHovered && inHoverRow && 'bg-foreground/5',
                            )}
                            style={{ width: '28px', height: '28px' }}
                          >
                            {ok ? (
                              <span className="text-emerald-400 text-[14px]">
                                ✓
                              </span>
                            ) : (
                              <span className="text-red-500/40 text-[10px]">
                                ·
                              </span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Hover detail */}
            <div className="mt-6">
              {hover ? (
                <HoverDetail
                  parent={hover.parent}
                  child={hover.child}
                  ok={matrix[hover.parent]?.[hover.child] === true}
                  parentSpec={specs.find((s) => s.type === hover.parent) ?? null}
                  childSpec={specs.find((s) => s.type === hover.child) ?? null}
                />
              ) : (
                <div className="text-xs text-muted-foreground italic">
                  Hover a cell for details.
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="mt-6 flex items-center gap-5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-4 h-4 rounded bg-emerald-500/30 text-emerald-400 text-center text-[10px] leading-4">
                  ✓
                </span>
                allowed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-4 h-4 rounded bg-red-500/10 border border-border" />
                not allowed
              </span>
              <span className="ml-auto text-muted-foreground italic">
                {visibleParents.length} parents × {visibleChildren.length}{' '}
                children
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function HoverDetail({
  parent,
  child,
  ok,
  parentSpec,
  childSpec,
}: {
  parent: string
  child: string
  ok: boolean
  parentSpec: ComponentSpec | null
  childSpec: ComponentSpec | null
}) {
  return (
    <div className="rounded-lg border border-border bg-surface/30 p-4">
      <div className="flex items-center gap-2 mb-2">
        <code className="text-sm font-mono font-bold text-foreground">
          {parent}
        </code>
        <span className="text-muted-foreground">→</span>
        <code className="text-sm font-mono font-bold text-foreground">
          {child}
        </code>
        <span className="ml-auto">
          {ok ? (
            <span className="text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              ✓ allowed
            </span>
          ) : (
            <span className="text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/25">
              ✗ not allowed
            </span>
          )}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 text-xs">
        {parentSpec && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
              {parent} accepts
            </div>
            <div className="text-foreground">
              {parentSpec.allowedChildren.length === 0 ? (
                <span className="text-muted-foreground italic">
                  no children (leaf)
                </span>
              ) : (
                <span>
                  {parentSpec.allowedChildren.length} types:{' '}
                  <span className="text-muted-foreground font-mono">
                    {parentSpec.allowedChildren.slice(0, 5).join(', ')}
                    {parentSpec.allowedChildren.length > 5 ? '…' : ''}
                  </span>
                </span>
              )}
            </div>
          </div>
        )}
        {childSpec && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
              {child} can sit inside
            </div>
            <div className="text-foreground">
              {childSpec.allowedParents.length === 0 ? (
                <span className="text-muted-foreground italic">
                  root (no parent)
                </span>
              ) : (
                <span className="text-muted-foreground font-mono">
                  {childSpec.allowedParents.join(', ')}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
