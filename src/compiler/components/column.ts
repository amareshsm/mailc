/**
 * `mc-column` compiler — responsive column inside `mc-section`.
 *
 * Generates a fluid-hybrid column pattern:
 * - Outlook: `<td>` with fixed pixel width.
 * - Non-Outlook: `<div>` with `display:inline-block` + `max-width`.
 * - Adds `mc-responsive` class for mobile stacking via `@media`.
 *
 * Width is calculated from the parent width and the column's width class
 * (e.g. `w-1/2` → 50% of parent) or explicit `width` attribute.
 *
 * @module compiler/components/column
 */

import type { ASTNode, CompileContext } from '../../types.js';
import { collectAndInline } from '../style-collector.js';
import { compileChildren, getEffectiveAttributes } from '../index.js';
import { deriveDefaults } from '../../components/metadata.js';
import { assertClassModeAttributes, assertAttributeModeClass, stripClassModeAttributes, stripAttributeModeClass } from '../styling-mode.js';
import { attr, styleAttr as buildStyleAttr } from '../../utils/html-attr.js';
import { filterAttributesByCompatibility } from '../attribute-classifier.js';

/**
 * Default column attribute values — derived from COMPONENT_METADATA.
 * To change a default, edit src/components/metadata.ts, not this file.
 */
const DEFAULTS = deriveDefaults('mc-column');

/**
 * Compiles an `mc-column` node into Outlook `<td>` + fluid-hybrid `<div>`.
 *
 * @param node    - The `mc-column` AST node.
 * @param context - Compile context with parentWidth for width calculation.
 * @returns The compiled column HTML with Outlook conditionals.
 */
export function compileColumn(
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
  let verticalAlign = attributes['vertical-align'] ?? DEFAULTS['vertical-align']!;

  // Calculate pixel width
  const columnWidth = resolveColumnWidth(
    classAttr,
    attributes['width'],
    context.parentWidth,
    context.columnCount,
  );

  // Resolve padding from Tailwind classes or direct attribute
  let padding: string = DEFAULTS['padding']!;
  let paddingTop = '';
  let paddingRight = '';
  let paddingBottom = '';
  let paddingLeft = '';
  let backgroundColor = '';
  let borderRadius = '';
  // Remaining SAFE/ENHANCE properties not consumed by the column's structural slots.
  // Forwarded to the inner <td> so callers can style typography, color, etc.
  let residualStyle = '';
  // Visual-effect properties that belong on the outer <div> (the visible column boundary).
  let boxShadow = '';
  let opacity = '';

  // Unconditional call so attribute-mode elements get source-map style
  // provenance (SM-C). Returns empty inline style when classAttr is empty.
  const collected = collectAndInline(classAttr, context, attributes, node);
  if (classAttr) {
    const styleMap = parseStyleString(collected.inlineStyle);

    const extract = (prop: string): string => {
      const val = styleMap.get(prop) ?? '';
      styleMap.delete(prop);
      return val;
    };

    // Extract properties consumed by column's structural slots
    const paddingVal = extract('padding');
    if (paddingVal) padding = paddingVal;
    const ptVal = extract('padding-top');
    if (ptVal) paddingTop = ptVal;
    const prVal = extract('padding-right');
    if (prVal) paddingRight = prVal;
    const pbVal = extract('padding-bottom');
    if (pbVal) paddingBottom = pbVal;
    const plVal = extract('padding-left');
    if (plVal) paddingLeft = plVal;
    const bgVal = extract('background-color');
    if (bgVal) backgroundColor = bgVal;
    const brVal = extract('border-radius');
    if (brVal) borderRadius = brVal;
    const vaVal = extract('vertical-align');
    if (vaVal) verticalAlign = vaVal;

    // Visual-effect properties belong on the outer div (the visible column boundary),
    // not the inner td. Extract them explicitly so they land in the right place.
    const bsVal = extract('box-shadow');
    if (bsVal) boxShadow = bsVal;
    const opVal = extract('opacity');
    if (opVal) opacity = opVal;

    // Anything left over (color, font-size, text-align, etc.) goes to the inner td
    if (styleMap.size > 0) {
      residualStyle = [...styleMap.entries()].map(([p, v]) => `${p}:${v}`).join(';');
    }
  }

  // Direct attribute overrides (attribute mode or explicit attrs take priority)
  if (attributes['padding']) padding = attributes['padding'];
  if (attributes['padding-top']) paddingTop = attributes['padding-top'];
  if (attributes['padding-right']) paddingRight = attributes['padding-right'];
  if (attributes['padding-bottom']) paddingBottom = attributes['padding-bottom'];
  if (attributes['padding-left']) paddingLeft = attributes['padding-left'];
  if (attributes['background-color']) backgroundColor = attributes['background-color'];
  if (attributes['border-radius']) borderRadius = attributes['border-radius'];
  if (attributes['vertical-align']) verticalAlign = attributes['vertical-align'];
  if (attributes['box-shadow']) boxShadow = attributes['box-shadow'];
  if (attributes['opacity']) opacity = attributes['opacity'];

  // Border shorthand and longhands — only from direct attrs (complex shorthands not
  // reliably expressible via Tailwind; use style="" escape hatch for class mode)
  const border = attributes['border'] ?? '';
  const borderTop = attributes['border-top'] ?? '';
  const borderRight = attributes['border-right'] ?? '';
  const borderBottom = attributes['border-bottom'] ?? '';
  const borderLeft = attributes['border-left'] ?? '';
  // inner-background-color is the background of the inner content table — the
  // area behind children, inside the column padding. Distinct from the outer
  // background-color which covers the full column including its padding area.
  const innerBackgroundColor = attributes['inner-background-color'] ?? '';

  // style= passthrough — applied to both the Outlook td and non-Outlook inner td
  // as an escape hatch for CSS that cannot be expressed via class (e.g. border shorthands)
  const styleAttr = attributes['style'] ?? '';

  // Compile children with column width as parent
  const childContext: CompileContext = {
    ...context,
    parentWidth: columnWidth,
  };
  const childrenHTML = compileChildren(node.children, childContext);

  // Build Outlook <td> — include background-color and border for Outlook rendering
  const outlookTdStyleParts = [`vertical-align:${verticalAlign}`, `width:${columnWidth}px`];
  if (backgroundColor) outlookTdStyleParts.push(`background-color:${backgroundColor}`);
  if (border) outlookTdStyleParts.push(`border:${border}`);
  if (styleAttr) outlookTdStyleParts.push(styleAttr.replace(/;+$/, ''));
  const outlookTd =
    `<!--[if mso | IE]>` +
    `<td${buildStyleAttr(`${outlookTdStyleParts.join(';')};`)}>` +
    `<![endif]-->`;

  const outlookTdClose =
    `<!--[if mso | IE]>` +
    `</td>` +
    `<![endif]-->`;

  // Build fluid-hybrid <div>
  // font-size:0px — belt-and-suspenders whitespace collapse alongside section td's font-size:0.
  // direction:ltr — ensures column content flows left-to-right even when mc-body dir="rtl".
  const divStyleParts = [
    'font-size:0px',
    'direction:ltr',
    'display:inline-block',
    `vertical-align:${verticalAlign}`,
    'width:100%',
    `max-width:${columnWidth}px`,
  ];
  if (backgroundColor) divStyleParts.push(`background-color:${backgroundColor}`);
  if (borderRadius) divStyleParts.push(`border-radius:${borderRadius}`);
  if (boxShadow) divStyleParts.push(`box-shadow:${boxShadow}`);
  if (opacity) divStyleParts.push(`opacity:${opacity}`);
  const divStyle = divStyleParts.join(';');

  // Build inner <td> style
  const tdStyleParts = [`padding:${padding}`, 'word-break:break-word'];
  // Longhands come after shorthand so they override specific sides
  if (paddingTop) tdStyleParts.push(`padding-top:${paddingTop}`);
  if (paddingRight) tdStyleParts.push(`padding-right:${paddingRight}`);
  if (paddingBottom) tdStyleParts.push(`padding-bottom:${paddingBottom}`);
  if (paddingLeft) tdStyleParts.push(`padding-left:${paddingLeft}`);
  if (border) tdStyleParts.push(`border:${border}`);
  if (borderTop) tdStyleParts.push(`border-top:${borderTop}`);
  if (borderRight) tdStyleParts.push(`border-right:${borderRight}`);
  if (borderBottom) tdStyleParts.push(`border-bottom:${borderBottom}`);
  if (borderLeft) tdStyleParts.push(`border-left:${borderLeft}`);
  if (innerBackgroundColor) tdStyleParts.push(`background-color:${innerBackgroundColor}`);
  if (residualStyle) tdStyleParts.push(residualStyle);
  if (styleAttr) tdStyleParts.push(styleAttr.replace(/;+$/, ''));
  const tdStyle = tdStyleParts.join(';');

  const idAttr = attr('id', attributes['id']);

  context.counters.componentCount++;
  // Inside an mc-group, columns must NOT carry mc-responsive — that's the
  // class the global @media rule targets to flip them to width:100% on mobile.
  // Dropping it is what makes grouped columns stay side-by-side on phones.
  const responsiveClass = context.insideGroup ? '' : 'mc-responsive';
  const classAttrOut = attr('class', responsiveClass);
  return (
    outlookTd +
    `<div${classAttrOut}${idAttr}${buildStyleAttr(`${divStyle};`)}>` +
    `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">` +
    `<tr>` +
    `<td${buildStyleAttr(`${tdStyle};`)}>` +
    childrenHTML +
    `</td>` +
    `</tr>` +
    `</table>` +
    `</div>` +
    outlookTdClose
  );
}

// ---------------------------------------------------------------------------
// Width calculation
// ---------------------------------------------------------------------------

/**
 * Parses a semicolon-separated inline style string into a property → value map.
 * Preserves declaration order (insertion order preserved by Map).
 */
function parseStyleString(style: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!style) return map;
  for (const part of style.split(';')) {
    const idx = part.indexOf(':');
    if (idx === -1) continue;
    const prop = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (prop && val) map.set(prop, val);
  }
  return map;
}

/** Fraction class patterns and their decimal values. */
const WIDTH_FRACTIONS: Record<string, number> = {
  'w-full': 1,
  'w-1/2': 0.5,
  'w-1/3': 1 / 3,
  'w-2/3': 2 / 3,
  'w-1/4': 0.25,
  'w-3/4': 0.75,
  'w-1/5': 0.2,
  'w-2/5': 0.4,
  'w-3/5': 0.6,
  'w-4/5': 0.8,
  'w-1/6': 1 / 6,
  'w-5/6': 5 / 6,
};

/**
 * Resolves the pixel width of a column from its class or width attribute.
 *
 * Priority:
 * 1. Explicit `width` attribute (e.g. `"300px"` or `"50%"`).
 * 2. Tailwind fraction class (e.g. `w-1/2`).
 * 3. Auto-divide: `parentWidth / columnCount` (MJML-compatible behavior).
 *
 * @param classAttr   - The class attribute string.
 * @param widthAttr   - The explicit width attribute value.
 * @param parentWidth - The parent element's width in pixels.
 * @param columnCount - Number of column siblings (from section context).
 * @returns The column width in pixels.
 */
function resolveColumnWidth(
  classAttr: string,
  widthAttr: string | undefined,
  parentWidth: number,
  columnCount: number,
): number {
  // Explicit width attribute takes priority
  if (widthAttr) {
    // Percentage width
    if (widthAttr.endsWith('%')) {
      const pct = parseFloat(widthAttr);
      if (!Number.isNaN(pct)) {
        return Math.round((pct / 100) * parentWidth);
      }
    }
    // Pixel width
    const px = parseInt(widthAttr.replace('px', ''), 10);
    if (!Number.isNaN(px) && px > 0) {
      return px;
    }
  }

  // Check for fraction classes
  const classes = classAttr.split(/\s+/).filter(Boolean);
  for (const cls of classes) {
    const fraction = WIDTH_FRACTIONS[cls];
    if (fraction !== undefined) {
      return Math.round(fraction * parentWidth);
    }
  }

  // Auto-divide: equal share among sibling columns (MJML-compatible)
  return Math.round(parentWidth / columnCount);
}
