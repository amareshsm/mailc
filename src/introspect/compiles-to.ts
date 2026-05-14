/**
 * @file src/introspect/compiles-to.ts
 *
 * Lookup function for what HTML elements a component compiles to.
 *
 * All data is derived from COMPONENT_METADATA via the registry.
 * No compiler imports — this is a static annotation, not a live compilation.
 *
 * Phase 6 of the Introspection API build plan.
 *
 * @module introspect/compiles-to
 */

import { getComponentSpec } from './registry.js';
import type { CompilesToSpec } from './types.js';

/**
 * Returns what HTML elements a component compiles to, and why.
 *
 * The reason string explains the email-client compatibility rationale
 * (e.g. why `mc-button` emits `v:roundrect` for Outlook VML).
 *
 * @param type - Component tag name, e.g. `"mc-button"`.
 * @returns The compile-to spec, or `undefined` for unknown components.
 *
 * @example
 * const spec = getCompilesToSpec('mc-button');
 * spec?.outputElements; // ['div', 'table', 'td', 'a', 'v:roundrect']
 */
export function getCompilesToSpec(type: string): CompilesToSpec | undefined {
  return getComponentSpec(type)?.compilesTo;
}
