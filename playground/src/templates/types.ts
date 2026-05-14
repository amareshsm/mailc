/**
 * Unified template registry types.
 *
 * Two orthogonal axes:
 *   - `category`     — what feature this template demonstrates. Drives which
 *                      routes surface it (a route filters by category).
 *   - `templateStyle`  — how the markup is authored. Flows directly into the
 *                      `templateStyle` option passed to mailc's `compile()`.
 *
 * Adding a new category or feature tag is non-breaking — existing consumers
 * stay on their current filter.
 */

/** Authoring style — flows directly into the mailc compile() option. */
export type TemplateStyle = 'class' | 'attribute'

/**
 * Top-level grouping. Each route filters by one (or a few) categories.
 *
 * - `theme-attribute` — attribute-mode brand-token demos (theme-attribute route).
 * - `theme-class`     — class-mode brand-token demos (theme-class route, also
 *                        surfaceable in the playground route with default tokens).
 * - `dynamic`         — templating demos that require `defaultData` (variables,
 *                        mc-if, mc-each).
 * - `showcase`        — generic, route-agnostic demos used by the playground route and
 *                        any future "look-and-feel" route.
 */
export type TemplateCategory =
  | 'showcase'
  | 'dynamic'
  | 'theme-class'
  | 'theme-attribute'

/**
 * Optional finer-grained tags. Use `getTemplatesByFeature` for cross-category
 * showcases (e.g. playground route surfaces every template tagged
 * `'source-map-friendly'`, regardless of category).
 */
export type TemplateFeature =
  | 'mc-each'
  | 'mc-if'
  | 'mc-class'
  | 'mc-attributes'
  | 'mc-table'
  | 'mc-image'
  | 'source-map-friendly'

/** Difficulty marker — preserved for the dynamic emails route's tier filter. */
export type TemplateLevel = 'basic' | 'intermediate' | 'advanced'

/**
 * Unified template shape across the playground.
 *
 * Consumers should never import raw template arrays — query the registry via
 * `getTemplatesByCategory(...)` or `getTemplatesByFeature(...)`.
 */
export interface Template {
  /** Stable, route-agnostic identifier. Persists across migrations. */
  id: string
  /** Display name shown in selectors. */
  label: string
  /** One-line description shown alongside the label. */
  description?: string

  /** Drives which routes surface this template. */
  category: TemplateCategory
  /** Drives the `templateStyle` option passed to `compile()`. */
  templateStyle: TemplateStyle
  /** Optional tags — routes can filter on these. */
  features?: TemplateFeature[]
  /** Optional difficulty marker (used by the dynamic emails route). */
  level?: TemplateLevel

  /** The .mc markup body. */
  markup: string
  /** Default data for templating demos (`{{var}}`, mc-if, mc-each). */
  defaultData?: Record<string, unknown>
  /**
   * Default brand-token colours injected as `theme.extend.colors` at compile
   * time. Only set on templates that use brand-token utility classes
   * (`bg-brand`, `text-brand-heading`, etc.). When absent the consumer passes
   * no theme override.
   *
   * The `/brand-theme-class` route may overlay user-edited values on top of
   * these defaults; routes without an editor (e.g. dynamic emails) just use the
   * defaults as-is.
   */
  themeColors?: Record<string, string>
}
