/**
 * SM-G4: Source map offset calculation using `data-mc-id` attributes.
 *
 * When `sourceMap: true` is set, the compiler bakes `data-mc-id="entry-N"`
 * directly into the first HTML element of each component's output (via
 * `data-id-injector.ts`). This module scans those attributes to compute
 * `outputRange` and `outputLoc` for each `SourceMapEntry`.
 *
 * Unlike the debug-mode variant (`source-map-offsets.ts` which uses comment
 * markers), this module works on clean HTML — no comments are added.
 *
 * Algorithm for each `data-mc-id` match:
 *   1. Walk backward from the match to find `<` (opening of the tag).
 *   2. Determine the tag name.
 *   3. Walk forward tracking open/close depth to find the end of the element
 *      (handles void elements, self-closing `/>`).
 *   4. Record `outputRange` and `outputLoc`.
 *
 * Browser-safe: zero `node:*` imports — pure string scanning.
 *
 * @module compiler/source-map-id-offsets
 */

import type { SourceMapEntry } from '../types.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** HTML void elements that cannot have closing tags. */
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Scans the HTML output for `data-mc-id` attributes injected by the clean
 * source-map pass and populates `outputRange` and `outputLoc` on matching
 * `SourceMapEntry` objects.
 *
 * Entries with no matching `data-mc-id` remain with `outputRange: null` and
 * `outputLoc: null`.
 *
 * @param html    - The compiled HTML string (with `data-mc-id` attributes).
 * @param entries - Source map entries to update (mutated in-place).
 * @returns The same entries array with `outputRange` and `outputLoc` populated.
 */
export function calculateIdOffsets(
  html: string,
  entries: SourceMapEntry[],
): SourceMapEntry[] {
  if (!html || entries.length === 0) {
    return entries;
  }

  // Build a fast lookup: entryId → entry
  const byId = new Map<string, SourceMapEntry>();
  for (const entry of entries) {
    byId.set(entry.id, entry);
  }

  const lineOffsets = buildLineOffsets(html);

  // Regex: find every data-mc-id="entry-N" attribute
  const idRe = /data-mc-id="([^"]+)"/g;
  let m: RegExpExecArray | null;

  while ((m = idRe.exec(html)) !== null) {
    const entryId = m[1]!;
    const entry = byId.get(entryId);
    if (!entry) continue;

    // Walk backward to find the `<` that opens this tag
    const tagStart = findTagStart(html, m.index);
    if (tagStart === -1) continue;

    // Extract tag name (first word after `<`)
    const tagName = extractTagName(html, tagStart);
    if (!tagName) continue;

    // Find the end of this element
    const elementEnd = findElementEnd(html, tagStart, tagName);
    if (elementEnd === -1) continue;

    entry.outputRange = { start: tagStart, end: elementEnd };
    entry.outputLoc = {
      startLine: offsetToLine(lineOffsets, tagStart),
      startCol: offsetToCol(lineOffsets, tagStart),
      endLine: offsetToLine(lineOffsets, elementEnd),
      endCol: offsetToCol(lineOffsets, elementEnd),
    };
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Walks backward from `fromIndex` in `html` to find the `<` that opens
 * the containing tag.
 *
 * @param html      - The HTML string.
 * @param fromIndex - Starting index (position of the `data-mc-id` attribute).
 * @returns Index of the `<` character, or -1 if not found.
 */
function findTagStart(html: string, fromIndex: number): number {
  for (let i = fromIndex; i >= 0; i--) {
    if (html[i] === '<') return i;
  }
  return -1;
}

/**
 * Extracts the tag name from a tag opening starting at `tagStart`.
 * Handles `<tagname`, ignoring leading whitespace.
 *
 * @param html     - The HTML string.
 * @param tagStart - Index of the `<` character.
 * @returns The lower-cased tag name, or empty string if not parseable.
 */
function extractTagName(html: string, tagStart: number): string {
  let i = tagStart + 1; // skip `<`
  while (i < html.length && (html[i] === '/' || html[i] === ' ' || html[i] === '\n' || html[i] === '\t')) {
    i++;
  }
  const start = i;
  while (i < html.length && !/[\s/>]/.test(html[i]!)) {
    i++;
  }
  return html.slice(start, i).toLowerCase();
}

/**
 * Finds the end of an HTML element starting at `tagStart`.
 *
 * For void elements and self-closing (`/>`), returns the index of `>`.
 * For block elements, walks forward tracking open/close tag depth until the
 * matching `</tagname>` is found.
 *
 * @param html     - The HTML string.
 * @param tagStart - Index of `<` opening the element.
 * @param tagName  - Lower-cased tag name.
 * @returns Index of the final `>`, or -1 if not found.
 */
function findElementEnd(html: string, tagStart: number, tagName: string): number {
  // Find the end of the opening tag first
  const openingTagEnd = findOpeningTagEnd(html, tagStart);
  if (openingTagEnd === -1) return -1;

  // Check for self-closing (e.g. <img ... />)
  if (html[openingTagEnd - 1] === '/') {
    return openingTagEnd;
  }

  // Void element — no closing tag
  if (VOID_ELEMENTS.has(tagName)) {
    return openingTagEnd;
  }

  // Block element — scan for matching closing tag, tracking nesting depth
  const openRe = new RegExp(`<${tagName}[\\s/>]`, 'gi');
  const closeRe = new RegExp(`</${tagName}\\s*>`, 'gi');
  openRe.lastIndex = tagStart + 1; // skip the opening tag itself
  closeRe.lastIndex = openingTagEnd + 1;

  let depth = 1;
  let pos = openingTagEnd + 1;

  while (pos < html.length && depth > 0) {
    openRe.lastIndex = pos;
    closeRe.lastIndex = pos;

    const nextOpen = openRe.exec(html);
    const nextClose = closeRe.exec(html);

    if (!nextClose) break;

    if (nextOpen && nextOpen.index < nextClose.index) {
      depth++;
      pos = nextOpen.index + nextOpen[0].length;
    } else {
      depth--;
      if (depth === 0) {
        // Find the `>` at the end of this closing tag
        const closeEnd = html.indexOf('>', nextClose.index);
        return closeEnd === -1 ? -1 : closeEnd;
      }
      pos = nextClose.index + nextClose[0].length;
    }
  }

  return -1;
}

/**
 * Finds the index of the `>` that closes the opening tag beginning at `start`.
 * Skips over quoted attribute values to avoid false `>` matches.
 *
 * @param html  - The HTML string.
 * @param start - Index of the `<` opening the tag.
 * @returns Index of the closing `>`, or -1 if not found.
 */
function findOpeningTagEnd(html: string, start: number): number {
  let inSingle = false;
  let inDouble = false;

  for (let i = start + 1; i < html.length; i++) {
    const ch = html[i];
    if (ch === '"' && !inSingle) { inDouble = !inDouble; continue; }
    if (ch === "'" && !inDouble) { inSingle = !inSingle; continue; }
    if (inSingle || inDouble) continue;
    if (ch === '>') return i;
  }
  return -1;
}

/**
 * Builds an array of byte offsets where each line starts.
 * `lineOffsets[0]` = 0 (line 1), `lineOffsets[1]` = offset of line 2, etc.
 *
 * @param text - The text to index.
 * @returns Array of line-start offsets (0-indexed, line N at lineOffsets[N]).
 */
function buildLineOffsets(text: string): number[] {
  const offsets: number[] = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') offsets.push(i + 1);
  }
  return offsets;
}

/**
 * Returns the 1-based line number for a byte offset, using binary search.
 *
 * @param lineOffsets - Array from `buildLineOffsets()`.
 * @param offset      - The byte offset to convert.
 * @returns 1-based line number.
 */
function offsetToLine(lineOffsets: number[], offset: number): number {
  let lo = 0;
  let hi = lineOffsets.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (lineOffsets[mid]! <= offset) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo + 1; // 1-based
}

/**
 * Returns the 1-based column number for a byte offset.
 *
 * @param lineOffsets - Array from `buildLineOffsets()`.
 * @param offset      - The byte offset to convert.
 * @returns 1-based column number.
 */
function offsetToCol(lineOffsets: number[], offset: number): number {
  const lineIndex = offsetToLine(lineOffsets, offset) - 1;
  const lineStart = lineOffsets[lineIndex] ?? 0;
  return offset - lineStart + 1; // 1-based
}
