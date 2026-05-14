/**
 * `mc-divider` compiler — horizontal divider line.
 *
 * Uses a `border-top` approach on a `<span>` inside a `<p>` for
 * maximum email client compatibility. `font-size:1px` and
 * `line-height:1px` collapse the element to minimal height.
 *
 * @module compiler/components/divider
 */

import type { ASTNode, CompileContext } from '../../types.js';
import { collectAndInline, recordAttributeStyleOrigins } from '../style-collector.js';
import { getEffectiveAttributes } from '../index.js';
import { deriveDefaults } from '../../components/metadata.js';
import { assertClassModeAttributes, assertAttributeModeClass, stripClassModeAttributes, stripAttributeModeClass } from '../styling-mode.js';
import { filterAttributesByCompatibility } from '../attribute-classifier.js';
import { attr, styleAttr } from '../../utils/html-attr.js';

/**
 * Default divider attribute values — derived from COMPONENT_METADATA.
 * To change a default, edit src/components/metadata.ts, not this file.
 */
const DEFAULTS = deriveDefaults('mc-divider');

/**
 * Compiles an `mc-divider` node into a `<p>` with a `border-top` span.
 *
 * Attribute precedence:
 * 1. Direct attributes on the element.
 * 2. Tailwind class resolution.
 * 3. Defaults.
 *
 * @param node    - The `mc-divider` AST node.
 * @param context - Compile context with theme and warnings.
 * @returns The compiled HTML `<p>` with border-top span.
 */
export function compileDivider(
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

  // Resolve Tailwind classes if present
  let resolvedBorderColor = '';
  let resolvedBorderWidth = '';
  let resolvedBorderStyle = '';
  let resolvedPadding = '';
  let resolvedContainerBg = '';
  const classAttr = attributes['class'] ?? '';
  if (classAttr) {
    const result = collectAndInline(classAttr, context, {}, node);
    const s = result.inlineStyle;
    // NB: empty attrs passed above intentionally — divider's class resolution
    // shouldn't be filtered by attribute precedence (it parses borders).
    // SM-C provenance for attribute-mode handled in the `else` below.

    const colorMatch = s.match(/(?:^|;)\s*border(?:-top)?-color:\s*([^;]+)/);
    if (colorMatch) resolvedBorderColor = (colorMatch[1] as string).trim();

    const widthMatch = s.match(/(?:^|;)\s*border(?:-top)?-width:\s*([^;]+)/);
    if (widthMatch) resolvedBorderWidth = (widthMatch[1] as string).trim();

    const styleMatch = s.match(/(?:^|;)\s*border(?:-top)?-style:\s*([^;]+)/);
    if (styleMatch) resolvedBorderStyle = (styleMatch[1] as string).trim();

    const padMatch = s.match(/(?:^|;)\s*padding:\s*([^;]+)/);
    if (padMatch) resolvedPadding = (padMatch[1] as string).trim();

    const bgMatch = s.match(/(?:^|;)\s*background-color:\s*([^;]+)/);
    if (bgMatch) resolvedContainerBg = (bgMatch[1] as string).trim();
  } else {
    // Attribute-mode (no class=): record attribute-origin style provenance
    // so source maps stay populated for attribute-only elements.
    recordAttributeStyleOrigins(context, attributes, node);
  }

  // Attributes override classes, which override defaults
  const borderColor =
    attributes['border-color'] ?? (resolvedBorderColor || DEFAULTS['border-color']!);
  const borderWidth = attributes['border-width'] ?? (resolvedBorderWidth || DEFAULTS['border-width']!);
  const borderStyle = attributes['border-style'] ?? (resolvedBorderStyle || DEFAULTS['border-style']!);
  const padding = attributes['padding'] ?? (resolvedPadding || DEFAULTS['padding']!);
  const paddingTop    = attributes['padding-top']    ?? '';
  const paddingRight  = attributes['padding-right']  ?? '';
  const paddingBottom = attributes['padding-bottom'] ?? '';
  const paddingLeft   = attributes['padding-left']   ?? '';
  const width = attributes['width'] ?? DEFAULTS['width']!;

  const borderDecl = `${borderWidth} ${borderStyle} ${borderColor}`;

  const containerBg = attributes['container-background-color'] ?? resolvedContainerBg;
  const containerBgStyle = containerBg ? `;background-color:${containerBg}` : '';

  // Longhand padding takes priority over shorthand
  const paddingStyle = (paddingTop || paddingRight || paddingBottom || paddingLeft)
    ? [
        paddingTop    ? `padding-top:${paddingTop}`       : '',
        paddingRight  ? `padding-right:${paddingRight}`   : '',
        paddingBottom ? `padding-bottom:${paddingBottom}` : '',
        paddingLeft   ? `padding-left:${paddingLeft}`     : '',
      ].filter(Boolean).join(';')
    : `padding:${padding}`;

  const idAttr = attr('id', attributes['id']);

  context.counters.componentCount++;
  return (
    `<p${idAttr}${styleAttr(`margin:0;${paddingStyle};font-size:1px;line-height:1px${containerBgStyle};`)}>` +
    `<span${styleAttr(`display:block;width:${width};border-top:${borderDecl};font-size:1px;line-height:1px;`)}>&nbsp;</span>` +
    `</p>`
  );
}
