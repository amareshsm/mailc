/**
 * `mc-list` and `mc-list-item` compilers.
 *
 * Renders a semantic <ul>/<ol> with <li> children, wrapped in an Outlook-safe
 * <table> so list rendering is consistent across clients. The list element
 * carries an explicit `list-style-type`, `padding-left`, and `margin:0` reset
 * because most webmail clients strip browser list defaults.
 *
 * Children must be `mc-list-item`. Each item supports inline HTML (`<strong>`,
 * `<a>`, `<br>`, etc.) just like `mc-text`, so authors can put rich content
 * inside individual bullets.
 *
 * @module compiler/components/list
 */

import type { ASTNode, CompileContext } from '../../types.js';
import { collectAndInline } from '../style-collector.js';
import { getTextContent, getEffectiveAttributes, compileChildren } from '../index.js';
import { assertClassModeAttributes, assertAttributeModeClass, stripClassModeAttributes, stripAttributeModeClass } from '../styling-mode.js';
import { filterAttributesByCompatibility } from '../attribute-classifier.js';
import { attr, styleAttr } from '../../utils/html-attr.js';

/** CSS properties that mc-list accepts as direct attributes (apply to the <ul>/<ol>). */
const LIST_ATTRIBUTE_PROPS: readonly string[] = [
  'color',
  'background-color',
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'list-style-type',
  'list-style-position',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
];

/** CSS properties that mc-list-item accepts as direct attributes (apply to the <li>). */
const LIST_ITEM_ATTRIBUTE_PROPS: readonly string[] = [
  'color',
  'background-color',
  'font-size',
  'line-height',
  'font-weight',
  'font-style',
  'text-decoration',
  'padding',
];

// ---------------------------------------------------------------------------
// mc-list
// ---------------------------------------------------------------------------

/**
 * Compiles an `mc-list` node into a table-wrapped <ul>/<ol>.
 *
 * @param node    - The `mc-list` AST node.
 * @param context - Compile context with theme and warnings.
 * @returns The compiled list HTML.
 */
export function compileList(node: ASTNode, context: CompileContext): string {
  assertClassModeAttributes(node, context);
  assertAttributeModeClass(node, context);

  const attributes = filterAttributesByCompatibility(
    node.type,
    stripAttributeModeClass(
      node.attributes,
      stripClassModeAttributes(
        node.type,
        node.attributes,
        getEffectiveAttributes(node, context),
        context,
      ),
      context,
    ),
    context,
  );

  const tagName = (attributes['type'] ?? 'ul').toLowerCase() === 'ol' ? 'ol' : 'ul';
  const itemSpacing = attributes['item-spacing'] ?? '4px';

  // Resolve class string into inline styles
  const classAttr = attributes['class'] ?? '';
  const styleMap = new Map<string, string>();
  // Unconditional call so attribute-mode elements get source-map style
  // provenance (SM-C). Returns empty inline style when classAttr is empty.
  const resolved = collectAndInline(classAttr, context, attributes, node);
  if (classAttr) {
    for (const decl of resolved.inlineStyle.split(';')) {
      const colonIdx = decl.indexOf(':');
      if (colonIdx === -1) continue;
      const prop = decl.slice(0, colonIdx).trim();
      const val = decl.slice(colonIdx + 1).trim();
      if (prop && val) styleMap.set(prop, val);
    }
  }

  // Direct attributes win over class-derived styles
  for (const prop of LIST_ATTRIBUTE_PROPS) {
    const val = attributes[prop];
    if (val !== undefined) styleMap.set(prop, val);
  }

  // Email reset — every email client styles lists differently. Pin defaults.
  if (!styleMap.has('margin-top')) styleMap.set('margin-top', '0');
  if (!styleMap.has('margin-bottom')) styleMap.set('margin-bottom', '0');
  if (!styleMap.has('padding-top')) styleMap.set('padding-top', '0');
  if (!styleMap.has('padding-bottom')) styleMap.set('padding-bottom', '0');
  if (!styleMap.has('padding-right')) styleMap.set('padding-right', '0');
  if (!styleMap.has('padding-left')) styleMap.set('padding-left', '24px');
  // Default list-style-type by tag if neither attribute nor class set it.
  if (!styleMap.has('list-style-type')) {
    styleMap.set('list-style-type', tagName === 'ol' ? 'decimal' : 'disc');
  }

  const listStyle = mapToString(styleMap);

  // Compile children through the normal dispatch path so source maps and
  // data-mc-id injection still run on each <li>. `item-spacing` flows via
  // context — restored on the way out so siblings/ancestors aren't polluted.
  const prevSpacing = context.listItemSpacing;
  context.listItemSpacing = itemSpacing;
  const itemsHtml = compileChildren(node.children, context);
  context.listItemSpacing = prevSpacing;

  const idAttr = attr('id', attributes['id']);

  context.counters.componentCount++;

  // Outer table normalises list rendering across email clients (Outlook, Gmail).
  return (
    `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"${idAttr}>` +
    `<tr><td>` +
    `<${tagName}${styleAttr(listStyle)}>${itemsHtml}</${tagName}>` +
    `</td></tr>` +
    `</table>`
  );
}

// ---------------------------------------------------------------------------
// mc-list-item
// ---------------------------------------------------------------------------

/**
 * Compiles an `mc-list-item` node into an `<li>`. Called by `compileList()`
 * with the resolved per-item spacing from the parent `mc-list`.
 *
 * Registered as a top-level compiler too, so the registry/dispatch is
 * consistent — but in practice items are always emitted from inside a list.
 *
 * @param node        - The `mc-list-item` AST node.
 * @param context     - Compile context.
 * @param itemSpacing - Vertical gap between items (from parent mc-list).
 * @returns The compiled `<li>` HTML.
 */
export function compileListItem(
  node: ASTNode,
  context: CompileContext,
): string {
  const itemSpacing = context.listItemSpacing ?? '4px';
  assertClassModeAttributes(node, context);
  assertAttributeModeClass(node, context);

  const attributes = filterAttributesByCompatibility(
    node.type,
    stripAttributeModeClass(
      node.attributes,
      stripClassModeAttributes(
        node.type,
        node.attributes,
        getEffectiveAttributes(node, context),
        context,
      ),
      context,
    ),
    context,
  );

  const content = getTextContent(node);
  const classAttr = attributes['class'] ?? '';

  const styleMap = new Map<string, string>();
  // Unconditional call so attribute-mode elements get source-map style
  // provenance (SM-C). Returns empty inline style when classAttr is empty.
  const resolved = collectAndInline(classAttr, context, attributes, node);
  if (classAttr) {
    for (const decl of resolved.inlineStyle.split(';')) {
      const colonIdx = decl.indexOf(':');
      if (colonIdx === -1) continue;
      const prop = decl.slice(0, colonIdx).trim();
      const val = decl.slice(colonIdx + 1).trim();
      if (prop && val) styleMap.set(prop, val);
    }
  }

  for (const prop of LIST_ITEM_ATTRIBUTE_PROPS) {
    const val = attributes[prop];
    if (val !== undefined) styleMap.set(prop, val);
  }

  // Default vertical gap between siblings, unless the author overrode padding.
  if (!styleMap.has('padding-bottom') && !styleMap.has('padding')) {
    styleMap.set('padding-bottom', itemSpacing);
  }

  const styleOut = mapToString(styleMap);
  const styleAttrStr = styleAttr(styleOut);
  const idAttr = attr('id', attributes['id']);

  context.counters.componentCount++;
  return `<li${idAttr}${styleAttrStr}>${content}</li>`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapToString(m: Map<string, string>): string {
  const parts: string[] = [];
  for (const [k, v] of m) parts.push(`${k}:${v}`);
  return parts.join(';');
}
