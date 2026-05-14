/**
 * `mc-section` compiler — full-width row container.
 *
 * Generates the hybrid email layout pattern:
 * - Outer `<table>` at 100% width for full-width background.
 * - Outlook conditional `<!--[if mso | IE]>` inner table with pixel widths.
 * - Non-Outlook `<div>` columns with `display:inline-block` + `max-width`.
 *
 * Supports `full-width` (extends to viewport edge) and `direction` (rtl column ordering).
 *
 * @module compiler/components/section
 */

import type { ASTNode, CompileContext } from '../../types.js';
import { ErrorCode } from '../../errors/codes.js';
import { collectAndInline } from '../style-collector.js';
import { compileChildren, getEffectiveAttributes } from '../index.js';
import { isSafeUrl, sanitizeUrl } from '../../utils/url-sanitizer.js';
import { deriveDefaults } from '../../components/metadata.js';
import { assertClassModeAttributes, assertAttributeModeClass, stripClassModeAttributes, stripAttributeModeClass } from '../styling-mode.js';
import { filterAttributesByCompatibility } from '../attribute-classifier.js';
import { attr, reqAttr, styleAttr as buildStyleAttr } from '../../utils/html-attr.js';

/**
 * Default section attribute values — derived from COMPONENT_METADATA.
 * To change a default, edit src/components/metadata.ts, not this file.
 */
const DEFAULTS = deriveDefaults('mc-section');

/**
 * Compiles an `mc-section` node into the hybrid table + div layout.
 *
 * @param node    - The `mc-section` AST node.
 * @param context - Compile context with config (for content width).
 * @returns The compiled section HTML with Outlook conditionals.
 */
export function compileSection(
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
  const classAttr = attributes['class'] ?? '';
  const direction = attributes['direction'] ?? DEFAULTS['direction'] ?? '';

  // Content width from config (default 600px)
  const contentWidth = context.config.width;

  // Resolve styles from Tailwind classes and direct attributes
  const {
    backgroundColor, backgroundUrl: rawBackgroundUrl,
    backgroundPosition, backgroundSize,
    padding, paddingTop, paddingRight, paddingBottom, paddingLeft,
    textAlign, extraStyles,
    borderTop, borderRight, borderBottom, borderLeft,
  } = resolveStyles(classAttr, attributes, context, node);

  // ── Security: validate background-url ───────────────────────────────
  let backgroundUrl = rawBackgroundUrl;
  if (rawBackgroundUrl && !isSafeUrl(rawBackgroundUrl)) {
    context.warnings.push({
      code: ErrorCode.UNSAFE_URL,
      message:
        `<mc-section> has an unsafe URL in "background-url": "${rawBackgroundUrl.slice(0, 40)}". ` +
        `The scheme is blocked to prevent script injection in webmail clients.`,
      severity: 'error',
      loc: node.loc
        ? { line: node.loc.start.line, col: node.loc.start.col }
        : undefined,
      fix: `Use a safe URL starting with https://, http://, or a relative path.`,
    });
    backgroundUrl = sanitizeUrl(rawBackgroundUrl);
  }

  // Resolve border and border-radius from direct attributes
  const border = attributes['border'] ?? '';
  const borderRadius = attributes['border-radius'] ?? '';
  // style= passthrough — escape hatch for CSS that cannot be expressed via class
  // (e.g. complex border shorthands). Applied to the inner <td>.
  const styleAttr = attributes['style'] ?? '';

  // Build the outer table (always 100% width)
  const bgColorAttr = attr('bgcolor', backgroundColor);
  const outerTableStyle = buildOuterStyle(backgroundColor, backgroundUrl, backgroundPosition, backgroundSize, borderRadius, extraStyles);
  const tdStyle = buildTdStyle(
    padding, paddingTop, paddingRight, paddingBottom, paddingLeft,
    textAlign, border, borderTop, borderRight, borderBottom, borderLeft,
    styleAttr,
  );

  // Compile children (columns) with content width as parent.
  // Subtract horizontal padding from the column budget so columns that sum
  // to 100% of the section width don't overflow the padded td — the same
  // behaviour as MJML's containerWidth calculation.
  const horizontalPadding = parseHorizontalPadding(padding, paddingLeft, paddingRight);
  const columnBudget = Math.max(contentWidth - horizontalPadding, 1);

  // Count both mc-column and mc-group as row-occupying siblings — each takes
  // one slot in the section's MSO row, and shares parentWidth equally with
  // the others when no explicit width is set.
  const columnChildren = node.children.filter(
    (child) => child.type === 'mc-column' || child.type === 'mc-group',
  );
  const columnCount = columnChildren.length || 1;

  const childContext: CompileContext = {
    ...context,
    parentWidth: columnBudget,
    columnCount,
  };

  let childrenHTML = compileChildren(node.children, childContext);

  // Direction: if rtl, children are rendered in reverse order
  if (direction === 'rtl') {
    const reversedChildren = [...node.children].reverse();
    childrenHTML = compileChildren(reversedChildren, childContext);
  }

  // Column wrapper — Outlook table row for column td's.
  // Note: mc-body already provides the 600px Outlook ghost table + max-width div.
  // mc-section does NOT add another layer — it is responsible only for its own
  // background color, padding, and the column ghost table inside the section td.
  const columnOutlookOpen =
    `<!--[if mso | IE]>` +
    `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr>` +
    `<![endif]-->`;

  const columnOutlookClose =
    `<!--[if mso | IE]>` +
    `</tr></table>` +
    `<![endif]-->`;

  const idAttr = attr('id', attributes['id']);

  context.counters.componentCount++;

  return (
    `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"${bgColorAttr}${outerTableStyle}${idAttr}>` +
    `<tr>` +
    `<td${reqAttr('align', textAlign)}${tdStyle}>` +
    columnOutlookOpen +
    childrenHTML +
    columnOutlookClose +
    `</td>` +
    `</tr>` +
    `</table>`
  );
}

// ---------------------------------------------------------------------------
// Style resolution
// ---------------------------------------------------------------------------

/** Resolved section style values. */
interface SectionStyles {
  backgroundColor: string;
  backgroundUrl: string;
  backgroundPosition: string;
  backgroundSize: string;
  padding: string;
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
  textAlign: string;
  extraStyles: string;
  borderTop: string;
  borderRight: string;
  borderBottom: string;
  borderLeft: string;
}

/**
 * Resolves the final section styles from classes, attributes, and defaults.
 *
 * @param classAttr  - The class attribute string.
 * @param attributes - Direct attributes.
 * @param context    - Compile context.
 * @param node       - The original AST node (for source map style origin tracking).
 * @returns Resolved style values.
 */
function resolveStyles(
  classAttr: string,
  attributes: Record<string, string>,
  context: CompileContext,
  node: ASTNode,
): SectionStyles {
  let backgroundColor = '';
  let backgroundUrl = '';
  let padding: string = DEFAULTS['padding'] ?? '';
  let textAlign: string = DEFAULTS['text-align'] ?? '';
  let extraStyles = '';
  let paddingTop = '';
  let paddingRight = '';
  let paddingBottom = '';
  let paddingLeft = '';

  // Unconditional call so attribute-mode elements get source-map style
  // provenance (SM-C). Returns empty inline style when classAttr is empty.
  const result = collectAndInline(classAttr, context, attributes, node);
  if (classAttr) {
    extraStyles = result.inlineStyle;

    // Extract background-color
    const bgMatch = extraStyles.match(
      /(?:^|;)\s*background-color:\s*([^;]+)/,
    );
    if (bgMatch) {
      backgroundColor = (bgMatch[1] as string).trim();
    }

    // Extract padding shorthand
    const padMatch = extraStyles.match(/(?:^|;)\s*padding:\s*([^;]+)/);
    if (padMatch) {
      padding = (padMatch[1] as string).trim();
    }

    // Extract padding longhands from classes (e.g. pt-*, pl-*)
    const ptMatch = extraStyles.match(/(?:^|;)\s*padding-top:\s*([^;]+)/);
    if (ptMatch) paddingTop = (ptMatch[1] as string).trim();
    const prMatch = extraStyles.match(/(?:^|;)\s*padding-right:\s*([^;]+)/);
    if (prMatch) paddingRight = (prMatch[1] as string).trim();
    const pbMatch = extraStyles.match(/(?:^|;)\s*padding-bottom:\s*([^;]+)/);
    if (pbMatch) paddingBottom = (pbMatch[1] as string).trim();
    const plMatch = extraStyles.match(/(?:^|;)\s*padding-left:\s*([^;]+)/);
    if (plMatch) paddingLeft = (plMatch[1] as string).trim();

    // Extract text-align
    const alignMatch = extraStyles.match(/(?:^|;)\s*text-align:\s*([^;]+)/);
    if (alignMatch) {
      textAlign = (alignMatch[1] as string).trim();
    }
  }

  // Direct attributes override class values
  if (attributes['background-color']) backgroundColor = attributes['background-color'];
  if (attributes['background-url']) backgroundUrl = attributes['background-url'];
  if (attributes['padding']) padding = attributes['padding'];
  if (attributes['text-align']) textAlign = attributes['text-align'];

  // Padding longhands — direct attributes override class-derived values
  if (attributes['padding-top']) paddingTop = attributes['padding-top'];
  if (attributes['padding-right']) paddingRight = attributes['padding-right'];
  if (attributes['padding-bottom']) paddingBottom = attributes['padding-bottom'];
  if (attributes['padding-left']) paddingLeft = attributes['padding-left'];

  // background-position and background-size from attributes
  const backgroundPosition = attributes['background-position'] ?? '';
  const backgroundSize = attributes['background-size'] ?? '';

  // Individual border sides
  const borderTop = attributes['border-top'] ?? '';
  const borderRight = attributes['border-right'] ?? '';
  const borderBottom = attributes['border-bottom'] ?? '';
  const borderLeft = attributes['border-left'] ?? '';

  // ENHANCE-classified visual props that flow through to the outer table
  // alongside class-derived styles. Attribute takes priority over class —
  // matches the pattern used for the explicit fields above.
  for (const prop of ['box-shadow', 'opacity'] as const) {
    const attrVal = attributes[prop];
    if (attrVal === undefined) continue;
    // Strip any class-derived occurrence of the same prop so the attribute
    // value wins without duplicating the declaration.
    extraStyles = extraStyles
      .split(';')
      .filter((d) => d.split(':')[0]?.trim() !== prop)
      .join(';');
    extraStyles = extraStyles ? `${extraStyles};${prop}:${attrVal}` : `${prop}:${attrVal}`;
  }

  return {
    backgroundColor, backgroundUrl, backgroundPosition, backgroundSize,
    padding, paddingTop, paddingRight, paddingBottom, paddingLeft,
    textAlign, extraStyles, borderTop, borderRight, borderBottom, borderLeft,
  };
}

// ---------------------------------------------------------------------------
// Style builders
// ---------------------------------------------------------------------------

/**
 * Builds the outer table's `style` attribute string.
 *
 * `border-radius` is applied here (on the outer table, non-Outlook only —
 * Outlook ignores border-radius on tables, which is acceptable).
 *
 * @param backgroundColor - The background color.
 * @param backgroundUrl   - Optional background image URL.
 * @param borderRadius    - Optional border radius value.
 * @param extraStyles     - Additional inline styles from classes.
 * @returns The ` style="..."` attribute or empty string.
 */
function buildOuterStyle(
  backgroundColor: string,
  backgroundUrl: string,
  backgroundPosition: string,
  backgroundSize: string,
  borderRadius: string,
  extraStyles: string,
): string {
  const parts: string[] = [];

  if (backgroundColor) {
    parts.push(`background-color:${backgroundColor}`);
  }

  if (backgroundUrl) {
    parts.push(`background-image:url(${backgroundUrl})`);
    parts.push(`background-size:${backgroundSize || 'cover'}`);
    parts.push(`background-position:${backgroundPosition || 'center'}`);
  }

  if (borderRadius) {
    parts.push(`border-radius:${borderRadius}`);
  }

  // Add any non-padding, non-bg styles from class resolution
  if (extraStyles) {
    for (const decl of extraStyles.split(';')) {
      const prop = decl.split(':')[0]?.trim() ?? '';
      if (
        prop &&
        prop !== 'background-color' &&
        prop !== 'padding' &&
        prop !== 'padding-top' &&
        prop !== 'padding-bottom' &&
        prop !== 'padding-left' &&
        prop !== 'padding-right'
      ) {
        parts.push(decl.trim());
      }
    }
  }

  return parts.length > 0 ? buildStyleAttr(parts.join(';')) : '';
}

/**
 * Builds the inner `<td>` style attribute.
 *
 * `font-size:0` collapses whitespace between inline-block columns.
 * `word-break:break-word` prevents long words from overflowing on mobile.
 * Individual columns reset `font-size` to their own value.
 *
 * Note: `text-align` is applied as the `align` HTML attribute on the `<td>`
 * by the caller; this function handles only the `style` string.
 *
 * @param padding    - Padding value.
 * @param _textAlign - Text alignment (applied via HTML `align` attribute by caller).
 * @param border     - Optional CSS border shorthand (e.g. `"1px solid #ccc"`).
 * @returns The ` style="..."` attribute or empty string.
 */
function buildTdStyle(
  padding: string,
  paddingTop: string,
  paddingRight: string,
  paddingBottom: string,
  paddingLeft: string,
  _textAlign: string,
  border: string,
  borderTop: string,
  borderRight: string,
  borderBottom: string,
  borderLeft: string,
  styleAttr = '',
): string {
  const parts: string[] = [
    'font-size:0',
    'mso-line-height-rule:exactly',
    'word-break:break-word',
  ];

  if (padding && padding !== '0') parts.push(`padding:${padding}`);
  // Longhands come after shorthand so they override specific sides
  if (paddingTop) parts.push(`padding-top:${paddingTop}`);
  if (paddingRight) parts.push(`padding-right:${paddingRight}`);
  if (paddingBottom) parts.push(`padding-bottom:${paddingBottom}`);
  if (paddingLeft) parts.push(`padding-left:${paddingLeft}`);

  if (border) parts.push(`border:${border}`);
  if (borderTop) parts.push(`border-top:${borderTop}`);
  if (borderRight) parts.push(`border-right:${borderRight}`);
  if (borderBottom) parts.push(`border-bottom:${borderBottom}`);
  if (borderLeft) parts.push(`border-left:${borderLeft}`);
  if (styleAttr) parts.push(styleAttr.replace(/;+$/, ''));

  return buildStyleAttr(parts.join(';'));
}

/**
 * Parses the total horizontal padding (left + right) from a CSS padding shorthand.
 *
 * Supports 1-, 2-, 3-, and 4-value shorthands using `px` units.
 * Returns 0 for unrecognised or non-px values (safe fallback).
 *
 * @param padding - CSS padding shorthand string (e.g. `"20px 32px"` or `"10px 24px 10px 24px"`).
 * @returns Total horizontal padding in pixels (left + right).
 */
function parseHorizontalPadding(
  padding: string,
  paddingLeft = '',
  paddingRight = '',
): number {
  const parsePx = (val: string): number => {
    if (!val || !val.endsWith('px')) return 0;
    const n = parseFloat(val);
    return Number.isNaN(n) ? 0 : n;
  };

  // Parse shorthand to get base right/left values
  let rightVal = '0px';
  let leftVal = '0px';

  if (padding && padding !== '0') {
    const parts = padding.trim().split(/\s+/);
    // 1 value:  all sides equal
    // 2 values: vertical | horizontal
    // 3 values: top | horizontal | bottom
    // 4 values: top | right | bottom | left
    if (parts.length === 1) {
      rightVal = parts[0] as string;
      leftVal = parts[0] as string;
    } else if (parts.length === 2 || parts.length === 3) {
      rightVal = parts[1] as string;
      leftVal = parts[1] as string;
    } else {
      rightVal = parts[1] as string;
      leftVal = parts[3] as string;
    }
  }

  // Longhand overrides override specific sides
  if (paddingRight) rightVal = paddingRight;
  if (paddingLeft) leftVal = paddingLeft;

  return parsePx(rightVal) + parsePx(leftVal);
}
