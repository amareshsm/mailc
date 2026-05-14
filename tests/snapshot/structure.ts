/**
 * Structural extraction and comparison for email HTML.
 *
 * Uses htmlparser2 for proper DOM-based extraction instead of regex.
 * Extracts key rendering-affecting elements and compares them
 * between mailc and MJML outputs.
 *
 * @module tests/snapshot/structure
 */
import { parseDocument, DomUtils } from 'htmlparser2';
import type { ChildNode, Element, Document } from 'domhandler';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single structural difference between two HTML documents. */
export interface Difference {
  /** Category of difference. */
  type: 'structure-diff' | 'content-diff' | 'attribute-diff';
  /** Where in the document (e.g. "doctype", "img src"). */
  path: string;
  /** Human-readable description. */
  description: string;
  /** The value in mailc output. */
  mailcValue?: string;
  /** The value in MJML output. */
  mjmlValue?: string;
}

/**
 * Key structural data extracted from email HTML for comparison.
 *
 * Captures the elements that affect email rendering: document
 * scaffolding, Outlook support, content, images, links, layout,
 * and responsive behavior.
 */
export interface StructuralData {
  hasDoctype: boolean;
  hasXmlns: boolean;
  hasCharsetMeta: boolean;
  hasViewportMeta: boolean;
  hasOutlookNS: boolean;
  hasOutlookConditionals: boolean;
  hasMediaQuery: boolean;
  textContent: string[];
  imageSrcs: string[];
  imageAlts: string[];
  linkHrefs: string[];
  tableCount: number;
  inlineStyles: string[];
  hasVmlRoundrect: boolean;
  hasPreviewHide: boolean;
  /** Whether images use fluid CSS (width:100% + max-width:Npx). */
  hasFluidImages: boolean;
  /** Whether any table/td has bgcolor HTML attribute. */
  hasBgColorAttr: boolean;
  /** Whether font-size:0 appears in inline styles (whitespace collapse). */
  hasFontSizeZero: boolean;
  /** Number of distinct CSS rules inside @media blocks. */
  mediaQueryRuleCount: number;
  /**
   * Widths (px) extracted from column-level elements.
   * Detects `max-width:Npx` on `display:inline-block` divs —
   * the pattern both MJML and mailc use for hybrid column layout.
   * Sorted ascending for order-independent comparison.
   */
  columnWidths: number[];
}

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

/**
 * Extracts structural data from email HTML using htmlparser2 DOM.
 *
 * @param html - HTML string (raw or normalized).
 * @returns Extracted structural data.
 */
export function extractStructure(html: string): StructuralData {
  const dom = parseDocument(html, { decodeEntities: false });

  const elements = DomUtils.findAll(isElement, dom.children);
  const allText = DomUtils.getText(dom);

  return {
    hasDoctype: hasDoctype(dom),
    hasXmlns: hasAttrValue(elements, 'html', 'xmlns', 'http://www.w3.org/1999/xhtml'),
    hasCharsetMeta: elements.some(
      (el) => el.name === 'meta' && (
        DomUtils.getAttributeValue(el, 'charset') !== undefined ||
        (DomUtils.getAttributeValue(el, 'content') ?? '').includes('charset')
      ),
    ),
    hasViewportMeta: elements.some(
      (el) => el.name === 'meta' &&
        DomUtils.getAttributeValue(el, 'name') === 'viewport',
    ),
    hasOutlookNS: hasAttrValue(elements, 'html', 'xmlns:v', 'urn:schemas-microsoft-com:vml'),
    hasOutlookConditionals: html.includes('<!--[if '),
    hasMediaQuery: allText.includes('@media') || html.includes('@media'),
    textContent: extractVisibleText(dom),
    imageSrcs: collectAttr(elements, 'img', 'src'),
    imageAlts: collectAttr(elements, 'img', 'alt'),
    linkHrefs: collectAttr(elements, 'a', 'href'),
    tableCount: elements.filter((el) => el.name === 'table').length,
    inlineStyles: collectInlineStyles(elements),
    hasVmlRoundrect: html.includes('v:roundrect'),
    hasPreviewHide: html.includes('max-height:0') || html.includes('display:none'),
    hasFluidImages: hasFluidImageCSS(elements),
    hasBgColorAttr: hasBgColorAttribute(elements),
    hasFontSizeZero: hasFontSizeZeroStyle(elements),
    mediaQueryRuleCount: countMediaQueryRules(html),
    columnWidths: extractColumnWidths(elements, html),
  };
}

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

/**
 * Type guard: is this node an Element?
 *
 * @param node - A DOM node.
 * @returns True if the node is an Element.
 */
function isElement(node: ChildNode): node is Element {
  return node.type === 'tag' || node.type === 'script' || node.type === 'style';
}

/**
 * Checks if the document has a DOCTYPE node.
 *
 * @param dom - Parsed document.
 * @returns True if DOCTYPE is present.
 */
function hasDoctype(dom: Document): boolean {
  return dom.children.some((c) => c.type === 'directive' && 'data' in c);
}

/**
 * Checks if any element with the given tag has an attribute with the given value.
 *
 * @param elements - All elements in the document.
 * @param tag      - Tag name to search for.
 * @param attr     - Attribute name.
 * @param value    - Expected attribute value.
 * @returns True if found.
 */
function hasAttrValue(elements: Element[], tag: string, attr: string, value: string): boolean {
  return elements.some(
    (el) => el.name === tag && DomUtils.getAttributeValue(el, attr) === value,
  );
}

/**
 * Collects attribute values from all elements matching a tag name.
 *
 * @param elements - All elements in the document.
 * @param tag      - Tag name to match.
 * @param attr     - Attribute to extract.
 * @returns Array of attribute values.
 */
function collectAttr(elements: Element[], tag: string, attr: string): string[] {
  return elements
    .filter((el) => el.name === tag && DomUtils.hasAttrib(el, attr))
    .map((el) => DomUtils.getAttributeValue(el, attr) as string);
}

/**
 * Extracts visible text content from the DOM.
 *
 * Skips `<style>` and `<script>` elements. Strips HTML entities
 * that aren't real text (&#847;, &#8202;, etc.).
 *
 * @param dom - Parsed document.
 * @returns Array of non-empty text words.
 */
function extractVisibleText(dom: Document): string[] {
  const parts: string[] = [];
  collectText(dom.children, parts);

  return parts
    .join(' ')
    .replace(/&#\d+;/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Recursively collects text nodes, skipping style/script elements.
 *
 * @param nodes - Child nodes to traverse.
 * @param out   - Array to push text into.
 */
function collectText(nodes: ChildNode[], out: string[]): void {
  for (const node of nodes) {
    if (node.type === 'text') {
      out.push((node as unknown as { data: string }).data);
    } else if (isElement(node) && node.name !== 'style' && node.name !== 'script') {
      collectText(node.children, out);
    }
  }
}

/**
 * Collects all inline style declarations from elements.
 *
 * @param elements - All elements in the document.
 * @returns Sorted array of individual CSS declarations.
 */
function collectInlineStyles(elements: Element[]): string[] {
  const styles: string[] = [];
  for (const el of elements) {
    const style = DomUtils.getAttributeValue(el, 'style');
    if (style) {
      const declarations = style.split(';').map((d: string) => d.trim()).filter(Boolean);
      styles.push(...declarations);
    }
  }
  return styles.sort();
}

// ---------------------------------------------------------------------------
// Responsive & behavioral helpers
// ---------------------------------------------------------------------------

/**
 * Extracts pixel widths from column-level Outlook conditional TDs.
 *
 * Both MJML and mailc emit Outlook conditional comments like:
 * `<!--[if mso | IE]><td style="vertical-align:top;width:300px;"><![endif]-->`
 *
 * This is the single canonical source of column widths that both
 * compilers share. We extract from these Outlook TDs only (not from
 * the visible inline-block divs) to avoid double-counting.
 *
 * @param _elements - Unused (kept for signature consistency).
 * @param html      - The raw HTML string (Outlook comments aren't DOM elements).
 * @returns Sorted array of column width values in pixels.
 */
function extractColumnWidths(_elements: Element[], html: string): number[] {
  const widths: number[] = [];

  // Match inside Outlook conditional blocks only
  const outlookRegex = /<!--\[if[^\]]*\]>([\s\S]*?)<!\[endif\]/g;
  let commentMatch = outlookRegex.exec(html);

  while (commentMatch) {
    const block = commentMatch[1] ?? '';
    // Find <td> elements with vertical-align:top and width:Npx
    // (these are the column-level TDs, not section/wrapper TDs)
    const tdRegex = /<td[^>]*style="([^"]*)"/gi;
    let tdMatch = tdRegex.exec(block);

    while (tdMatch) {
      const style = tdMatch[1] ?? '';
      if (style.includes('vertical-align') && style.includes('top')) {
        const widthMatch = /(?:^|;)\s*width\s*:\s*(\d+)\s*px/i.exec(style);
        if (widthMatch?.[1]) {
          widths.push(Number(widthMatch[1]));
        }
      }
      tdMatch = tdRegex.exec(block);
    }

    commentMatch = outlookRegex.exec(html);
  }

  return widths.sort((a, b) => a - b);
}

/**
 * Checks if images use fluid CSS (width:100%).
 * This is the pattern that allows images to shrink on mobile.
 * MJML uses `width:100%` alone; mailc uses `width:100%;max-width:Npx`.
 * Both are valid fluid approaches — the key signal is `width:100%`.
 *
 * @param elements - All elements in the document.
 * @returns True if any img has width:100% in its style.
 */
function hasFluidImageCSS(elements: Element[]): boolean {
  return elements.some((el) => {
    if (el.name !== 'img') return false;
    const style = DomUtils.getAttributeValue(el, 'style') ?? '';
    return style.includes('width:100%');
  });
}

/**
 * Checks if any table or td has a bgcolor HTML attribute.
 *
 * @param elements - All elements in the document.
 * @returns True if bgcolor is found on any table or td.
 */
function hasBgColorAttribute(elements: Element[]): boolean {
  return elements.some((el) =>
    (el.name === 'table' || el.name === 'td') &&
    DomUtils.hasAttrib(el, 'bgcolor'),
  );
}

/**
 * Checks if font-size:0 appears in any inline style.
 * Used for whitespace collapse between inline-block columns.
 *
 * @param elements - All elements in the document.
 * @returns True if font-size:0 is in any element's style.
 */
function hasFontSizeZeroStyle(elements: Element[]): boolean {
  return elements.some((el) => {
    const style = DomUtils.getAttributeValue(el, 'style') ?? '';
    return style.includes('font-size:0');
  });
}

/**
 * Counts distinct CSS rules inside @media blocks.
 * A "rule" is a selector + declarations block (e.g. `.mc-responsive{...}`).
 *
 * Uses brace-depth counting to handle nested `{` `}` inside @media.
 *
 * @param html - The raw HTML string.
 * @returns Number of distinct rules inside @media blocks.
 */
function countMediaQueryRules(html: string): number {
  let count = 0;
  // Find all @media blocks by tracking brace depth
  const mediaStart = /@media[^{]*\{/g;
  let startMatch = mediaStart.exec(html);

  while (startMatch) {
    let depth = 1;
    let pos = startMatch.index + startMatch[0].length;

    // Walk through the @media block tracking brace depth
    while (pos < html.length && depth > 0) {
      if (html[pos] === '{') {
        // Each inner '{' is a CSS rule
        count++;
        depth++;
      } else if (html[pos] === '}') {
        depth--;
      }
      pos++;
    }

    startMatch = mediaStart.exec(html);
  }

  return count;
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

/**
 * Compares structural data from mailc and MJML output.
 *
 * @param mailc - Structural data from mailc output.
 * @param mjml  - Structural data from MJML output.
 * @returns Array of structural differences.
 */
export function structuralDiff(
  mailc: StructuralData,
  mjml: StructuralData,
): Difference[] {
  const diffs: Difference[] = [];

  // Document structure
  compareBool(diffs, 'doctype', 'DOCTYPE presence', mailc.hasDoctype, mjml.hasDoctype);
  compareBool(diffs, 'html xmlns', 'XHTML xmlns', mailc.hasXmlns, mjml.hasXmlns);
  compareBool(diffs, 'meta charset', 'Charset meta', mailc.hasCharsetMeta, mjml.hasCharsetMeta);
  compareBool(diffs, 'outlook ns', 'Outlook XML namespace', mailc.hasOutlookNS, mjml.hasOutlookNS);
  compareBool(diffs, 'outlook conditionals', 'Outlook conditional comments', mailc.hasOutlookConditionals, mjml.hasOutlookConditionals);

  // Content
  const mailcText = mailc.textContent.join(' ');
  const mjmlText = mjml.textContent.join(' ');
  if (mailcText !== mjmlText) {
    diffs.push({ type: 'content-diff', path: 'text content', description: 'Visible text content differs', mailcValue: mailcText, mjmlValue: mjmlText });
  }

  // Images
  if (JSON.stringify(mailc.imageSrcs) !== JSON.stringify(mjml.imageSrcs)) {
    diffs.push({ type: 'attribute-diff', path: 'img src', description: 'Image sources differ', mailcValue: mailc.imageSrcs.join(', '), mjmlValue: mjml.imageSrcs.join(', ') });
  }

  // Links
  if (JSON.stringify(mailc.linkHrefs) !== JSON.stringify(mjml.linkHrefs)) {
    diffs.push({ type: 'attribute-diff', path: 'a href', description: 'Link hrefs differ', mailcValue: mailc.linkHrefs.join(', '), mjmlValue: mjml.linkHrefs.join(', ') });
  }

  // Responsive behavior
  compareBool(diffs, 'fluid images', 'Fluid image CSS (width:100% + max-width)', mailc.hasFluidImages, mjml.hasFluidImages);
  compareBool(diffs, 'font-size:0', 'Whitespace collapse (font-size:0)', mailc.hasFontSizeZero, mjml.hasFontSizeZero);
  compareBool(diffs, 'bgcolor attr', 'bgcolor HTML attribute on tables', mailc.hasBgColorAttr, mjml.hasBgColorAttr);

  // Column widths — the layout backbone
  const mailcWidths = JSON.stringify(mailc.columnWidths);
  const mjmlWidths = JSON.stringify(mjml.columnWidths);
  if (mailcWidths !== mjmlWidths) {
    diffs.push({
      type: 'structure-diff',
      path: 'column widths',
      description: 'Column max-width values differ — layout will not match',
      mailcValue: mailcWidths,
      mjmlValue: mjmlWidths,
    });
  }

  return diffs;
}

/**
 * Helper to compare boolean structural properties.
 *
 * @param diffs - Array to push difference into.
 * @param path  - Path identifier.
 * @param desc  - Human-readable description.
 * @param a     - mailc value.
 * @param b     - MJML value.
 */
function compareBool(
  diffs: Difference[],
  path: string,
  desc: string,
  a: boolean,
  b: boolean,
): void {
  if (a !== b) {
    diffs.push({
      type: 'structure-diff',
      path,
      description: `${desc} differs`,
      mailcValue: String(a),
      mjmlValue: String(b),
    });
  }
}
