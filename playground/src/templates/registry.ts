/**
 * The single source of truth for every template in the playground.
 *
 * To add a new template: drop it into the matching category file
 * (theme-attribute.ts / theme-class.ts / dynamic.ts / showcase.ts) — it
 * appears here automatically.
 *
 * To add a new category: create a new file alongside, import it here,
 * extend `TemplateCategory` in `types.ts`.
 */

import { THEME_ATTRIBUTE_TEMPLATES } from './theme-attribute'
import { THEME_CLASS_TEMPLATES } from './theme-class'
import { DYNAMIC_REGISTRY } from './dynamic'
import { SHOWCASE_TEMPLATES } from './showcase'
import type { Template } from './types'

/**
 * Order matters — when consumers pick a default via `[0]` after filtering, the
 * order influences which template lands as the route's first selection.
 *
 *   - `SHOWCASE_TEMPLATES` first so the source-map route's default stays the
 *     `welcome-email` showcase (the historical first selection).
 *   - Other groups follow in stable order; consumers that filter by
 *     `category` get their own slice unaffected by cross-group ordering.
 */
export const TEMPLATES: Template[] = [
  ...SHOWCASE_TEMPLATES,
  ...DYNAMIC_REGISTRY,
  ...THEME_CLASS_TEMPLATES,
  ...THEME_ATTRIBUTE_TEMPLATES,
]
