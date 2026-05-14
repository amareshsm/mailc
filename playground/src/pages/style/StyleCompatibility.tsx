/**
 * Style → Compatibility — `/style/compatibility`
 *
 * Live tool wrapping mailc's `checkCss()` API. Paste any CSS declarations,
 * pick the target email clients, and see per-property compatibility issues
 * (errors + warnings) with affected clients and notes from caniemail.
 *
 * Demonstrates the email-client compatibility layer that runs inside every
 * compile() call.
 */

import { useMemo, useState } from 'react'
import {
  checkCss,
  buildClassificationMap,
  classifyProperty,
  type CSSCheckResult,
  type CSSClassification,
} from 'mailc'
import { AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { RelatedLinks } from '@/components/layout/RelatedLinks'

// Full caniemail client list — sourced from caniemail-tool/dist/clients.d.ts.
// Grouped by provider; each leaf is a real client pattern.
interface ClientLeaf {
  /** Display label for the platform (e.g. "Windows"). */
  label: string
  /** Exact caniemail client pattern (e.g. "outlook.windows"). */
  pattern: string
}

interface ClientGroup {
  /** Provider label (e.g. "Outlook"). */
  label: string
  /** Glob covering the whole provider (e.g. "outlook.*"). */
  allPattern: string
  leaves: ClientLeaf[]
}

const CLIENT_CATALOG: ClientGroup[] = [
  {
    label: 'Gmail',
    allPattern: 'gmail.*',
    leaves: [
      { label: 'Desktop webmail', pattern: 'gmail.desktop-webmail' },
      { label: 'Mobile webmail', pattern: 'gmail.mobile-webmail' },
      { label: 'iOS', pattern: 'gmail.ios' },
      { label: 'Android', pattern: 'gmail.android' },
    ],
  },
  {
    label: 'Outlook',
    allPattern: 'outlook.*',
    leaves: [
      { label: 'Windows', pattern: 'outlook.windows' },
      { label: 'Windows Mail', pattern: 'outlook.windows-mail' },
      { label: 'macOS', pattern: 'outlook.macos' },
      { label: 'iOS', pattern: 'outlook.ios' },
      { label: 'Android', pattern: 'outlook.android' },
    ],
  },
  {
    label: 'Apple Mail',
    allPattern: 'apple-mail.*',
    leaves: [
      { label: 'macOS', pattern: 'apple-mail.macos' },
      { label: 'iOS', pattern: 'apple-mail.ios' },
    ],
  },
  {
    label: 'Yahoo',
    allPattern: 'yahoo.*',
    leaves: [
      { label: 'Desktop webmail', pattern: 'yahoo.desktop-webmail' },
      { label: 'iOS', pattern: 'yahoo.ios' },
      { label: 'Android', pattern: 'yahoo.android' },
    ],
  },
  {
    label: 'AOL',
    allPattern: 'aol.*',
    leaves: [
      { label: 'Desktop webmail', pattern: 'aol.desktop-webmail' },
      { label: 'iOS', pattern: 'aol.ios' },
      { label: 'Android', pattern: 'aol.android' },
    ],
  },
  {
    label: 'Samsung Email',
    allPattern: 'samsung-email.*',
    leaves: [{ label: 'Android', pattern: 'samsung-email.android' }],
  },
  {
    label: 'Thunderbird',
    allPattern: 'thunderbird.*',
    leaves: [{ label: 'macOS', pattern: 'thunderbird.macos' }],
  },
  {
    label: 'Orange',
    allPattern: 'orange.*',
    leaves: [
      { label: 'Desktop webmail', pattern: 'orange.desktop-webmail' },
      { label: 'iOS', pattern: 'orange.ios' },
      { label: 'Android', pattern: 'orange.android' },
    ],
  },
  {
    label: 'ProtonMail',
    allPattern: 'protonmail.*',
    leaves: [
      { label: 'Desktop webmail', pattern: 'protonmail.desktop-webmail' },
      { label: 'iOS', pattern: 'protonmail.ios' },
      { label: 'Android', pattern: 'protonmail.android' },
    ],
  },
  {
    label: 'SFR',
    allPattern: 'sfr.*',
    leaves: [
      { label: 'Desktop webmail', pattern: 'sfr.desktop-webmail' },
      { label: 'iOS', pattern: 'sfr.ios' },
      { label: 'Android', pattern: 'sfr.android' },
    ],
  },
  {
    label: 'HEY',
    allPattern: 'hey.*',
    leaves: [{ label: 'Desktop webmail', pattern: 'hey.desktop-webmail' }],
  },
  {
    label: 'Mail.ru',
    allPattern: 'mail-ru.*',
    leaves: [{ label: 'Desktop webmail', pattern: 'mail-ru.desktop-webmail' }],
  },
  {
    label: 'Fastmail',
    allPattern: 'fastmail.*',
    leaves: [{ label: 'Desktop webmail', pattern: 'fastmail.desktop-webmail' }],
  },
  {
    label: 'La Poste',
    allPattern: 'laposte.*',
    leaves: [{ label: 'Desktop webmail', pattern: 'laposte.desktop-webmail' }],
  },
]

const ALL_LEAVES: ClientLeaf[] = CLIENT_CATALOG.flatMap((g) =>
  g.leaves.map((leaf) => ({ ...leaf, label: `${g.label} ${leaf.label}` })),
)

const POPULAR_PRESET: string[] = [
  'gmail.desktop-webmail',
  'gmail.ios',
  'gmail.android',
  'outlook.windows',
  'outlook.macos',
  'apple-mail.macos',
  'apple-mail.ios',
  'yahoo.desktop-webmail',
]

const EXAMPLE_CSS = `display: flex;
gap: 16px;
border-radius: 8px;
background-image: url(...);
box-shadow: 0 2px 4px rgba(0,0,0,0.1);`

type IssueTab = 'errors' | 'warnings'

export function StyleCompatibility(): JSX.Element {
  const [css, setCss] = useState(EXAMPLE_CSS)
  const [selectedClients, setSelectedClients] = useState<Set<string>>(
    () => new Set(POPULAR_PRESET),
  )
  const [activeTab, setActiveTab] = useState<IssueTab>('errors')

  const result: CSSCheckResult = useMemo(() => {
    const clients = Array.from(selectedClients)
    if (clients.length === 0) return { issues: [], success: true }
    try {
      return checkCss(css, clients)
    } catch {
      return { issues: [], success: true }
    }
  }, [css, selectedClients])

  const errors = result.issues.filter((i) => i.severity === 'error')
  const warnings = result.issues.filter((i) => i.severity === 'warning')

  // Parse CSS declarations for the matrix (naive split — same shape checkCss accepts).
  const parsedProps = useMemo(() => parseDeclarations(css), [css])

  // Build one classification map per selected client pattern.
  const perClientMaps = useMemo(() => {
    const out = new Map<string, ReturnType<typeof buildClassificationMap>>()
    for (const pattern of selectedClients) {
      try {
        out.set(pattern, buildClassificationMap([pattern]))
      } catch {
        /* fall through — pattern absent from caniemail data */
      }
    }
    return out
  }, [selectedClients])

  const orderedClients = useMemo(
    () => ALL_LEAVES.filter((leaf) => selectedClients.has(leaf.pattern)),
    [selectedClients],
  )

  const toggleClient = (pattern: string): void => {
    setSelectedClients((prev) => {
      const next = new Set(prev)
      if (next.has(pattern)) next.delete(pattern)
      else next.add(pattern)
      return next
    })
  }

  const toggleProvider = (group: ClientGroup): void => {
    setSelectedClients((prev) => {
      const next = new Set(prev)
      const allOn = group.leaves.every((l) => next.has(l.pattern))
      for (const l of group.leaves) {
        if (allOn) next.delete(l.pattern)
        else next.add(l.pattern)
      }
      return next
    })
  }

  const selectPreset = (kind: 'popular' | 'all' | 'none'): void => {
    if (kind === 'all') setSelectedClients(new Set(ALL_LEAVES.map((l) => l.pattern)))
    else if (kind === 'none') setSelectedClients(new Set())
    else setSelectedClients(new Set(POPULAR_PRESET))
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Breadcrumbs */}
        <Breadcrumbs
          segments={[
            { label: 'Style', to: '/style' },
            { label: 'Client Compatibility' },
          ]}
        />

        {/* Header */}
        <div className="mt-4 mb-8">
          <h1 className="text-2xl font-semibold tracking-tight mb-2">Email-client compatibility</h1>
          <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Paste CSS declarations and pick target clients to see per-property compatibility.
            Powered by{' '}
            <code className="font-mono text-xs bg-surface border border-border px-1.5 py-0.5 rounded">
              checkCss()
            </code>
            {' '}from mailc — the same engine that runs inside every{' '}
            <code className="font-mono text-xs bg-surface border border-border px-1.5 py-0.5 rounded">
              compile()
            </code>
            {' '}call.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:items-stretch">
          {/* LEFT — input */}
          <div className="flex flex-col gap-5">
            {/* CSS textarea */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-2">
                CSS declarations
              </label>
              <textarea
                value={css}
                onChange={(e) => setCss(e.target.value)}
                spellCheck={false}
                className="w-full h-48 px-3 py-2 text-xs font-mono bg-surface border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-foreground/20 resize-none"
                placeholder="display: flex;&#10;gap: 16px;"
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Semicolon-delimited declarations, like inline-style syntax. No selectors.
              </p>
            </div>

            {/* Target clients */}
            <div>
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <label className="block text-xs font-semibold text-foreground">
                  Target email clients
                </label>
                <div className="flex items-center gap-1 text-[10px] font-mono">
                  <button
                    onClick={() => selectPreset('popular')}
                    className="px-2 py-0.5 rounded border border-border bg-surface hover:bg-card text-muted-foreground hover:text-foreground transition-colors"
                  >
                    popular
                  </button>
                  <button
                    onClick={() => selectPreset('all')}
                    className="px-2 py-0.5 rounded border border-border bg-surface hover:bg-card text-muted-foreground hover:text-foreground transition-colors"
                  >
                    all ({ALL_LEAVES.length})
                  </button>
                  <button
                    onClick={() => selectPreset('none')}
                    className="px-2 py-0.5 rounded border border-border bg-surface hover:bg-card text-muted-foreground hover:text-foreground transition-colors"
                  >
                    none
                  </button>
                </div>
              </div>

              <div className="rounded-md border border-border bg-card divide-y divide-border max-h-[260px] sm:max-h-[420px] overflow-y-auto">
                {CLIENT_CATALOG.map((group) => {
                  const onCount = group.leaves.filter((l) => selectedClients.has(l.pattern)).length
                  const allOn = onCount === group.leaves.length
                  const someOn = onCount > 0 && !allOn
                  return (
                    <div key={group.allPattern} className="p-2.5">
                      <button
                        onClick={() => toggleProvider(group)}
                        className="w-full flex items-center justify-between gap-2 px-1 py-0.5 rounded hover:bg-surface transition-colors text-left"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckSquare state={allOn ? 'on' : someOn ? 'some' : 'off'} />
                          <span className="text-xs font-semibold text-foreground truncate">
                            {group.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                            {onCount}/{group.leaves.length}
                          </span>
                        </div>
                      </button>
                      <div className="mt-1.5 ml-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
                        {group.leaves.map((leaf) => {
                          const active = selectedClients.has(leaf.pattern)
                          return (
                            <button
                              key={leaf.pattern}
                              onClick={() => toggleClient(leaf.pattern)}
                              className={cn(
                                'flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-left border transition-colors min-w-0',
                                active
                                  ? 'border-foreground/30 bg-surface text-foreground'
                                  : 'border-transparent text-muted-foreground hover:bg-surface hover:text-foreground',
                              )}
                            >
                              <CheckSquare state={active ? 'on' : 'off'} />
                              <span className="truncate">{leaf.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              <p className="mt-2 text-[11px] text-muted-foreground">
                {selectedClients.size} client{selectedClients.size === 1 ? '' : 's'} selected
              </p>
            </div>
          </div>

          {/* RIGHT — output: fixed-height tabbed panel */}
          <div className="flex flex-col rounded-lg border border-border bg-card overflow-hidden h-[640px]">
            {/* Summary strip */}
            <div
              className={cn(
                'px-4 py-3 border-b border-border flex items-center gap-3 shrink-0',
                result.success
                  ? 'bg-emerald-500/5'
                  : 'bg-red-500/5',
              )}
            >
              {result.success ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
              )}
              <div className="text-xs">
                <span className="font-semibold text-foreground">
                  {result.success ? 'Looks safe to ship' : 'Review before sending'}
                </span>
                <span className="ml-2 text-muted-foreground">
                  {errors.length} error{errors.length === 1 ? '' : 's'} ·{' '}
                  {warnings.length} warning{warnings.length === 1 ? '' : 's'} across{' '}
                  {selectedClients.size} client{selectedClients.size === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            {selectedClients.size === 0 ? (
              <div className="flex-1 flex items-center justify-center p-6">
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Select at least one target client to run the check.
                </p>
              </div>
            ) : result.issues.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                <p className="text-sm font-medium">No compatibility issues</p>
                <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                  All declared properties have full support across selected clients.
                </p>
              </div>
            ) : (
              <>
                {/* Tab headers */}
                <div className="flex border-b border-border shrink-0">
                  <TabButton
                    active={activeTab === 'errors'}
                    onClick={() => setActiveTab('errors')}
                    icon={<AlertCircle className="h-3.5 w-3.5" />}
                    accent="red"
                    label="Errors"
                    count={errors.length}
                  />
                  <TabButton
                    active={activeTab === 'warnings'}
                    onClick={() => setActiveTab('warnings')}
                    icon={<AlertTriangle className="h-3.5 w-3.5" />}
                    accent="amber"
                    label="Warnings"
                    count={warnings.length}
                  />
                </div>

                {/* Tab body — scrolls */}
                <div className="flex-1 overflow-y-auto divide-y divide-border">
                  {activeTab === 'errors' && (
                    errors.length === 0 ? (
                      <EmptyTab message="No errors — selected clients fully support every declared property." />
                    ) : (
                      errors.map((issue, i) => (
                        <IssueRow key={i} issue={issue} severity="error" />
                      ))
                    )
                  )}
                  {activeTab === 'warnings' && (
                    warnings.length === 0 ? (
                      <EmptyTab message="No warnings — every property is fully supported." />
                    ) : (
                      warnings.map((issue, i) => (
                        <IssueRow key={i} issue={issue} severity="warning" />
                      ))
                    )
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Compatibility matrix */}
        {parsedProps.length > 0 && orderedClients.length > 0 && (
          <CompatibilityMatrix
            properties={parsedProps}
            clients={orderedClients}
            maps={perClientMaps}
          />
        )}

        {/* Related links */}
        <RelatedLinks
          links={[
            { to: '/style/modes', label: 'Attribute vs Class', description: 'See both styling paradigms side-by-side.' },
            { to: '/style/theme', label: 'Theme & Tokens', description: 'Theming for class mode, brand defaults for attribute mode.' },
            { to: '/build/code', label: 'Code Playground', description: 'Compose an email and watch warnings appear in real time.' },
          ]}
        />
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  accent,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  accent: 'red' | 'amber'
  label: string
  count: number
}): JSX.Element {
  // 600/400 split keeps readable contrast on both light and dark backgrounds.
  const accentText =
    accent === 'red'
      ? 'text-red-600 dark:text-red-400'
      : 'text-amber-600 dark:text-amber-400'
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors',
        active
          ? `${accentText} border-current bg-surface`
          : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-surface/50',
      )}
    >
      <span className={accentText}>{icon}</span>
      {label}
      <span
        className={cn(
          'inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full text-[10px] font-mono',
          active
            ? accent === 'red'
              ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
            : 'bg-surface text-muted-foreground border border-border',
        )}
      >
        {count}
      </span>
    </button>
  )
}

function EmptyTab({ message }: { message: string }): JSX.Element {
  return (
    <div className="flex items-center justify-center p-8 text-center">
      <p className="text-xs text-muted-foreground max-w-xs">{message}</p>
    </div>
  )
}

function IssueRow({
  issue,
  severity,
}: {
  issue: { property: string; message: string; affectedClients: string[]; notes: string[] }
  severity: 'error' | 'warning'
}): JSX.Element {
  return (
    <div className="px-4 py-3">
      <div className="flex items-baseline gap-2">
        <code
          className={cn(
            'font-mono text-xs px-2 py-0.5 rounded',
            severity === 'error'
              ? 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
          )}
        >
          {issue.property}
        </code>
        <span className="text-[11px] text-muted-foreground">
          {issue.affectedClients.length} client{issue.affectedClients.length === 1 ? '' : 's'}
        </span>
      </div>
      <p className="mt-1.5 text-xs text-foreground leading-relaxed">{issue.message}</p>
      {issue.affectedClients.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {issue.affectedClients.map((c) => (
            <span
              key={c}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface border border-border text-muted-foreground"
            >
              {c}
            </span>
          ))}
        </div>
      )}
      {issue.notes.length > 0 && (
        <div className="mt-2 space-y-1">
          {issue.notes.map((note, i) => (
            <p key={i} className="text-[11px] text-muted-foreground italic leading-relaxed">
              {note}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

function CheckSquare({ state }: { state: 'on' | 'off' | 'some' }): JSX.Element {
  return (
    <div
      className={cn(
        'w-3 h-3 rounded-sm border flex items-center justify-center shrink-0',
        state === 'on' && 'bg-foreground border-foreground',
        state === 'some' && 'bg-foreground/40 border-foreground/60',
        state === 'off' && 'border-muted-foreground/30',
      )}
    >
      {state === 'on' && (
        <svg className="w-2 h-2 text-background" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
          <path d="M5 13l4 4L19 7" />
        </svg>
      )}
      {state === 'some' && <div className="w-1.5 h-0.5 bg-background" />}
    </div>
  )
}

// ─── Compatibility matrix ──────────────────────────────────────────────────

interface ParsedDecl {
  property: string
  value: string
}

function parseDeclarations(css: string): ParsedDecl[] {
  const out: ParsedDecl[] = []
  const seen = new Set<string>()
  for (const raw of css.split(';')) {
    const decl = raw.trim()
    if (!decl) continue
    const colon = decl.indexOf(':')
    if (colon < 1) continue
    const property = decl.slice(0, colon).trim().toLowerCase()
    const value = decl.slice(colon + 1).trim()
    if (!property || !value || seen.has(property)) continue
    seen.add(property)
    out.push({ property, value })
  }
  return out
}

function CompatibilityMatrix({
  properties,
  clients,
  maps,
}: {
  properties: ParsedDecl[]
  clients: { label: string; pattern: string }[]
  maps: Map<string, ReturnType<typeof buildClassificationMap>>
}): JSX.Element {
  return (
    <section className="mt-10 rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-foreground/20 text-[10px] font-mono uppercase tracking-wider text-foreground/80 mb-2">
            safe · enhance · break
          </div>
          <h2 className="text-lg font-semibold tracking-tight">Know before you send.</h2>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-xl leading-relaxed">
            Every CSS property classified per-client at compile time. No more Outlook surprises.
          </p>
        </div>
        <Legend />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="text-left font-medium px-5 py-3 border-b border-border sticky left-0 bg-card z-10">Property</th>
              {clients.map((c) => (
                <th
                  key={c.pattern}
                  className="text-left font-medium px-4 py-3 border-b border-border whitespace-nowrap"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {properties.map((p, i) => (
              <tr
                key={p.property}
                className={cn(
                  'border-b border-border/60 last:border-0',
                  i % 2 === 1 && 'bg-surface/40',
                )}
              >
                <td
                  className={cn(
                    'px-5 py-3 font-mono text-xs text-foreground whitespace-nowrap sticky left-0 z-10',
                    i % 2 === 1 ? 'bg-surface/95' : 'bg-card',
                  )}
                >
                  {p.property}
                </td>
                {clients.map((c) => {
                  const map = maps.get(c.pattern)
                  const cls: CSSClassification = map
                    ? classifyProperty({ property: p.property, value: p.value }, map)
                    : 'SAFE'
                  return (
                    <td key={c.pattern} className="px-4 py-3">
                      <ClassificationCell classification={cls} />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Legend(): JSX.Element {
  return (
    <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <Dot kind="SAFE" /> safe
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Dot kind="ENHANCE" /> enhance
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Dot kind="BREAKING" /> break
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Dot kind="NO_EFFECT" /> no-op
      </span>
    </div>
  )
}

function ClassificationCell({ classification }: { classification: CSSClassification }): JSX.Element {
  const label =
    classification === 'SAFE'
      ? 'safe'
      : classification === 'ENHANCE'
        ? 'enhance'
        : classification === 'BREAKING'
          ? 'break'
          : 'no-op'
  const textColor =
    classification === 'SAFE'
      ? 'text-emerald-600 dark:text-emerald-400'
      : classification === 'ENHANCE'
        ? 'text-amber-600 dark:text-amber-400'
        : classification === 'BREAKING'
          ? 'text-rose-600 dark:text-rose-400'
          : 'text-muted-foreground'
  return (
    <span className={cn('inline-flex items-center gap-2 text-xs', textColor)}>
      <Dot kind={classification} />
      {label}
    </span>
  )
}

function Dot({ kind }: { kind: CSSClassification }): JSX.Element {
  if (kind === 'SAFE') {
    return <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
  }
  if (kind === 'ENHANCE') {
    return (
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ background: 'linear-gradient(to right, #fbbf24 50%, transparent 50%)', border: '1px solid #fbbf24' }}
      />
    )
  }
  if (kind === 'BREAKING') {
    return <span className="w-2.5 h-2.5 rounded-full border border-rose-400 shrink-0" />
  }
  return <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40 shrink-0" />
}
