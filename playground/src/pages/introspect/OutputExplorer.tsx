/**
 * Extend → Introspect → Output Explorer — `/extend/introspect/output`
 *
 * Storybook-style page for the email compiler. Pick any component (built-in
 * or plugin) — see exactly what HTML it produces. Edit attributes live, watch
 * the output re-compile in <50ms.
 *
 * Demonstrates four mailc capabilities in one page:
 *   - compile() with `sourceMap: true`
 *   - introspect.all() / introspect.component() for the component catalog
 *   - source-map filtering to extract per-component output
 *   - plugins from the registry appear automatically
 */

import { useEffect, useMemo, useState } from 'react'
import { Boxes, Search, Code2, Eye, FileText, Plug } from 'lucide-react'
import { compile, introspect } from 'mailc'
import { cn } from '@/lib/utils'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { CodeBlock, findTagLineRange, formatMcMarkup } from '@/components/ui/code-block'

// Plugin/marketplace components are deliberately NOT registered here —
// the Output Explorer surfaces only built-in mc-* components.

// ─── Types from introspect output ───────────────────────────────────────

interface AttributeSpec {
  name: string
  type: string
  required: boolean
  default?: string
  example?: string
  values?: string[]
  description?: string
}

interface ComponentSpec {
  type: string
  category?: string
  description?: string
  allowedParents: string[]
  allowedChildren: string[]
  allowsTextContent?: boolean
  isPlugin?: boolean
  requiredAttributes: AttributeSpec[]
  optionalAttributes: AttributeSpec[]
  cssPropertyAttributes?: AttributeSpec[]
}

const CATEGORY_COLORS: Record<string, string> = {
  container: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  content: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
  head: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  logic: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
}

// ─── Wrapper synthesis ──────────────────────────────────────────────────

// Sensible defaults for content components — without these, `<mc-text>Hello</mc-text>`
// compiles to a `<p>` with no font-size, nested under ancestors with `font-size:0`,
// so the text renders invisibly in the preview iframe. Injecting an `mc-attributes`
// block gives every demo component a readable baseline that matches real templates.
const DEFAULT_HEAD = [
  '<mc-head>',
  '<mc-attributes>',
  '<mc-text font-size="16px" color="#1f2937" line-height="1.6" font-family="Arial, sans-serif" />',
  '<mc-list font-size="16px" color="#1f2937" line-height="1.6" font-family="Arial, sans-serif" />',
  '<mc-button background-color="#4f46e5" color="#ffffff" font-size="16px" font-family="Arial, sans-serif" />',
  '<mc-section padding="16px 24px" background-color="#ffffff" />',
  '</mc-attributes>',
  '</mc-head>',
].join('')

// Category-aware fallback wrappers for when parent chain is incomplete.
// Note: the `mc-head` defaults are injected after `<mc>` so content/container
// components get readable baseline styles in the preview.
const CONTENT_WRAP = { open: `<mc>${DEFAULT_HEAD}<mc-body><mc-section><mc-column>`, close: '</mc-column></mc-section></mc-body></mc>' }
const HEAD_WRAP    = { open: '<mc><mc-head>', close: '</mc-head></mc>' }
const CONTAINER_WRAP: Record<string, { open: string; close: string }> = {
  'mc':         { open: '', close: '' },
  'mc-body':    { open: `<mc>${DEFAULT_HEAD}`, close: '</mc>' },
  'mc-section': { open: `<mc>${DEFAULT_HEAD}<mc-body>`, close: '</mc-body></mc>' },
  'mc-column':  { open: `<mc>${DEFAULT_HEAD}<mc-body><mc-section>`, close: '</mc-section></mc-body></mc>' },
  'mc-group':   { open: `<mc>${DEFAULT_HEAD}<mc-body><mc-section>`, close: '</mc-section></mc-body></mc>' },
  'mc-hero':    { open: `<mc>${DEFAULT_HEAD}<mc-body>`, close: '</mc-body></mc>' },
}

// Logic directives (`<mc-else>`, `<mc-else-if>`) are only valid when they
// directly follow a sibling `<mc-if>` / `<mc-else-if>`. The default content
// wrap therefore needs to inject that preceding context.
const LOGIC_WRAP: Record<string, { open: string; close: string }> = {
  'mc-else': {
    open: `<mc>${DEFAULT_HEAD}<mc-body><mc-section><mc-column><mc-if condition="false"><mc-text>Hidden when condition is true</mc-text></mc-if>`,
    close: '</mc-column></mc-section></mc-body></mc>',
  },
  'mc-else-if': {
    open: `<mc>${DEFAULT_HEAD}<mc-body><mc-section><mc-column><mc-if condition="false"><mc-text>Skipped</mc-text></mc-if>`,
    close: '<mc-else><mc-text>Otherwise this shows</mc-text></mc-else></mc-column></mc-section></mc-body></mc>',
  },
}

function buildWrappers(
  componentType: string,
  components: Map<string, ComponentSpec>,
): { open: string; close: string } {
  if (componentType === 'mc') return CONTAINER_WRAP['mc']
  if (LOGIC_WRAP[componentType]) return LOGIC_WRAP[componentType]

  const chain: string[] = []
  let current = componentType
  for (let i = 0; i < 8; i++) {
    const spec = components.get(current)
    if (!spec || !spec.allowedParents?.length) break
    const parent = spec.allowedParents[0]
    if (parent === current) break
    chain.unshift(parent)
    current = parent
  }
  if (chain.length && chain[0] !== 'mc') chain.unshift('mc')

  // Chain resolved correctly if it includes mc-body or mc-head
  if (chain.includes('mc-body') || chain.includes('mc-head')) {
    // Inject default head block right after the opening <mc> for body-side
    // chains so demo content gets readable baseline styles.
    const isBodySide = chain.includes('mc-body') && !chain.includes('mc-head')
    const opens = chain.map((t) => `<${t}>`)
    if (isBodySide && opens[0] === '<mc>') {
      opens.splice(1, 0, DEFAULT_HEAD)
    }
    return {
      open: opens.join(''),
      close: chain.map((t) => `</${t}>`).reverse().join(''),
    }
  }

  // Fall back to category-based wrappers
  const cat = components.get(componentType)?.category
  if (cat === 'head') return HEAD_WRAP
  if (cat === 'container') return CONTAINER_WRAP[componentType] ?? CONTENT_WRAP
  return CONTENT_WRAP   // content + logic
}

// Per-component attribute overrides — used when the spec's `example` value
// isn't useful for a live preview (e.g. `image.jpg` doesn't load, `test="x"`
// references an unknown variable). These align attribute values with keys
// available in SAMPLE_DATA so templating + previews render real content.
const ATTR_OVERRIDES: Record<string, Record<string, string>> = {
  'mc-image': {
    src: 'https://placehold.co/600x280/8b5cf6/ffffff?text=Sample+Image&font=inter',
    alt: 'Sample image',
    width: '600',
  },
  'mc-button': {
    href: 'https://example.com',
  },
  'mc-hero': {
    'background-image':
      'https://placehold.co/1200x600/4f46e5/ffffff?text=Hero+Background&font=inter',
    'background-color': '#1e1b4b',
    'background-size': 'cover',
    'background-position': 'center center',
    height: '320px',
    padding: '60px 40px',
    align: 'center',
    'vertical-align': 'middle',
  },
  'mc-spacer': {
    height: '40px',
  },
  'mc-divider': {
    'border-color': '#4f46e5',
    'border-width': '2px',
    width: '60%',
  },
  // mc-table doesn't expose font-size as an attribute, so the cells inherit
  // `font-size:0` from the column wrapper and render invisibly. Inject a
  // table-level inline style as the smallest, most surgical workaround.
  'mc-table': {
    style: 'font-size:14px;color:#1f2937;font-family:Arial, sans-serif;line-height:1.5',
    width: '100%',
    cellpadding: '8',
  },
  'mc-social': {
    'icon-size': '24px',
  },
  'mc-each': {
    items: 'products',
    as: 'product',
  },
  'mc-for-each': {
    collection: 'items',
    as: 'item',
  },
  'mc-if': {
    condition: 'isActive',
  },
  'mc-else-if': {
    condition: 'isActive',
  },
}

// Some components are invisible when shown in isolation — `<mc-spacer>` is
// just a vertical gap, `<mc-divider>` is a horizontal line. Sandwiching them
// between two text nodes makes the effect obvious in the live preview.
const CONTEXT_SIBLINGS: Record<string, { before: string; after: string }> = {
  'mc-spacer': {
    before: '<mc-text>Content above the spacer.</mc-text>',
    after: '<mc-text>Content below the spacer — note the gap.</mc-text>',
  },
  'mc-divider': {
    before: '<mc-text>Section one — a short paragraph above the divider.</mc-text>',
    after: '<mc-text>Section two — content continues after the divider.</mc-text>',
  },
}

function buildNodeMarkup(
  spec: ComponentSpec,
  attrOverrides: Record<string, string>,
): string {
  const attrs: string[] = []
  const allAttrs = [...(spec.requiredAttributes ?? []), ...(spec.optionalAttributes ?? [])]
  const builtIn = ATTR_OVERRIDES[spec.type] ?? {}
  for (const attrSpec of allAttrs) {
    const userOverride = attrOverrides[attrSpec.name]
    if (userOverride !== undefined && userOverride !== '') {
      attrs.push(`${attrSpec.name}="${escapeAttr(userOverride)}"`)
      continue
    }
    if (attrSpec.required) {
      const v = builtIn[attrSpec.name] ?? attrSpec.example ?? attrSpec.default ?? 'value'
      attrs.push(`${attrSpec.name}="${escapeAttr(v)}"`)
    } else if (builtIn[attrSpec.name]) {
      attrs.push(`${attrSpec.name}="${escapeAttr(builtIn[attrSpec.name])}"`)
    }
  }
  const attrStr = attrs.length ? ' ' + attrs.join(' ') : ''
  const inner = spec.allowsTextContent
    ? sampleText(spec.type)
    : sampleChildren(spec.type)
  const node = inner
    ? `<${spec.type}${attrStr}>${inner}</${spec.type}>`
    : `<${spec.type}${attrStr} />`
  const ctx = CONTEXT_SIBLINGS[spec.type]
  if (ctx) return `${ctx.before}${node}${ctx.after}`
  return node
}

function sampleText(type: string): string {
  switch (type) {
    case 'mc-text':      return 'The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.'
    case 'mc-button':    return 'Get started'
    case 'mc-list-item': return 'List item'
    case 'mc-title':     return 'Welcome to Acme'
    case 'mc-preview':   return 'Preview text shown in the inbox listing'
    case 'mc-raw':       return '<p style="color:#4f46e5">Raw HTML content</p>'
    default:             return 'Sample content'
  }
}

// Minimal structural children for container/logic elements that don't allow raw text.
// IMPORTANT: variable names in {{...}} must match the `as` value in ATTR_OVERRIDES.
function sampleChildren(type: string): string {
  switch (type) {
    case 'mc':         return `${DEFAULT_HEAD}<mc-body><mc-section><mc-column><mc-text>Sample text</mc-text></mc-column></mc-section></mc-body>`
    case 'mc-body':    return '<mc-section><mc-column><mc-text>Sample text</mc-text></mc-column></mc-section>'
    case 'mc-section': return '<mc-column><mc-text>Sample text</mc-text></mc-column>'
    case 'mc-column':
    case 'mc-group':   return '<mc-text>Sample text</mc-text>'
    case 'mc-hero':    return '<mc-text font-size="32px" color="#ffffff" font-weight="bold" align="center">Welcome to Acme</mc-text><mc-text color="#e2e8f0" align="center">Build emails that just work — across every client.</mc-text><mc-button href="https://example.com" align="center" background-color="#ffffff" color="#1e1b4b">Get started</mc-button>'
    case 'mc-head':    return '<mc-title>Welcome to Acme</mc-title>'
    case 'mc-if':
    case 'mc-else-if': return '<mc-text>Visible when condition is true</mc-text>'
    case 'mc-else':    return '<mc-text>Otherwise this shows</mc-text>'
    case 'mc-each':    return '<mc-text>{{product.name}}</mc-text>'
    case 'mc-for-each': return '<mc-text>{{item}}</mc-text>'
    case 'mc-list':    return '<mc-list-item>First item</mc-list-item><mc-list-item>Second item</mc-list-item><mc-list-item>Third item</mc-list-item>'
    case 'mc-table':   return '<tr><th align="left" style="padding:8px;border-bottom:1px solid #e5e7eb">Name</th><th align="left" style="padding:8px;border-bottom:1px solid #e5e7eb">Price</th></tr><tr><td style="padding:8px">Studio Lamp</td><td style="padding:8px">$49</td></tr><tr><td style="padding:8px">Walnut Desk</td><td style="padding:8px">$299</td></tr>'
    default:           return ''
  }
}

function escapeAttr(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

// ─── Templating sample data ─────────────────────────────────────────────

// Provided to compile() so directives like <mc-each> / <mc-if> / {{var}} resolve
// instead of failing with UNKNOWN_COMPONENT_TYPE.
const SAMPLE_DATA: Record<string, unknown> = {
  items: ['First item', 'Second item', 'Third item'],
  products: [
    { name: 'Studio Lamp', price: 49 },
    { name: 'Walnut Desk', price: 299 },
    { name: 'Linen Throw', price: 79 },
  ],
  collection: ['One', 'Two', 'Three'],
  user: { name: 'Alex Doe', email: 'alex@example.com', firstName: 'Alex' },
  item: 'Sample item',
  product: { name: 'Sample product', price: 99 },
  isActive: true,
  show: true,
  test: true,
  condition: true,
  count: 3,
}

/**
 * Walk the source for templating attribute values (e.g. items="X", test="Y")
 * and inject sensible defaults into the data context for any unknown keys.
 */
function buildSampleData(source: string): Record<string, unknown> {
  const data: Record<string, unknown> = { ...SAMPLE_DATA }
  for (const m of source.matchAll(/(?:items|collection|in)="([^"{]+)"/g)) {
    const key = m[1].trim()
    if (key && !(key in data)) data[key] = ['First', 'Second', 'Third']
  }
  for (const m of source.matchAll(/(?:test|condition|when|if)="([^"{]+)"/g)) {
    const key = m[1].trim()
    if (key && !(key in data)) data[key] = true
  }
  return data
}

// ─── Source-map filtering ───────────────────────────────────────────────

interface PerComponentOutput {
  html: string
  outlookHtml: string | null
  styleProps: { property: string; value: string; origin: string }[]
}

function extractComponentOutput(
  rawHtml: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sourceMap: any,
  componentType: string,
): PerComponentOutput {
  if (!sourceMap || !rawHtml) return { html: '', outlookHtml: null, styleProps: [] }

  const entries = sourceMap.entries ?? []
  // First entry whose sourceComponent matches; that's the component's root output.
  const entry = entries.find((e: { sourceComponent: string }) => e.sourceComponent === componentType)
  if (!entry || !entry.outputRange) return { html: rawHtml, outlookHtml: null, styleProps: [] }

  // The compiler's source-map `outputRange.end` points at (or just before) the
  // closing-tag's `>` — slicing as-is truncates the final character (e.g.
  // `</table` instead of `</table>`). Walk forward to the next `>` to include it.
  let end = entry.outputRange.end
  if (rawHtml[end - 1] !== '>' && end < rawHtml.length) {
    const nextGt = rawHtml.indexOf('>', end)
    if (nextGt !== -1 && nextGt - end < 200) end = nextGt + 1
  }

  const slice = rawHtml.slice(entry.outputRange.start, end)
  const outlookMatch = slice.match(/<!--\[if mso[\s\S]*?<!\[endif\]-->/g)
  const outlookHtml = outlookMatch?.join('\n') ?? null
  return {
    html: slice,
    outlookHtml,
    styleProps: entry.styles ?? [],
  }
}

// ─── Component ──────────────────────────────────────────────────────────

export function OutputExplorer(): JSX.Element {
  const [components, setComponents] = useState<ComponentSpec[]>([])
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [attrOverrides, setAttrOverrides] = useState<Record<string, string>>({})
  const [tab, setTab] = useState<'html' | 'styles' | 'outlook'>('html')

  // Load components — built-ins from introspect.all(), plus the same call
  // also surfaces any plugins registered via defineComponent().
  useEffect(() => {
    const all = introspect.all() as ComponentSpec[]
    const sorted = [...all].sort((a, b) => {
      // group by category, then alphabetical
      const ca = a.category ?? ''
      const cb = b.category ?? ''
      if (ca !== cb) return ca.localeCompare(cb)
      return a.type.localeCompare(b.type)
    })
    setComponents(sorted)
    if (!selected && sorted.length) setSelected('mc-button')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const componentsMap = useMemo(() => {
    const m = new Map<string, ComponentSpec>()
    for (const c of components) m.set(c.type, c)
    return m
  }, [components])

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return components
    return components.filter(
      (c) =>
        c.type.toLowerCase().includes(q) ||
        (c.description?.toLowerCase().includes(q) ?? false)
    )
  }, [components, filter])

  const grouped = useMemo(() => {
    const groups: Record<string, ComponentSpec[]> = {}
    for (const c of filtered) {
      const key = c.isPlugin ? 'plugin' : c.category ?? 'other'
      if (!groups[key]) groups[key] = []
      groups[key].push(c)
    }
    return groups
  }, [filtered])

  const selectedSpec = selected ? componentsMap.get(selected) : null

  // Reset attribute overrides when switching components
  useEffect(() => {
    setAttrOverrides({})
  }, [selected])

  const compileResult = useMemo(() => {
    if (!selectedSpec) return null
    try {
      const { open, close } = buildWrappers(selectedSpec.type, componentsMap)
      const node = buildNodeMarkup(selectedSpec, attrOverrides)
      const source = `${open}${node}${close}`
      // Pre-format here so we can compute a stable line-range highlight for
      // the selected tag. The CodeBlock leaves multi-line markup alone.
      const formattedSource = formatMcMarkup(source)
      const sourceHighlight = findTagLineRange(formattedSource, selectedSpec.type)
      const result = compile(source, {
        sourceMap: true,
        data: buildSampleData(source),
      })
      const perComponent = extractComponentOutput(
        result.html ?? '',
        result.sourceMap,
        selectedSpec.type
      )
      return {
        source,
        formattedSource,
        sourceHighlight,
        node,
        rawHtml: result.html ?? '',
        perComponent,
        errors: result.errors,
        warnings: result.warnings,
      }
    } catch (err) {
      return {
        source: '',
        formattedSource: '',
        sourceHighlight: null,
        node: '',
        rawHtml: '',
        perComponent: { html: '', outlookHtml: null, styleProps: [] },
        errors: [{ code: 'COMPILE_FAILED', message: err instanceof Error ? err.message : String(err) }],
        warnings: [],
      }
    }
  }, [selectedSpec, componentsMap, attrOverrides])

  // Pre-format the per-component output slice for the Compiled HTML tab.
  // The whole panel already shows just the selected component's output, so
  // no per-line highlight is needed here.
  const formattedOutput = useMemo(() => {
    const html = compileResult?.perComponent.html
    if (!html) return { code: '(no output — component may not produce HTML directly)' }
    return { code: formatMcMarkup(html) }
  }, [compileResult?.perComponent.html])

  // Blob URL for the preview iframe — more reliable than `srcDoc` for HTML
  // mixing Outlook conditional comments, VML, and `<style>` blocks. Driven
  // through useState so the side-effecting `createObjectURL` / `revokeObjectURL`
  // pair lives entirely inside useEffect (React Compiler can't memoize it).
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  useEffect(() => {
    const html = compileResult?.rawHtml
    if (!html) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [compileResult?.rawHtml])

  return (
    <div className="flex-1 overflow-hidden bg-background flex">
      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside className="w-72 shrink-0 border-r border-border flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border">
          <Breadcrumbs
            segments={[
              { label: 'Extend', to: '/extend' },
              { label: 'Introspect', to: '/extend/introspect' },
              { label: 'Output' },
            ]}
          />
          <div className="mt-2 flex items-center gap-2">
            <Boxes className="h-4 w-4 text-foreground/70" />
            <span className="text-sm font-semibold">Output Explorer</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
            Pick a component, see its compiled HTML.
          </p>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search components"
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-foreground/20"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-2">
          {Object.entries(grouped).map(([groupKey, items]) => (
            <div key={groupKey} className="mb-3">
              <div className="px-3 mb-1 flex items-center gap-1.5">
                {groupKey === 'plugin' && <Plug className="h-3 w-3 text-muted-foreground" />}
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {groupKey}
                </span>
                <span className="text-[10px] text-muted-foreground">({items.length})</span>
              </div>
              {items.map((c) => (
                <button
                  key={c.type}
                  onClick={() => setSelected(c.type)}
                  className={cn(
                    'w-full text-left px-3 py-1.5 text-xs font-mono transition-colors flex items-center gap-2',
                    selected === c.type
                      ? 'bg-surface text-foreground'
                      : 'text-muted-foreground hover:bg-surface/50 hover:text-foreground'
                  )}
                >
                  <span className="truncate">{c.type}</span>
                  {c.category && (
                    <span
                      className={cn(
                        'ml-auto text-[9px] px-1 py-0 rounded border',
                        CATEGORY_COLORS[c.category] ?? 'border-border text-muted-foreground'
                      )}
                    >
                      {c.category[0]?.toUpperCase()}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main panel (two-column split) ────────────────────────── */}
      <main className="flex-1 overflow-hidden flex">
        {!selectedSpec && (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Pick a component on the left to see its compiled output.
          </div>
        )}

        {selectedSpec && compileResult && (
          <>
            {/* ── Left: spec header + source + attribute editor ──── */}
            <div className="w-[46%] shrink-0 overflow-y-auto border-r border-border">
              <div className="px-5 py-5">
                {/* Spec header */}
                <div className="mb-4">
                  <div className="flex items-baseline gap-2 mb-1">
                    <code className="text-base font-mono font-semibold">{selectedSpec.type}</code>
                    {selectedSpec.category && (
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded border',
                          CATEGORY_COLORS[selectedSpec.category] ?? 'border-border'
                        )}
                      >
                        {selectedSpec.category}
                      </span>
                    )}
                    {selectedSpec.isPlugin && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 inline-flex items-center gap-1">
                        <Plug className="h-2.5 w-2.5" /> plugin
                      </span>
                    )}
                  </div>
                  {selectedSpec.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {selectedSpec.description}
                    </p>
                  )}
                </div>

                {/* Source markup */}
                <Section title="Source markup" icon={<FileText className="h-3.5 w-3.5" />}>
                  <div className="p-3">
                    <CodeBlock
                      code={compileResult.formattedSource}
                      language="markup"
                      maxHeight={360}
                      highlightLines={compileResult.sourceHighlight}
                    />
                  </div>
                </Section>

                {/* Attribute editor */}
                {(selectedSpec.requiredAttributes.length > 0 || selectedSpec.optionalAttributes.length > 0) && (
                  <Section title="Edit attributes (live)" icon={<Code2 className="h-3.5 w-3.5" />}>
                    <div className="p-3 grid grid-cols-1 gap-3">
                      {[...selectedSpec.requiredAttributes, ...selectedSpec.optionalAttributes].map((attrSpec) => (
                        <div key={attrSpec.name}>
                          <label className="block mb-1 text-[11px] font-mono text-muted-foreground">
                            {attrSpec.name}
                            {attrSpec.required && <span className="text-red-500 ml-1">*</span>}
                            <span className="ml-1 opacity-60">: {attrSpec.type}</span>
                          </label>
                          {attrSpec.values ? (
                            <select
                              value={attrOverrides[attrSpec.name] ?? ''}
                              onChange={(e) =>
                                setAttrOverrides({ ...attrOverrides, [attrSpec.name]: e.target.value })
                              }
                              className="w-full px-2 py-1.5 text-xs bg-surface border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-foreground/20"
                            >
                              <option value="">(default)</option>
                              {attrSpec.values.map((v) => (
                                <option key={v} value={v}>{v}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              value={attrOverrides[attrSpec.name] ?? ''}
                              onChange={(e) =>
                                setAttrOverrides({ ...attrOverrides, [attrSpec.name]: e.target.value })
                              }
                              placeholder={attrSpec.example ?? attrSpec.default ?? ''}
                              className="w-full px-2 py-1.5 text-xs font-mono bg-surface border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-foreground/20"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
              </div>
            </div>

            {/* ── Right: split horizontally — Preview top, Code tabs bottom ─ */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* TOP HALF — Preview (always visible) */}
              <div className="flex-1 min-h-0 overflow-y-auto border-b border-border">
                <div className="px-5 py-4">
                  <div className="flex items-center gap-1.5 mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    Preview
                  </div>
                  {selectedSpec.category === 'head' ? (
                    <HeadPreview spec={selectedSpec} attrOverrides={attrOverrides} />
                  ) : compileResult.rawHtml && previewUrl ? (
                    <>
                      <div className="text-[10px] font-mono text-muted-foreground mb-1.5">
                        compiled: {compileResult.rawHtml.length.toLocaleString()} bytes ·{' '}
                        {compileResult.errors.length > 0
                          ? `${compileResult.errors.length} error(s)`
                          : 'ok'}
                      </div>
                      <div className="rounded-lg border border-border bg-white overflow-hidden">
                        <iframe
                          key={previewUrl}
                          title="preview"
                          src={previewUrl}
                          className="block w-full bg-white"
                          style={{ height: 540, border: 0 }}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border bg-surface px-4 py-8 text-center">
                      <p className="text-xs text-muted-foreground">
                        No HTML to preview — see <code className="text-foreground">Compiled HTML</code> tab below for compile errors.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* BOTTOM HALF — Code/style tabs */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="px-5 py-4">
                  {/* Tab bar */}
                  <div className="flex items-center gap-1 mb-3 border-b border-border pb-2">
                    <button
                      onClick={() => setTab('html')}
                      className={cn(
                        'px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors',
                        tab === 'html'
                          ? 'bg-surface text-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-surface/50'
                      )}
                    >
                      Compiled HTML
                    </button>
                    <button
                      onClick={() => setTab('outlook')}
                      className={cn(
                        'px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors',
                        tab === 'outlook'
                          ? 'bg-surface text-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-surface/50'
                      )}
                    >
                      Outlook VML
                    </button>
                    {compileResult.perComponent.styleProps.length > 0 && (
                      <button
                        onClick={() => setTab('styles')}
                        className={cn(
                          'px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors',
                          tab === 'styles'
                            ? 'bg-surface text-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-surface/50'
                        )}
                      >
                        Style ({compileResult.perComponent.styleProps.length})
                      </button>
                    )}
                  </div>

                  {tab === 'html' && (
                    <>
                      <div className="text-[10px] text-muted-foreground mb-1.5">
                        Compiled HTML for{' '}
                        <code className="text-foreground">{`<${selectedSpec.type}>`}</code>{' '}
                        — extracted from the source-map entry.
                      </div>
                      <CodeBlock
                        code={formattedOutput.code}
                        language="markup"
                        maxHeight={360}
                      />
                    </>
                  )}

                  {tab === 'styles' && compileResult.perComponent.styleProps.length > 0 && (
                    <div className="grid grid-cols-1 gap-1.5">
                      {compileResult.perComponent.styleProps.map((s, i) => (
                        <div
                          key={i}
                          className="px-2 py-1.5 bg-surface border border-border rounded text-[11px] font-mono flex items-center gap-1"
                        >
                          <span className="text-foreground">{s.property}</span>
                          <span className="text-muted-foreground">:</span>
                          <span className="text-violet-400">{s.value}</span>
                          <span className="ml-auto text-[9px] text-muted-foreground">
                            {s.origin}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {tab === 'outlook' && (
                    <CodeBlock
                      code={
                        compileResult.perComponent.outlookHtml ??
                        '(no Outlook-specific markup — renders identically in Outlook)'
                      }
                      language="markup"
                      maxHeight={360}
                    />
                  )}

                  {/* Errors only — warnings are intentionally hidden in this
                      demo surface; they're often noisy (a11y / strict-mode
                      property strips) and obscure the actual output preview. */}
                  {compileResult.errors.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {compileResult.errors.map((e, i) => (
                        <div
                          key={`err-${i}`}
                          className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-700 dark:text-red-300"
                        >
                          <span className="font-mono font-semibold">{e.code}</span>: {e.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode | null
  children: React.ReactNode
}): JSX.Element {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden mt-3 first:mt-0">
      {title && (
        <div className="px-3 py-2 border-b border-border bg-surface flex items-center gap-2">
          {icon}
          <span className="text-[11px] font-semibold">{title}</span>
        </div>
      )}
      {children}
    </div>
  )
}

// ─── Head component previews ───────────────────────────────────────────
// Head metadata components don't render visible HTML — they affect the
// document head, browser tab, inbox listing, or apply defaults to other
// elements. Render contextual UI that shows what each one *actually does*.

function HeadPreview({
  spec,
  attrOverrides,
}: {
  spec: ComponentSpec
  attrOverrides: Record<string, string>
}): JSX.Element {
  switch (spec.type) {
    case 'mc-title':
      return (
        <div className="space-y-3">
          <PreviewCaption text="Renders inside <head><title> — appears in browser tab when previewing as a web page, and as the subject hint in some clients." />
          <BrowserTabMock title="Welcome to Acme · your first email" />
          <InboxRowMock subject="Welcome to Acme · your first email" preview="" />
        </div>
      )

    case 'mc-preview':
      return (
        <div className="space-y-3">
          <PreviewCaption text="Hidden preheader text — Gmail, Apple Mail and most inbox listings show it after the subject line." />
          <InboxRowMock
            subject="(your subject)"
            preview="Get 20% off your first order — tap to view in app"
            highlightPreview
          />
        </div>
      )

    case 'mc-style':
      return (
        <div className="space-y-3">
          <PreviewCaption text="Custom CSS injected into <head><style>. Applied across clients that support <style> blocks (Gmail, Apple Mail, Yahoo, etc.). Stripped & inlined for Outlook." />
          <CodeBlock
            code={`.heading { color: #4f46e5; font-weight: 700; }\n.cta      { background: #4f46e5; color: #fff; }\n@media (max-width: 600px) {\n  .stack { display: block !important; }\n}`}
            language="css"
          />
        </div>
      )

    case 'mc-font': {
      const fontName = attrOverrides.name ?? attrOverrides.family ?? 'Inter'
      return (
        <div className="space-y-3">
          <PreviewCaption text="Web font loaded via @import in <head>. Falls back to system fonts in clients that block remote fonts (Outlook, some corporate filters)." />
          <div className="rounded-lg border border-border bg-card p-4 space-y-2">
            <div className="text-[10px] font-mono text-muted-foreground">
              font-family: '{fontName}', system-ui, sans-serif
            </div>
            <div
              className="text-2xl font-bold tracking-tight"
              style={{ fontFamily: `'${fontName}', system-ui, sans-serif` }}
            >
              The quick brown fox jumps over the lazy dog
            </div>
            <div
              className="text-sm text-muted-foreground"
              style={{ fontFamily: `'${fontName}', system-ui, sans-serif` }}
            >
              Sample paragraph rendered in the loaded font. 0123456789
            </div>
          </div>
        </div>
      )
    }

    case 'mc-attributes':
    case 'mc-all':
      return (
        <div className="space-y-3">
          <PreviewCaption
            text={
              spec.type === 'mc-all'
                ? 'Defaults applied to every element in the document — set once at the top, override per-instance later.'
                : 'Per-component-type defaults — every <mc-text>, <mc-button> etc. inherits these unless overridden.'
            }
          />
          <DefaultsMock />
        </div>
      )

    case 'mc-class':
      return (
        <div className="space-y-3">
          <PreviewCaption text={'Reusable named bundle of attributes — apply with class="name" on any matching element to inherit the defined attributes.'} />
          <ClassDefinitionMock />
        </div>
      )

    case 'mc-head':
      return (
        <div className="space-y-3">
          <PreviewCaption text="Container for document metadata — title, preview text, fonts, custom styles, default attributes. Contributes to <head> in compiled HTML." />
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            {[
              { name: 'mc-title', desc: 'browser tab + subject hint' },
              { name: 'mc-preview', desc: 'inbox preview text' },
              { name: 'mc-font', desc: 'load web fonts' },
              { name: 'mc-style', desc: 'custom CSS' },
              { name: 'mc-attributes', desc: 'per-type defaults' },
              { name: 'mc-all', desc: 'global defaults' },
              { name: 'mc-class', desc: 'reusable bundles' },
            ].map((c) => (
              <div key={c.name} className="px-2.5 py-1.5 bg-surface border border-border rounded">
                <div className="text-foreground">{c.name}</div>
                <div className="text-[10px] text-muted-foreground">{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )

    default:
      return (
        <div className="text-xs text-muted-foreground italic p-4">
          No specialised preview for this head component yet — see Compiled HTML.
        </div>
      )
  }
}

function PreviewCaption({ text }: { text: string }): JSX.Element {
  return (
    <p className="text-[11px] leading-relaxed text-muted-foreground">{text}</p>
  )
}

function BrowserTabMock({ title }: { title: string }): JSX.Element {
  return (
    <div className="rounded-lg border border-border overflow-hidden bg-[#1f1f23]">
      <div className="flex items-center gap-2 px-3 pt-3">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        </div>
      </div>
      <div className="flex items-end gap-1 px-3 pt-2">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#3a3a3f] rounded-t-md max-w-[260px]">
          <div className="w-3 h-3 rounded-sm bg-[var(--accent)]" />
          <span className="text-[11px] text-white truncate">{title}</span>
          <span className="text-white/60 text-[11px] ml-1">×</span>
        </div>
      </div>
      <div className="h-1 bg-[#3a3a3f]" />
    </div>
  )
}

function InboxRowMock({
  subject,
  preview,
  highlightPreview = false,
}: {
  subject: string
  preview: string
  highlightPreview?: boolean
}): JSX.Element {
  return (
    <div className="rounded-lg border border-border overflow-hidden bg-white">
      <div className="px-3 py-2 border-b border-zinc-200 bg-zinc-50 text-[10px] uppercase tracking-wider text-zinc-500 font-mono">
        Inbox · 1 unread
      </div>
      <div className="flex items-center gap-3 px-3 py-3 hover:bg-zinc-50 transition-colors">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0" style={{ background: '#ea4335' }}>
          A
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-zinc-900">Acme Co.</span>
            <span className="text-[11px] text-zinc-500 ml-auto">12:34 PM</span>
          </div>
          <div className="text-[13px] truncate">
            <span className="text-zinc-900 font-medium">{subject}</span>
            {preview && (
              <>
                <span className="text-zinc-400 mx-1.5">—</span>
                <span
                  className={cn(
                    'text-zinc-500',
                    highlightPreview && 'bg-amber-100 text-zinc-900 px-1 rounded'
                  )}
                >
                  {preview}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function DefaultsMock(): JSX.Element {
  return (
    <div className="rounded-lg border border-border bg-card p-3 font-mono text-[11px] space-y-2">
      <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Applied defaults</div>
      {[
        { tag: '<mc-text>', attrs: 'color="#1f2937" font-size="14px" line-height="1.6"' },
        { tag: '<mc-button>', attrs: 'background-color="#4f46e5" color="#fff" border-radius="6px"' },
        { tag: '<mc-section>', attrs: 'padding="32px 24px" background-color="#fff"' },
      ].map((row) => (
        <div key={row.tag} className="flex items-baseline gap-2">
          <code className="text-foreground shrink-0">{row.tag}</code>
          <span className="text-muted-foreground shrink-0">←</span>
          <span className="text-[var(--hue-mint)] truncate">{row.attrs}</span>
        </div>
      ))}
    </div>
  )
}

function ClassDefinitionMock(): JSX.Element {
  return (
    <div className="rounded-lg border border-border bg-card p-3 font-mono text-[11px] space-y-3">
      <div>
        <div className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">Definition (in head)</div>
        <code className="text-foreground">{'<mc-class name="cta" background-color="#4f46e5" color="#fff" border-radius="8px" />'}</code>
      </div>
      <div>
        <div className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">Used in body</div>
        <code className="text-foreground">{'<mc-button '}<span className="text-[var(--hue-mint)]">{'class'}</span>=<span className="text-[var(--hue-peach)]">{'"cta"'}</span>{'>Get started</mc-button>'}</code>
      </div>
    </div>
  )
}

// `Eye` icon import isn't used elsewhere; keep here so it's tree-shakeable
void Eye
