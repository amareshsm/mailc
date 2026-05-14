/**
 * useSourceLineClick — shared logic for panels that render numbered source/output lines.
 *
 * Handles:
 * - Scrolling to a line when selection changes
 * - Click handler to select a line by number
 * - Line lookup via the source map store
 *
 * @module hooks/useSourceLineClick
 */
import { useRef, useEffect, useCallback } from 'react'
import { usePlaygroundStore } from '@/store/playground-store'
import type { SourceMapEntry } from '@/types/source-map'

export interface UseSourceLineClickOptions {
  /** Called when a line is clicked to determine which entry to select. */
  lookupEntries: (lineNum: number) => SourceMapEntry[]
  /** Called with the lookup result to pick the best entry (deepest, etc). */
  pickBest: (entries: SourceMapEntry[]) => SourceMapEntry | null
  /** CSS selector to find the line element in the DOM by data-attribute. */
  lineSelector: (lineNum: number) => string
}

/**
 * Encapsulates scroll-to-selection + line-click logic for source/HTML panels.
 *
 * Usage:
 *   const { containerRef, handleLineClick } = useSourceLineClick({
 *     lookupEntries: (line) => lookupBySourceLine(sourceMap, line),
 *     pickBest: pickDeepestBySource,
 *     lineSelector: (line) => `[data-line="${line}"]`,
 *   })
 *
 *   // Then in JSX: ref={containerRef}, onClick handler for each line
 */
export function useSourceLineClick({
  lookupEntries,
  pickBest,
  lineSelector,
}: UseSourceLineClickOptions) {
  const { selectedEntryId, setSelectedEntry } = usePlaygroundStore()
  const selectedEntry = usePlaygroundStore((s) => {
    if (!s.sourceMap || !s.selectedEntryId) return null
    return s.sourceMap.entries.find((e) => e.id === s.selectedEntryId) ?? null
  })
  const containerRef = useRef<HTMLDivElement>(null)

  // Scroll to the selected entry when selection changes externally
  // (e.g., clicking in a different panel).
  // Subclasses override which location to use (sourceLoc vs outputLoc).
  useEffect(() => {
    if (!selectedEntry || !containerRef.current) return
    // Default: scroll to the source line. Subclasses can override with outputLoc.
    const lineNum = selectedEntry.sourceLoc.startLine
    const el = containerRef.current.querySelector<HTMLElement>(lineSelector(lineNum))
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [selectedEntry, lineSelector])

  const handleLineClick = useCallback(
    (lineNum: number) => {
      const entries = lookupEntries(lineNum)
      const best = pickBest(entries)
      setSelectedEntry(best?.id ?? null)
    },
    [lookupEntries, pickBest, setSelectedEntry]
  )

  return {
    containerRef,
    handleLineClick,
    selectedEntry,
    selectedEntryId,
  }
}
