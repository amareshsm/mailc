/**
 * mailc Essentials — first-party general-purpose components.
 *
 * Brand-agnostic building blocks inspired by common newsletter / dashboard /
 * editorial patterns. Use these directly or as a reference when authoring
 * your own brand components.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mailc: any = await import('mailc/browser')
const defineComponent = mailc.defineComponent ?? mailc.default?.defineComponent
// Plugin-author utilities re-exported from mailc.
const { escapeHtml, themeColor, warnCss } = mailc

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

const MC = {
  brand: '#5b21b6',
  ink: '#0f172a',
  mute: '#64748b',
  border: '#e2e8f0',
  paper: '#ffffff',
  surface: '#f8fafc',
  black: '#0a0a0a',
  white: '#ffffff',
}

// ---------------------------------------------------------------------------
// essentials-overlay-hero — full-bleed image hero with dark text panel at top
// (Antarctica / travel newsletter style)
// ---------------------------------------------------------------------------

defineComponent({
  type: 'essentials-overlay-hero',
  metadata: {
    description: 'Full-image hero with dark text panel overlaying the top portion — newsletter / travel style.',
    category: 'container',
    parent: 'mc-body',
    maxChildren: 0,
    allowsTextContent: false,
    compilerOutputElements: ['table', 'tr', 'td'],
    compilerOutputReason: 'Centered table with VML background-image fallback for Outlook.',
    validClassCategories: [],
    commonMistakes: [],
    attributes: {
      'image-url':  { type: 'url',    required: true,  description: 'Full-bleed background image.', example: 'https://...', hasEmailCompatibilityNotes: false },
      'eyebrow':    { type: 'string', required: false, description: 'Small text above the title.', example: 'Journey to the edge of the earth', hasEmailCompatibilityNotes: false },
      'title':      { type: 'string', required: true,  description: 'Headline.', example: 'Antarctica', hasEmailCompatibilityNotes: false },
      'subtitle':   { type: 'string', required: false, description: 'Subtitle below the title.', example: 'Edition No.5', hasEmailCompatibilityNotes: false },
      'body':       { type: 'string', required: false, description: 'Long-form description.', example: 'Step into a world…', hasEmailCompatibilityNotes: false },
      'cta-label':  { type: 'string', required: true,  description: 'CTA button text.', example: 'Discover now', hasEmailCompatibilityNotes: false },
      'cta-href':   { type: 'url',    required: true,  description: 'CTA URL.', example: 'https://example.com', hasEmailCompatibilityNotes: false },
      'cta-color':  { type: 'color',  required: false, description: 'CTA background.', example: '#5b21b6', default: MC.brand, hasEmailCompatibilityNotes: false },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  compile: (node: any, context: any) => {
    const a = node.attributes
    const image    = escapeHtml(a['image-url'] ?? '')
    const eyebrow  = a['eyebrow'] ? escapeHtml(a['eyebrow']) : ''
    const title    = escapeHtml(a['title'] ?? '')
    const subtitle = a['subtitle'] ? escapeHtml(a['subtitle']) : ''
    const body     = a['body'] ? escapeHtml(a['body']) : ''
    const ctaLabel = escapeHtml(a['cta-label'] ?? '')
    const ctaHref  = escapeHtml(a['cta-href'] ?? '#')
    const brand = themeColor(context, 'brand', MC.brand)
    const white = themeColor(context, 'white', MC.white)
    const ctaColor = a['cta-color'] ?? brand
    warnCss(context, 'background-image', `url('${image}')`, node)
    warnCss(context, 'border-radius', '8px', node)

    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${MC.surface};">
  <tr><td align="center" style="padding:24px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-image:url('${image}');background-size:cover;background-position:center;background-repeat:no-repeat;background-color:${MC.black};"><!--[if mso]>
<v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="t" stroke="f" style="width:600px;" fillcolor="${MC.black}">
<v:fill type="frame" src="${image}" />
<v:textbox inset="0,0,0,0" style="mso-fit-shape-to-text:true"><div><![endif]-->
      <tr><td style="background-color:rgba(10,10,10,0.85);padding:48px 40px 32px;color:${white};font-family:Arial,sans-serif;text-align:center;">
        ${eyebrow ? `<p style="margin:0 0 12px;font-size:14px;font-weight:400;color:#cbd5e1;">${eyebrow}</p>` : ''}
        <h1 style="margin:0;font-size:48px;line-height:1.1;font-weight:600;color:${white};">${title}</h1>
        ${subtitle ? `<p style="margin:8px 0 0;font-size:18px;font-weight:400;color:#cbd5e1;">${subtitle}</p>` : ''}
        ${body ? `<p style="margin:24px 0 0;font-size:15px;line-height:22px;font-weight:300;color:#e5e7eb;">${body}</p>` : ''}
        <div style="height:24px;line-height:24px;font-size:0;">&nbsp;</div>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td align="center" style="border-radius:8px;background-color:${ctaColor};">
          <a href="${ctaHref}" style="display:inline-block;font-family:Arial,sans-serif;font-size:15px;line-height:1;font-weight:600;text-decoration:none;color:${white};padding:14px 24px;border-radius:8px;">${ctaLabel} &rarr;</a>
        </td></tr></table>
      </td></tr>
      <tr><td style="height:380px;line-height:380px;font-size:0;">&nbsp;</td></tr>
<!--[if mso]></div></v:textbox></v:rect><![endif]-->
    </table>
  </td></tr>
</table>`
  },
})

// ---------------------------------------------------------------------------
// essentials-stat-card-grid — bento layout of stat cards (API Calls 25k style)
// ---------------------------------------------------------------------------

defineComponent({
  type: 'essentials-stat-card-grid',
  metadata: {
    description: 'Bento-style grid of metric cards. Pass cards as a JSON-like attribute string.',
    category: 'container',
    parent: 'mc-body',
    maxChildren: 0,
    allowsTextContent: false,
    compilerOutputElements: ['table', 'tr', 'td'],
    compilerOutputReason: 'Two-row table — stat card + image card on top, dark feature + small stat card on bottom.',
    validClassCategories: [],
    commonMistakes: [],
    attributes: {
      'metric-label':  { type: 'string', required: true, description: 'Top-left card label.', example: 'API Calls', hasEmailCompatibilityNotes: false },
      'metric-value':  { type: 'string', required: true, description: 'Top-left big number.', example: '25k', hasEmailCompatibilityNotes: false },
      'metric-change': { type: 'string', required: false, description: 'Change badge (e.g. "↗ 10%").', example: '↗ 10%', hasEmailCompatibilityNotes: false },
      'metric-sub':    { type: 'string', required: false, description: 'Supporting text.', example: 'Compared to last month', hasEmailCompatibilityNotes: false },
      'metric-href':   { type: 'url',    required: false, description: '"View report" link.', example: 'https://example.com', hasEmailCompatibilityNotes: false },
      'image-url':     { type: 'url',    required: true, description: 'Top-right card image.', example: 'https://...', hasEmailCompatibilityNotes: false },
      'image-alt':     { type: 'string', required: false, description: 'Image alt.', example: '', hasEmailCompatibilityNotes: false },
      'feature-title': { type: 'string', required: true, description: 'Bottom-left dark card headline.', example: 'One API, unlimited potential.', hasEmailCompatibilityNotes: false },
      'feature-body':  { type: 'string', required: true, description: 'Bottom-left dark card body.', example: 'Powering 28,000+ vendors across the Americas and Europe.', hasEmailCompatibilityNotes: false },
      'side-label':    { type: 'string', required: true, description: 'Bottom-right small card label.', example: 'Engine v2', hasEmailCompatibilityNotes: false },
      'side-value':    { type: 'string', required: true, description: 'Bottom-right large value.', example: '75x', hasEmailCompatibilityNotes: false },
      'side-sub':      { type: 'string', required: false, description: 'Bottom-right supporting text.', example: 'faster', hasEmailCompatibilityNotes: false },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  compile: (node: any, _context: any) => {
    const a = node.attributes
    const ml = escapeHtml(a['metric-label'] ?? '')
    const mv = escapeHtml(a['metric-value'] ?? '')
    const mc = a['metric-change'] ? escapeHtml(a['metric-change']) : ''
    const ms = a['metric-sub'] ? escapeHtml(a['metric-sub']) : ''
    const mh = a['metric-href'] ? escapeHtml(a['metric-href']) : ''
    const img = escapeHtml(a['image-url'] ?? '')
    const imgAlt = escapeHtml(a['image-alt'] ?? '')
    const ft = escapeHtml(a['feature-title'] ?? '')
    const fb = escapeHtml(a['feature-body'] ?? '')
    const sl = escapeHtml(a['side-label'] ?? '')
    const sv = escapeHtml(a['side-value'] ?? '')
    const ss = a['side-sub'] ? escapeHtml(a['side-sub']) : ''

    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${MC.surface};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:${MC.paper};border-radius:16px;">
      <tr><td style="padding:24px;">
        <!-- Top row -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td valign="top" width="48%" style="padding:0 8px 0 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid ${MC.border};border-radius:12px;">
                <tr><td style="padding:20px;font-family:Arial,sans-serif;">
                  <p style="margin:0 0 16px;font-size:14px;font-weight:600;color:${MC.ink};">${ml}</p>
                  <p style="margin:0;font-size:36px;line-height:1;font-weight:700;color:${MC.ink};">${mv}${mc ? ` <span style="font-size:13px;font-weight:500;color:#10b981;margin-left:6px;">${mc}</span>` : ''}</p>
                  ${ms ? `<p style="margin:8px 0 0;font-size:13px;color:${MC.mute};">${ms}</p>` : ''}
                  <div style="border-top:1px solid ${MC.border};margin:16px 0;height:1px;line-height:1px;font-size:0;">&nbsp;</div>
                  ${mh ? `<a href="${mh}" style="font-size:13px;font-weight:600;color:${MC.brand};text-decoration:none;">View report</a>` : ''}
                </td></tr>
              </table>
            </td>
            <td valign="top" width="52%" style="padding:0 0 0 8px;">
              <img src="${img}" alt="${imgAlt}" width="280" style="display:block;width:100%;max-width:280px;height:auto;border-radius:12px;border:0;" />
            </td>
          </tr>
        </table>
        <div style="height:16px;line-height:16px;font-size:0;">&nbsp;</div>
        <!-- Bottom row -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td valign="top" width="62%" style="padding:0 8px 0 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${MC.black};border-radius:12px;">
                <tr><td style="padding:24px;font-family:Arial,sans-serif;">
                  <h3 style="margin:0 0 8px;font-size:18px;font-weight:700;color:${MC.white};">${ft}</h3>
                  <p style="margin:0;font-size:15px;line-height:22px;color:#9ca3af;">${fb}</p>
                </td></tr>
              </table>
            </td>
            <td valign="top" width="38%" style="padding:0 0 0 8px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${MC.surface};border-radius:12px;">
                <tr><td style="padding:24px;font-family:Arial,sans-serif;text-align:center;">
                  <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:${MC.ink};">${sl}</p>
                  <p style="margin:0;font-size:36px;line-height:1;font-weight:700;color:${MC.ink};">${sv}</p>
                  ${ss ? `<p style="margin:8px 0 0;font-size:13px;color:${MC.mute};">${ss}</p>` : ''}
                </td></tr>
              </table>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
</table>`
  },
})

// ---------------------------------------------------------------------------
// essentials-category-grid — 2x2 image card grid with title (Monochrome Mood style)
// ---------------------------------------------------------------------------

defineComponent({
  type: 'essentials-category-grid',
  metadata: {
    description: '2×2 grid of image cards with title above the image. For seasonal collections or article rollups.',
    category: 'container',
    parent: 'mc-body',
    maxChildren: 0,
    allowsTextContent: false,
    compilerOutputElements: ['table', 'tr', 'td'],
    compilerOutputReason: 'Nested 2×2 table — title row above image row, four cards arranged as 2 rows × 2 columns.',
    validClassCategories: [],
    commonMistakes: [],
    attributes: {
      'card1-title':    { type: 'string', required: true, description: 'Card 1 title.', example: 'Monochrome Mood', hasEmailCompatibilityNotes: false },
      'card1-image':    { type: 'url',    required: true, description: 'Card 1 image.', example: 'https://...', hasEmailCompatibilityNotes: false },
      'card1-href':     { type: 'url',    required: true, description: 'Card 1 link.', example: 'https://...', hasEmailCompatibilityNotes: false },
      'card2-title':    { type: 'string', required: true, description: 'Card 2 title.', example: 'Bold moves', hasEmailCompatibilityNotes: false },
      'card2-image':    { type: 'url',    required: true, description: 'Card 2 image.', example: 'https://...', hasEmailCompatibilityNotes: false },
      'card2-href':     { type: 'url',    required: true, description: 'Card 2 link.', example: 'https://...', hasEmailCompatibilityNotes: false },
      'card3-title':    { type: 'string', required: true, description: 'Card 3 title.', example: 'Redux Denim', hasEmailCompatibilityNotes: false },
      'card3-image':    { type: 'url',    required: true, description: 'Card 3 image.', example: 'https://...', hasEmailCompatibilityNotes: false },
      'card3-href':     { type: 'url',    required: true, description: 'Card 3 link.', example: 'https://...', hasEmailCompatibilityNotes: false },
      'card4-title':    { type: 'string', required: true, description: 'Card 4 title.', example: 'Casual Cool', hasEmailCompatibilityNotes: false },
      'card4-image':    { type: 'url',    required: true, description: 'Card 4 image.', example: 'https://...', hasEmailCompatibilityNotes: false },
      'card4-href':     { type: 'url',    required: true, description: 'Card 4 link.', example: 'https://...', hasEmailCompatibilityNotes: false },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  compile: (node: any, _context: any) => {
    const a = node.attributes
    const cards = [1, 2, 3, 4].map((i) => ({
      title: escapeHtml(a[`card${i}-title`] ?? ''),
      image: escapeHtml(a[`card${i}-image`] ?? ''),
      href:  escapeHtml(a[`card${i}-href`] ?? '#'),
    }))

    const card = (c: { title: string; image: string; href: string }) => `<a href="${c.href}" style="text-decoration:none;display:block;background-color:${MC.surface};border-radius:12px;overflow:hidden;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr><td style="padding:20px 20px 0;font-family:Arial,sans-serif;font-size:18px;font-weight:700;color:${MC.ink};">${c.title}</td></tr>
    <tr><td style="padding:14px 0 0;"><img src="${c.image}" alt="${c.title}" width="280" style="display:block;width:100%;max-width:280px;height:auto;border:0;" /></td></tr>
  </table>
</a>`

    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${MC.paper};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;">
      <tr>
        <td valign="top" width="50%" style="padding:0 8px 16px 0;">${card(cards[0])}</td>
        <td valign="top" width="50%" style="padding:0 0 16px 8px;">${card(cards[1])}</td>
      </tr>
      <tr>
        <td valign="top" width="50%" style="padding:0 8px 0 0;">${card(cards[2])}</td>
        <td valign="top" width="50%" style="padding:0 0 0 8px;">${card(cards[3])}</td>
      </tr>
    </table>
  </td></tr>
</table>`
  },
})

// ---------------------------------------------------------------------------
// essentials-payment-timeline — horizontal step timeline (paid / due dates)
// ---------------------------------------------------------------------------

defineComponent({
  type: 'essentials-payment-timeline',
  metadata: {
    description: 'Horizontal payment / installment timeline with checkmark on completed steps.',
    category: 'container',
    parent: 'mc-body',
    maxChildren: 0,
    allowsTextContent: false,
    compilerOutputElements: ['table', 'tr', 'td'],
    compilerOutputReason: 'Single-row table of timeline cells separated by horizontal lines.',
    validClassCategories: [],
    commonMistakes: [],
    attributes: {
      'steps':         { type: 'string', required: true,  description: 'Pipe-separated steps "label::amount". First N marked paid via paid-count.', example: '17/11::$9.99|17/12::$9.99|17/01::$9.99|17/02::$9.99', hasEmailCompatibilityNotes: false },
      'paid-count':    { type: 'string', required: false, description: 'Number of completed (paid) steps from the start.', example: '1', default: '1', hasEmailCompatibilityNotes: false },
      'paid-prefix':   { type: 'string', required: false, description: 'Prefix added to the first paid label.', example: 'Paid: ', default: 'Paid: ', hasEmailCompatibilityNotes: false },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  compile: (node: any, _context: any) => {
    const a = node.attributes
    const stepsRaw = (a['steps'] ?? '') as string
    const paidCount = parseInt(a['paid-count'] ?? '1', 10) || 0
    const paidPrefix = a['paid-prefix'] ?? 'Paid: '

    const steps = stepsRaw
      .split('|')
      .map((s) => {
        const [label, amount] = s.split('::')
        return { label: (label ?? '').trim(), amount: (amount ?? '').trim() }
      })
      .filter((s) => s.label)

    const cells = steps.map((s, i) => {
      const isPaid = i < paidCount
      const isCurrent = i === paidCount
      const dotBg = isPaid || isCurrent ? MC.black : '#d1d5db'
      // Always provide content so empty cells don't collapse in some clients.
      const dotContent = isPaid
        ? `<span style="font-family:Arial,sans-serif;color:${MC.white};font-size:11px;font-weight:700;">&#10003;</span>`
        : '&nbsp;'
      const labelText = isPaid && i === 0 ? `${paidPrefix}${s.label}` : s.label
      const lineColor = isPaid ? MC.black : '#e5e7eb'
      const isLast = i === steps.length - 1
      const colW = Math.floor(100 / steps.length)

      return `<td valign="top" width="${colW}%" style="padding:0;font-family:Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr>
      <td valign="middle" width="20" height="20" align="center" style="padding:0;background-color:${dotBg};border-radius:10px;line-height:20px;font-size:0;mso-line-height-rule:exactly;">${dotContent}</td>
      <td valign="middle" height="20" style="padding:0;line-height:20px;font-size:0;mso-line-height-rule:exactly;">${isLast ? '&nbsp;' : `<div style="height:2px;background-color:${lineColor};font-size:0;line-height:2px;">&nbsp;</div>`}</td>
    </tr>
    <tr>
      <td colspan="2" style="padding:12px 0 0;">
        <p style="margin:0;font-size:14px;font-weight:700;color:${MC.ink};line-height:20px;">${escapeHtml(labelText)}</p>
        <p style="margin:4px 0 0;font-size:13px;color:${MC.mute};line-height:18px;">${escapeHtml(s.amount)}</p>
      </td>
    </tr>
  </table>
</td>`
    }).join('')

    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${MC.paper};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;border-radius:12px;background-color:${MC.paper};">
      <tr><td style="padding:32px 24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>${cells}</tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
</table>`
  },
})

// ---------------------------------------------------------------------------
// essentials-brand-grid — featured brand + 2×2 supporting grid
// ("Brands we support" pattern: editorial wordmark showcase)
// ---------------------------------------------------------------------------

defineComponent({
  type: 'essentials-brand-grid',
  metadata: {
    description: 'Featured brand on the left, 2×2 supporting brand grid on the right — editorial "brands we support" block.',
    category: 'container',
    parent: 'mc-body',
    maxChildren: 0,
    allowsTextContent: false,
    compilerOutputElements: ['table', 'tr', 'td'],
    compilerOutputReason: 'Two-column table; right column nested into a 2×2 grid of bordered cells.',
    validClassCategories: [],
    commonMistakes: [],
    attributes: {
      'title':           { type: 'string', required: false, description: 'Heading above the grid.', example: 'Brands we support', default: 'Brands we support', hasEmailCompatibilityNotes: false },
      'featured-name':   { type: 'string', required: true,  description: 'Name of the featured (large) brand.', example: 'Monarch', hasEmailCompatibilityNotes: false },
      'featured-href':   { type: 'url',    required: false, description: 'Featured brand link.', example: 'https://example.com/monarch', hasEmailCompatibilityNotes: false },
      'brand1-name':     { type: 'string', required: true,  description: 'Top-left supporting brand.', example: 'Accentic', hasEmailCompatibilityNotes: false },
      'brand1-href':     { type: 'url',    required: false, description: 'Top-left brand link.', example: 'https://example.com/accentic', hasEmailCompatibilityNotes: false },
      'brand2-name':     { type: 'string', required: true,  description: 'Top-right supporting brand.', example: 'amada', hasEmailCompatibilityNotes: false },
      'brand2-href':     { type: 'url',    required: false, description: 'Top-right brand link.', example: 'https://example.com/amada', hasEmailCompatibilityNotes: false },
      'brand3-name':     { type: 'string', required: true,  description: 'Bottom-left supporting brand.', example: 'amada', hasEmailCompatibilityNotes: false },
      'brand3-href':     { type: 'url',    required: false, description: 'Bottom-left brand link.', example: 'https://example.com/amada', hasEmailCompatibilityNotes: false },
      'brand4-name':     { type: 'string', required: true,  description: 'Bottom-right supporting brand.', example: 'Accentic', hasEmailCompatibilityNotes: false },
      'brand4-href':     { type: 'url',    required: false, description: 'Bottom-right brand link.', example: 'https://example.com/accentic', hasEmailCompatibilityNotes: false },
      'caption':         { type: 'string', required: false, description: 'Caption text shown beneath the grid.', example: 'We created a personal account for you. Please confirm your e-mail address and use our service to the maximum', hasEmailCompatibilityNotes: false },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  compile: (node: any, context: any) => {
    const a = node.attributes
    const title    = escapeHtml(a['title'] ?? 'Brands we support')
    const featured = escapeHtml(a['featured-name'] ?? '')
    const fhref    = a['featured-href'] ? escapeHtml(a['featured-href']) : ''
    const caption  = a['caption'] ? escapeHtml(a['caption']) : ''
    const ink   = themeColor(context, 'ink',   MC.ink)
    const mute  = themeColor(context, 'mute',  MC.mute)
    const border = themeColor(context, 'border', MC.border)
    const paper = themeColor(context, 'paper', MC.paper)
    const surface = themeColor(context, 'surface', MC.surface)
    warnCss(context, 'border-radius', '8px', node)

    const small = [1, 2, 3, 4].map((i) => ({
      name: escapeHtml(a[`brand${i}-name`] ?? ''),
      href: a[`brand${i}-href`] ? escapeHtml(a[`brand${i}-href`]) : '',
    }))

    const cell = (name: string, href: string, height: string): string => {
      const inner = `<span style="font-family:Arial,sans-serif;font-size:18px;font-weight:600;color:${ink};letter-spacing:-0.01em;">${name}</span>`
      const linked = href ? `<a href="${href}" style="text-decoration:none;color:${ink};">${inner}</a>` : inner
      return `<td align="center" valign="middle" height="${height}" style="border:1px solid ${border};border-radius:8px;background-color:${paper};padding:16px 12px;mso-line-height-rule:exactly;">${linked}</td>`
    }

    const featuredInner = `<span style="font-family:Arial,sans-serif;font-size:36px;font-weight:600;color:${ink};letter-spacing:-0.02em;line-height:1.1;">${featured}</span>`
    const featuredLinked = fhref ? `<a href="${fhref}" style="text-decoration:none;color:${ink};">${featuredInner}</a>` : featuredInner

    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${surface};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background-color:${paper};border-radius:8px;">
      <tr><td style="padding:40px 32px 12px;font-family:Arial,sans-serif;font-size:20px;font-weight:700;color:${ink};text-align:center;">${title}</td></tr>
      <tr><td style="padding:24px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td valign="top" width="50%" style="padding-right:8px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr><td align="center" valign="middle" height="220" style="border:1px solid ${border};border-radius:8px;background-color:${paper};padding:24px;mso-line-height-rule:exactly;">${featuredLinked}</td></tr>
              </table>
            </td>
            <td valign="top" width="50%" style="padding-left:8px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  ${cell(small[0].name, small[0].href, '102')}
                  <td width="8" style="font-size:0;line-height:0;">&nbsp;</td>
                  ${cell(small[1].name, small[1].href, '102')}
                </tr>
                <tr><td colspan="3" height="8" style="font-size:0;line-height:0;">&nbsp;</td></tr>
                <tr>
                  ${cell(small[2].name, small[2].href, '102')}
                  <td width="8" style="font-size:0;line-height:0;">&nbsp;</td>
                  ${cell(small[3].name, small[3].href, '102')}
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td></tr>
      ${caption ? `<tr><td style="padding:8px 48px 40px;font-family:Arial,sans-serif;font-size:14px;line-height:22px;color:${mute};text-align:center;">${caption}</td></tr>` : ''}
    </table>
  </td></tr>
</table>`
  },
})

// ---------------------------------------------------------------------------
// Marketplace metadata
// ---------------------------------------------------------------------------

import type { BrandComponentSpec } from './brands'

export const ESSENTIALS_DESIGN_SYSTEM = {
  id: 'mailc-essentials',
  name: 'mailc Essentials',
  version: '1.0.0',
  publisher: '@mailc/essentials',
  category: 'newsletter' as const,
  description:
    'First-party general-purpose components: hero overlays, stat dashboards, category grids, and timelines. Mix and match across any brand.',
  brandColor: MC.brand,
}

export const ESSENTIALS_COMPONENTS: BrandComponentSpec[] = [
  {
    type: 'essentials-overlay-hero',
    label: 'Overlay Hero',
    tagline: 'Full-image hero with dark text panel — newsletter & travel.',
    example: `<essentials-overlay-hero
  image-url="https://images.unsplash.com/photo-1517783999520-f068d7431a60?w=1200&q=80"
  eyebrow="Journey to the edge of the earth"
  title="Antarctica"
  subtitle="Edition No.5"
  body="Step into a world of untouched beauty and icy grandeur. From towering glaciers to vast, silent expanses, explore the last great wilderness on Earth."
  cta-label="Discover now"
  cta-href="https://example.com" />`,
  },
  {
    type: 'essentials-stat-card-grid',
    label: 'Stat Card Grid',
    tagline: 'Bento dashboard: metric, image, dark feature, side stat.',
    example: `<essentials-stat-card-grid
  metric-label="API Calls"
  metric-value="25k"
  metric-change="↗ 10%"
  metric-sub="Compared to last month"
  metric-href="https://example.com/report"
  image-url="https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=600&q=80"
  feature-title="One API, unlimited potential."
  feature-body="Powering 28,000+ vendors across the Americas and Europe."
  side-label="Engine v2"
  side-value="75x"
  side-sub="faster" />`,
  },
  {
    type: 'essentials-category-grid',
    label: 'Category Grid',
    tagline: '2×2 image card grid for seasonal collections or article rollups.',
    example: `<essentials-category-grid
  card1-title="Monochrome Mood"
  card1-image="https://images.unsplash.com/photo-1485231183945-fffde7cc051e?w=400&q=80"
  card1-href="https://example.com/mono"
  card2-title="Bold moves"
  card2-image="https://images.unsplash.com/photo-1516762689617-e1cffcef479d?w=400&q=80"
  card2-href="https://example.com/bold"
  card3-title="Redux Denim"
  card3-image="https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80"
  card3-href="https://example.com/denim"
  card4-title="Casual Cool"
  card4-image="https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=400&q=80"
  card4-href="https://example.com/casual" />`,
  },
  {
    type: 'essentials-payment-timeline',
    label: 'Payment Timeline',
    tagline: 'Horizontal step timeline for installments or onboarding stages.',
    example: `<essentials-payment-timeline
  steps="17/11::$9.99|17/12::$9.99|17/01::$9.99|17/02::$9.99"
  paid-count="1"
  paid-prefix="Paid: " />`,
  },
  {
    type: 'essentials-brand-grid',
    label: 'Brand Grid',
    tagline: '"Brands we support" — featured wordmark + 2×2 supporting grid.',
    example: `<essentials-brand-grid
  title="Brands we support"
  featured-name="Monarch"
  featured-href="https://example.com/monarch"
  brand1-name="Accentic"
  brand1-href="https://example.com/accentic"
  brand2-name="amada"
  brand2-href="https://example.com/amada"
  brand3-name="amada"
  brand3-href="https://example.com/amada"
  brand4-name="Accentic"
  brand4-href="https://example.com/accentic"
  caption="We created a personal account for you. Please confirm your e-mail address and use our service to the maximum" />`,
  },
]
