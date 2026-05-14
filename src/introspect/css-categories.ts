/**
 * @file src/introspect/css-categories.ts
 *
 * Maps `CSSCategory` values to the CSS property names they contain, and
 * provides a reverse lookup (property → category).
 *
 * This module is the single source of truth for the category→property
 * mapping used by the introspection API.
 *
 * The `effects` and `layout` categories are derived directly from
 * `ENHANCE_PROPERTIES` and `ALWAYS_BREAKING` in `src/css/classifier.ts` —
 * no manual duplication. If the classifier changes, the categories update
 * automatically.
 *
 * Dependency rule: imports ONLY from `../css/classifier.js`.
 * NEVER imports from `compiler/*` or calls `compile()`.
 *
 * Phase 4 of the Introspection API build plan.
 *
 * @module introspect/css-categories
 */

import {
  ALWAYS_BREAKING,
  ALWAYS_NO_EFFECT,
  ENHANCE_PROPERTIES,
} from '../css/classifier.js';
import type { CSSCategory } from '../types.js';

// ---------------------------------------------------------------------------
// Static category maps
// ---------------------------------------------------------------------------

/**
 * Typography properties — safe across virtually all email clients.
 */
const TYPOGRAPHY_PROPERTIES: readonly string[] = [
  'color',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'letter-spacing',
  'line-height',
  'text-align',
  'text-decoration',
  'text-transform',
  'vertical-align',
  'white-space',
  'word-break',
  'word-spacing',
];

/**
 * Background properties — background-color is SAFE; image/size/position are
 * in ENHANCE_PROPERTIES, so they appear in `effects` rather than here.
 * This category covers only the universally-safe background properties.
 */
const BACKGROUND_PROPERTIES: readonly string[] = [
  'background',
  'background-color',
];

/**
 * Border longhand properties (shorthands may cause issues; longhands are safe).
 */
const BORDER_PROPERTIES: readonly string[] = [
  'border',
  'border-bottom',
  'border-bottom-color',
  'border-bottom-style',
  'border-bottom-width',
  'border-collapse',
  'border-color',
  'border-left',
  'border-left-color',
  'border-left-style',
  'border-left-width',
  'border-right',
  'border-right-color',
  'border-right-style',
  'border-right-width',
  'border-spacing',
  'border-style',
  'border-top',
  'border-top-color',
  'border-top-style',
  'border-top-width',
  'border-width',
];

/**
 * Spacing properties (margin / padding longhands).
 * margin-left and margin-right are in ENHANCE_PROPERTIES (partial support)
 * but included here for discoverability; the classifier is authoritative for
 * SAFE vs ENHANCE classification.
 */
const SPACING_PROPERTIES: readonly string[] = [
  'margin',
  'margin-bottom',
  'margin-left',
  'margin-right',
  'margin-top',
  'padding',
  'padding-bottom',
  'padding-left',
  'padding-right',
  'padding-top',
];

/**
 * Sizing properties.
 */
const SIZING_PROPERTIES: readonly string[] = [
  'height',
  'max-height',
  'max-width',
  'min-height',
  'min-width',
  'width',
];

/**
 * Display & position properties.
 * `display` and `position` are value-dependent — only certain values are
 * BREAKING (flex/grid for display; non-static for position). They cannot be
 * fully captured by the ALWAYS_BREAKING set, so they live here.
 *
 * `overflow`, `overflow-x`, `overflow-y` are unconditionally BREAKING and
 * therefore already in the `layout` category (derived from ALWAYS_BREAKING).
 * They are intentionally absent from this list to avoid a conflicting
 * category assignment.
 */
const DISPLAY_PROPERTIES: readonly string[] = [
  'display',
  'position',
];

// ---------------------------------------------------------------------------
// Derived category maps — no hardcoded lists, use classifier sets directly
// ---------------------------------------------------------------------------

/**
 * `effects` = ENHANCE_PROPERTIES from classifier.
 * Progressive enhancements — border-radius, box-shadow, opacity, etc.
 */
const EFFECTS_PROPERTIES: readonly string[] = [...ENHANCE_PROPERTIES];

/**
 * `layout` = ALWAYS_BREAKING from classifier.
 * These are documented only — no mailc component should accept them.
 */
const LAYOUT_PROPERTIES: readonly string[] = [...ALWAYS_BREAKING];

/**
 * `no-effect` = ALWAYS_NO_EFFECT from classifier.
 * Animation, transition, transform — stripped completely.
 */
const NO_EFFECT_PROPERTIES: readonly string[] = [...ALWAYS_NO_EFFECT];

// ---------------------------------------------------------------------------
// Category → properties map
// ---------------------------------------------------------------------------

const CATEGORY_MAP: Record<CSSCategory, readonly string[]> = {
  typography: TYPOGRAPHY_PROPERTIES,
  background: BACKGROUND_PROPERTIES,
  border: BORDER_PROPERTIES,
  spacing: SPACING_PROPERTIES,
  sizing: SIZING_PROPERTIES,
  display: DISPLAY_PROPERTIES,
  effects: EFFECTS_PROPERTIES,
  layout: LAYOUT_PROPERTIES,
};

// ---------------------------------------------------------------------------
// Reverse map: property → category (built once, lazily)
// ---------------------------------------------------------------------------

let _reverseMap: Map<string, CSSCategory> | null = null;

function getReverseMap(): Map<string, CSSCategory> {
  if (_reverseMap !== null) return _reverseMap;

  _reverseMap = new Map<string, CSSCategory>();
  for (const [category, properties] of Object.entries(CATEGORY_MAP) as [CSSCategory, readonly string[]][]) {
    for (const prop of properties) {
      // First category wins if a property appears in multiple categories.
      if (!_reverseMap.has(prop)) {
        _reverseMap.set(prop, category);
      }
    }
  }
  return _reverseMap;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns all CSS property names in a given category, as a readonly array.
 *
 * The `effects` category is derived from `ENHANCE_PROPERTIES` in
 * `src/css/classifier.ts` — if the classifier changes, this updates
 * automatically.
 *
 * The `layout` category is derived from `ALWAYS_BREAKING` — documented so
 * agents understand why those classes are rejected, not because they are
 * valid for any component.
 *
 * @param category - One of the seven CSS categories.
 * @returns Readonly array of CSS property name strings.
 *
 * @example
 * getPropertiesForCategory('typography'); // ['color', 'font-family', ...]
 * getPropertiesForCategory('effects');    // ['border-radius', 'box-shadow', ...]
 */
export function getPropertiesForCategory(category: CSSCategory): readonly string[] {
  return CATEGORY_MAP[category] ?? [];
}

/**
 * Returns the `CSSCategory` a property belongs to.
 * Returns `undefined` for properties not tracked in any category.
 *
 * If a property appears in multiple categories (e.g. margin-left is in
 * both `spacing` and `effects`), the first category in the map wins.
 *
 * @param property - A CSS property name (e.g. `'font-size'`, `'border-radius'`).
 * @returns The category, or `undefined` if not found.
 *
 * @example
 * getCategoryForProperty('font-size');    // 'typography'
 * getCategoryForProperty('border-radius'); // 'effects'
 * getCategoryForProperty('flex');          // 'layout'
 * getCategoryForProperty('unknown');       // undefined
 */
export function getCategoryForProperty(property: string): CSSCategory | undefined {
  return getReverseMap().get(property);
}

/**
 * Returns all CSS categories.
 *
 * @returns Array of all CSSCategory string literals.
 */
export function getAllCategories(): CSSCategory[] {
  return Object.keys(CATEGORY_MAP) as CSSCategory[];
}

/**
 * Clears the reverse map cache.
 * Intended for tests only.
 *
 * @internal
 */
export function _resetCssCategoriesCache(): void {
  _reverseMap = null;
}

/**
 * Exported so tests can verify no drift between the category map and
 * the classifier's ALWAYS_NO_EFFECT set.
 *
 * @internal
 */
export { NO_EFFECT_PROPERTIES };
