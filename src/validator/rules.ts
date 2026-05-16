/**
 * Validation rules for mc-* components.
 *
 * COMPONENT_RULES is fully derived from COMPONENT_METADATA — the single source
 * of truth for all component structural knowledge, including the mustFollow
 * sibling-ordering constraints on mc-else-if and mc-else.
 *
 * To change a rule, edit src/components/metadata.ts — not this file.
 *
 * @see src/components/metadata.ts
 * @see docs/decisions/005-mustfollow-in-component-metadata.md
 */

import { deriveComponentRuleFromMetadata } from '../components/metadata.js';
import {
  getAllMetadata,
  onRegistryChange,
} from '../registry/component-registry.js';
// Side-effect import: ensures built-ins are seeded before this module's
// initialization runs.
import '../registry/init.js';
// ComponentRule is defined in types.ts to break the metadata ↔ rules circular dep.
export type { ComponentRule } from '../types.js';
import type { ComponentRule } from '../types.js';

// ---------------------------------------------------------------------------
// Component rule definitions
// ---------------------------------------------------------------------------

/**
 * Global attributes valid on all mc-* components.
 *
 * `mc-class` is a compile-time directive (like `class` and `id`) that any
 * body component may carry — it is resolved and stripped before HTML output.
 */
export const GLOBAL_ATTRIBUTES = ['class', 'id', 'mc-class'];

/** Tags that represent logic wrappers (can appear anywhere). */
export const LOGIC_TAGS = new Set([
  'mc-if', 'mc-else-if', 'mc-else', 'mc-each',
]);

/**
 * Map of component type → validation rules, fully derived from the runtime
 * component registry. Mutated in place when plugins register components so
 * that callers holding a reference to this object see the latest rules.
 */
export const COMPONENT_RULES: Record<string, ComponentRule> = {};

/** Set of all known component names (built-ins + plugin-registered). */
export const KNOWN_COMPONENTS = new Set<string>();

/**
 * Valid child tag types inside mc-attributes.
 * Rebuilt from the registry on every `onRegistryChange` event so plugin
 * components automatically become valid mc-attributes targets.
 */
export const VALID_ATTRIBUTES_CHILDREN = new Set<string>();

function rebuildComponentRules(): void {
  for (const key of Object.keys(COMPONENT_RULES)) {
    delete COMPONENT_RULES[key];
  }
  KNOWN_COMPONENTS.clear();
  VALID_ATTRIBUTES_CHILDREN.clear();
  // mc-all and mc-class are virtual directive types — always valid inside
  // mc-attributes regardless of what's in the registry.
  VALID_ATTRIBUTES_CHILDREN.add('mc-all');
  VALID_ATTRIBUTES_CHILDREN.add('mc-class');
  for (const [type, meta] of Object.entries(getAllMetadata())) {
    // Synthetic compiler-only types (prefixed with `_`) never appear in user
    // source, so they don't need validation rules.
    if (type.startsWith('_')) {
      continue;
    }
    COMPONENT_RULES[type] = deriveComponentRuleFromMetadata(meta);
    KNOWN_COMPONENTS.add(type);
    // Any content or layout component (built-in or plugin) may appear as a
    // child of mc-attributes to set type-wide attribute defaults.
    // Excluded: head types (mc-preview, mc-title, etc.), logic types, and the
    // structural root containers mc and mc-body — setting defaults for those
    // inside mc-attributes is not meaningful.
    if (
      meta.category !== 'head' &&
      meta.category !== 'logic' &&
      type !== 'mc' &&
      type !== 'mc-body'
    ) {
      VALID_ATTRIBUTES_CHILDREN.add(type);
    }
  }
}

// Initial population.
rebuildComponentRules();

// Stay in sync with future plugin registrations.
onRegistryChange(rebuildComponentRules);

