/**
 * Brand token & branding role definitions for the theme playground.
 *
 * TOKENS = named color values (editable in the Tokens tab).
 * BRAND MAPPINGS = semantic roles that point to a token (configurable in Brand tab via dropdown).
 *
 * The compile pipeline:
 *   1. User edits token hex values (Tokens tab)
 *   2. User maps roles → tokens (Brand tab)
 *   3. We compile mc markup, then find-replace default hex values with the resolved token hex
 *
 * IMPORTANT: defaultHex on each built-in token must exactly match the hex
 *            values baked into static-templates.ts.
 */

// ── Token types ─────────────────────────────────────────────────────────────

export type TokenCategory = 'primary' | 'text' | 'background' | 'social' | 'border' | 'custom'

export interface ColorToken {
  /** Unique id, used as key everywhere */
  id: string
  /** Human-readable name shown in UI */
  label: string
  /** Brief description */
  description: string
  /** Current hex value */
  hex: string
  /** UI grouping */
  category: TokenCategory
  /** Whether this is a user-created token */
  isCustom?: boolean
}

/** Built-in tokens shipped with every theme */
export const DEFAULT_TOKENS: ColorToken[] = [
  // ── Primary ──────────────────────────────────────────────────────
  { id: 'primary', label: 'Primary', description: 'Accent, button bg, header bg', hex: '#2563eb', category: 'primary' },
  { id: 'primaryDark', label: 'Primary Dark', description: 'Social icons, dark header', hex: '#1d4ed8', category: 'primary' },
  { id: 'primaryLight', label: 'Primary Light', description: 'Image accents, badges', hex: '#3b82f6', category: 'primary' },

  // ── Text ─────────────────────────────────────────────────────────
  { id: 'white', label: 'White', description: 'Button text, text on dark', hex: '#ffffff', category: 'text' },
  { id: 'headingText', label: 'Heading', description: 'Titles, section headings', hex: '#111827', category: 'text' },
  { id: 'bodyText', label: 'Body Text', description: 'Paragraphs, descriptions', hex: '#374151', category: 'text' },
  { id: 'mutedText', label: 'Muted', description: 'Captions, meta info', hex: '#6b7280', category: 'text' },

  // ── Background ───────────────────────────────────────────────────
  { id: 'bodyBg', label: 'Body Background', description: 'Email outer background', hex: '#f4f6f9', category: 'background' },
  { id: 'cardBg', label: 'Card Background', description: 'White sections, cards', hex: '#ffffff', category: 'background' },
  { id: 'cardAltBg', label: 'Card Alt', description: 'Feature cards, discussion bg', hex: '#f9fafb', category: 'background' },

  // ── Social ───────────────────────────────────────────────────────
  { id: 'socialIconBg', label: 'Social Icon Bg', description: 'Badge background', hex: '#1d4ed8', category: 'social' },
  { id: 'socialIconText', label: 'Social Icon Text', description: 'Icon text color', hex: '#ffffff', category: 'social' },
  { id: 'socialSubtext', label: 'Social Subtext', description: 'Label below icon', hex: '#93c5fd', category: 'social' },

  // ── Border ───────────────────────────────────────────────────────
  { id: 'divider', label: 'Divider', description: 'Horizontal rules, borders', hex: '#e5e7eb', category: 'border' },
  { id: 'darkDivider', label: 'Dark Divider', description: 'Dividers on dark sections', hex: '#374151', category: 'border' },
]

// ── Brand mapping types ─────────────────────────────────────────────────────

export interface BrandRole {
  /** Unique role id */
  role: string
  /** Human-readable label */
  label: string
  /** Description of where this appears */
  description: string
}

export interface BrandSection {
  section: string
  roles: BrandRole[]
}

/** All semantic roles grouped by section */
export const BRAND_SECTIONS: BrandSection[] = [
  {
    section: 'Buttons',
    roles: [
      { role: 'buttonBg', label: 'Button Background', description: 'CTA button fill color' },
      { role: 'buttonText', label: 'Button Text', description: 'Text on primary buttons' },
    ],
  },
  {
    section: 'Header',
    roles: [
      { role: 'headerBg', label: 'Header Background', description: 'Top banner / logo bar bg' },
      { role: 'headerText', label: 'Header Text', description: 'Brand name / logo text' },
    ],
  },
  {
    section: 'Links',
    roles: [
      { role: 'linkColor', label: 'Link / Accent', description: 'Inline links, "Read more →"' },
    ],
  },
  {
    section: 'Social Icons',
    roles: [
      { role: 'socialBg', label: 'Icon Background', description: 'Badge behind each icon' },
      { role: 'socialText', label: 'Icon Text', description: 'Symbol inside the badge' },
    ],
  },
  {
    section: 'Typography',
    roles: [
      { role: 'heading', label: 'Heading Color', description: 'Titles, section headings' },
      { role: 'body', label: 'Body Text', description: 'Paragraph body copy' },
      { role: 'muted', label: 'Muted / Caption', description: 'Metadata, secondary labels' },
    ],
  },
  {
    section: 'Layout',
    roles: [
      { role: 'bodyBg', label: 'Body Background', description: 'Email outer wrapper' },
      { role: 'cardBg', label: 'Card Background', description: 'White section backgrounds' },
      { role: 'divider', label: 'Divider', description: 'Horizontal rules' },
    ],
  },
]

/** Default role → tokenId mappings */
export const DEFAULT_BRAND_MAPPINGS: Record<string, string> = {
  buttonBg: 'primary',
  buttonText: 'white',
  headerBg: 'primary',
  headerText: 'white',
  linkColor: 'primary',
  socialBg: 'socialIconBg',
  socialText: 'socialIconText',
  heading: 'headingText',
  body: 'bodyText',
  muted: 'mutedText',
  bodyBg: 'bodyBg',
  cardBg: 'cardBg',
  divider: 'divider',
}

/** Token categories for display ordering */
export const TOKEN_CATEGORIES: { label: string; category: TokenCategory }[] = [
  { label: 'Primary', category: 'primary' },
  { label: 'Text', category: 'text' },
  { label: 'Background', category: 'background' },
  { label: 'Social Icons', category: 'social' },
  { label: 'Borders', category: 'border' },
  { label: 'Custom', category: 'custom' },
]
