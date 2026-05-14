/**
 * AcmeCorp design system — a sample component library demonstrating the
 * mailc plugin marketplace concept.
 *
 * Each component is registered with mailc via `defineComponent()` at module
 * load. The exported `ACME_COMPONENTS` array describes them for the
 * marketplace UI.
 *
 * Components are designed to sit directly under `<mc-body>` and emit
 * email-safe table-based HTML with inline styles.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mailc: any = await import('mailc/browser')
const defineComponent = mailc.defineComponent ?? mailc.default?.defineComponent
// Plugin-author utilities re-exported from mailc.
const { escapeHtml, themeColor, warnCss } = mailc

// ---------------------------------------------------------------------------
// Brand tokens
// ---------------------------------------------------------------------------

const ACME = {
  brand: '#7c3aed',
  brandDark: '#5b21b6',
  ink: '#0f172a',
  mute: '#475569',
  surface: '#f8fafc',
  border: '#e2e8f0',
  white: '#ffffff',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function centeredTable(innerHtml: string, bgColor = ACME.white): string {
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:${bgColor};">
  <tr><td align="center" style="padding:0;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;">
      <tr><td>${innerHtml}</td></tr>
    </table>
  </td></tr>
</table>`
}

// ---------------------------------------------------------------------------
// acme-hero
// ---------------------------------------------------------------------------

defineComponent({
  type: 'acme-hero',
  metadata: {
    description: 'Branded hero banner with title, subtitle, and optional call-to-action.',
    category: 'container',
    parent: 'mc-body',
    maxChildren: 0,
    allowsTextContent: false,
    compilerOutputElements: ['table', 'tr', 'td'],
    compilerOutputReason: 'Email-safe centered 600px table with inline styles.',
    validClassCategories: [],
    commonMistakes: [],
    attributes: {
      'title':      { type: 'string', required: true,  description: 'Hero headline.', example: 'Welcome to Acme', hasEmailCompatibilityNotes: false },
      'subtitle':   { type: 'string', required: false, description: 'Supporting subtitle.', example: 'The simplest way to ship.', hasEmailCompatibilityNotes: false },
      'cta-label':  { type: 'string', required: false, description: 'CTA button text.', example: 'Get started', hasEmailCompatibilityNotes: false },
      'cta-href':   { type: 'url',    required: false, description: 'CTA button link.', example: 'https://acme.com', hasEmailCompatibilityNotes: false },
      'bg-color':   { type: 'color',  required: false, description: 'Hero background color.', example: '#7c3aed', default: ACME.brand, hasEmailCompatibilityNotes: false },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  compile: (node: any, context: any) => {
    const attrs = node.attributes
    const title = escapeHtml(attrs['title'] ?? '')
    const subtitle = attrs['subtitle'] ? escapeHtml(attrs['subtitle']) : ''
    const ctaLabel = attrs['cta-label']
    const ctaHref = attrs['cta-href']
    const brand = themeColor(context, 'brand', ACME.brand)
    const white = themeColor(context, 'white', ACME.white)
    const bg = attrs['bg-color'] ?? brand
    warnCss(context, 'border-radius', '8px', node)

    const cta = ctaLabel && ctaHref
      ? `<table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin:24px auto 0;"><tr><td style="background-color:${white};border-radius:8px;"><a href="${escapeHtml(ctaHref)}" style="display:inline-block;padding:14px 28px;color:${bg};text-decoration:none;font-weight:600;font-family:Arial,sans-serif;font-size:14px;">${escapeHtml(ctaLabel)}</a></td></tr></table>`
      : ''

    const inner = `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:${bg};">
  <tr><td align="center" style="padding:56px 32px;color:${white};font-family:Arial,sans-serif;">
    <h1 style="margin:0;font-size:32px;line-height:1.2;font-weight:700;color:${white};">${title}</h1>
    ${subtitle ? `<p style="margin:12px 0 0;font-size:16px;line-height:1.5;color:${white};opacity:0.9;">${subtitle}</p>` : ''}
    ${cta}
  </td></tr>
</table>`
    return centeredTable(inner, bg)
  },
})

// ---------------------------------------------------------------------------
// acme-feature
// ---------------------------------------------------------------------------

defineComponent({
  type: 'acme-feature',
  metadata: {
    description: 'A single feature row with an emoji icon, title, and description.',
    category: 'container',
    parent: 'mc-body',
    maxChildren: 0,
    allowsTextContent: false,
    compilerOutputElements: ['table', 'tr', 'td'],
    compilerOutputReason: 'Two-column table: icon on the left, text on the right.',
    validClassCategories: [],
    commonMistakes: [],
    attributes: {
      'icon':        { type: 'string', required: false, description: 'Emoji or short string used as the icon.', example: '⚡', default: '✨', hasEmailCompatibilityNotes: false },
      'title':       { type: 'string', required: true,  description: 'Feature title.', example: 'Lightning fast', hasEmailCompatibilityNotes: false },
      'description': { type: 'string', required: true,  description: 'Feature description.', example: 'Ship in seconds, not hours.', hasEmailCompatibilityNotes: false },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  compile: (node: any, context: any) => {
    const attrs = node.attributes
    const icon = escapeHtml(attrs['icon'] ?? '✨')
    const title = escapeHtml(attrs['title'] ?? '')
    const description = escapeHtml(attrs['description'] ?? '')
    const ink  = themeColor(context, 'ink',  ACME.ink)
    const mute = themeColor(context, 'mute', ACME.mute)

    const inner = `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-family:Arial,sans-serif;">
  <tr>
    <td width="56" valign="top" style="padding:20px 0 20px 24px;font-size:28px;line-height:1;">${icon}</td>
    <td valign="top" style="padding:20px 24px;">
      <h3 style="margin:0 0 6px;font-size:16px;font-weight:600;color:${ink};">${title}</h3>
      <p style="margin:0;font-size:14px;line-height:1.55;color:${mute};">${description}</p>
    </td>
  </tr>
</table>`
    return centeredTable(inner)
  },
})

// ---------------------------------------------------------------------------
// acme-price-card
// ---------------------------------------------------------------------------

defineComponent({
  type: 'acme-price-card',
  metadata: {
    description: 'Pricing card with plan name, price, feature list, and a CTA button.',
    category: 'container',
    parent: 'mc-body',
    maxChildren: 0,
    allowsTextContent: false,
    compilerOutputElements: ['table', 'tr', 'td'],
    compilerOutputReason: 'Bordered card laid out with nested tables for email-client compatibility.',
    validClassCategories: [],
    commonMistakes: [],
    attributes: {
      'plan':       { type: 'string', required: true,  description: 'Plan name.', example: 'Pro', hasEmailCompatibilityNotes: false },
      'price':      { type: 'string', required: true,  description: 'Price label (display string).', example: '$29/mo', hasEmailCompatibilityNotes: false },
      'features':   { type: 'string', required: true,  description: 'Comma-separated feature list.', example: 'Unlimited projects, 24/7 support, Priority queue', hasEmailCompatibilityNotes: false },
      'cta-label':  { type: 'string', required: false, description: 'CTA button text.', example: 'Choose Pro', default: 'Choose plan', hasEmailCompatibilityNotes: false },
      'cta-href':   { type: 'url',    required: true,  description: 'CTA button link.', example: 'https://acme.com/checkout?plan=pro', hasEmailCompatibilityNotes: false },
      'highlight':  { type: 'boolean', required: false, description: 'Show as highlighted/recommended.', example: 'true', hasEmailCompatibilityNotes: false },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  compile: (node: any, context: any) => {
    const attrs = node.attributes
    const plan = escapeHtml(attrs['plan'] ?? '')
    const price = escapeHtml(attrs['price'] ?? '')
    const features = (attrs['features'] ?? '')
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean)
    const ctaLabel = escapeHtml(attrs['cta-label'] ?? 'Choose plan')
    const ctaHref = escapeHtml(attrs['cta-href'] ?? '#')
    const highlight = attrs['highlight'] === 'true'

    const brand = themeColor(context, 'brand', ACME.brand)
    const ink   = themeColor(context, 'ink',   ACME.ink)
    const mute  = themeColor(context, 'mute',  ACME.mute)
    const white = themeColor(context, 'white', ACME.white)
    warnCss(context, 'border-radius', '12px', node)

    const borderColor = highlight ? brand : ACME.border
    const featureRows = features
      .map(
        (f: string) =>
          `<tr><td style="padding:6px 0;font-size:14px;color:${mute};font-family:Arial,sans-serif;"><span style="color:${brand};font-weight:600;">✓</span> &nbsp;${escapeHtml(f)}</td></tr>`
      )
      .join('\n')

    const inner = `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;">
  <tr><td style="padding:0 24px;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border:2px solid ${borderColor};border-radius:12px;background-color:${white};">
      <tr><td style="padding:28px 28px 8px;font-family:Arial,sans-serif;">
        ${highlight ? `<div style="display:inline-block;background-color:${brand};color:${white};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;padding:4px 10px;border-radius:999px;margin-bottom:12px;">Recommended</div>` : ''}
        <h3 style="margin:0;font-size:18px;font-weight:600;color:${ink};">${plan}</h3>
        <p style="margin:8px 0 16px;font-size:32px;font-weight:700;color:${ink};">${price}</p>
      </td></tr>
      <tr><td style="padding:0 28px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          ${featureRows}
        </table>
      </td></tr>
      <tr><td style="padding:24px 28px 28px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr><td align="center" style="background-color:${brand};border-radius:8px;">
          <a href="${ctaHref}" style="display:block;padding:12px 24px;color:${white};text-decoration:none;font-family:Arial,sans-serif;font-weight:600;font-size:14px;">${ctaLabel}</a>
        </td></tr></table>
      </td></tr>
    </table>
  </td></tr>
</table>`
    return centeredTable(inner)
  },
})

// ---------------------------------------------------------------------------
// acme-footer
// ---------------------------------------------------------------------------

defineComponent({
  type: 'acme-footer',
  metadata: {
    description: 'Brand footer with company name, address, and an unsubscribe link.',
    category: 'container',
    parent: 'mc-body',
    maxChildren: 0,
    allowsTextContent: false,
    compilerOutputElements: ['table', 'tr', 'td'],
    compilerOutputReason: 'Centered table with muted text and an unsubscribe link.',
    validClassCategories: [],
    commonMistakes: [],
    attributes: {
      'company-name':     { type: 'string', required: true,  description: 'Company display name.', example: 'Acme Corp', hasEmailCompatibilityNotes: false },
      'address':          { type: 'string', required: false, description: 'Mailing address shown in the footer.', example: '123 Market St, San Francisco, CA', hasEmailCompatibilityNotes: false },
      'unsubscribe-href': { type: 'url',    required: false, description: 'Unsubscribe link.', example: 'https://acme.com/unsubscribe', hasEmailCompatibilityNotes: false },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  compile: (node: any, context: any) => {
    const attrs = node.attributes
    const company = escapeHtml(attrs['company-name'] ?? '')
    const address = attrs['address'] ? escapeHtml(attrs['address']) : ''
    const unsub = attrs['unsubscribe-href']
    const brand = themeColor(context, 'brand', ACME.brand)
    const ink   = themeColor(context, 'ink',   ACME.ink)
    const mute  = themeColor(context, 'mute',  ACME.mute)

    const inner = `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:${ACME.surface};">
  <tr><td align="center" style="padding:32px 24px;font-family:Arial,sans-serif;">
    <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:${ink};">${company}</p>
    ${address ? `<p style="margin:0 0 12px;font-size:12px;color:${mute};">${address}</p>` : ''}
    ${unsub ? `<p style="margin:0;font-size:12px;color:${mute};">You're receiving this because you signed up. <a href="${escapeHtml(unsub)}" style="color:${brand};text-decoration:underline;">Unsubscribe</a>.</p>` : ''}
  </td></tr>
</table>`
    return centeredTable(inner, ACME.surface)
  },
})

// ---------------------------------------------------------------------------
// Marketplace metadata — drives the /marketplace/components UI
// ---------------------------------------------------------------------------

export interface AcmeComponentSpec {
  type: string
  label: string
  tagline: string
  example: string // a sample <acme-*> tag the user can preview
}

export const ACME_DESIGN_SYSTEM = {
  name: 'AcmeCorp Email Design System',
  version: '1.0.0',
  publisher: '@acme/email-components',
  brandColor: ACME.brand,
}

export const ACME_COMPONENTS: AcmeComponentSpec[] = [
  {
    type: 'acme-hero',
    label: 'Hero Banner',
    tagline: 'Branded full-width banner with title, subtitle, and CTA.',
    example: `<acme-hero
  title="Welcome to Acme"
  subtitle="The simplest way to ship transactional email."
  cta-label="Get started"
  cta-href="https://acme.com" />`,
  },
  {
    type: 'acme-feature',
    label: 'Feature Row',
    tagline: 'Single feature: emoji icon, title, supporting text.',
    example: `<acme-feature
  icon="⚡"
  title="Lightning fast"
  description="Send your first email in under a minute." />`,
  },
  {
    type: 'acme-price-card',
    label: 'Pricing Card',
    tagline: 'Plan name, price, feature checklist, and a CTA button.',
    example: `<acme-price-card
  plan="Pro"
  price="$29/mo"
  features="Unlimited templates, 100k sends, Priority support"
  cta-label="Choose Pro"
  cta-href="https://acme.com/checkout?plan=pro"
  highlight="true" />`,
  },
  {
    type: 'acme-footer',
    label: 'Brand Footer',
    tagline: 'Company name, address, and a one-click unsubscribe link.',
    example: `<acme-footer
  company-name="Acme Corp"
  address="123 Market St, San Francisco, CA"
  unsubscribe-href="https://acme.com/unsubscribe" />`,
  },
]
