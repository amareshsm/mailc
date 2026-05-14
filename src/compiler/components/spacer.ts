/**
 * `mc-spacer` compiler — vertical spacing element.
 *
 * Outputs a `<div>` with matching `height` and `line-height` to ensure
 * consistent spacing across email clients. Uses `font-size:1px` to
 * prevent minimum height issues and `&nbsp;` to stop empty div collapse.
 *
 * @module compiler/components/spacer
 */

import type { ASTNode, CompileContext } from '../../types.js';
import { collectAndInline, recordAttributeStyleOrigins } from '../style-collector.js';
import { getEffectiveAttributes } from '../index.js';
import { deriveDefaults } from '../../components/metadata.js';
import { assertClassModeAttributes, assertAttributeModeClass, stripClassModeAttributes, stripAttributeModeClass } from '../styling-mode.js';
import { filterAttributesByCompatibility } from '../attribute-classifier.js';
import { attr, styleAttr } from '../../utils/html-attr.js';

/**
 * Default spacer attribute values — derived from COMPONENT_METADATA.
 * To change a default, edit src/components/metadata.ts, not this file.
 */
const SPACER_DEFAULTS = deriveDefaults('mc-spacer');

/**
 * Compiles an `mc-spacer` node into a fixed-height empty `<div>`.
 *
 * Height sources (in priority order):
 * 1. Tailwind `h-{n}` class in `class` attribute.
 * 2. Explicit `height` attribute.
 * 3. Default: `20px`.
 *
 * @param node    - The `mc-spacer` AST node.
 * @param context - Compile context with theme and warnings.
 * @returns The compiled HTML `<div>` with spacer styles.
 */
export function compileSpacer(
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
  let height = attributes['height'] ?? SPACER_DEFAULTS['height']!;

  // Resolve height, padding, container-bg from Tailwind class if present
  let resolvedPadding = '';
  let resolvedContainerBg = '';
  const classAttr = attributes['class'] ?? '';
  if (classAttr) {
    const result = collectAndInline(classAttr, context, {}, node);
    const s = result.inlineStyle;

    const heightMatch = s.match(/(?:^|;)\s*height:\s*([^;]+)/);
    if (heightMatch) height = heightMatch[1] as string;

    const padMatch = s.match(/(?:^|;)\s*padding:\s*([^;]+)/);
    if (padMatch) resolvedPadding = (padMatch[1] as string).trim();

    const bgMatch = s.match(/(?:^|;)\s*background-color:\s*([^;]+)/);
    if (bgMatch) resolvedContainerBg = (bgMatch[1] as string).trim();
  } else {
    // Attribute-mode (no class=): record attribute-origin style provenance
    // so source maps stay populated for attribute-only elements.
    recordAttributeStyleOrigins(context, attributes, node);
  }

  // Strip "px" if already included for the HTML attribute
  const cleanHeight = height.replace('px', '').trim();
  const pxHeight = `${cleanHeight}px`;

  const padding = attributes['padding'] ?? resolvedPadding;
  const containerBg = attributes['container-background-color'] ?? resolvedContainerBg;

  const styleParts = [
    `height:${pxHeight}`,
    `line-height:${pxHeight}`,
    `font-size:1px`,
  ];
  if (padding) styleParts.push(`padding:${padding}`);
  if (containerBg) styleParts.push(`background-color:${containerBg}`);

  const idAttr = attr('id', attributes['id']);

  context.counters.componentCount++;
  return `<div${idAttr}${styleAttr(styleParts.join(';'))}>&nbsp;</div>`;
}
