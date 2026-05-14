/**
 * gen-component-pages.ts
 *
 * Reads the live mailc component registry via introspect.all() and emits
 * one MDX reference page per `<mc-*>` component into
 * content/docs/components/<type>.mdx.
 *
 * Run: pnpm gen:components
 *
 * Re-run whenever the introspect surface changes (new component, new attr,
 * etc.). Output is committed to git.
 */

import { introspect } from 'mailc'
import { writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

interface AttributeSpec {
  name: string
  type: string
  required: boolean
  default?: string
  example?: string
  values?: string[]
  description?: string
  hasEmailCompatibilityNotes?: boolean
  isCssPropAttr?: boolean
  classHint?: string
}

interface ComponentSpec {
  type: string
  category?: string
  description?: string
  allowedParents: string[]
  allowedChildren: string[] | string
  allowsTextContent?: boolean
  acceptsClassAttribute?: boolean
  validClassCategories?: string[]
  requiredAttributes: AttributeSpec[]
  optionalAttributes: AttributeSpec[]
  cssPropertyAttributes?: AttributeSpec[]
  compilesTo?: {
    outputElements: string[]
    reason: string
  }
  example?: { markup: string }
  commonMistakes?: string[]
}

const OUT_DIR = join(__dirname, '..', 'content', 'docs', 'components')

function mdSafeDescription(s: string | undefined): string {
  if (!s) return ''
  // YAML-safe: wrap in double quotes and escape internal double quotes.
  return '"' + s.replace(/"/g, '\\"').replace(/\n/g, ' ') + '"'
}

/**
 * Escape inline HTML/JSX tag references so MDX doesn't parse them as JSX.
 * `<ul>` becomes `` `<ul>` ``, `<mc-button>` becomes `` `<mc-button>` ``.
 * Already-backticked tags are left alone.
 */
function escapeTags(s: string): string {
  // Wrap any <word> or <word-word> sequence in backticks if not already inside them.
  return s.replace(/(?<!`)<([a-zA-Z][a-zA-Z0-9-]*)>(?!`)/g, '`<$1>`')
}

function inlineCode(s: string): string {
  return '`' + s + '`'
}

function joinList(items: string[] | string | undefined): string {
  if (!items) return '_(none)_'
  if (items === '*') return '_any_'
  if (Array.isArray(items)) {
    if (items.length === 0) return '_(none)_'
    return items.map(inlineCode).join(', ')
  }
  return inlineCode(String(items))
}

function attributeTable(rows: AttributeSpec[]): string {
  if (rows.length === 0) return '_(none)_\n'
  const lines: string[] = []
  lines.push('| Attribute | Type | Default | Example | Description |')
  lines.push('|---|---|---|---|---|')
  for (const a of rows) {
    const def = a.default ? inlineCode(a.default) : '—'
    const ex = a.example ? inlineCode(a.example) : '—'
    const type = a.values
      ? a.values.map(inlineCode).join(' \\| ')
      : inlineCode(a.type)
    const desc = escapeTags((a.description ?? '').replace(/\|/g, '\\|'))
    lines.push(`| ${inlineCode(a.name)} | ${type} | ${def} | ${ex} | ${desc} |`)
  }
  return lines.join('\n') + '\n'
}

function buildPage(spec: ComponentSpec): string {
  const fm = `---
title: ${spec.type}
description: ${mdSafeDescription(spec.description)}
---`

  const sections: string[] = []

  sections.push(fm)

  // Description prose
  if (spec.description) {
    sections.push(escapeTags(spec.description))
  }

  // Quick facts table
  sections.push(`## Quick facts

| | |
|---|---|
| Category | ${spec.category ? inlineCode(spec.category) : '—'} |
| Allowed parents | ${joinList(spec.allowedParents)} |
| Allowed children | ${joinList(spec.allowedChildren)} |
| Accepts text content | ${spec.allowsTextContent ? 'yes' : 'no'} |
| Accepts \`class\` attribute | ${spec.acceptsClassAttribute ? 'yes' : 'no'} |
${spec.compilesTo ? `| Compiles to | ${spec.compilesTo.outputElements.map((t) => inlineCode('<' + t + '>')).join(', ')} |` : ''}`)

  // Required attributes
  sections.push(`## Required attributes

${attributeTable(spec.requiredAttributes ?? [])}`)

  // Optional attributes — show only first 20 to keep page scanable; link to introspect for full
  const opt = spec.optionalAttributes ?? []
  if (opt.length > 0) {
    sections.push(`## Optional attributes

${attributeTable(opt)}`)
  }

  // Compiles to (full reason)
  if (spec.compilesTo?.reason) {
    sections.push(`## Compiles to

Output elements: ${spec.compilesTo.outputElements.map((t) => inlineCode('<' + t + '>')).join(', ')}.

${escapeTags(spec.compilesTo.reason)}`)
  }

  // Example
  if (spec.example?.markup) {
    sections.push(`## Example markup

\`\`\`html
${spec.example.markup.trim()}
\`\`\``)
  }

  // Programmatic schema link
  sections.push(`## Programmatic access

\`\`\`ts
import { introspect } from 'mailc'

const spec = introspect.component('${spec.type}')
\`\`\`

See [\`introspect.component(type)\`](/docs/api/introspect#introspect-component) for the full \`ComponentSpec\` shape.`)

  return sections.join('\n\n').trim() + '\n'
}

// ─── Main ──────────────────────────────────────────────────────────────────
function main(): void {
  if (!existsSync(OUT_DIR)) {
    mkdirSync(OUT_DIR, { recursive: true })
  }

  // Wipe existing per-component pages so deletions in the registry are
  // reflected on next run. Preserve index.mdx + meta.json + categories/.
  for (const f of readdirSync(OUT_DIR)) {
    if (f.startsWith('mc') && f.endsWith('.mdx')) {
      unlinkSync(join(OUT_DIR, f))
    }
  }

  const specs = (introspect.all() as ComponentSpec[]).slice()

  // Sort by category, then alphabetically
  const order = ['container', 'content', 'head', 'logic']
  specs.sort((a, b) => {
    const ai = order.indexOf(a.category ?? '')
    const bi = order.indexOf(b.category ?? '')
    if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    return a.type.localeCompare(b.type)
  })

  const written: string[] = []
  for (const spec of specs) {
    const file = join(OUT_DIR, `${spec.type}.mdx`)
    writeFileSync(file, buildPage(spec), 'utf8')
    written.push(spec.type)
  }

  // Update meta.json with the full ordered page list
  const meta = {
    title: 'Components',
    defaultOpen: true,
    pages: ['index', ...written],
  }
  writeFileSync(join(OUT_DIR, 'meta.json'), JSON.stringify(meta, null, 2) + '\n', 'utf8')

  console.log(`Generated ${written.length} component pages → content/docs/components/`)
  console.log(written.map((t) => '  · ' + t).join('\n'))
}

main()
