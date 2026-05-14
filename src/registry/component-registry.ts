/**
 * Component registry — single mutable source of truth for component metadata
 * and compilers.
 *
 * Replaces the previously-frozen `COMPONENT_METADATA` const and
 * `COMPONENT_COMPILERS` Record. Built-in components are registered at startup
 * (see `src/registry/init.ts`). Future plugin API (`defineComponent()`) will
 * register additional components against this same registry.
 *
 * This module imports nothing from src/components/ or src/compiler/ to keep
 * dependency graph acyclic. Seeding happens from the init module which imports
 * both this registry and the canonical metadata.
 *
 * @module registry/component-registry
 */

import type { ComponentMetadata } from '../components/metadata.js';
import type { ComponentCompiler } from '../types.js';

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

/** Map of component type → metadata. */
const metadataMap = new Map<string, ComponentMetadata>();

/** Map of component type → compiler function. */
const compilerMap = new Map<string, ComponentCompiler>();

/**
 * Subscribers notified whenever the registry mutates. Used by downstream
 * modules that cache derived values (validator rules, css-prop-attrs map,
 * suggestions list, introspection registry).
 */
const changeListeners = new Set<() => void>();

/** Set when any compile() call has begun. Used to enforce strict lifecycle. */
let compileStarted = false;

// ---------------------------------------------------------------------------
// Internal helpers (used by init module — not part of public plugin API)
// ---------------------------------------------------------------------------

/**
 * Internal: seed a built-in component into the registry. Called once per
 * built-in at startup from src/registry/init.ts.
 *
 * Built-ins bypass the lifecycle/namespace checks that apply to plugins.
 */
export function seedBuiltinComponent(
  type: string,
  metadata: ComponentMetadata,
  compiler: ComponentCompiler | null,
): void {
  metadataMap.set(type, metadata);
  if (compiler !== null) {
    compilerMap.set(type, compiler);
  }
}

/**
 * Internal: seed a built-in metadata-only entry (for nodes that have metadata
 * but no compiler — e.g. logic tags resolved by the template stage).
 */
export function seedBuiltinMetadataOnly(type: string, metadata: ComponentMetadata): void {
  metadataMap.set(type, metadata);
}

/**
 * Internal: mark the compile lifecycle as started. Called once from
 * src/compile.ts at the top of the compile pipeline.
 */
export function markCompileStarted(): void {
  compileStarted = true;
}

/**
 * Internal/test: reset the registry to its empty state. Removes all
 * registered components, including built-ins. After calling this, the init
 * module's `_reseedBuiltins()` must be called to restore built-ins.
 *
 * Note: change listeners are intentionally NOT cleared. They are module-level
 * subscriptions (e.g. validator/rules.ts, introspect/registry.ts) that must
 * survive test resets so cached derived state is invalidated correctly when
 * built-ins are re-seeded.
 *
 * Intended for tests only.
 */
export function _resetRegistry(): void {
  metadataMap.clear();
  compilerMap.clear();
  compileStarted = false;
  // Notify subscribers that the registry is now empty so caches are
  // invalidated. _reseedBuiltins() will fire another notify after built-ins
  // are restored.
  notifyChange();
}

/**
 * Internal: subscribe to registry changes. Returns an unsubscribe function.
 * Used by downstream modules with cached derived state.
 */
export function onRegistryChange(listener: () => void): () => void {
  changeListeners.add(listener);
  return () => changeListeners.delete(listener);
}

function notifyChange(): void {
  for (const listener of changeListeners) {
    listener();
  }
}

/**
 * Internal: trigger change notification after the built-in seed completes.
 *
 * Module-load order across deriver consumers is not deterministic — some
 * may compute their derived state before init.ts has populated the
 * registry. This explicit notify, called once at the end of seedBuiltins,
 * gives every subscriber a chance to rebuild against the populated registry.
 */
export function _notifyChangeForSeed(): void {
  notifyChange();
}

// ---------------------------------------------------------------------------
// Read API (consumed throughout the codebase)
// ---------------------------------------------------------------------------

/** Returns the metadata for a registered component, or undefined. */
export function getComponentMetadata(type: string): ComponentMetadata | undefined {
  return metadataMap.get(type);
}

/** Returns the compiler for a registered component, or undefined. */
export function getComponentCompiler(type: string): ComponentCompiler | undefined {
  return compilerMap.get(type);
}

/** True if the component type is registered (has metadata). */
export function hasComponent(type: string): boolean {
  return metadataMap.has(type);
}

/** Returns all registered component types (built-ins + plugins). */
export function getAllComponentTypes(): string[] {
  return Array.from(metadataMap.keys());
}

/** Returns a snapshot copy of all metadata entries. */
export function getAllMetadata(): Record<string, ComponentMetadata> {
  return Object.fromEntries(metadataMap);
}

/** Returns a snapshot copy of all compiler entries. */
export function getAllCompilers(): Record<string, ComponentCompiler> {
  return Object.fromEntries(compilerMap);
}

// ---------------------------------------------------------------------------
// Plugin registration API (called by defineComponent() in Phase 2)
// ---------------------------------------------------------------------------

/** Reserved prefix — built-in components use this; plugins must not. */
const RESERVED_PREFIX = 'mc-';

/** Built-in types that are not in the `mc-*` namespace but are still reserved. */
const RESERVED_NON_PREFIXED = new Set(['mc']);

/**
 * Internal: register a plugin component. Used by defineComponent() in Phase 2.
 *
 * Enforces:
 *  - Type contains a hyphen (HTML custom-element rule)
 *  - Type does not collide with a built-in (no override)
 *  - Type does not start with the reserved `mc-` prefix
 *  - Throws if compile() has already started (strict lifecycle)
 *
 * @throws Error with descriptive message on any rule violation.
 */
export function registerPluginComponent(
  type: string,
  metadata: ComponentMetadata,
  compiler: ComponentCompiler,
): void {
  if (compileStarted) {
    throw new Error(
      `defineComponent("${type}"): cannot register components after compile() has started. ` +
        `Register all plugins before calling compile().`,
    );
  }
  if (!type.includes('-') || RESERVED_NON_PREFIXED.has(type)) {
    throw new Error(
      `defineComponent("${type}"): component type must be a hyphenated custom element name (e.g. "acme-product-card").`,
    );
  }
  if (type.startsWith(RESERVED_PREFIX)) {
    throw new Error(
      `defineComponent("${type}"): the "mc-" prefix is reserved for built-in components. ` +
        `Use an organisation-prefixed name (e.g. "acme-${type.slice(3)}") to avoid collisions.`,
    );
  }
  if (metadataMap.has(type)) {
    throw new Error(
      `defineComponent("${type}"): a component with this type is already registered. ` +
        `Built-in components cannot be overridden.`,
    );
  }
  metadataMap.set(type, metadata);
  compilerMap.set(type, compiler);
  notifyChange();
}
