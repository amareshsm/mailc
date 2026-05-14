/**
 * `mc-image` compiler — email-safe image element.
 *
 * Wraps `<img>` in `<table><tr><td>` because Outlook ignores `max-width`
 * on `<img>` elements. The `<td style="width:Npx">` forces Outlook to
 * respect the width constraint. For non-Outlook clients, the inline
 * `max-width` on `<img>` handles it.
 *
 * When `href` is present, wraps the `<img>` in an `<a>` tag inside the td.
 *
 * @module compiler/components/image
 */

import type { ASTNode, CompileContext } from '../../types.js';
import { ErrorCode } from '../../errors/codes.js';
import { collectAndInline } from '../style-collector.js';
import { getEffectiveAttributes } from '../index.js';
import { isSafeUrl, sanitizeUrl } from '../../utils/url-sanitizer.js';
import { deriveDefaults } from '../../components/metadata.js';
import { assertClassModeAttributes, assertAttributeModeClass, stripClassModeAttributes, stripAttributeModeClass } from '../styling-mode.js';
import { filterAttributesByCompatibility } from '../attribute-classifier.js';
import { attr, reqAttr, styleAttr } from '../../utils/html-attr.js';

/**
 * Default image attribute values — derived from COMPONENT_METADATA.
 * To change a default, edit src/components/metadata.ts, not this file.
 */
const DEFAULTS = deriveDefaults('mc-image');

/**
 * Compiles an `mc-image` node into a table-wrapped `<img>`.
 *
 * The table wrapper is required because Outlook ignores max-width on img.
 * The td constrains the image width in Outlook via `style="width:Npx"`.
 *
 * @param node    - The `mc-image` AST node.
 * @param context - Compile context with theme and warnings.
 * @returns The compiled image HTML with table wrapper.
 */
export function compileImage(
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

  const src = attributes['src'] ?? '';
  const alt = attributes['alt'] ?? DEFAULTS['alt']!;
  const href = attributes['href'];
  const title = attributes['title'];
  const widthAttr = attributes['width'] ?? '';
  const height = attributes['height'] ?? DEFAULTS['height']!;
  const classAttr = attributes['class'] ?? '';
  const align = attributes['align'] ?? 'center';
  const border = attributes['border'] ?? '';
  const target = attributes['target'] ?? '_blank';
  const rel = attributes['rel'] ?? 'noopener noreferrer';

  // Resolve padding and border-radius from class or direct attributes
  let padding = '';
  let paddingTop = '';
  let paddingRight = '';
  let paddingBottom = '';
  let paddingLeft = '';
  let borderRadius = '';

  // Unconditional call so attribute-mode elements get source-map style
  // provenance (SM-C). Returns empty inline style when classAttr is empty.
  const collected = collectAndInline(classAttr, context, attributes, node);
  if (classAttr) {
    const extraStyle = collected.inlineStyle;
    const padMatch = extraStyle.match(/(?:^|;)\s*padding:\s*([^;]+)/);
    if (padMatch) padding = (padMatch[1] as string).trim();
    const ptMatch = extraStyle.match(/(?:^|;)\s*padding-top:\s*([^;]+)/);
    if (ptMatch) paddingTop = (ptMatch[1] as string).trim();
    const prMatch = extraStyle.match(/(?:^|;)\s*padding-right:\s*([^;]+)/);
    if (prMatch) paddingRight = (prMatch[1] as string).trim();
    const pbMatch = extraStyle.match(/(?:^|;)\s*padding-bottom:\s*([^;]+)/);
    if (pbMatch) paddingBottom = (pbMatch[1] as string).trim();
    const plMatch = extraStyle.match(/(?:^|;)\s*padding-left:\s*([^;]+)/);
    if (plMatch) paddingLeft = (plMatch[1] as string).trim();
    const brMatch = extraStyle.match(/(?:^|;)\s*border-radius:\s*([^;]+)/);
    if (brMatch) borderRadius = (brMatch[1] as string).trim();
  }

  // Direct attributes override class-derived values
  if (attributes['padding']) padding = attributes['padding'];
  if (attributes['padding-top']) paddingTop = attributes['padding-top'];
  if (attributes['padding-right']) paddingRight = attributes['padding-right'];
  if (attributes['padding-bottom']) paddingBottom = attributes['padding-bottom'];
  if (attributes['padding-left']) paddingLeft = attributes['padding-left'];
  if (attributes['border-radius']) borderRadius = attributes['border-radius'];

  // ENHANCE visual props — attach to the wrapping <td> so they affect the
  // image's visible bounds. Outlook ignores them (graceful degradation).
  const boxShadow = attributes['box-shadow'] ?? '';
  const opacity = attributes['opacity'] ?? '';

  // ── Security: validate URLs ──────────────────────────────────────────
  const safeSrc = emitUrlWarning(node, src, 'src', context);
  const safeHref = href !== undefined ? emitUrlWarning(node, href, 'href', context) : undefined;

  // ── Accessibility checks ─────────────────────────────────────────────
  emitAltWarnings(node, alt, safeHref, context);

  // Parse the width: strip 'px' for the HTML attribute, keep for CSS
  const widthNum = parseWidth(widthAttr);

  // Build the <img> tag (extraStyle from class is for visual img styling, not wrapper td)
  const imgTag = buildImgTag(safeSrc, alt, title, widthNum, height, '', borderRadius);

  // Wrap in <a> if href is present
  const imgContent = safeHref !== undefined
    ? `<a${reqAttr('href', safeHref)}${reqAttr('target', target)}${reqAttr('rel', rel)} style="text-decoration:none;">${imgTag}</a>`
    : imgTag;

  const id = attributes['id'];

  context.counters.componentCount++;

  // Wrap in table for Outlook width constraint
  return buildTableWrapper(imgContent, widthNum, padding, paddingTop, paddingRight, paddingBottom, paddingLeft, border, align, id, boxShadow, opacity);
}

// ---------------------------------------------------------------------------
// Security helpers
// ---------------------------------------------------------------------------

/**
 * Validates a URL attribute for dangerous schemes and emits a warning if
 * unsafe. Returns the safe URL to use (original if safe, `#` if not).
 *
 * Dangerous schemes (`javascript:`, `data:`, `vbscript:`) can execute
 * arbitrary code in webmail clients that render HTML directly.
 *
 * @param node    - The AST node (for location info).
 * @param url     - The URL value to check.
 * @param attr    - The attribute name (`"href"` or `"src"`) for the message.
 * @param context - Compile context for pushing warnings.
 * @returns The safe URL string.
 */
function emitUrlWarning(
  node: ASTNode,
  url: string,
  attr: string,
  context: CompileContext,
): string {
  if (!isSafeUrl(url)) {
    context.warnings.push({
      code: ErrorCode.UNSAFE_URL,
      message:
        `<mc-image> has an unsafe URL in "${attr}": "${url.slice(0, 40)}". ` +
        `The scheme is blocked to prevent script injection in webmail clients.`,
      severity: 'error',
      loc: node.loc
        ? { line: node.loc.start.line, col: node.loc.start.col }
        : undefined,
      fix: `Use a safe URL starting with https://, http://, or a relative path.`,
    });
    return sanitizeUrl(url);
  }
  return url;
}

// ---------------------------------------------------------------------------
// Accessibility helpers
// ---------------------------------------------------------------------------

/**
 * Emits alt-text related warnings/errors based on config.
 *
 * - Missing `alt` attribute entirely → warning (or error if `enforceAltText`).
 * - Linked image (`href` set) with empty `alt=""` → info (functional image
 *   marked as decorative).
 *
 * @param node    - The `mc-image` AST node (for location info).
 * @param alt     - The resolved alt text value.
 * @param href    - The href attribute (undefined if not a linked image).
 * @param context - Compile context with config and warnings array.
 */
function emitAltWarnings(
  node: ASTNode,
  alt: string,
  href: string | undefined,
  context: CompileContext,
): void {
  const { warnMissingAlt, enforceAltText } = context.config.accessibility;
  const hasAltAttr = 'alt' in node.attributes;

  // 1. Missing alt entirely (not present in markup)
  if (!hasAltAttr && warnMissingAlt) {
    context.warnings.push({
      code: ErrorCode.MISSING_ALT,
      message:
        '<mc-image> is missing "alt" attribute. Screen readers and image-blocked ' +
        'email clients will show nothing.',
      severity: enforceAltText ? 'error' : 'warning',
      loc: node.loc
        ? { line: node.loc.start.line, col: node.loc.start.col }
        : undefined,
      fix: 'Add alt="Description of image", or alt="" if the image is decorative.',
    });
    return;
  }

  // 2. Linked image with empty alt — functional image marked as decorative
  if (href && alt === '') {
    context.warnings.push({
      code: ErrorCode.LINKED_IMAGE_EMPTY_ALT,
      message:
        'Linked <mc-image> has empty alt text. When an image links somewhere, ' +
        'it is functional — not decorative. Screen readers will not announce where this link goes.',
      severity: 'info',
      loc: node.loc
        ? { line: node.loc.start.line, col: node.loc.start.col }
        : undefined,
      fix: 'Add descriptive alt text: alt="Buy Product Name"',
    });
  }
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

/**
 * Builds the `<img>` tag with inline styles.
 *
 * @param src          - Image source URL.
 * @param alt          - Alt text.
 * @param title        - Optional title attribute.
 * @param widthNum     - Pixel width (0 if not set).
 * @param height       - Height value.
 * @param extraStyle   - Additional inline styles from classes.
 * @param borderRadius - Optional border-radius value.
 * @returns The `<img />` HTML string.
 */
function buildImgTag(
  src: string,
  alt: string,
  title: string | undefined,
  widthNum: number,
  height: string,
  extraStyle: string,
  borderRadius: string,
): string {
  // width:100% allows image to shrink on mobile viewports.
  // max-width:Npx caps it at the design width.
  // The HTML width="N" attribute is the Outlook fallback (Outlook ignores max-width).
  const widthCSS = widthNum > 0 ? 'width:100%' : '';
  const maxWidthCSS = widthNum > 0 ? `max-width:${widthNum}px` : '';

  const styleParts = [
    'display:block',
    widthCSS,
    maxWidthCSS,
    `height:${height}`,
    'border:0',
    'outline:none',
    'text-decoration:none',
  ].filter(Boolean);

  if (borderRadius) {
    styleParts.push(`border-radius:${borderRadius}`);
  }

  if (extraStyle) {
    styleParts.push(extraStyle);
  }

  const style = styleParts.join(';');

  // Note: leading space is included by reqAttr/attr/styleAttr, so we open
  // with `<img` (no trailing space) and let the helpers add their own.
  return (
    `<img` +
    reqAttr('src', src) +
    reqAttr('alt', alt) +
    attr('width', widthNum > 0 ? widthNum : undefined) +
    attr('title', title) +
    styleAttr(style) +
    ` />`
  );
}

/**
 * Wraps image content in a table for Outlook width constraint.
 *
 * Outlook ignores `max-width` on `<img>`, but respects `width` on `<td>`.
 * The `<td style="width:Npx">` constrains Outlook. For modern clients,
 * the `<img style="width:100%;max-width:Npx">` handles fluid sizing.
 *
 * Padding is applied to the `<td>` (not the `<img>`) — the same approach
 * MJML uses. This ensures padding works correctly in all email clients
 * including Outlook, where padding on tables is most reliable.
 *
 * The outer table uses `align` to control horizontal positioning within
 * the column (left / center / right).
 *
 * No class names on table/td — email clients like Gmail strip classes
 * from body elements. The fluid behavior comes from the parent column
 * (`mc-responsive`) stacking on mobile + the img's `width:100%`.
 *
 * @param content  - The `<img>` (or `<a><img></a>`) HTML.
 * @param widthNum - Pixel width (0 if not set).
 * @param padding       - Optional padding shorthand (e.g. "10px 25px").
 * @param paddingTop    - Optional padding-top override.
 * @param paddingRight  - Optional padding-right override.
 * @param paddingBottom - Optional padding-bottom override.
 * @param paddingLeft   - Optional padding-left override.
 * @param border        - Optional CSS border shorthand on the td.
 * @param align    - Horizontal alignment: "left", "center", or "right".
 * @returns Table-wrapped HTML.
 */
function buildTableWrapper(
  content: string,
  widthNum: number,
  padding: string,
  paddingTop: string,
  paddingRight: string,
  paddingBottom: string,
  paddingLeft: string,
  border: string,
  align: string,
  id?: string,
  boxShadow = '',
  opacity = '',
): string {
  const tdStyleParts: string[] = [];
  if (widthNum > 0) {
    tdStyleParts.push(`width:${widthNum}px`);
  }
  // Longhand padding takes priority over shorthand
  if (paddingTop || paddingRight || paddingBottom || paddingLeft) {
    if (paddingTop)    tdStyleParts.push(`padding-top:${paddingTop}`);
    if (paddingRight)  tdStyleParts.push(`padding-right:${paddingRight}`);
    if (paddingBottom) tdStyleParts.push(`padding-bottom:${paddingBottom}`);
    if (paddingLeft)   tdStyleParts.push(`padding-left:${paddingLeft}`);
  } else if (padding) {
    tdStyleParts.push(`padding:${padding}`);
  }
  if (border) {
    tdStyleParts.push(`border:${border}`);
  }
  if (boxShadow) {
    tdStyleParts.push(`box-shadow:${boxShadow}`);
  }
  if (opacity) {
    tdStyleParts.push(`opacity:${opacity}`);
  }
  const tdStyle = tdStyleParts.length > 0 ? styleAttr(`${tdStyleParts.join(';')};`) : '';

  return (
    `<table role="presentation" border="0" cellpadding="0" cellspacing="0"` +
    reqAttr('align', align) +
    attr('id', id) +
    ` style="border-collapse:collapse;border-spacing:0px;">` +
    `<tr>` +
    `<td${tdStyle}>` +
    content +
    `</td>` +
    `</tr>` +
    `</table>`
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parses a width string (e.g. "600px", "600", "100%") into a pixel number.
 * Returns 0 if not a valid pixel width.
 *
 * @param width - The width attribute value.
 * @returns The numeric pixel width, or 0.
 */
function parseWidth(width: string): number {
  if (!width) {
    return 0;
  }
  const cleaned = width.replace('px', '').trim();
  const num = parseInt(cleaned, 10);
  return Number.isNaN(num) ? 0 : num;
}
