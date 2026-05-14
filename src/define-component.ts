/**
 * Public plugin API — register a custom component with mailc.
 *
 * `defineComponent()` is the single entry point plugin authors use to extend
 * mailc with custom components. It wraps the internal registry's
 * `registerPluginComponent()` with no extra logic; this thin module exists
 * only so the public API surface lives in a clearly-named, package-root file.
 *
 * Trust model: plugin output is spliced into the compiled HTML as-is. mailc
 * does NOT re-validate plugin-emitted CSS against caniemail. Plugin authors
 * are responsible for client compatibility. See
 * `docs/plugin-architecture-plan.md` Decision 1 for the rationale.
 *
 * Usage:
 *   import { defineComponent, type ComponentMetadata } from 'mailc';
 *
 *   defineComponent({
 *     type: 'acme-product-card',  // must contain a hyphen, must NOT start with `mc-`
 *     metadata: { ... },           // see ComponentMetadata interface
 *     compile: (node, ctx) => `<table>...</table>`,
 *   });
 *
 * Registration must happen BEFORE any compile() call. After compile() begins,
 * defineComponent() throws — this prevents subtle bugs where a template
 * renders successfully in one request and fails in the next because a plugin
 * was loaded mid-flight.
 *
 * @module define-component
 */

import type { ComponentMetadata } from './components/metadata.js';
import type { ComponentCompiler } from './types.js';
import {
  registerPluginComponent,
  getAllComponentTypes,
  hasComponent,
} from './registry/component-registry.js';
// Side-effect import: built-ins must be seeded before any plugin can register
// (so `hasComponent('mc-section')` correctly reports `true` for collision
// detection).
import './registry/init.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Argument shape for `defineComponent()`.
 *
 * Keep this in sync with `registerPluginComponent()` in
 * `src/registry/component-registry.ts`.
 */
export interface DefineComponentSpec {
  /**
   * Component tag name. Must contain a hyphen (HTML custom-element rule),
   * must not start with `mc-` (reserved for built-ins), and must not collide
   * with an already-registered component.
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
 * Register a custom component with mailc.
 *
 * @throws Error if `type` is invalid (no hyphen, reserved prefix, collision)
 *         or if `compile()` has already started for this process.
 */
export function defineComponent(spec: DefineComponentSpec): void {
  registerPluginComponent(spec.type, spec.metadata, spec.compile);
}

/**
 * Returns all registered component type names — built-ins plus any plugins
 * registered via `defineComponent()`. Synthetic compiler-only types
 * (prefixed with `_`) are excluded.
 *
 * Useful for diagnostics, IDE tooling, and CLI introspection commands.
 */
export function getRegisteredComponents(): string[] {
  return getAllComponentTypes().filter((t) => !t.startsWith('_'));
}

/**
 * True if a component with the given type is currently registered.
 * Excludes synthetic compiler-only types (prefixed with `_`).
 */
export function isComponentRegistered(type: string): boolean {
  if (type.startsWith('_')) {
    return false;
  }
  return hasComponent(type);
}
