import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Hammer,
  Palette,
  Plug,
  ArrowRight,
  Mail,
} from 'lucide-react'
import { HeroStagesSection, StageDetailSections } from '@/components/hero/HeroStagesDemo'

/* ── Pipeline hero sub-components ────────────────────────────────────────── */

function InputCard({ active }: { active: boolean }) {
  const [mode, setMode] = useState<'markup' | 'json'>('markup')
  return (
    <div
      className="glass"
      style={{
        borderRadius: 16,
        padding: 0,
        overflow: 'hidden',
        transform: active ? 'scale(1.015)' : 'scale(1)',
        boxShadow: active
          ? '0 0 0 1px rgb(var(--accent-glow) / 0.4), 0 16px 40px rgb(var(--accent-glow) / 0.18)'
          : undefined,
        transition: 'all 0.5s var(--ease-out)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '10px 12px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {(['markup', 'json'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              background: mode === m ? 'var(--surface-3)' : 'transparent',
              color: mode === m ? 'var(--fg)' : 'var(--fg-dim)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {m === 'markup' ? '.mc' : '.json'}
          </button>
        ))}
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 10,
            color: 'var(--fg-dim)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          input
        </span>
      </div>
      <pre
        style={{
          margin: 0,
          padding: 14,
          fontSize: 11,
          lineHeight: 1.55,
          fontFamily: 'var(--font-mono)',
          color: 'var(--fg-muted)',
          minHeight: 148,
          whiteSpace: 'pre',
          overflow: 'hidden',
        }}
      >
        {mode === 'markup' ? (
          <>
            <span style={{ color: 'var(--accent)' }}>{'<mc-section'}</span>{' '}
            <span style={{ color: 'var(--hue-mint)' }}>bg</span>=
            <span style={{ color: 'var(--hue-peach)' }}>"#0a0a0f"</span>
            <span style={{ color: 'var(--accent)' }}>{'>'}</span>{'\n'}
            {'  '}
            <span style={{ color: 'var(--accent)' }}>{'<mc-text'}</span>{' '}
            <span style={{ color: 'var(--hue-mint)' }}>size</span>=
            <span style={{ color: 'var(--hue-peach)' }}>"xl"</span>
            <span style={{ color: 'var(--accent)' }}>{'>'}</span>{'\n'}
            {'    '}Email, finally fixed.{'\n'}
            {'  '}
            <span style={{ color: 'var(--accent)' }}>{'</mc-text>'}</span>{'\n'}
            {'  '}
            <span style={{ color: 'var(--accent)' }}>{'<mc-button'}</span>{' '}
            <span style={{ color: 'var(--hue-mint)' }}>href</span>=
            <span style={{ color: 'var(--hue-peach)' }}>"..."</span>
            <span style={{ color: 'var(--accent)' }}>{' />'}</span>{'\n'}
            <span style={{ color: 'var(--accent)' }}>{'</mc-section>'}</span>
          </>
        ) : (
          <>
            <span style={{ color: 'var(--fg)' }}>{'{'}</span>{'\n'}
            {'  '}
            <span style={{ color: 'var(--hue-mint)' }}>"type"</span>:{' '}
            <span style={{ color: 'var(--hue-peach)' }}>"mc-section"</span>,{'\n'}
            {'  '}
            <span style={{ color: 'var(--hue-mint)' }}>"children"</span>: [{'\n'}
            {'    '}
            {'{ '}
            <span style={{ color: 'var(--hue-mint)' }}>"type"</span>:{' '}
            <span style={{ color: 'var(--hue-peach)' }}>"mc-text"</span>
            {' },\n'}
            {'    '}
            {'{ '}
            <span style={{ color: 'var(--hue-mint)' }}>"type"</span>:{' '}
            <span style={{ color: 'var(--hue-peach)' }}>"mc-button"</span>
            {' }\n'}
            {'  '}]{'\n'}
            <span style={{ color: 'var(--fg)' }}>{'}'}</span>
          </>
        )}
      </pre>
    </div>
  )
}

function ConnectorArrow({ active, label }: { active: boolean; label: string }) {
  return (
    <div
      style={{
        position: 'relative',
        height: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width="100%" height="2" style={{ position: 'absolute', top: '50%', left: 0 }}>
        <line
          x1="0" y1="1" x2="100%" y2="1"
          stroke="var(--border-strong)"
          strokeWidth="1"
          strokeDasharray="2 4"
        />
      </svg>
      {active && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(50% - 3px)',
            left: 0,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--accent)',
            boxShadow:
              '0 0 12px rgb(var(--accent-glow) / 0.9), 0 0 24px rgb(var(--accent-glow) / 0.5)',
            animation: 'travel 1.6s var(--ease-out) infinite',
          }}
        />
      )}
      <span
        style={{
          position: 'absolute',
          top: -4,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 9.5,
          fontFamily: 'var(--font-mono)',
          color: active ? 'var(--accent)' : 'var(--fg-dim)',
          background: 'var(--bg-raised)',
          padding: '2px 7px',
          borderRadius: 4,
          border: '1px solid var(--border)',
          letterSpacing: '0.04em',
          transition: 'color 0.3s',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </div>
  )
}

function CompilerCore({ active, stage }: { active: boolean; stage: number }) {
  return (
    <div style={{ position: 'relative' }}>
      <div
        className="glass"
        style={{
          borderRadius: 16,
          padding: 18,
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          transform: active ? 'scale(1.02)' : 'scale(1)',
          boxShadow: active
            ? '0 0 0 1px rgb(var(--accent-glow) / 0.5), 0 20px 60px rgb(var(--accent-glow) / 0.25)'
            : undefined,
          transition: 'all 0.5s var(--ease-out)',
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            margin: '0 auto 12px',
            borderRadius: '50%',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: `conic-gradient(from ${stage * 72}deg, transparent, var(--accent), transparent)`,
              animation: 'spin-slow 3s linear infinite',
              opacity: active ? 0.8 : 0.3,
              transition: 'opacity 0.3s',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 3,
              borderRadius: '50%',
              background: 'var(--bg-raised)',
            }}
          />
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--fg)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '-0.04em',
            }}
          >
            mc
          </div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--fg)' }}>
          compile()
        </div>
        <div
          style={{
            fontSize: 10,
            color: 'var(--fg-dim)',
            marginTop: 4,
            fontFamily: 'var(--font-mono)',
          }}
        >
          {stage === 1
            ? 'parsing ast…'
            : stage === 2
              ? 'templating…'
              : stage === 3
                ? 'safe css + a11y…'
                : 'ready'}
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            justifyContent: 'center',
            marginTop: 10,
          }}
        >
          {['a11y', 'source-map', 'caniemail', 'inline', 'templating'].map((t) => (
            <span
              key={t}
              style={{
                fontSize: 9,
                fontFamily: 'var(--font-mono)',
                padding: '2px 6px',
                borderRadius: 999,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--fg-dim)',
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function ClientsStack({ active }: { active: boolean }) {
  const clients = [
    { name: 'Gmail', color: '#ea4335' },
    { name: 'Outlook', color: '#0078d4' },
    { name: 'Apple Mail', color: '#555' },
    { name: 'Yahoo', color: '#6001d2' },
  ]
  return (
    <div
      className="glass"
      style={{
        borderRadius: 16,
        padding: 14,
        transform: active ? 'scale(1.015)' : 'scale(1)',
        boxShadow: active
          ? '0 0 0 1px rgb(var(--accent-glow) / 0.4), 0 16px 40px rgb(var(--accent-glow) / 0.18)'
          : undefined,
        transition: 'all 0.5s var(--ease-out)',
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: 'var(--fg-dim)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: 10,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>renders in</span>
        <span style={{ color: 'var(--hue-mint)' }}>● all ok</span>
      </div>
      {clients.map((c, i) => (
        <div
          key={c.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '7px 9px',
            marginBottom: 4,
            borderRadius: 8,
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            opacity: active ? 1 : 0.6,
            transition: `opacity 0.3s ${i * 80}ms, transform 0.3s ${i * 80}ms`,
            transform: active ? 'translateX(0)' : 'translateX(-4px)',
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 5,
              background: c.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 9,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {c.name[0]}
          </div>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)' }}>{c.name}</span>
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--hue-mint)"
            strokeWidth="2.5"
            style={{ marginLeft: 'auto' }}
          >
            <path d="M5 12l5 5L20 7" />
          </svg>
        </div>
      ))}
    </div>
  )
}

function PipelineHero() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2200)
    return () => clearInterval(id)
  }, [])
  const stage = tick % 5

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        className="glass-strong"
        style={{ position: 'relative', borderRadius: 24, padding: 24, overflow: 'hidden' }}
      >
        {/* corner labels */}
        <div
          style={{
            position: 'absolute',
            top: 14,
            left: 18,
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--fg-dim)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <span style={{ color: 'var(--accent)', marginRight: 6 }}>●</span>
          pipeline · live
        </div>
        <div
          style={{
            position: 'absolute',
            top: 14,
            right: 18,
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--fg-dim)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          stage {stage + 1}/5
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 100px 1fr 100px 1fr',
            alignItems: 'center',
            marginTop: 24,
          }}
        >
          <InputCard active={stage === 0} />
          <ConnectorArrow active={stage >= 1} label="compile()" />
          <CompilerCore active={stage >= 1 && stage <= 3} stage={stage} />
          <ConnectorArrow active={stage >= 4} label="render" />
          <ClientsStack active={stage === 4} />
        </div>

        {/* metrics bar */}
        <div
          style={{
            marginTop: 24,
            paddingTop: 16,
            borderTop: '1px dashed var(--border)',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
          }}
        >
          {[
            { k: '8ms', v: 'Compile time' },
            { k: 'CSS ✓', v: 'Auto-inlined styles' },
            { k: 'tmpl ✓', v: 'Built-in templating' },
            { k: 'a11y ✓', v: 'Auto landmarks' },
          ].map((m) => (
            <div key={m.k} style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'var(--fg)',
                  letterSpacing: '-0.02em',
                }}
              >
                {m.k}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--fg-dim)',
                  marginTop: 2,
                  letterSpacing: '0.04em',
                }}
              >
                {m.v}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Bucket card data ─────────────────────────────────────────────────────── */

interface BucketCard {
  id: string
  path: string
  title: string
  tagline: string
  icon: typeof Hammer
  color: string
  highlights: { label: string; href: string }[]
}

const BUCKETS: BucketCard[] = [
  {
    id: 'build',
    path: '/build',
    title: 'Build',
    tagline: 'Author email content — visually, in markup, or as JSON IR.',
    icon: Hammer,
    color: 'var(--accent)',
    highlights: [
      { label: 'Visual Builder', href: '/build/visual' },
      { label: 'Code Playground', href: '/build/code' },
      { label: 'JSON Playground', href: '/build/json' },
      { label: 'Templating (vars, if, each)', href: '/build/templating' },
    ],
  },
  {
    id: 'style',
    path: '/style',
    title: 'Style',
    tagline: 'Theme it, switch styling modes, check client compatibility.',
    icon: Palette,
    color: 'var(--hue-violet)',
    highlights: [
      { label: 'Theme & Tokens', href: '/style/theme' },
      { label: 'Class Mode (limited)', href: '/style/class' },
      { label: 'Client Compatibility', href: '/style/compatibility' },
      { label: 'Accessibility', href: '/style/a11y' },
    ],
  },
  {
    id: 'extend',
    path: '/extend',
    title: 'Extend',
    tagline: 'Plugin marketplace, introspection API, MCP for AI agents.',
    icon: Plug,
    color: 'var(--hue-cyan)',
    highlights: [
      { label: 'Plugin Marketplace', href: '/extend/plugins' },
      { label: 'Introspect API', href: '/extend/introspect' },
      { label: 'MCP for AI', href: '/extend/mcp' },
    ],
  },
]

/* ── Animation variants ───────────────────────────────────────────────────── */
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export function LandingPage(): JSX.Element {
  return (
    <div className="flex-1 overflow-y-auto" data-scroll-root>
      {/* Ambient background — sits behind everything */}
      <div className="ambient-bg" />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-10 pb-0">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative max-w-4xl mx-auto px-6 pt-10 pb-10 text-center"
        >
          {/* Badge */}
          <motion.div variants={fadeUp} className="flex justify-center mb-6">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs"
              style={{
                borderRadius: 999,
                background: 'var(--surface-1)',
                border: '1px solid var(--border)',
                color: 'var(--fg-muted)',
              }}
            >
              <div className="dot-pulse" />
              mailc playground — explore the compiler in real-time
            </div>
          </motion.div>

          {/* Heading */}
          <motion.h1
            variants={fadeUp}
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight"
            style={{ color: 'var(--fg)', letterSpacing: '-0.035em' }}
          >
            Build emails that
            <br />
            <span className="grad-text">just work everywhere</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-6 text-base max-w-2xl mx-auto leading-relaxed"
            style={{ color: 'var(--fg-muted)' }}
          >
            An interactive playground for{' '}
            <code
              className="text-xs font-mono px-1.5 py-0.5 rounded"
              style={{ background: 'var(--code-bg)', border: '1px solid var(--code-border)', color: 'var(--fg)' }}
            >
              mailc
            </code>{' '}
            — the modern email compiler. Build, style, and extend your emails from one place.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={fadeUp}
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              to="/build/code"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all hover:brightness-110"
              style={{
                borderRadius: 999,
                background: 'var(--accent)',
                color: 'var(--accent-contrast)',
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,0.25), 0 8px 24px -8px rgb(var(--accent-glow) / 0.6)',
              }}
            >
              Open Code Playground
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/build/visual"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all"
              style={{
                borderRadius: 999,
                background: 'var(--surface-1)',
                border: '1px solid var(--border)',
                color: 'var(--fg-muted)',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--fg)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--fg-muted)')}
            >
              Try Visual Builder
            </Link>
          </motion.div>
        </motion.div>

        {/* Pipeline diagram */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.3 }}
          className="relative max-w-7xl mx-auto px-4 pb-16"
        >
          <PipelineHero />
        </motion.div>
      </section>

      {/* ── 7-stage interactive demo ─────────────────────────────────── */}
      <HeroStagesSection />

      {/* ── Stage detail sections ────────────────────────────────────── */}
      <StageDetailSections />

      {/* ── Three bucket cards ────────────────────────────────────────── */}
      <section style={{ borderTop: '1px solid var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 py-16">
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
          >
            {/* Section header */}
            <motion.div variants={fadeUp} className="mb-10">
              <div
                className="inline-flex items-center gap-1.5 mb-4 text-[11px] font-mono uppercase tracking-wider"
                style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border)',
                  color: 'var(--fg-dim)',
                }}
              >
                Three areas to explore
              </div>
              <h2
                className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3"
                style={{ color: 'var(--fg)', letterSpacing: '-0.02em' }}
              >
                Pick a path through the playground.
              </h2>
              <p
                className="text-sm max-w-2xl leading-relaxed"
                style={{ color: 'var(--fg-muted)' }}
              >
                Every demo is wired to something real — live compilation, actual client compat data,
                and a working MCP server you can point an AI agent at.
              </p>
            </motion.div>

            {/* Cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {BUCKETS.map((bucket) => (
                <motion.div key={bucket.id} variants={fadeUp}>
                  <BucketCardView bucket={bucket} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Why mailc ─────────────────────────────────────────────────── */}
      <section style={{ borderTop: '1px solid var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 md:gap-12 items-start">
            <div>
              <h2
                className="text-xl font-semibold mb-2"
                style={{ color: 'var(--fg)', letterSpacing: '-0.02em' }}
              >
                Why mailc
              </h2>
              <p
                className="text-[11px] italic leading-relaxed"
                style={{ color: 'var(--fg-dim)' }}
              >
                Status: early. The compiler is solid (3,300+ tests passing) but the user base
                is small. Try it on a real email and tell us what broke.
              </p>
            </div>
            <div className="space-y-4 text-sm leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
              <p>
                Email HTML is awful. You can't use flexbox, grid, or modern CSS. You need tables
                nested inside tables. Outlook needs separate VML markup. Gmail strips{' '}
                <code
                  className="font-mono text-xs px-1.5 py-0.5 rounded mx-0.5"
                  style={{ background: 'var(--code-bg)', border: '1px solid var(--code-border)', color: 'var(--fg)' }}
                >
                  &lt;style&gt;
                </code>{' '}
                blocks under certain conditions. mailc handles all of that and gives you a clean
                component model on top.
              </p>
              <p>
                You'd reach for mailc when you want a TypeScript-native compiler with structured
                errors, when you'd like to use Tailwind utilities and attribute styling without
                picking sides, or when you're building tools <em>on top</em> of an email compiler
                — JSON IR, source maps, plugin API, and AI-agent integration are first-class.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '24px' }}>
        <div
          className="max-w-7xl mx-auto px-0 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          style={{ fontSize: 11, color: 'var(--fg-dim)' }}
        >
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5" />
            <span className="font-medium" style={{ color: 'var(--fg-muted)' }}>mailc playground</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span>v0.1.0 — early</span>
          </div>
          <nav className="flex items-center gap-4 flex-wrap">
            {[
              { to: '/tour', label: 'Tour' },
              { to: '/build', label: 'Build' },
              { to: '/style', label: 'Style' },
              { to: '/extend', label: 'Extend' },
            ].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="transition-colors hover:text-foreground"
                style={{ color: 'var(--fg-dim)' }}
              >
                {l.label}
              </Link>
            ))}
            <span style={{ opacity: 0.4 }}>·</span>
            <a
              href="https://github.com/anthropics/mailc"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
              style={{ color: 'var(--fg-dim)' }}
            >
              GitHub
            </a>
            <a
              href="https://www.npmjs.com/package/mailc"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
              style={{ color: 'var(--fg-dim)' }}
            >
              npm
            </a>
          </nav>
        </div>
      </footer>
    </div>
  )
}

/* ── Glass bucket card ────────────────────────────────────────────────────── */
function BucketCardView({ bucket }: { bucket: BucketCard }): JSX.Element {
  return (
    <Link
      to={bucket.path}
      className="group block h-full"
      style={{ textDecoration: 'none' }}
    >
      <div
        className="glass h-full transition-all duration-300"
        style={{
          borderRadius: 20,
          padding: 24,
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.transform = 'translateY(-2px)'
          el.style.borderColor = 'var(--border-strong)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.transform = 'translateY(0)'
          el.style.borderColor = 'var(--glass-border)'
        }}
      >
        {/* Accent radial glow */}
        <div
          style={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${bucket.color}33, transparent 70%)`,
            filter: 'blur(20px)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Icon + tag row */}
          <div className="flex items-start justify-between mb-5">
            <div
              className="w-10 h-10 flex items-center justify-center"
              style={{
                borderRadius: 12,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: bucket.color,
              }}
            >
              <bucket.icon className="h-5 w-5" />
            </div>
            <span
              className="text-[9px] font-mono uppercase tracking-wider px-2 py-1"
              style={{
                borderRadius: 999,
                background: `${bucket.color}15`,
                border: `1px solid ${bucket.color}35`,
                color: bucket.color,
              }}
            >
              shipped
            </span>
          </div>

          <h3
            className="text-lg font-semibold mb-1.5"
            style={{ color: 'var(--fg)', letterSpacing: '-0.02em' }}
          >
            {bucket.title}
          </h3>
          <p className="text-xs leading-relaxed mb-5" style={{ color: 'var(--fg-muted)' }}>
            {bucket.tagline}
          </p>

          <ul className="space-y-1.5 mb-6">
            {bucket.highlights.map((h) => (
              <li
                key={h.href}
                className="text-xs flex items-center gap-2"
                style={{ color: 'var(--fg-muted)' }}
              >
                <div
                  className="w-1 h-1 rounded-full shrink-0"
                  style={{ background: 'var(--fg-dim)' }}
                />
                {h.label}
              </li>
            ))}
          </ul>

          <div
            className="flex items-center gap-1.5 text-xs font-medium transition-all group-hover:gap-2.5"
            style={{ color: 'var(--fg-dim)' }}
          >
            Explore
            <ArrowRight
              className="h-3 w-3 transition-transform group-hover:translate-x-1"
              style={{ color: bucket.color }}
            />
          </div>
        </div>
      </div>
    </Link>
  )
}
