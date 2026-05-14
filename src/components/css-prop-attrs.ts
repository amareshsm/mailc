/**
 * CSS-property attribute lookup table — derived from COMPONENT_METADATA.
 *
 * This is the single shared source for "which attributes are CSS-property
 * attributes on each mc-component". Both the compiler enforcement path
 * (`src/compiler/styling-mode.ts`) and the introspect pre-flight path
 * (`src/introspect/validate.ts`) import from here, so they can never diverge.
 *
 * To restrict a new attribute in class mode:
 *   1. Add `isCssPropAttr: true` (and `classHint`) to its entry in `metadata.ts`.
 *   2. Done — no other files need to change.
 *
 * @module components/css-prop-attrs
 */

import {
  getAllMetadata,
  onRegistryChange,
} from '../registry/component-registry.js';
// Side-effect: ensure built-ins are seeded before initial computation.
import '../registry/init.js';

// ---------------------------------------------------------------------------
// Lookup table
// ---------------------------------------------------------------------------

/**
 * Maps every mc-component type that has at least one CSS-property attribute
 * to a `ReadonlySet` of those attribute names.
 *
 * Components with zero `isCssPropAttr: true` attributes are absent from this
 * map — a missing entry is equivalent to an empty set.
 *
 * Mutated in place when plugins register components so callers holding a
 * reference to this object see the latest mapping.
 */
export const CSS_PROP_ATTRS_BY_COMPONENT: Record<string, ReadonlySet<string>> = {};

function rebuildCssPropAttrs(): void {
  for (const key of Object.keys(CSS_PROP_ATTRS_BY_COMPONENT)) {
    delete CSS_PROP_ATTRS_BY_COMPONENT[key];
  }
  for (const [type, meta] of Object.entries(getAllMetadata())) {
    // Skip synthetic compiler-only types (prefixed with `_`).
    if (type.startsWith('_')) {
      continue;
    }
    const cssPropNames = Object.entries(meta.attributes)
      .filter(([, attr]) => attr.isCssPropAttr === true)
      .map(([name]) => name);
    if (cssPropNames.length > 0) {
      CSS_PROP_ATTRS_BY_COMPONENT[type] = new Set(cssPropNames);
    }
  }
}

// Initial population.
rebuildCssPropAttrs();

// Stay in sync with future plugin registrations.
onRegistryChange(rebuildCssPropAttrs);
