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
import { BUILTIN_METADATA } from '../registry/builtin-registry.js';
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
 * Built-in `componentType → ComponentRule` map. Derived once at
 * module-load from `BUILTIN_METADATA`. The validator entry points accept
 * a `plugins` option and derive per-call rules on top of this map at
 * each call.
 */
export const COMPONENT_RULES: Record<string, ComponentRule> = {};

/** Set of all known built-in component names. */
export const KNOWN_COMPONENTS = new Set<string>();

/**
 * Built-in tag types valid as `<mc-attributes>` children. The validators
 * merge this with per-call plugin eligibility derived from each plugin's
 * `metadata.category` (see the `attrChildren` set on `PluginCtx` in
 * `src/validator/index.ts` / `src/json/validator.ts`).
 */
export const VALID_ATTRIBUTES_CHILDREN = new Set<string>();

(function buildOnce(): void {
  // mc-all and mc-class are virtual directive types — always valid inside
  // mc-attributes regardless of what's in the registry.
  VALID_ATTRIBUTES_CHILDREN.add('mc-all');
  VALID_ATTRIBUTES_CHILDREN.add('mc-class');
  for (const [type, meta] of Object.entries(BUILTIN_METADATA)) {
    // Synthetic compiler-only types (prefixed with `_`) never appear in user
    // source, so they don't need validation rules.
    if (type.startsWith('_')) continue;
    COMPONENT_RULES[type] = deriveComponentRuleFromMetadata(meta);
    KNOWN_COMPONENTS.add(type);
    // Any content or layout built-in may appear as a child of mc-attributes
    // to set type-wide attribute defaults. Excluded: head types, logic
    // types, and the structural root containers mc and mc-body.
    if (
      meta.category !== 'head' &&
      meta.category !== 'logic' &&
      type !== 'mc' &&
      type !== 'mc-body'
    ) {
      VALID_ATTRIBUTES_CHILDREN.add(type);
    }
  }
})();

