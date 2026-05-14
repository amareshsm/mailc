/**
 * Showcase templates — generic, route-agnostic demos used by the source-map
 * route (and any future "look-and-feel" route). Each entry is tagged with its
 * authoring style (`templateStyle`) so consumers compile it correctly.
 *
 * Source data lives in `lib/source-map-templates.ts` (treated as a private
 * internal during the Phase B migration). Every entry below explicitly lists
 * the source-id, its `templateStyle`, and its `features`. Mistyped IDs throw
 * at module-load time — see the `byId` helper.
 */

import { SOURCE_MAP_TEMPLATES } from './_data/source-map.data'
import type { Template, TemplateFeature, TemplateStyle } from './types'


/**
 * Per-template metadata. The shape of the source-map-templates file does not
 * carry `templateStyle` — we tag it here based on actual authoring style
 * (verified by per-template script analysis, not section name).
 *
 * To add a new showcase template: add the source ID to one of the maps below.
 */
const ATTRIBUTE_ENTRIES: Record<string, TemplateFeature[]> = {
  'welcome-email':         ['source-map-friendly'],
  'two-column':            ['source-map-friendly'],
  'conditional-template':  ['source-map-friendly'],
  'password-reset':        ['source-map-friendly'],
  'newsletter':            ['source-map-friendly'],
  'invoice':               ['source-map-friendly', 'mc-table'],
  'pricing':               ['source-map-friendly'],
  'booking':               ['source-map-friendly', 'mc-table', 'mc-image'],
  'order-receipt':         ['source-map-friendly', 'mc-table'],
  'team-digest':           ['source-map-friendly', 'mc-image'],
  'mc-attributes-classes': ['source-map-friendly', 'mc-attributes', 'mc-class'],
  'mobile-stacking':       ['source-map-friendly'],
  'lists-attribute':       ['source-map-friendly'],
}

const CLASS_ENTRIES: Record<string, TemplateFeature[]> = {
  'premium-luxury-welcome':    ['source-map-friendly'],
  'santos-membership-balance': ['source-map-friendly'],
  'lists-class':               ['source-map-friendly'],
}

function byId(id: string): (typeof SOURCE_MAP_TEMPLATES)[number] {
  const t = SOURCE_MAP_TEMPLATES.find((t) => t.id === id)
  if (!t) throw new Error(`[templates/showcase] source-map template not found: ${id}`)
  return t
}

function buildEntries(
  meta: Record<string, TemplateFeature[]>,
  templateStyle: TemplateStyle,
): Template[] {
  return Object.entries(meta).map(([id, features]): Template => {
    const t = byId(id)
    return {
      id: t.id,
      label: t.label,
      description: t.description,
      category: 'showcase',
      templateStyle,
      features,
      markup: t.markup,
    }
  })
}

export const SHOWCASE_TEMPLATES: Template[] = [
  ...buildEntries(ATTRIBUTE_ENTRIES, 'attribute'),
  ...buildEntries(CLASS_ENTRIES, 'class'),
]
