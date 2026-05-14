/**
 * Introspection bridge for the visual builder.
 *
 * Builder types are 1:1 with mailc's component registry — except `mc-social`,
 * which is a builder-only aggregate (mailc has no `mc-social`, the builder
 * emits an `mc-text` with inline social-icon HTML). This module canonicalises
 * `mc-social` to `mc-text` before calling `introspect.canNest()` /
 * `introspect.component()` so the builder reuses the same nesting and spec
 * predicates the compiler enforces at validate/compile time.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mailc: any = await import('mailc/browser')
const introspect = mailc.introspect ?? mailc.default?.introspect

/**
 * Maps builder-only aggregate types to the mc type they actually compile to.
 * Real mc types not listed here pass through `canonicalMcType()` unchanged.
 */
const BUILDER_AGGREGATE_TO_MC: Record<string, string> = {
  'mc-social': 'mc-text',
}

export function canonicalMcType(builderType: string): string {
  return BUILDER_AGGREGATE_TO_MC[builderType] ?? builderType
}

/**
 * Returns true iff `child` can be a direct child of `parent`. Canonicalises
 * builder aggregates first, then delegates to `introspect.canNest`.
 * Conservative: returns false for unknown types.
 */
export function canNest(parentType: string | undefined, childType: string): boolean {
  // Root level — anything that maps to a body-level container is allowed.
  // (The store has separate auto-wrap logic that turns content drops at
  // root into wrapped sections, so we treat root as permissive here.)
  if (!parentType) return true
  try {
    return Boolean(introspect?.canNest?.(canonicalMcType(parentType), canonicalMcType(childType)))
  } catch {
    return false
  }
}

export interface ComponentSpecSummary {
  type: string
  category?: string
  parent?: string | string[]
  allowsTextContent?: boolean
}

/**
 * Returns a short spec summary for tooltips, or null if the component isn't
 * known to introspect (defensive — keeps the UI working even if a builder
 * type has no mc equivalent yet).
 */
export function specSummary(builderType: string): ComponentSpecSummary | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const spec: any = introspect?.component?.(canonicalMcType(builderType))
    if (!spec) return null
    return {
      type: spec.type,
      category: spec.category,
      parent: spec.parent,
      allowsTextContent: spec.allowsTextContent,
    }
  } catch {
    return null
  }
}
