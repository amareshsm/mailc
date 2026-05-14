/**
 * Six interactive demo cards for the landing page.
 *
 * Each card replaces text-heavy descriptions with a tiny working demo —
 * hover, toggle, type, click. Visitors get a 3-second glimpse of what
 * they'd actually get from the feature without reading prose.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Map as MapIcon,
  Telescope,
  Columns3,
  ShieldCheck,
  Wrench,
  Bot,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { introspect, buildClassificationMap, classifyProperty } from 'mailc'
import { CodeBlock } from '@/components/ui/code-block'
import { cn } from '@/lib/utils'

// ─── Shared accent system ───────────────────────────────────────────────

type Accent = 'sky' | 'rose' | 'violet' | 'amber' | 'emerald' | 'teal'

const ACCENT: Record<Accent, { ring: string; iconBg: string; icon: string; tag: string; dot: string }> = {
  sky:     { ring: 'hover:border-sky-500/40',     iconBg: 'bg-sky-500/10',     icon: 'text-sky-500',     tag: 'bg-sky-500/10 text-sky-500 border-sky-500/20',         dot: 'bg-sky-500' },
  rose:    { ring: 'hover:border-rose-500/40',    iconBg: 'bg-rose-500/10',    icon: 'text-rose-500',    tag: 'bg-rose-500/10 text-rose-500 border-rose-500/20',      dot: 'bg-rose-500' },
  violet:  { ring: 'hover:border-violet-500/40',  iconBg: 'bg-violet-500/10',  icon: 'text-violet-500',  tag: 'bg-violet-500/10 text-violet-500 border-violet-500/20',  dot: 'bg-violet-500' },
  amber:   { ring: 'hover:border-amber-500/40',   iconBg: 'bg-amber-500/10',   icon: 'text-amber-500',   tag: 'bg-amber-500/10 text-amber-500 border-amber-500/20',    dot: 'bg-amber-500' },
  emerald: { ring: 'hover:border-emerald-500/40', iconBg: 'bg-emerald-500/10', icon: 'text-emerald-500', tag: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', dot: 'bg-emerald-500' },
  teal:    { ring: 'hover:border-teal-500/40',    iconBg: 'bg-teal-500/10',    icon: 'text-teal-500',    tag: 'bg-teal-500/10 text-teal-500 border-teal-500/20',       dot: 'bg-teal-500' },
}

interface CardShellProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  oneLine: string
  tag: string
  accent: Accent
  to: string
  ctaLabel: string
  children: React.ReactNode
}

function CardShell({ icon: Icon, title, oneLine, tag, accent, to, ctaLabel, children }: CardShellProps): JSX.Element {
  const a = ACCENT[accent]
  return (
    <div
      className={cn(
        'group flex flex-col rounded-xl border border-border bg-card p-5 transition-colors h-full',
        a.ring
      )}
    >
      {/* Header: icon + tag */}
      <div className="flex items-center justify-between mb-3">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', a.iconBg)}>
          <Icon className={cn('h-4 w-4', a.icon)} />
        </div>
        <span className={cn('text-[10px] font-mono px-2 py-0.5 rounded-full border', a.tag)}>
          {tag}
        </span>
      </div>

      {/* Title + tagline */}
      <h3 className="text-base font-semibold text-foreground mb-1.5">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed mb-4">{oneLine}</p>

      {/* Demo body */}
      <div className="min-w-0 flex-1">{children}</div>

      {/* CTA at bottom */}
      <Link
        to={to}
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-foreground/70 hover:text-foreground hover:gap-2.5 transition-all w-fit"
      >
        {ctaLabel}
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// 1. Source maps — hover linking demo
// ════════════════════════════════════════════════════════════════════════

interface MappedLine {
  source: string
  output: string
  id: string
}

const SOURCE_MAP_LINES: MappedLine[] = [
  { id: 'sec',  source: '<mc-section padding="32px">',                             output: '<table data-mc-id="entry-2"><tr><td style="padding:32px">' },
  { id: 'col',  source: '  <mc-column>',                                            output: '  <td data-mc-id="entry-3" align="center">' },
  { id: 'txt',  source: '    <mc-text font-size="20px">Welcome</mc-text>',         output: '    <p data-mc-id="entry-4" style="font-size:20px">Welcome</p>' },
  { id: 'btn',  source: '    <mc-button href="...">Click</mc-button>',             output: '    <a data-mc-id="entry-5" href="..." style="...">Click</a>' },
]

function SourceMapsDemo(): JSX.Element {
  const [hovered, setHovered] = useState<string | null>('btn')

  return (
    <CardShell
      icon={MapIcon}
      title="Bidirectional source maps"
      oneLine="Hover a line below — see the source ↔ HTML mapping light up in real time."
      tag="source maps"
      accent="sky"
      to="/build/code"
      ctaLabel="Try it in Code Playground"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-[10.5px] font-mono leading-relaxed">
        {/* Source */}
        <div className="rounded-md bg-surface border border-border overflow-hidden">
          <div className="px-2 py-1 border-b border-border/50 text-[9px] font-sans text-muted-foreground uppercase tracking-wider">
            source
          </div>
          <div className="p-1">
            {SOURCE_MAP_LINES.map((line) => (
              <div
                key={line.id}
                onMouseEnter={() => setHovered(line.id)}
                className={cn(
                  'px-1.5 py-0.5 rounded transition-colors cursor-default',
                  hovered === line.id ? 'bg-sky-500/15 text-foreground' : 'text-foreground/70 hover:text-foreground'
                )}
              >
                {line.source}
              </div>
            ))}
          </div>
        </div>
        {/* Output */}
        <div className="rounded-md bg-surface border border-border overflow-hidden">
          <div className="px-2 py-1 border-b border-border/50 text-[9px] font-sans text-muted-foreground uppercase tracking-wider">
            html output
          </div>
          <div className="p-1">
            {SOURCE_MAP_LINES.map((line) => (
              <div
                key={line.id}
                onMouseEnter={() => setHovered(line.id)}
                className={cn(
                  'px-1.5 py-0.5 rounded transition-colors cursor-default whitespace-nowrap overflow-hidden text-ellipsis',
                  hovered === line.id ? 'bg-sky-500/15 text-foreground' : 'text-foreground/70 hover:text-foreground'
                )}
              >
                {line.output}
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-2 text-[10.5px] text-muted-foreground italic">
        Every HTML element carries a <span className="font-mono not-italic">data-mc-id</span> back to its source node.
      </p>
    </CardShell>
  )
}

// ════════════════════════════════════════════════════════════════════════
// 2. MCP server — scripted conversation cycle
// ════════════════════════════════════════════════════════════════════════

const MCP_FRAMES = [
  { kind: 'user', text: 'Build me a welcome email with a CTA button.' },
  { kind: 'thinking', text: 'Calling tool: compile_email' },
  { kind: 'tool-input', text: 'compile_email({\n  source: "<mc>...</mc>"\n})' },
  { kind: 'tool-output', text: '✓ HTML compiled (4.2 KB)\n  errors: 0   warnings: 0' },
] as const

function McpDemo(): JSX.Element {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => (s + 1) % (MCP_FRAMES.length + 1))
    }, 1800)
    return () => clearInterval(interval)
  }, [])

  return (
    <CardShell
      icon={Bot}
      title="MCP server for AI agents"
      oneLine="Watch a live MCP exchange — same flow your AI client runs through 7 structured tools."
      tag="mcp · 7 tools"
      accent="rose"
      to="/extend/mcp"
      ctaLabel="Open MCP explorer"
    >
      <div className="rounded-md bg-surface border border-border overflow-hidden font-mono text-[11px]">
        <div className="px-2.5 py-1.5 border-b border-border/50 bg-card/50 flex items-center gap-1.5">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-foreground/15" />
            <div className="w-1.5 h-1.5 rounded-full bg-foreground/15" />
            <div className="w-1.5 h-1.5 rounded-full bg-foreground/15" />
          </div>
          <span className="text-[9px] font-sans text-muted-foreground uppercase tracking-wider ml-1">
            cursor → mailc-mcp
          </span>
        </div>
        <div className="p-3 space-y-2 min-h-[160px]">
          <AnimatePresence mode="popLayout">
            {MCP_FRAMES.slice(0, step).map((f, i) => (
              <motion.div
                key={`${i}-${f.text}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                {f.kind === 'user' && (
                  <div className="flex items-start gap-2">
                    <span className="text-[9px] font-sans text-muted-foreground uppercase tracking-wider shrink-0 mt-0.5">you</span>
                    <span className="text-foreground/90">{f.text}</span>
                  </div>
                )}
                {f.kind === 'thinking' && (
                  <div className="flex items-center gap-2 text-rose-500">
                    <Sparkles className="h-3 w-3 animate-pulse" />
                    <span className="font-sans text-[10px]">{f.text}</span>
                  </div>
                )}
                {f.kind === 'tool-input' && (
                  <pre className="text-[10px] text-foreground/80 whitespace-pre-wrap leading-relaxed pl-4 border-l border-rose-500/30">
                    {f.text}
                  </pre>
                )}
                {f.kind === 'tool-output' && (
                  <pre className="text-[10px] text-emerald-500 whitespace-pre-wrap leading-relaxed pl-4 border-l border-emerald-500/30">
                    {f.text}
                  </pre>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </CardShell>
  )
}

// ════════════════════════════════════════════════════════════════════════
// 3. Introspection API — live REPL
// ════════════════════════════════════════════════════════════════════════

const INTROSPECT_QUERIES: { id: string; label: string; run: () => unknown }[] = [
  {
    id: 'cannest-ok',
    label: "introspect.canNest('mc-column', 'mc-button')",
    run: () => introspect.canNest('mc-column', 'mc-button'),
  },
  {
    id: 'cannest-no',
    label: "introspect.canNest('mc-body', 'mc-text')",
    run: () => introspect.canNest('mc-body', 'mc-text'),
  },
  {
    id: 'spec',
    label: "introspect.component('mc-button')",
    run: () => {
      const c = introspect.component('mc-button') as unknown as Record<string, unknown> | null
      if (!c) return null
      return {
        type: c.type,
        category: c.category,
        parent: c.parent,
        requiredAttributes: c.requiredAttributes,
      }
    },
  },
  {
    id: 'all',
    label: 'introspect.all().length',
    run: () => introspect.all().length,
  },
]

function IntrospectDemo(): JSX.Element {
  const [activeId, setActiveId] = useState<string>('cannest-ok')
  const active = INTROSPECT_QUERIES.find((q) => q.id === activeId)!

  const result = useMemo(() => {
    try {
      return JSON.stringify(active.run(), null, 2)
    } catch (err) {
      return `// error: ${err instanceof Error ? err.message : String(err)}`
    }
  }, [active])

  return (
    <CardShell
      icon={Telescope}
      title="Introspection API"
      oneLine="Pick a query — see the actual JSON the compiler returns. Live, in your browser."
      tag="introspect · 11 functions"
      accent="violet"
      to="/extend/introspect"
      ctaLabel="See the 11 functions"
    >
      <div className="space-y-1.5">
        {INTROSPECT_QUERIES.map((q) => (
          <button
            key={q.id}
            onClick={() => setActiveId(q.id)}
            className={cn(
              'w-full text-left px-2.5 py-1.5 rounded-md border text-[10.5px] font-mono transition-colors',
              activeId === q.id
                ? 'border-violet-500/40 bg-violet-500/5 text-foreground'
                : 'border-border bg-surface text-muted-foreground hover:text-foreground hover:border-foreground/20'
            )}
          >
            {q.label}
          </button>
        ))}
      </div>
      <div className="mt-2.5 rounded-md bg-surface border border-border overflow-hidden">
        <div className="px-2 py-1 border-b border-border/50 text-[9px] font-sans text-muted-foreground uppercase tracking-wider">
          response
        </div>
        <div className="p-1"><CodeBlock code={result} language="json" maxHeight={128} /></div>
      </div>
    </CardShell>
  )
}

// ════════════════════════════════════════════════════════════════════════
// 4. Two styling modes — toggle demo with shared preview
// ════════════════════════════════════════════════════════════════════════

const MODE_SAMPLES = {
  attribute: `<mc-button
  href="https://example.com"
  background-color="#0066cc"
  color="#ffffff"
  border-radius="6px">
  Click me
</mc-button>`,
  class: `<mc-button
  href="https://example.com"
  class="bg-[#0066cc]
         text-[#ffffff]
         rounded-[6px]">
  Click me
</mc-button>`,
}

function StylingModesDemo(): JSX.Element {
  const [mode, setMode] = useState<'attribute' | 'class'>('attribute')

  return (
    <CardShell
      icon={Columns3}
      title="Two styling modes — your choice"
      oneLine="Toggle below — same compiled HTML, two ways to write it."
      tag="attribute · class"
      accent="amber"
      to="/style/modes"
      ctaLabel="Compare side-by-side"
    >
      {/* Toggle */}
      <div className="inline-flex rounded-md border border-border bg-surface p-0.5 mb-2">
        {(['attribute', 'class'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              'px-3 py-1 text-[10.5px] font-medium rounded-sm transition-colors',
              mode === m ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Source */}
      <CodeBlock code={MODE_SAMPLES[mode]} language="markup" />

      {/* Identical preview */}
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[10px] text-muted-foreground italic">→ both compile to the same HTML</span>
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="inline-block px-3.5 py-1.5 rounded-md text-[11px] font-medium"
          style={{ background: '#0066cc', color: '#ffffff', borderRadius: '6px' }}
        >
          Click me
        </a>
      </div>
    </CardShell>
  )
}

// ════════════════════════════════════════════════════════════════════════
// 5. Client compatibility — chip-driven client grid
// ════════════════════════════════════════════════════════════════════════

const COMPAT_PROBES = [
  { id: 'flex',     css: 'display:flex' },
  { id: 'gap',      css: 'gap:16px' },
  { id: 'shadow',   css: 'box-shadow:0 2px 4px rgba(0,0,0,0.1)' },
  { id: 'radius',   css: 'border-radius:8px' },
  { id: 'safe',     css: 'color:#333' },
] as const

const COMPAT_CLIENTS: { label: string; pattern: string }[] = [
  { label: 'Gmail',  pattern: 'gmail.*' },
  { label: 'Outlook', pattern: 'outlook.*' },
  { label: 'Apple',  pattern: 'apple-mail.*' },
  { label: 'Yahoo',  pattern: 'yahoo!.*' },
  { label: 'Samsung', pattern: 'samsung-email.*' },
  { label: 'AOL',    pattern: 'aol.*' },
]

type Severity = 'ok' | 'warning' | 'error'

function CompatibilityDemo(): JSX.Element {
  const [activeId, setActiveId] = useState<string>('flex')
  const probe = COMPAT_PROBES.find((p) => p.id === activeId)!

  // Use the same classifier the compat matrix uses so the result is consistent
  // across the playground. classifyProperty applies hardcoded overrides
  // (e.g. `display:flex` is always BREAKING) on top of caniemail data.
  const perClient = useMemo(() => {
    const map = new Map<string, Severity>()
    const [property, value] = probe.css.split(':').map((s) => s.trim())
    if (!property || !value) return map
    for (const client of COMPAT_CLIENTS) {
      try {
        const cmap = buildClassificationMap([client.pattern])
        const cls = classifyProperty({ property, value }, cmap)
        const sev: Severity =
          cls === 'BREAKING' ? 'error' : cls === 'ENHANCE' ? 'warning' : 'ok'
        map.set(client.pattern, sev)
      } catch {
        map.set(client.pattern, 'ok')
      }
    }
    return map
  }, [probe])

  return (
    <CardShell
      icon={ShieldCheck}
      title="Built-in client compatibility"
      oneLine="Click a CSS property — watch which clients support it."
      tag="caniemail"
      accent="emerald"
      to="/style/compatibility"
      ctaLabel="Run a CSS check"
    >
      {/* Property chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {COMPAT_PROBES.map((p) => (
          <button
            key={p.id}
            onClick={() => setActiveId(p.id)}
            className={cn(
              'px-2 py-1 text-[10px] font-mono rounded border transition-colors',
              activeId === p.id
                ? 'border-emerald-500/40 bg-emerald-500/10 text-foreground'
                : 'border-border bg-surface text-muted-foreground hover:text-foreground'
            )}
          >
            {p.css}
          </button>
        ))}
      </div>

      {/* Client grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {COMPAT_CLIENTS.map((c) => {
          const sev = perClient.get(c.pattern) ?? 'ok'
          return (
            <div
              key={c.pattern}
              className={cn(
                'rounded-md border px-2.5 py-2 flex items-center gap-2',
                sev === 'ok'
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : sev === 'warning'
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : 'border-red-500/30 bg-red-500/5'
              )}
            >
              {sev === 'ok' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
              {sev === 'warning' && <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
              {sev === 'error' && <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
              <span className="text-[10.5px] font-medium text-foreground truncate">{c.label}</span>
            </div>
          )
        })}
      </div>
    </CardShell>
  )
}

// ════════════════════════════════════════════════════════════════════════
// 6. FixInstructions — apply-fix animation using real validate() output
// ════════════════════════════════════════════════════════════════════════

function FixInstructionsDemo(): JSX.Element {
  const [fixed, setFixed] = useState(false)

  // Real validation: mc-button with no href
  const validation = useMemo(() => {
    return introspect.validate({ type: 'mc-button', attributes: {} }, 'mc-column')
  }, [])
  const fix = validation.errors[0]?.fix

  return (
    <CardShell
      icon={Wrench}
      title="Structured fix instructions"
      oneLine="Click 'Apply fix' — see a real FixInstruction get applied to the input."
      tag="fix-instructions"
      accent="teal"
      to="/extend/introspect/validate"
      ctaLabel="See the validator"
    >
      {/* Input */}
      <div className="rounded-md bg-surface border border-red-500/30 overflow-hidden mb-2">
        <div className="px-2 py-1 border-b border-red-500/20 bg-red-500/5 text-[9px] font-sans text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-1">
          <XCircle className="h-2.5 w-2.5" />
          before — missing href
        </div>
        <div className="p-1"><CodeBlock code={`<mc-button>Click me</mc-button>`} language="markup" /></div>
      </div>

      {/* FixInstruction JSON */}
      <div className="rounded-md bg-surface border border-border overflow-hidden mb-2">
        <div className="px-2 py-1 border-b border-border/50 text-[9px] font-sans text-muted-foreground uppercase tracking-wider">
          fix instruction (real)
        </div>
        <div className="p-1"><CodeBlock
          code={fix
            ? JSON.stringify({ action: fix.action, attribute: fix.attribute, confidence: fix.confidence }, null, 2)
            : '(no fix)'}
          language="json"
        /></div>
      </div>

      {/* Apply button + after */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <button
          onClick={() => setFixed((f) => !f)}
          className="px-3 py-1 rounded-md bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 text-[11px] font-medium border border-teal-500/30 transition-colors"
        >
          {fixed ? '↺ Reset' : 'Apply fix →'}
        </button>
      </div>

      <AnimatePresence>
        {fixed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-md bg-surface border border-emerald-500/30 overflow-hidden"
          >
            <div className="px-2 py-1 border-b border-emerald-500/20 bg-emerald-500/5 text-[9px] font-sans text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="h-2.5 w-2.5" />
              after — fixed
            </div>
            <div className="p-1"><CodeBlock code={`<mc-button href="https://example.com">Click me</mc-button>`} language="markup" /></div>
          </motion.div>
        )}
      </AnimatePresence>
    </CardShell>
  )
}

// ════════════════════════════════════════════════════════════════════════
// Public — section with all 6 cards
// ════════════════════════════════════════════════════════════════════════

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

export function DifferentiatorDemos(): JSX.Element {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-4"
    >
      <motion.div variants={fadeUp}><SourceMapsDemo /></motion.div>
      <motion.div variants={fadeUp}><McpDemo /></motion.div>
      <motion.div variants={fadeUp}><IntrospectDemo /></motion.div>
      <motion.div variants={fadeUp}><StylingModesDemo /></motion.div>
      <motion.div variants={fadeUp}><CompatibilityDemo /></motion.div>
      <motion.div variants={fadeUp}><FixInstructionsDemo /></motion.div>
    </motion.div>
  )
}
