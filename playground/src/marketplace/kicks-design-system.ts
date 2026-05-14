/**
 * Kicks & Co. design system — sneaker / shoe brand component library.
 *
 * Demonstrates a second branded plugin marketplace alongside @acme. Each
 * component registers with mailc via `defineComponent()` and emits
 * email-safe HTML matching the visual designs from the brand guidelines.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mailc: any = await import('mailc/browser')
const defineComponent = mailc.defineComponent ?? mailc.default?.defineComponent
// Plugin-author utilities re-exported from mailc.
const { escapeHtml, themeColor, warnCss } = mailc

// ---------------------------------------------------------------------------
// Brand tokens
// ---------------------------------------------------------------------------

const KICKS = {
  /** Primary brand orange — used for CTAs and accents. */
  brand: '#D34A36',
  ink: '#030712',
  paper: '#f1f5f9',
  white: '#fffffe',
  /** Default sneaker hero image — any photo works since we apply a dark scrim. */
  asset: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&q=80',
  /** Dark scrim color (Outlook-safe solid fallback). */
  scrim: '#0f0f0f',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// kicks-product-hero — full-bleed photo hero with dark scrim for product launches.
// Background image with VML fallback for Outlook, brand logo, eyebrow,
// two-tone heading (bold prefix + light suffix), subtitle, body, and CTA.
// ---------------------------------------------------------------------------

defineComponent({
  type: 'kicks-product-hero',
  metadata: {
    description: 'Product launch hero with background image, eyebrow, two-tone heading, body, and CTA.',
    category: 'container',
    parent: 'mc-body',
    maxChildren: 0,
    allowsTextContent: false,
    compilerOutputElements: ['table', 'tr', 'td'],
    compilerOutputReason: 'Three-column gutter table with VML background image fallback for Outlook.',
    validClassCategories: [],
    commonMistakes: [],
    attributes: {
      'image-url':    { type: 'url',    required: false, description: 'Hero image — rendered as a real <img>, no background-image.', example: KICKS.asset, default: KICKS.asset, hasEmailCompatibilityNotes: false },
      'eyebrow':      { type: 'string', required: false, description: 'Small label above the heading.', example: 'New Drop', hasEmailCompatibilityNotes: false },
      'title-bold':   { type: 'string', required: true,  description: 'First word of the heading (bold).', example: 'Trailburst', hasEmailCompatibilityNotes: false },
      'title-rest':   { type: 'string', required: false, description: 'Remainder of the heading (light).', example: 'Pro Runner', hasEmailCompatibilityNotes: false },
      'subtitle':     { type: 'string', required: false, description: 'Subtitle below the heading.', example: 'Built for every terrain.', hasEmailCompatibilityNotes: false },
      'body':         { type: 'string', required: false, description: 'Long-form description.', example: 'A featherweight knit upper meets a carbon-plate midsole…', hasEmailCompatibilityNotes: false },
      'cta-label':    { type: 'string', required: true,  description: 'CTA button text.', example: 'Shop the drop', hasEmailCompatibilityNotes: false },
      'cta-href':     { type: 'url',    required: true,  description: 'CTA destination URL.', example: 'https://example.com', hasEmailCompatibilityNotes: false },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  compile: (node: any, context: any) => {
    const a = node.attributes
    const imageUrl  = a['image-url'] ?? KICKS.asset
    const eyebrow   = a['eyebrow'] ? escapeHtml(a['eyebrow']) : ''
    const titleBold = escapeHtml(a['title-bold'] ?? '')
    const titleRest = a['title-rest'] ? ' ' + escapeHtml(a['title-rest']) : ''
    const subtitle  = a['subtitle'] ? escapeHtml(a['subtitle']) : ''
    const body      = a['body'] ? escapeHtml(a['body']) : ''
    const ctaLabel  = escapeHtml(a['cta-label'] ?? '')
    const ctaHref   = escapeHtml(a['cta-href'] ?? '#')

    // Theme overrides — let users re-skin the brand without forking the plugin.
    const brand = themeColor(context, 'brand', KICKS.brand)
    const paper = themeColor(context, 'paper', KICKS.paper)
    const white = themeColor(context, 'white', KICKS.white)
    warnCss(context, 'border-radius', '8px', node)

    // Layout strategy:
    //   1. Outer cell uses background="..." + style="background-image" + bgcolor (Outlook fallback).
    //   2. VML <v:rect> draws the image as a fill on Outlook, which ignores the CSS background-image.
    //   3. Inner cell paints a translucent dark scrim (rgba) over the image so any photograph
    //      gives readable contrast for white text. Modern clients honor rgba; Outlook gets the
    //      VML fill underneath and the scrim is a solid fallback.
    warnCss(context, 'background-image', `url('${imageUrl}')`, node)

    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${paper};">
  <tr><td align="center" style="padding:0;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">
      <tr>
        <td
          align="center"
          valign="middle"
          background="${imageUrl}"
          bgcolor="${KICKS.scrim}"
          style="background-image:url('${imageUrl}');background-size:cover;background-position:center;background-repeat:no-repeat;background-color:${KICKS.scrim};"
        >
<!--[if mso]>
<v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="t" stroke="f" style="width:600px;height:520px;">
<v:fill type="frame" src="${imageUrl}" color="${KICKS.scrim}" />
<v:textbox inset="0,0,0,0" style="mso-fit-shape-to-text:true">
<![endif]-->
          <!-- Scrim layer — translucent dark over the image for text legibility -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:rgba(15,15,15,0.55);">
            <tr><td align="center" style="padding:80px 32px 64px;font-family:Arial,sans-serif;color:${white};">
              ${eyebrow ? `<p style="margin:0 0 12px;font-size:13px;line-height:18px;font-weight:600;color:${brand};text-transform:uppercase;letter-spacing:0.12em;">${eyebrow}</p>` : ''}
              <h1 style="margin:0;font-size:44px;line-height:1.1;font-weight:300;color:${white};">
                <span style="font-weight:700;">${titleBold}</span>${titleRest}
              </h1>
              ${subtitle ? `<p style="margin:10px 0 0;font-size:17px;line-height:24px;font-weight:500;color:${white};">${subtitle}</p>` : ''}
              ${body ? `<p style="margin:24px auto 0;max-width:440px;font-size:14px;line-height:22px;font-weight:300;color:#e5e7eb;">${body}</p>` : ''}
              <div style="height:28px;line-height:28px;font-size:0;">&nbsp;</div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center" style="border-radius:8px;background-color:${brand};">
                <a href="${ctaHref}" style="display:inline-block;font-family:Arial,sans-serif;font-size:15px;line-height:1;font-weight:600;text-decoration:none;color:${white};padding:14px 26px;border-radius:8px;">${ctaLabel} &rarr;</a>
              </td></tr></table>
            </td></tr>
          </table>
<!--[if mso]>
</v:textbox>
</v:rect>
<![endif]-->
        </td>
      </tr>
    </table>
  </td></tr>
</table>`
  },
})

// ---------------------------------------------------------------------------
// kicks-product-card — small product tile (image, name, colorway, price, CTA)
// ---------------------------------------------------------------------------

defineComponent({
  type: 'kicks-product-card',
  metadata: {
    description: 'Compact product card with image, name, colorway, price, and CTA — for related-products rows.',
    category: 'container',
    parent: 'mc-body',
    maxChildren: 0,
    allowsTextContent: false,
    compilerOutputElements: ['table', 'tr', 'td'],
    compilerOutputReason: 'Centered product card with image and metadata.',
    validClassCategories: [],
    commonMistakes: [],
    attributes: {
      'image-url':  { type: 'url',    required: true,  description: 'Product image URL.', example: 'https://...', hasEmailCompatibilityNotes: false },
      'name':       { type: 'string', required: true,  description: 'Product name.', example: 'Air Force 1', hasEmailCompatibilityNotes: false },
      'colorway':   { type: 'string', required: false, description: 'Colorway / variant.', example: 'Triple White', hasEmailCompatibilityNotes: false },
      'price':      { type: 'string', required: true,  description: 'Price including currency.', example: '$120', hasEmailCompatibilityNotes: false },
      'cta-label':  { type: 'string', required: false, description: 'CTA text.', example: 'Shop now', default: 'Shop now', hasEmailCompatibilityNotes: false },
      'cta-href':   { type: 'url',    required: true,  description: 'Product page URL.', example: 'https://...', hasEmailCompatibilityNotes: false },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  compile: (node: any, context: any) => {
    const a = node.attributes
    const imageUrl  = escapeHtml(a['image-url'] ?? '')
    const name      = escapeHtml(a['name'] ?? '')
    const colorway  = a['colorway'] ? escapeHtml(a['colorway']) : ''
    const price     = escapeHtml(a['price'] ?? '')
    const ctaLabel  = escapeHtml(a['cta-label'] ?? 'Shop now')
    const ctaHref   = escapeHtml(a['cta-href'] ?? '#')

    const brand = themeColor(context, 'brand', KICKS.brand)
    const ink   = themeColor(context, 'ink',   KICKS.ink)
    const paper = themeColor(context, 'paper', KICKS.paper)
    const white = themeColor(context, 'white', KICKS.white)
    warnCss(context, 'border-radius', '12px', node)

    return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:${white};">
  <tr><td align="center" style="padding:24px;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="280" style="max-width:280px;">
      <tr><td align="center" style="background-color:${paper};border-radius:12px;padding:24px;">
        <img src="${imageUrl}" alt="${name}" width="200" style="display:block;max-width:100%;height:auto;border:0;" />
      </td></tr>
      <tr><td align="center" style="padding-top:12px;font-family:Arial,sans-serif;">
        <p style="margin:0;font-size:16px;font-weight:600;color:${ink};line-height:22px;">${name}</p>
        ${colorway ? `<p style="margin:2px 0 0;font-size:13px;color:#475569;line-height:18px;">${colorway}</p>` : ''}
        <p style="margin:8px 0 0;font-size:18px;font-weight:700;color:${ink};line-height:24px;">${price}</p>
      </td></tr>
      <tr><td align="center" style="padding-top:14px;">
        <a href="${ctaHref}" style="display:inline-block;background-color:${brand};color:${white};font-family:Arial,sans-serif;font-size:13px;font-weight:600;text-decoration:none;padding:10px 20px;border-radius:6px;">${ctaLabel}</a>
      </td></tr>
    </table>
  </td></tr>
</table>`
  },
})

// ---------------------------------------------------------------------------
// kicks-size-grid — 4×2 grid of size buttons for size-selector emails
// ---------------------------------------------------------------------------

defineComponent({
  type: 'kicks-size-grid',
  metadata: {
    description: 'Grid of clickable shoe sizes — for size-availability or restock emails.',
    category: 'container',
    parent: 'mc-body',
    maxChildren: 0,
    allowsTextContent: false,
    compilerOutputElements: ['table', 'tr', 'td'],
    compilerOutputReason: 'Two-row table grid of clickable sizes.',
    validClassCategories: [],
    commonMistakes: [],
    attributes: {
      'sizes':         { type: 'string', required: true,  description: 'Comma-separated list of sizes (US).', example: '7,7.5,8,8.5,9,9.5,10,10.5', hasEmailCompatibilityNotes: false },
      'unavailable':   { type: 'string', required: false, description: 'Comma-separated sizes shown as out-of-stock.', example: '7,9.5', hasEmailCompatibilityNotes: false },
      'href-template': { type: 'string', required: true,  description: 'URL with {size} placeholder.', example: 'https://kicks.example/buy?size={size}', hasEmailCompatibilityNotes: false },
      'title':         { type: 'string', required: false, description: 'Heading shown above the grid.', example: 'Pick your size', default: 'Pick your size', hasEmailCompatibilityNotes: false },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  compile: (node: any, context: any) => {
    const a = node.attributes
    const sizes = (a['sizes'] ?? '').split(',').map((s: string) => s.trim()).filter(Boolean)
    const unavailable = new Set(
      ((a['unavailable'] ?? '') as string).split(',').map((s) => s.trim()).filter(Boolean),
    )
    const hrefTemplate = a['href-template'] ?? '#'
    const title = escapeHtml(a['title'] ?? 'Pick your size')

    const ink   = themeColor(context, 'ink',   KICKS.ink)
    const paper = themeColor(context, 'paper', KICKS.paper)
    const white = themeColor(context, 'white', KICKS.white)
    warnCss(context, 'border-radius', '6px', node)

    const cells = sizes.map((size: string) => {
      const isOut = unavailable.has(size)
      const href = hrefTemplate.replace('{size}', encodeURIComponent(size))
      const bg = isOut ? paper : white
      const color = isOut ? '#9ca3af' : ink
      const border = isOut ? '#e5e7eb' : ink
      const inner = isOut
        ? `<span style="display:inline-block;font-family:Arial,sans-serif;font-size:14px;font-weight:600;color:${color};">${escapeHtml(size)}</span>`
        : `<a href="${escapeHtml(href)}" style="display:inline-block;font-family:Arial,sans-serif;font-size:14px;font-weight:600;color:${color};text-decoration:none;">${escapeHtml(size)}</a>`
      return `<td align="center" valign="middle" width="64" height="44" style="border:1px solid ${border};border-radius:6px;background-color:${bg};">${inner}</td>`
    }).join('<td width="8" style="font-size:1px;line-height:1px;">&nbsp;</td>')

    return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:${white};">
  <tr><td align="center" style="padding:32px 24px;">
    <h3 style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:18px;font-weight:600;color:${ink};">${title}</h3>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
      <tr>${cells}</tr>
    </table>
  </td></tr>
</table>`
  },
})

// ---------------------------------------------------------------------------
// Marketplace metadata
// ---------------------------------------------------------------------------

import type { BrandComponentSpec } from './brands'

export const KICKS_DESIGN_SYSTEM = {
  id: 'kicks',
  name: 'Kicks & Co. Email System',
  version: '0.4.0',
  publisher: '@kicks/email-components',
  category: 'shoe' as const,
  description:
    'Sneaker drops, restocks, and product-launch emails. Built for fashion-forward DTC shoe brands.',
  brandColor: KICKS.brand,
}

export const KICKS_COMPONENTS: BrandComponentSpec[] = [
  {
    type: 'kicks-product-hero',
    label: 'Product Hero',
    tagline: 'Full-bleed photo hero with dark scrim — product launches and drops.',
    example: `<kicks-product-hero
  eyebrow="New Drop"
  title-bold="Trailburst"
  title-rest="Pro Runner"
  subtitle="Built for every terrain."
  body="A featherweight knit upper meets a carbon-plate midsole and gripped lugs designed for trails, tarmac, and everything in between."
  cta-label="Shop the drop"
  cta-href="https://example.com/trailburst-pro" />`,
  },
  {
    type: 'kicks-product-card',
    label: 'Product Card',
    tagline: 'Compact product tile — image, name, colorway, price, CTA.',
    example: `<kicks-product-card
  image-url="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&q=80"
  name="Air Force 1"
  colorway="Triple White"
  price="$120"
  cta-label="Shop now"
  cta-href="https://example.com/af1" />`,
  },
  {
    type: 'kicks-size-grid',
    label: 'Size Grid',
    tagline: 'Clickable size grid — restock or back-in-stock alerts.',
    example: `<kicks-size-grid
  title="Pick your size"
  sizes="7,7.5,8,8.5,9,9.5,10,10.5"
  unavailable="7,9.5"
  href-template="https://example.com/buy?size={size}" />`,
  },
]
