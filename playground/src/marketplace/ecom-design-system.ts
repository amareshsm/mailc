/**
 * ecom-pro design system — generic e-commerce components.
 *
 * Cart-recovery, order status, and deal grids for online retailers.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mailc: any = await import('mailc/browser')
const defineComponent = mailc.defineComponent ?? mailc.default?.defineComponent
// Plugin-author utilities re-exported from mailc.
const { escapeHtml, themeColor, warnCss } = mailc

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ECOM_PLUGINS: any[] = []
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function defineLocal(spec: any): any {
  const plugin = defineComponent(spec)
  ECOM_PLUGINS.push(plugin)
  return plugin
}

const ECOM = {
  brand: '#0f766e',
  brandDark: '#115e59',
  ink: '#0f172a',
  mute: '#64748b',
  border: '#e2e8f0',
  paper: '#ffffff',
  surface: '#f1f5f9',
  warning: '#f59e0b',
  success: '#10b981',
  white: '#ffffff',
}

// ---------------------------------------------------------------------------
// ecom-cart-recovery — abandoned cart with item list
// ---------------------------------------------------------------------------

defineLocal({
  type: 'ecom-cart-recovery',
  metadata: {
    description: 'Abandoned-cart email with hero, line items, total, and recovery CTA.',
    category: 'container',
    parent: 'mc-body',
    maxChildren: 0,
    allowsTextContent: false,
    compilerOutputElements: ['table', 'tr', 'td'],
    compilerOutputReason: 'Centered table with item list and total row.',
    validClassCategories: [],
    commonMistakes: [],
    attributes: {
      'headline':   { type: 'string', required: true,  description: 'Main headline.', example: 'You left these behind', hasEmailCompatibilityNotes: false },
      'subhead':    { type: 'string', required: false, description: 'Supporting subhead.', example: 'Your cart misses you. Finish checking out — we saved your items.', hasEmailCompatibilityNotes: false },
      'items':      { type: 'string', required: true,  description: 'Pipe-separated items: name::price::imageUrl', example: 'Wool Beanie::$29.99::https://...', hasEmailCompatibilityNotes: false },
      'total':      { type: 'string', required: true,  description: 'Cart total.', example: '$87.97', hasEmailCompatibilityNotes: false },
      'cta-label':  { type: 'string', required: true,  description: 'CTA button text.', example: 'Complete checkout', hasEmailCompatibilityNotes: false },
      'cta-href':   { type: 'url',    required: true,  description: 'CTA URL.', example: 'https://shop.example.com/checkout', hasEmailCompatibilityNotes: false },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  compile: (node: any, context: any) => {
    const a = node.attributes
    const headline = escapeHtml(a['headline'] ?? '')
    const subhead = a['subhead'] ? escapeHtml(a['subhead']) : ''
    const total = escapeHtml(a['total'] ?? '')
    const ctaLabel = escapeHtml(a['cta-label'] ?? '')
    const ctaHref = escapeHtml(a['cta-href'] ?? '#')
    const brand = themeColor(context, 'brand', ECOM.brand)
    const ink   = themeColor(context, 'ink',   ECOM.ink)
    const mute  = themeColor(context, 'mute',  ECOM.mute)
    const white = themeColor(context, 'white', ECOM.white)
    warnCss(context, 'border-radius', '12px', node)
    const items = ((a['items'] ?? '') as string).split('|').map((line) => {
      const [name, price, image] = line.split('::')
      return { name: (name ?? '').trim(), price: (price ?? '').trim(), image: (image ?? '').trim() }
    }).filter((x) => x.name)

    const itemRows = items.map((it) => `<tr>
  <td valign="middle" width="80" style="padding:12px 0;"><img src="${escapeHtml(it.image)}" alt="${escapeHtml(it.name)}" width="64" style="display:block;width:64px;height:64px;border-radius:8px;border:0;object-fit:cover;" /></td>
  <td valign="middle" style="padding:12px 16px;font-family:Arial,sans-serif;">
    <p style="margin:0;font-size:15px;font-weight:600;color:${ink};">${escapeHtml(it.name)}</p>
  </td>
  <td valign="middle" align="right" style="padding:12px 0;font-family:Arial,sans-serif;font-size:15px;font-weight:600;color:${ink};white-space:nowrap;">${escapeHtml(it.price)}</td>
</tr>`).join('')

    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${ECOM.surface};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:${ECOM.paper};border-radius:12px;">
      <tr><td style="padding:40px 32px 24px;font-family:Arial,sans-serif;text-align:center;">
        <h1 style="margin:0;font-size:28px;line-height:1.2;font-weight:700;color:${ink};">${headline}</h1>
        ${subhead ? `<p style="margin:12px 0 0;font-size:15px;line-height:22px;color:${mute};">${subhead}</p>` : ''}
      </td></tr>
      <tr><td style="padding:0 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid ${ECOM.border};border-bottom:1px solid ${ECOM.border};">
          ${itemRows}
        </table>
      </td></tr>
      <tr><td style="padding:16px 32px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="font-family:Arial,sans-serif;font-size:15px;font-weight:600;color:${mute};">Total</td>
            <td align="right" style="font-family:Arial,sans-serif;font-size:20px;font-weight:700;color:${ink};">${total}</td>
          </tr>
        </table>
      </td></tr>
      <tr><td style="padding:24px 32px 40px;text-align:center;">
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
// ecom-order-status — order tracking with status pills
// ---------------------------------------------------------------------------

defineLocal({
  type: 'ecom-order-status',
  metadata: {
    description: 'Order tracking card: order number, status pill, address, ETA, tracking link.',
    category: 'container',
    parent: 'mc-body',
    maxChildren: 0,
    allowsTextContent: false,
    compilerOutputElements: ['table', 'tr', 'td'],
    compilerOutputReason: 'Card with status pill and detail rows.',
    validClassCategories: [],
    commonMistakes: [],
    attributes: {
      'order-number': { type: 'string', required: true,  description: 'Order ID.', example: '#A8124-2026', hasEmailCompatibilityNotes: false },
      'status':       { type: 'string', required: true,  description: 'Current status (one of: placed, shipped, out-for-delivery, delivered).', example: 'shipped', hasEmailCompatibilityNotes: false },
      'eta':          { type: 'string', required: false, description: 'Expected delivery / current ETA.', example: 'Tuesday, May 12', hasEmailCompatibilityNotes: false },
      'address':      { type: 'string', required: false, description: 'Delivery address.', example: '550 Mission St, San Francisco', hasEmailCompatibilityNotes: false },
      'tracking-href':{ type: 'url',    required: true,  description: 'Tracking page URL.', example: 'https://shop.example.com/track/A8124', hasEmailCompatibilityNotes: false },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  compile: (node: any, _context: any) => {
    const a = node.attributes
    const orderNum = escapeHtml(a['order-number'] ?? '')
    const status = (a['status'] ?? 'placed').toLowerCase()
    const eta = a['eta'] ? escapeHtml(a['eta']) : ''
    const addr = a['address'] ? escapeHtml(a['address']) : ''
    const trackHref = escapeHtml(a['tracking-href'] ?? '#')

    const statusMap: Record<string, { label: string; bg: string; fg: string }> = {
      'placed':           { label: 'Placed',           bg: '#dbeafe', fg: '#1e40af' },
      'shipped':          { label: 'Shipped',          bg: '#fef3c7', fg: '#92400e' },
      'out-for-delivery': { label: 'Out for delivery', bg: '#fde68a', fg: '#92400e' },
      'delivered':        { label: 'Delivered',        bg: '#d1fae5', fg: '#065f46' },
    }
    const sm = statusMap[status] ?? statusMap['placed']

    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${ECOM.surface};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:${ECOM.paper};border-radius:12px;border:1px solid ${ECOM.border};">
      <tr><td style="padding:28px 32px;font-family:Arial,sans-serif;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td valign="middle">
              <p style="margin:0;font-size:13px;color:${ECOM.mute};">Order</p>
              <p style="margin:2px 0 0;font-size:18px;font-weight:700;color:${ECOM.ink};">${orderNum}</p>
            </td>
            <td valign="middle" align="right"><span style="display:inline-block;padding:6px 12px;border-radius:999px;background-color:${sm.bg};color:${sm.fg};font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">${sm.label}</span></td>
          </tr>
        </table>
        <div style="border-top:1px solid ${ECOM.border};margin:20px 0;height:1px;line-height:1px;font-size:0;">&nbsp;</div>
        ${eta ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td style="padding:6px 0;font-size:13px;color:${ECOM.mute};">Estimated arrival</td>
          <td align="right" style="padding:6px 0;font-size:14px;font-weight:600;color:${ECOM.ink};">${eta}</td>
        </tr></table>` : ''}
        ${addr ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td style="padding:6px 0;font-size:13px;color:${ECOM.mute};">Delivering to</td>
          <td align="right" style="padding:6px 0;font-size:14px;font-weight:600;color:${ECOM.ink};">${addr}</td>
        </tr></table>` : ''}
        <div style="height:24px;line-height:24px;font-size:0;">&nbsp;</div>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="border-radius:8px;background-color:${ECOM.brand};">
          <a href="${trackHref}" style="display:inline-block;font-family:Arial,sans-serif;font-size:14px;font-weight:600;text-decoration:none;color:${ECOM.white};padding:12px 24px;border-radius:8px;">Track package &rarr;</a>
        </td></tr></table>
      </td></tr>
    </table>
  </td></tr>
</table>`
  },
})

// ---------------------------------------------------------------------------
// ecom-deal-grid — 2-column grid of discounted products
// ---------------------------------------------------------------------------

defineLocal({
  type: 'ecom-deal-grid',
  metadata: {
    description: 'Two-column grid of products with strikethrough original price.',
    category: 'container',
    parent: 'mc-body',
    maxChildren: 0,
    allowsTextContent: false,
    compilerOutputElements: ['table', 'tr', 'td'],
    compilerOutputReason: 'Two-column nested table with up to 4 product cards.',
    validClassCategories: [],
    commonMistakes: [],
    attributes: {
      'title':    { type: 'string', required: true,  description: 'Section heading.', example: 'Today\'s deals', hasEmailCompatibilityNotes: false },
      'products': { type: 'string', required: true,  description: 'Pipe-separated products: name::wasPrice::nowPrice::image::href', example: 'Linen Shirt::$120::$79::https://i.img/1::https://...', hasEmailCompatibilityNotes: false },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  compile: (node: any, _context: any) => {
    const a = node.attributes
    const title = escapeHtml(a['title'] ?? '')
    const products = ((a['products'] ?? '') as string).split('|').slice(0, 4).map((line) => {
      const [name, was, now, image, href] = line.split('::')
      return {
        name: (name ?? '').trim(),
        was:  (was  ?? '').trim(),
        now:  (now  ?? '').trim(),
        image:(image?? '').trim(),
        href: (href ?? '#').trim(),
      }
    }).filter((p) => p.name)

    const card = (p: typeof products[number]) => `<a href="${escapeHtml(p.href)}" style="text-decoration:none;display:block;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${ECOM.surface};border-radius:10px;">
    <tr><td style="padding:0;"><img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" width="280" style="display:block;width:100%;max-width:280px;height:auto;border-radius:10px 10px 0 0;border:0;" /></td></tr>
    <tr><td style="padding:14px 16px 18px;font-family:Arial,sans-serif;">
      <p style="margin:0;font-size:15px;font-weight:600;color:${ECOM.ink};">${escapeHtml(p.name)}</p>
      <p style="margin:6px 0 0;font-size:14px;">
        ${p.was ? `<span style="color:${ECOM.mute};text-decoration:line-through;margin-right:8px;">${escapeHtml(p.was)}</span>` : ''}
        <span style="color:${ECOM.brand};font-weight:700;font-size:16px;">${escapeHtml(p.now)}</span>
      </p>
    </td></tr>
  </table>
</a>`

    const rows = []
    for (let i = 0; i < products.length; i += 2) {
      rows.push(`<tr>
  <td valign="top" width="50%" style="padding:0 8px 16px 0;">${card(products[i])}</td>
  ${products[i+1] ? `<td valign="top" width="50%" style="padding:0 0 16px 8px;">${card(products[i+1])}</td>` : '<td width="50%"></td>'}
</tr>`)
    }

    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${ECOM.paper};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">
      <tr><td style="padding:0 0 16px;font-family:Arial,sans-serif;">
        <h2 style="margin:0;font-size:22px;font-weight:700;color:${ECOM.ink};">${title}</h2>
      </td></tr>
      <tr><td>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${rows.join('')}</table>
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

export const ECOM_DESIGN_SYSTEM = {
  id: 'ecom-pro',
  name: 'ecom-pro',
  version: '0.2.0',
  publisher: '@ecom-pro/email-components',
  category: 'ecommerce' as const,
  description:
    'Cart-recovery, order-tracking, and deal-grid components for online retailers. Compatible with Shopify-style product feeds.',
  brandColor: ECOM.brand,
}

export const ECOM_COMPONENTS: BrandComponentSpec[] = [
  {
    type: 'ecom-cart-recovery',
    label: 'Cart Recovery',
    tagline: 'Abandoned-cart hero with line items, total, and recovery CTA.',
    example: `<ecom-cart-recovery
  headline="You left these behind"
  subhead="Your cart misses you. Finish checking out — we saved your items."
  items="Wool Beanie::$29.99::https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=200&q=80|Linen Shirt::$57.98::https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=200&q=80"
  total="$87.97"
  cta-label="Complete checkout"
  cta-href="https://shop.example.com/checkout" />`,
  },
  {
    type: 'ecom-order-status',
    label: 'Order Status',
    tagline: 'Tracking card with status pill, ETA, and address.',
    example: `<ecom-order-status
  order-number="#A8124-2026"
  status="shipped"
  eta="Tuesday, May 12"
  address="550 Mission St, San Francisco"
  tracking-href="https://shop.example.com/track/A8124" />`,
  },
  {
    type: 'ecom-deal-grid',
    label: 'Deal Grid',
    tagline: 'Two-column product grid with strikethrough pricing.',
    example: `<ecom-deal-grid
  title="Today's deals"
  products="Linen Shirt::$120::$79::https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=400&q=80::https://example.com/p1|Wool Beanie::$45::$29::https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=400&q=80::https://example.com/p2|Leather Wallet::$80::$49::https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&q=80::https://example.com/p3|Canvas Tote::$60::$39::https://images.unsplash.com/photo-1591561954557-26941169b49e?w=400&q=80::https://example.com/p4" />`,
  },
]
