/**
 * Build → Config Generator — `/build/config`
 *
 * Interactive UI for assembling a `mailc.config.ts` and per-call `compile()`
 * options. Left pane: form (checkboxes / radios / inputs grouped by config
 * section). Right pane: live-generated TypeScript that the user can copy.
 *
 * Source of truth for option names + defaults is the published mailc types
 * — every option here mirrors `MailcConfig` / `CompileOptions` in `src/types.ts`.
 */

import { useMemo, useState, type JSX } from 'react'
import { Copy, Check, RotateCcw, Settings2, FileJson2 } from 'lucide-react'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { CodeBlock } from '@/components/ui/code-block'
import { cn } from '@/lib/utils'

// ─── State shape ───────────────────────────────────────────────────────────

interface GeneratorState {
  // Document
  width: number

  // Output
  minify: boolean
  comments: boolean

  // Compatibility
  compatibilityMode: 'liberal' | 'strict'
  targetClients: string[]

  // Responsive
  responsiveBreakpoint: number

  // Dark mode
  darkModeEnabled: boolean
  darkModeStrategy: 'media-query' | 'class'
  darkModeColorMapping: string // JSON object string — `{"#fff":"#1a1a1a"}`

  // Accessibility
  a11yEnabled: boolean
  a11yWarnMissingAlt: boolean
  a11yEnforceAltText: boolean
  a11yCheckContrast: boolean

  // Template engine
  strictVariables: boolean

  // Styling
  templateStyle: 'attribute' | 'class'

  // Per-call options (compile() side)
  perCallSourceMap: boolean
  perCallDebug: boolean
  perCallData: boolean
  perCallFilename: string
}

const DEFAULT_STATE: GeneratorState = {
  width: 600,
  minify: false,
  comments: false,
  compatibilityMode: 'liberal',
  targetClients: ['gmail.*', 'apple-mail.*', 'outlook.*', 'yahoo.*', 'samsung-email.android'],
  responsiveBreakpoint: 480,
  darkModeEnabled: false,
  darkModeStrategy: 'media-query',
  darkModeColorMapping: '',
  a11yEnabled: false,
  a11yWarnMissingAlt: true,
  a11yEnforceAltText: false,
  a11yCheckContrast: true,
  strictVariables: false,
  templateStyle: 'attribute',
  perCallSourceMap: false,
  perCallDebug: false,
  perCallData: false,
  perCallFilename: '',
}

const ALL_TARGET_CLIENTS = [
  { id: 'gmail.*', label: 'Gmail (all)' },
  { id: 'apple-mail.*', label: 'Apple Mail (all)' },
  { id: 'outlook.*', label: 'Outlook (all)' },
  { id: 'outlook.windows.*', label: 'Outlook Windows desktop' },
  { id: 'outlook.macos', label: 'Outlook for Mac' },
  { id: 'yahoo.*', label: 'Yahoo' },
  { id: 'samsung-email.android', label: 'Samsung Mail (Android)' },
  { id: 'aol.*', label: 'AOL' },
  { id: 'fastmail.*', label: 'Fastmail' },
  { id: 'protonmail.*', label: 'ProtonMail' },
]

// ─── TS code generation ───────────────────────────────────────────────────

/** Only emit fields that differ from the default — keeps the output clean. */
function generateConfigCode(s: GeneratorState): string {
  const parts: string[] = []

  if (s.width !== DEFAULT_STATE.width) parts.push(`  width: ${s.width},`)

  // output
  const outputDiff: string[] = []
  if (s.minify !== DEFAULT_STATE.minify) outputDiff.push(`minify: ${s.minify}`)
  if (s.comments !== DEFAULT_STATE.comments) outputDiff.push(`comments: ${s.comments}`)
  if (outputDiff.length) parts.push(`  output: { ${outputDiff.join(', ')} },`)

  // compatibility
  if (s.compatibilityMode !== DEFAULT_STATE.compatibilityMode)
    parts.push(`  compatibilityMode: '${s.compatibilityMode}',`)

  // target clients
  const isDefaultClients =
    s.targetClients.length === DEFAULT_STATE.targetClients.length &&
    s.targetClients.every((c) => DEFAULT_STATE.targetClients.includes(c))
  if (!isDefaultClients) {
    parts.push(`  targetClients: [\n${s.targetClients.map((c) => `    '${c}',`).join('\n')}\n  ],`)
  }

  // responsive
  const respDiff: string[] = []
  if (s.responsiveBreakpoint !== DEFAULT_STATE.responsiveBreakpoint)
    respDiff.push(`breakpoint: ${s.responsiveBreakpoint}`)
  if (respDiff.length) parts.push(`  responsive: { ${respDiff.join(', ')} },`)

  // dark mode
  const dmDiff: string[] = []
  if (s.darkModeEnabled !== DEFAULT_STATE.darkModeEnabled) dmDiff.push(`enabled: ${s.darkModeEnabled}`)
  if (s.darkModeStrategy !== DEFAULT_STATE.darkModeStrategy)
    dmDiff.push(`strategy: '${s.darkModeStrategy}'`)
  // colorMapping — only emit if user supplied valid JSON
  if (s.darkModeColorMapping.trim()) {
    try {
      const parsed = JSON.parse(s.darkModeColorMapping) as Record<string, string>
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        const entries = Object.entries(parsed)
          .map(([k, v]) => `'${k}': '${v}'`)
          .join(', ')
        dmDiff.push(`colorMapping: { ${entries} }`)
      }
    } catch {
      // Silently skip invalid JSON — UI shows the input as-is for the user to fix
    }
  }
  if (dmDiff.length) parts.push(`  darkMode: { ${dmDiff.join(', ')} },`)

  // accessibility
  const a11yDiff: string[] = []
  if (s.a11yEnabled !== DEFAULT_STATE.a11yEnabled) a11yDiff.push(`enabled: ${s.a11yEnabled}`)
  if (s.a11yWarnMissingAlt !== DEFAULT_STATE.a11yWarnMissingAlt)
    a11yDiff.push(`warnMissingAlt: ${s.a11yWarnMissingAlt}`)
  if (s.a11yEnforceAltText !== DEFAULT_STATE.a11yEnforceAltText)
    a11yDiff.push(`enforceAltText: ${s.a11yEnforceAltText}`)
  if (s.a11yCheckContrast !== DEFAULT_STATE.a11yCheckContrast)
    a11yDiff.push(`checkContrast: ${s.a11yCheckContrast}`)
  if (a11yDiff.length) parts.push(`  accessibility: { ${a11yDiff.join(', ')} },`)

  // template engine
  const teDiff: string[] = []
  if (s.strictVariables !== DEFAULT_STATE.strictVariables) teDiff.push(`strictVariables: ${s.strictVariables}`)
  if (teDiff.length) parts.push(`  templateEngine: { ${teDiff.join(', ')} },`)

  // styling
  if (s.templateStyle !== DEFAULT_STATE.templateStyle)
    parts.push(`  styling: { templateStyle: '${s.templateStyle}' },`)

  if (parts.length === 0) {
    return `// mailc.config.ts\nimport { defineConfig } from 'mailc'\n\n// All options are at their defaults — you can omit the config file entirely\n// or keep it as scaffolding for future overrides.\nexport default defineConfig({})\n`
  }

  return `// mailc.config.ts\nimport { defineConfig } from 'mailc'\n\nexport default defineConfig({\n${parts.join('\n')}\n})\n`
}

function generatePerCallCode(s: GeneratorState): string {
  const opts: string[] = []
  if (s.perCallFilename.trim())
    opts.push(`  filename: '${s.perCallFilename.trim()}',`)
  if (s.perCallData) opts.push('  data: { user: { firstName: \'Alex\' } },')
  if (s.perCallSourceMap) opts.push('  sourceMap: true,')
  if (s.perCallDebug) opts.push('  debug: true,')

  if (opts.length === 0) {
    return `import { compile } from 'mailc'\n\nconst result = compile(source)\n`
  }

  return `import { compile } from 'mailc'\n\nconst result = compile(source, {\n${opts.join('\n')}\n})\n`
}

// ─── Form helpers ──────────────────────────────────────────────────────────

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}): JSX.Element {
  return (
    <div className="rounded-lg border border-border bg-card p-4 mb-4">
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      {description && <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">{description}</p>}
      <div className="space-y-2.5">{children}</div>
    </div>
  )
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}): JSX.Element {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-3.5 h-3.5 rounded border-border accent-[var(--accent)]"
      />
      <span className="flex-1">
        <span className="block text-xs font-medium text-foreground group-hover:text-foreground">{label}</span>
        {description && <span className="block text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{description}</span>}
      </span>
    </label>
  )
}

function Radio<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label?: string
  options: { value: T; label: string; description?: string }[]
  value: T
  onChange: (v: T) => void
}): JSX.Element {
  return (
    <div>
      {label && <span className="block text-xs font-medium text-foreground mb-2">{label}</span>}
      <div className="space-y-1.5">
        {options.map((o) => (
          <label key={o.value} className="flex items-start gap-3 cursor-pointer group">
            <input
              type="radio"
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="mt-0.5 w-3.5 h-3.5 accent-[var(--accent)]"
            />
            <span className="flex-1">
              <span className="block text-xs text-foreground">{o.label}</span>
              {o.description && (
                <span className="block text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  {o.description}
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
}): JSX.Element {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-xs text-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          className="w-20 px-2 py-1 text-xs font-mono text-right rounded-md bg-surface border border-border focus:outline-none focus:ring-1 focus:ring-foreground/20"
        />
        {suffix && <span className="text-[11px] text-muted-foreground font-mono">{suffix}</span>}
      </div>
    </label>
  )
}

function TextInput({
  label,
  description,
  value,
  onChange,
  placeholder,
  multiline = false,
}: {
  label: string
  description?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  multiline?: boolean
}): JSX.Element {
  return (
    <div>
      <label className="block">
        <span className="block text-xs font-medium text-foreground mb-1">{label}</span>
        {description && (
          <span className="block text-[11px] text-muted-foreground mb-1.5 leading-relaxed">{description}</span>
        )}
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className="w-full px-2 py-1.5 text-xs font-mono rounded-md bg-surface border border-border focus:outline-none focus:ring-1 focus:ring-foreground/20"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-2 py-1.5 text-xs font-mono rounded-md bg-surface border border-border focus:outline-none focus:ring-1 focus:ring-foreground/20"
          />
        )}
      </label>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────

export function ConfigGeneratorPage(): JSX.Element {
  const [state, setState] = useState<GeneratorState>(DEFAULT_STATE)
  const [tab, setTab] = useState<'config' | 'percall'>('config')
  const [copied, setCopied] = useState(false)
  const update = <K extends keyof GeneratorState>(key: K, value: GeneratorState[K]): void => {
    setState((s) => ({ ...s, [key]: value }))
  }

  const configCode = useMemo(() => generateConfigCode(state), [state])
  const perCallCode = useMemo(() => generatePerCallCode(state), [state])
  const visibleCode = tab === 'config' ? configCode : perCallCode

  const reset = (): void => setState(DEFAULT_STATE)
  const copy = async (): Promise<void> => {
    await navigator.clipboard.writeText(visibleCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const toggleClient = (id: string): void => {
    setState((s) => ({
      ...s,
      targetClients: s.targetClients.includes(id)
        ? s.targetClients.filter((c) => c !== id)
        : [...s.targetClients, id],
    }))
  }

  return (
    <div className="flex-1 overflow-hidden bg-background flex">
      {/* Left — form */}
      <div className="w-[55%] overflow-y-auto border-r border-border">
        <div className="px-6 py-5 max-w-3xl">
          <Breadcrumbs
            segments={[{ label: 'Build', to: '/build' }, { label: 'Config Generator' }]}
          />
          <div className="mt-2 mb-4 flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-foreground/70" />
            <h1 className="text-base font-semibold">Config Generator</h1>
          </div>
          <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
            Pick the options you want; the right side updates a ready-to-paste{' '}
            <code className="font-mono text-foreground">mailc.config.ts</code> and{' '}
            <code className="font-mono text-foreground">compile()</code> snippet. Only fields
            that differ from the defaults are emitted, so the generated file stays minimal.
          </p>

          <Section title="Document" description="Top-level email shape.">
            <NumberInput
              label="Email container width"
              value={state.width}
              onChange={(v) => update('width', v)}
              min={320}
              max={1200}
              step={10}
              suffix="px"
            />
          </Section>

          <Section
            title="Output"
            description="Shape of the compiled HTML. Source maps are separate — set them per-call below."
          >
            <Toggle
              label="Minify (single-line output)"
              description="Default is pretty-printed multi-line HTML. Turn on for one-line, smaller-byte output."
              checked={state.minify}
              onChange={(v) => update('minify', v)}
            />
            <Toggle
              label="Keep non-Outlook comments"
              description="Outlook conditional comments are always preserved regardless."
              checked={state.comments}
              onChange={(v) => update('comments', v)}
            />
          </Section>

          <Section
            title="Compatibility"
            description="Controls how the compiler handles partially-supported CSS."
          >
            <Radio
              value={state.compatibilityMode}
              onChange={(v) => update('compatibilityMode', v)}
              options={[
                {
                  value: 'liberal',
                  label: 'Liberal (default)',
                  description: 'Inline every property with any client support. Graceful degradation, no warnings.',
                },
                {
                  value: 'strict',
                  label: 'Strict',
                  description: 'Strip ENHANCE properties and warn. For B2B / Outlook-heavy audiences.',
                },
              ]}
            />
          </Section>

          <Section
            title="Target clients"
            description="caniemail glob patterns — drives CSS classification."
          >
            <div className="grid grid-cols-2 gap-1.5">
              {ALL_TARGET_CLIENTS.map((c) => (
                <Toggle
                  key={c.id}
                  label={c.label}
                  checked={state.targetClients.includes(c.id)}
                  onChange={() => toggleClient(c.id)}
                />
              ))}
            </div>
          </Section>

          <Section title="Responsive" description="Mobile breakpoint for @media query generation.">
            <NumberInput
              label="Mobile breakpoint"
              value={state.responsiveBreakpoint}
              onChange={(v) => update('responsiveBreakpoint', v)}
              min={320}
              max={768}
              step={10}
              suffix="px"
            />
          </Section>

          <Section title="Dark mode" description="Generate dark-mode CSS for compatible clients.">
            <Toggle
              label="Enable dark mode"
              checked={state.darkModeEnabled}
              onChange={(v) => update('darkModeEnabled', v)}
            />
            {state.darkModeEnabled && (
              <>
                <Radio
                  label="Strategy"
                  value={state.darkModeStrategy}
                  onChange={(v) => update('darkModeStrategy', v)}
                  options={[
                    {
                      value: 'media-query',
                      label: 'Media query',
                      description: '@media (prefers-color-scheme: dark)',
                    },
                    {
                      value: 'class',
                      label: 'Class',
                      description: 'Scoped under .dark-mode — for clients without prefers-color-scheme support',
                    },
                  ]}
                />
                <TextInput
                  label="Color mapping (optional)"
                  description="Explicit light → dark colour overrides as JSON. Example: {&quot;#ffffff&quot;:&quot;#1a1a1a&quot;,&quot;#0a0a0f&quot;:&quot;#f5f5f8&quot;}"
                  value={state.darkModeColorMapping}
                  onChange={(v) => update('darkModeColorMapping', v)}
                  placeholder='{"#ffffff": "#1a1a1a"}'
                  multiline
                />
              </>
            )}
          </Section>

          <Section title="Accessibility" description="Inject ARIA landmarks and validate alt / contrast.">
            <Toggle
              label="Enable accessibility checks"
              description="Adds role/landmark attributes and runs validation."
              checked={state.a11yEnabled}
              onChange={(v) => update('a11yEnabled', v)}
            />
            <Toggle
              label="Warn on missing alt"
              checked={state.a11yWarnMissingAlt}
              onChange={(v) => update('a11yWarnMissingAlt', v)}
            />
            <Toggle
              label="Enforce alt text (error, not warning)"
              checked={state.a11yEnforceAltText}
              onChange={(v) => update('a11yEnforceAltText', v)}
            />
            <Toggle
              label="Check WCAG AA 4.5:1 contrast"
              checked={state.a11yCheckContrast}
              onChange={(v) => update('a11yCheckContrast', v)}
            />
          </Section>

          <Section title="Template engine" description="Behaviour for {{var}}, mc-if, mc-each.">
            <Toggle
              label="Strict variables"
              description="Error (instead of empty string) when {{var}} is undefined. Useful in CI."
              checked={state.strictVariables}
              onChange={(v) => update('strictVariables', v)}
            />
          </Section>

          <Section title="Styling" description="How styles are expressed on components.">
            <Radio
              value={state.templateStyle}
              onChange={(v) => update('templateStyle', v)}
              options={[
                {
                  value: 'attribute',
                  label: 'Attribute (default)',
                  description: 'CSS-property attributes go directly on components.',
                },
                {
                  value: 'class',
                  label: 'Class (limited support)',
                  description: 'Tailwind-style utilities; bans CSS-property attributes.',
                },
              ]}
            />
          </Section>

          <Section
            title="Options you pass to compile() directly"
            description="These are different on every compile call — set them in code, not in mailc.config.ts. Switch to the 'compile() call' tab on the right to see how they're used."
          >
            <TextInput
              label="filename (optional)"
              description="Source-file path used in error messages. Useful when compiling many files in a loop."
              value={state.perCallFilename}
              onChange={(v) => update('perCallFilename', v)}
              placeholder="emails/welcome.mc"
            />
            <Toggle
              label="Show example: passing template data"
              description="Adds a sample data: {...} object to the snippet so you can see how to pass values for {{var}} interpolation. The actual values come from your code at runtime."
              checked={state.perCallData}
              onChange={(v) => update('perCallData', v)}
            />
            <Toggle
              label="Source maps"
              description="Inject data-mc-id attributes on component roots and attach a structured map of where each compiled element came from. Good for dev tools and debugging."
              checked={state.perCallSourceMap}
              onChange={(v) => update('perCallSourceMap', v)}
            />
            <Toggle
              label="Debug mode"
              description="Inject <!-- mc:source --> comments so you can trace any HTML output back to its source line by reading the file."
              checked={state.perCallDebug}
              onChange={(v) => update('perCallDebug', v)}
            />
          </Section>

          <Section
            title="What this generator doesn't cover"
            description="A few options need richer UIs than checkboxes. Use the docs and dedicated playground pages for these."
          >
            <ul className="text-[11px] text-muted-foreground space-y-1.5 leading-relaxed list-disc pl-4">
              <li>
                <strong className="text-foreground">Theme tokens</strong> — colors, spacing, fontSize, fontFamily, etc. across 12 scales.
                Use the <a href="/style/theme" className="text-[var(--accent)] hover:underline">Theme & Tokens</a> page to design your token set, then paste the resulting <code className="font-mono">theme.extend</code> object into your config.
              </li>
              <li>
                <strong className="text-foreground">Formatters</strong> — they're functions, so they can't be serialised into a config file. Define them in the same file where you call <code className="font-mono">compile()</code>: <code className="font-mono">{'{ formatters: { upper: (v) => String(v).toUpperCase() } }'}</code>.
              </li>
              <li>
                <strong className="text-foreground">templating</strong> per-call flag — only respected by <code className="font-mono">compileFromJSON()</code>; rarely needed.
              </li>
            </ul>
          </Section>

          <button
            onClick={reset}
            className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md border border-border hover:bg-surface transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Reset to defaults
          </button>
        </div>
      </div>

      {/* Right — generated code */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-surface/50">
          <FileJson2 className="h-3.5 w-3.5 text-foreground/70" />
          <button
            onClick={() => setTab('config')}
            className={cn(
              'px-3 py-1 text-[11px] font-medium rounded-md transition-colors',
              tab === 'config'
                ? 'bg-surface text-foreground border border-border'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            mailc.config.ts
          </button>
          <button
            onClick={() => setTab('percall')}
            className={cn(
              'px-3 py-1 text-[11px] font-medium rounded-md transition-colors',
              tab === 'percall'
                ? 'bg-surface text-foreground border border-border'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            compile() call
          </button>
          <button
            onClick={copy}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1 text-[11px] rounded-md border border-border hover:bg-surface transition-colors"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <CodeBlock code={visibleCode} language="typescript" showLineNumbers />
        </div>
      </div>
    </div>
  )
}
