/**
 * `mc-raw` compiler — escape hatch for raw HTML passthrough.
 *
 * Content passes through with zero processing. No CSS validation,
 * no inlining, no Outlook conditionals. Template `{{variables}}`
 * would have been resolved in a prior stage.
 *
 * The tokenizer only treats a fixed set of inline HTML tags (strong, b, em,
 * a, span …) as text. Any other HTML tags inside `<mc-raw>` get parsed as
 * child AST nodes. This compiler reconstructs the original HTML from both
 * `node.content` (text/expressions) and `node.children` (parsed elements).
 *
 * @module compiler/components/raw
 */

import type { ASTNode, CompileContext } from '../../types.js';
import { getTextContent } from '../index.js';

/**
 * Compiles an `mc-raw` node by passing through its content unmodified.
 *
 * Handles two cases:
 * - **Text content** in `node.content` — returned via `getTextContent()`.
 * - **Parsed child elements** in `node.children` — reconstructed to HTML
 *   via `reconstructHtml()`.
 *
 * @param node    - The `mc-raw` AST node.
 * @param context - Compile context (only used for counter).
 * @returns The raw HTML content of the node.
 */
export function compileRaw(node: ASTNode, context: CompileContext): string {
  context.counters.componentCount++;

  const textPart = getTextContent(node);
  const childPart = node.children.map(reconstructHtml).join('');

  return textPart + childPart;
}

/**
 * Reconstructs the original HTML from an AST node subtree.
 *
 * Recursively rebuilds open/close tags, attributes, and nested content
 * so that arbitrary HTML inside `mc-raw` survives the parse round-trip.
 *
 * @param node - An AST node to reconstruct.
 * @returns The reconstructed HTML string.
 */
function reconstructHtml(node: ASTNode): string {
  const attrs = Object.entries(node.attributes)
    .map(([k, v]) => (v === '' ? ` ${k}` : ` ${k}="${v}"`))
    .join('');

  const innerText = getTextContent(node);
  const innerChildren = node.children.map(reconstructHtml).join('');
  const inner = innerText + innerChildren;

  if (inner.length === 0 && node.children.length === 0 && node.content.length === 0) {
    return `<${node.type}${attrs} />`;
  }

  return `<${node.type}${attrs}>${inner}</${node.type}>`;
}
