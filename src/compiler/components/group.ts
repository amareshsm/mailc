/**
 * `mc-group` compiler — keeps adjacent `mc-column` children side-by-side on mobile.
 *
 * Without `mc-group`, every `mc-column` carries the `mc-responsive` class which
 * triggers `width:100%!important` below the mobile breakpoint, causing columns
 * to stack vertically. `mc-group` opts out of that: its children are compiled
 * with `context.insideGroup = true`, so they omit `mc-responsive` and keep
 * their declared widths even on narrow screens.
 *
 * Output shape:
 *   <!--[if mso]><td style="width:GROUP_PX"><![endif]-->     ← group's slot in
 *   <div ...>                                                  the section's
 *     <!--[if mso]><table><tr><![endif]-->                     MSO row
 *       <!--[if mso]><td><![endif]--><div>col1</div><!--[if mso]></td><![endif]-->
 *       <!--[if mso]><td><![endif]--><div>col2</div><!--[if mso]></td><![endif]-->
 *     <!--[if mso]></tr></table><![endif]-->
 *   </div>
 *   <!--[if mso]></td><![endif]-->
 *
 * @module compiler/components/group
 */

import type { ASTNode, CompileContext } from '../../types.js';
import { ErrorCode } from '../../errors/codes.js';
import { collectAndInline } from '../style-collector.js';
import { compileChildren, getEffectiveAttributes } from '../index.js';
import { deriveDefaults } from '../../components/metadata.js';
import { attr, styleAttr } from '../../utils/html-attr.js';
import { escapeHtml } from '../../utils/html-escape.js';
import { assertClassModeAttributes, assertAttributeModeClass, stripClassModeAttributes, stripAttributeModeClass } from '../styling-mode.js';
import { filterAttributesByCompatibility } from '../attribute-classifier.js';

const DEFAULTS = deriveDefaults('mc-group');

/**
 * Compiles an `mc-group` node into the inline-block + Outlook table layout.
 */
export function compileGroup(
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
  const direction = attributes['direction'] ?? DEFAULTS['direction'] ?? 'ltr';
  const verticalAlign = attributes['vertical-align'] ?? DEFAULTS['vertical-align'] ?? 'top';
  const widthAttr = attributes['width'];

  // Resolve background color from class or direct attribute. Group only
  // accepts background + spacing classes (per metadata), so style collection
  // is intentionally minimal here.
  let backgroundColor = '';
  // Unconditional call so attribute-mode elements get source-map style
  // provenance (SM-C). Returns empty inline style when classAttr is empty.
  const collected = collectAndInline(classAttr, context, attributes, node);
  if (classAttr) {
    const bgMatch = collected.inlineStyle.match(/(?:^|;)\s*background-color:\s*([^;]+)/);
    if (bgMatch) backgroundColor = (bgMatch[1] as string).trim();
  }
  if (attributes['background-color']) {
    backgroundColor = attributes['background-color'] as string;
  }

  // Group width in pixels — fills the slot the section gave us by default
  // (parentWidth / columnCount), or honours an explicit width attribute.
  const groupWidthPx = resolveGroupWidth(widthAttr, context.parentWidth, context.columnCount);

  // Validate child columns: percentage widths only.
  // (Px widths inside a group break the inline-block math because the wrapper
  // is sized in px and the children must sum to 100% of it.)
  const columnChildren = node.children.filter((c) => c.type === 'mc-column');
  for (const col of columnChildren) {
    const w = col.attributes?.['width'];
    if (w && /\d\s*px$/.test(w.trim())) {
      context.warnings.push({
        code: ErrorCode.GROUP_COLUMN_PX_WIDTH,
        message:
          `<mc-column width="${w}"> inside <mc-group> uses a pixel width. ` +
          `Children of mc-group must use percentage widths so they sum correctly inside the group's inline-block wrapper.`,
        severity: 'warning',
        loc: col.loc
          ? { line: col.loc.start.line, col: col.loc.start.col }
          : undefined,
        fix: `Replace width="${w}" with a percentage (e.g. width="50%").`,
      });
    }
  }

  // Children compile against the group's pixel width as their parent, with
  // insideGroup=true so they drop the mc-responsive class.
  const childContext: CompileContext = {
    ...context,
    parentWidth: groupWidthPx,
    columnCount: columnChildren.length || 1,
    insideGroup: true,
  };

  const orderedChildren = direction === 'rtl' ? [...node.children].reverse() : node.children;
  const childrenHTML = compileChildren(orderedChildren, childContext);

  // Outer Outlook <td> — the group's slot in the section's MSO row.
  const outerOutlookTdStyleParts = [
    `vertical-align:${verticalAlign}`,
    `width:${groupWidthPx}px`,
  ];
  if (backgroundColor) outerOutlookTdStyleParts.push(`background-color:${backgroundColor}`);
  const outerOutlookOpen =
    `<!--[if mso | IE]>` +
    `<td${styleAttr(`${outerOutlookTdStyleParts.join(';')};`)}>` +
    `<![endif]-->`;
  const outerOutlookClose =
    `<!--[if mso | IE]>` +
    `</td>` +
    `<![endif]-->`;

  // Wrapper <div> — non-Outlook clients render this; inline-block + width:100%
  // + font-size:0 collapses whitespace between child inline-block columns.
  const divStyleParts = [
    'font-size:0',
    'line-height:0',
    'text-align:left',
    'display:inline-block',
    `direction:${direction}`,
    `vertical-align:${verticalAlign}`,
    'width:100%',
    `max-width:${groupWidthPx}px`,
  ];
  if (backgroundColor) divStyleParts.push(`background-color:${backgroundColor}`);
  const divStyle = divStyleParts.join(';');

  // Inner Outlook <table><tr> — recreates the row layout for MSO so child
  // columns can each emit their own <!--[if mso]><td>...<![endif]--> wrapper
  // and sit side-by-side under MSO's table-only rendering.
  const innerOutlookOpen =
    `<!--[if mso | IE]>` +
    `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">` +
    `<tr>` +
    `<![endif]-->`;
  const innerOutlookClose =
    `<!--[if mso | IE]>` +
    `</tr>` +
    `</table>` +
    `<![endif]-->`;

  const idAttr = attr('id', attributes['id']);
  // userClass merges into a static `mc-group` prefix, so we build the class
  // value first (raw) and then escape the whole thing via the helper.
  const classValue = classAttr ? `mc-group ${classAttr}` : 'mc-group';

  context.counters.componentCount++;

  return (
    outerOutlookOpen +
    `<div class="${escapeHtml(classValue)}"${idAttr}${styleAttr(`${divStyle};`)}>` +
    innerOutlookOpen +
    childrenHTML +
    innerOutlookClose +
    `</div>` +
    outerOutlookClose
  );
}

/**
 * Resolves the group's pixel width from its `width` attribute or auto-divides
 * the section's parent width across its column-or-group siblings.
 */
function resolveGroupWidth(
  widthAttr: string | undefined,
  parentWidth: number,
  siblingCount: number,
): number {
  if (widthAttr) {
    if (widthAttr.endsWith('%')) {
      const pct = parseFloat(widthAttr);
      if (!Number.isNaN(pct)) return Math.round((pct / 100) * parentWidth);
    }
    const px = parseInt(widthAttr.replace('px', ''), 10);
    if (!Number.isNaN(px) && px > 0) return px;
  }
  return Math.round(parentWidth / Math.max(siblingCount, 1));
}
