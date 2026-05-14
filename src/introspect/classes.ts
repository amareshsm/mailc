/**
 * `validClasses(componentType, options?)` — enumerates Tailwind-style class
 * names valid for a component, split SAFE / ENHANCE, plus rejected patterns
 * with reasons.
 *
 * Classification uses `buildClassificationMap()` — the same caniemail-backed
 * function the compiler calls — so `validClasses(..., { targetClients })` and
 * `compile(..., { targetClients })` always agree. Omitting `targetClients`
 * falls back to the static lists in `classifier.ts`, matching `compile()`
 * without `targetClients`.
 */

import { resolveClass } from '../css/resolver.js';
import { buildClassificationMap, buildProbeCSS, classifyProperty } from '../css/classifier.js';
import { buildPropertySupportMap } from '../css/checker.js';
import { DEFAULT_THEME } from '../css/theme-defaults.js';
import { resolveTargetClients } from '../config.js';
import { getComponentSpec } from './registry.js';
import type { CSSCategory, ResolvedTheme, ClassificationMap } from '../types.js';
import type {
  ValidClassesResult,
  ValidClassesOptions,
  ClassEntry,
  RejectedClassEntry,
} from './types.js';

// ---------------------------------------------------------------------------
// Structural rejected patterns (always apply, regardless of target clients)
//
// These are classes the resolver rejects before property resolution even
// happens (returns empty properties). They are layout-breaking by definition
// in ALL email clients, so caniemail per-client data adds no value here.
// Documenting them with `affectedClients: []` signals "all clients".
// ---------------------------------------------------------------------------

/**
 * Tailwind-style class patterns that are structurally invalid in email,
 * regardless of target clients. The resolver rejects these at parse time
 * (returns no CSS properties), so they cannot be classified dynamically.
 *
 * Used as the base rejected list. Client-specific rejected entries are
 * appended on top when `targetClients` is provided to `validClasses()`.
 */
export const REJECTED_PATTERNS: RejectedClassEntry[] = [
  {
    pattern: 'flex / inline-flex',
    reason: 'display:flex breaks table-based email layout.',
    affectedClients: [],
    alternative: 'Use mc-section/mc-column for layout.',
  },
  {
    pattern: 'grid / inline-grid',
    reason: 'display:grid is not supported in any major email client.',
    affectedClients: [],
    alternative: 'Use mc-section with multiple mc-column children.',
  },
  {
    pattern: 'absolute / fixed / sticky / relative',
    reason: 'Non-static positioning breaks email layout.',
    affectedClients: [],
    alternative: undefined,
  },
  {
    pattern: 'overflow-*',
    reason: 'overflow breaks layout in multiple email clients.',
    affectedClients: [],
    alternative: undefined,
  },
  {
    pattern: 'animate-* / transition-* / transform-*',
    reason: 'Animations and transforms have no effect in email clients. Stripped silently.',
    affectedClients: [],
    alternative: undefined,
  },
  {
    pattern: 'items-* / justify-*',
    reason: 'Flexbox alignment utilities have no effect without display:flex.',
    affectedClients: [],
    alternative: 'Use align-* for vertical alignment in table cells.',
  },
  {
    pattern: 'z-* / float-*',
    reason: 'Stacking and float contexts are unreliable in email clients.',
    affectedClients: [],
    alternative: undefined,
  },
  {
    pattern: 'rotate-* / scale-* / cursor-*',
    reason: 'Transform and cursor utilities have no effect in email clients.',
    affectedClients: [],
    alternative: undefined,
  },
];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Flattens the `theme.colors` map into an array of color name tokens.
 *
 * - Flat entries (e.g. `white: '#fff'`) → `['white']`
 * - Nested entries (e.g. `gray: { '50': '#f9fafb' }`) → `['gray-50']`
 * - Nested DEFAULT (e.g. `brand: { DEFAULT: '#e85d3a' }`) → `['brand']`
 *
 * @param colors - The colors record from a resolved theme.
 * @returns Flat array of color name tokens.
 */
function flattenColors(colors: Record<string, string | Record<string, string>>): string[] {
  const result: string[] = [];
  for (const [key, val] of Object.entries(colors)) {
    if (typeof val === 'string') {
      result.push(key);
    } else {
      for (const shade of Object.keys(val)) {
        result.push(shade === 'DEFAULT' ? key : `${key}-${shade}`);
      }
    }
  }
  return result;
}

/** Spacing prefix tokens → all class prefixes that draw from the spacing scale. */
const SPACING_PREFIXES = [
  'p', 'px', 'py', 'pt', 'pr', 'pb', 'pl',
  'm', 'mx', 'my', 'mt', 'mr', 'mb', 'ml',
] as const;

/**
 * Generates candidate class names from the resolved theme, optionally
 * restricted to a set of CSS categories.
 *
 * When `categories` is non-empty, only classes whose properties fall in
 * those categories are generated. This prevents `mc-spacer` from receiving
 * hundreds of irrelevant `font-*` suggestions.
 *
 * When `categories` is empty, ALL classes are generated (backwards-compat
 * for components that haven't specified categories yet).
 *
 * @param theme      - Resolved theme to enumerate.
 * @param categories - CSS category filter. Empty = no filter.
 * @returns Candidate class name strings.
 */
function generateCandidates(theme: ResolvedTheme, categories: CSSCategory[]): string[] {
  const cats = new Set(categories);
  const all  = cats.size === 0; // no filter — emit everything
  const has  = (cat: CSSCategory): boolean => all || cats.has(cat);

  const candidates: string[] = [];
  const colorNames = flattenColors(theme.colors);

  // Background + text colors
  if (has('background')) {
    for (const color of colorNames) candidates.push(`bg-${color}`);
  }
  if (has('typography')) {
    for (const color of colorNames) candidates.push(`text-${color}`);
  }

  // Border colors
  if (has('border')) {
    for (const color of colorNames) candidates.push(`border-${color}`);
  }

  // Spacing (padding + margin)
  if (has('spacing')) {
    for (const key of Object.keys(theme.spacing)) {
      for (const prefix of SPACING_PREFIXES) {
        candidates.push(`${prefix}-${key}`);
      }
    }
  }

  // Sizing
  if (has('sizing')) {
    for (const key of Object.keys(theme.width)) candidates.push(`w-${key}`);
    for (const key of Object.keys(theme.height)) candidates.push(`h-${key}`);
    for (const key of Object.keys(theme.maxWidth)) candidates.push(`max-w-${key}`);
  }

  // Typography
  if (has('typography')) {
    for (const key of Object.keys(theme.fontSize)) candidates.push(`text-${key}`);
    for (const key of Object.keys(theme.fontWeight)) candidates.push(`font-${key}`);
    for (const key of Object.keys(theme.fontFamily)) candidates.push(`font-${key}`);
    for (const key of Object.keys(theme.lineHeight)) candidates.push(`leading-${key}`);
    for (const key of Object.keys(theme.letterSpacing)) candidates.push(`tracking-${key}`);
    candidates.push('text-left', 'text-center', 'text-right', 'text-justify');
    candidates.push('underline', 'no-underline', 'line-through');
    candidates.push('uppercase', 'lowercase', 'capitalize', 'normal-case');
    candidates.push('italic', 'not-italic');
    candidates.push('whitespace-normal', 'whitespace-nowrap', 'whitespace-pre',
      'whitespace-pre-line', 'whitespace-pre-wrap');
    candidates.push('break-words', 'break-all');
    candidates.push('align-top', 'align-middle', 'align-bottom', 'align-baseline');
    // List-style utilities (resolve to list-style-type / list-style-position).
    // Surfaced under typography so mc-list and mc-list-item agents see them.
    candidates.push(
      'list-disc', 'list-circle', 'list-square', 'list-decimal',
      'list-lower-alpha', 'list-upper-alpha', 'list-lower-roman', 'list-upper-roman',
      'list-none', 'list-inside', 'list-outside',
    );
  }

  // Border radius, width, styles
  if (has('border')) {
    candidates.push('rounded');
    for (const key of Object.keys(theme.borderRadius)) {
      if (key !== 'DEFAULT') candidates.push(`rounded-${key}`);
    }
    candidates.push('border');
    for (const key of Object.keys(theme.borderWidth)) {
      if (key !== 'DEFAULT') candidates.push(`border-${key}`);
    }
    for (const side of ['t', 'r', 'b', 'l']) {
      candidates.push(`border-${side}`);
      for (const key of Object.keys(theme.borderWidth)) {
        if (key !== 'DEFAULT') candidates.push(`border-${side}-${key}`);
      }
    }
    candidates.push('border-solid', 'border-dashed', 'border-dotted', 'border-none');
  }

  // Display
  if (has('display')) {
    candidates.push('block', 'inline', 'inline-block', 'hidden');
  }

  return candidates;
}

/**
 * Produces a short human-readable description for a set of CSS properties.
 *
 * @param properties - Array of resolved CSS property/value pairs.
 * @returns A sentence like "Sets color to #3b82f6".
 */
function describeProperties(properties: { property: string; value: string }[]): string {
  if (properties.length === 1) {
    const [p] = properties as [{ property: string; value: string }];
    return `Sets ${p.property} to ${p.value}`;
  }
  const parts = properties.map(p => `${p.property}: ${p.value}`).join(', ');
  return `Sets ${parts}`;
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

/**
 * Two-level cache:
 *   Outer key: ResolvedTheme instance (WeakMap — no memory leak).
 *   Inner key: sorted targetClients string, or '' for no-clients (static fallback).
 *
 * Same (theme, clients) pair → identical { safe, enhance } object returned.
 */
const _cache = new WeakMap<ResolvedTheme, Map<string, { safe: ClassEntry[]; enhance: ClassEntry[] }>>();

/**
 * Builds (or returns cached) SAFE + ENHANCE class entry arrays.
 *
 * When `map` is provided, `classifyProperty` uses it — the same dynamic
 * caniemail-backed path the compiler takes. When omitted, the static
 * fallback path is used.
 *
 * @param theme      - Resolved theme to enumerate candidates from.
 * @param map        - Optional ClassificationMap from buildClassificationMap().
 * @param clientKey  - Cache key (sorted clients string, or '' for static path).
 * @param categories - CSS category filter (empty = all categories).
 * @returns Object with `safe` and `enhance` arrays.
 */
function buildClassEntries(
  theme: ResolvedTheme,
  map: ClassificationMap | undefined,
  clientKey: string,
  categories: CSSCategory[],
): { safe: ClassEntry[]; enhance: ClassEntry[] } {
  // Cache key includes both the client key and the category filter.
  const cacheKey = categories.length > 0
    ? `${clientKey}|cats:${[...categories].sort().join(',')}`
    : clientKey;

  let themeCache = _cache.get(theme);
  if (!themeCache) {
    themeCache = new Map();
    _cache.set(theme, themeCache);
  }
  const cached = themeCache.get(cacheKey);
  if (cached) return cached;

  const safe: ClassEntry[] = [];
  const enhance: ClassEntry[] = [];

  for (const candidate of generateCandidates(theme, categories)) {
    const resolved = resolveClass(candidate, theme);
    if (resolved.properties.length === 0) continue;

    // Classify ALL resolved properties — pass `map` when available so we
    // use the same caniemail-backed classification the compiler uses.
    let overallClassification: 'SAFE' | 'ENHANCE' | null = 'SAFE';
    for (const { property, value } of resolved.properties) {
      const cls = classifyProperty({ property, value }, map);
      if (cls === 'BREAKING' || cls === 'NO_EFFECT') {
        overallClassification = null;
        break;
      }
      if (cls === 'ENHANCE') {
        overallClassification = 'ENHANCE';
      }
    }

    if (overallClassification === null) continue;

    const entry: ClassEntry = {
      className: candidate,
      resolvedTo: resolved.properties.map(p => ({ property: p.property, value: p.value })),
      classification: overallClassification,
      description: describeProperties(resolved.properties),
    };

    if (overallClassification === 'SAFE') {
      safe.push(entry);
    } else {
      enhance.push(entry);
    }
  }

  const result = { safe, enhance };
  themeCache.set(cacheKey, result);
  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns SAFE classes, ENHANCE classes, and rejected patterns for a
 * component. Pass the same `targetClients` you pass to `compile()` and the
 * classifications match exactly. Components that don't accept `class` get
 * empty `safe`/`enhance` arrays; rejected patterns are always returned.
 *
 * @example
 * validClasses('mc-button', { targetClients: ['gmail.*', 'outlook.*'] });
 */
export function validClasses(
  componentType: string,
  options?: ValidClassesOptions,
): ValidClassesResult {
  const theme = options?.theme ?? DEFAULT_THEME;
  // Accept the same three shapes as CompileOptions: undefined | 'default' | string[].
  // `resolveTargetClients()` normalises 'default' to DEFAULT_CLIENTS; undefined
  // stays undefined → we collapse to [] for the local check below.
  const targetClients = resolveTargetClients(options?.targetClients) ?? [];
  const clientKey = [...targetClients].sort().join(',');

  const spec = getComponentSpec(componentType);

  // Build rejected list: structural patterns always present.
  // When targetClients are provided, also include client-specific entries
  // derived from buildPropertySupportMap (same caniemail data the compiler
  // uses) so the playground/IDE can show "not supported in gmail, outlook".
  let rejected: RejectedClassEntry[] = REJECTED_PATTERNS;
  if (targetClients.length > 0) {
    // Build a per-property support map to get affectedClients per property
    const probeCSS = buildProbeCSS();
    const supportMap = buildPropertySupportMap(targetClients, probeCSS);
    const clientEntries: RejectedClassEntry[] = [];
    for (const [property, support] of supportMap) {
      if (support.unsupported.length > 0) {
        clientEntries.push({
          pattern: property,
          reason: `Not supported in: ${support.unsupported.join(', ')}.`,
          affectedClients: support.unsupported,
          alternative: undefined,
        });
      }
    }
    rejected = clientEntries.length > 0
      ? [...REJECTED_PATTERNS, ...clientEntries]
      : REJECTED_PATTERNS;
  }

  // Unknown component or one that doesn't accept classes → empty safe/enhance
  if (!spec?.acceptsClassAttribute) {
    return { safe: [], enhance: [], rejected };
  }

  // Build classification map when targetClients provided — same call the
  // compiler makes, backed by the same caniemail query + caching.
  const map: ClassificationMap | undefined = targetClients.length > 0
    ? buildClassificationMap(targetClients)
    : undefined;

  const { safe, enhance } = buildClassEntries(theme, map, clientKey, spec.validClassCategories);
  return { safe, enhance, rejected };
}
