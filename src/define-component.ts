/**
 * Public plugin API — define a custom component for mailc.
 *
 * `defineComponent()` is pure: it returns a `Plugin` value with no side
 * effects. Pass the returned plugin into `compile(src, { plugins: [...] })`
 * or `createCompiler({ plugins: [...] })`.
 *
 * Trust model: plugin output is spliced into the compiled HTML as-is. mailc
 * does NOT re-validate plugin-emitted CSS against caniemail. Plugin authors
 * are responsible for client compatibility.
 *
 * @example
 *   import { defineComponent, compile } from 'mailc';
 *
 *   const card = defineComponent({
 *     type: 'acme-product-card',  // must contain `-`, must NOT start with `mc-`
 *     metadata: { ... },
 *     compile: (node, ctx) => `<table>...</table>`,
 *   });
 *
 *   compile(source, { plugins: [card] });
 *
 * @module define-component
 */

import type { ComponentMetadata } from './components/metadata.js';
import type { ComponentCompiler, Plugin } from './types.js';
import { BUILTIN_METADATA, isBuiltinType } from './registry/builtin-registry.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Argument shape for `defineComponent()`. */
export interface DefineComponentSpec {
  /**
   * Component tag name. Must contain a hyphen (HTML custom-element rule),
   * must not start with `mc-` (reserved for built-ins), and must not collide
   * with a built-in. Collisions with other plugins are checked at view-build
   * time when the plugin is passed to `compile(src, { plugins })`.
   */
  type: string;
  /** Full structural and documentary metadata. */
  metadata: ComponentMetadata;
  /** Compiler function — receives an AST node and emits HTML. */
  compile: ComponentCompiler;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Define a custom component. Returns a `Plugin` value to pass into
 * `compile(src, { plugins: [...] })` or `createCompiler({ plugins })`.
 *
 * Pure: no global state is mutated. Two `defineComponent()` calls in
 * different parts of an application can coexist independently — there is no
 * shared registry to collide on.
 */
export function defineComponent(spec: DefineComponentSpec): Plugin {
  return Object.freeze({
    type: spec.type,
    metadata: spec.metadata,
    compile: spec.compile,
  });
}

/**
 * Returns all built-in component type names. Synthetic compiler-only types
 * (prefixed with `_`) are excluded.
 *
 * Built-in scope only — plugins are per-call values with no global
 * identity. To enumerate plugins for a specific call, walk the `Plugin[]`
 * array you passed to `compile()` yourself.
 */
export function getRegisteredComponents(): string[] {
  return Object.keys(BUILTIN_METADATA).filter((t) => !t.startsWith('_'));
}

/**
 * True if `type` is a built-in component. Synthetic compiler-only types
 * (prefixed with `_`) return false. Plugin types are out of scope — check
 * for plugin presence on your own `Plugin[]` array via `plugin.type`.
 */
export function isComponentRegistered(type: string): boolean {
  if (type.startsWith('_')) return false;
  return isBuiltinType(type);
}
