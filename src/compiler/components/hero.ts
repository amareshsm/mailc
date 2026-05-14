/**
 * `mc-hero` compiler — full-width banner with background image support.
 *
 * Generates a dual-output pattern for background images:
 * - Modern clients (Gmail, Apple Mail, OWA): CSS `background-image` on a `<div>`.
 * - Outlook desktop: VML `<v:rect>` + `<v:fill type="frame">` with fixed pixel
 *   dimensions, because Outlook ignores CSS `background-image` on non-table elements.
 *
 * When no `background-image` is set, renders a simple table wrapper with a
 * `background-color` cell. The overlay feature (CSS-only) and `full-width` mode
 * are also handled here.
 *
 * @module compiler/components/hero
 */

import type { ASTNode, CompileContext } from '../../types.js';
import { ErrorCode } from '../../errors/codes.js';
import { collectAndInline } from '../style-collector.js';
import { compileChildren, getEffectiveAttributes } from '../index.js';
import { isSafeUrl, sanitizeUrl } from '../../utils/url-sanitizer.js';
import { deriveDefaults } from '../../components/metadata.js';
import { assertClassModeAttributes, assertAttributeModeClass, stripClassModeAttributes, stripAttributeModeClass } from '../styling-mode.js';
import { filterAttributesByCompatibility } from '../attribute-classifier.js';
import { attr, reqAttr, styleAttr } from '../../utils/html-attr.js';

/** Default hero attribute values — derived from COMPONENT_METADATA. */
const DEFAULTS = deriveDefaults('mc-hero');

// ---------------------------------------------------------------------------
// Public compiler
// ---------------------------------------------------------------------------

/**
 * Compiles an `mc-hero` AST node into a background-image banner section.
 *
 * Dispatches to one of three rendering branches:
 * 1. No background image → simple table + colored td.
 * 2. Background image, standard width → VML conditional + CSS div dual-output.
 * 3. Background image, full-width → 100% table + CSS div; VML uses fillcolor only.
 *
 * @param node    - The `mc-hero` AST node.
 * @param context - Compile context with config (for content width).
 * @returns The compiled hero HTML string.
 */
export function compileHero(node: ASTNode, context: CompileContext): string {
  assertClassModeAttributes(node, context);
  assertAttributeModeClass(node, context);

  const attributes = filterAttributesByCompatibility(
    node.type,
    stripAttributeModeClass(node.attributes, stripClassModeAttributes(node.type, node.attributes, getEffectiveAttributes(node, context), context), context),
    context,
  );

  // ── CSS pipeline: Tailwind classes → inline styles ───────────────────
  // Run class resolution first so class-derived values can serve as fallbacks
  // for banned attrs (background-color, padding, etc.) that must also reach
  // the Outlook VML branch — not just the CSS div.
  let classStyle = '';
  let bgColorFromClass = '';
  let bgPositionFromClass = '';
  let bgSizeFromClass = '';
  let paddingFromClass = '';
  let alignFromClass = '';
  let verticalAlignFromClass = '';
  let borderRadiusFromClass = '';

  // Unconditional call so attribute-mode elements get source-map style
  // provenance (SM-C). Returns empty inline style when class is absent.
  classStyle = collectAndInline(attributes['class'] ?? '', context, attributes, node).inlineStyle;
  if (attributes['class']) {
    const bgMatch = classStyle.match(/(?:^|;)\s*background-color:\s*([^;]+)/);
    if (bgMatch) bgColorFromClass = (bgMatch[1] as string).trim();
    const bgPosMatch = classStyle.match(/(?:^|;)\s*background-position:\s*([^;]+)/);
    if (bgPosMatch) bgPositionFromClass = (bgPosMatch[1] as string).trim();
    const bgSizeMatch = classStyle.match(/(?:^|;)\s*background-size:\s*([^;]+)/);
    if (bgSizeMatch) bgSizeFromClass = (bgSizeMatch[1] as string).trim();
    const padMatch = classStyle.match(/(?:^|;)\s*padding:\s*([^;]+)/);
    if (padMatch) paddingFromClass = (padMatch[1] as string).trim();
    const alignMatch = classStyle.match(/(?:^|;)\s*text-align:\s*([^;]+)/);
    if (alignMatch) alignFromClass = (alignMatch[1] as string).trim();
    const vaMatch = classStyle.match(/(?:^|;)\s*vertical-align:\s*([^;]+)/);
    if (vaMatch) verticalAlignFromClass = (vaMatch[1] as string).trim();
    const brMatch = classStyle.match(/(?:^|;)\s*border-radius:\s*([^;]+)/);
    if (brMatch) borderRadiusFromClass = (brMatch[1] as string).trim();
  }

  // Also extract padding from style= so it reaches the VML branch
  const styleAttr = attributes['style'] ?? '';
  const paddingFromStyle = /padding:\s*([^;]+)/.exec(styleAttr)?.[1]?.trim() ?? '';

  // ── Attribute extraction (direct attrs override class-derived values) ─
  const rawBgImage    = attributes['background-image']    ?? '';
  const rawBgColor    = attributes['background-color']    ?? bgColorFromClass;
  const bgColor       = rawBgColor                        || DEFAULTS['background-color']!;
  const bgPosition    = attributes['background-position'] ?? (bgPositionFromClass || DEFAULTS['background-position']!);
  const bgSize        = attributes['background-size']     ?? (bgSizeFromClass || DEFAULTS['background-size']!);
  const rawHeight     = attributes['height']              ?? DEFAULTS['height']!;
  const padding       = attributes['padding']             ?? (paddingFromStyle || paddingFromClass || DEFAULTS['padding']!);
  const align         = attributes['align']               ?? (alignFromClass || DEFAULTS['align']!);
  const verticalAlign = attributes['vertical-align']      ?? (verticalAlignFromClass || DEFAULTS['vertical-align']!);
  const isFullWidth   = (attributes['full-width']         ?? DEFAULTS['full-width']!) === 'true';
  const borderRadius  = attributes['border-radius']       ?? borderRadiusFromClass;
  const overlayColor  = attributes['overlay-color']       ?? '';
  const ariaLabel     = attributes['aria-label']          ?? '';
  const contentWidth  = context.config.width; // numeric px, e.g. 600

  // Explicit style wins over class-derived styles
  const extraStyle = mergeStyles(classStyle, styleAttr);

  // ── Height validation ─────────────────────────────────────────────────
  const height = validateHeight(rawHeight, node, context);

  // ── URL safety ────────────────────────────────────────────────────────
  let bgImage = rawBgImage;
  if (rawBgImage) {
    if (!isSafeUrl(rawBgImage)) {
      context.warnings.push({
        code: ErrorCode.HERO_UNSAFE_URL,
        message:
          `<mc-hero> has an unsafe URL in "background-image": "${rawBgImage.slice(0, 40)}". ` +
          `The scheme is blocked to prevent script injection in webmail clients.`,
        severity: 'error',
        loc: node.loc ? { line: node.loc.start.line, col: node.loc.start.col } : undefined,
        fix: 'Use a URL starting with https://, http://, or a relative path.',
      });
      bgImage = sanitizeUrl(rawBgImage);
    }
    // Warn if no explicit fallback color provided for Outlook
    if (!rawBgColor) {
      context.warnings.push({
        code: ErrorCode.HERO_MISSING_FALLBACK_COLOR,
        message:
          `<mc-hero> has "background-image" but no "background-color" fallback. ` +
          `Outlook will show a white background instead of the image.`,
        severity: 'warning',
        loc: node.loc ? { line: node.loc.start.line, col: node.loc.start.col } : undefined,
        fix: 'Add background-color="#yourcolor" to match the dominant color of your hero image.',
      });
    }
  }

  // ── Compile children ──────────────────────────────────────────────────
  const childrenHtml = compileChildren(node.children, context);
  const innerHtml = overlayColor
    ? wrapWithOverlay(childrenHtml, overlayColor)
    : childrenHtml;

  // ── Accessibility ─────────────────────────────────────────────────────
  const ariaAttrs = ariaLabel ? ` role="region"${reqAttr('aria-label', ariaLabel)}` : '';
  const idAttr = attr('id', attributes['id']);

  // ── Optional border-radius (CSS only) ─────────────────────────────────
  const radiusStyle = borderRadius ? `border-radius:${borderRadius};` : '';

  context.counters.componentCount++;

  // ── Branch dispatch ───────────────────────────────────────────────────
  if (!bgImage) {
    const tableWidth = isFullWidth ? '100%' : `${contentWidth}px`;
    return renderNoImage(
      tableWidth, bgColor, height, padding, align, verticalAlign,
      radiusStyle, extraStyle, ariaAttrs, innerHtml, idAttr,
    );
  }

  if (isFullWidth) {
    return renderFullWidth(
      contentWidth, bgColor, height, padding, align, verticalAlign,
      bgImage, bgSize, bgPosition, radiusStyle, extraStyle, ariaAttrs, innerHtml, idAttr,
    );
  }

  return renderWithImage(
    contentWidth, bgColor, height, padding, align, verticalAlign,
    bgImage, bgSize, bgPosition, radiusStyle, extraStyle, ariaAttrs, innerHtml, idAttr,
  );
}

// ---------------------------------------------------------------------------
// Branch renderers
// ---------------------------------------------------------------------------

/**
 * Branch 1: No background image — simple table + colored cell.
 * Used when only `background-color` (or nothing) is set.
 */
function renderNoImage(
  tableWidth: string,
  bgColor: string,
  height: string,
  padding: string,
  align: string,
  valign: string,
  radiusStyle: string,
  extraStyle: string,
  ariaAttrs: string,
  children: string,
  idAttr: string,
): string {
  const tdStyle =
    `background-color:${bgColor};min-height:${height};` +
    `padding:${padding};text-align:${align};vertical-align:${valign};` +
    radiusStyle + extraStyle;

  return (
    `<table role="presentation" border="0" cellpadding="0" cellspacing="0"` +
    reqAttr('width', tableWidth) +
    reqAttr('bgcolor', bgColor) +
    idAttr +
    `>` +
    `<tr><td${styleAttr(tdStyle)}${ariaAttrs}>${children}</td></tr>` +
    `</table>`
  );
}

/**
 * Branch 2: Background image, standard (fixed) width.
 * Emits a VML conditional for Outlook + CSS div for modern clients.
 */
function renderWithImage(
  contentWidth: number,
  bgColor: string,
  height: string,
  padding: string,
  align: string,
  valign: string,
  bgImage: string,
  bgSize: string,
  bgPosition: string,
  radiusStyle: string,
  extraStyle: string,
  ariaAttrs: string,
  children: string,
  idAttr: string,
): string {
  const vmlOpen =
    `<!--[if mso | IE]>` +
    `<v:rect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"` +
    styleAttr(`width:${contentWidth}px;height:${height};`) +
    reqAttr('fillcolor', bgColor) +
    ` stroke="false">` +
    `<v:fill type="frame"` + reqAttr('src', bgImage) + reqAttr('color', bgColor) + ` />` +
    `<w:anchorlock/>` +
    `<v:textbox inset="0,0,0,0">` +
    `<div${styleAttr(`width:${contentWidth}px;padding:${padding};text-align:${align};`)}>` +
    `<![endif]-->`;

  const cssDivStyle =
    `background-image:url(${bgImage});background-color:${bgColor};` +
    `background-size:${bgSize};background-position:${bgPosition};` +
    `min-height:${height};padding:${padding};` +
    `text-align:${align};vertical-align:${valign};` +
    radiusStyle + extraStyle;

  const cssDiv =
    `<div${styleAttr(cssDivStyle)}${ariaAttrs}>` +
    children +
    `</div>`;

  const vmlClose =
    `<!--[if mso | IE]>` +
    `</div></v:textbox></v:rect>` +
    `<![endif]-->`;

  return (
    `<table role="presentation" border="0" cellpadding="0" cellspacing="0"` +
    reqAttr('width', `${contentWidth}px`) + idAttr + `>` +
    `<tr><td>` +
    vmlOpen + cssDiv + vmlClose +
    `</td></tr>` +
    `</table>`
  );
}

/**
 * Branch 3: Background image, full-width (100% table).
 *
 * VML cannot stretch to viewport width, so the VML block uses `fillcolor` only
 * (no background image). The CSS div still gets the full background-image.
 * This means Outlook desktop shows a solid-color hero — not the image.
 */
function renderFullWidth(
  contentWidth: number,
  bgColor: string,
  height: string,
  padding: string,
  align: string,
  valign: string,
  bgImage: string,
  bgSize: string,
  bgPosition: string,
  radiusStyle: string,
  extraStyle: string,
  ariaAttrs: string,
  children: string,
  idAttr: string,
): string {
  // VML for full-width: fillcolor only, no v:fill background image
  const vmlOpen =
    `<!--[if mso | IE]>` +
    `<v:rect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"` +
    styleAttr(`width:${contentWidth}px;height:${height};`) +
    reqAttr('fillcolor', bgColor) +
    ` stroke="false">` +
    `<w:anchorlock/>` +
    `<v:textbox inset="0,0,0,0">` +
    `<div${styleAttr(`width:${contentWidth}px;padding:${padding};text-align:${align};`)}>` +
    `<![endif]-->`;

  const cssDivStyle =
    `background-image:url(${bgImage});background-color:${bgColor};` +
    `background-size:${bgSize};background-position:${bgPosition};` +
    `min-height:${height};padding:${padding};` +
    `text-align:${align};vertical-align:${valign};` +
    radiusStyle + extraStyle;

  const cssDiv =
    `<div${styleAttr(cssDivStyle)}${ariaAttrs}>` +
    children +
    `</div>`;

  const vmlClose =
    `<!--[if mso | IE]>` +
    `</div></v:textbox></v:rect>` +
    `<![endif]-->`;

  return (
    `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"${idAttr}>` +
    `<tr><td>` +
    vmlOpen + cssDiv + vmlClose +
    `</td></tr>` +
    `</table>`
  );
}

// ---------------------------------------------------------------------------
// Overlay helper
// ---------------------------------------------------------------------------

/**
 * Wraps children in a `position:relative` container with an
 * `position:absolute` overlay div behind the content.
 *
 * CSS-only — Outlook desktop does not render `position:absolute` overlays.
 * The background image and fallback color still render in Outlook.
 *
 * @param children     - Compiled children HTML.
 * @param overlayColor - CSS color value (rgba supported).
 * @returns Wrapped HTML with overlay applied.
 */
function wrapWithOverlay(children: string, overlayColor: string): string {
  return (
    `<div style="position:relative;">` +
    `<div style="position:absolute;top:0;left:0;width:100%;height:100%;` +
    `background-color:${overlayColor};pointer-events:none;"></div>` +
    `<div style="position:relative;z-index:1;">${children}</div>` +
    `</div>`
  );
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Validates the `height` attribute and emits a warning if it is zero.
 *
 * A zero height makes the hero invisible — likely a mistake.
 * Falls back to `1px` so the document still compiles.
 *
 * @param height  - Raw height attribute string (e.g. "300px").
 * @param node    - The hero AST node (for warning location).
 * @param context - Compile context for emitting warnings.
 * @returns The validated height string.
 */
function validateHeight(
  height: string,
  node: ASTNode,
  context: CompileContext,
): string {
  if (height === '0' || height === '0px') {
    context.warnings.push({
      code: ErrorCode.HERO_INVALID_HEIGHT,
      message:
        `<mc-hero> height="${height}" is zero — the hero will be invisible. Using 1px as fallback.`,
      severity: 'warning',
      loc: node.loc ? { line: node.loc.start.line, col: node.loc.start.col } : undefined,
      fix: 'Set height to a positive pixel value, e.g. height="300px".',
    });
    return '1px';
  }
  return height;
}

// ---------------------------------------------------------------------------
// Style helpers
// ---------------------------------------------------------------------------

/**
 * Merges two inline style strings. `b` overrides `a` (explicit style wins over class).
 *
 * @param a - Base style string (e.g. class-derived).
 * @param b - Override style string (e.g. explicit `style` attribute).
 * @returns Merged style string without trailing semicolons.
 */
function mergeStyles(a: string, b: string): string {
  const trimA = a.replace(/;+$/, '').trim();
  const trimB = b.replace(/;+$/, '').trim();
  if (!trimA && !trimB) return '';
  if (!trimA) return trimB;
  if (!trimB) return trimA;
  return `${trimA};${trimB}`;
}
