/**
 * Design tokens for the class-based brand theming demo.
 *
 * Each token has a UNIQUE semantic class name → unique CSS property target.
 * No two tokens ever share a default hex, so changing one token only
 * affects elements that use that specific class — zero hex-collision bugs.
 *
 * Token IDs here become Tailwind-style color names in the theme:
 *   id: 'brand'          → class="bg-brand"   resolves → background-color: <hex>
 *   id: 'brand-btn-text' → class="text-brand-btn-text" → color: <hex>
 */

export interface ClassToken {
  id: string
  label: string
  description: string
  hex: string
  exampleClass: string
  section: string
}

export const CLASS_TOKENS: ClassToken[] = [
  // Primary brand color — used for header bg, hero bg, button bg, links
  { id: 'brand',          label: 'Brand',         description: 'Header, hero, button background',  hex: '#2563eb', exampleClass: 'bg-brand',         section: 'Brand' },

  // Button text — separate token so it can be changed independently
  { id: 'brand-btn-text', label: 'Button Text',   description: 'Text on primary CTA buttons',      hex: '#ffffff', exampleClass: 'text-brand-btn-text', section: 'Brand' },

  // Typography — three independent tokens, all different hex values by default
  { id: 'brand-heading',  label: 'Heading',       description: 'Titles and section headings',       hex: '#111827', exampleClass: 'text-brand-heading',  section: 'Typography' },
  { id: 'brand-body',     label: 'Body Text',     description: 'Paragraph copy',                   hex: '#374151', exampleClass: 'text-brand-body',     section: 'Typography' },
  { id: 'brand-muted',    label: 'Muted',         description: 'Captions and meta text',           hex: '#6b7280', exampleClass: 'text-brand-muted',    section: 'Typography' },

  // Backgrounds — semantically separate even though some share white by default
  { id: 'brand-surface',  label: 'Card BG',       description: 'Content card background',          hex: '#ffffff', exampleClass: 'bg-brand-surface',    section: 'Background' },
  { id: 'brand-outer',    label: 'Outer BG',      description: 'Email outer wrapper',              hex: '#f4f6f9', exampleClass: 'bg-brand-outer',      section: 'Background' },

  // Social
  { id: 'brand-social',   label: 'Social Badge',  description: 'Social icon badge background',     hex: '#1d4ed8', exampleClass: 'bg-brand-social',     section: 'Social' },

  // Divider
  { id: 'brand-divider',  label: 'Divider',       description: 'Horizontal rule and borders',      hex: '#e5e7eb', exampleClass: 'bg-brand-divider',    section: 'Layout' },
]

/** Section groups for display */
export const CLASS_TOKEN_SECTIONS = ['Brand', 'Typography', 'Background', 'Social', 'Layout']

/** Default token hex values keyed by id */
export const DEFAULT_CLASS_HEX: Record<string, string> = Object.fromEntries(
  CLASS_TOKENS.map((t) => [t.id, t.hex])
)

/**
 * Builds the `theme.extend.colors` object for compile().
 * Each token id becomes a flat color name in the theme.
 */
export function buildThemeColors(tokens: ClassToken[]): Record<string, string> {
  return Object.fromEntries(tokens.map((t) => [t.id, t.hex]))
}

/**
 * Default brand mappings — each slot maps to itself (identity mapping).
 * slotId = a token id whose class is used in the templates (e.g. 'brand').
 * value  = the token whose CURRENT hex is injected into that slot.
 *
 * When the user remaps 'brand' → 'brand-heading', compile() receives
 * { colors: { brand: <brand-heading hex>, ... } } instead of brand's own hex.
 * Zero hex-collision: each slot is a separate key in the theme object.
 */
export const DEFAULT_CLASS_BRAND_MAPPINGS: Record<string, string> = Object.fromEntries(
  CLASS_TOKENS.map((t) => [t.id, t.id])
)

/**
 * Builds the theme.extend.colors map applying brand slot → token mappings.
 *
 * For each token slot, find which token it's mapped to and use that
 * token's current hex. This lets the brand tab remap 'brand' to any other
 * token's value without touching the template markup at all.
 */
export function buildThemeColorsWithMappings(
  tokens: ClassToken[],
  brandMappings: Record<string, string>,
): Record<string, string> {
  const hexByTokenId = Object.fromEntries(tokens.map((t) => [t.id, t.hex]))
  const result: Record<string, string> = {}
  for (const token of tokens) {
    const mappedId = brandMappings[token.id] ?? token.id
    result[token.id] = hexByTokenId[mappedId] ?? token.hex
  }
  return result
}
