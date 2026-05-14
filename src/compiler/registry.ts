/**
 * Component compiler registry — public-API-compatible Proxy over the runtime
 * registry.
 *
 * Historically `COMPONENT_COMPILERS` was a frozen `Record<string,
 * ComponentCompiler>` literal. The plugin extensibility work (see
 * `docs/plugin-architecture-plan.md`) requires the lookup to be backed by a
 * mutable runtime registry so `defineComponent()` can extend it.
 *
 * To preserve the public API contract (`COMPONENT_COMPILERS` is exported from
 * `src/index.ts` and asserted against in `tests/api/public-api.test.ts`), we
 * expose a Proxy that mirrors the runtime registry. Property access
 * (`COMPONENT_COMPILERS['mc-section']`) resolves to the registered compiler;
 * `Object.keys()` and iteration return the current registered set.
 *
 * Mutating the Proxy directly is unsupported — plugins must use
 * `defineComponent()` (Phase 2) which routes through the registry's validation
 * and lifecycle checks.
 *
 * @module compiler/registry
 */

import type { ComponentCompiler } from '../types.js';
import {
  getAllCompilers,
  getComponentCompiler,
  hasComponent,
} from '../registry/component-registry.js';
// Importing the init module guarantees built-ins are seeded before any
// COMPONENT_COMPILERS access. Side-effect import is intentional.
import '../registry/init.js';

/**
 * Public-API-compatible view of the registered compilers. Reads always
 * reflect the current registry state (built-ins + any plugins that have
 * called `defineComponent()`).
 */
export const COMPONENT_COMPILERS: Record<string, ComponentCompiler> = new Proxy(
  Object.create(null) as Record<string, ComponentCompiler>,
  {
    get(_target, prop) {
      if (typeof prop !== 'string') {
        return undefined;
      }
      return getComponentCompiler(prop);
    },
    has(_target, prop) {
      return typeof prop === 'string' && hasComponent(prop);
    },
    ownKeys() {
      return Object.keys(getAllCompilers());
    },
    getOwnPropertyDescriptor(_target, prop) {
      if (typeof prop !== 'string') {
        return undefined;
      }
      const compiler = getComponentCompiler(prop);
      if (compiler === undefined) {
        return undefined;
      }
      return {
        configurable: true,
        enumerable: true,
        writable: false,
        value: compiler,
      };
    },
    set() {
      throw new Error(
        'COMPONENT_COMPILERS is read-only. Use defineComponent() to register plugin components.',
      );
    },
    deleteProperty() {
      throw new Error('COMPONENT_COMPILERS is read-only.');
    },
  },
);
