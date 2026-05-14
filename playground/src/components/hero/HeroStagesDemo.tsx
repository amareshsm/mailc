import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

// ─── Shared pane header (used by Author, Agent, A11y, Compat) ────────────────
interface PaneHeaderProps {
  icon: 'code' | 'mail' | 'bot' | 'shield' | 'target'
  title: string
  right?: React.ReactNode
}

const PANE_ICONS: Record<string, React.ReactNode> = {
  code: <path d="M8 6l-5 6 5 6M16 6l5 6-5 6" />,
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  bot: (
    <>
      <rect x="3" y="6" width="18" height="14" rx="3" />
      <circle cx="9" cy="13" r="1.2" fill="currentColor" />
      <circle cx="15" cy="13" r="1.2" fill="currentColor" />
      <path d="M12 2v4" />
    </>
  ),
  shield: <path d="M12 2 4 5v7c0 5 3.5 8 8 10 4.5-2 8-5 8-10V5z" />,
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </>
  ),
}

function PaneHeader({ icon, title, right }: PaneHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 16px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: 'var(--fg-dim)' }}
      >
        {PANE_ICONS[icon]}
      </svg>
      <span className="mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
        {title}
      </span>
      <div style={{ marginLeft: 'auto' }}>{right}</div>
    </div>
  )
}

// ─── Compact pane header (used by Compile, Templating, Introspect) ────────────
interface HXPaneHeaderProps {
  label: string
  icon?: boolean
  accent?: string
  right?: React.ReactNode
}

function HXPaneHeader({ label, icon, accent, right }: HXPaneHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
        borderBottom: '1px solid var(--border)',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: 'var(--fg-muted)',
        letterSpacing: '0.04em',
      }}
    >
      {icon && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: accent || 'var(--accent)',
          }}
        />
      )}
      <span style={{ textTransform: 'uppercase' }}>{label}</span>
      <div style={{ flex: 1 }} />
      {right}
    </div>
  )
}

// ─── Email preview mock (shared) ─────────────────────────────────────────────
interface EmailMockProps {
  activeId: string | null
  setHoverId: (id: string | null) => void
  extraCta?: string | null
}

function EmailMock({ activeId, setHoverId, extraCta }: EmailMockProps) {
  const ring = (id: string) =>
    activeId === id
      ? {
          boxShadow:
            '0 0 0 2px var(--accent), 0 0 0 6px rgb(var(--accent-glow) / 0.18)',
          borderRadius: 6,
        }
      : { boxShadow: 'none' }

  return (
    <div
      style={{
        background: '#fff',
        color: '#0a0a0f',
        borderRadius: 12,
        padding: '40px 28px',
        width: '100%',
        maxWidth: 360,
        textAlign: 'center',
        boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
      }}
    >
      <div
        onMouseEnter={() => setHoverId('title')}
        onMouseLeave={() => setHoverId(null)}
        style={{
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
          padding: '4px 8px',
          margin: '0 -8px 8px',
          transition: 'box-shadow 0.18s',
          ...ring('title'),
        }}
      >
        Welcome to mailc
      </div>
      <div
        onMouseEnter={() => setHoverId('subtitle')}
        onMouseLeave={() => setHoverId(null)}
        style={{
          color: '#5b5b66',
          fontSize: 13,
          padding: '4px 8px',
          margin: '0 -8px 20px',
          transition: 'box-shadow 0.18s',
          ...ring('subtitle'),
        }}
      >
        The compiler that ships email-safe HTML.
      </div>
      <div
        onMouseEnter={() => setHoverId('button')}
        onMouseLeave={() => setHoverId(null)}
        style={{
          display: 'inline-block',
          padding: '4px',
          margin: '-4px',
          transition: 'box-shadow 0.18s',
          ...ring('button'),
        }}
      >
        <button
          style={{
            background: 'var(--accent)',
            color: 'var(--accent-contrast)',
            border: 'none',
            padding: '10px 22px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
          }}
        >
          Get started
        </button>
      </div>
      {extraCta && (
        <div style={{ marginTop: 12, animation: 'float-in 0.45s var(--ease-out) both' }}>
          <span
            style={{
              display: 'inline-block',
              fontSize: 12,
              color: 'var(--accent)',
              padding: '8px 14px',
              border: '1px solid var(--accent)',
              borderRadius: 8,
              background: '#fff',
            }}
          >
            {extraCta} →
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Syntax highlighter for one markup line ───────────────────────────────────
function SyntaxLine({ code }: { code: string }) {
  const tokens: Array<{ t: string; c: string }> = []
  const re = /(<\/?[\w-]+)|([\w-]+)=|("[^"]*")|(\{\{[^}]+\}\})|(\/>|>)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(code)) !== null) {
    if (m.index > last)
      tokens.push({ t: code.slice(last, m.index), c: 'var(--fg-muted)' })
    if (m[1]) tokens.push({ t: m[1], c: 'var(--accent)' })
    else if (m[2]) tokens.push({ t: m[2] + '=', c: 'var(--hue-mint)' })
    else if (m[3]) tokens.push({ t: m[3], c: 'var(--hue-peach)' })
    else if (m[4]) tokens.push({ t: m[4], c: 'var(--hue-cyan)' })
    else if (m[5]) tokens.push({ t: m[5], c: 'var(--accent)' })
    last = re.lastIndex
  }
  if (last < code.length) tokens.push({ t: code.slice(last), c: 'var(--fg-muted)' })
  return (
    <span style={{ whiteSpace: 'pre' }}>
      {tokens.length === 0 ? (
        <span style={{ color: 'var(--fg-muted)' }}>{code}</span>
      ) : (
        tokens.map((tk, j) => (
          <span key={j} style={{ color: tk.c }}>
            {tk.t}
          </span>
        ))
      )}
    </span>
  )
}

// ─── Stage 1: COMPILE ─────────────────────────────────────────────────────────
const COMPILE_STEPS = [
  {
    label: 'as-typed',
    markup: [
      '<mc>',
      '  <mc-body>',
      '    <mc-section padding="24px">',
      '      <mc-image src="hero.png" />',
      '      <mc-text style="display: flex; gap: 12px;">',
      '        Welcome aboard.',
      '      </mc-text>',
      '      <mc-button>Get started</mc-button>',
      '    </mc-section>',
      '  </mc-body>',
      '</mc>',
    ],
    issues: [
      { kind: 'error', code: 'MISSING_REQUIRED_ATTR', line: 8, message: '<mc-button> missing required attribute: href', fix: 'Add href="…" to mc-button' },
      { kind: 'warn', code: 'CSS_COMPATIBILITY', line: 5, message: 'display: flex unsupported in Outlook 2016–2021 (Windows)', fix: 'Use mc-section padding/columns for layout' },
      { kind: 'warn', code: 'MISSING_ALT', line: 4, message: '<mc-image> missing alt attribute', fix: 'Add alt="…" describing the image' },
    ],
  },
  {
    label: 'fixed',
    markup: [
      '<mc>',
      '  <mc-body>',
      '    <mc-section padding="24px">',
      '      <mc-image src="hero.png" alt="Team welcome banner" />',
      '      <mc-text padding-bottom="12px">',
      '        Welcome aboard.',
      '      </mc-text>',
      '      <mc-button href="https://acme.co/start">Get started</mc-button>',
      '    </mc-section>',
      '  </mc-body>',
      '</mc>',
    ],
    issues: [] as Array<{ kind: string; code: string; line: number; message: string; fix: string }>,
  },
]

function StageCompile({ active }: { active: boolean }) {
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (!active) return
    setStep(0)
    const id = setTimeout(() => setStep(1), 2200)
    return () => clearTimeout(id)
  }, [active])

  const cur = COMPILE_STEPS[step]
  const errCount = cur.issues.filter((i) => i.kind === 'error').length
  const warnCount = cur.issues.filter((i) => i.kind === 'warn').length

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, height: '100%' }}>
      {/* LEFT — markup */}
      <div className="glass" style={{ borderRadius: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <HXPaneHeader
          label="welcome.email.mc"
          accent="var(--accent)"
          icon
          right={
            <button
              onClick={() => setStep((s) => (s + 1) % 2)}
              className="mono"
              style={{
                fontSize: 10, padding: '3px 8px', borderRadius: 6,
                border: '1px solid var(--border)', background: 'var(--surface-2)',
                color: 'var(--fg-muted)', cursor: 'pointer',
              }}
            >
              {step === 0 ? 'apply fixes →' : '← reset'}
            </button>
          }
        />
        <pre style={{ margin: 0, padding: 16, flex: 1, overflow: 'auto', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.7, background: 'var(--bg-deep)' }}>
          {cur.markup.map((line, i) => {
            const lineNum = i + 1
            const issue = cur.issues.find((x) => x.line === lineNum)
            return (
              <div
                key={i}
                style={{
                  display: 'flex', gap: 14, position: 'relative',
                  background: issue ? (issue.kind === 'error' ? 'rgba(232,79,139,0.08)' : 'rgba(255,157,110,0.07)') : undefined,
                  borderLeft: issue ? `2px solid ${issue.kind === 'error' ? 'var(--hue-rose)' : 'var(--hue-peach)'}` : '2px solid transparent',
                  padding: '0 8px', marginLeft: -8, transition: 'all 0.4s var(--ease-out)',
                }}
              >
                <span style={{ color: 'var(--fg-faint)', width: 18, textAlign: 'right', flexShrink: 0 }}>{lineNum}</span>
                <SyntaxLine code={line} />
              </div>
            )
          })}
        </pre>
      </div>
      {/* RIGHT — preview + console */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
        <div className="glass" style={{ borderRadius: 14, flex: '1 1 auto', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          <HXPaneHeader label="preview · gmail" accent="var(--hue-mint)" icon />
          <div style={{ flex: 1, padding: 18, background: '#f4f6f9', color: '#0a0a0f', fontFamily: 'var(--font-sans)', overflow: 'auto' }}>
            <div style={{ background: '#fff', borderRadius: 8, padding: 22 }}>
              <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8, color: '#0a0a0f' }}>Welcome aboard.</div>
              <div style={{ height: 64, borderRadius: 6, background: 'linear-gradient(135deg,#2563eb22,#2563eb11)', border: '1px dashed #2563eb44', marginBottom: 14, display: 'grid', placeItems: 'center', fontSize: 11, color: '#2563ebaa', fontFamily: 'var(--font-mono)' }}>
                hero.png{step === 1 ? ' · alt="Team welcome banner"' : ''}
              </div>
              <button style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: step === 1 ? 'pointer' : 'not-allowed', opacity: step === 1 ? 1 : 0.55 }}>
                Get started {step === 1 ? '→' : '⚠'}
              </button>
            </div>
          </div>
        </div>
        <div className="glass" style={{ borderRadius: 14, flex: '0 0 200px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <HXPaneHeader
            label="console · compile()"
            accent={errCount ? 'var(--hue-rose)' : warnCount ? 'var(--hue-peach)' : 'var(--hue-mint)'}
            icon
            right={
              <span className="mono" style={{ fontSize: 10 }}>
                <span style={{ color: 'var(--hue-rose)' }}>{errCount} err</span>
                <span style={{ opacity: 0.4, margin: '0 6px' }}>·</span>
                <span style={{ color: 'var(--hue-peach)' }}>{warnCount} warn</span>
              </span>
            }
          />
          <div style={{ flex: 1, overflow: 'auto', padding: 8, background: 'var(--bg-deep)', fontFamily: 'var(--font-mono)', fontSize: 11.5, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {cur.issues.length === 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', color: 'var(--hue-mint)' }}>
                <span>✓</span> compile ok · 0 warnings · 0 errors
              </div>
            )}
            {cur.issues.map((iss, i) => (
              <div
                key={i}
                style={{
                  padding: '6px 10px', borderRadius: 6,
                  background: iss.kind === 'error' ? 'rgba(232,79,139,0.08)' : 'rgba(255,157,110,0.07)',
                  border: `1px solid ${iss.kind === 'error' ? 'rgba(232,79,139,0.25)' : 'rgba(255,157,110,0.22)'}`,
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  animation: `fade-in 0.3s ${i * 80}ms var(--ease-out) both`,
                }}
              >
                <span style={{ color: iss.kind === 'error' ? 'var(--hue-rose)' : 'var(--hue-peach)', fontWeight: 600, flexShrink: 0 }}>{iss.kind === 'error' ? 'ERROR' : ' WARN'}</span>
                <span style={{ color: 'var(--fg-dim)', flexShrink: 0 }}>{iss.code}</span>
                <span style={{ color: 'var(--fg-dim)' }}>:{iss.line}</span>
                <span style={{ color: 'var(--fg-muted)', marginLeft: 2 }}>{iss.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Stage 2: TEMPLATING ──────────────────────────────────────────────────────
const TEMPLATE_DATASETS = [
  { label: 'shipped', data: { user: { name: 'Sarah' }, order: { id: 'A-1042', status: 'shipped', items: [{ name: 'Trail Runners', qty: 1 }, { name: 'Wool Socks 3-pack', qty: 2 }] } } },
  { label: 'pending', data: { user: { name: 'Marco' }, order: { id: 'A-1051', status: 'pending', items: [{ name: 'Cloud Tee', qty: 3 }] } } },
  { label: 'empty cart', data: { user: { name: 'guest' }, order: { id: 'A-0000', status: 'pending', items: [] as Array<{ name: string; qty: number }> } } },
]

const TEMPLATE_MARKUP_LINES = [
  '<mc-text>Hi {{user.name || "there"}},</mc-text>',
  '<mc-if condition="order.status === \'shipped\'">',
  '  <mc-text>Order #{{order.id}} is on its way.</mc-text>',
  '<mc-else>',
  '  <mc-text>Order #{{order.id}} is being prepared.</mc-text>',
  '</mc-if>',
  '',
  '<mc-each item="line" in="order.items">',
  '  <mc-text>• {{line.qty}} × {{line.name}}</mc-text>',
  '</mc-each>',
]

function StageTemplating({ active: _active }: { active: boolean }) {
  const [idx, setIdx] = useState(0)
  const ds = TEMPLATE_DATASETS[idx]

  const resolve = (path: string): unknown =>
    path.split('.').reduce<unknown>((acc, k) => (acc != null && typeof acc === 'object' ? (acc as Record<string, unknown>)[k] : undefined), ds.data)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, height: '100%' }}>
      {/* LEFT */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
        <div className="glass" style={{ borderRadius: 14, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          <HXPaneHeader label="template" accent="var(--accent)" icon />
          <pre style={{ margin: 0, padding: 14, flex: 1, overflow: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11.5, lineHeight: 1.75, background: 'var(--bg-deep)', color: 'var(--fg)' }}>
            {TEMPLATE_MARKUP_LINES.map((line, i) => (
              <div key={i} style={{ display: 'flex', gap: 12 }}>
                <span style={{ color: 'var(--fg-faint)', width: 16, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                <SyntaxLine code={line} />
              </div>
            ))}
          </pre>
        </div>
        <div className="glass" style={{ borderRadius: 14, flex: '0 0 auto', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <HXPaneHeader
            label="data"
            accent="var(--hue-peach)"
            icon
            right={
              <div style={{ display: 'flex', gap: 4 }}>
                {TEMPLATE_DATASETS.map((d, i) => (
                  <button key={d.label} onClick={() => setIdx(i)} className="mono" style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, border: '1px solid var(--border)', background: idx === i ? 'var(--surface-3)' : 'transparent', color: idx === i ? 'var(--fg)' : 'var(--fg-muted)', cursor: 'pointer' }}>
                    {d.label}
                  </button>
                ))}
              </div>
            }
          />
          <pre style={{ margin: 0, padding: 14, fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.65, color: 'var(--fg-muted)', background: 'var(--bg-deep)', maxHeight: 130, overflow: 'auto' }}>
            {JSON.stringify(ds.data, null, 2)}
          </pre>
        </div>
      </div>
      {/* RIGHT — rendered */}
      <div className="glass" style={{ borderRadius: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <HXPaneHeader label="rendered" accent="var(--hue-mint)" icon />
        <div style={{ flex: 1, padding: 22, background: '#f4f6f9', color: '#0a0a0f', fontFamily: 'var(--font-sans)', overflow: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 22, fontSize: 14, lineHeight: 1.7 }}>
            <div style={{ marginBottom: 12 }}>Hi <strong>{(resolve('user.name') as string) || 'there'}</strong>,</div>
            <div style={{ marginBottom: 14 }}>
              {ds.data.order.status === 'shipped' ? (
                <span>Order <span className="mono" style={{ background: '#eef2ff', padding: '1px 6px', borderRadius: 4 }}>#{ds.data.order.id}</span> is on its way.</span>
              ) : (
                <span>Order <span className="mono" style={{ background: '#fef3c7', padding: '1px 6px', borderRadius: 4 }}>#{ds.data.order.id}</span> is being prepared.</span>
              )}
            </div>
            {ds.data.order.items.length > 0 ? (
              <ul style={{ paddingLeft: 18, margin: 0, color: '#374151' }}>
                {ds.data.order.items.map((it, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>{it.qty} × {it.name}</li>
                ))}
              </ul>
            ) : (
              <div style={{ color: '#6b7280', fontStyle: 'italic' }}>No items in this order yet.</div>
            )}
          </div>
          <div className="mono" style={{ marginTop: 14, fontSize: 10.5, color: '#6b7280', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span><span style={{ color: 'var(--hue-violet)' }}>●</span> mc-if branch: {ds.data.order.status}</span>
            <span><span style={{ color: 'var(--hue-mint)' }}>●</span> mc-each iterations: {ds.data.order.items.length}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Stage 3: COMPAT ──────────────────────────────────────────────────────────
function StageCompat({ active }: { active: boolean }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!active) return
    setTick(0)
    const id = setInterval(() => setTick((t) => t + 1), 1100)
    return () => clearInterval(id)
  }, [active])

  const checks = [
    { client: 'gmail (web)', status: 'safe' as const },
    { client: 'gmail (ios)', status: 'safe' as const },
    { client: 'apple mail', status: 'safe' as const },
    { client: 'outlook 365', status: 'partial' as const, note: 'flex ok, gap unsupported' },
    { client: 'outlook 2016', status: 'break' as const, note: 'word engine — table fallback' },
    { client: 'yahoo mail', status: 'safe' as const },
    { client: 'aol web', status: 'partial' as const, note: 'flex partial' },
    { client: 'gmx', status: 'partial' as const, note: 'gap unsupported' },
  ]

  const visible = Math.min(tick, checks.length)
  const statusColor = { safe: 'var(--hue-mint)', partial: 'var(--hue-peach)', break: 'var(--hue-rose)' }
  const statusChar = { safe: '●', partial: '◐', break: '○' }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%' }}>
      <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        <PaneHeader icon="target" title="checkCss(css, clients)" right={<span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-dim)' }}>caniemail @ compile</span>} />
        <pre style={{ margin: 16, padding: 16, fontFamily: 'var(--font-mono)', fontSize: 12.5, lineHeight: 1.65, color: 'var(--fg)', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface-1)' }}>
          <span style={{ color: 'var(--fg-dim)' }}>{'// paste any css'}</span>{'\n'}
          <span style={{ color: 'var(--hue-mint)' }}>display</span><span style={{ color: 'var(--fg-muted)' }}>: </span><span style={{ color: 'var(--hue-peach)' }}>flex</span><span style={{ color: 'var(--fg-muted)' }}>;</span>{'\n'}
          <span style={{ color: 'var(--hue-mint)' }}>gap</span><span style={{ color: 'var(--fg-muted)' }}>: </span><span style={{ color: 'var(--hue-peach)' }}>16px</span><span style={{ color: 'var(--fg-muted)' }}>;</span>
        </pre>
        <div style={{ padding: '0 16px 16px', fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.55 }}>
          Every property routed through caniemail's per-client database. Returns structured warnings keyed by{' '}
          <code className="mono" style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, background: 'var(--code-bg)' }}>PLUGIN_CSS_COMPATIBILITY</code>.
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <PaneHeader icon="mail" title="per-client outcome" right={<span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-dim)' }}>{visible}/{checks.length}</span>} />
        <div style={{ flex: 1, padding: 14, display: 'flex', flexDirection: 'column', gap: 4, overflow: 'auto' }}>
          {checks.map((c, i) => (
            <div key={c.client} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'var(--surface-1)', border: '1px solid var(--border)', opacity: i < visible ? 1 : 0, transform: i < visible ? 'translateX(0)' : 'translateX(-8px)', transition: 'all 0.3s var(--ease-out)' }}>
              <span style={{ fontSize: 12, color: 'var(--fg)' }}>{c.client}</span>
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-dim)', textAlign: 'right' }}>{c.note || ''}</span>
              <span className="mono" style={{ fontSize: 11, color: statusColor[c.status], minWidth: 56, textAlign: 'right' }}>{statusChar[c.status]} {c.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Stage 4: SOURCE MAP (AUTHOR) ─────────────────────────────────────────────
const HERO_NODES = [
  { id: 'title', lines: [3, 5], label: '<mc-text size="3xl">' },
  { id: 'subtitle', lines: [6, 8], label: '<mc-text color="muted">' },
  { id: 'button', lines: [9, 11], label: '<mc-button>' },
]

const HERO_MARKUP_LINES = [
  '<mc>',
  '  <mc-body>',
  '    <mc-section padding="48px 24px" align="center">',
  '      <mc-text size="3xl" weight="bold">',
  '        Welcome to mailc',
  '      </mc-text>',
  '      <mc-text color="muted" class="mt-3">',
  '        The compiler that ships email-safe HTML.',
  '      </mc-text>',
  '      <mc-button href="https://..." class="mt-6">',
  '        Get started',
  '      </mc-button>',
  '    </mc-section>',
  '  </mc-body>',
  '</mc>',
]

function StageAuthor({ active }: { active: boolean }) {
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [autoTick, setAutoTick] = useState(0)

  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setAutoTick((t) => t + 1), 1600)
    return () => clearInterval(id)
  }, [active])

  const activeId = hoverId ?? HERO_NODES[autoTick % HERO_NODES.length].id
  const findNode = (line: number) => HERO_NODES.find((n) => line >= n.lines[0] && line <= n.lines[1])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%', gap: 0 }}>
      <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        <PaneHeader icon="code" title="welcome.mc" right={<span className="mono" style={{ fontSize: 10.5, color: 'var(--hue-mint)' }}>● compiled · sourceMap: true</span>} />
        <pre style={{ margin: 0, padding: '14px 0', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.7, flex: 1, overflow: 'auto' }}>
          {HERO_MARKUP_LINES.map((ln, i) => {
            const lineNo = i + 1
            const node = findNode(lineNo)
            const isActive = node && node.id === activeId
            return (
              <div
                key={i}
                onMouseEnter={() => node && setHoverId(node.id)}
                onMouseLeave={() => setHoverId(null)}
                style={{ display: 'flex', padding: '0 16px', background: isActive ? 'rgb(var(--accent-glow) / 0.10)' : 'transparent', borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent', cursor: node ? 'pointer' : 'default', transition: 'background 0.18s, border-color 0.18s' }}
              >
                <span style={{ width: 28, color: 'var(--fg-faint)', textAlign: 'right', paddingRight: 12, userSelect: 'none', flexShrink: 0 }}>{lineNo}</span>
                <SyntaxLine code={ln} />
              </div>
            )
          })}
        </pre>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <PaneHeader icon="mail" title="rendered preview" right={<span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-dim)' }}>hover ↕ to link source</span>} />
        <div style={{ flex: 1, background: 'var(--bg-deep)', padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <EmailMock activeId={activeId} setHoverId={setHoverId} />
        </div>
      </div>
    </div>
  )
}

// ─── Stage 5: A11Y ────────────────────────────────────────────────────────────
function StageA11y({ active }: { active: boolean }) {
  const [a11yOn, setA11yOn] = useState(false)

  useEffect(() => {
    if (!active) { setA11yOn(false); return }
    setA11yOn(false)
    const t = setTimeout(() => setA11yOn(true), 700)
    return () => clearTimeout(t)
  }, [active])

  const warnings = [
    { code: 'MISSING_TITLE', severity: 'error', msg: 'No <mc-title> in <mc-head>. Required for screen-reader announcement.', fix: 'Add <mc-title>Welcome to mailc</mc-title> inside <mc-head>.' },
    { code: 'LOW_CONTRAST', severity: 'warn', msg: 'Subtitle 2.8:1 vs background — below WCAG 4.5:1 for body text.', fix: 'Set color="#5b5b66" → color="#3f3f4a", or weight="medium".' },
    { code: 'MISSING_ALT', severity: 'warn', msg: '<mc-image src="logo.png"> has no alt attribute.', fix: 'Add alt="mailc logo" or alt="" if decorative.' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%' }}>
      <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        <PaneHeader
          icon="shield"
          title="a11y post-processor"
          right={
            <button
              onClick={() => setA11yOn((v) => !v)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', fontSize: 10.5, fontFamily: 'var(--font-mono)', background: a11yOn ? 'rgb(var(--accent-glow) / 0.18)' : 'var(--surface-2)', color: a11yOn ? 'var(--accent)' : 'var(--fg-muted)', border: '1px solid ' + (a11yOn ? 'rgb(var(--accent-glow) / 0.4)' : 'var(--border)'), borderRadius: 999, cursor: 'pointer', transition: 'all 0.18s' }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: a11yOn ? 'var(--accent)' : 'var(--fg-faint)', transition: 'background 0.18s' }} />
              accessibility.enabled = {String(a11yOn)}
            </button>
          }
        />
        <div style={{ flex: 1, padding: 14, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!a11yOn && (
            <div style={{ margin: 'auto', color: 'var(--fg-dim)', fontSize: 12, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
              warnings: []<br /><span style={{ fontSize: 10.5 }}>flip the toggle →</span>
            </div>
          )}
          {a11yOn && warnings.map((w, i) => (
            <div
              key={w.code}
              style={{ border: '1px solid var(--border)', borderLeft: `3px solid ${w.severity === 'error' ? 'var(--hue-rose)' : 'var(--hue-peach)'}`, borderRadius: 8, padding: '8px 12px', background: 'var(--surface-1)', animation: `float-in 0.4s ${i * 80}ms var(--ease-out) both` }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span className="mono" style={{ fontSize: 10.5, color: w.severity === 'error' ? 'var(--hue-rose)' : 'var(--hue-peach)', letterSpacing: '0.04em' }}>{w.code}</span>
                <span className="mono" style={{ fontSize: 9.5, color: 'var(--fg-dim)' }}>severity: {w.severity}</span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--fg-muted)', lineHeight: 1.45 }}>{w.msg}</div>
              <div style={{ fontSize: 11, color: 'var(--hue-mint)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>fix: {w.fix}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <PaneHeader icon="mail" title="same email" right={<span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-dim)' }}>audit runs on every compile</span>} />
        <div style={{ flex: 1, background: 'var(--bg-deep)', padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <EmailMock activeId={null} setHoverId={() => {}} />
        </div>
      </div>
    </div>
  )
}

// ─── Stage 6: AI AGENT ────────────────────────────────────────────────────────
const AGENT_SCRIPT = [
  { kind: 'user', text: 'Add a secondary CTA below the button: "View pricing"' },
  { kind: 'tool', name: 'get_component_spec', input: { type: 'mc-button' }, output: '{ type: "mc-button", attributes: ["href", "color", …] }' },
  { kind: 'tool', name: 'can_nest', input: { parent: 'mc-section', child: 'mc-button' }, output: '{ allowed: true }' },
  { kind: 'tool', name: 'compile_email', input: { source: '<mc>… <mc-button>View pricing</mc-button></mc>' }, output: '{ html: "<table…>", warnings: [] }' },
  { kind: 'assistant', text: 'Done — recompiled, 0 warnings. Preview updated.' },
]

function ChatMessage({ m }: { m: typeof AGENT_SCRIPT[number] }) {
  if (m.kind === 'user') {
    return (
      <div style={{ alignSelf: 'flex-end', maxWidth: '85%', padding: '8px 12px', background: 'rgb(var(--accent-glow) / 0.14)', border: '1px solid rgb(var(--accent-glow) / 0.3)', borderRadius: 12, fontSize: 12.5, lineHeight: 1.45, color: 'var(--fg)', animation: 'float-in 0.3s var(--ease-out)' }}>
        {m.text}
      </div>
    )
  }
  if (m.kind === 'assistant') {
    return (
      <div style={{ maxWidth: '85%', padding: '8px 12px', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12.5, lineHeight: 1.45, color: 'var(--fg-muted)', animation: 'float-in 0.3s var(--ease-out)' }}>
        {m.text}
      </div>
    )
  }
  return (
    <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, animation: 'float-in 0.3s var(--ease-out)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--hue-cyan)" strokeWidth="2"><path d="M9 4 4 9l5 5M15 4l5 5-5 5M14 4l-4 16" /></svg>
        <span style={{ color: 'var(--hue-cyan)' }}>{m.name}</span>
        <span style={{ color: 'var(--fg-dim)', marginLeft: 'auto', fontSize: 10 }}>tool · mailc-mcp</span>
      </div>
      <div style={{ color: 'var(--fg-dim)', fontSize: 10.5 }}>→ {JSON.stringify(m.input)}</div>
      <div style={{ color: 'var(--hue-mint)', fontSize: 10.5, marginTop: 2 }}>← {m.output}</div>
    </div>
  )
}

function StageAgent({ active }: { active: boolean }) {
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (!active) { setStep(0); return }
    setStep(0)
    const id = setInterval(() => setStep((s) => Math.min(s + 1, AGENT_SCRIPT.length)), 900)
    return () => clearInterval(id)
  }, [active])

  const showCta = step >= AGENT_SCRIPT.length

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%' }}>
      <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        <PaneHeader icon="bot" title="cursor · mcp: mailc" right={<span className="mono" style={{ fontSize: 10.5, color: 'var(--hue-mint)' }}>● 7 tools connected</span>} />
        <div style={{ flex: 1, padding: 16, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {AGENT_SCRIPT.slice(0, step).map((m, i) => <ChatMessage key={i} m={m} />)}
          {step < AGENT_SCRIPT.length && (
            <div style={{ fontSize: 11, color: 'var(--fg-dim)', fontFamily: 'var(--font-mono)', padding: '4px 12px' }}>
              <span className="dot-pulse" style={{ display: 'inline-block', marginRight: 8 }} />
              {step === 0 ? 'thinking…' : 'calling tool…'}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <PaneHeader icon="mail" title="rendered preview" right={<span className="mono" style={{ fontSize: 10.5, color: showCta ? 'var(--hue-mint)' : 'var(--fg-dim)' }}>{showCta ? '● updated' : '○ awaiting compile'}</span>} />
        <div style={{ flex: 1, background: 'var(--bg-deep)', padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <EmailMock activeId={null} setHoverId={() => {}} extraCta={showCta ? 'View pricing' : null} />
        </div>
      </div>
    </div>
  )
}

// ─── Stage 7: INTROSPECT ──────────────────────────────────────────────────────
const INTRO_QUERIES = [
  { method: 'canNest', args: ['mc-section', 'mc-button'], out: { allowed: true }, note: 'Drop targets in the visual builder gate on this exact call.' },
  { method: 'canNest', args: ['mc-section', 'mc-section'], out: { allowed: false, reason: 'mc-section cannot contain mc-section' }, note: 'No second source of truth — the validator returns the same answer.' },
  { method: 'validate', args: [{ type: 'mc-button' }], out: [{ code: 'MISSING_REQUIRED_ATTR', attr: 'href', fix: 'Add href="…"' }], note: 'Structured warnings — every code maps to a fix.' },
  { method: 'extractDataContract', args: ['<mc-text>{{user.name}} on {{order.id}}</mc-text>'], out: { user: { name: 'string' }, order: { id: 'string' } }, note: 'Templates self-describe their data shape.' },
]

function StageIntrospect({ active: _active }: { active: boolean }) {
  const [i, setI] = useState(0)
  const q = INTRO_QUERIES[i]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 12, height: '100%' }}>
      <div className="glass" style={{ borderRadius: 14, padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-dim)', padding: '8px 10px 6px' }}>introspect.*</div>
        {INTRO_QUERIES.map((iq, idx) => (
          <button
            key={idx}
            onClick={() => setI(idx)}
            style={{ textAlign: 'left', padding: '9px 10px', borderRadius: 7, border: 'none', background: i === idx ? 'var(--surface-3)' : 'transparent', color: i === idx ? 'var(--fg)' : 'var(--fg-muted)', fontFamily: 'var(--font-mono)', fontSize: 11.5, cursor: 'pointer', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            <span><span style={{ color: 'var(--accent)' }}>{iq.method}</span><span style={{ color: 'var(--fg-dim)' }}>(…)</span></span>
            <span style={{ fontSize: 10, color: 'var(--fg-dim)', fontFamily: 'var(--font-sans)' }}>
              {iq.method === 'canNest' && 'allowed' in iq.out && !iq.out.allowed ? 'rejected' : iq.method === 'canNest' ? 'allowed' : iq.method === 'validate' ? 'warnings' : 'inferred shape'}
            </span>
          </button>
        ))}
      </div>
      <div className="glass" style={{ borderRadius: 14, padding: 22, display: 'flex', flexDirection: 'column', gap: 14, overflow: 'auto' }}>
        <div>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-dim)', marginBottom: 6 }}>call</div>
          <div className="mono" style={{ fontSize: 14, color: 'var(--fg)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            introspect.<span style={{ color: 'var(--accent)' }}>{q.method}</span>(
            {q.args.map((a, idx) => (
              <span key={idx}>
                {idx > 0 && ', '}
                <span style={{ color: typeof a === 'string' ? 'var(--hue-peach)' : 'var(--hue-mint)' }}>
                  {typeof a === 'string' ? `"${a}"` : JSON.stringify(a)}
                </span>
              </span>
            ))}
            )
          </div>
        </div>
        <div>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-dim)', marginBottom: 6 }}>returns</div>
          <pre style={{ margin: 0, padding: 12, background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 10, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--hue-mint)', lineHeight: 1.65, overflow: 'auto' }}>
            {JSON.stringify(q.out, null, 2)}
          </pre>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--fg-muted)', margin: 0, lineHeight: 1.55 }}>{q.note}</p>
      </div>
    </div>
  )
}

// ─── 7-stage tab orchestrator ─────────────────────────────────────────────────
const HERO_TABS = [
  { id: 'compile',    label: 'Compile',    sub: '01 · errors + warnings' },
  { id: 'templating', label: 'Templating', sub: '02 · vars · if · each' },
  { id: 'compat',     label: 'Compat',     sub: '03 · caniemail' },
  { id: 'author',     label: 'Source map', sub: '04 · click → jump' },
  { id: 'a11y',       label: 'A11y audit', sub: '05 · post-process' },
  { id: 'agent',      label: 'AI agent',   sub: '06 · MCP' },
  { id: 'introspect', label: 'Introspect', sub: '07 · predicates' },
]

type StageId = typeof HERO_TABS[number]['id']

export function HeroStagesSection() {
  const [stage, setStage] = useState<StageId>('compile')
  const activeIndex = HERO_TABS.findIndex(t => t.id === stage)
  const n = HERO_TABS.length

  return (
    <section style={{ borderTop: '1px solid var(--border)' }}>
      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Section header */}
        <div style={{ marginBottom: 32 }}>
          <div
            className="inline-flex items-center gap-1.5 mb-4 text-[11px] font-mono uppercase tracking-wider"
            style={{ padding: '4px 10px', borderRadius: 999, background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--fg-dim)' }}
          >
            7 features · interactive
          </div>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 600, letterSpacing: '-0.025em', margin: '0 0 10px', lineHeight: 1.1, color: 'var(--fg)' }}>
            Compile email like a language — <span style={{ color: 'var(--accent)' }}>not</span> a template.
          </h2>
          <p style={{ fontSize: 15, color: 'var(--fg-muted)', maxWidth: 600, margin: 0, lineHeight: 1.55 }}>
            Source maps, an introspection API, structured warnings, an MCP server, and live caniemail compatibility — wired to one JSON IR.
          </p>
        </div>

        {/* Two-column: tab list left + stage frame right */}
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16, alignItems: 'stretch' }}>

          {/* ── Left: vertical tab list ── */}
          <div
            className="glass"
            style={{ borderRadius: 18, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
          >
            {/* Header */}
            <div
              style={{
                padding: '14px 16px 12px',
                borderBottom: '1px solid var(--border)',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--fg-dim)',
              }}
            >
              Interactive demos · 7
            </div>

            {/* Tab items with sliding highlight */}
            <div style={{ position: 'relative', flex: 1, padding: '6px 0' }}>
              {/* Sliding row highlight */}
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  left: 6,
                  right: 6,
                  height: `calc((100% - 12px) / ${n})`,
                  top: `calc(6px + ${activeIndex} * (100% - 12px) / ${n})`,
                  borderRadius: 10,
                  background: 'var(--surface-2)',
                  transition: 'top 0.38s cubic-bezier(0.34, 1.4, 0.64, 1)',
                  pointerEvents: 'none',
                  zIndex: 0,
                }}
              />

              {HERO_TABS.map((tab) => {
                const on = stage === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setStage(tab.id)}
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      width: '100%',
                      padding: '0 14px',
                      height: `calc((100% - 12px) / ${n})`,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sans)',
                      textAlign: 'left',
                    }}
                  >
                    {/* Left accent bar */}
                    <div
                      style={{
                        position: 'absolute',
                        left: 6,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 3,
                        height: on ? 22 : 0,
                        borderRadius: 2,
                        background: 'var(--accent)',
                        transition: 'height 0.3s cubic-bezier(0.34, 1.4, 0.64, 1)',
                      }}
                    />
                    {/* Dot */}
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        flexShrink: 0,
                        background: on ? 'var(--accent)' : 'var(--fg-faint)',
                        transition: 'background 0.22s var(--ease-out)',
                        marginLeft: 8,
                      }}
                    />
                    {/* Text */}
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: on ? 600 : 400,
                          color: on ? 'var(--fg)' : 'var(--fg-muted)',
                          letterSpacing: '-0.01em',
                          lineHeight: 1.3,
                          transition: 'color 0.22s var(--ease-out), font-weight 0.22s var(--ease-out)',
                        }}
                      >
                        {tab.label}
                      </div>
                      <div
                        style={{
                          fontSize: 10.5,
                          fontFamily: 'var(--font-mono)',
                          color: on ? 'var(--accent)' : 'var(--fg-faint)',
                          marginTop: 2,
                          letterSpacing: '0.01em',
                          transition: 'color 0.22s var(--ease-out)',
                        }}
                      >
                        {tab.sub}
                      </div>
                    </div>
                    {/* Arrow */}
                    {on && (
                      <svg
                        width="12" height="12" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round"
                        style={{ marginLeft: 'auto', flexShrink: 0, color: 'var(--fg-dim)' }}
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Right: stage frame ── */}
          <div className="glass-strong" style={{ borderRadius: 18, padding: 14, height: 540, position: 'relative', overflow: 'hidden' }}>
            <div style={{ height: '100%', display: stage === 'compile' ? 'block' : 'none' }}>
              <StageCompile active={stage === 'compile'} />
            </div>
            <div style={{ height: '100%', display: stage === 'templating' ? 'block' : 'none' }}>
              <StageTemplating active={stage === 'templating'} />
            </div>
            <div style={{ height: '100%', display: stage === 'compat' ? 'block' : 'none' }}>
              <StageCompat active={stage === 'compat'} />
            </div>
            <div style={{ height: '100%', display: stage === 'author' ? 'block' : 'none' }}>
              <StageAuthor active={stage === 'author'} />
            </div>
            <div style={{ height: '100%', display: stage === 'a11y' ? 'block' : 'none' }}>
              <StageA11y active={stage === 'a11y'} />
            </div>
            <div style={{ height: '100%', display: stage === 'agent' ? 'block' : 'none' }}>
              <StageAgent active={stage === 'agent'} />
            </div>
            <div style={{ height: '100%', display: stage === 'introspect' ? 'block' : 'none' }}>
              <StageIntrospect active={stage === 'introspect'} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Detail row visual components ─────────────────────────────────────────────
function VCompile() {
  return (
    <div className="glass" style={{ borderRadius: 16, padding: 16, fontFamily: 'var(--font-mono)', fontSize: 11.5, lineHeight: 1.7 }}>
      <div style={{ color: 'var(--fg-dim)', marginBottom: 6 }}>{'// every warning has shape'}</div>
      <div style={{ color: 'var(--fg)' }}>{'{'}</div>
      <div style={{ paddingLeft: 14 }}><span style={{ color: 'var(--hue-mint)' }}>"code"</span>: <span style={{ color: 'var(--hue-peach)' }}>"MISSING_REQUIRED_ATTR"</span>,</div>
      <div style={{ paddingLeft: 14 }}><span style={{ color: 'var(--hue-mint)' }}>"severity"</span>: <span style={{ color: 'var(--hue-peach)' }}>"error"</span>,</div>
      <div style={{ paddingLeft: 14 }}><span style={{ color: 'var(--hue-mint)' }}>"loc"</span>: <span style={{ color: 'var(--fg)' }}>{'{ '}</span><span style={{ color: 'var(--hue-mint)' }}>"line"</span>: <span style={{ color: 'var(--accent)' }}>8</span><span style={{ color: 'var(--fg)' }}>{' }'}</span>,</div>
      <div style={{ paddingLeft: 14 }}><span style={{ color: 'var(--hue-mint)' }}>"message"</span>: <span style={{ color: 'var(--hue-peach)' }}>"&lt;mc-button&gt; missing href"</span>,</div>
      <div style={{ paddingLeft: 14 }}><span style={{ color: 'var(--hue-mint)' }}>"fix"</span>: <span style={{ color: 'var(--hue-peach)' }}>"Add href=… to mc-button"</span></div>
      <div style={{ color: 'var(--fg)' }}>{'}'}</div>
    </div>
  )
}

function VTemplating() {
  return (
    <div className="glass" style={{ borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[
        { tag: '{{var}}', desc: 'Interpolation with fallback ||' },
        { tag: '<mc-if>', desc: 'Conditionals + mc-else-if + mc-else' },
        { tag: '<mc-each>', desc: 'Loops with index, nested templates' },
        { tag: 'extractDataContract()', desc: 'Auto-derive required data shape' },
      ].map((r) => (
        <div key={r.tag} style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '8px 10px', background: 'var(--surface-1)', borderRadius: 8, border: '1px solid var(--border)' }}>
          <span className="mono" style={{ color: 'var(--accent)', fontSize: 12.5, flexShrink: 0 }}>{r.tag}</span>
          <span style={{ fontSize: 12.5, color: 'var(--fg-muted)' }}>{r.desc}</span>
        </div>
      ))}
    </div>
  )
}

function VCompat() {
  const rows = [
    { client: 'Gmail',              web: 'ok',       ios: 'ok',  android: 'ok' },
    { client: 'Apple Mail',         web: 'ok',       ios: 'ok',  android: '—' },
    { client: 'Outlook 365',        web: 'ok',       ios: 'ok',  android: 'ok' },
    { client: 'Outlook 2019 (Win)', web: 'fallback', ios: '—',   android: '—' },
    { client: 'Yahoo',              web: 'ok',       ios: 'ok',  android: 'ok' },
    { client: 'Samsung Mail',       web: '—',        ios: '—',   android: 'ok' },
  ]
  const dot = (s: string) => {
    const c = s === 'ok' ? 'var(--hue-mint)' : s === 'fallback' ? 'var(--hue-peach)' : 'var(--fg-faint)'
    return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: c }} />
  }
  return (
    <div className="glass" style={{ borderRadius: 16, padding: 14, fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>
      <div className="mono" style={{ fontSize: 10, color: 'var(--fg-dim)', marginBottom: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>css · display: flex · client matrix</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr 0.6fr 0.6fr', gap: 6, alignItems: 'center' }}>
        <span style={{ color: 'var(--fg-dim)', fontSize: 10 }}></span>
        <span style={{ color: 'var(--fg-dim)', fontSize: 10 }}>web</span>
        <span style={{ color: 'var(--fg-dim)', fontSize: 10 }}>ios</span>
        <span style={{ color: 'var(--fg-dim)', fontSize: 10 }}>android</span>
        {rows.map((r) => (
          <span key={r.client + 'frag'} style={{ display: 'contents' }}>
            <span style={{ color: 'var(--fg)' }}>{r.client}</span>
            <span>{dot(r.web)}</span>
            <span>{dot(r.ios)}</span>
            <span>{dot(r.android)}</span>
          </span>
        ))}
      </div>
      <div style={{ marginTop: 12, fontSize: 10.5, color: 'var(--fg-dim)', display: 'flex', gap: 14 }}>
        <span>{dot('ok')} supported</span>
        <span>{dot('fallback')} fallback emitted</span>
        <span>{dot('—')} n/a</span>
      </div>
    </div>
  )
}

function VAuthor() {
  return (
    <div className="glass" style={{ borderRadius: 16, padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.7, background: 'var(--bg-deep)', padding: 12, borderRadius: 8 }}>
        <div><span style={{ color: 'var(--fg-faint)' }}>4 </span><span style={{ color: 'var(--accent)' }}>{'<mc-text>'}</span></div>
        <div style={{ background: 'rgba(56,99,255,0.18)', borderLeft: '2px solid var(--accent)', paddingLeft: 6, marginLeft: -8 }}>
          <span style={{ color: 'var(--fg-faint)' }}>5 </span>{'  Welcome'}
        </div>
        <div><span style={{ color: 'var(--fg-faint)' }}>6 </span><span style={{ color: 'var(--accent)' }}>{'</mc-text>'}</span></div>
      </pre>
      <div style={{ background: '#f4f6f9', borderRadius: 8, padding: 14, position: 'relative' }}>
        <div style={{ height: 8, background: '#e5e7eb', borderRadius: 3, marginBottom: 8, width: '50%' }} />
        <div style={{ fontSize: 16, fontWeight: 700, color: '#0a0a0f', padding: 4, margin: -4, borderRadius: 4, outline: '2px solid var(--accent)', outlineOffset: 2, background: 'rgba(56,99,255,0.08)' }}>Welcome</div>
        <div style={{ height: 8, background: '#e5e7eb', borderRadius: 3, marginTop: 12, width: '70%' }} />
        <div className="mono" style={{ position: 'absolute', bottom: 6, right: 8, fontSize: 9, color: 'var(--accent)' }}>↔ src:5</div>
      </div>
    </div>
  )
}

function VA11y() {
  const codes = [
    { code: 'MISSING_TITLE',   sev: 'warn'  },
    { code: 'MISSING_PREVIEW', sev: 'warn'  },
    { code: 'MISSING_ALT',     sev: 'warn'  },
    { code: 'LOW_CONTRAST',    sev: 'warn'  },
    { code: 'TABLE_NO_HEADER', sev: 'info'  },
    { code: 'BUTTON_NO_LABEL', sev: 'error' },
  ]
  const color: Record<string, string> = { error: 'var(--hue-rose)', warn: 'var(--hue-peach)', info: 'var(--hue-cyan)' }
  return (
    <div className="glass" style={{ borderRadius: 16, padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
      {codes.map((c) => (
        <div key={c.code} style={{ padding: '7px 10px', borderRadius: 7, background: 'var(--surface-1)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: color[c.sev] }} />
          <span className="mono" style={{ fontSize: 11.5, color: 'var(--fg)' }}>{c.code}</span>
        </div>
      ))}
    </div>
  )
}

function VAgent() {
  const tools = ['compile_email', 'validate_email_node', 'list_components', 'get_component_spec', 'can_nest', 'extract_data_contract', 'check_email_client_support']
  return (
    <div className="glass" style={{ borderRadius: 16, padding: 16 }}>
      <div className="mono" style={{ fontSize: 10, color: 'var(--fg-dim)', marginBottom: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>mcp tools exposed</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {tools.map((t) => (
          <span key={t} className="mono" style={{ fontSize: 11.5, padding: '5px 10px', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 999, color: 'var(--fg)' }}>{t}</span>
        ))}
      </div>
      <div className="mono" style={{ fontSize: 10.5, color: 'var(--fg-dim)', marginTop: 14, lineHeight: 1.6 }}>
        $ mcp connect mailc<br />
        → 7 tools registered with cursor + claude desktop
      </div>
    </div>
  )
}

function VIntrospect() {
  const methods = [
    { name: 'canNest',             ret: 'boolean | { allowed, reason }' },
    { name: 'component',           ret: 'ComponentSpec' },
    { name: 'componentSpecs',      ret: 'ComponentSpec[]' },
    { name: 'validate',            ret: 'Warning[]' },
    { name: 'extractDataContract', ret: 'DataContract' },
  ]
  return (
    <div className="glass" style={{ borderRadius: 16, padding: 14, fontFamily: 'var(--font-mono)', fontSize: 11.5, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {methods.map((m) => (
        <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8 }}>
          <span style={{ color: 'var(--fg-dim)' }}>introspect.</span>
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{m.name}</span>
          <span style={{ color: 'var(--fg-dim)' }}>(…)</span>
          <span style={{ marginLeft: 'auto', color: 'var(--hue-mint)', fontSize: 11 }}>→ {m.ret}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Detail row layout ────────────────────────────────────────────────────────
interface Bullet { code?: string; text?: string }

interface DetailRowProps {
  idx: number
  eyebrow: string
  title: string
  body: string
  bullets?: Array<string | Bullet>
  link: { href: string; label: string }
  visual: React.ReactNode
}

function DetailRow({ idx, eyebrow, title, body, bullets, link, visual }: DetailRowProps) {
  const flip = idx % 2 === 1
  return (
    <div
      style={{ marginTop: 96, display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 48, alignItems: 'center' }}
    >
      <div style={{ order: flip ? 2 : 1 }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 14 }}>
          {eyebrow}
        </div>
        <h2 style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.025em', margin: '0 0 14px', lineHeight: 1.15, color: 'var(--fg)' }}>
          {title}
        </h2>
        <p style={{ fontSize: 15, color: 'var(--fg-muted)', lineHeight: 1.6, margin: '0 0 18px' }}>{body}</p>
        {bullets && (
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {bullets.map((b, i) => (
              <li key={i} style={{ display: 'flex', gap: 10, fontSize: 13.5, color: 'var(--fg-muted)', lineHeight: 1.5 }}>
                <span style={{ flexShrink: 0, marginTop: 8, width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)' }} />
                <span>
                  {typeof b === 'string' ? b : (
                    <><span className="mono" style={{ color: 'var(--fg)', fontSize: 12.5 }}>{b.code}</span><span> — {b.text}</span></>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link
          to={link.href}
          className="inline-flex items-center gap-2 text-sm font-medium transition-all hover:brightness-110"
          style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--fg-muted)', textDecoration: 'none' }}
        >
          {link.label}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
        </Link>
      </div>
      <div style={{ order: flip ? 1 : 2 }}>{visual}</div>
    </div>
  )
}

// ─── All seven detail sections ────────────────────────────────────────────────
type StageDetailData = Omit<DetailRowProps, 'idx'>

const STAGE_DETAILS: StageDetailData[] = [
  {
    eyebrow: '01 · compile',
    title: 'A compiler, not a templater.',
    body: 'compile(src) returns html + structured warnings + a source map. Errors halt; warnings annotate. Every diagnostic carries a code, a location, and a fix string — so AI agents and tools can act on them.',
    bullets: [
      { code: '{ code, severity, message, fix }', text: 'every warning has the same shape' },
      'Errors stop the build; warnings ride along on result.warnings',
      'Codes are stable and machine-consumable',
    ],
    link: { href: '/build/code', label: 'Open the playground' },
    visual: <VCompile />,
  },
  {
    eyebrow: '02 · templating',
    title: 'Variables, conditionals, loops — built in.',
    body: 'Dynamic templating is in the compiler, not a wrapper. Use {{user.name || "there"}} for interpolation with fallbacks; <mc-if> / <mc-else-if> / <mc-else> for branching; <mc-each item="x" in="items"> for loops. Run extractDataContract() and the data shape your template needs is inferred for free.',
    bullets: [
      { code: '{{path.to.value || "default"}}', text: 'safe interpolation with fallback' },
      { code: '<mc-if condition="…">', text: 'conditional regions, full else chain' },
      { code: '<mc-each item in>', text: 'loops with index; nesting allowed' },
    ],
    link: { href: '/build/templating', label: 'Templating playground' },
    visual: <VTemplating />,
  },
  {
    eyebrow: '03 · compatibility',
    title: 'caniemail at compile time.',
    body: 'Every CSS property routes through the caniemail database before output. If you write display: flex, you get a structured PLUGIN_CSS_COMPATIBILITY warning naming the clients that break and the clients that fall back — at compile time, not in QA.',
    bullets: [
      'Per-client matrix, not a single yes/no',
      'Fallbacks emitted automatically when available',
      "Same data the playground's compatibility view runs on",
    ],
    link: { href: '/style/compatibility', label: 'Compatibility view' },
    visual: <VCompat />,
  },
  {
    eyebrow: '04 · source map',
    title: 'Click the preview, jump to the source.',
    body: 'compile(src, { sourceMap: true }) returns a structured map between rendered nodes and their position in your markup. Tools light up source ↔ output without runtime markers in the email.',
    bullets: [
      'Map is structured data — { node, range, parent } — not magic comments',
      'Survives optimisations and the Outlook variant',
      "Powers the playground's hover-link between code and preview",
    ],
    link: { href: '/build/code', label: 'Source-map demo' },
    visual: <VAuthor />,
  },
  {
    eyebrow: '05 · accessibility',
    title: 'Audit the email after it compiles.',
    body: 'A post-process pass walks the compiled output and emits codes for the accessibility patterns email clients punish: missing landmark <title>, missing preview text, image alt, low-contrast pairs, table rows without headers. Toggle the rule severity per project.',
    bullets: [
      { code: 'MISSING_TITLE',   text: 'subject-line landmark for screen readers' },
      { code: 'MISSING_ALT',     text: 'image without descriptive alt' },
      { code: 'LOW_CONTRAST',    text: 'foreground/background below WCAG AA' },
      { code: 'TABLE_NO_HEADER', text: 'data tables that miss row headers' },
    ],
    link: { href: '/style/a11y', label: 'Accessibility view' },
    visual: <VA11y />,
  },
  {
    eyebrow: '06 · ai agent',
    title: 'MCP-native. Seven tools, one compiler.',
    body: 'mailc ships an MCP server. Wire it into Cursor or Claude Desktop and the agent can compile, validate, list components, look up specs, ask if a node can nest somewhere, extract a data contract, or check client support. The tools call the same compiler the playground runs.',
    bullets: [
      { code: 'compile_email',         text: 'returns html + warnings + source map' },
      { code: 'validate_email_node',   text: 'structured Warning[] on a JSON node' },
      { code: 'can_nest',              text: 'predicate the visual builder uses' },
      { code: 'extract_data_contract', text: 'derive the data shape a template wants' },
    ],
    link: { href: '/extend/mcp', label: 'MCP tools' },
    visual: <VAgent />,
  },
  {
    eyebrow: '07 · introspection',
    title: 'Tools call the compiler, not the docs.',
    body: 'introspect.* exposes the same predicates the validator runs at compile time. Drop targets in the visual builder, autocomplete in the code editor, and warnings on the JSON pane all read from this one surface.',
    bullets: [
      { code: 'introspect.canNest(p, c)',         text: 'is c a legal child of p?' },
      { code: 'introspect.component(type)',       text: 'attribute spec, allowed children, category' },
      { code: 'introspect.validate(node)',        text: 'Warning[] for a JSON node' },
      { code: 'introspect.extractDataContract()', text: 'inferred shape for {{vars}}, mc-if, mc-each' },
    ],
    link: { href: '/extend/introspect', label: 'Introspection API' },
    visual: <VIntrospect />,
  },
]

export function StageDetailSections() {
  return (
    <section style={{ borderTop: '1px solid var(--border)' }}>
      <div className="max-w-7xl mx-auto px-4 py-16">
        {STAGE_DETAILS.map((d, i) => (
          <DetailRow key={i} idx={i} {...d} />
        ))}
      </div>
    </section>
  )
}
