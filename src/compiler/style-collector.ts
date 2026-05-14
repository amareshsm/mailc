/**
 * Style collector — wraps the CSS inliner to collect ENHANCE rules and stats.
 *
 * Every component compiler should call `collectAndInline()` instead of
 * `inlineCSS()` directly. This ensures ENHANCE style rules, responsive
 * classes, and compilation statistics are centrally collected on the
 * `CompileContext`.
 *
 * SM-C: When `context.debug === true`, also records style provenance
 * (tailwind-class and attribute origins) on the active source map entry.
 *
 * @module compiler/style-collector
 */

import type { CompileContext, StyleOrigin } from '../types.js';
import { inlineCSS } from '../css/inliner.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Result of collecting and inlining CSS for a single element. */
export interface CollectedInlineResult {
  /** CSS declarations for the `style` attribute. */
  inlineStyle: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolves Tailwind classes to inline styles and collects stats/warnings on the context.
 *
 * Wraps `inlineCSS()` to:
 * 1. Collect responsive class names to `context.responsiveClasses`.
 * 2. Update inlined/stripped stats on the context.
 * 3. Push warnings to `context.warnings`.
 * 4. (SM-C, debug mode) Record tailwind-class and attribute style origins on the
 *    active source map entry via `context.sourceMap`.
 *
 * ENHANCE properties are inlined alongside SAFE in liberal mode (no style block).
 * In strict mode they are stripped with warnings — handled inside `inlineCSS()`.
 *
 * @param classAttr  - The `class` attribute string.
 * @param context    - Compile context (mutated: responsiveClasses, stats, warnings).
 * @param attributes - Merged element attributes (for attribute precedence and origin tracking).
 * @param node       - The original AST node before attribute merging (for accurate origin tier).
 * @returns The inline result with the resolved style string.
 */
export function collectAndInline(
  classAttr: string,
  context: CompileContext,
  attributes: Record<string, string> = {},
  node?: { attributes: Record<string, string>; type: string },
): CollectedInlineResult {
  const result = inlineCSS(classAttr, context.theme, attributes, context.classificationMap, context.compatibilityMode);

  // Collect warnings
  context.warnings.push(...result.warnings);

  // Count inlined properties (SAFE props that made it into the inline style)
  const inlinedCount = result.inlineStyle
    ? result.inlineStyle.split(';').filter(Boolean).length
    : 0;
  context.counters.cssPropertiesInlined += inlinedCount;

  // Count stripped properties (BREAKING + NO_EFFECT + strict-mode ENHANCE)
  const strippedCount = result.warnings.filter(
    (w) => w.code === 'BREAKING_CSS' || w.code === 'NO_EFFECT_CSS' || w.code === 'ENHANCE_PROPERTY_STRIPPED',
  ).length;
  context.counters.cssPropertiesStripped += strippedCount;

  // Collect responsive classes (sm: prefixed) for media query generation
  const classes = classAttr.trim().split(/\s+/).filter(Boolean);
  for (const cls of classes) {
    if (cls.startsWith('sm:')) {
      context.responsiveClasses.push(cls);
    }
  }

  // SM-C: Record style provenance on the active source map entry (debug mode or clean source map)
  if (context.debug || context.cleanSourceMap) {
    const entryId = context.sourceMap.activeEntryId;
    if (entryId) {
      recordStyleOrigins(entryId, result.classOrigins, result.inlineStyle, attributes, context, node);
    }
  }

  return {
    inlineStyle: result.inlineStyle,
  };
}

/**
 * Records attribute-origin style provenance on the active source map entry,
 * independent of any `class=` resolution. Used by components that bypass
 * `collectAndInline()`'s normal attribute-precedence handling (e.g. divider
 * and spacer pass `{}` to avoid attribute stripping in the inliner) so they
 * can still get source-map provenance for attribute-mode elements.
 *
 * No-op when neither `debug` nor `cleanSourceMap` is active, or when there
 * is no active source map entry.
 *
 * @param context    - Compile context (has sourceMap).
 * @param attributes - Merged element attributes (post-getEffectiveAttributes).
 * @param node       - Original AST node (pre-merge) — enables accurate origin tier.
 */
export function recordAttributeStyleOrigins(
  context: CompileContext,
  attributes: Record<string, string>,
  node: { attributes: Record<string, string>; type: string },
): void {
  if (!context.debug && !context.cleanSourceMap) return;
  const entryId = context.sourceMap.activeEntryId;
  if (!entryId) return;
  recordStyleOrigins(entryId, {}, '', attributes, context, node);
}

// ---------------------------------------------------------------------------
// SM-C helpers
// ---------------------------------------------------------------------------

/**
 * Parses an inline style string into a property→value map.
 *
 * @param style - Style string like `"color:red;font-size:16px"`.
 * @returns Map of property → value.
 */
function parseInlineStyle(style: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!style) return map;
  for (const part of style.split(';')) {
    const idx = part.indexOf(':');
    if (idx === -1) continue;
    const prop = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (prop && val) map.set(prop, val);
  }
  return map;
}

/**
 * Records style provenance (tailwind-class and attribute origins) on a source
 * map entry. Called only when debug or cleanSourceMap is active.
 *
 * When `node` is provided, accurately identifies whether each attribute-derived
 * style came from the node itself (`'attribute'`), an `mc-class` bundle
 * (`'mc-class'`), or an `mc-attributes`/`mc-all` global default (`'mc-attributes'`).
 *
 * @param entryId      - The active source map entry ID.
 * @param classOrigins - Map of property → originating Tailwind class name.
 * @param inlineStyle  - The resolved inline style string.
 * @param attributes   - Merged element attributes (post-getEffectiveAttributes).
 * @param context      - Compile context (has sourceMap and propertySupportMap).
 * @param node         - Original AST node (pre-merge) — enables accurate origin tier.
 */
function recordStyleOrigins(
  entryId: string,
  classOrigins: Record<string, string>,
  inlineStyle: string,
  attributes: Record<string, string>,
  context: CompileContext,
  node?: { attributes: Record<string, string>; type: string },
): void {
  const styleMap = parseInlineStyle(inlineStyle);

  // Record tailwind-class origins for properties that came from Tailwind classes
  for (const [prop, className] of Object.entries(classOrigins)) {
    const value = styleMap.get(prop);
    if (!value) continue;  // property was overridden or stripped
    const style: StyleOrigin = {
      property: prop,
      value,
      origin: 'tailwind-class',
      originalValue: className,
      support: context.propertySupportMap?.get(prop),
    };
    context.sourceMap.addStyle(entryId, style);
  }

  // Compute per-attribute origin tiers when the original node is available.
  // Without node, everything falls back to 'attribute' (old behavior).
  const attrOrigins = node ? buildAttributeOriginMap(node, context) : null;

  // Record attribute origins for direct style attributes that aren't in classOrigins.
  // These are attributes like `color="#333"` that the component maps to CSS properties.
  // We can't know ALL attribute→CSS-property mappings from here, so we check for
  // common CSS-property-name attributes that appear directly on the element.
  const CSS_ATTRIBUTE_PROPS = new Set([
    'color', 'font-size', 'font-family', 'font-weight', 'line-height',
    'text-align', 'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'background-color', 'border', 'border-radius', 'width', 'height',
    'letter-spacing', 'text-decoration', 'text-transform', 'vertical-align',
  ]);

  for (const [attrName, attrValue] of Object.entries(attributes)) {
    if (!CSS_ATTRIBUTE_PROPS.has(attrName)) continue;
    if (classOrigins[attrName]) continue;  // class already recorded this property
    const origin: StyleOrigin['origin'] = attrOrigins?.get(attrName) ?? 'attribute';
    const style: StyleOrigin = {
      property: attrName,
      value: attrValue,
      origin,
      originalValue: attrValue,
      support: context.propertySupportMap?.get(attrName),
    };
    context.sourceMap.addStyle(entryId, style);
  }
}

/**
 * Builds a map from attribute name → style origin tier for a given node.
 *
 * Precedence (lowest → highest, matching getEffectiveAttributes):
 * 1. `mc-all` and `mc-{type}` defaults → `'mc-attributes'`
 * 2. `mc-class` named bundle attributes → `'mc-class'`
 * 3. Explicit node attributes → `'attribute'`
 *
 * @param node    - Original AST node (pre-merge attributes).
 * @param context - Compile context (has attributeDefaults and namedClasses).
 * @returns Map of CSS property name → origin tier.
 */
function buildAttributeOriginMap(
  node: { attributes: Record<string, string>; type: string },
  context: CompileContext,
): Map<string, StyleOrigin['origin']> {
  const origins = new Map<string, StyleOrigin['origin']>();

  // Tier 1 — mc-all and mc-{type} defaults (lowest priority)
  const allDefaults = context.attributeDefaults.get('mc-all') ?? {};
  const typeDefaults = context.attributeDefaults.get(node.type) ?? {};
  for (const key of Object.keys(allDefaults)) {
    origins.set(key, 'mc-attributes');
  }
  for (const key of Object.keys(typeDefaults)) {
    origins.set(key, 'mc-attributes');
  }

  // Tier 2 — mc-class named bundle attributes
  const mcClassName = node.attributes['mc-class'];
  if (mcClassName) {
    for (const className of mcClassName.trim().split(/\s+/).filter(Boolean)) {
      const resolved = context.namedClasses.get(className);
      if (resolved) {
        for (const key of Object.keys(resolved)) {
          origins.set(key, 'mc-class');
        }
      }
    }
  }

  // Tier 3 — explicit node attributes override everything (highest priority)
  for (const key of Object.keys(node.attributes)) {
    if (key !== 'mc-class' && key !== 'class') {
      origins.set(key, 'attribute');
    }
  }

  return origins;
}
