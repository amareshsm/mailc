/**
 * Glow Mark design system — beauty / cosmetics components.
 *
 * Soft palette product launches, shade swatches, and tutorial cards
 * for makeup and skincare brands.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mailc: any = await import('mailc/browser')
const defineComponent = mailc.defineComponent ?? mailc.default?.defineComponent
// Plugin-author utilities re-exported from mailc.
const { escapeHtml, themeColor, warnCss } = mailc

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const GLOW_PLUGINS: any[] = []
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function defineLocal(spec: any): any {
  const plugin = defineComponent(spec)
  GLOW_PLUGINS.push(plugin)
  return plugin
}

const GLOW = {
  brand: '#be185d',
  brandSoft: '#fce7f3',
  blush: '#fdf2f8',
  ink: '#3f0d2c',
  mute: '#9d174d',
  border: '#fbcfe8',
  paper: '#ffffff',
  white: '#ffffff',
}

// ---------------------------------------------------------------------------
// glow-collection-hero — soft palette product launch
// ---------------------------------------------------------------------------

defineLocal({
  type: 'glow-collection-hero',
  metadata: {
    description: 'Soft pastel collection launch — image left, text right, CTA below.',
    category: 'container',
    parent: 'mc-body',
    maxChildren: 0,
    allowsTextContent: false,
    compilerOutputElements: ['table', 'tr', 'td'],
    compilerOutputReason: 'Two-column hero with product image and copy stack.',
    validClassCategories: [],
    commonMistakes: [],
    attributes: {
      'image-url':  { type: 'url',    required: true,  description: 'Product / collection image.', example: 'https://...', hasEmailCompatibilityNotes: false },
      'eyebrow':    { type: 'string', required: false, description: 'Small label.', example: 'New Collection', hasEmailCompatibilityNotes: false },
      'title':      { type: 'string', required: true,  description: 'Headline.', example: 'Petal Velvet Lipstick', hasEmailCompatibilityNotes: false },
      'subtitle':   { type: 'string', required: false, description: 'Subhead.', example: '12 shades, blurring finish, all-day wear.', hasEmailCompatibilityNotes: false },
      'cta-label':  { type: 'string', required: true,  description: 'CTA text.', example: 'Shop the collection', hasEmailCompatibilityNotes: false },
      'cta-href':   { type: 'url',    required: true,  description: 'CTA URL.', example: 'https://example.com/lipstick', hasEmailCompatibilityNotes: false },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  compile: (node: any, context: any) => {
    const a = node.attributes
    const image = escapeHtml(a['image-url'] ?? '')
    const eyebrow = a['eyebrow'] ? escapeHtml(a['eyebrow']) : ''
    const title = escapeHtml(a['title'] ?? '')
    const subtitle = a['subtitle'] ? escapeHtml(a['subtitle']) : ''
    const ctaLabel = escapeHtml(a['cta-label'] ?? '')
    const ctaHref = escapeHtml(a['cta-href'] ?? '#')
    const brand = themeColor(context, 'brand', GLOW.brand)
    const ink   = themeColor(context, 'ink',   GLOW.ink)
    const mute  = themeColor(context, 'mute',  GLOW.mute)
    const white = themeColor(context, 'white', GLOW.white)
    warnCss(context, 'border-radius', '16px', node)

    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${GLOW.blush};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:${GLOW.paper};border-radius:16px;">
      <tr>
        <td valign="middle" width="50%" style="padding:0;"><img src="${image}" alt="${title}" width="300" style="display:block;width:100%;max-width:300px;height:auto;border-radius:16px 0 0 16px;border:0;" /></td>
        <td valign="middle" width="50%" style="padding:32px 28px;font-family:Georgia,'Times New Roman',serif;">
          ${eyebrow ? `<p style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:11px;font-weight:600;color:${brand};text-transform:uppercase;letter-spacing:0.12em;">${eyebrow}</p>` : ''}
          <h1 style="margin:0;font-size:26px;line-height:1.2;font-weight:400;color:${ink};">${title}</h1>
          ${subtitle ? `<p style="margin:14px 0 0;font-family:Arial,sans-serif;font-size:14px;line-height:22px;color:${mute};">${subtitle}</p>` : ''}
          <div style="height:20px;line-height:20px;font-size:0;">&nbsp;</div>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="border-radius:999px;background-color:${brand};">
            <a href="${ctaHref}" style="display:inline-block;font-family:Arial,sans-serif;font-size:13px;font-weight:600;text-decoration:none;color:${white};padding:11px 22px;border-radius:999px;letter-spacing:0.04em;">${ctaLabel}</a>
          </td></tr></table>
        </td>
      </tr>
    </table>
  </td></tr>
</table>`
  },
})

// ---------------------------------------------------------------------------
// glow-shade-grid — color swatch grid (lipsticks, eyeshadows, etc.)
// ---------------------------------------------------------------------------

defineLocal({
  type: 'glow-shade-grid',
  metadata: {
    description: 'Color swatch grid — clickable shade circles with names.',
    category: 'container',
    parent: 'mc-body',
    maxChildren: 0,
    allowsTextContent: false,
    compilerOutputElements: ['table', 'tr', 'td'],
    compilerOutputReason: 'Multi-row table of swatch circles labelled with shade name.',
    validClassCategories: [],
    commonMistakes: [],
    attributes: {
      'title':  { type: 'string', required: true,  description: 'Section heading.', example: 'Shop your shade', hasEmailCompatibilityNotes: false },
      'shades': { type: 'string', required: true,  description: 'Pipe-separated swatches: name::hex::href', example: 'Petal::#f9a8d4::https://...|Rose::#ec4899::https://...|Plum::#831843::https://...', hasEmailCompatibilityNotes: false },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  compile: (node: any, _context: any) => {
    const a = node.attributes
    const title = escapeHtml(a['title'] ?? '')
    const shades = ((a['shades'] ?? '') as string).split('|').map((line) => {
      const [name, hex, href] = line.split('::')
      return { name: (name ?? '').trim(), hex: (hex ?? '').trim(), href: (href ?? '#').trim() }
    }).filter((s) => s.name)

    const cellsPerRow = 4
    const rows: typeof shades[] = []
    for (let i = 0; i < shades.length; i += cellsPerRow) rows.push(shades.slice(i, i + cellsPerRow))

    const swatch = (s: typeof shades[number]) => `<td valign="top" align="center" width="${Math.floor(100 / cellsPerRow)}%" style="padding:12px 8px;">
  <a href="${escapeHtml(s.href)}" style="text-decoration:none;display:inline-block;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td align="center" valign="middle" width="60" height="60" style="background-color:${escapeHtml(s.hex)};border-radius:30px;border:2px solid ${GLOW.paper};box-shadow:0 0 0 1px ${GLOW.border};">&nbsp;</td>
    </tr></table>
    <p style="margin:10px 0 0;font-family:Arial,sans-serif;font-size:12px;font-weight:600;color:${GLOW.ink};">${escapeHtml(s.name)}</p>
  </a>
</td>`

    const trs = rows.map((row) => `<tr>${row.map(swatch).join('')}${'<td></td>'.repeat(cellsPerRow - row.length)}</tr>`).join('')

    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${GLOW.paper};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:${GLOW.blush};border-radius:16px;">
      <tr><td style="padding:28px 24px 8px;font-family:Georgia,serif;text-align:center;">
        <h2 style="margin:0;font-size:22px;font-weight:400;color:${GLOW.ink};">${title}</h2>
      </td></tr>
      <tr><td style="padding:8px 16px 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${trs}</table>
      </td></tr>
    </table>
  </td></tr>
</table>`
  },
})

// ---------------------------------------------------------------------------
// glow-tutorial-card — image + numbered step list
// ---------------------------------------------------------------------------

defineLocal({
  type: 'glow-tutorial-card',
  metadata: {
    description: 'Tutorial / how-to card with image header and numbered steps.',
    category: 'container',
    parent: 'mc-body',
    maxChildren: 0,
    allowsTextContent: false,
    compilerOutputElements: ['table', 'tr', 'td'],
    compilerOutputReason: 'Card with image and ordered step list.',
    validClassCategories: [],
    commonMistakes: [],
    attributes: {
      'image-url':  { type: 'url',    required: true,  description: 'Tutorial header image.', example: 'https://...', hasEmailCompatibilityNotes: false },
      'title':      { type: 'string', required: true,  description: 'Tutorial title.', example: 'Master the soft glam look', hasEmailCompatibilityNotes: false },
      'subtitle':   { type: 'string', required: false, description: 'Subtitle.', example: 'In 4 simple steps.', hasEmailCompatibilityNotes: false },
      'steps':      { type: 'string', required: true,  description: 'Pipe-separated steps.', example: 'Prime your lids|Sweep on a warm shadow|Line and smudge|Finish with mascara', hasEmailCompatibilityNotes: false },
      'cta-label':  { type: 'string', required: false, description: 'CTA text.', example: 'Watch the full video', hasEmailCompatibilityNotes: false },
      'cta-href':   { type: 'url',    required: false, description: 'CTA URL.', example: 'https://example.com/tutorial', hasEmailCompatibilityNotes: false },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  compile: (node: any, _context: any) => {
    const a = node.attributes
    const image = escapeHtml(a['image-url'] ?? '')
    const title = escapeHtml(a['title'] ?? '')
    const subtitle = a['subtitle'] ? escapeHtml(a['subtitle']) : ''
    const steps = ((a['steps'] ?? '') as string).split('|').map((s) => s.trim()).filter(Boolean)
    const ctaLabel = a['cta-label'] ? escapeHtml(a['cta-label']) : ''
    const ctaHref = a['cta-href'] ? escapeHtml(a['cta-href']) : ''

    const stepRows = steps.map((step, i) => `<tr>
  <td valign="top" width="40" style="padding:8px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td align="center" valign="middle" width="28" height="28" style="background-color:${GLOW.brand};border-radius:14px;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:${GLOW.white};line-height:28px;">${i + 1}</td>
    </tr></table>
  </td>
  <td valign="middle" style="padding:12px 0;font-family:Arial,sans-serif;font-size:15px;line-height:22px;color:${GLOW.ink};">${escapeHtml(step)}</td>
</tr>`).join('')

    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${GLOW.blush};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:${GLOW.paper};border-radius:16px;">
      <tr><td style="padding:0;"><img src="${image}" alt="${title}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border-radius:16px 16px 0 0;border:0;" /></td></tr>
      <tr><td style="padding:28px 32px 8px;font-family:Georgia,serif;">
        <h2 style="margin:0;font-size:24px;font-weight:400;color:${GLOW.ink};">${title}</h2>
        ${subtitle ? `<p style="margin:8px 0 0;font-family:Arial,sans-serif;font-size:14px;color:${GLOW.mute};">${subtitle}</p>` : ''}
      </td></tr>
      <tr><td style="padding:16px 32px 8px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${stepRows}</table>
      </td></tr>
      ${ctaLabel ? `<tr><td style="padding:16px 32px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="border-radius:999px;background-color:${GLOW.brand};">
          <a href="${ctaHref}" style="display:inline-block;font-family:Arial,sans-serif;font-size:13px;font-weight:600;text-decoration:none;color:${GLOW.white};padding:11px 22px;border-radius:999px;">${ctaLabel} &rarr;</a>
        </td></tr></table>
      </td></tr>` : ''}
    </table>
  </td></tr>
</table>`
  },
})

// ---------------------------------------------------------------------------
// Marketplace metadata
// ---------------------------------------------------------------------------

import type { BrandComponentSpec } from './brands'

export const GLOW_DESIGN_SYSTEM = {
  id: 'glow-mark',
  name: 'Glow Mark',
  version: '0.5.0',
  publisher: '@glowmark/email-components',
  category: 'beauty' as const,
  description:
    'Soft-palette beauty components: collection launches, shade swatch grids, and tutorial cards for cosmetics and skincare brands.',
  brandColor: '#be185d',
}

export const GLOW_COMPONENTS: BrandComponentSpec[] = [
  {
    type: 'glow-collection-hero',
    label: 'Collection Hero',
    tagline: 'Soft pastel hero with image and CTA pill.',
    example: `<glow-collection-hero
  image-url="https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&q=80"
  eyebrow="New Collection"
  title="Petal Velvet Lipstick"
  subtitle="12 shades, blurring finish, all-day wear."
  cta-label="Shop the collection"
  cta-href="https://example.com/lipstick" />`,
  },
  {
    type: 'glow-shade-grid',
    label: 'Shade Grid',
    tagline: 'Clickable color swatch grid for cosmetics.',
    example: `<glow-shade-grid
  title="Shop your shade"
  shades="Petal::#f9a8d4::https://example.com/petal|Rose::#ec4899::https://example.com/rose|Plum::#831843::https://example.com/plum|Berry::#9f1239::https://example.com/berry|Mauve::#a78bfa::https://example.com/mauve|Coral::#fb7185::https://example.com/coral|Spice::#dc2626::https://example.com/spice|Nude::#fcd34d::https://example.com/nude" />`,
  },
  {
    type: 'glow-tutorial-card',
    label: 'Tutorial Card',
    tagline: 'How-to card with image and numbered steps.',
    example: `<glow-tutorial-card
  image-url="https://images.unsplash.com/photo-1522335789203-aaa749b9aef0?w=1200&q=80"
  title="Master the soft glam look"
  subtitle="In 4 simple steps."
  steps="Prime your lids with our long-wear base|Sweep on a warm shimmer shadow|Line and smudge with kohl pencil|Finish with two coats of volumizing mascara"
  cta-label="Watch the full video"
  cta-href="https://example.com/tutorial" />`,
  },
]
