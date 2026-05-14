'use client'

/**
 * <ComponentDemo type="mc-button" />
 *
 * Inline live demo for any built-in or registered mailc component.
 * Resolves the component spec via introspect, synthesises a minimal
 * valid source (with parent wrappers + sample children), compiles in
 * the browser, and renders source markup + a preview iframe side by
 * side.
 *
 * Used in MDX docs pages — registered in mdx-components.tsx so any
 * page can drop one in:
 *
 *     <ComponentDemo type="mc-button" />
 */

import { useMemo, useState, type JSX } from 'react'
// Use the browser bundle — sidesteps the js-beautify AMD shim that webpack
// can't statically resolve (js-beautify is only used by the prettifier path).
import { compile, introspect } from 'mailc/browser'

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
  requiredAttributes: AttributeSpec[]
  optionalAttributes: AttributeSpec[]
}

// ── Wrapper synthesis (mirrors playground/OutputExplorer) ─────────────────
const CONTENT_WRAP = {
  open: '<mc><mc-body><mc-section><mc-column>',
  close: '</mc-column></mc-section></mc-body></mc>',
}
const HEAD_WRAP = { open: '<mc><mc-head>', close: '</mc-head></mc>' }
const CONTAINER_WRAP: Record<string, { open: string; close: string }> = {
  mc: { open: '', close: '' },
  'mc-body': { open: '<mc>', close: '</mc>' },
  'mc-section': { open: '<mc><mc-body>', close: '</mc-body></mc>' },
  'mc-column': { open: '<mc><mc-body><mc-section>', close: '</mc-section></mc-body></mc>' },
  'mc-group': { open: '<mc><mc-body><mc-section>', close: '</mc-section></mc-body></mc>' },
  'mc-hero': { open: '<mc><mc-body>', close: '</mc-body></mc>' },
}

function buildWrappers(
  type: string,
  components: Map<string, ComponentSpec>,
): { open: string; close: string } {
  if (type === 'mc') return CONTAINER_WRAP['mc']
  const chain: string[] = []
  let current = type
  for (let i = 0; i < 8; i++) {
    const spec = components.get(current)
    if (!spec || !spec.allowedParents?.length) break
    const parent = spec.allowedParents[0]
    if (parent === current) break
    chain.unshift(parent)
    current = parent
  }
  if (chain.length && chain[0] !== 'mc') chain.unshift('mc')
  if (chain.includes('mc-body') || chain.includes('mc-head')) {
    return {
      open: chain.map((t) => `<${t}>`).join(''),
      close: chain.map((t) => `</${t}>`).reverse().join(''),
    }
  }
  const cat = components.get(type)?.category
  if (cat === 'head') return HEAD_WRAP
  if (cat === 'container') return CONTAINER_WRAP[type] ?? CONTENT_WRAP
  return CONTENT_WRAP
}

// ── Per-component attribute overrides for working previews ────────────────
const ATTR_OVERRIDES: Record<string, Record<string, string>> = {
  'mc-image': {
    src: 'https://placehold.co/600x280/8b5cf6/ffffff?text=Sample+Image&font=inter',
    alt: 'Sample image',
    width: '600',
  },
  'mc-button': { href: 'https://example.com' },
  'mc-each': { items: 'products', as: 'product' },
  'mc-for-each': { collection: 'items', as: 'item' },
  'mc-if': { condition: 'isActive' },
  'mc-else-if': { condition: 'isActive' },
}

const SAMPLE_DATA = {
  items: ['First item', 'Second item', 'Third item'],
  products: [
    { name: 'Studio Lamp', formattedPrice: '$49.00' },
    { name: 'Walnut Desk', formattedPrice: '$299.00' },
  ],
  isActive: true,
}

function escapeAttr(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function sampleText(type: string): string {
  switch (type) {
    case 'mc-text':
      return 'The quick brown fox jumps over the lazy dog.'
    case 'mc-button':
      return 'Get started'
    case 'mc-list-item':
      return 'List item'
    case 'mc-title':
      return 'Welcome to Acme'
    case 'mc-preview':
      return 'Preview text shown in inbox'
    case 'mc-raw':
      return '<p style="color:#4f46e5">Raw HTML content</p>'
    default:
      return 'Sample content'
  }
}

function sampleChildren(type: string): string {
  switch (type) {
    case 'mc':
      return '<mc-body><mc-section><mc-column><mc-text>Sample text</mc-text></mc-column></mc-section></mc-body>'
    case 'mc-body':
      return '<mc-section><mc-column><mc-text>Sample text</mc-text></mc-column></mc-section>'
    case 'mc-section':
      return '<mc-column><mc-text>Sample text</mc-text></mc-column>'
    case 'mc-column':
    case 'mc-group':
      return '<mc-text>Sample text</mc-text>'
    case 'mc-hero':
      return '<mc-text>Hero headline</mc-text>'
    case 'mc-head':
      return '<mc-title>Welcome to Acme</mc-title>'
    case 'mc-if':
    case 'mc-else-if':
      return '<mc-text>Visible when condition is true</mc-text>'
    case 'mc-else':
      return '<mc-text>Otherwise this shows</mc-text>'
    case 'mc-each':
      return '<mc-text>{{product.name}} — {{product.formattedPrice}}</mc-text>'
    case 'mc-for-each':
      return '<mc-text>{{item}}</mc-text>'
    case 'mc-list':
      return '<mc-list-item>First item</mc-list-item><mc-list-item>Second item</mc-list-item>'
    case 'mc-table':
      return '<tr><th align="left" style="padding:8px;border-bottom:1px solid #e5e7eb">Name</th><th align="left" style="padding:8px;border-bottom:1px solid #e5e7eb">Price</th></tr><tr><td style="padding:8px">Studio Lamp</td><td style="padding:8px">$49.00</td></tr>'
    default:
      return ''
  }
}

function buildNodeMarkup(spec: ComponentSpec): string {
  const attrs: string[] = []
  const allAttrs = [
    ...(spec.requiredAttributes ?? []),
    ...(spec.optionalAttributes ?? []),
  ]
  const builtIn = ATTR_OVERRIDES[spec.type] ?? {}
  for (const a of allAttrs) {
    if (a.required) {
      const v = builtIn[a.name] ?? a.example ?? a.default ?? 'value'
      attrs.push(`${a.name}="${escapeAttr(v)}"`)
    } else if (builtIn[a.name]) {
      attrs.push(`${a.name}="${escapeAttr(builtIn[a.name])}"`)
    }
  }
  const attrStr = attrs.length ? ' ' + attrs.join(' ') : ''
  const inner = spec.allowsTextContent ? sampleText(spec.type) : sampleChildren(spec.type)
  if (inner) return `<${spec.type}${attrStr}>${inner}</${spec.type}>`
  return `<${spec.type}${attrStr} />`
}

// ─── Component ────────────────────────────────────────────────────────────
export function ComponentDemo({
  type,
  showSource = true,
  height = 320,
}: {
  type: string
  showSource?: boolean
  height?: number
}): JSX.Element {
  const [tab, setTab] = useState<'preview' | 'html'>('preview')

  const result = useMemo(() => {
    const all = introspect.all() as ComponentSpec[]
    const map = new Map<string, ComponentSpec>(all.map((c) => [c.type, c]))
    const spec = map.get(type)
    if (!spec) {
      return {
        spec: null,
        source: '',
        html: '',
        errors: [{ code: 'UNKNOWN_COMPONENT', message: `No spec for "${type}"` }],
      }
    }
    try {
      const { open, close } = buildWrappers(spec.type, map)
      const node = buildNodeMarkup(spec)
      const source = `${open}${node}${close}`
      const r = compile(source, {
        sourceMap: false,
        data: SAMPLE_DATA,
      })
      return {
        spec,
        source,
        html: r.html ?? '',
        errors: r.errors ?? [],
      }
    } catch (err) {
      return {
        spec,
        source: '',
        html: '',
        errors: [
          {
            code: 'COMPILE_FAILED',
            message: err instanceof Error ? err.message : String(err),
          },
        ],
      }
    }
  }, [type])

  if (!result.spec) {
    return (
      <div className="my-4 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-700 dark:text-red-300">
        <code className="font-mono font-semibold">UNKNOWN_COMPONENT</code>: no
        registered component called <code>{type}</code>
      </div>
    )
  }

  return (
    <div className="my-6 not-prose rounded-lg border border-fd-border overflow-hidden bg-fd-card">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-fd-border bg-fd-muted text-[11px] font-mono">
        <span className="text-fd-foreground font-semibold">{result.spec.type}</span>
        <span className="text-fd-muted-foreground">·</span>
        <span className="text-fd-muted-foreground">{result.spec.category}</span>
        <span className="ml-auto text-fd-muted-foreground">live demo</span>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-fd-border">
        <button
          onClick={() => setTab('preview')}
          className={
            'px-2 py-1 text-[11px] font-medium rounded transition-colors ' +
            (tab === 'preview'
              ? 'bg-fd-secondary text-fd-foreground'
              : 'text-fd-muted-foreground hover:text-fd-foreground')
          }
        >
          Preview
        </button>
        <button
          onClick={() => setTab('html')}
          className={
            'px-2 py-1 text-[11px] font-medium rounded transition-colors ' +
            (tab === 'html'
              ? 'bg-fd-secondary text-fd-foreground'
              : 'text-fd-muted-foreground hover:text-fd-foreground')
          }
        >
          Compiled HTML
        </button>
        {showSource && (
          <span className="ml-auto text-[10px] font-mono text-fd-muted-foreground">
            source ↓
          </span>
        )}
      </div>

      {/* Tab content */}
      {tab === 'preview' &&
        (result.html ? (
          <iframe
            title={`${type}-preview`}
            srcDoc={result.html}
            style={{ width: '100%', height, border: 0, background: '#fff' }}
          />
        ) : (
          <div className="p-3 text-xs text-fd-muted-foreground italic">
            No HTML output — see Compiled HTML tab.
          </div>
        ))}

      {tab === 'html' && (
        <pre
          className="text-[11px] leading-relaxed font-mono p-3 overflow-auto"
          style={{ maxHeight: height, margin: 0 }}
        >
          <code>{result.html || '(no output)'}</code>
        </pre>
      )}

      {/* Source markup */}
      {showSource && (
        <div className="border-t border-fd-border bg-fd-muted/50">
          <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-fd-muted-foreground">
            Source
          </div>
          <pre
            className="text-[11px] leading-relaxed font-mono px-3 pb-3 overflow-auto"
            style={{ margin: 0 }}
          >
            <code>{result.source}</code>
          </pre>
        </div>
      )}

      {/* Errors */}
      {result.errors.length > 0 && (
        <div className="border-t border-fd-border">
          {result.errors.map((e, i) => (
            <div
              key={i}
              className="px-3 py-2 text-[11px] text-red-700 dark:text-red-300 bg-red-500/5"
            >
              <span className="font-mono font-semibold">{e.code}</span>: {e.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
