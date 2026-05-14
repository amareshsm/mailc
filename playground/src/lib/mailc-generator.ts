import type { EmailComponent } from '@/types/email'

/**
 * Maps builder component types to the mailc tag they emit. All are 1:1
 * with mailc components except `mc-social`, which aggregates into an
 * `mc-text` with an inline image+label string (mailc has no `mc-social`).
 */
const TYPE_MAP: Record<string, string> = {
  'mc-section': 'mc-section',
  'mc-column': 'mc-column',
  'mc-text': 'mc-text',
  'mc-image': 'mc-image',
  'mc-button': 'mc-button',
  'mc-divider': 'mc-divider',
  'mc-spacer': 'mc-spacer',
  'mc-social': 'mc-text',
  'mc-hero': 'mc-hero',
  'mc-group': 'mc-group',
}

/** Social network icon URLs hosted on Mailjet's CDN. */
const SOCIAL_ICONS: Record<string, { icon: string; label: string; color: string }> = {
  facebook: {
    icon: 'https://www.mailjet.com/images/theme/v1/icons/ico-social/facebook.png',
    label: 'Facebook',
    color: '#3b5998',
  },
  twitter: {
    icon: 'https://www.mailjet.com/images/theme/v1/icons/ico-social/twitter.png',
    label: 'Twitter',
    color: '#55acee',
  },
  linkedin: {
    icon: 'https://www.mailjet.com/images/theme/v1/icons/ico-social/linkedin.png',
    label: 'LinkedIn',
    color: '#0077b5',
  },
}

/** Normalises a builder component's attributes to mailc-compatible names. */
function mapAttributes(_builderType: string, attrs: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {}

  for (const [key, value] of Object.entries(attrs)) {
    if (!value) continue

    switch (key) {
      // Layout
      case 'padding':
        result['padding'] = value
        break
      case 'padding-top':
        result['padding-top'] = value
        break
      case 'padding-bottom':
        result['padding-bottom'] = value
        break
      case 'padding-left':
        result['padding-left'] = value
        break
      case 'padding-right':
        result['padding-right'] = value
        break

      // Colors
      case 'background-color':
        result['background-color'] = value
        break
      case 'color':
        result['color'] = value
        break

      // Typography
      case 'font-size':
        result['font-size'] = value
        break
      case 'font-family':
        result['font-family'] = value
        break
      case 'font-weight':
        result['font-weight'] = value
        break
      case 'line-height':
        result['line-height'] = value
        break
      case 'text-align':
      case 'align':
        result['text-align'] = value
        break
      case 'letter-spacing':
        result['letter-spacing'] = value
        break

      // Image
      case 'src':
        result['src'] = value
        break
      case 'alt':
        result['alt'] = value
        break
      case 'width':
        result['width'] = value
        break
      case 'height':
        result['height'] = value
        break
      case 'href':
        result['href'] = value
        break

      // Button
      case 'border-radius':
        result['border-radius'] = value
        break

      // Divider
      case 'border-color':
        result['border-color'] = value
        break
      case 'border-width':
        result['border-width'] = value
        break

      // Skip attributes with no mailc equivalent.
      case 'vertical-align':
      case 'css-class':
        break

      default:
        // Pass through unknown attributes
        result[key] = value
    }
  }

  return result
}

function buildAttributes(attrs: Record<string, string>): string {
  return Object.entries(attrs)
    .filter(([, value]) => value !== '' && value !== undefined)
    .map(([key, value]) => `${key}="${value.replace(/"/g, '&quot;')}"`)
    .join(' ')
}

function renderComponent(component: EmailComponent, indent: number = 4): string {
  const pad = ' '.repeat(indent)
  const mcType = TYPE_MAP[component.type] ?? 'mc-text'

  // Handle social — render as inline image links + labels.
  if (component.type === 'mc-social') {
    const align = component.attributes['align'] || 'center'
    const iconSize = component.attributes['icon-size'] || '24px'
    const fontSize = component.attributes['font-size'] || '12px'
    const padding = component.attributes['padding'] || '10px 25px'

    const items = Object.values(SOCIAL_ICONS)
      .map((info) => {
        const sz = parseInt(iconSize)
        return `<a href="#" target="_blank" style="text-decoration:none;display:inline-block;vertical-align:middle;margin:0 5px;"><img src="${info.icon}" alt="${info.label}" width="${sz}" height="${sz}" style="display:inline-block;border-radius:3px;vertical-align:middle;" /></a><span style="font-size:${fontSize};font-family:Arial,sans-serif;color:#333333;vertical-align:middle;">${info.label}</span>`
      })
      .join('&nbsp;&nbsp;')

    return `${pad}<mc-text text-align="${align}" padding="${padding}">${items}</mc-text>`
  }

  // Handle spacer
  if (component.type === 'mc-spacer') {
    const height = component.attributes['height'] || '20px'
    return `${pad}<mc-spacer height="${height}" />`
  }

  // Handle divider
  if (component.type === 'mc-divider') {
    const attrs = mapAttributes(component.type, component.attributes)
    const attrStr = buildAttributes(attrs)
    const attrPart = attrStr ? ` ${attrStr}` : ''
    return `${pad}<mc-divider${attrPart} />`
  }

  // Handle hero — emits a real <mc-hero>. mc-hero's compiler handles the
  // dual CSS/VML rendering; we forward attributes verbatim and emit children
  // directly (mc-hero accepts mc-text/mc-image/mc-button without an
  // intermediate mc-column). The builder-only `mode` attribute is dropped.
  if (component.type === 'mc-hero') {
    const heroAttrs: Record<string, string> = {}
    for (const [key, value] of Object.entries(component.attributes)) {
      if (!value || key === 'mode') continue
      heroAttrs[key] = value
    }
    const attrStr = buildAttributes(heroAttrs)
    const attrPart = attrStr ? ` ${attrStr}` : ''

    // Default fallback content so an empty hero renders something.
    const hasRealChildren = component.children && component.children.length > 0
    const childrenStr = hasRealChildren
      ? component.children!.map(c => renderComponent(c, indent + 2)).join('\n')
      : [
          `${pad}  <mc-text color="#ffffff" font-size="24px" font-family="Arial, sans-serif" text-align="center" padding="20px">Hero Section</mc-text>`,
          `${pad}  <mc-button background-color="#ffffff" color="#18181b" href="#" font-family="Arial, sans-serif">Learn More</mc-button>`,
        ].join('\n')

    return `${pad}<mc-hero${attrPart}>\n${childrenStr}\n${pad}</mc-hero>`
  }

  const mappedAttrs = mapAttributes(component.type, component.attributes)
  const attrStr = buildAttributes(mappedAttrs)
  const attrPart = attrStr ? ` ${attrStr}` : ''

  const hasChildren = component.children && component.children.length > 0
  const hasContent = component.content !== undefined && component.content !== ''

  if (hasChildren) {
    const childrenStr = component.children!.map(c => renderComponent(c, indent + 2)).join('\n')
    return `${pad}<${mcType}${attrPart}>\n${childrenStr}\n${pad}</${mcType}>`
  }

  if (hasContent) {
    return `${pad}<${mcType}${attrPart}>${component.content}</${mcType}>`
  }

  if (mcType === 'mc-image') {
    return `${pad}<${mcType}${attrPart} />`
  }

  return `${pad}<${mcType}${attrPart} />`
}

/**
 * mc-group's contract requires an mc-section parent. The builder allows
 * mc-group at root for UX, so we wrap any top-level mc-group in a generated
 * mc-section before emitting. mc-column at root is already wrapped by the
 * store at drop time, so the only orphan-at-root case left is mc-group.
 */
function wrapTopLevelOrphans(components: EmailComponent[]): EmailComponent[] {
  return components.map((c) => {
    if (c.type !== 'mc-group') return c
    return {
      id: `${c.id}-wrap`,
      type: 'mc-section',
      attributes: {},
      children: [c],
    }
  })
}

/**
 * Generates a mailc markup string from the component tree.
 */
export function generateMailcMarkup(components: EmailComponent[]): string {
  const normalised = wrapTopLevelOrphans(components)
  const body = normalised.map(c => renderComponent(c, 4)).join('\n')

  return `<mc>
  <mc-head>
    <mc-title>Email</mc-title>
  </mc-head>
  <mc-body background-color="#f4f4f5">
${body}
  </mc-body>
</mc>`
}

/**
 * Compiles the component tree to mailc HTML using the mailc browser build.
 */
export async function compileMailc(components: EmailComponent[]): Promise<string> {
  const markup = generateMailcMarkup(components)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mailc: any = await import('mailc/browser')
    const compile = mailc.compile ?? mailc.default?.compile
    if (!compile) throw new Error('mailc compile function not found')
    const result = compile(markup, { templateStyle: 'attribute' })
    if (result.html) return result.html
    // If there are errors but partial output, return a fallback
    if (result.errors?.length) {
      return `<!-- mailc errors: ${result.errors.map((e: { message: string }) => e.message).join(', ')} --><p style="color:red;font-family:sans-serif;padding:20px">mailc compilation errors — see console</p>`
    }
    return result.html ?? ''
  } catch (err) {
    console.error('mailc compile error', err)
    return `<!-- mailc unavailable: ${String(err)} -->`
  }
}
