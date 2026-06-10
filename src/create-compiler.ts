/**
 * `createCompiler()` — convenience factory that binds a set of plugins
 * and config defaults once, exposing `compile` and `compileFromJSON`
 * methods that auto-apply them.
 *
 * The underlying primitive is still `compile(source, opts)` — this is just
 * sugar for the common case of running many compile calls against the same
 * plugin set. Useful for multi-tenant servers, plugin-rich apps, and
 * stateless agent workers where threading `{ plugins, config }` into every
 * call would be repetitive.
 *
 * Stateless: the returned instance holds no mutable state. Two compilers
 * built with different plugin sets coexist in the same process without
 * interference — that's the whole point.
 *
 * @example
 *   import { createCompiler, defineComponent } from 'mailc';
 *   const acmeCard = defineComponent({ type: 'acme-card', metadata, compile });
 *   const mailc = createCompiler({ plugins: [acmeCard] });
 *   mailc.compile(welcome);
 *   mailc.compile(receipt);
 *
 * @module create-compiler
 */

import type {
  CompileOptions,
  CompileResult,
  MailcConfig,
  Plugin,
} from './types.js';
import type { MCDocument, MCNode } from './json/schema.js';
import { compile as compileMarkup } from './compile.js';
import { compileFromJSON as compileFromJSONImpl } from './json/index.js';

/** Options accepted by `createCompiler()`. */
export interface CreateCompilerOptions {
  /** Plugin set bound to every compile call. */
  plugins?: readonly Plugin[];
  /** Config overrides bound to every compile call. */
  config?: Partial<MailcConfig>;
}

/** The bound compiler returned by `createCompiler()`. */
export interface MailcCompiler {
  /** Compile markup, with the bound plugins/config pre-applied. */
  compile(source: string, options?: CompileOptions): CompileResult;
  /** Compile JSON, with the bound plugins/config pre-applied. */
  compileFromJSON(
    input: MCDocument | MCNode | string,
    options?: CompileOptions,
  ): CompileResult;
}

/**
 * Build a `MailcCompiler` bound to a plugin set and (optionally) a config.
 *
 * Per-call options take precedence over the bound defaults:
 *  - `options.plugins` REPLACES the bound plugins for that call
 *    (it doesn't append — call sites that want both must concat themselves).
 *  - `options.config` is merged into the bound config (shallow).
 */
export function createCompiler(
  bound: CreateCompilerOptions = {},
): MailcCompiler {
  const boundPlugins = bound.plugins;
  const boundConfig = bound.config;

  function mergeOptions(perCall?: CompileOptions): CompileOptions {
    if (!perCall) {
      return {
        ...(boundPlugins ? { plugins: boundPlugins } : {}),
        ...(boundConfig ? { config: boundConfig } : {}),
      };
    }
    return {
      ...perCall,
      plugins: perCall.plugins ?? boundPlugins,
      config:
        perCall.config && boundConfig
          ? { ...boundConfig, ...perCall.config }
          : (perCall.config ?? boundConfig),
    };
  }

  return Object.freeze({
    compile(source: string, options?: CompileOptions): CompileResult {
      return compileMarkup(source, mergeOptions(options));
    },
    compileFromJSON(
      input: MCDocument | MCNode | string,
      options?: CompileOptions,
    ): CompileResult {
      return compileFromJSONImpl(input, mergeOptions(options));
    },
  });
}
