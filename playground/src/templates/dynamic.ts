/**
 * Dynamic templates — demonstrate `{{variable}}`, `mc-if`/`mc-else-if`,
 * `mc-each`. Each entry carries `defaultData` (used for live data binding)
 * and (optionally) a `level` difficulty marker shown in the dynamic emails
 * route.
 *
 * Aggregates two upstream sources:
 *   1. `lib/dynamic-templates.ts` — the dedicated dynamic showcase set.
 *   2. `lib/source-map-templates.ts` — entries with `defaultData` that ALSO
 *      demonstrate source-mapping. These are tagged `'source-map-friendly'`
 *      so the source-map route picks them up as well.
 *
 * All dynamic templates here are authored in attribute mode.
 */

import { DYNAMIC_TEMPLATES } from './_data/dynamic.data'
import { SOURCE_MAP_TEMPLATES } from './_data/source-map.data'
import type { Template, TemplateFeature } from './types'

// ── 1) From the dedicated dynamic-templates source ───────────────────────────

const FROM_DEDICATED: Template[] = DYNAMIC_TEMPLATES.map(
  (t): Template => ({
    id: t.id,
    label: t.name,
    description: t.description,
    category: 'dynamic',
    templateStyle: 'attribute',
    level: t.level,
    markup: t.markup,
    defaultData: t.defaultData,
  }),
)

// ── 2) Source-map templates that also have defaultData ──────────────────────

const SOURCE_MAP_DYNAMIC: Record<string, TemplateFeature[]> = {
  'loyalty-offer': ['source-map-friendly', 'mc-if'],
  'cart-recovery': ['source-map-friendly', 'mc-each'],
}

const FROM_SOURCE_MAP: Template[] = Object.entries(SOURCE_MAP_DYNAMIC).map(
  ([id, features]): Template => {
    const t = SOURCE_MAP_TEMPLATES.find((t) => t.id === id)
    if (!t) throw new Error(`[templates/dynamic] source-map template not found: ${id}`)
    return {
      id: t.id,
      label: t.label,
      description: t.description,
      category: 'dynamic',
      templateStyle: 'attribute',
      features,
      markup: t.markup,
      defaultData: t.defaultData,
    }
  },
)

export const DYNAMIC_REGISTRY: Template[] = [...FROM_DEDICATED, ...FROM_SOURCE_MAP]
