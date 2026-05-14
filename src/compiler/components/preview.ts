/**
 * `mc-preview` compiler — inbox preview text with padding hack.
 *
 * The preview text is rendered in a hidden `<div>` before the email body.
 * It pads the text with `&#847;` (zero-width non-breaking space) characters
 * to prevent email clients from showing body text after the preview snippet.
 *
 * @module compiler/components/preview
 */

import type { ASTNode, CompileContext } from '../../types.js';
import { getTextContent } from '../index.js';
import { styleAttr } from '../../utils/html-attr.js';

/** Default number of padding characters to generate. */
const DEFAULT_PADDING_LENGTH = 150;

/** The repeating padding sequence (zero-width chars that fill preview). */
const PADDING_CHAR = '&#847; ';

/**
 * Compiles an `mc-preview` node into a hidden `<div>` with preview text
 * and `&#847;` padding.
 *
 * @param node    - The `mc-preview` AST node.
 * @param _context - Compile context (not used for preview).
 * @returns The compiled hidden preview `<div>`.
 */
export function compilePreview(
  node: ASTNode,
  context: CompileContext,
): string {
  const text = getTextContent(node).trim();
  const paddingLength = parsePaddingLength(
    node.attributes['padding-length'],
  );

  const padding = generatePadding(paddingLength);

  const hiddenStyle = [
    'display:none',
    'font-size:1px',
    'color:#ffffff',
    'line-height:1px',
    'max-height:0px',
    'max-width:0px',
    'opacity:0',
    'overflow:hidden',
  ].join(';');

  context.counters.componentCount++;
  return `<div${styleAttr(`${hiddenStyle};`)}>${text}${padding}</div>`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parses the `padding-length` attribute into a number.
 *
 * @param value - The attribute value string, or undefined.
 * @returns The parsed number, or the default.
 */
function parsePaddingLength(value: string | undefined): number {
  if (value === undefined) {
    return DEFAULT_PADDING_LENGTH;
  }
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return DEFAULT_PADDING_LENGTH;
  }
  return parsed;
}

/**
 * Generates the `&#847;` padding string.
 *
 * @param length - Number of padding characters.
 * @returns The padding string.
 */
function generatePadding(length: number): string {
  if (length <= 0) {
    return '';
  }
  return PADDING_CHAR.repeat(length);
}
