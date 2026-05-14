/**
 * Style → Accessibility — interactive showcase of mailc's a11y warnings:
 * MISSING_TITLE, MISSING_ALT, LINKED_IMAGE_EMPTY_ALT, LOW_CONTRAST, and the
 * always-on title + xml:lang document landmarks. Each capability has its
 * own sample with live recompile so users see the exact codes/messages
 * their build pipeline would emit.
 */

import { useMemo, useState } from 'react'
import { compile } from 'mailc'
import {
  Accessibility,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  Image as ImageIcon,
  Eye,
  FileType2,
  Type,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { RelatedLinks } from '@/components/layout/RelatedLinks'
import { CodeBlock } from '@/components/ui/code-block'

// ─── Compile helpers ───────────────────────────────────────────────────────

interface CompileWarning {
  code: string
  message: string
  severity: 'error' | 'warning' | 'info'
  fix?: string
}

interface CompileSnapshot {
  html: string
  warnings: CompileWarning[]
  errors: CompileWarning[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function snapshot(source: string, accessibility: any): CompileSnapshot {
  try {
    // accessibility lives under MailcConfig, not as a top-level compile option,
    // so it must be passed through `config`.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r: any = compile(source, { config: { accessibility } as any })
    return {
      html: r.html ?? '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      warnings: (r.warnings ?? []).map((w: any) => ({
        code: String(w.code ?? ''),
        message: String(w.message ?? ''),
        severity: (w.severity ?? 'warning') as CompileWarning['severity'],
        fix: typeof w.fix === 'string' ? w.fix : undefined,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      errors: (r.errors ?? []).map((e: any) => ({
        code: String(e.code ?? ''),
        message: String(e.message ?? ''),
        severity: 'error' as const,
        fix: typeof e.fix === 'string' ? e.fix : undefined,
      })),
    }
  } catch (err) {
    return {
      html: `<!-- compile failed: ${String(err)} -->`,
      warnings: [],
      errors: [{ code: 'COMPILE_FAIL', message: String(err), severity: 'error' }],
    }
  }
}

function extractHead(html: string): string {
  const m = html.match(/<head[\s\S]*?<\/head>/i)
  return m ? m[0] : '(no <head> in output)'
}

function extractHtmlOpen(html: string): string {
  const m = html.match(/<html[^>]*>/i)
  return m ? m[0] : '(no <html> tag)'
}

function extractBodyOpen(html: string): string {
  const body = html.match(/<body[^>]*>/i)?.[0] ?? '(no <body>)'
  const wrapper =
    html.match(/<body[^>]*>\s*([\s\S]{0,260})/i)?.[1]?.trim().replace(/\s+/g, ' ').slice(0, 240) ??
    ''
  return `${body}\n${wrapper}…`
}

// ─── Page ──────────────────────────────────────────────────────────────────

export function StyleA11y(): JSX.Element {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Breadcrumbs
          segments={[
            { label: 'Style', to: '/style' },
            { label: 'Accessibility' },
          ]}
        />

        {/* Header */}
        <div className="mt-4 mb-8 flex items-start gap-3">
          <div className="mt-0.5 w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Accessibility className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight mb-1.5">
              Accessibility, baked in.
            </h1>
            <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
              Four capabilities run on every <code className="font-mono text-xs bg-surface border border-border px-1 py-0.5 rounded">compile()</code>:
              document landmarks, image alt-text checks, color contrast (WCAG AA), and table-header warnings.
              Each section below shows the source, the actual warnings mailc emits, and the relevant config knob.
            </p>
          </div>
        </div>

        {/* Capabilities */}
        <div className="space-y-10">
          <CapabilityLandmarks />
          <CapabilityAlt />
          <CapabilityContrast />
          <CapabilityValidator />
        </div>

        <RelatedLinks
          links={[
            { to: '/style/theme', label: 'Theme & Tokens', description: 'Pick brand colors with contrast in mind.' },
            { to: '/style/compatibility', label: 'Client Compatibility', description: 'CSS support per email client.' },
            { to: '/build/code', label: 'Code Playground', description: 'Author email markup and watch the compile pipeline.' },
          ]}
        />
      </div>
    </div>
  )
}

// ─── Capability 1: Document landmarks ──────────────────────────────────────

const LANDMARKS_SAMPLE_WITH_TITLE = `<mc>
  <mc-head>
    <mc-title>Welcome to Acme — finish setting up your account</mc-title>
  </mc-head>
  <mc-body>
    <mc-section>
      <mc-column>
        <mc-text>Hi there,</mc-text>
        <mc-button href="https://example.com/verify">Verify email</mc-button>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`

const LANDMARKS_SAMPLE_NO_TITLE = `<mc>
  <mc-body>
    <mc-section>
      <mc-column>
        <mc-text>Hi there,</mc-text>
        <mc-button href="https://example.com/verify">Verify email</mc-button>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`

function CapabilityLandmarks(): JSX.Element {
  const [withTitle, setWithTitle] = useState(true)
  const source = withTitle ? LANDMARKS_SAMPLE_WITH_TITLE : LANDMARKS_SAMPLE_NO_TITLE

  const off = useMemo(
    () => snapshot(source, { enabled: false, warnMissingAlt: false, enforceAltText: false, checkContrast: false }),
    [source],
  )
  const on = useMemo(
    () => snapshot(source, { enabled: true, warnMissingAlt: false, enforceAltText: false, checkContrast: false }),
    [source],
  )

  const titleWarnings = on.warnings.filter((w) => w.code === 'MISSING_TITLE')

  return (
    <CapabilitySection
      icon={FileType2}
      title="Document landmarks"
      kicker="config: accessibility.enabled"
      summary={
        <>
          When enabled, the post-processor injects <code className="mono-ish">{'<title>'}</code> from{' '}
          <code className="mono-ish">{'<mc-title>'}</code>, adds <code className="mono-ish">xml:lang</code> on{' '}
          <code className="mono-ish">{'<html>'}</code>, and wraps the body in{' '}
          <code className="mono-ish">role=&quot;article&quot;</code> with a font-size reset.
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs text-muted-foreground">Source:</span>
        <ToggleChip active={withTitle} onClick={() => setWithTitle(true)}>
          With <code className="font-mono ml-1">&lt;mc-title&gt;</code>
        </ToggleChip>
        <ToggleChip active={!withTitle} onClick={() => setWithTitle(false)}>
          Missing <code className="font-mono ml-1">&lt;mc-title&gt;</code>
        </ToggleChip>
      </div>

      <CodeBlock code={source} language="markup" maxHeight={200} />

      {titleWarnings.length > 0 && (
        <WarningsList warnings={titleWarnings} className="mt-4" />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
        <DiffPanel
          title="a11y OFF"
          tone="muted"
          rows={[
            { label: '<html> open', code: extractHtmlOpen(off.html) },
            { label: '<head>', code: extractHead(off.html) },
            { label: 'body wrapper', code: extractBodyOpen(off.html) },
          ]}
        />
        <DiffPanel
          title="a11y ON"
          tone="emerald"
          rows={[
            { label: '<html> open', code: extractHtmlOpen(on.html) },
            { label: '<head>', code: extractHead(on.html) },
            { label: 'body wrapper', code: extractBodyOpen(on.html) },
          ]}
        />
      </div>
    </CapabilitySection>
  )
}

// ─── Capability 2: Image alt-text ──────────────────────────────────────────

const ALT_SAMPLE = `<mc>
  <mc-head>
    <mc-title>Order shipped</mc-title>
  </mc-head>
  <mc-body>
    <mc-section>
      <mc-column>
        <mc-text>Your order is on its way.</mc-text>
        <mc-image src="https://example.com/hero.jpg" />
        <mc-image src="https://example.com/logo.png" href="https://example.com" alt="" />
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`

function CapabilityAlt(): JSX.Element {
  const [enforce, setEnforce] = useState(false)

  const result = useMemo(
    () =>
      snapshot(ALT_SAMPLE, {
        enabled: true,
        warnMissingAlt: true,
        enforceAltText: enforce,
        checkContrast: false,
      }),
    [enforce],
  )

  const altIssues = [
    ...result.errors.filter((w) => w.code === 'MISSING_ALT' || w.code.startsWith('ALT')),
    ...result.warnings.filter((w) => w.code === 'MISSING_ALT' || w.code.startsWith('ALT') || w.code.includes('ALT')),
  ]

  return (
    <CapabilitySection
      icon={ImageIcon}
      title="Image alt-text"
      kicker="config: warnMissingAlt · enforceAltText"
      summary={
        <>
          <code className="mono-ish">{'<mc-image>'}</code> without an{' '}
          <code className="mono-ish">alt</code> attribute → <code className="mono-ish">MISSING_ALT</code> warning.
          Linked images with empty alt → info (functional images marked decorative).
          Set <code className="mono-ish">enforceAltText: true</code> to escalate the warning to an error.
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-xs text-muted-foreground">enforceAltText:</span>
        <ToggleChip active={!enforce} onClick={() => setEnforce(false)}>
          warning
        </ToggleChip>
        <ToggleChip active={enforce} onClick={() => setEnforce(true)}>
          error (strict)
        </ToggleChip>
      </div>

      <CodeBlock code={ALT_SAMPLE} language="markup" maxHeight={240} />

      <WarningsList
        warnings={altIssues}
        className="mt-4"
        emptyMessage="No alt-text issues — every <mc-image> has a meaningful alt."
      />
    </CapabilitySection>
  )
}

// ─── Capability 3: Color contrast ──────────────────────────────────────────

const CONTRAST_SAMPLE = `<mc>
  <mc-head>
    <mc-title>Newsletter</mc-title>
  </mc-head>
  <mc-body background-color="#f3f4f6">
    <mc-section>
      <mc-column>
        <!-- Passes: dark on light -->
        <mc-text color="#111827">This text is high-contrast and readable.</mc-text>
        <!-- Borderline: 3.x:1 — fails AA for body text -->
        <mc-text color="#9ca3af">This grey body text fails WCAG AA on white.</mc-text>
        <!-- Fails: 1.5:1 — far below threshold -->
        <mc-text color="#e5e7eb">This pale grey is essentially invisible.</mc-text>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`

function CapabilityContrast(): JSX.Element {
  const [checking, setChecking] = useState(true)

  const result = useMemo(
    () =>
      snapshot(CONTRAST_SAMPLE, {
        enabled: true,
        warnMissingAlt: false,
        enforceAltText: false,
        checkContrast: checking,
      }),
    [checking],
  )

  const contrastIssues = [
    ...result.warnings.filter((w) => w.code === 'LOW_CONTRAST'),
    ...result.errors.filter((w) => w.code === 'LOW_CONTRAST'),
    // Note: contrast checker also emits info — pull those if present
    ...result.warnings.filter((w) => w.code === 'LOW_CONTRAST' && w.severity === 'info'),
  ].filter((v, i, a) => a.findIndex((x) => x.message === v.message) === i)

  return (
    <CapabilitySection
      icon={Eye}
      title="Color contrast (WCAG AA)"
      kicker="config: checkContrast"
      summary={
        <>
          The contrast checker walks every text element in the compiled HTML, finds the nearest explicit{' '}
          <code className="mono-ish">background-color</code>, and emits{' '}
          <code className="mono-ish">LOW_CONTRAST</code> when the ratio falls below WCAG AA thresholds
          (4.5:1 for body text, 3:1 for large/bold). Zero false positives — bails when no explicit background is found.
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-xs text-muted-foreground">checkContrast:</span>
        <ToggleChip active={checking} onClick={() => setChecking(true)}>on</ToggleChip>
        <ToggleChip active={!checking} onClick={() => setChecking(false)}>off</ToggleChip>
      </div>

      <CodeBlock code={CONTRAST_SAMPLE} language="markup" maxHeight={260} />

      <WarningsList
        warnings={contrastIssues}
        className="mt-4"
        emptyMessage={
          checking
            ? 'No contrast issues — every text/background pair passes WCAG AA.'
            : 'Contrast checking is off — no LOW_CONTRAST warnings will appear.'
        }
      />
    </CapabilitySection>
  )
}

// ─── Capability 4: Validator-level a11y ────────────────────────────────────

const TABLE_SAMPLE = `<mc>
  <mc-head>
    <mc-title>Order summary</mc-title>
  </mc-head>
  <mc-body>
    <mc-section>
      <mc-column>
        <mc-table>
          <tr>
            <td>Item</td>
            <td>Qty</td>
            <td>Price</td>
          </tr>
          <tr>
            <td>Wool Beanie</td>
            <td>1</td>
            <td>$29.99</td>
          </tr>
        </mc-table>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`

function CapabilityValidator(): JSX.Element {
  const result = useMemo(
    () =>
      snapshot(TABLE_SAMPLE, {
        enabled: true,
        warnMissingAlt: false,
        enforceAltText: false,
        checkContrast: false,
      }),
    [],
  )

  const tableIssues = [
    ...result.warnings.filter((w) => w.code.includes('TABLE') || w.code.includes('TH') || w.message.toLowerCase().includes('header')),
    ...result.errors.filter((w) => w.code.includes('TABLE') || w.code.includes('TH') || w.message.toLowerCase().includes('header')),
  ]

  return (
    <CapabilitySection
      icon={Type}
      title="Table headers"
      kicker="validator (always runs)"
      summary={
        <>
          Tables without <code className="mono-ish">{'<th>'}</code> cells emit a warning — screen readers
          can&apos;t announce row/column relationships without them. <code className="mono-ish">{'<th>'}</code> elements
          missing a <code className="mono-ish">scope</code> attribute also warn.
        </>
      }
    >
      <CodeBlock code={TABLE_SAMPLE} language="markup" maxHeight={260} />

      <WarningsList
        warnings={tableIssues}
        className="mt-4"
        emptyMessage="No table-header issues — all tables have proper <th scope> markup."
      />
    </CapabilitySection>
  )
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

function CapabilitySection({
  icon: Icon,
  title,
  kicker,
  summary,
  children,
}: {
  icon: typeof Accessibility
  title: string
  kicker: string
  summary: React.ReactNode
  children: React.ReactNode
}): JSX.Element {
  return (
    <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-start gap-3 mb-4 flex-wrap">
        <div className="mt-0.5 w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-foreground/70" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <code className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border border-border text-muted-foreground bg-surface">
              {kicker}
            </code>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed [&_.mono-ish]:font-mono [&_.mono-ish]:text-xs [&_.mono-ish]:bg-surface [&_.mono-ish]:border [&_.mono-ish]:border-border [&_.mono-ish]:px-1 [&_.mono-ish]:py-0.5 [&_.mono-ish]:rounded">
            {summary}
          </p>
        </div>
      </div>
      <div>{children}</div>
    </section>
  )
}

function ToggleChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium border transition-colors',
        active
          ? 'border-foreground/30 bg-surface text-foreground'
          : 'border-border bg-card text-muted-foreground hover:border-foreground/20',
      )}
    >
      {children}
    </button>
  )
}

function WarningsList({
  warnings,
  className,
  emptyMessage,
}: {
  warnings: CompileWarning[]
  className?: string
  emptyMessage?: string
}): JSX.Element {
  if (warnings.length === 0) {
    if (!emptyMessage) return <></>
    return (
      <div className={cn('rounded-lg border border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/5 px-4 py-3 flex items-start gap-2', className)}>
        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <p className="text-xs text-emerald-800 dark:text-emerald-300">{emptyMessage}</p>
      </div>
    )
  }
  return (
    <div className={cn('rounded-lg border border-border bg-surface/40 overflow-hidden', className)}>
      <div className="px-4 py-2 border-b border-border bg-surface flex items-center gap-2">
        <span className="text-xs font-semibold text-foreground">
          {warnings.length} issue{warnings.length === 1 ? '' : 's'} surfaced
        </span>
      </div>
      <ul className="divide-y divide-border">
        {warnings.map((w, i) => (
          <WarningRow key={i} warning={w} />
        ))}
      </ul>
    </div>
  )
}

function WarningRow({ warning }: { warning: CompileWarning }): JSX.Element {
  const palette =
    warning.severity === 'error'
      ? {
          icon: AlertCircle,
          iconColor: 'text-red-600 dark:text-red-400',
          codeBg: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
        }
      : warning.severity === 'warning'
        ? {
            icon: AlertTriangle,
            iconColor: 'text-amber-600 dark:text-amber-400',
            codeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
          }
        : {
            icon: Info,
            iconColor: 'text-sky-600 dark:text-sky-400',
            codeBg: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
          }
  const Icon = palette.icon
  return (
    <li className="px-4 py-3">
      <div className="flex items-start gap-2.5">
        <Icon className={cn('h-4 w-4 shrink-0 mt-0.5', palette.iconColor)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <code className={cn('text-[11px] font-mono px-1.5 py-0.5 rounded', palette.codeBg)}>
              {warning.code}
            </code>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
              {warning.severity}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-foreground leading-relaxed">{warning.message}</p>
          {warning.fix && (
            <p className="mt-1 text-[11px] text-muted-foreground italic leading-relaxed">
              <span className="font-semibold not-italic text-foreground">Fix:</span> {warning.fix}
            </p>
          )}
        </div>
      </div>
    </li>
  )
}

function DiffPanel({
  title,
  tone,
  rows,
}: {
  title: string
  tone: 'muted' | 'emerald'
  rows: { label: string; code: string }[]
}): JSX.Element {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div
        className={cn(
          'px-4 py-2.5 border-b text-sm font-semibold',
          tone === 'emerald'
            ? 'border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300'
            : 'border-border bg-surface',
        )}
      >
        {title}
      </div>
      <div className="divide-y divide-border">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="px-4 py-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground bg-surface/50">
              {row.label}
            </div>
            <div className="p-3">
              <CodeBlock code={row.code} language="markup" maxHeight={180} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
