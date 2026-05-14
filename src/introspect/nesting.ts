/**
 * @file src/introspect/nesting.ts
 *
 * Builds the complete NestingMatrix from the registry — computed once,
 * cached for the lifetime of the process.
 *
 * Phase 3 of the Introspection API build plan.
 *
 * @module introspect/nesting
 */

import { getAllComponentSpecs, getComponentSpec } from './registry.js';
import type { NestingMatrix, NestingPath } from './types.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Sentinel values in alternateParents that are not real component types.
 * They represent "can appear anywhere" placement contexts and must be
 * excluded from the nesting matrix and path walking.
 */
const VIRTUAL_PARENT_TYPES = new Set(['root']);

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Walks the allowedParents chain of `type` upward until it reaches the
 * document root component (`mc`, which has no parents).
 *
 * Always takes the first allowedParent (the canonical structural parent,
 * not alternateParents) to produce the canonical required path.
 *
 * Logic components (parent: null in metadata → allowedParents: []) have no
 * required path and are excluded.
 *
 * @param type - The target component type.
 * @returns The NestingPath from the structural root to `type`, or `null`
 *          if no canonical structural path exists.
 */
function buildRequiredPath(type: string): NestingPath | null {
  const spec = getComponentSpec(type);
  if (!spec) return null;

  // Filter out virtual parent types to get real structural parents only.
  const realParents = spec.allowedParents.filter(p => !VIRTUAL_PARENT_TYPES.has(p));

  // Logic components (no real structural parents) have no required path.
  if (realParents.length === 0) return null;

  // Walk upward, always taking the first real (canonical) parent.
  const path: string[] = [type];
  let current = type;

  while (true) {
    const currentSpec = getComponentSpec(current);
    if (!currentSpec) break;

    const currentRealParents = currentSpec.allowedParents.filter(
      p => !VIRTUAL_PARENT_TYPES.has(p),
    );
    if (currentRealParents.length === 0) break;

    const canonicalParent = currentRealParents[0]!;
    path.unshift(canonicalParent);
    current = canonicalParent;

    // If the canonical parent itself has no parents, we've reached the root.
    const parentSpec = getComponentSpec(canonicalParent);
    if (!parentSpec) break;
    const parentRealParents = parentSpec.allowedParents.filter(
      p => !VIRTUAL_PARENT_TYPES.has(p),
    );
    if (parentRealParents.length === 0) break;
  }

  // A path of just [type] or [rootWithNoRealParent] is not useful.
  if (path.length <= 1) return null;

  return {
    target: type,
    path,
    description: buildPathDescription(path),
  };
}

/**
 * Produces a human-readable sentence describing a required nesting path.
 *
 * @param path - Ordered array of component types from root to target.
 * @returns A sentence like "<mc-button> must be nested inside <mc-column> → <mc-section> → <mc-body> → <mc>.".
 */
function buildPathDescription(path: string[]): string {
  const target = path[path.length - 1]!;
  const ancestors = path.slice(0, -1).reverse(); // immediate parent first
  return `<${target}> must be nested inside ${ancestors.map(t => `<${t}>`).join(' → ')}.`;
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

/** Lazily populated cache — computed once per process lifecycle. */
let _cache: NestingMatrix | null = null;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the complete NestingMatrix — computed once and cached.
 *
 * Derived entirely from the registry (which derives from COMPONENT_METADATA).
 * Calling this multiple times returns the same object reference.
 *
 * @returns The full NestingMatrix with parentToChildren, childToParents,
 *          and requiredPaths for all structural components.
 *
 * @example
 * const { parentToChildren, childToParents, requiredPaths } = getNestingMatrix();
 * parentToChildren['mc-section']; // ['mc-column']
 * childToParents['mc-button'];    // ['mc-column', 'mc-hero']
 */
export function getNestingMatrix(): NestingMatrix {
  if (_cache !== null) return _cache;

  const allSpecs = getAllComponentSpecs();

  // ── parentToChildren ──────────────────────────────────────────────────
  // For each component P, collect every component C where C lists P as a
  // valid parent (via allowedParents). Virtual parent types ('root') are
  // included as keys if any component lists them, but they get no spec.
  const parentToChildren: Record<string, string[]> = {};

  for (const spec of allSpecs) {
    // Ensure every known component type has an entry.
    if (!(spec.type in parentToChildren)) {
      parentToChildren[spec.type] = [];
    }

    for (const parentType of spec.allowedParents) {
      if (!(parentType in parentToChildren)) {
        parentToChildren[parentType] = [];
      }
      if (!parentToChildren[parentType]!.includes(spec.type)) {
        parentToChildren[parentType]!.push(spec.type);
      }
    }
  }

  // Sort children alphabetically for deterministic output.
  for (const children of Object.values(parentToChildren)) {
    children.sort();
  }

  // ── childToParents ────────────────────────────────────────────────────
  // Directly mirrors spec.allowedParents (registry already computed this).
  const childToParents: Record<string, string[]> = {};

  for (const spec of allSpecs) {
    childToParents[spec.type] = [...spec.allowedParents];
  }

  // ── requiredPaths ─────────────────────────────────────────────────────
  // Build the canonical root→target path for every component that has one.
  const requiredPaths: NestingPath[] = [];

  for (const spec of allSpecs) {
    const nestingPath = buildRequiredPath(spec.type);
    if (nestingPath !== null) {
      requiredPaths.push(nestingPath);
    }
  }

  // Sort by path length (shallowest first), then alphabetically by target.
  requiredPaths.sort((a, b) => {
    if (a.path.length !== b.path.length) return a.path.length - b.path.length;
    return a.target.localeCompare(b.target);
  });

  _cache = { parentToChildren, childToParents, requiredPaths };
  return _cache;
}

/**
 * Clears the internal nesting matrix cache.
 * Intended for tests only — production code should never call this.
 *
 * @internal
 */
export function _resetNestingCache(): void {
  _cache = null;
}
