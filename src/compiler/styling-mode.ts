/**
 * Styling-mode enforcement — two symmetric compile gates.
 *
 * In `templateStyle: 'class'`, CSS-property attributes on mc-components
 * produce compile errors. Users must express visual styling via `class=""`
 * Tailwind utilities instead.
 *
 * In `templateStyle: 'attribute'` (the default — see `DEFAULT_CONFIG` in
 * `src/config.ts`), the `class` attribute is rejected on every component.
 * Attribute mode is the styling mechanism; `class=` is reserved for
 * `templateStyle: 'class'`. This avoids a silent classifier bypass via
 * `class=` referencing rules in `<mc-style>` blocks.
 *
 * Structural HTML attrs (`bgcolor`, `width` on mc-column, `height` on
 * mc-hero, etc.) are always allowed in any mode.
 *
 * `<mc-attributes>` defaults are exempt from BOTH gates — they configure
 * document-level defaults, not per-element styling. The exemption is keyed
 * on whether the attribute was explicitly written on the node itself.
 *
 * @module compiler/styling-mode
 */

import { ErrorCode } from '../errors/codes.js';
import { COMPONENT_METADATA } from '../components/metadata.js';
import { CSS_PROP_ATTRS_BY_COMPONENT } from '../components/css-prop-attrs.js';
import { resolveClassHint } from './../components/class-hint.js';
import type { ASTNode, CompileContext } from '../types.js';

// ---------------------------------------------------------------------------
// CSS property attribute lists — per component
// ---------------------------------------------------------------------------

/**
 * Re-exported for backwards compatibility. The authoritative derivation lives
 * in `src/components/css-prop-attrs.ts` — both the compiler and the introspect
 * paths import from there, ensuring they can never diverge.
 */
export { CSS_PROP_ATTRS_BY_COMPONENT };

// ---------------------------------------------------------------------------
// Enforcement
// ---------------------------------------------------------------------------

/**
 * In class mode, asserts that `node` has no CSS-property attributes.
 *
 * Must NOT be called for nodes inside `<mc-attributes>` — those are
 * document-level configuration defaults and are intentionally exempt.
 *
 * @param node    - The component AST node being compiled.
 * @param context - Compile context carrying `templateStyle`.
 */
export function assertClassModeAttributes(
  node: ASTNode,
  context: CompileContext,
): void {
  if (context.templateStyle !== 'class') return;

  const banned = CSS_PROP_ATTRS_BY_COMPONENT[node.type];
  if (!banned) return;

  for (const attr of Object.keys(node.attributes)) {
    if (banned.has(attr)) {
      const rawHint = COMPONENT_METADATA[node.type]?.attributes[attr]?.classHint;
      const { canonical } = resolveClassHint(rawHint, node.attributes[attr]);
      const hintMsg = canonical ? ` Use class="${canonical}" instead.` : '';
      context.warnings.push({
        code: ErrorCode.CSS_ATTR_IN_CLASS_MODE,
        message:
          `<${node.type}> attribute "${attr}" is not allowed in class mode.` +
          hintMsg +
          ` To opt out project-wide, set templateStyle: 'attribute' in compile options.`,
        severity: 'error',
        loc: node.loc
          ? { line: node.loc.start.line, col: node.loc.start.col }
          : undefined,
        fix: canonical
          ? `Replace ${attr}="..." with class="${canonical}"`
          : `Remove the "${attr}" attribute and express the style via class=""`,
      });
    }
  }
}

/**
 * In attribute mode, asserts that `node` has no explicitly-written `class`
 * attribute. `<mc-attributes>` defaults are exempt — only attrs the user
 * placed directly on the node are flagged.
 *
 * Symmetric to {@link assertClassModeAttributes}. Hard error — the issue is
 * pushed with `severity: 'error'` and routed to `result.errors` by the
 * caller (compile.ts / json/index.ts), setting `partial: true`.
 *
 * @param node    - The component AST node being compiled.
 * @param context - Compile context carrying `templateStyle`.
 */
export function assertAttributeModeClass(
  node: ASTNode,
  context: CompileContext,
): void {
  if (context.templateStyle !== 'attribute') return;
  if (!Object.prototype.hasOwnProperty.call(node.attributes, 'class')) return;

  context.warnings.push({
    code: ErrorCode.CLASS_ATTR_IN_ATTRIBUTE_MODE,
    message:
      `<${node.type}> attribute "class" is not allowed in attribute mode. ` +
      `Express styling via attributes (e.g. color="#333" padding="20px"), ` +
      `or switch to templateStyle: 'class' if you want Tailwind utilities.`,
    severity: 'error',
    loc: node.loc
      ? { line: node.loc.start.line, col: node.loc.start.col }
      : undefined,
    fix:
      `Remove the "class" attribute and express the style via attributes, ` +
      `or set templateStyle: 'class' in compile options.`,
  });
}

/**
 * Returns a copy of `mergedAttributes` with `class` removed when in attribute
 * mode AND the class attr was explicitly written on the node. mc-attributes
 * defaults are intentionally preserved.
 *
 * Call this immediately after `getEffectiveAttributes()` in every component
 * compiler that calls `assertAttributeModeClass()`. Without this, the
 * downstream style resolution would still see and apply the user's class.
 *
 * @param nodeOwnAttributes  - `node.attributes` — the attrs explicitly on the node.
 * @param mergedAttributes   - Result of `getEffectiveAttributes` (includes defaults).
 * @param context            - Compile context carrying `templateStyle`.
 * @returns The same merged map in class mode; a cleaned copy in attribute mode.
 */
export function stripAttributeModeClass(
  nodeOwnAttributes: Record<string, string>,
  mergedAttributes: Record<string, string>,
  context: CompileContext,
): Record<string, string> {
  if (context.templateStyle !== 'attribute') return mergedAttributes;
  if (!Object.prototype.hasOwnProperty.call(nodeOwnAttributes, 'class')) {
    return mergedAttributes;
  }
  const cleaned: Record<string, string> = {};
  for (const [key, val] of Object.entries(mergedAttributes)) {
    if (key === 'class') continue;
    cleaned[key] = val;
  }
  return cleaned;
}

// ---------------------------------------------------------------------------
// Attribute stripping — Problem 2 fix
// ---------------------------------------------------------------------------

/**
 * Returns a copy of `mergedAttributes` with CSS-property attrs removed when in
 * class mode — but ONLY for attributes that were explicitly set on the node
 * itself (in `nodeOwnAttributes`). Attrs that came from `mc-attributes` defaults
 * are intentionally preserved, matching the `assertClassModeAttributes` exemption.
 *
 * Call this immediately after `getEffectiveAttributes()` in every component
 * compiler that calls `assertClassModeAttributes()`.
 *
 * @param nodeType           - The mc-component type (e.g. `'mc-section'`).
 * @param nodeOwnAttributes  - `node.attributes` — the attrs explicitly on the node.
 * @param mergedAttributes   - Result of `getEffectiveAttributes` (includes defaults).
 * @param context            - Compile context carrying `templateStyle`.
 * @returns The same merged map in attribute mode; a cleaned copy in class mode.
 */
export function stripClassModeAttributes(
  nodeType: string,
  nodeOwnAttributes: Record<string, string>,
  mergedAttributes: Record<string, string>,
  context: CompileContext,
): Record<string, string> {
  if (context.templateStyle !== 'class') return mergedAttributes;
  const banned = CSS_PROP_ATTRS_BY_COMPONENT[nodeType];
  if (!banned) return mergedAttributes;

  const cleaned: Record<string, string> = {};
  for (const [key, val] of Object.entries(mergedAttributes)) {
    // Only strip if the key was explicitly placed on the node (not a mc-attributes default)
    if (banned.has(key) && Object.prototype.hasOwnProperty.call(nodeOwnAttributes, key)) {
      // strip it — user placed a CSS-prop attr directly in class mode
    } else {
      cleaned[key] = val;
    }
  }
  return cleaned;
}

// ---------------------------------------------------------------------------
// Error message hint
// ---------------------------------------------------------------------------

/**
 * Returns a short Tailwind class hint for a CSS-property attribute on a
 * specific component. Derives the hint directly from `COMPONENT_METADATA`
 * — the single source of truth. No separate hardcoded lookup needed.
 *
 * @param componentType - The mc-component type (e.g. `'mc-text'`).
 * @param attr          - CSS property attribute name (e.g. `'color'`).
 * @returns The `classHint` string from metadata, or empty string if not found.
 */
export function attrToClassHint(componentType: string, attr: string): string {
  return COMPONENT_METADATA[componentType]?.attributes[attr]?.classHint ?? '';
}
