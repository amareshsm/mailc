/**
 * CSS classifier — classifies CSS properties for email compatibility.
 *
 * Supports two modes:
 *
 * 1. **Dynamic** (preferred) — uses a `ClassificationMap` built from caniemail
 *    data for the configured `targetClients`. The map is built once per
 *    compilation via `buildClassificationMap()`.
 *
 * 2. **Static fallback** — uses hardcoded property lists when no map is provided.
 *    This is the legacy behavior and only used when `targetClients` is not configured.
 *
 * Categories:
 * - **SAFE** — Works in all target email clients; inline directly.
 * - **ENHANCE** — Partial support; place in `<style>` block as progressive enhancement.
 * - **BREAKING** — Breaks layout in target clients; strip completely.
 * - **NO_EFFECT** — Does nothing in email clients; strip completely.
 *
 * @module css/classifier
 */
import { caniemail, groupIssues } from 'caniemail-sdk';

import type {
  CSSProperty,
  CSSClassification,
  ClassifiedCSS,
  ClassificationMap,
} from '../types.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * PassthroughMap — returned by `buildPassthroughMap()` when the caller
 * omitted `targetClients` (the default mode).
 *
 * For ENHANCE properties, classification short-circuits to SAFE so they get
 * inlined directly rather than routed through a `<style>` block. ALWAYS_BREAKING
 * and ALWAYS_NO_EFFECT rules still run inside `classifyProperty()` so
 * structurally unsafe CSS (`display:flex`, `position:absolute`, `transition`,
 * …) is stripped regardless of mode.
 */
class PassthroughMap extends Map<string, CSSClassification> {
  override get(_key: string): CSSClassification { return 'SAFE'; }
  override has(_key: string): boolean { return true; }
}

/**
 * Builds a passthrough classification map that treats every CSS property as SAFE.
 *
 * Used when the caller omitted `targetClients`. No caniemail queries are made.
 *
 * @returns A ClassificationMap where every property classifies as SAFE.
 */
export function buildPassthroughMap(): ClassificationMap {
  return new PassthroughMap();
}

/**
 * Module-level cache — keyed by sorted client list string.
 * Avoids calling caniemail() on every compile() invocation.
 */
const classificationCache = new Map<string, ClassificationMap>();

/**
 * Builds a classification map by probing caniemail with known CSS properties.
 *
 * Sends a single probe CSS string containing all classifiable properties to
 * `caniemail()`, then maps errors → BREAKING, warnings → ENHANCE, absent → SAFE.
 *
 * Hardcoded overrides are applied after the caniemail query:
 * - `ALWAYS_NO_EFFECT` properties (transition, animation, etc.) → NO_EFFECT.
 * - `ALWAYS_BREAKING` properties (flex, grid layout, etc.) → BREAKING.
 * - Per-side margin overrides (margin-top/bottom always SAFE).
 *
 * @param targetClients - Client globs, e.g. `["gmail.*", "outlook.*"]`.
 * @returns A map from CSS property name to classification.
 */
export function buildClassificationMap(
  targetClients: string[],
): ClassificationMap {
  const cacheKey = [...targetClients].sort().join(',');
  const cached = classificationCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const map: ClassificationMap = new Map();

  // Start with all probe properties as SAFE
  for (const prop of PROBE_PROPERTIES) {
    map.set(prop, 'SAFE');
  }

  // Query caniemail with probe CSS.
  //
  // Fast path: a single bulk call covering every probe property at once.
  //
  // Recovery path: caniemail throws on the FIRST missing (property × client)
  // pair it encounters (e.g. `Feature "table-layout" not found on
  // "thunderbird.macos"`) — and a thrown call discards results for all the
  // OTHER properties too. Without recovery we used to silently fall back to
  // SAFE-for-everything, which made broad client lists bypass the classifier
  // entirely. Instead, on throw we probe each property individually and
  // aggregate — failing pairs leave that property at its SAFE default, while
  // every other property still gets accurate classification.
  // Errors → ENHANCE for visual enhancement properties (border-radius, opacity, etc.).
  //
  // Caniemail "error" means "not supported", but for visual CSS properties
  // this is a graceful fallback — the email still renders, just without the effect.
  // That is ENHANCE semantics, not BREAKING. Truly layout-breaking properties
  // (flex, grid, position:absolute etc.) are ALL already in ALWAYS_BREAKING and
  // get set to BREAKING unconditionally in the override step below — caniemail
  // errors for them here would be redundant, so we skip non-ENHANCE_PROPERTIES.
  //
  // Warnings get the same treatment but get filtered through ENHANCE_PROPERTIES
  // too — caniemail issues warnings for broadly-used properties (font-size,
  // text-align, font-weight) because of minor client-specific quirks, not
  // because they are genuinely partial-support features. Blindly mapping all
  // warnings to ENHANCE would demote safe typography properties.
  const cssString = buildProbeCSS();
  try {
    const result = caniemail({
      clients: targetClients as Parameters<typeof caniemail>[0]['clients'],
      css: cssString,
    });
    applyEnhanceFromIssues(result.issues.errors, map);
    applyEnhanceFromIssues(result.issues.warnings, map);
  } catch {
    // Bulk probe failed — caniemail throws on the first missing (property ×
    // client) pair in its dataset, which discards results for every other
    // property too. Recover by probing each property individually: the
    // failing pair leaves that one property at its SAFE default, but every
    // other property still gets correct classification.
    probePropertiesIndividually(targetClients, map);
  }

  // Apply hardcoded overrides (structural properties caniemail may miss)
  for (const prop of ALWAYS_NO_EFFECT) {
    map.set(prop, 'NO_EFFECT');
  }
  for (const prop of ALWAYS_BREAKING) {
    map.set(prop, 'BREAKING');
  }

  // Per-side margin override: caniemail reports "margin" as one feature covering all
  // sides. FEATURE_TITLE_MAP expands this to all 4 longhands, so margin-top/bottom
  // could inherit ENHANCE from the caniemail warning. Override them back to SAFE —
  // margin-top and margin-bottom are universally safe in email at any positive value.
  map.set('margin-top', 'SAFE');
  map.set('margin-bottom', 'SAFE');

  classificationCache.set(cacheKey, map);
  return map;
}

/**
 * Apply a caniemail issue map to the classification map by promoting any
 * affected property in our ENHANCE_PROPERTIES whitelist to `ENHANCE`.
 *
 * Same rule for errors and warnings — caniemail's distinction between the
 * two is whether the property is "broken" or "partial," but for our visual
 * enhancement category both outcomes mean "don't rely on it everywhere."
 * Properties not in ENHANCE_PROPERTIES are intentionally NOT demoted here
 * (caniemail emits noisy warnings for broadly-safe typography props that
 * we don't want to demote — see comment in the call site).
 */
function applyEnhanceFromIssues(
  issues: ReturnType<typeof caniemail>['issues']['errors'],
  map: ClassificationMap,
): void {
  const groups = groupIssues(issues);
  for (const group of groups) {
    const props = featureTitleToProperties(group.issue.title);
    for (const prop of props) {
      if (map.get(prop) !== 'ENHANCE' && ENHANCE_PROPERTIES.has(prop)) {
        map.set(prop, 'ENHANCE');
      }
    }
  }
}

/**
 * Probe each probe property in isolation, mutating `map` for the ones that
 * report errors or warnings.
 *
 * Used as the recovery path when the bulk `caniemail()` call throws because
 * a single (property × client) pair is missing in caniemail's dataset. The
 * bulk call's design is "throw on first miss"; calling once per property
 * confines each potential miss to that one property's slot.
 *
 * Properties whose individual probe also throws are simply skipped — they
 * keep the SAFE default that's already in the classification map. That's
 * the correct semantic: if we can't prove a property is partial/broken,
 * treat it as safe.
 *
 * Performance: only invoked when bulk fails (most users never hit this).
 * Result feeds the same module-level classification cache as the fast path,
 * so the per-property fan-out happens once per unique client list.
 */
function probePropertiesIndividually(
  clients: string[],
  map: ClassificationMap,
): void {
  const typedClients = clients as Parameters<typeof caniemail>[0]['clients'];
  for (const prop of PROBE_PROPERTIES) {
    const value = PROBE_VALUES[prop] ?? '1px';
    const css = `.mc-probe { ${prop}: ${value}; }`;
    try {
      const r = caniemail({ clients: typedClients, css });
      applyEnhanceFromIssues(r.issues.errors, map);
      applyEnhanceFromIssues(r.issues.warnings, map);
    } catch {
      // This (property × clients) pair has incomplete dataset coverage.
      // Skip — leave the property at the SAFE default already in the map.
    }
  }
}

/**
 * Classifies a single CSS property for email compatibility.
 *
 * When a `ClassificationMap` is provided, it is consulted first.
 * Falls back to hardcoded static lists if no map is provided or if
 * the property is not in the map.
 *
 * @param prop - The CSS property to classify.
 * @param map  - Optional pre-built classification map from `buildClassificationMap()`.
 * @returns The classification: `SAFE`, `ENHANCE`, `BREAKING`, or `NO_EFFECT`.
 */
export function classifyProperty(
  prop: CSSProperty,
  map?: ClassificationMap,
): CSSClassification {
  const name = prop.property;
  const value = prop.value;

  // Hardcoded safety rules ALWAYS run first — even under passthrough mode.
  // ALWAYS_BREAKING properties (display:flex, position:absolute, float, …)
  // visibly corrupt Outlook's table layout when inlined; ALWAYS_NO_EFFECT
  // (transition, animation, transform, …) are dead bytes in every email
  // client. These aren't client-dependent — they're universal mailc rules,
  // and the user's "skip caniemail checking" decision must not bypass them.
  if (isNoEffectProperty(name)) return 'NO_EFFECT';
  if (isBreakingProperty(name, value)) return 'BREAKING';

  // Passthrough: client-targeting check was disabled by the caller.
  // ENHANCE → SAFE so properties get inlined directly rather than routed
  // through a <style> block (no client list means we can't reason about
  // who supports what).
  if (map instanceof PassthroughMap) return 'SAFE';

  // Dynamic path: use map if available
  if (map) {
    const mapped = map.get(name);
    if (mapped !== undefined) {
      return mapped;
    }
    // Property not in map — fall through to static classification
  }

  // Static fallback path (no classification map provided)
  if (isEnhanceProperty(name)) {
    return 'ENHANCE';
  }

  return 'SAFE';
}

/**
 * Classifies an array of CSS properties.
 *
 * @param props - Array of CSS properties to classify.
 * @param map   - Optional pre-built classification map.
 * @returns Array of classified CSS properties.
 */
export function classifyProperties(
  props: CSSProperty[],
  map?: ClassificationMap,
): ClassifiedCSS[] {
  const result: ClassifiedCSS[] = [];
  for (const prop of props) {
    result.push({
      property: prop,
      classification: classifyProperty(prop, map),
    });
  }
  return result;
}

/**
 * Filters classified properties by classification.
 *
 * @param classified     - Array of classified CSS properties.
 * @param classification - The classification to filter by.
 * @returns Filtered array.
 */
export function filterByClassification(
  classified: ClassifiedCSS[],
  classification: CSSClassification,
): ClassifiedCSS[] {
  return classified.filter((c) => c.classification === classification);
}

// ---------------------------------------------------------------------------
// Probe CSS — properties we query caniemail about
// ---------------------------------------------------------------------------

/**
 * All CSS properties we want to classify dynamically.
 * This list covers the properties that our resolver can emit.
 */
const PROBE_PROPERTIES: readonly string[] = [
  // Box model
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  // Border
  'border', 'border-width', 'border-style', 'border-color',
  'border-top', 'border-right', 'border-bottom', 'border-left',
  'border-radius', 'border-top-left-radius', 'border-top-right-radius',
  'border-bottom-left-radius', 'border-bottom-right-radius',
  // Sizing
  'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
  // Typography
  'color', 'font-size', 'font-family', 'font-weight', 'font-style',
  'line-height', 'letter-spacing', 'text-align', 'text-decoration',
  'text-transform', 'white-space', 'word-break', 'word-spacing',
  'vertical-align',
  // Background
  'background', 'background-color', 'background-image', 'background-size',
  'background-position', 'background-repeat',
  // Visual
  'opacity', 'box-shadow', 'text-shadow',
  // Table
  'border-collapse', 'border-spacing', 'table-layout',
  // Display & position
  'display', 'overflow', 'overflow-x', 'overflow-y',
  'position', 'top', 'right', 'bottom', 'left',
  'float', 'clear', 'z-index',
  // Flex (overridden to BREAKING by ALWAYS_BREAKING)
  'flex', 'flex-direction', 'flex-wrap', 'align-items', 'justify-content',
  // Grid (overridden to BREAKING by ALWAYS_BREAKING)
  'grid-template-columns', 'grid-template-rows', 'gap',
  // List
  'list-style', 'list-style-type',
] as const;

/**
 * Builds the probe CSS string sent to caniemail.
 *
 * Exported so the checker module can reuse the same probe CSS for building
 * the property support map without a separate caniemail call.
 *
 * @returns CSS string like `.mc-probe { color: red; font-size: 16px; ... }`
 */
export function buildProbeCSS(): string {
  const declarations = PROBE_PROPERTIES.map(
    (prop) => `${prop}: ${PROBE_VALUES[prop] ?? '1px'}`,
  ).join('; ');
  return `.mc-probe { ${declarations}; }`;
}

/** Probe values — realistic values for caniemail feature detection. */
const PROBE_VALUES: Record<string, string> = {
  'color': 'red',
  'background-color': 'red',
  'background-image': 'url(x.png)',
  'background-size': 'cover',
  'background-position': 'center',
  'background-repeat': 'no-repeat',
  'font-size': '16px',
  'font-family': 'Arial',
  'font-weight': 'bold',
  'font-style': 'italic',
  'line-height': '1.5',
  'letter-spacing': '0.5px',
  'text-align': 'center',
  'text-decoration': 'underline',
  'text-transform': 'uppercase',
  'white-space': 'nowrap',
  'word-break': 'break-all',
  'word-spacing': '2px',
  'vertical-align': 'middle',
  'opacity': '0.5',
  'box-shadow': '0 0 4px red',
  'text-shadow': '0 0 4px red',
  'display': 'block',
  'overflow': 'hidden',
  'overflow-x': 'hidden',
  'overflow-y': 'hidden',
  'position': 'static',
  'float': 'left',
  'clear': 'both',
  'z-index': '1',
  'flex': '1',
  'flex-direction': 'row',
  'flex-wrap': 'wrap',
  'align-items': 'center',
  'justify-content': 'center',
  'grid-template-columns': '1fr',
  'grid-template-rows': '1fr',
  'gap': '10px',
  'border': '1px solid red',
  'border-width': '1px',
  'border-style': 'solid',
  'border-color': 'red',
  'border-collapse': 'collapse',
  'border-spacing': '0',
  'table-layout': 'fixed',
  'border-radius': '4px',
  'list-style': 'none',
  'list-style-type': 'disc',
  'margin': '10px',
  'margin-top': '10px',
  'margin-right': '10px',
  'margin-bottom': '10px',
  'margin-left': '10px',
  'padding': '10px',
  'padding-top': '10px',
  'padding-right': '10px',
  'padding-bottom': '10px',
  'padding-left': '10px',
  'width': '100px',
  'height': '100px',
  'min-width': '50px',
  'max-width': '600px',
  'min-height': '50px',
  'max-height': '600px',
};

// ---------------------------------------------------------------------------
// Feature title → property name mapping
// ---------------------------------------------------------------------------

/**
 * Maps a caniemail feature title to CSS property names it covers.
 *
 * caniemail returns titles like `"border-radius"`, `"margin"`, `"opacity"` —
 * plain property names, no `"CSS "` prefix. For titles that map to a single
 * property the title IS the property name. For compound titles (e.g. `"margin"`
 * covers all 4 sides + shorthand) we maintain an explicit lookup table.
 *
 * Non-property titles like `"Class selector"` or `"display:flex"` are ignored
 * (return `[]`).
 *
 * @param title - The caniemail feature title.
 * @returns Array of CSS property names covered by this title.
 */
function featureTitleToProperties(title: string): string[] {
  const normalized = title.toLowerCase().trim();

  // Check explicit map first — handles compound/ambiguous titles.
  const explicit = FEATURE_TITLE_MAP[normalized];
  if (explicit !== undefined) {
    return explicit;
  }

  // If the title looks like a plain CSS property name (e.g. "opacity",
  // "background-image", "font-weight"), use it directly.
  if (/^[a-z][a-z-]*$/.test(normalized)) {
    return [normalized];
  }

  // Ignore non-property titles: "Class selector", "display:flex", etc.
  return [];
}

/**
 * Explicit mapping from caniemail feature titles to CSS property names.
 *
 * Only entries where the title covers multiple CSS properties are listed here.
 * Single-property titles (where title === property name) are handled by the
 * `/^[a-z][a-z-]*$/` fallback in `featureTitleToProperties`.
 *
 * Keys must exactly match the lowercase title returned by caniemail. Verified
 * against live caniemail-sdk output — titles are plain property names with NO
 * `"CSS "` prefix.
 */
const FEATURE_TITLE_MAP: Record<string, string[]> = {
  // caniemail title "margin" covers the shorthand and all 4 individual sides.
  'margin': [
    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  ],
  // caniemail title "padding" covers the shorthand and all 4 individual sides.
  'padding': [
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  ],
  // caniemail title "border" covers shorthand and all side/sub-properties.
  'border': [
    'border', 'border-width', 'border-style', 'border-color',
    'border-top', 'border-right', 'border-bottom', 'border-left',
  ],
  // caniemail title "border-radius" covers shorthand and all 4 corner properties.
  'border-radius': [
    'border-radius', 'border-top-left-radius', 'border-top-right-radius',
    'border-bottom-left-radius', 'border-bottom-right-radius',
  ],
  // caniemail title "background" covers both the shorthand and background-color.
  'background': [
    'background', 'background-color',
  ],
  // caniemail returns this exact comma-separated title for the gap feature group.
  'gap, column-gap, row-gap': ['gap', 'column-gap', 'row-gap'],
  // caniemail returns this exact title for all grid-template-* properties.
  'grid-template-* properties': [
    'grid-template-columns', 'grid-template-rows',
    'grid-template-areas', 'grid-template',
  ],
  // caniemail groups these positioning properties under one title.
  'left, right, top, bottom': ['left', 'right', 'top', 'bottom'],
  // caniemail title "list-style" covers the shorthand and list-style-type.
  'list-style': ['list-style', 'list-style-type'],
};

// ---------------------------------------------------------------------------
// Hardcoded overrides — structural properties caniemail may under-report
// ---------------------------------------------------------------------------

/**
 * Properties that NEVER work in email clients, regardless of caniemail data.
 * Structural CSS features that fundamentally break table-based layouts.
 *
 * Exported for use by the introspection API (`src/introspect/css-categories.ts`).
 * Do not duplicate this list elsewhere — import it instead.
 */
export const ALWAYS_BREAKING = new Set([
  'flex-direction', 'flex-wrap', 'flex-flow', 'flex-grow', 'flex-shrink',
  'flex-basis', 'flex',
  'align-items', 'align-self', 'align-content',
  'justify-content', 'justify-items', 'justify-self', 'order',
  'gap', 'row-gap', 'column-gap',
  'grid-template-columns', 'grid-template-rows', 'grid-template-areas',
  'grid-template', 'grid-column', 'grid-column-start', 'grid-column-end',
  'grid-row', 'grid-row-start', 'grid-row-end', 'grid-area',
  'grid-auto-columns', 'grid-auto-rows', 'grid-auto-flow', 'grid',
  'top', 'right', 'bottom', 'left',
  'float', 'clear', 'z-index',
  // overflow breaks layout in email (hidden/scroll strips content in several clients)
  'overflow', 'overflow-x', 'overflow-y',
]);

/**
 * Properties that have NO effect in any email client.
 * Animations, transitions, transforms — email is static.
 *
 * Exported for use by the introspection API (`src/introspect/css-categories.ts`).
 * Do not duplicate this list elsewhere — import it instead.
 */
export const ALWAYS_NO_EFFECT = new Set([
  'transition', 'transition-property', 'transition-duration',
  'transition-timing-function', 'transition-delay',
  'animation', 'animation-name', 'animation-duration',
  'animation-timing-function', 'animation-delay',
  'animation-iteration-count', 'animation-direction',
  'animation-fill-mode', 'animation-play-state',
  'transform', 'rotate', 'scale', 'translate',
  'cursor', 'outline', 'outline-width', 'outline-style',
  'outline-color', 'outline-offset',
  'pointer-events', 'user-select', 'resize',
  'scroll-behavior', 'will-change',
]);

// ---------------------------------------------------------------------------
// Static fallback lists (legacy — used when no ClassificationMap)
// ---------------------------------------------------------------------------

// ALWAYS_BREAKING and ALWAYS_NO_EFFECT (defined above) are the single source
// of truth. The static path reuses them directly — no separate copies.

const BREAKING_DISPLAY_VALUES = new Set([
  'flex', 'inline-flex', 'grid', 'inline-grid',
]);

const BREAKING_POSITION_VALUES = new Set([
  'absolute', 'relative', 'fixed', 'sticky',
]);

/**
 * CSS properties with partial email-client support.
 * Applied as progressive enhancements in a `<style>` block rather than inlined.
 *
 * Exported for use by the introspection API (`src/introspect/css-categories.ts`).
 * Do not duplicate this list elsewhere — import it instead.
 */
export const ENHANCE_PROPERTIES = new Set([
  'border-radius', 'border-top-left-radius', 'border-top-right-radius',
  'border-bottom-left-radius', 'border-bottom-right-radius',
  'box-shadow', 'opacity',
  'background-image', 'background-size', 'background-position',
  'background-repeat', 'background-attachment',
  // margin-left and margin-right were removed: caniemail warns about negative margin values,
  // but the class resolver cannot produce negative values via Tailwind utilities. At all
  // values the resolver generates, margin-left/right are safe to inline.
]);

// ---------------------------------------------------------------------------
// Static classification helpers
// ---------------------------------------------------------------------------

function isNoEffectProperty(name: string): boolean {
  return ALWAYS_NO_EFFECT.has(name);
}

function isBreakingProperty(name: string, value: string): boolean {
  if (ALWAYS_BREAKING.has(name)) return true;
  if (name === 'display' && BREAKING_DISPLAY_VALUES.has(value)) return true;
  if (name === 'position' && BREAKING_POSITION_VALUES.has(value)) return true;
  return false;
}

function isEnhanceProperty(name: string): boolean {
  return ENHANCE_PROPERTIES.has(name);
}
