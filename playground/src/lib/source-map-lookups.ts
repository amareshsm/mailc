/**
 * Runtime wrappers for mailc source-map lookup functions.
 *
 * NOTE on lookupBySourceLine: The core mailc function matches only
 * `sourceLoc.startLine === line`. For the playground's "click anywhere
 * inside a component range" UX we need range-based lookup, so this wrapper
 * overrides the behaviour and searches `startLine <= line <= endLine`.
 *
 * SM-G5: lookupByOutputLine now delegates to the re-calculated outputLoc
 * values (updated by recalculateOutputLocs after prettifying the HTML).
 */
import type { EmailSourceMap, SourceMapEntry } from '@/types/source-map'

/**
 * Returns all SourceMapEntry objects whose source range CONTAINS `line`.
 * (startLine <= line <= endLine — range lookup, not exact-match.)
 *
 * @param map  - The EmailSourceMap from a sourceMap compilation.
 * @param line - 1-based source line number.
 */
export function lookupBySourceLine(map: EmailSourceMap, line: number): SourceMapEntry[] {
  return map.entries.filter(
    (e) => line >= e.sourceLoc.startLine && line <= e.sourceLoc.endLine
  )
}

/**
 * Looks up all SourceMapEntry objects whose output range spans `line`.
 *
 * Uses the entries' `outputLoc` values (recalculated after prettifying),
 * falling back to the mailc built-in if entries have no outputLoc.
 *
 * @param map  - The EmailSourceMap (with recalculated outputLoc).
 * @param line - 1-based output HTML line number.
 */
export function lookupByOutputLine(map: EmailSourceMap, line: number): SourceMapEntry[] {
  // Try our recalculated outputLoc first (set by recalculateOutputLocs)
  const fromLoc = map.entries.filter(
    (e) => e.outputLoc !== null && line >= e.outputLoc.startLine && line <= e.outputLoc.endLine
  )
  if (fromLoc.length > 0) return fromLoc as SourceMapEntry[]

  // Fallback: return empty (the recalculated loc covers all cases)
  return []
}

