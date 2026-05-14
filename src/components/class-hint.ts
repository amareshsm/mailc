/**
 * Resolves a raw `classHint` from `COMPONENT_METADATA` into a concrete
 * Tailwind class for a specific attribute value.
 *
 * Raw hints in metadata may contain:
 *   - the `#value` placeholder, replaced with the user's attribute value
 *     (e.g. `'bg-[#value]'` + `value: '#0066cc'` → `'bg-[#0066cc]'`)
 *   - alternative options separated by ` or ` or ` | `
 *     (e.g. `'underline or no-underline'`); the first becomes canonical,
 *     the rest become `alternatives`.
 *   - parenthetical prose (e.g. `'bg-[#value] (applied to inner td)'`,
 *     `'(use style="border: 1px solid #ccc")'`); stripped before parsing.
 *     A hint that is *only* prose returns empty canonical — the caller
 *     should omit `classHint` from the FixInstruction in that case.
 *
 * @module components/class-hint
 */

export interface ResolvedClassHint {
  /** The recommended Tailwind class with `#value` substituted. Empty if the hint had no class equivalent. */
  canonical: string;
  /** Alternative Tailwind classes the developer can choose from. */
  alternatives: string[];
}

/**
 * Resolve a raw classHint against an attribute value.
 *
 * @param hint  - The raw hint from `COMPONENT_METADATA[type].attributes[attr].classHint`.
 * @param value - The user's attribute value (e.g. `'#0066cc'`, `'16px'`, `'center'`).
 */
export function resolveClassHint(
  hint: string | undefined,
  value: string | undefined,
): ResolvedClassHint {
  if (!hint) return { canonical: '', alternatives: [] };

  // Strip parenthetical prose like `(applied to inner td)` or `(use style="...")`.
  const cleaned = hint.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return { canonical: '', alternatives: [] };

  // Split on ` or ` or ` | ` separators.
  const parts = cleaned.split(/\s+(?:or|\|)\s+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { canonical: '', alternatives: [] };

  // Substitute `#value` placeholder with the user's attribute value.
  const safeValue = value ?? '';
  const substituted = parts.map((p) => p.replace(/#value/g, safeValue));

  return {
    canonical: substituted[0] ?? '',
    alternatives: substituted.slice(1),
  };
}
