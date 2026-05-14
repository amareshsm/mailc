/**
 * Style → Modes — `/style/modes`
 *
 * Side-by-side comparison of mailc's two styling paradigms. Same source
 * markup compiled twice — once with `templateStyle: 'attribute'` (default)
 * and once with `templateStyle: 'class'`. Diff the warnings, the inlined
 * styles, and the produced HTML.
 *
 * Honest framing: attribute mode is the default, class mode has limited
 * support today. This page exists to make the trade-off explicit instead
 * of leaving users guessing.
 */

import { useMemo, useState } from 'react'
import { compile } from 'mailc'
import { Palette, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { CodeBlock } from '@/components/ui/code-block'

type Mode = 'attribute' | 'class'

const SAMPLES: { id: string; label: string; attribute: string; class: string }[] = [
  {
    id: 'hero',
    label: 'Hero with CTA',
    attribute: `<mc>
  <mc-body>
    <mc-section background-color="#0066cc" padding="48px 32px">
      <mc-column>
        <mc-text color="#ffffff" font-size="32px" font-weight="bold" align="center">
          Welcome aboard!
        </mc-text>
        <mc-button href="https://example.com"
                   background-color="#ffffff"
                   color="#0066cc"
                   border-radius="6px">
          Get started
        </mc-button>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`,
    class: `<mc>
  <mc-body>
    <mc-section class="bg-[#0066cc] p-[48px]">
      <mc-column>
        <mc-text class="text-[#ffffff] text-[32px] font-bold text-center">
          Welcome aboard!
        </mc-text>
        <mc-button href="https://example.com"
                   class="bg-[#ffffff] text-[#0066cc] rounded-[6px]">
          Get started
        </mc-button>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`,
  },
  {
    id: 'card',
    label: 'Simple text card',
    attribute: `<mc>
  <mc-body>
    <mc-section padding="24px">
      <mc-column>
        <mc-text color="#1f2937" font-size="20px" font-weight="bold">
          Welcome to the demo
        </mc-text>
        <mc-text color="#4b5563" font-size="14px" padding="8px 0">
          Two styling modes, one framework. Pick the one that fits your team.
        </mc-text>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`,
    class: `<mc>
  <mc-body>
    <mc-section class="p-[24px]">
      <mc-column>
        <mc-text class="text-[#1f2937] text-[20px] font-bold">
          Welcome to the demo
        </mc-text>
        <mc-text class="text-[#4b5563] text-[14px] py-[8px]">
          Two styling modes, one framework. Pick the one that fits your team.
        </mc-text>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`,
  },
]

interface CompiledColumn {
  html: string
  bytes: number
  errors: number
  warnings: number
  classViolations: number
  ms: number
}

function compileMode(source: string, mode: Mode): CompiledColumn {
  const t0 = performance.now()
  const r = compile(source, { templateStyle: mode })
  const ms = Math.round(performance.now() - t0)
  return {
    html: r.html ?? '',
    bytes: (r.html ?? '').length,
    errors: r.errors.length,
    warnings: r.warnings.length,
    classViolations: r.warnings.filter((w) => w.code === 'CSS_ATTR_IN_CLASS_MODE').length,
    ms,
  }
}

export function StyleModesCompare(): JSX.Element {
  const [activeSample, setActiveSample] = useState<string>(SAMPLES[0]!.id)
  const sample = SAMPLES.find((s) => s.id === activeSample)!

  const attributeOut = useMemo(() => compileMode(sample.attribute, 'attribute'), [sample])
  const classOut = useMemo(() => compileMode(sample.class, 'class'), [sample])

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-mono">/style/modes</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight mb-2">Attribute mode vs Class mode</h1>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            mailc supports two styling paradigms. Same email composed both ways, compiled
            side-by-side. Pick the one that fits your team — or mix.
          </p>
        </div>

        {/* Mode banner / honest framing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          <ModeBanner
            mode="attribute"
            label="Attribute mode"
            sub="Default. Familiar HTML-style API."
            details={[
              'CSS-property attributes on components',
              'No theming token resolution',
              'Use mc-attributes for global brand defaults',
            ]}
          />
          <ModeBanner
            mode="class"
            label="Class mode"
            badge="limited"
            sub="Tailwind-style utilities. Opt in via templateStyle: 'class'."
            details={[
              'Theme tokens (bg-brand, text-md, p-4) work',
              'Some props (border shorthand) need attribute fallback',
              'Stricter — flags CSS-prop attrs as errors',
            ]}
          />
        </div>

        {/* Sample tabs */}
        <div className="flex items-center gap-1.5 mb-4">
          <span className="text-xs text-muted-foreground mr-2">Sample:</span>
          {SAMPLES.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSample(s.id)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors border',
                activeSample === s.id
                  ? 'border-foreground/30 bg-surface text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Side-by-side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ModeColumn
            mode="attribute"
            label="Attribute mode"
            source={sample.attribute}
            result={attributeOut}
          />
          <ModeColumn
            mode="class"
            label="Class mode"
            source={sample.class}
            result={classOut}
          />
        </div>

        {/* Bottom guidance */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Guidance
            title="Use attribute mode when…"
            points={[
              'Your team is HTML-fluent and values explicit values',
              'You don\'t want a class-resolution layer in your mental model',
              'You only need brand defaults via mc-attributes',
            ]}
          />
          <Guidance
            title="Use class mode when…"
            points={[
              'You\'re already a Tailwind shop',
              'You want theme tokens (bg-brand, text-md) resolving to your tokens',
              'You can live with some props (borders) needing attribute fallback',
            ]}
          />
          <Guidance
            title="Mix them when…"
            points={[
              'Most styles via class, but specific overrides via attribute',
              'Attribute mode is set globally, class mode only on specific templates',
              'Pragmatic > pure. Both modes coexist on the same node.',
            ]}
          />
        </div>

        {/* Cross-link */}
        <div className="mt-8 rounded-lg border border-border bg-surface/40 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold mb-1">Want to dig deeper into theming?</div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Theme tokens drive class-mode utilities. Attribute mode has different patterns —
                see the theming page for both.
              </p>
            </div>
            <Link
              to="/style/theme"
              className="shrink-0 text-xs font-medium text-foreground inline-flex items-center gap-1 hover:gap-2 transition-all"
            >
              Open theme page <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function ModeBanner({
  mode,
  label,
  sub,
  details,
  badge,
}: {
  mode: Mode
  label: string
  sub: string
  details: string[]
  badge?: string
}): JSX.Element {
  return (
    <div className={cn(
      'rounded-lg border p-4',
      mode === 'attribute'
        ? 'border-emerald-500/20 bg-emerald-500/5'
        : 'border-amber-500/20 bg-amber-500/5'
    )}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-sm font-semibold">{label}</span>
        {badge && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            {badge}
          </span>
        )}
        {mode === 'attribute' && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            default
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-2">{sub}</p>
      <ul className="space-y-1">
        {details.map((d) => (
          <li key={d} className="text-[11px] text-foreground/80 flex items-start gap-1.5">
            <span className="text-muted-foreground mt-0.5">•</span>
            <span>{d}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ModeColumn({
  mode,
  label,
  source,
  result,
}: {
  mode: Mode
  label: string
  source: string
  result: CompiledColumn
}): JSX.Element {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className={cn(
        'px-3 py-2 border-b border-border flex items-center justify-between',
        mode === 'attribute' ? 'bg-emerald-500/5' : 'bg-amber-500/5'
      )}>
        <span className="text-xs font-semibold">{label}</span>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          {result.errors === 0 && result.classViolations === 0 ? (
            <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> clean
            </span>
          ) : (
            <span className="text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {result.classViolations || result.errors} issue{(result.classViolations || result.errors) === 1 ? '' : 's'}
            </span>
          )}
          <span className="text-muted-foreground">{result.bytes}b · {result.ms}ms</span>
        </div>
      </div>

      {/* Source */}
      <div className="border-b border-border">
        <div className="px-3 py-1.5 bg-surface text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
          source
        </div>
        <div className="p-3">
          <CodeBlock code={source} language="markup" maxHeight={288} />
        </div>
      </div>

      {/* Compiled HTML */}
      <div>
        <div className="px-3 py-1.5 bg-surface text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
          compiled HTML
        </div>
        <div className="p-3">
          <CodeBlock code={result.html || '(no output)'} language="markup" maxHeight={288} />
        </div>
      </div>
    </div>
  )
}

function Guidance({ title, points }: { title: string; points: string[] }): JSX.Element {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs font-semibold mb-2">{title}</div>
      <ul className="space-y-1.5">
        {points.map((p) => (
          <li key={p} className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-1.5">
            <span className="text-foreground/40 mt-0.5">•</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
