/**
 * Pure class-mode templates demonstrating brand-token theming via Tailwind
 * utilities (`bg-brand`, `text-brand-heading`, `p-[20px_40px]`, etc.).
 * Document-wide font-family flows through `<mc-attributes>` — CSS-prop
 * defaults there are exempt from class-mode rejection (the one mixed-syntax
 * spot). Each entry carries `themeColors` from default tokens so routes
 * without an editor (source-map) still render with correct brand colors.
 */

import { CLASS_TEMPLATES } from './_data/class.data'
import {
  CLASS_TOKENS,
  DEFAULT_CLASS_BRAND_MAPPINGS,
  buildThemeColorsWithMappings,
} from '@/lib/class-brand-tokens'
import type { Template } from './types'

/** Default brand → hex map. Computed once at module load. */
const DEFAULT_THEME_COLORS = buildThemeColorsWithMappings(
  CLASS_TOKENS,
  DEFAULT_CLASS_BRAND_MAPPINGS,
)

export const THEME_CLASS_TEMPLATES: Template[] = CLASS_TEMPLATES.map(
  (t): Template => ({
    id: t.id,
    label: t.name,
    category: 'theme-class',
    templateStyle: 'class',
    features: ['source-map-friendly'],
    markup: t.markup,
    themeColors: DEFAULT_THEME_COLORS,
  }),
)
