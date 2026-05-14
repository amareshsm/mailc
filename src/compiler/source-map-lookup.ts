/**
 * SM-E: Source map reverse-navigation lookups.
 *
 * These functions allow callers to find the source component(s) responsible
 * for a given byte offset or line number in the output HTML, and vice versa.
 *
 * All functions require that `calculateOffsets()` has already been called so
 * that `outputRange` and `outputLoc` are populated on each entry.
 *
 * Browser-safe: zero `node:*` imports — pure object traversal.
 *
 * @module compiler/source-map-lookup
 */

import type { EmailSourceMap, SourceMapEntry } from '../types.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the deepest `SourceMapEntry` whose `outputRange` contains `offset`.
 *
 * "Deepest" means the entry with the smallest range that still contains the
 * offset (i.e. the most specific match — leaf before parent).
 *
 * @param sourceMap - The email source map (with offsets already calculated).
 * @param offset    - A byte offset into the output HTML (0-based).
 * @returns The deepest matching entry, or `null` if no entry contains the offset.
 */
export function lookupByOffset(
  sourceMap: EmailSourceMap,
  offset: number,
): SourceMapEntry | null {
  let best: SourceMapEntry | null = null;
  let bestSize = Infinity;

  for (const entry of sourceMap.entries) {
    const range = entry.outputRange;
    if (!range) continue;
    if (offset >= range.start && offset < range.end) {
      const size = range.end - range.start;
      if (size < bestSize) {
        bestSize = size;
        best = entry;
      }
    }
  }

  return best;
}

/**
 * Returns all `SourceMapEntry` objects whose output content spans `line`.
 *
 * An entry spans `line` when `outputLoc.startLine <= line <= outputLoc.endLine`.
 *
 * @param sourceMap - The email source map (with offsets already calculated).
 * @param line      - A 1-based line number in the output HTML.
 * @returns All entries whose output includes the given line (may be multiple
 *          when entries are nested).
 */
export function lookupByOutputLine(
  sourceMap: EmailSourceMap,
  line: number,
): SourceMapEntry[] {
  const results: SourceMapEntry[] = [];
  for (const entry of sourceMap.entries) {
    const loc = entry.outputLoc;
    if (!loc) continue;
    if (line >= loc.startLine && line <= loc.endLine) {
      results.push(entry);
    }
  }
  return results;
}

/**
 * Returns all `SourceMapEntry` objects whose `sourceLoc.startLine` equals `line`.
 *
 * This is the reverse lookup: given a line in the source template, find all
 * output elements produced by the component on that line.
 *
 * @param sourceMap - The email source map.
 * @param line      - A 1-based line number in the source template.
 * @returns All entries originating from the given source line.
 */
export function lookupBySourceLine(
  sourceMap: EmailSourceMap,
  line: number,
): SourceMapEntry[] {
  return sourceMap.entries.filter((e) => e.sourceLoc.startLine === line);
}
