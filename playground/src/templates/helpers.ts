/**
 * Pure read helpers over a `Template[]` registry.
 *
 * These helpers take the registry as their first argument so they're easily
 * unit-testable and don't reach for module-level singletons.
 *
 * Most callers will pass `TEMPLATES` from the barrel — see `index.ts`.
 */

import type {
  Template,
  TemplateCategory,
  TemplateFeature,
  TemplateStyle,
} from './types'

/**
 * Filter the registry by category.
 *
 * Use in stores or components that should display templates of a given kind
 * (e.g. the dynamic emails route filters `'dynamic'`).
 */
export function getTemplatesByCategory(
  registry: readonly Template[],
  category: TemplateCategory,
): Template[] {
  return registry.filter((t) => t.category === category)
}

/**
 * Filter the registry by a feature tag — useful for cross-category showcases
 * (e.g. playground route surfaces every template tagged `'source-map-friendly'`,
 * across both `'showcase'` and `'dynamic'` categories).
 */
export function getTemplatesByFeature(
  registry: readonly Template[],
  feature: TemplateFeature,
): Template[] {
  return registry.filter((t) => t.features?.includes(feature) ?? false)
}

/** Lookup by id. Returns null when id is null/undefined or not found. */
export function getTemplateById(
  registry: readonly Template[],
  id: string | null | undefined,
): Template | null {
  if (!id) return null
  return registry.find((t) => t.id === id) ?? null
}

/**
 * Derive the mailc `compile()` options block that accompanies this template.
 *
 * Encapsulates the wiring so callers don't need to know about `templateStyle`,
 * `data`, or `theme.extend.colors` — they spread the result into `compile()`.
 *
 * Routes that allow user overrides (e.g. `/brand-theme-class` lets users
 * tweak brand tokens) can compute their own override and merge it AFTER
 * spreading this base. See `usePlaygroundCompilation` for a defaults-only
 * consumer.
 *
 * @returns Partial CompileOptions — `templateStyle` plus any of
 *          `{ data, theme }` the template carries.
 */
export function getCompileOptions(template: Template): {
  templateStyle: TemplateStyle
  data?: Record<string, unknown>
  theme?: { extend: { colors: Record<string, string> } }
} {
  return {
    templateStyle: template.templateStyle,
    ...(template.defaultData ? { data: template.defaultData } : {}),
    ...(template.themeColors
      ? { theme: { extend: { colors: template.themeColors } } }
      : {}),
  }
}
