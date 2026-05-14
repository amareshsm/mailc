/**
 * Theme-attribute templates — attribute-mode brand demos used by the
 * `/brand-theme-attribute` route. Authored with hardcoded hex values that
 * the theme-playground replaces at compile time via `theme.extend.colors`.
 *
 * These re-shape `STATIC_TEMPLATES` (the raw data source) into the unified
 * `Template` schema. The raw data file is treated as a private internal —
 * consumers must go through `@/templates`.
 */

import { STATIC_TEMPLATES } from './_data/static.data'
import type { Template } from './types'

export const THEME_ATTRIBUTE_TEMPLATES: Template[] = STATIC_TEMPLATES.map(
  (t): Template => ({
    id: t.id,
    label: t.name,
    category: 'theme-attribute',
    templateStyle: 'attribute',
    markup: t.markup,
  }),
)
