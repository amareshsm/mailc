/**
 * Built-in component registry seeding.
 *
 * Importing this module populates the component registry with all built-in
 * mc-* components. It is imported by `src/compile.ts` (and `src/index.ts`)
 * to guarantee the registry is hydrated before any compile call.
 *
 * Plugins (Phase 2) register additional components via `defineComponent()`,
 * which calls `registerPluginComponent()` against the same registry.
 *
 * This module is the only place that imports BOTH the canonical metadata
 * and the canonical compilers — keeping the seed logic out of the registry
 * file itself preserves the registry's freedom from upstream dependencies.
 *
 * @module registry/init
 */

import { COMPONENT_METADATA, type ComponentMetadata } from '../components/metadata.js';
import { BUILTIN_COMPONENT_COMPILERS } from '../compiler/builtin-compilers.js';
import {
  seedBuiltinComponent,
  seedBuiltinMetadataOnly,
  _notifyChangeForSeed,
} from './component-registry.js';

let seeded = false;

/**
 * Seed the registry with all built-in components. Idempotent — safe to call
 * multiple times. Called automatically when this module is imported.
 */
export function seedBuiltins(): void {
  if (seeded) {
    return;
  }
  seeded = true;
  for (const [type, metadata] of Object.entries(COMPONENT_METADATA)) {
    const compiler = BUILTIN_COMPONENT_COMPILERS[type];
    if (compiler) {
      seedBuiltinComponent(type, metadata, compiler);
    } else {
      // Logic tags (mc-if, mc-for-each, mc-each, mc-else, mc-else-if), the
      // mc-attributes head children (mc-all, mc-class, etc.) — they have
      // metadata but no compiler (resolved by template stage or head extractor).
      seedBuiltinMetadataOnly(type, metadata);
    }
  }
  // Synthetic compiler-only types (no metadata exposure). Used when source
  // maps are enabled — emitted by the template stage as wrappers around
  // each loop iteration / each conditional branch so the compiler can record
  // structural source-map entries for them.
  for (const [type, compiler] of Object.entries(BUILTIN_COMPONENT_COMPILERS)) {
    if (!(type in COMPONENT_METADATA)) {
      seedBuiltinComponent(type, SYNTHETIC_COMPILER_METADATA, compiler);
    }
  }
  // Notify any derivers that loaded BEFORE seeding completed (module-load
  // order can be non-deterministic across consumers).
  _notifyChangeForSeed();
}

/**
 * Placeholder metadata for synthetic compiler-only types like
 * `_mc-loop-iteration`. These nodes only exist inside the compiler pipeline,
 * never appear in user source, and have no introspectable surface.
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

/** For tests: re-seed after a registry reset. */
export function _reseedBuiltins(): void {
  seeded = false;
  seedBuiltins();
}

// Auto-seed on import.
seedBuiltins();
