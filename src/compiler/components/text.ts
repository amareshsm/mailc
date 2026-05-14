/**
 * `mc-text` compiler — text content block.
 *
 * Outputs a `<p>` tag with `margin:0` (email reset) and inline styles
 * resolved from Tailwind classes and direct attributes. Preserves
 * inline HTML elements: `<strong>`, `<b>`, `<em>`, `<i>`, `<u>`,
 * `<s>`, `<br>`, `<a>`, `<span>`.
 *
 * @module compiler/components/text
 */

import type { ASTNode, CompileContext } from '../../types.js';
import { collectAndInline } from '../style-collector.js';
import { getTextContent, getEffectiveAttributes } from '../index.js';
import { assertClassModeAttributes, assertAttributeModeClass, stripClassModeAttributes, stripAttributeModeClass } from '../styling-mode.js';
import { filterAttributesByCompatibility } from '../attribute-classifier.js';
import { attr, styleAttr } from '../../utils/html-attr.js';

/** CSS property names that mc-text accepts as direct attributes. */
const TEXT_ATTRIBUTE_PROPS: readonly string[] = [
  'color',
  'font-size',
  'font-family',
  'font-weight',
  'font-style',
  'line-height',
  'text-align',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'letter-spacing',
  'text-decoration',
  'text-transform',
  'background-color',
  'width',
];

/**
 * Compiles an `mc-text` node into a `<p>` tag with inline styles.
 *
 * Style precedence:
 * 1. Direct attributes (e.g. `color="#333"`) override everything.
 * 2. Tailwind class resolution.
 * 3. Defaults (`margin:0`).
 *
 * @param node    - The `mc-text` AST node.
 * @param context - Compile context with theme and warnings.
 * @returns The compiled `<p>` HTML string.
 */
export function compileText(
  node: ASTNode,
  context: CompileContext,
): string {
  assertClassModeAttributes(node, context);
  assertAttributeModeClass(node, context);

  const attributes = filterAttributesByCompatibility(
    node.type,
    stripAttributeModeClass(node.attributes, stripClassModeAttributes(node.type, node.attributes, getEffectiveAttributes(node, context), context), context),
    context,
  );
  const content = getTextContent(node);
  const classAttr = attributes['class'] ?? '';

  // Resolve Tailwind classes → inline styles (ENHANCE properties now inline too).
  // Called unconditionally so source-map style provenance (SM-C) is recorded
  // for attribute-mode elements too. Returns empty inline style + empty
  // classOrigins when classAttr is empty.
  const resolvedStyle = collectAndInline(classAttr, context, attributes, node).inlineStyle;

  // Build the final style map
  const styleMap = parseStyleString(resolvedStyle);

  // Email reset: set each margin longhand to 0 only if the class string
  // didn't already resolve a value for that side. Using longhands (not the
  // `margin` shorthand) avoids clobbering e.g. `margin-top:24px` that a
  // class like `mt-6` correctly resolved.
  for (const side of ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'] as const) {
    if (!styleMap.has(side)) {
      styleMap.set(side, '0');
    }
  }

  // Apply direct attribute overrides
  for (const prop of TEXT_ATTRIBUTE_PROPS) {
    const val = attributes[prop];
    if (val !== undefined) {
      styleMap.set(prop, val);
    }
  }

  // `align` is an alias for `text-align` (HTML attribute convention)
  const alignVal = attributes['align'];
  if (alignVal !== undefined) {
    styleMap.set('text-align', alignVal);
  }

  const style = buildStyleString(styleMap);

  const idAttr = attr('id', attributes['id']);

  context.counters.componentCount++;
  return `<p${idAttr}${styleAttr(style)}>${content}</p>`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parses a CSS inline style string into a Map.
 *
 * @param style - A style string like `"color:red;font-size:16px"`.
 * @returns Map of property → value.
 */
function parseStyleString(style: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!style) {
    return map;
  }

  const parts = style.split(';');
  for (const part of parts) {
    const colonIdx = part.indexOf(':');
    if (colonIdx === -1) {
      continue;
    }
    const prop = part.slice(0, colonIdx).trim();
    const val = part.slice(colonIdx + 1).trim();
    if (prop && val) {
      map.set(prop, val);
    }
  }

  return map;
}

/**
 * Converts a style Map back into an inline style string.
 *
 * @param map - The property → value map.
 * @returns A semicolon-separated style string.
 */
function buildStyleString(map: Map<string, string>): string {
  const parts: string[] = [];
  for (const [prop, val] of map) {
    parts.push(`${prop}:${val}`);
  }
  return parts.join(';');
}
