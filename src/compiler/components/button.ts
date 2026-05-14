/**
 * `mc-button` compiler — bulletproof button with VML for Outlook.
 *
 * Generates:
 * - Outlook: `<v:roundrect>` with VML `arcsize`, `fillcolor`, `strokecolor`.
 * - Non-Outlook: `<a>` with `display:inline-block` and inline styles.
 * - Wrapper `<div>` for `text-align` positioning within the column.
 *
 * @module compiler/components/button
 */

import type { ASTNode, CompileContext } from '../../types.js';
import { ErrorCode } from '../../errors/codes.js';
import { collectAndInline } from '../style-collector.js';
import { getTextContent, getEffectiveAttributes } from '../index.js';
import { isSafeUrl, sanitizeUrl } from '../../utils/url-sanitizer.js';
import { COMPONENT_METADATA, deriveDefaults } from '../../components/metadata.js';
import { assertClassModeAttributes, assertAttributeModeClass, stripClassModeAttributes, stripAttributeModeClass } from '../styling-mode.js';
import { filterAttributesByCompatibility } from '../attribute-classifier.js';
import { attr, reqAttr, styleAttr } from '../../utils/html-attr.js';

/**
 * CSS properties that apply to the outer wrapper `<div>` rather than the button itself.
 *
 * Read directly from COMPONENT_METADATA (not the registry) because
 * `wrapperProps` is a built-in mc-button concept that plugins do not extend,
 * and reading from the registry at module load creates a circular initialisation
 * problem (registry → init → builtin-compilers → button → registry).
 *
 * Edit src/components/metadata.ts to change.
 */
const WRAPPER_PROPS = new Set(COMPONENT_METADATA['mc-button']!.wrapperProps ?? []);

/**
 * Default button attribute values — derived from COMPONENT_METADATA.
 * To change a default, edit src/components/metadata.ts, not this file.
 */
const DEFAULTS = deriveDefaults('mc-button');

/**
 * Compiles an `mc-button` node into VML + HTML button markup.
 *
 * @param node    - The `mc-button` AST node.
 * @param context - Compile context with theme and warnings.
 * @returns The compiled button HTML with Outlook VML conditional.
 */
export function compileButton(
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
  const content = getTextContent(node).trim();
  const rawHref = attributes['href'] ?? '#';

  // ── Security: validate href ──────────────────────────────────────────
  let href = rawHref;
  if (!isSafeUrl(rawHref)) {
    context.warnings.push({
      code: ErrorCode.UNSAFE_URL,
      message:
        `<mc-button> has an unsafe URL in "href": "${rawHref.slice(0, 40)}". ` +
        `The scheme is blocked to prevent script injection in webmail clients.`,
      severity: 'error',
      loc: node.loc
        ? { line: node.loc.start.line, col: node.loc.start.col }
        : undefined,
      fix: `Use a safe URL starting with https://, http://, or a relative path.`,
    });
    href = sanitizeUrl(rawHref);
  }

  // Resolve values from Tailwind classes
  const resolved = resolveButtonStyles(attributes, context, node);

  // `inner-padding` is the padding inside the <a> tag (controls visual button size).
  // `padding` is the outer spacing around the button within the column.
  // VML height must be based on inner-padding (what the user sees), not outer padding.
  const innerPadding = resolved.innerPadding;
  // Use explicit height attribute if provided, otherwise compute from font-size + padding
  const buttonHeight = resolved.heightOverride
    ? parsePx(resolved.heightOverride)
    : computeButtonHeight(resolved.fontSize, innerPadding);
  const arcsize = computeArcsize(resolved.borderRadius, buttonHeight);

  // Build alignment wrapper
  const wrapAlign = resolved.textAlign;

  // Build the VML block for Outlook
  const vml = buildVML({
    href,
    height: buttonHeight,
    width: resolved.width,
    arcsize,
    fillcolor: resolved.backgroundColor,
    strokecolor: resolved.backgroundColor,
    color: resolved.color,
    fontFamily: resolved.fontFamily,
    fontSize: resolved.fontSize,
    fontWeight: resolved.fontWeight,
    content,
  });

  // Build the <a> block for non-Outlook.
  // line-height must equal the font-size only — padding handles the button height.
  // Using the full buttonHeight here would double-count vertical padding.
  const anchor = buildAnchor({
    href,
    target: resolved.target,
    rel: resolved.rel,
    backgroundColor: resolved.backgroundColor,
    borderRadius: resolved.borderRadius,
    border: resolved.border,
    letterSpacing: resolved.letterSpacing,
    textDecoration: resolved.textDecoration,
    textTransform: resolved.textTransform,
    color: resolved.color,
    fontFamily: resolved.fontFamily,
    fontSize: resolved.fontSize,
    fontWeight: resolved.fontWeight,
    lineHeight: resolved.fontSize,
    padding: innerPadding,
    content,
  });

  const idAttr = attr('id', attributes['id']);

  context.counters.componentCount++;

  // Build wrapper div style (text-align + any wrapper/residual properties from classes)
  const wrapStyle = resolved.wrapperStyle
    ? `text-align:${wrapAlign};${resolved.wrapperStyle}`
    : `text-align:${wrapAlign};`;

  return (
    `<div${idAttr}${styleAttr(wrapStyle)}>` +
    `<!--[if mso]>` +
    vml +
    `<![endif]-->` +
    `<!--[if !mso]><!-->` +
    anchor +
    `<!--<![endif]-->` +
    `</div>`
  );
}

// ---------------------------------------------------------------------------
// Style resolution
// ---------------------------------------------------------------------------

/** Resolved button style values after merging classes + attributes + defaults. */
interface ButtonStyles {
  backgroundColor: string;
  color: string;
  fontSize: string;
  fontWeight: string;
  fontFamily: string;
  borderRadius: string;
  border: string;
  letterSpacing: string;
  textDecoration: string;
  textTransform: string;
  /** Explicit height override. Empty string = auto-compute from font-size + padding. */
  heightOverride: string;
  /** Outer padding — space around the button within the column. */
  padding: string;
  /** Inner padding — padding inside the <a> tag; controls button visual size. */
  innerPadding: string;
  textAlign: string;
  width: string;
  /** Link target attribute (default `_blank`). */
  target: string;
  /** Link rel attribute for security (default `noopener noreferrer`). */
  rel: string;
  /**
   * Extra inline style for the wrapper `<div>` — contains spacing/layout properties
   * (e.g. margin) and any residual ENHANCE properties (e.g. box-shadow, opacity)
   * resolved from Tailwind classes. Empty string if none.
   */
  wrapperStyle: string;
}

/**
 * Resolves the final button styles from Tailwind classes, direct attributes, and defaults.
 *
 * @param attributes - The node's attributes.
 * @param context    - Compile context.
 * @param node       - The original AST node (for source map style origin tracking).
 * @returns Resolved button style values.
 */
function resolveButtonStyles(
  attributes: Record<string, string>,
  context: CompileContext,
  node: ASTNode,
): ButtonStyles {
  const classAttr = attributes['class'] ?? '';
  const styleMap = new Map<string, string>();

  // Resolve from Tailwind classes (ENHANCE properties are now inline in liberal mode).
  // Called unconditionally so source-map style provenance (SM-C) is recorded
  // for attribute-mode elements too. Returns empty inline style when classAttr is empty.
  const collected = collectAndInline(classAttr, context, attributes, node);
  if (classAttr) {
    for (const decl of collected.inlineStyle.split(';')) {
      const colonIdx = decl.indexOf(':');
      if (colonIdx === -1) {
        continue;
      }
      const prop = decl.slice(0, colonIdx).trim();
      const val = decl.slice(colonIdx + 1).trim();
      if (prop && val) {
        styleMap.set(prop, val);
      }
    }
  }

  // Extract wrapper-level spacing properties (margin etc.) from resolved styles.
  // Direct attributes take priority over class-derived values.
  const wrapperParts: string[] = [];
  for (const prop of WRAPPER_PROPS) {
    const val = attributes[prop] ?? styleMap.get(prop);
    if (val !== undefined) {
      wrapperParts.push(`${prop}:${val}`);
    }
  }

  // Collect residual style properties — anything from the class string that isn't consumed
  // by a specific button field (backgroundColor, color, etc.) or WRAPPER_PROPS. These are
  // visual effects like box-shadow or opacity that belong on the wrapper div.
  const BUTTON_CONSUMED_PROPS = new Set([
    'background-color', 'color', 'font-size', 'font-weight', 'font-family',
    'border-radius', 'border', 'letter-spacing', 'text-decoration', 'text-transform',
    'height', 'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'text-align', 'width',
    ...Array.from(WRAPPER_PROPS),
  ]);
  for (const [prop, val] of styleMap) {
    if (!BUTTON_CONSUMED_PROPS.has(prop)) {
      wrapperParts.push(`${prop}:${val}`);
    }
  }
  const wrapperStyle = wrapperParts.join(';');

  // Compose inner-padding from longhands if individual sides are provided
  const paddingShorthand =
    attributes['padding'] ?? styleMap.get('padding') ?? DEFAULTS['padding']!;
  const ptAttr = attributes['padding-top'] ?? styleMap.get('padding-top') ?? '';
  const prAttr = attributes['padding-right'] ?? styleMap.get('padding-right') ?? '';
  const pbAttr = attributes['padding-bottom'] ?? styleMap.get('padding-bottom') ?? '';
  const plAttr = attributes['padding-left'] ?? styleMap.get('padding-left') ?? '';
  const composedPadding =
    ptAttr || prAttr || pbAttr || plAttr
      ? composeInnerPadding(paddingShorthand, ptAttr, prAttr, pbAttr, plAttr)
      : paddingShorthand;

  return {
    backgroundColor:
      attributes['background-color'] ??
      styleMap.get('background-color') ??
      DEFAULTS['background-color']!,
    color:
      attributes['color'] ?? styleMap.get('color') ?? DEFAULTS['color']!,
    fontSize:
      attributes['font-size'] ??
      styleMap.get('font-size') ??
      DEFAULTS['font-size']!,
    fontWeight:
      attributes['font-weight'] ??
      styleMap.get('font-weight') ??
      DEFAULTS['font-weight']!,
    fontFamily:
      attributes['font-family'] ??
      styleMap.get('font-family') ??
      DEFAULTS['font-family']!,
    borderRadius:
      attributes['border-radius'] ??
      styleMap.get('border-radius') ??
      DEFAULTS['border-radius']!,
    border:
      attributes['border'] ?? styleMap.get('border') ?? '',
    letterSpacing:
      attributes['letter-spacing'] ?? styleMap.get('letter-spacing') ?? '',
    textDecoration:
      attributes['text-decoration'] ?? styleMap.get('text-decoration') ?? '',
    textTransform:
      attributes['text-transform'] ?? styleMap.get('text-transform') ?? '',
    heightOverride: attributes['height'] ?? '',
    padding: paddingShorthand,
    // inner-padding controls the visual button size (padding inside the <a>).
    // Falls back to outer padding (with any longhand overrides) if not specified.
    innerPadding:
      attributes['inner-padding'] ?? composedPadding,
    textAlign:
      attributes['text-align'] ??
      styleMap.get('text-align') ??
      DEFAULTS['text-align']!,
    width:
      attributes['width'] ?? styleMap.get('width') ?? DEFAULTS['width']!,
    target: attributes['target'] ?? '_blank',
    rel: attributes['rel'] ?? 'noopener noreferrer',
    wrapperStyle,
  };
}

// ---------------------------------------------------------------------------
// VML builder
// ---------------------------------------------------------------------------

/** VML template parameters. */
interface VMLParams {
  href: string;
  height: number;
  width: string;
  arcsize: string;
  fillcolor: string;
  strokecolor: string;
  color: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  content: string;
}

/**
 * Builds the Outlook VML `<v:roundrect>` block.
 *
 * @param p - VML parameters.
 * @returns The VML HTML string.
 */
function buildVML(p: VMLParams): string {
  const widthStyle =
    p.width !== 'auto' ? `width:${parsePx(p.width)}px;` : '';

  return (
    `<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"` +
    reqAttr('href', p.href) +
    styleAttr(`height:${p.height}px;v-text-anchor:middle;${widthStyle}`) +
    reqAttr('arcsize', p.arcsize) +
    reqAttr('strokecolor', p.strokecolor) +
    reqAttr('fillcolor', p.fillcolor) +
    `>` +
    `<w:anchorlock/>` +
    `<center${styleAttr(`color:${p.color};font-family:${p.fontFamily};font-size:${p.fontSize};font-weight:${p.fontWeight};`)}>` +
    p.content +
    `</center>` +
    `</v:roundrect>`
  );
}

// ---------------------------------------------------------------------------
// Anchor builder
// ---------------------------------------------------------------------------

/** Anchor tag parameters. */
interface AnchorParams {
  href: string;
  /** Link target (default `_blank`). */
  target: string;
  /** Link rel for security (default `noopener noreferrer`). */
  rel: string;
  backgroundColor: string;
  borderRadius: string;
  border: string;
  letterSpacing: string;
  /** Text decoration override. Empty string keeps the default `none`. */
  textDecoration: string;
  /** Text transform (uppercase, lowercase, capitalize). Empty string = no transform. */
  textTransform: string;
  color: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  padding: string;
  content: string;
}

/**
 * Builds the non-Outlook `<a>` tag block.
 *
 * @param p - Anchor parameters.
 * @returns The `<a>` HTML string.
 */
function buildAnchor(p: AnchorParams): string {
  const styleParts = [
    'display:inline-block',
    `background-color:${p.backgroundColor}`,
    `border-radius:${p.borderRadius}`,
    `color:${p.color}`,
    `font-family:${p.fontFamily}`,
    `font-size:${p.fontSize}`,
    `font-weight:${p.fontWeight}`,
    `line-height:${p.lineHeight}`,
    'text-align:center',
    `text-decoration:${p.textDecoration || 'none'}`,
    `padding:${p.padding}`,
    '-webkit-text-size-adjust:none',
  ];
  if (p.border) styleParts.push(`border:${p.border}`);
  if (p.letterSpacing) styleParts.push(`letter-spacing:${p.letterSpacing}`);
  if (p.textTransform) styleParts.push(`text-transform:${p.textTransform}`);

  return (
    `<a` +
    reqAttr('href', p.href) +
    reqAttr('target', p.target) +
    reqAttr('rel', p.rel) +
    styleAttr(`${styleParts.join(';')};`) +
    `>` +
    p.content +
    `</a>`
  );
}

// ---------------------------------------------------------------------------
// Calculation helpers
// ---------------------------------------------------------------------------

/**
 * Computes a reasonable button height from font size + padding.
 *
 * @param fontSize - e.g. "16px".
 * @param padding  - e.g. "12px 24px".
 * @returns The total height in pixels.
 */
function computeButtonHeight(fontSize: string, padding: string): number {
  const fontPx = parsePx(fontSize);
  const parts = padding.split(/\s+/);
  const topPadding = parsePx(parts[0] ?? '0');
  // CSS shorthand: 1-value → top=bottom=parts[0]; 2-value → top=bottom=parts[0];
  // 3-value (T H B) or 4-value (T R B L) → bottom=parts[2].
  const bottomPadding = parts.length >= 3 ? parsePx(parts[2] ?? '0') : topPadding;
  return fontPx + topPadding + bottomPadding;
}

/**
 * Computes VML arcsize as a percentage string.
 *
 * `arcsize = (border-radius / button-height) * 100 + "%"`
 *
 * @param borderRadius - e.g. "4px".
 * @param buttonHeight - Total button height in pixels.
 * @returns Arcsize string like `"8%"`.
 */
function computeArcsize(borderRadius: string, buttonHeight: number): string {
  const radiusPx = parsePx(borderRadius);
  if (radiusPx === 0 || buttonHeight === 0) {
    return '0%';
  }
  const pct = Math.round((radiusPx / buttonHeight) * 100);
  return `${pct}%`;
}

/**
 * Parses a pixel value string to a number.
 *
 * @param value - e.g. "16px", "16".
 * @returns The numeric pixel value, or 0.
 */
function parsePx(value: string): number {
  const num = parseInt(value.replace('px', ''), 10);
  return Number.isNaN(num) ? 0 : num;
}

/**
 * Composes a 4-value padding shorthand from individual longhands,
 * using the parsed shorthand values as defaults for any unset sides.
 *
 * @param shorthand - e.g. "10px 25px".
 * @param top       - Override for padding-top (empty = use shorthand).
 * @param right     - Override for padding-right.
 * @param bottom    - Override for padding-bottom.
 * @param left      - Override for padding-left.
 * @returns A 4-value padding shorthand string.
 */
function composeInnerPadding(
  shorthand: string,
  top: string,
  right: string,
  bottom: string,
  left: string,
): string {
  const parts = (shorthand || '0').trim().split(/\s+/);
  let t: string, r: string, b: string, l: string;
  if (parts.length === 1) {
    t = r = b = l = parts[0] as string;
  } else if (parts.length === 2) {
    t = b = parts[0] as string;
    r = l = parts[1] as string;
  } else if (parts.length === 3) {
    t = parts[0] as string;
    r = l = parts[1] as string;
    b = parts[2] as string;
  } else {
    t = parts[0] as string;
    r = parts[1] as string;
    b = parts[2] as string;
    l = parts[3] as string;
  }
  if (top) t = top;
  if (right) r = right;
  if (bottom) b = bottom;
  if (left) l = left;
  return `${t} ${r} ${b} ${l}`;
}
