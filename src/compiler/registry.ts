/**
 * `COMPONENT_COMPILERS` — read-only view of built-in component compilers.
 *
 * Exported as a Proxy backed by `BUILTIN_COMPILERS` so callers can do
 * `COMPONENT_COMPILERS['mc-section']` or iterate via `Object.keys()`.
 * Plugin compilers do not live here — they flow per-call through
 * `context.registry` (see `src/registry/registry-view.ts`).
 *
 * Mutating the Proxy throws.
 *
 * @module compiler/registry
 */

import type { ComponentCompiler } from '../types.js';
import {
  BUILTIN_COMPILERS,
  BUILTIN_METADATA,
} from '../registry/builtin-registry.js';

/**
 * Public-API-compatible view of the built-in compilers. Reads reflect the
 * static built-in map only.
 */
export const COMPONENT_COMPILERS: Record<string, ComponentCompiler> = new Proxy(
  Object.create(null) as Record<string, ComponentCompiler>,
  {
    get(_target, prop) {
      if (typeof prop !== 'string') return undefined;
      return BUILTIN_COMPILERS[prop];
    },
    has(_target, prop) {
      return typeof prop === 'string' && prop in BUILTIN_METADATA;
    },
    ownKeys() {
      return Object.keys(BUILTIN_COMPILERS);
    },
    getOwnPropertyDescriptor(_target, prop) {
      if (typeof prop !== 'string') return undefined;
      const compiler = BUILTIN_COMPILERS[prop];
      if (compiler === undefined) return undefined;
      return {
        configurable: true,
        enumerable: true,
        writable: false,
        value: compiler,
      };
    },
    set() {
      throw new Error(
        'COMPONENT_COMPILERS is read-only. Pass plugin compilers per call via compile(src, { plugins: [...] }).',
      );
    },
    deleteProperty() {
      throw new Error('COMPONENT_COMPILERS is read-only.');
    },
  },
);
