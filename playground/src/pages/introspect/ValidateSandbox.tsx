import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Wand2,
  ShieldCheck,
} from 'lucide-react'
import { getIntrospect, type ValidationResult } from '@/introspect-demo/api'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Curated examples — each demonstrates a different validation case
// ---------------------------------------------------------------------------

interface Example {
  label: string
  description: string
  parent: string
  templateStyle: 'class' | 'attribute'
  node: string // JSON string
}

const EXAMPLES: Example[] = [
  {
    label: '✅ Valid button',
    description: 'mc-button with href inside mc-column — all good.',
    parent: 'mc-column',
    templateStyle: 'class',
    node: JSON.stringify(
      {
        type: 'mc-button',
        attributes: {
          href: 'https://acme.com',
          class: 'bg-violet-600 text-white',
        },
        content: 'Get started',
      },
      null,
      2,
    ),
  },
  {
    label: '❌ Missing required attribute',
    description: 'mc-button without href — required by the spec.',
    parent: 'mc-column',
    templateStyle: 'class',
    node: JSON.stringify(
      {
        type: 'mc-button',
        attributes: {},
        content: 'Click me',
      },
      null,
      2,
    ),
  },
  {
    label: '❌ Wrong parent',
    description: 'mc-button inside mc-body — must be inside a column.',
    parent: 'mc-body',
    templateStyle: 'class',
    node: JSON.stringify(
      {
        type: 'mc-button',
        attributes: { href: 'https://acme.com' },
        content: 'Click',
      },
      null,
      2,
    ),
  },
  {
    label: '⚠️ CSS attr in class mode',
    description:
      'Setting color="red" in class mode — the validator suggests using class="" instead.',
    parent: 'mc-column',
    templateStyle: 'class',
    node: JSON.stringify(
      {
        type: 'mc-text',
        attributes: { color: '#ff0000', 'font-size': '18px' },
        content: 'Hello',
      },
      null,
      2,
    ),
  },
  {
    label: '✅ Same node — attribute mode',
    description: 'CSS-prop attrs are allowed when templateStyle is attribute.',
    parent: 'mc-column',
    templateStyle: 'attribute',
    node: JSON.stringify(
      {
        type: 'mc-text',
        attributes: { color: '#ff0000', 'font-size': '18px' },
        content: 'Hello',
      },
      null,
      2,
    ),
  },
  {
    label: '⚠️ Unknown attribute',
    description: 'Attribute not on the spec — emits a typo-style warning.',
    parent: 'mc-column',
    templateStyle: 'class',
    node: JSON.stringify(
      {
        type: 'mc-text',
        attributes: { fontSize: '14px' },
        content: 'Note: should be font-size, not fontSize',
      },
      null,
      2,
    ),
  },
]

const PARENT_OPTIONS = [
  '(none — root)',
  'mc-body',
  'mc-section',
  'mc-column',
  'mc-hero',
  'mc-head',
  'mc-attributes',
]

// ---------------------------------------------------------------------------
// UI bits
// ---------------------------------------------------------------------------

function FixBadge({ action }: { action: string }) {
  const colors: Record<string, string> = {
    'replace-with-class': 'bg-violet-500/15 text-violet-400 border-violet-500/25',
    'add-attribute': 'bg-sky-500/15 text-sky-400 border-sky-500/25',
    'remove-attribute': 'bg-red-500/15 text-red-400 border-red-500/25',
    'replace-value': 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    'remove-class': 'bg-red-500/15 text-red-400 border-red-500/25',
    'wrap-in': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    'move-to': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  }
  const cls = colors[action] ?? 'bg-muted text-muted-foreground border-border'
  return (
    <span
      className={`text-[10px] uppercase tracking-wider font-mono font-bold px-2 py-0.5 rounded border ${cls}`}
    >
      {action}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function ValidateSandbox() {
  const [parent, setParent] = useState<string>('mc-column')
  const [templateStyle, setTemplateStyle] = useState<'class' | 'attribute'>(
    'attribute',
  )
  const [json, setJson] = useState<string>(EXAMPLES[0]!.node)
  const [result, setResult] = useState<ValidationResult | null>(null)
  // Parse JSON during render — derived from `json`, no state needed
  const { parsedNode, parseError } = useMemo<{
    parsedNode: unknown
    parseError: string | null
  }>(() => {
    try {
      return { parsedNode: JSON.parse(json), parseError: null }
    } catch (err) {
      return { parsedNode: null, parseError: (err as Error).message }
    }
  }, [json])

  // Run validation when inputs change
  useEffect(() => {
    if (!parsedNode) {
      setResult(null)
      return
    }
    let cancelled = false
    async function run() {
      const introspect = await getIntrospect()
      const parentArg = parent === '(none — root)' ? null : parent
      const r = introspect.validate(parsedNode, parentArg, { templateStyle })
      if (!cancelled) setResult(r)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [parsedNode, parent, templateStyle])

  function loadExample(e: Example) {
    setJson(e.node)
    setParent(e.parent)
    setTemplateStyle(e.templateStyle)
  }

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
              <ShieldCheck className="h-4 w-4 text-violet-400" />
              <h1 className="text-xl font-bold text-foreground">
                Validate Sandbox
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Type any JSON node. Get structured errors with machine-readable
              fix actions —{' '}
              <code className="text-[11px] font-mono">
                introspect.validate(node, parent, options)
              </code>
              .
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
        {/* Left: input */}
        <div className="flex flex-col overflow-hidden border-r border-border">
          {/* Controls */}
          <div className="px-5 py-3 border-b border-border bg-surface/30 shrink-0 space-y-3">
            <div className="flex items-center gap-3 text-xs">
              <label className="text-muted-foreground font-medium uppercase tracking-wider">
                Parent
              </label>
              <select
                value={parent}
                onChange={(e) => setParent(e.target.value)}
                className="bg-background border border-border rounded px-2 py-1 text-foreground font-mono"
              >
                {PARENT_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <label className="text-muted-foreground font-medium uppercase tracking-wider">
                templateStyle
              </label>
              <div className="flex items-center gap-0.5 bg-background rounded p-0.5 border border-border">
                {(['attribute', 'class'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setTemplateStyle(m)}
                    className={cn(
                      'px-2 py-1 text-[11px] uppercase font-mono rounded transition-colors',
                      templateStyle === m
                        ? 'bg-foreground text-background'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {m}
                    {m === 'attribute' && (
                      <span className="ml-1 normal-case font-sans text-[10px] opacity-70">
                        (default)
                      </span>
                    )}
                    {m === 'class' && (
                      <span className="ml-1 normal-case font-sans text-[10px] opacity-70">
                        (limited)
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* JSON editor */}
          <div className="flex-1 overflow-auto">
            <textarea
              value={json}
              onChange={(e) => setJson(e.target.value)}
              spellCheck={false}
              className="w-full h-full p-5 bg-background text-foreground font-mono text-[13px] leading-relaxed border-0 outline-none resize-none"
              placeholder='{"type": "mc-button", "attributes": {"href": "https://example.com"}, "content": "Click me"}'
            />
          </div>

          {/* Examples bar */}
          <div className="px-5 py-3 border-t border-border bg-surface/30 shrink-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
              <Wand2 className="h-3 w-3" />
              Try an example
            </div>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((e, i) => (
                <button
                  key={i}
                  onClick={() => loadExample(e)}
                  title={e.description}
                  className="text-[11px] px-2 py-1 rounded bg-background border border-border hover:border-foreground/40 text-foreground transition-colors text-left"
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: result */}
        <div className="flex flex-col overflow-hidden bg-background">
          <div className="px-5 py-3 border-b border-border bg-surface/30 shrink-0 flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Result
            </span>
            {result &&
              (result.valid ? (
                <span className="text-[11px] flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  valid
                </span>
              ) : (
                <span className="text-[11px] flex items-center gap-1 text-red-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  invalid ({result.errors.length}{' '}
                  {result.errors.length === 1 ? 'error' : 'errors'})
                </span>
              ))}
          </div>

          <div className="flex-1 overflow-auto p-5 space-y-4">
            {parseError && (
              <div className="rounded-lg border border-red-500/25 bg-red-500/10 p-4">
                <div className="text-xs uppercase tracking-wider text-red-400 font-bold mb-1">
                  JSON parse error
                </div>
                <div className="text-sm text-red-200 font-mono">
                  {parseError}
                </div>
              </div>
            )}

            {!parseError && result && result.errors.length === 0 && result.warnings.length === 0 && (
              <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-6 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
                <div className="text-sm font-semibold text-emerald-200 mb-1">
                  Looks good
                </div>
                <div className="text-xs text-muted-foreground">
                  Zero errors, zero warnings. Safe to compile.
                </div>
              </div>
            )}

            {result?.errors.map((err, i) => (
              <div
                key={`err-${i}`}
                className="rounded-lg border border-red-500/25 bg-red-500/5 p-4"
              >
                <div className="flex items-start gap-3 mb-3">
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] uppercase tracking-wider text-red-400 font-bold mb-1 font-mono">
                      {err.code}
                    </div>
                    <div className="text-sm text-foreground leading-relaxed">
                      {err.message}
                    </div>
                  </div>
                </div>
                <FixCard fix={err.fix} />
              </div>
            ))}

            {result?.warnings.map((warn, i) => (
              <div
                key={`warn-${i}`}
                className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-4"
              >
                <div className="flex items-start gap-3 mb-3">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] uppercase tracking-wider text-amber-400 font-bold mb-1 font-mono">
                      {warn.code}
                    </div>
                    <div className="text-sm text-foreground leading-relaxed">
                      {warn.message}
                    </div>
                  </div>
                </div>
                <FixCard fix={warn.fix} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function FixCard({ fix }: { fix: ValidationResult['errors'][number]['fix'] }) {
  const detailRows: Array<[string, string | undefined]> = [
    ['attribute', fix.attribute],
    ['value', fix.value],
    ['oldValue', fix.oldValue],
    ['classHint', fix.classHint],
    ['removeClass', fix.removeClass],
    ['wrapWith', fix.wrapWith],
  ]

  return (
    <div className="rounded-md bg-background/60 border border-border p-3 ml-7">
      <div className="flex items-center gap-2 mb-2">
        <FixBadge action={fix.action} />
        <span
          className={cn(
            'text-[10px] uppercase tracking-wider font-mono font-bold',
            fix.confidence === 'high'
              ? 'text-emerald-400'
              : 'text-muted-foreground',
          )}
        >
          {fix.confidence}-confidence
        </span>
      </div>
      <div className="text-xs text-muted-foreground leading-relaxed mb-2">
        {fix.description}
      </div>
      {detailRows.some(([, v]) => v != null) && (
        <div className="text-[11px] font-mono space-y-0.5 mt-2 pt-2 border-t border-border">
          {detailRows.map(
            ([k, v]) =>
              v != null && (
                <div key={k} className="flex gap-2">
                  <span className="text-muted-foreground w-20 shrink-0">
                    {k}:
                  </span>
                  <span className="text-foreground break-all">{v}</span>
                </div>
              ),
          )}
        </div>
      )}
    </div>
  )
}
