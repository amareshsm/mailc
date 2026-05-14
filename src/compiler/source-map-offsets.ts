/**
 * SM-E: Source map offset calculation.
 *
 * Scans the compiled HTML for `<!-- mc:source ... -->` and `<!-- mc:/... -->`
 * comment markers injected by the compiler in debug mode.
 *
 * For each `SourceMapEntry` that has a matching open/close marker pair, this
 * module computes:
 *   - `outputRange`: byte offsets of the entry's content in the HTML string.
 *   - `outputLoc`:   line/column positions corresponding to those offsets.
 *
 * Browser-safe: zero `node:*` imports — pure string scanning.
 *
 * @module compiler/source-map-offsets
 */

import type { SourceMapEntry } from '../types.js';

// ---------------------------------------------------------------------------
// Regex patterns — match the comment format emitted by compiler/index.ts
//
// Open:  <!-- mc:source component="..." line="..." col="..." id="entry-N" -->
// Close: <!-- mc:/mc-section id="entry-N" -->
// ---------------------------------------------------------------------------

/** Matches an opening `mc:source` comment and captures the `id` attribute. */
const OPEN_RE = /<!--\s*mc:source[^>]*?\bid="([^"]+)"\s*-->/g;

/** Matches a closing `mc:/...` comment and captures the `id` attribute. */
const CLOSE_RE = /<!--\s*mc:\/[^\s>]+\s+id="([^"]+)"\s*-->/g;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Scans the HTML output for `<!-- mc:source -->` and `<!-- mc:/... -->` comment
 * markers and populates `outputRange` and `outputLoc` on matching entries.
 *
 * Entries with no matching markers remain with `outputRange: null` and
 * `outputLoc: null`.
 *
 * @param html    - The compiled HTML string (with debug comments).
 * @param entries - Source map entries to update (mutated in-place).
 * @returns The same entries array with `outputRange` and `outputLoc` populated.
 */
export function calculateOffsets(
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

  // First pass: collect all open-comment positions
  const openPositions = new Map<string, number>(); // entryId → byte offset of char after comment
  const openRe = new RegExp(OPEN_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = openRe.exec(html)) !== null) {
    const id = m[1]!;
    // Content starts right after the opening comment + optional newline
    const afterComment = m.index + m[0].length;
    const contentStart = html[afterComment] === '\n' ? afterComment + 1 : afterComment;
    openPositions.set(id, contentStart);
  }

  // Second pass: collect all close-comment positions
  const closePositions = new Map<string, number>(); // entryId → byte offset of last content char
  const closeRe = new RegExp(CLOSE_RE.source, 'g');
  while ((m = closeRe.exec(html)) !== null) {
    const id = m[1]!;
    // Content ends at the newline/char immediately before the closing comment
    const beforeComment = m.index;
    const contentEnd = html[beforeComment - 1] === '\n' ? beforeComment - 1 : beforeComment;
    closePositions.set(id, contentEnd);
  }

  // Build the line-offset index once — avoids repeated scanning
  const lineOffsets = buildLineOffsets(html);

  // Populate entries
  for (const [id, start] of openPositions) {
    const end = closePositions.get(id);
    if (end === undefined) continue;
    const entry = byId.get(id);
    if (!entry) continue;

    entry.outputRange = { start, end };
    entry.outputLoc = {
      startLine: offsetToLine(lineOffsets, start),
      startCol: offsetToCol(lineOffsets, start),
      endLine: offsetToLine(lineOffsets, end),
      endCol: offsetToCol(lineOffsets, end),
    };
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Builds an array of byte offsets where each line starts.
 * `lineOffsets[0]` = 0 (start of line 1), `lineOffsets[1]` = offset of line 2, etc.
 *
 * @param text - The text to index.
 * @returns Array of line-start offsets (0-indexed, line N starts at lineOffsets[N]).
 */
function buildLineOffsets(text: string): number[] {
  const offsets: number[] = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') {
      offsets.push(i + 1);
    }
  }
  return offsets;
}

/**
 * Returns the 1-based line number for a byte offset using binary search.
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
