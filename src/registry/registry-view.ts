/**
 * Registry view — per-call merged view over built-ins + plugins.
 *
 * Replaces the global mutable component registry as the canonical lookup
 * surface inside compile pipelines. Each `compile()` / `compileFromJSON()`
 * call builds its own `RegistryView` and threads it through `CompileContext`,
 * so different calls can use different plugin sets — multi-tenant servers,
 * isolated tests, stateless agent retries.
 *
 * Built-ins always come from `BUILTIN_METADATA` / `BUILTIN_COMPILERS`
 * (static consts, known at build time). Plugins are supplied per-view.
 *
 * @module registry/registry-view
 */

import type { ComponentMetadata } from '../components/metadata.js';
import type { ComponentCompiler, Plugin, RegistryView } from '../types.js';
import {
  BUILTIN_METADATA,
  BUILTIN_COMPILERS,
  isBuiltinType,
} from './builtin-registry.js';

export type { Plugin, RegistryView };

export interface CreateRegistryViewOptions {
  /**
   * Plugins to merge with built-ins. Order matters only when two plugins
   * declare the same `type` — the LATER entry wins (last-write-wins). A
   * plugin whose `type` collides with a built-in is rejected at view-build
   * time (built-ins cannot be overridden).
   */
  plugins?: readonly Plugin[];
}

/**
 * Build a frozen merged view over built-ins + the supplied plugins.
 *
 * Validation:
 *  - Plugin types must contain a hyphen and not start with `mc-` (custom
 *    element convention + reserved namespace).
 *  - Plugin types must not collide with a built-in.
 *  - Duplicate plugin types within the same call: later wins.
 *
 * Errors during view construction throw — callers building a view from
 * untrusted plugin input must catch.
 */
export function createRegistryView(
  options: CreateRegistryViewOptions = {},
): RegistryView {
  const plugins = options.plugins ?? [];

  const pluginMetadata = new Map<string, ComponentMetadata>();
  const pluginCompilers = new Map<string, ComponentCompiler>();

  for (const plugin of plugins) {
    validatePluginType(plugin.type);
    if (isBuiltinType(plugin.type)) {
      throw new Error(
        `Plugin "${plugin.type}": cannot override a built-in component. ` +
          `Built-in types are reserved for mailc.`,
      );
    }
    pluginMetadata.set(plugin.type, plugin.metadata);
    pluginCompilers.set(plugin.type, plugin.compile);
  }

  const view: RegistryView = {
    get(type: string): ComponentMetadata | undefined {
      return BUILTIN_METADATA[type] ?? pluginMetadata.get(type);
    },
    getCompiler(type: string): ComponentCompiler | undefined {
      return BUILTIN_COMPILERS[type] ?? pluginCompilers.get(type);
    },
    has(type: string): boolean {
      return type in BUILTIN_METADATA || pluginMetadata.has(type);
    },
    allTypes(): string[] {
      return [...Object.keys(BUILTIN_METADATA), ...pluginMetadata.keys()];
    },
    allMetadata(): Record<string, ComponentMetadata> {
      return { ...BUILTIN_METADATA, ...Object.fromEntries(pluginMetadata) };
    },
    allCompilers(): Record<string, ComponentCompiler> {
      return { ...BUILTIN_COMPILERS, ...Object.fromEntries(pluginCompilers) };
    },
    pluginTypes(): string[] {
      return [...pluginMetadata.keys()];
    },
  };

  return Object.freeze(view);
}

const RESERVED_PREFIX = 'mc-';
const RESERVED_NON_PREFIXED = new Set(['mc']);

function validatePluginType(type: string): void {
  if (typeof type !== 'string' || type.length === 0) {
    throw new Error(
      `Plugin: component type must be a non-empty string (got ${typeof type}).`,
    );
  }
  if (!type.includes('-') || RESERVED_NON_PREFIXED.has(type)) {
    throw new Error(
      `Plugin "${type}": component type must be a hyphenated custom element name (e.g. "acme-product-card").`,
    );
  }
  if (type.startsWith(RESERVED_PREFIX)) {
    throw new Error(
      `Plugin "${type}": the "mc-" prefix is reserved for built-in components. ` +
        `Use an organisation-prefixed name (e.g. "acme-${type.slice(3)}").`,
    );
  }
}
