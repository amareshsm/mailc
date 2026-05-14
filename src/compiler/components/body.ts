/**
 * `mc-body` compiler — email root component.
 *
 * Generates the full email document structure:
 * - `<!DOCTYPE html>`
 * - `<html>` with xmlns, lang, dir, Outlook VML namespaces
 * - `<head>`: charset, viewport, meta tags, Outlook DPI fix, reset CSS,
 *   responsive @media, user `<mc-style>` content
 * - `<body>`: 100% width wrapper table, Outlook conditional inner table,
 *   content `<div>` with max-width
 *
 * This is the top-level HTML document generator — it receives head data
 * extracted by the `mc` root compiler and focuses solely on building HTML.
 *
 * @module compiler/components/body
 */

import type { ASTNode, CompileContext } from '../../types.js';
import { collectAndInline } from '../style-collector.js';
import { compileChildren, getEffectiveAttributes } from '../index.js';
import type { HeadData } from './head.js';
import { assertClassModeAttributes, assertAttributeModeClass, stripClassModeAttributes, stripAttributeModeClass } from '../styling-mode.js';
import { filterAttributesByCompatibility } from '../attribute-classifier.js';
import { reqAttr, styleAttr } from '../../utils/html-attr.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compiles an `mc-body` node into a complete email HTML document.
 *
 * Head data (preview, styles, attribute defaults) is extracted by the `mc`
 * root compiler and passed in — `compileBody` focuses purely on HTML assembly.
 *
 * @param node     - The `mc-body` AST node.
 * @param context  - Compile context with config, theme, and warnings.
 * @param headData - Pre-extracted head data from `mc-head`.
 * @returns The full email HTML document string.
 */
export function compileBody(
  node: ASTNode,
  context: CompileContext,
  headData: HeadData,
): string {
  assertClassModeAttributes(node, context);
  assertAttributeModeClass(node, context);

  const attributes = filterAttributesByCompatibility(
    node.type,
    stripAttributeModeClass(node.attributes, stripClassModeAttributes(node.type, node.attributes, getEffectiveAttributes(node, context), context), context),
    context,
  );
  const lang = attributes['lang'] ?? 'en';
  const dir = attributes['dir'] ?? 'ltr';

  // width attribute on mc-body overrides the config default.
  // Supports "600px" or "600" — strips "px" and parses to number.
  const widthFromAttr = attributes['width'];
  const configWidth = context.config.width;
  const contentWidth = widthFromAttr
    ? (parseInt(widthFromAttr.replace('px', ''), 10) || configWidth)
    : configWidth;

  // Resolve body styles from Tailwind classes
  const bodyStyle = resolveBodyStyle(attributes, context, node);

  // Compile body content (all children — mc-head is a sibling of mc-body now, not a child)
  const bodyContent = compileChildren(node.children, context);

  // Build responsive breakpoint
  const breakpoint = context.config.responsive.breakpoint;
  const mediaWidth = contentWidth + 20; // 20px buffer for section padding

  context.counters.componentCount++;

  // Assemble document.
  // previewHtml MUST appear before the outer table so that email clients
  // (Gmail, Apple Mail, Outlook) read it as the inbox preview snippet.
  return [
    buildDoctype(),
    buildHtmlOpen(lang, dir),
    buildHead(mediaWidth, breakpoint, headData),
    buildBodyOpen(bodyStyle),
    buildAccessibilityWrapper(lang, dir),
    headData.previewHtml,
    buildOuterTable(bodyStyle, contentWidth, bodyContent),
    closeAccessibilityWrapper(),
    buildBodyClose(),
  ].join('');
}

// ---------------------------------------------------------------------------
// Document structure builders
// ---------------------------------------------------------------------------

/**
 * Builds the DOCTYPE declaration.
 *
 * @returns DOCTYPE string.
 */
function buildDoctype(): string {
  return '<!DOCTYPE html>';
}

/**
 * Builds the opening `<html>` tag with xmlns and lang attributes.
 *
 * @param lang - Language code.
 * @param dir  - Text direction.
 * @returns The `<html>` opening tag.
 */
function buildHtmlOpen(lang: string, dir: string): string {
  return (
    `<html${reqAttr('lang', lang)}${reqAttr('dir', dir)}` +
    ` xmlns="http://www.w3.org/1999/xhtml"` +
    ` xmlns:v="urn:schemas-microsoft-com:vml"` +
    ` xmlns:o="urn:schemas-microsoft-com:office:office">`
  );
}

/**
 * Builds the complete `<head>` section.
 *
 * @param mediaWidth - The max-width breakpoint for responsive media query.
 * @param breakpoint - The mobile breakpoint in pixels.
 * @param headData   - Extracted head data from mc-head.
 * @returns The complete `<head>` HTML.
 */
function buildHead(
  mediaWidth: number,
  breakpoint: number,
  headData: HeadData,
): string {
  const userStyles = headData.styleBlocks.length > 0
    ? headData.styleBlocks.join('\n')
    : '';

  return (
    `<head>` +
    buildMetaTags() +
    `<title></title>` +
    buildOutlookDpiFix() +
    `<style>${buildResetCSS()}${buildResponsiveCSS(mediaWidth, breakpoint)}</style>` +
    (userStyles ? `<style>${userStyles}</style>` : '') +
    `</head>`
  );
}

/**
 * Builds the meta tags for email compatibility.
 *
 * @returns The meta tag HTML.
 */
function buildMetaTags(): string {
  return (
    `<meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<meta http-equiv="X-UA-Compatible" content="IE=edge">` +
    `<meta name="x-apple-disable-message-reformatting">` +
    `<meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">`
  );
}

/**
 * Builds the Outlook DPI fix conditional comment.
 *
 * @returns The Outlook DPI fix HTML.
 */
function buildOutlookDpiFix(): string {
  return (
    `<!--[if mso]>` +
    `<noscript><xml><o:OfficeDocumentSettings>` +
    `<o:AllowPNG/>` +
    `<o:PixelsPerInch>96</o:PixelsPerInch>` +
    `</o:OfficeDocumentSettings></xml></noscript>` +
    `<![endif]-->`
  );
}

/**
 * Builds the reset CSS block.
 *
 * @returns The reset CSS string.
 */
function buildResetCSS(): string {
  return (
    `body,table,td,p,a,li,blockquote{` +
    `-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}` +
    `table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}` +
    `img{-ms-interpolation-mode:bicubic;border:0;height:auto;` +
    `line-height:100%;outline:none;text-decoration:none;}` +
    `body{margin:0;padding:0;width:100%!important;height:100%!important;}`
  );
}

/**
 * Builds the responsive media query CSS.
 *
 * `.mc-responsive` makes columns go full-width on mobile (stacking).
 * Images inside columns become fluid automatically because `<img>` has
 * `width:100%` — when the column stacks to 100%, the image fills it.
 * No separate image class needed (matches MJML's approach).
 *
 * @param mediaWidth - The max-width breakpoint (content width + buffer).
 * @param breakpoint - The mobile breakpoint in pixels.
 * @returns The responsive CSS string.
 */
function buildResponsiveCSS(mediaWidth: number, breakpoint: number): string {
  // Use the smaller of mediaWidth and breakpoint + buffer
  const bp = Math.min(mediaWidth, breakpoint + 20);
  return (
    `@media only screen and (max-width:${bp}px){` +
    `.mc-responsive{width:100%!important;max-width:100%!important;}` +
    `}`
  );
}

/**
 * Builds the opening `<body>` tag.
 *
 * @param bodyStyle - Inline style string for the body.
 * @returns The `<body>` opening tag.
 */
function buildBodyOpen(bodyStyle: string): string {
  const baseStyle = 'margin:0;padding:0;';
  const style = bodyStyle ? `${baseStyle}${bodyStyle}` : baseStyle;
  return `<body${styleAttr(style)}>`;
}

/**
 * Builds the closing `</body></html>` tags.
 *
 * @returns The closing tags.
 */
function buildBodyClose(): string {
  return `</body></html>`;
}

// ---------------------------------------------------------------------------
// Accessibility wrapper
// ---------------------------------------------------------------------------

/**
 * Builds the opening accessibility wrapper `<div>`.
 *
 * `aria-roledescription="email"` tells screen readers this is an email document.
 * `role="article"` provides a structural landmark container.
 * `lang` and `dir` are repeated here so assistive technology picks them up
 * even if it doesn't read the `<html>` attributes.
 *
 * @param lang - Language code.
 * @param dir  - Text direction.
 * @returns The opening `<div>` tag.
 */
function buildAccessibilityWrapper(lang: string, dir: string): string {
  return `<div role="article" aria-roledescription="email"${reqAttr('lang', lang)}${reqAttr('dir', dir)}>`;
}

/**
 * Closes the accessibility wrapper `<div>`.
 *
 * @returns The closing `</div>` tag.
 */
function closeAccessibilityWrapper(): string {
  return `</div>`;
}

// ---------------------------------------------------------------------------
// Outer table wrapper
// ---------------------------------------------------------------------------

/**
 * Builds the outer wrapper table + Outlook conditional inner table.
 *
 * @param bodyStyle    - Body background style for the outer table.
 * @param contentWidth - Max content width in pixels.
 * @param content      - Compiled body content HTML.
 * @returns The wrapper HTML.
 */
function buildOuterTable(
  bodyStyle: string,
  contentWidth: number,
  content: string,
): string {
  // Extract background-color for the outer table
  const bgMatch = bodyStyle.match(/background-color:\s*([^;]+)/);
  const bgColor = bgMatch ? (bgMatch[1] as string).trim() : '';
  const tableStyle = bgColor ? styleAttr(`background-color:${bgColor};`) : '';

  return (
    `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"${tableStyle}>` +
    `<tr>` +
    `<td align="center" valign="top">` +
    `<!--[if mso | IE]>` +
    `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="${contentWidth}" align="center">` +
    `<tr><td>` +
    `<![endif]-->` +
    `<div style="max-width:${contentWidth}px;margin:0 auto;">` +
    content +
    `</div>` +
    `<!--[if mso | IE]>` +
    `</td></tr></table>` +
    `<![endif]-->` +
    `</td>` +
    `</tr>` +
    `</table>`
  );
}

// ---------------------------------------------------------------------------
// Style resolution
// ---------------------------------------------------------------------------

/**
 * Resolves body inline styles from Tailwind classes and direct attributes.
 *
 * @param attributes - The mc-body attributes.
 * @param context    - Compile context.
 * @param node       - The original AST node (for source map style origin tracking).
 * @returns The inline style string for `<body>`.
 */
function resolveBodyStyle(
  attributes: Record<string, string>,
  context: CompileContext,
  node: ASTNode,
): string {
  const classAttr = attributes['class'] ?? '';
  // Unconditional call so attribute-mode elements get source-map style
  // provenance (SM-C). Returns empty inline style when classAttr is empty.
  let style = collectAndInline(classAttr, context, attributes, node).inlineStyle;

  // Direct background-color attribute overrides class
  if (attributes['background-color']) {
    const bg = attributes['background-color'];
    if (style) {
      // Replace or append
      if (style.includes('background-color:')) {
        style = style.replace(
          /background-color:[^;]+/,
          `background-color:${bg}`,
        );
      } else {
        style = `background-color:${bg};${style}`;
      }
    } else {
      style = `background-color:${bg}`;
    }
  }

  return style;
}


