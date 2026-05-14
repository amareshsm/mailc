/**
 * layer-tree — utilities for building the layers/tree hierarchy in the Inspector.
 *
 * @module lib/layer-tree
 */
import type { SourceMapEntry } from '@/types/source-map'

/**
 * Walks the entry tree upward to collect all ancestor IDs of a target entry.
 * Used to force-expand the path to the selected node in the tree view.
 *
 * @param entries - All entries from the source map.
 * @param targetId - The ID of the entry to find ancestors for.
 * @returns Set of ancestor entry IDs (not including the target itself).
 */
export function getAncestorIds(entries: SourceMapEntry[], targetId: string): Set<string> {
  // Build a child→parent map by iterating all entries
  const parentOf = new Map<string, string>()
  for (const e of entries) {
    for (const childId of e.children) {
      parentOf.set(childId, e.id)
    }
  }

  // Walk upward from target to root, collecting ancestors
  const ancestors = new Set<string>()
  let cur = parentOf.get(targetId)
  while (cur) {
    ancestors.add(cur)
    cur = parentOf.get(cur)
  }
  return ancestors
}
