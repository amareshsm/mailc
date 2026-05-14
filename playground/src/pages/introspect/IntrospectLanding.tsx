import { Link } from 'react-router-dom'
import {
  Telescope,
  ShieldCheck,
  Boxes,
  GitFork,
  Database,
  ArrowRight,
  Code2,
} from 'lucide-react'

const TOOLS = [
  {
    path: '/extend/introspect/validate',
    icon: ShieldCheck,
    label: 'Validate Sandbox',
    tagline: 'Type a JSON node, get errors with machine-readable fix actions in real time.',
    api: 'introspect.validate(node, parent, opts)',
    accent: 'violet' as const,
    badge: 'Killer demo',
  },
  {
    path: '/extend/introspect/components',
    icon: Boxes,
    label: 'Component Explorer',
    tagline:
      "Auto-generated reference for every mc-* and plugin component. No hand-written docs.",
    api: 'introspect.all() / introspect.component(type)',
    accent: 'sky' as const,
  },
  {
    path: '/extend/introspect/output',
    icon: Code2,
    label: 'Output Explorer',
    tagline:
      "Storybook for the email compiler. Pick any component, see its compiled HTML, Outlook variant, source map, and applied styles. Edit attributes live.",
    api: 'compile(source, { sourceMap: true })',
    accent: 'rose' as const,
    badge: 'New',
  },
  {
    path: '/extend/introspect/nesting',
    icon: GitFork,
    label: 'Nesting Matrix',
    tagline:
      "21×21 grid of which components can contain which. The same data your visual builder uses for drop-target validity.",
    api: 'introspect.canNest(parent, child)',
    accent: 'emerald' as const,
  },
  {
    path: '/extend/introspect/data',
    icon: Database,
    label: 'Data Contract Analyzer',
    tagline:
      'Paste a template, see exactly which data fields it needs — required vs. optional vs. loop-scoped.',
    api: 'introspect.dataContract(parse(source))',
    accent: 'amber' as const,
  },
]

const ACCENTS: Record<
  'violet' | 'sky' | 'emerald' | 'amber' | 'rose',
  { icon: string; ring: string }
> = {
  violet: { icon: 'text-violet-400', ring: 'group-hover:border-violet-500/40' },
  sky: { icon: 'text-sky-400', ring: 'group-hover:border-sky-500/40' },
  emerald: { icon: 'text-emerald-400', ring: 'group-hover:border-emerald-500/40' },
  amber: { icon: 'text-amber-400', ring: 'group-hover:border-amber-500/40' },
  rose: { icon: 'text-rose-400', ring: 'group-hover:border-rose-500/40' },
}

export function IntrospectLanding() {
  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="mb-12">
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-3">
            <Telescope className="h-3.5 w-3.5" />
            <span>Introspection API</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-3">
            mailc describes itself.
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
            Every component carries machine-readable metadata: attributes,
            types, defaults, parent/child rules, output HTML, common mistakes.
            IDEs, AI agents, visual builders, and CMS integrations call the
            same handful of functions to ask the framework what's valid.
          </p>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed mt-3">
            Each tool below is a thin UI wrapper over a single{' '}
            <code className="text-[12px] px-1 py-0.5 rounded bg-surface border border-border font-mono text-foreground">
              introspect.*
            </code>{' '}
            call. No hardcoding.
          </p>
        </div>

        {/* Tool grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TOOLS.map((tool) => {
            const Icon = tool.icon
            const accent = ACCENTS[tool.accent]
            return (
              <Link
                key={tool.path}
                to={tool.path}
                className={`group rounded-xl border border-border bg-surface p-6 transition-colors ${accent.ring}`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <Icon className={`h-5 w-5 ${accent.icon}`} />
                  {tool.badge && (
                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-violet-500/15 text-violet-400 border border-violet-500/25">
                      {tool.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">
                  {tool.label}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  {tool.tagline}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-[11px] font-mono text-muted-foreground truncate">
                    {tool.api}
                  </code>
                  <span className="text-sm text-foreground font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all shrink-0">
                    Try it <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Why card */}
        <div className="mt-12 rounded-xl border border-border bg-surface/50 p-6">
          <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">
            Why this matters
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <li>
              <span className="text-foreground font-medium">IDE plugins:</span>{' '}
              autocomplete attributes per component, surface errors with one-click
              fixes, suggest only valid Tailwind classes.
            </li>
            <li>
              <span className="text-foreground font-medium">AI agents:</span>{' '}
              generate JSON nodes, validate them via{' '}
              <code className="text-[12px] font-mono">validate()</code>, get
              structured fix actions, self-correct.
            </li>
            <li>
              <span className="text-foreground font-medium">Visual builders:</span>{' '}
              drop-target highlighting, attribute panels, "compiles to" previews — all
              data-driven, no hardcoded component tables.
            </li>
            <li>
              <span className="text-foreground font-medium">Type generators:</span>{' '}
              extract data contracts from templates → emit TypeScript types for the
              data shape each template expects.
            </li>
          </ul>
        </div>

        {/* Mode note */}
        <div className="mt-4 rounded-lg border border-border bg-surface/30 px-4 py-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-foreground font-medium">Note on styling modes:</span>{' '}
            mailc defaults to{' '}
            <code className="text-[11px] font-mono px-1 py-0.5 rounded bg-background border border-border">
              templateStyle: 'attribute'
            </code>{' '}
            — set CSS values directly on mc-* elements. A{' '}
            <code className="text-[11px] font-mono px-1 py-0.5 rounded bg-background border border-border">
              'class'
            </code>{' '}
            mode (limited support) compiles Tailwind-style utilities to inline
            styles; some CSS shorthands and specific attributes have no class
            equivalent today.
          </p>
        </div>
      </div>
    </div>
  )
}
