/**
 * `mc-table` compiler — semantic data table with Tailwind CSS processing.
 *
 * Compiles `<mc-table>` into a `<table>` with:
 * - Tailwind classes on table / tr / td / th resolved to inline styles via the CSS pipeline.
 * - Automatic `bgcolor` fallback extracted from `bg-*` classes (Outlook compatibility).
 * - Automatic `align` / `valign` HTML attr fallbacks from `text-*` / vertical classes.
 * - Auto-injected `role="table"`, `cellpadding="0"`, `cellspacing="0"` when not set.
 * - `mc-each`, `mc-for-each`, `mc-if`, `mc-else-if`, `mc-else` logic nodes delegated
 *   to the main compiler tree so template resolution works inside table rows.
 *
 * @module compiler/components/table
 */

import type { ASTNode, CompileContext } from '../../types.js';
import { collectAndInline } from '../style-collector.js';
import { getEffectiveAttributes, getTextContent, compileNode } from '../index.js';
import { deriveDefaults } from '../../components/metadata.js';
import { attr, reqAttr, styleAttr as buildStyleAttr } from '../../utils/html-attr.js';
import { escapeHtml } from '../../utils/html-escape.js';

/** Default attribute values derived from COMPONENT_METADATA. */
const DEFAULTS = deriveDefaults('mc-table');

/** Transparent section wrappers — passthrough, but recurse into children. */
const SECTION_TAGS = new Set(['thead', 'tbody', 'tfoot']);

/** Elements that receive full CSS processing. */
const CELL_TAGS = new Set(['td', 'th']);

// ---------------------------------------------------------------------------
// Public compiler
// ---------------------------------------------------------------------------

/**
 * Compiles an `mc-table` node into a semantic HTML `<table>`.
 *
 * @param node    - The `mc-table` AST node.
 * @param context - Compile context with theme and warnings.
 * @returns The compiled HTML table string.
 */
export function compileTable(node: ASTNode, context: CompileContext): string {
  // mc-table has no CSS-property attributes (only structural/HTML attrs like
  // width, cellpadding, cellspacing, role). Class-mode enforcement is therefore
  // a no-op here and is intentionally not called.
  const attributes = getEffectiveAttributes(node, context);
  const classAttr = attributes['class'] ?? '';

  const { inlineStyle } = classAttr
    ? collectAndInline(classAttr, context, attributes, node)
    : { inlineStyle: '' };

  // w-full → width="100%" (class also lands in inline style — harmless duplicate)
  const hasWFull = classAttr.split(/\s+/).includes('w-full');
  const width = attributes['width'] ?? (hasWFull ? '100%' : (DEFAULTS['width'] ?? '100%'));

  const cellpadding = attributes['cellpadding'] ?? DEFAULTS['cellpadding'] ?? '0';
  const cellspacing = attributes['cellspacing'] ?? DEFAULTS['cellspacing'] ?? '0';
  const role        = attributes['role'] ?? 'table';
  const borderAttr  = attr('border', attributes['border']);
  const alignAttr   = attr('align', attributes['align']);

  const finalStyle = mergeStyles(inlineStyle, attributes['style'] ?? '');
  const styleAttr  = finalStyle ? buildStyleAttr(finalStyle) : '';

  const inner = node.children
    .map((child) => compileTableChild(child, context))
    .join('');

  context.counters.componentCount++;

  return (
    `<table` +
    reqAttr('width', width) +
    reqAttr('cellpadding', cellpadding) +
    reqAttr('cellspacing', cellspacing) +
    reqAttr('role', role) +
    borderAttr + alignAttr + styleAttr +
    `>` +
    inner +
    `</table>`
  );
}

// ---------------------------------------------------------------------------
// Internal walkers
// ---------------------------------------------------------------------------

/**
 * Dispatches a child node to the correct sub-compiler.
 *
 * - mc-* logic nodes (mc-each, mc-if, …) → main `compileNode` tree.
 * - thead / tbody / tfoot → transparent wrappers, recurse into children.
 * - tr → `compileRow`.
 * - td / th → `compileCell`.
 * - Everything else (a, b, span, …) → `reconstructNode` passthrough.
 */
function compileTableChild(node: ASTNode, context: CompileContext): string {
  if (node.type.startsWith('mc-')) {
    return compileNode(node, context);
  }
  if (SECTION_TAGS.has(node.type)) {
    const inner = node.children
      .map((child) => compileTableChild(child, context))
      .join('');
    return `<${node.type}>${getTextContent(node)}${inner}</${node.type}>`;
  }
  if (node.type === 'tr') {
    return compileRow(node, context);
  }
  if (CELL_TAGS.has(node.type)) {
    return compileCell(node, context);
  }
  return reconstructNode(node);
}

/**
 * Compiles a `<tr>` — resolves class → inline styles and extracts bgcolor fallback.
 */
function compileRow(node: ASTNode, context: CompileContext): string {
  const classAttr = node.attributes['class'] ?? '';
  const { inlineStyle } = classAttr
    ? collectAndInline(classAttr, context, node.attributes, node)
    : { inlineStyle: '' };

  const finalStyle = mergeStyles(inlineStyle, node.attributes['style'] ?? '');
  const bgcolor    = node.attributes['bgcolor'] ?? extractBgColor(inlineStyle);

  const inner = node.children
    .map((child) => compileTableChild(child, context))
    .join('');

  return (
    `<tr` +
    (finalStyle ? buildStyleAttr(finalStyle) : '') +
    attr('bgcolor', bgcolor) +
    `>${getTextContent(node)}${inner}</tr>`
  );
}

/**
 * Compiles a `<td>` or `<th>` — resolves class, extracts bgcolor / align / valign fallbacks.
 */
function compileCell(node: ASTNode, context: CompileContext): string {
  const tag      = node.type;
  const classAttr = node.attributes['class'] ?? '';
  const { inlineStyle } = classAttr
    ? collectAndInline(classAttr, context, node.attributes, node)
    : { inlineStyle: '' };

  const finalStyle = mergeStyles(inlineStyle, node.attributes['style'] ?? '');
  const bgcolor    = node.attributes['bgcolor'] ?? extractBgColor(inlineStyle);
  const align      = node.attributes['align']   ?? extractAlign(inlineStyle);
  const valign     = node.attributes['valign']  ?? extractValign(inlineStyle);

  const colspan = attr('colspan', node.attributes['colspan']);
  const rowspan = attr('rowspan', node.attributes['rowspan']);
  const width   = attr('width',   node.attributes['width']);
  const scope   = attr('scope',   node.attributes['scope']);

  const inner = node.children
    .map((child) => compileTableChild(child, context))
    .join('');

  return (
    `<${tag}${colspan}${rowspan}${width}${scope}` +
    (finalStyle ? buildStyleAttr(finalStyle) : '') +
    attr('bgcolor', bgcolor) +
    attr('align', align) +
    attr('valign', valign) +
    `>${getTextContent(node)}${inner}</${tag}>`
  );
}

/**
 * Reconstructs a non-mc HTML node (a, b, i, span, br, …) as a plain HTML string.
 * Used as a passthrough for inline elements inside table cells.
 */
function reconstructNode(node: ASTNode): string {
  // Reconstruct attributes with escape. Empty values are emitted as `name`
  // (HTML boolean form), all other values are entity-escaped to prevent
  // an injected " from closing the attribute.
  const attrs = Object.entries(node.attributes)
    .map(([k, v]) => (v === '' ? ` ${k}` : ` ${k}="${escapeHtml(v)}"`))
    .join('');
  const inner = getTextContent(node) + node.children.map(reconstructNode).join('');
  if (!inner && node.children.length === 0 && node.content.length === 0) {
    return `<${node.type}${attrs} />`;
  }
  return `<${node.type}${attrs}>${inner}</${node.type}>`;
}

// ---------------------------------------------------------------------------
// Style helpers
// ---------------------------------------------------------------------------

/**
 * Merges two inline style strings. `b` wins over `a` (explicit style wins over class).
 * Handles empty inputs and ensures a single trailing semicolon.
 */
function mergeStyles(a: string, b: string): string {
  const trimA = a.replace(/;+$/, '').trim();
  const trimB = b.replace(/;+$/, '').trim();
  if (!trimA && !trimB) return '';
  if (!trimA) return trimB;
  if (!trimB) return trimA;
  return `${trimA};${trimB}`;
}

/** Extracts the `background-color` hex/value from an inline style string. */
function extractBgColor(style: string): string {
  const m = style.match(/(?:^|;)\s*background-color:\s*([^;]+)/);
  return m ? (m[1] as string).trim() : '';
}

/** Extracts `text-align` value from an inline style string. */
function extractAlign(style: string): string {
  const m = style.match(/(?:^|;)\s*text-align:\s*([^;]+)/);
  return m ? (m[1] as string).trim() : '';
}

/** Extracts `vertical-align` value from an inline style string. */
function extractValign(style: string): string {
  const m = style.match(/(?:^|;)\s*vertical-align:\s*([^;]+)/);
  return m ? (m[1] as string).trim() : '';
}
