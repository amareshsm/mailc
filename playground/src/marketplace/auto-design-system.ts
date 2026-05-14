/**
 * Autopulse design system — automotive components.
 *
 * Vehicle showcases, service reminders, and test-drive cards for
 * dealerships, OEMs, and aftermarket service brands.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mailc: any = await import('mailc/browser')
const defineComponent = mailc.defineComponent ?? mailc.default?.defineComponent
// Plugin-author utilities re-exported from mailc.
const { escapeHtml, themeColor, warnCss } = mailc

const AUTO = {
  brand: '#1e40af',
  brandDark: '#1e3a8a',
  ink: '#0f172a',
  mute: '#64748b',
  border: '#cbd5e1',
  paper: '#ffffff',
  surface: '#f1f5f9',
  metallic: '#0f172a',
  white: '#ffffff',
  warning: '#dc2626',
}

// ---------------------------------------------------------------------------
// auto-vehicle-hero — vehicle showcase with image, specs, CTA
// ---------------------------------------------------------------------------

defineComponent({
  type: 'auto-vehicle-hero',
  metadata: {
    description: 'Vehicle launch showcase: image, model name, tagline, four-spec strip, and CTA.',
    category: 'container',
    parent: 'mc-body',
    maxChildren: 0,
    allowsTextContent: false,
    compilerOutputElements: ['table', 'tr', 'td'],
    compilerOutputReason: 'Centered hero with image, headline, four-cell spec table, and CTA.',
    validClassCategories: [],
    commonMistakes: [],
    attributes: {
      'image-url':  { type: 'url',    required: true,  description: 'Vehicle hero image.', example: 'https://...', hasEmailCompatibilityNotes: false },
      'model':      { type: 'string', required: true,  description: 'Model name (large).', example: 'Polestar 4', hasEmailCompatibilityNotes: false },
      'tagline':    { type: 'string', required: false, description: 'Marketing tagline.', example: 'Performance, redefined.', hasEmailCompatibilityNotes: false },
      'specs':      { type: 'string', required: true,  description: 'Pipe-separated specs: label::value', example: 'Range::320 mi|0–60::3.7s|HP::544|MSRP::$54,900', hasEmailCompatibilityNotes: false },
      'cta-label':  { type: 'string', required: true,  description: 'CTA text.', example: 'Configure yours', hasEmailCompatibilityNotes: false },
      'cta-href':   { type: 'url',    required: true,  description: 'CTA URL.', example: 'https://example.com/configure', hasEmailCompatibilityNotes: false },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  compile: (node: any, context: any) => {
    const a = node.attributes
    const image = escapeHtml(a['image-url'] ?? '')
    const model = escapeHtml(a['model'] ?? '')
    const tagline = a['tagline'] ? escapeHtml(a['tagline']) : ''
    const ctaLabel = escapeHtml(a['cta-label'] ?? '')
    const ctaHref = escapeHtml(a['cta-href'] ?? '#')
    const brand = themeColor(context, 'brand', AUTO.brand)
    const ink   = themeColor(context, 'ink',   AUTO.ink)
    const mute  = themeColor(context, 'mute',  AUTO.mute)
    const white = themeColor(context, 'white', AUTO.white)
    warnCss(context, 'border-radius', '14px', node)
    const specs = ((a['specs'] ?? '') as string).split('|').slice(0, 4).map((s) => {
      const [label, value] = s.split('::')
      return { label: (label ?? '').trim(), value: (value ?? '').trim() }
    }).filter((s) => s.label)

    const specCells = specs.map((s) => `<td valign="top" align="center" style="padding:16px 8px;font-family:Arial,sans-serif;">
  <p style="margin:0;font-size:11px;font-weight:600;color:${mute};text-transform:uppercase;letter-spacing:0.06em;">${escapeHtml(s.label)}</p>
  <p style="margin:6px 0 0;font-size:18px;font-weight:700;color:${ink};">${escapeHtml(s.value)}</p>
</td>`).join('')

    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${AUTO.surface};">
  <tr><td align="center" style="padding:24px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:${AUTO.paper};border-radius:14px;">
      <tr><td style="padding:0;"><img src="${image}" alt="${model}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border-radius:14px 14px 0 0;border:0;" /></td></tr>
      <tr><td style="padding:32px 32px 8px;font-family:Arial,sans-serif;text-align:center;">
        <h1 style="margin:0;font-size:34px;line-height:1.1;font-weight:700;color:${ink};letter-spacing:-0.02em;">${model}</h1>
        ${tagline ? `<p style="margin:8px 0 0;font-size:15px;color:${mute};">${tagline}</p>` : ''}
      </td></tr>
      <tr><td style="padding:16px 24px 8px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid ${AUTO.border};border-bottom:1px solid ${AUTO.border};">
          <tr>${specCells}</tr>
        </table>
      </td></tr>
      <tr><td style="padding:24px 32px 36px;text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center" style="border-radius:8px;background-color:${brand};">
          <a href="${ctaHref}" style="display:inline-block;font-family:Arial,sans-serif;font-size:15px;font-weight:600;text-decoration:none;color:${white};padding:14px 28px;border-radius:8px;">${ctaLabel} &rarr;</a>
        </td></tr></table>
      </td></tr>
    </table>
  </td></tr>
</table>`
  },
})

// ---------------------------------------------------------------------------
// auto-service-reminder — mileage / service due
// ---------------------------------------------------------------------------

defineComponent({
  type: 'auto-service-reminder',
  metadata: {
    description: 'Service-due reminder card with mileage gauge, due-by date, and book CTA.',
    category: 'container',
    parent: 'mc-body',
    maxChildren: 0,
    allowsTextContent: false,
    compilerOutputElements: ['table', 'tr', 'td'],
    compilerOutputReason: 'Card layout with mileage progress bar and CTA.',
    validClassCategories: [],
    commonMistakes: [],
    attributes: {
      'vehicle':       { type: 'string', required: true,  description: 'Vehicle make/model/year.', example: '2022 Tesla Model 3', hasEmailCompatibilityNotes: false },
      'service-type':  { type: 'string', required: true,  description: 'Service description.', example: 'Brake fluid + cabin filter', hasEmailCompatibilityNotes: false },
      'current-miles': { type: 'string', required: true,  description: 'Current mileage.', example: '37,420', hasEmailCompatibilityNotes: false },
      'due-miles':     { type: 'string', required: true,  description: 'Due-by mileage.', example: '40,000', hasEmailCompatibilityNotes: false },
      'pct':           { type: 'string', required: false, description: 'Progress percentage 0-100.', example: '94', default: '90', hasEmailCompatibilityNotes: false },
      'due-date':      { type: 'string', required: false, description: 'Recommended service date.', example: 'before Aug 30', hasEmailCompatibilityNotes: false },
      'cta-label':     { type: 'string', required: true,  description: 'CTA text.', example: 'Book service', hasEmailCompatibilityNotes: false },
      'cta-href':      { type: 'url',    required: true,  description: 'CTA URL.', example: 'https://example.com/book', hasEmailCompatibilityNotes: false },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  compile: (node: any, _context: any) => {
    const a = node.attributes
    const vehicle = escapeHtml(a['vehicle'] ?? '')
    const svcType = escapeHtml(a['service-type'] ?? '')
    const cur = escapeHtml(a['current-miles'] ?? '')
    const due = escapeHtml(a['due-miles'] ?? '')
    const pct = Math.max(0, Math.min(100, parseInt(a['pct'] ?? '90', 10)))
    const dueDate = a['due-date'] ? escapeHtml(a['due-date']) : ''
    const ctaLabel = escapeHtml(a['cta-label'] ?? '')
    const ctaHref = escapeHtml(a['cta-href'] ?? '#')

    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${AUTO.surface};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:${AUTO.paper};border-radius:12px;border-left:4px solid ${AUTO.warning};">
      <tr><td style="padding:28px 32px;font-family:Arial,sans-serif;">
        <p style="margin:0;font-size:11px;font-weight:600;color:${AUTO.warning};text-transform:uppercase;letter-spacing:0.08em;">Service due</p>
        <h2 style="margin:6px 0 4px;font-size:22px;font-weight:700;color:${AUTO.ink};">${vehicle}</h2>
        <p style="margin:0;font-size:14px;color:${AUTO.mute};">${svcType}</p>
        <div style="height:20px;line-height:20px;font-size:0;">&nbsp;</div>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="font-size:12px;color:${AUTO.mute};">${cur} mi</td>
            <td align="right" style="font-size:12px;color:${AUTO.mute};">${due} mi</td>
          </tr>
          <tr><td colspan="2" style="padding:6px 0 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${AUTO.border};border-radius:4px;height:8px;">
              <tr><td width="${pct}%" style="background-color:${AUTO.warning};border-radius:4px;height:8px;line-height:8px;font-size:0;">&nbsp;</td><td style="line-height:8px;font-size:0;">&nbsp;</td></tr>
            </table>
          </td></tr>
        </table>
        ${dueDate ? `<p style="margin:16px 0 0;font-size:13px;color:${AUTO.ink};font-weight:600;">Recommended: ${dueDate}</p>` : ''}
        <div style="height:24px;line-height:24px;font-size:0;">&nbsp;</div>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="border-radius:8px;background-color:${AUTO.brand};">
          <a href="${ctaHref}" style="display:inline-block;font-family:Arial,sans-serif;font-size:14px;font-weight:600;text-decoration:none;color:${AUTO.white};padding:12px 24px;border-radius:8px;">${ctaLabel} &rarr;</a>
        </td></tr></table>
      </td></tr>
    </table>
  </td></tr>
</table>`
  },
})

// ---------------------------------------------------------------------------
// auto-test-drive-card — booking confirmation
// ---------------------------------------------------------------------------

defineComponent({
  type: 'auto-test-drive-card',
  metadata: {
    description: 'Test-drive booking confirmation with vehicle, date/time, dealer.',
    category: 'container',
    parent: 'mc-body',
    maxChildren: 0,
    allowsTextContent: false,
    compilerOutputElements: ['table', 'tr', 'td'],
    compilerOutputReason: 'Booking confirmation card with detail rows.',
    validClassCategories: [],
    commonMistakes: [],
    attributes: {
      'vehicle':    { type: 'string', required: true,  description: 'Vehicle being test-driven.', example: '2026 Polestar 4 Long Range', hasEmailCompatibilityNotes: false },
      'image-url':  { type: 'url',    required: true,  description: 'Vehicle thumbnail.', example: 'https://...', hasEmailCompatibilityNotes: false },
      'date':       { type: 'string', required: true,  description: 'Booking date.', example: 'Saturday, May 17 2026', hasEmailCompatibilityNotes: false },
      'time':       { type: 'string', required: true,  description: 'Booking time.', example: '11:00 AM', hasEmailCompatibilityNotes: false },
      'dealer':     { type: 'string', required: true,  description: 'Dealer name + address.', example: 'Polestar SF · 550 Mission St', hasEmailCompatibilityNotes: false },
      'reschedule-href': { type: 'url', required: false, description: 'Reschedule URL.', example: 'https://example.com/reschedule', hasEmailCompatibilityNotes: false },
      'cta-href':   { type: 'url',    required: true,  description: 'Primary CTA URL (e.g. add to calendar).', example: 'https://example.com/calendar.ics', hasEmailCompatibilityNotes: false },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  compile: (node: any, _context: any) => {
    const a = node.attributes
    const vehicle = escapeHtml(a['vehicle'] ?? '')
    const image = escapeHtml(a['image-url'] ?? '')
    const date = escapeHtml(a['date'] ?? '')
    const time = escapeHtml(a['time'] ?? '')
    const dealer = escapeHtml(a['dealer'] ?? '')
    const reschedHref = a['reschedule-href'] ? escapeHtml(a['reschedule-href']) : ''
    const ctaHref = escapeHtml(a['cta-href'] ?? '#')

    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${AUTO.metallic};">
  <tr><td align="center" style="padding:36px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:${AUTO.paper};border-radius:14px;">
      <tr><td style="padding:28px 32px 16px;font-family:Arial,sans-serif;text-align:center;">
        <p style="margin:0;font-size:12px;font-weight:600;color:${AUTO.brand};text-transform:uppercase;letter-spacing:0.08em;">Test drive booked</p>
        <h2 style="margin:8px 0 0;font-size:24px;font-weight:700;color:${AUTO.ink};">${vehicle}</h2>
      </td></tr>
      <tr><td style="padding:0 24px;"><img src="${image}" alt="${vehicle}" width="552" style="display:block;width:100%;max-width:552px;height:auto;border-radius:10px;border:0;" /></td></tr>
      <tr><td style="padding:24px 32px 8px;font-family:Arial,sans-serif;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td valign="top" width="33%" style="padding:0 8px 0 0;">
              <p style="margin:0;font-size:11px;font-weight:600;color:${AUTO.mute};text-transform:uppercase;letter-spacing:0.06em;">Date</p>
              <p style="margin:6px 0 0;font-size:15px;font-weight:700;color:${AUTO.ink};">${date}</p>
            </td>
            <td valign="top" width="20%" style="padding:0 8px;">
              <p style="margin:0;font-size:11px;font-weight:600;color:${AUTO.mute};text-transform:uppercase;letter-spacing:0.06em;">Time</p>
              <p style="margin:6px 0 0;font-size:15px;font-weight:700;color:${AUTO.ink};">${time}</p>
            </td>
            <td valign="top" width="47%" style="padding:0 0 0 8px;">
              <p style="margin:0;font-size:11px;font-weight:600;color:${AUTO.mute};text-transform:uppercase;letter-spacing:0.06em;">Dealer</p>
              <p style="margin:6px 0 0;font-size:15px;font-weight:700;color:${AUTO.ink};">${dealer}</p>
            </td>
          </tr>
        </table>
      </td></tr>
      <tr><td style="padding:24px 32px 36px;text-align:center;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
          <td align="center" style="border-radius:8px;background-color:${AUTO.brand};">
            <a href="${ctaHref}" style="display:inline-block;font-family:Arial,sans-serif;font-size:14px;font-weight:600;text-decoration:none;color:${AUTO.white};padding:12px 22px;border-radius:8px;">Add to calendar</a>
          </td>
          ${reschedHref ? `<td width="12" style="font-size:0;line-height:0;">&nbsp;</td>
          <td align="center" style="border-radius:8px;border:1px solid ${AUTO.border};">
            <a href="${reschedHref}" style="display:inline-block;font-family:Arial,sans-serif;font-size:14px;font-weight:600;text-decoration:none;color:${AUTO.ink};padding:12px 22px;border-radius:8px;">Reschedule</a>
          </td>` : ''}
        </tr></table>
      </td></tr>
    </table>
  </td></tr>
</table>`
  },
})

// ---------------------------------------------------------------------------
// Marketplace metadata
// ---------------------------------------------------------------------------

import type { BrandComponentSpec } from './brands'

export const AUTO_DESIGN_SYSTEM = {
  id: 'autopulse',
  name: 'Autopulse',
  version: '0.3.0',
  publisher: '@autopulse/email-components',
  category: 'automotive' as const,
  description:
    'Automotive components for OEMs, dealerships, and aftermarket service: vehicle showcases, service reminders, and test-drive bookings.',
  brandColor: AUTO.brand,
}

export const AUTO_COMPONENTS: BrandComponentSpec[] = [
  {
    type: 'auto-vehicle-hero',
    label: 'Vehicle Hero',
    tagline: 'Hero with image, model, four-spec strip, and CTA.',
    example: `<auto-vehicle-hero
  image-url="https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&q=80"
  model="Polestar 4"
  tagline="Performance, redefined."
  specs="Range::320 mi|0–60::3.7s|HP::544|MSRP::$54,900"
  cta-label="Configure yours"
  cta-href="https://example.com/configure" />`,
  },
  {
    type: 'auto-service-reminder',
    label: 'Service Reminder',
    tagline: 'Mileage progress bar with service-due CTA.',
    example: `<auto-service-reminder
  vehicle="2022 Tesla Model 3"
  service-type="Brake fluid + cabin filter"
  current-miles="37,420"
  due-miles="40,000"
  pct="94"
  due-date="before Aug 30"
  cta-label="Book service"
  cta-href="https://example.com/book" />`,
  },
  {
    type: 'auto-test-drive-card',
    label: 'Test Drive Card',
    tagline: 'Booking confirmation with date, time, dealer.',
    example: `<auto-test-drive-card
  vehicle="2026 Polestar 4 Long Range"
  image-url="https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&q=80"
  date="Saturday, May 17 2026"
  time="11:00 AM"
  dealer="Polestar SF · 550 Mission St"
  reschedule-href="https://example.com/reschedule"
  cta-href="https://example.com/calendar.ics" />`,
  },
]
