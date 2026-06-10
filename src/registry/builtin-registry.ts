/**
 * Static built-in component registry.
 *
 * Single source of truth for the metadata + compiler maps of every
 * built-in `mc-*` component. Derived once at module-evaluation time
 * from `components/metadata.ts` and `compiler/builtin-compilers.ts` —
 * frozen, no runtime mutation.
 *
 * Per-call registry views (see `./registry-view.ts`) merge built-ins
 * from here with caller-supplied plugins.
 *
 * @module registry/builtin-registry
 */

import { COMPONENT_METADATA, type ComponentMetadata } from '../components/metadata.js';
import { BUILTIN_COMPONENT_COMPILERS } from '../compiler/builtin-compilers.js';
import type { ComponentCompiler } from '../types.js';

/**
 * Placeholder metadata for synthetic compiler-only types like
 * `_mc-loop-iteration` and `_mc-conditional-branch`. These nodes only exist
 * inside the compiler pipeline (emitted by the template stage when source
 * maps are enabled), never appear in user source, and have no
 * introspectable surface.
 */
const SYNTHETIC_COMPILER_METADATA: ComponentMetadata = {
  description: 'Internal synthetic node — compiler use only.',
  category: 'logic',
  parent: null,
  maxChildren: Infinity,
  allowsTextContent: true,
  compilerOutputElements: [],
  compilerOutputReason: 'Internal — emitted only when source maps are enabled.',
  validClassCategories: [],
  commonMistakes: [],
  attributes: {},
};

/**
 * All built-in component metadata, including synthetic compiler-only types.
 *
 * Keys are component type strings (e.g. `'mc-section'`, `'_mc-loop-iteration'`).
 * Frozen — callers must not mutate.
 */
export const BUILTIN_METADATA: Readonly<Record<string, ComponentMetadata>> =
  Object.freeze(
    (() => {
      const out: Record<string, ComponentMetadata> = { ...COMPONENT_METADATA };
      // Synthetic compiler-only types — present in BUILTIN_COMPONENT_COMPILERS
      // but absent from COMPONENT_METADATA. Give them placeholder metadata so
      // the registry surface is uniform.
      for (const type of Object.keys(BUILTIN_COMPONENT_COMPILERS)) {
        if (!(type in out)) out[type] = SYNTHETIC_COMPILER_METADATA;
      }
      return out;
    })(),
  );

/**
 * All built-in component compilers.
 *
 * Keys are component type strings. Some logic tags (`mc-if`, `mc-each`,
 * `mc-else`, `mc-else-if`) and head children (`mc-all`, `mc-class`, etc.)
 * have metadata but NO compiler — they're resolved by the template stage
 * or head extractor, not the per-component compile pass. Those keys are
 * absent from this map.
 *
 * Frozen — callers must not mutate.
 */
export const BUILTIN_COMPILERS: Readonly<Record<string, ComponentCompiler>> =
  Object.freeze({ ...BUILTIN_COMPONENT_COMPILERS });

/** All built-in component type strings. Frozen. */
export const BUILTIN_TYPES: readonly string[] = Object.freeze(
  Object.keys(BUILTIN_METADATA),
);

/** True if `type` is a built-in component. */
export function isBuiltinType(type: string): boolean {
  return type in BUILTIN_METADATA;
}
