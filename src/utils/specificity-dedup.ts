/**
 * Specificity-aware property deduplication.
 *
 * Resolves conflicts when multiple CSS utilities set the same property.
 * Higher `specificity` always wins regardless of source order.
 * Equal `specificity` → last value wins (standard CSS cascade behaviour).
 *
 * This is needed because email output is a flat `style=""` string — there
 * is no stylesheet cascade, no selector specificity, no browser engine to
 * resolve conflicts. We have to do it ourselves before serialisation.
 *
 * @module utils/specificity-dedup
 */
import type { CSSProperty } from '../types.js';

/** A property entry with a resolved winner value and its winning specificity. */
interface Winner {
  value: string;
  specificity: number;
}

/**
 * Deduplicates an array of CSS properties using specificity, then order.
 *
 * Rules:
 * - Higher `specificity` wins regardless of position in the array.
 * - Equal `specificity` → last entry wins (CSS cascade / last-wins).
 * - Missing `specificity` defaults to `0`.
 *
 * @param props - Raw CSS properties, possibly with duplicates.
 * @returns Deduplicated array — one entry per property name, winners only.
 *
 * @example
 * deduplicateBySpecificity([
 *   { property: 'margin-top', value: '12px', specificity: 0 }, // m-3
 *   { property: 'margin-top', value: '24px', specificity: 1 }, // mt-6
 *   { property: 'margin-top', value: '20px', specificity: 0 }, // m-5
 * ])
 * // → [{ property: 'margin-top', value: '24px', specificity: 1 }]
 */
export function deduplicateBySpecificity(props: CSSProperty[]): CSSProperty[] {
  const winners = new Map<string, Winner>();

  for (const prop of props) {
    const incoming = prop.specificity ?? 0;
    const existing = winners.get(prop.property);

    // Higher specificity wins; equal specificity → last wins
    if (!existing || incoming >= existing.specificity) {
      winners.set(prop.property, { value: prop.value, specificity: incoming });
    }
  }

  return Array.from(winners.entries()).map(([property, winner]) => ({
    property,
    value: winner.value,
    specificity: winner.specificity,
  }));
}

/**
 * Serialises an array of CSS properties to an inline style string.
 *
 * Does NOT deduplicate — call `deduplicateBySpecificity` first if needed.
 *
 * @param props - CSS properties to serialise.
 * @returns Inline style string, e.g. `"color:#fff;font-size:16px"`.
 *
 * @example
 * serializeToInlineStyle([{ property: 'color', value: '#fff' }])
 * // → "color:#fff"
 */
export function serializeToInlineStyle(props: CSSProperty[]): string {
  return props.map(p => `${p.property}:${p.value}`).join(';');
}
