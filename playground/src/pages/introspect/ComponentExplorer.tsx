import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Boxes, Search, Plug } from 'lucide-react'
import { getIntrospect, type ComponentSpec } from '@/introspect-demo/api'
import { cn } from '@/lib/utils'
import { CodeBlock } from '@/components/ui/code-block'

const CATEGORY_COLORS: Record<string, string> = {
  container: 'bg-violet-500/15 text-violet-400 border-violet-500/25',
  content: 'bg-sky-500/15 text-sky-400 border-sky-500/25',
  head: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  logic: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
}

export function ComponentExplorer() {
  const [specs, setSpecs] = useState<ComponentSpec[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    let cancelled = false
    async function run() {
      const introspect = await getIntrospect()
      const all = introspect.all() as ComponentSpec[]
      if (cancelled) return
      const sorted = [...all].sort((a, b) => a.type.localeCompare(b.type))
      setSpecs(sorted)
      setLoading(false)
      if (sorted.length > 0 && !selected) setSelected(sorted[0]!.type)
    }
    run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return specs
    return specs.filter(
      (s) =>
        s.type.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q),
    )
  }, [specs, filter])

  const current = specs.find((s) => s.type === selected) ?? null

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
        <div className="flex items-center gap-2 mb-1">
          <Boxes className="h-4 w-4 text-sky-400" />
          <h1 className="text-xl font-bold text-foreground">
            Component Explorer
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {loading ? (
            'Loading…'
          ) : (
            <>
              {specs.length} components, including any plugins. Generated from{' '}
              <code className="text-[11px] font-mono">introspect.all()</code>.
            </>
          )}
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 grid grid-cols-[260px_1fr] overflow-hidden">
        {/* Sidebar */}
        <div className="flex flex-col overflow-hidden border-r border-border bg-surface/30">
          <div className="p-3 border-b border-border shrink-0">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search components"
                className="w-full pl-8 pr-2 py-1.5 text-xs bg-background border border-border rounded text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/40"
              />
            </div>
          </div>
          <div className="flex-1 overflow-auto p-2 space-y-0.5">
            {filtered.map((s) => {
              const isPlugin = Boolean(s.isPlugin)
              return (
                <button
                  key={s.type}
                  onClick={() => setSelected(s.type)}
                  className={cn(
                    'w-full text-left px-2.5 py-2 rounded text-sm transition-colors flex items-center gap-2',
                    selected === s.type
                      ? 'bg-background text-foreground border border-border'
                      : 'text-muted-foreground hover:bg-background/50 hover:text-foreground',
                  )}
                >
                  <code className="font-mono text-[12px] flex-1 truncate">
                    {s.type}
                  </code>
                  {isPlugin && (
                    <span title="Plugin component">
                      <Plug className="h-3 w-3 text-violet-400 shrink-0" />
                    </span>
                  )}
                </button>
              )
            })}
            {filtered.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-4">
                No matches
              </div>
            )}
          </div>
        </div>

        {/* Detail panel */}
        <div className="flex-1 overflow-auto">
          {current ? <SpecDetail spec={current} /> : (
            <div className="p-8 text-sm text-muted-foreground">
              Select a component to inspect.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SpecDetail({ spec }: { spec: ComponentSpec }) {
  const isPlugin = Boolean(spec.isPlugin)
  const catColor =
    CATEGORY_COLORS[spec.category] ?? 'bg-muted text-muted-foreground border-border'

  return (
    <div className="p-6 space-y-6">
      {/* Title */}
      <div>
        <div className="flex items-baseline gap-2 mb-1">
          <code className="text-2xl font-mono font-bold text-foreground">
            {`<${spec.type}>`}
          </code>
          <span
            className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${catColor}`}
          >
            {spec.category}
          </span>
          {isPlugin && (
            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-violet-500/15 text-violet-400 border border-violet-500/25 inline-flex items-center gap-1">
              <Plug className="h-3 w-3" />
              plugin
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {spec.description}
        </p>
      </div>

      {/* Quick facts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <FactCard label="Allowed parents">
          {spec.allowedParents.length === 0 ? (
            <span className="text-muted-foreground italic">root</span>
          ) : (
            spec.allowedParents.map((p) => (
              <code key={p} className="text-[11px] font-mono mr-1.5">
                {p}
              </code>
            ))
          )}
        </FactCard>
        <FactCard label="Allowed children">
          {spec.allowedChildren.length === 0 ? (
            <span className="text-muted-foreground italic">leaf</span>
          ) : (
            <span className="text-foreground">
              {spec.allowedChildren.length}{' '}
              {spec.allowedChildren.length === 1 ? 'type' : 'types'}
            </span>
          )}
        </FactCard>
        <FactCard label="Text content">
          {spec.allowsTextContent ? '✓ allowed' : '✗ no'}
        </FactCard>
        <FactCard label="Class attribute">
          {spec.acceptsClassAttribute ? '✓ allowed' : '✗ no'}
        </FactCard>
      </div>

      {/* Attributes */}
      <Section title="Attributes">
        {spec.requiredAttributes.length === 0 &&
          spec.optionalAttributes.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              No attributes.
            </p>
          )}

        {spec.requiredAttributes.length > 0 && (
          <AttributeTable
            heading="Required"
            attrs={spec.requiredAttributes}
            cssPropAttrs={spec.cssPropertyAttributes}
          />
        )}
        {spec.optionalAttributes.length > 0 && (
          <AttributeTable
            heading="Optional"
            attrs={spec.optionalAttributes}
            cssPropAttrs={spec.cssPropertyAttributes}
          />
        )}
      </Section>

      {/* Compiles to */}
      <Section title="Compiles to">
        <div className="rounded-lg border border-border bg-surface/30 p-4">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {spec.compilesTo.outputElements.length === 0 ? (
              <span className="text-xs text-muted-foreground italic">
                No HTML output (compile-time directive).
              </span>
            ) : (
              spec.compilesTo.outputElements.map((el) => (
                <code
                  key={el}
                  className="text-[11px] px-2 py-1 rounded bg-background border border-border font-mono text-foreground"
                >
                  {`<${el}>`}
                </code>
              ))
            )}
          </div>
          <p className="text-xs text-muted-foreground italic leading-relaxed">
            {spec.compilesTo.reason}
          </p>
        </div>
      </Section>

      {/* Example */}
      <Section title="Example">
        <CodeBlock code={spec.example.markup} language="markup" />
      </Section>

      {/* Common mistakes */}
      {spec.commonMistakes.length > 0 && (
        <Section title="Common mistakes">
          <ul className="space-y-1.5">
            {spec.commonMistakes.map((m, i) => (
              <li
                key={i}
                className="text-xs text-muted-foreground leading-relaxed flex gap-2"
              >
                <span className="text-amber-400">⚠</span>
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-3">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function FactCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface/30 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
        {label}
      </div>
      <div className="text-xs text-foreground">{children}</div>
    </div>
  )
}

interface AttrLike {
  name: string
  type: string
  description: string
  default?: string
  example?: string
  classHint?: string
  isCssPropAttr?: boolean
}

function AttributeTable({
  heading,
  attrs,
  cssPropAttrs,
}: {
  heading: string
  attrs: AttrLike[]
  cssPropAttrs: AttrLike[]
}) {
  const cssPropNames = new Set(cssPropAttrs.map((a) => a.name))
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
        {heading}
      </div>
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-surface/50">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">
                Name
              </th>
              <th className="px-3 py-2 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">
                Type
              </th>
              <th className="px-3 py-2 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">
                Default
              </th>
              <th className="px-3 py-2 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {attrs.map((a) => {
              const isCssProp = cssPropNames.has(a.name) || a.isCssPropAttr
              return (
                <tr
                  key={a.name}
                  className="border-t border-border align-top hover:bg-surface/20"
                >
                  <td className="px-3 py-2.5 font-mono text-foreground whitespace-nowrap">
                    {a.name}
                    {isCssProp && (
                      <span
                        title="CSS-property attribute — restricted in class mode"
                        className="ml-1.5 text-[9px] uppercase tracking-wider px-1 rounded bg-violet-500/15 text-violet-400"
                      >
                        css
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-muted-foreground whitespace-nowrap">
                    {a.type}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-muted-foreground whitespace-nowrap">
                    {a.default ?? <span className="opacity-50">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground leading-relaxed">
                    {a.description}
                    {a.classHint && (
                      <div className="mt-1 text-[11px]">
                        <span className="text-muted-foreground">
                          class hint:{' '}
                        </span>
                        <code className="font-mono text-violet-400">
                          {a.classHint}
                        </code>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
