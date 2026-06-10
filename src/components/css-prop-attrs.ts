/**
 * CSS-property attribute lookup table — derived lazily from `BUILTIN_METADATA`.
 *
 * Lazy initialisation is intentional: at module-load time, the import chain
 * (builtin-registry → compiler/builtin-compilers → compiler/components/* →
 * back to this file) is cyclic, so `BUILTIN_METADATA` is not yet populated
 * when this module evaluates. Reading it on first access (after all module
 * initialisers have run) sidesteps the TDZ.
 *
 * To restrict a new attribute in class mode:
 *   1. Add `isCssPropAttr: true` (and `classHint`) to its entry in `metadata.ts`.
 *   2. Done — no other files need to change.
 *
 * @module components/css-prop-attrs
 */

import { BUILTIN_METADATA } from '../registry/builtin-registry.js';

let _table: Record<string, ReadonlySet<string>> | null = null;

function compute(): Record<string, ReadonlySet<string>> {
  const out: Record<string, ReadonlySet<string>> = {};
  for (const [type, meta] of Object.entries(BUILTIN_METADATA)) {
    if (type.startsWith('_')) continue;
    const cssPropNames = Object.entries(meta.attributes)
      .filter(([, attr]) => attr.isCssPropAttr === true)
      .map(([name]) => name);
    if (cssPropNames.length > 0) {
      out[type] = new Set(cssPropNames);
    }
  }
  return out;
}

/**
 * Maps every built-in mc-component type that has at least one CSS-property
 * attribute to a `ReadonlySet` of those attribute names.
 *
 * Components with zero `isCssPropAttr: true` attributes are absent from this
 * map — a missing entry is equivalent to an empty set.
 *
 * Exposed as a Proxy so consumers see a `Record`-shaped value (preserving
 * the public API contract) while reads are forwarded to a lazily-built
 * underlying table — necessary to dodge the module-load cycle described
 * in the module docstring.
 */
export const CSS_PROP_ATTRS_BY_COMPONENT: Record<
  string,
  ReadonlySet<string>
> = new Proxy({} as Record<string, ReadonlySet<string>>, {
  get(_target, prop) {
    if (typeof prop !== 'string') return undefined;
    if (_table === null) _table = compute();
    return _table[prop];
  },
  has(_target, prop) {
    if (typeof prop !== 'string') return false;
    if (_table === null) _table = compute();
    return prop in _table;
  },
  ownKeys() {
    if (_table === null) _table = compute();
    return Object.keys(_table);
  },
  getOwnPropertyDescriptor(_target, prop) {
    if (typeof prop !== 'string') return undefined;
    if (_table === null) _table = compute();
    const value = _table[prop];
    if (value === undefined) return undefined;
    return { configurable: true, enumerable: true, writable: false, value };
  },
});
