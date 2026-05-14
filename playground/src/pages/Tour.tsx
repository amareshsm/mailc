/**
 * /tour — guided 5-minute linear walkthrough.
 *
 * Connects mailc's marquee features in a sequence a first-time visitor can
 * follow without prior knowledge. Each step has a one-line "what" and a
 * "next" button that takes them to the live feature page.
 *
 * Not an interactive overlay — a route the visitor can leave and come back
 * to. The current step is tracked in the URL via `?step=N`.
 */

import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  ArrowLeft,
  Code2,
  Palette,
  Plug,
  Bot,
  Telescope,
  CheckCircle2,
  Hammer,
  Compass,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  num: number
  title: string
  blurb: string
  what: string
  cta: { label: string; to: string }
  icon: typeof Code2
  accent: 'sky' | 'amber' | 'violet' | 'emerald' | 'rose'
}

const STEPS: Step[] = [
  {
    num: 1,
    title: 'Compose an email',
    blurb: 'Start with markup. Watch it compile to email-safe HTML.',
    what:
      'mailc parses .mc markup into JSON IR, walks the tree, and emits table-based HTML with Outlook conditionals — all in <50ms. The Code Playground shows the source, output, and a live preview side-by-side. Click the preview to jump back to the source.',
    cta: { label: 'Open Code Playground', to: '/build/code' },
    icon: Code2,
    accent: 'sky',
  },
  {
    num: 2,
    title: 'Style it for your brand',
    blurb: 'Two paradigms — attribute and class — pick what fits.',
    what:
      'Attribute mode (default) is HTML-style: color="#0066cc". Class mode is Tailwind-style: class="bg-brand". Theme tokens drive class mode. Compare both side-by-side on the modes page so the trade-off is explicit.',
    cta: { label: 'Compare modes', to: '/style/modes' },
    icon: Palette,
    accent: 'amber',
  },
  {
    num: 3,
    title: 'Check client compatibility',
    blurb: 'Will it render in Outlook? Find out before you send.',
    what:
      'Every CSS property is checked against caniemail data per target client. Display: flex breaks Outlook Windows. Background-image is partial in Gmail iOS. mailc surfaces these at compile time, not after a customer reports a broken email.',
    cta: { label: 'Run a CSS check', to: '/style/compatibility' },
    icon: CheckCircle2,
    accent: 'emerald',
  },
  {
    num: 4,
    title: 'Extend with custom components',
    blurb: 'Define your own tags. They work in Node AND the browser.',
    what:
      'defineComponent({ type, metadata, compile }) registers a custom tag that participates in introspection, validation, and source maps. The marketplace ships a sample design system (acme-hero, acme-feature, …) used in real templates.',
    cta: { label: 'Tour the marketplace', to: '/extend/plugins' },
    icon: Plug,
    accent: 'violet',
  },
  {
    num: 5,
    title: 'Plug AI agents in',
    blurb: 'Cursor, Claude Desktop — they speak mailc through MCP.',
    what:
      'mailc-mcp exposes 7 structured tools: compile_email, validate_email_node, list_components, get_component_spec, can_nest, extract_data_contract, check_email_client_support. AI agents call them deterministically instead of guessing at email markup. Live tool explorer is one click away.',
    cta: { label: 'Open MCP explorer', to: '/extend/mcp' },
    icon: Bot,
    accent: 'rose',
  },
]

const ACCENT_CLASSES: Record<Step['accent'], { ring: string; icon: string; bg: string }> = {
  sky: { ring: 'border-sky-500/30', icon: 'text-sky-500', bg: 'bg-sky-500/5' },
  amber: { ring: 'border-amber-500/30', icon: 'text-amber-500', bg: 'bg-amber-500/5' },
  emerald: { ring: 'border-emerald-500/30', icon: 'text-emerald-500', bg: 'bg-emerald-500/5' },
  violet: { ring: 'border-violet-500/30', icon: 'text-violet-500', bg: 'bg-violet-500/5' },
  rose: { ring: 'border-rose-500/30', icon: 'text-rose-500', bg: 'bg-rose-500/5' },
}

export function Tour(): JSX.Element {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const stepParam = parseInt(params.get('step') ?? '1', 10)
  const stepIdx = Math.min(Math.max(stepParam, 1), STEPS.length) - 1
  const step = STEPS[stepIdx]!
  const accent = ACCENT_CLASSES[step.accent]
  const isFirst = stepIdx === 0
  const isLast = stepIdx === STEPS.length - 1

  const goToStep = (n: number): void => {
    setParams({ step: String(n) }, { replace: false })
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Tour header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Compass className="h-4 w-4 text-foreground/70" />
            <span className="text-xs text-muted-foreground font-mono">/tour</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">5-minute tour</h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
            A guided path through mailc's marquee features. Each step takes you to a live
            page — try it, come back, hit Next. Total time: 5 minutes.
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s) => (
            <button
              key={s.num}
              onClick={() => goToStep(s.num)}
              className="group flex items-center gap-2"
              aria-label={`Step ${s.num}: ${s.title}`}
            >
              <div
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  s.num === step.num
                    ? 'w-10 bg-foreground'
                    : s.num < step.num
                      ? 'w-6 bg-foreground/40 group-hover:bg-foreground/60'
                      : 'w-6 bg-foreground/10 group-hover:bg-foreground/30'
                )}
              />
            </button>
          ))}
          <span className="ml-3 text-[11px] text-muted-foreground font-mono">
            {step.num} / {STEPS.length}
          </span>
        </div>

        {/* Step card */}
        <motion.div
          key={step.num}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={cn(
            'rounded-xl border p-6 mb-6',
            accent.ring,
            accent.bg
          )}
        >
          <div className="flex items-start gap-4 mb-4">
            <div className={cn('w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center shrink-0')}>
              <step.icon className={cn('h-5 w-5', accent.icon)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  Step {step.num}
                </span>
              </div>
              <h2 className="text-xl font-semibold">{step.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">{step.blurb}</p>
            </div>
          </div>

          <p className="text-sm text-foreground/80 leading-relaxed mb-5">{step.what}</p>

          {/* Try it CTA */}
          <Link
            to={step.cta.to}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-85 transition-opacity"
          >
            {step.cta.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>

        {/* Prev / Next nav */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => goToStep(step.num - 1)}
            disabled={isFirst}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-md border transition-colors',
              isFirst
                ? 'border-border bg-card text-muted-foreground/40 cursor-not-allowed'
                : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-surface'
            )}
          >
            <ArrowLeft className="h-3 w-3" />
            Previous
          </button>

          {isLast ? (
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-md bg-foreground text-background hover:opacity-85 transition-opacity"
            >
              Finish tour
              <Hammer className="h-3 w-3" />
            </button>
          ) : (
            <button
              onClick={() => goToStep(step.num + 1)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md bg-foreground text-background hover:opacity-85 transition-opacity"
            >
              Next
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Skip & jump-around */}
        <div className="mt-12 pt-6 border-t border-border">
          <p className="text-[11px] text-muted-foreground mb-3">
            Don't want a guided tour? Jump straight in:
          </p>
          <div className="flex flex-wrap gap-2">
            <SkipLink to="/build" icon={Hammer} label="Build" />
            <SkipLink to="/style" icon={Palette} label="Style" />
            <SkipLink to="/extend" icon={Plug} label="Extend" />
            <SkipLink to="/extend/introspect" icon={Telescope} label="Introspect API" />
          </div>
        </div>
      </div>
    </div>
  )
}

function SkipLink({
  to,
  icon: Icon,
  label,
}: {
  to: string
  icon: typeof Hammer
  label: string
}): JSX.Element {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
    >
      <Icon className="h-3 w-3" />
      {label}
    </Link>
  )
}
