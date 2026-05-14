/**
 * NullSourceMapCollector — no-op implementation of ISourceMapCollector.
 *
 * Used when `options.debug === false` (the default). All methods are empty
 * stubs so the compiler incurs zero overhead at runtime: no allocations,
 * no map lookups, no string construction.
 *
 * Browser-safe: zero `node:*` imports.
 *
 * @module compiler/null-source-map-collector
 */

import type { ASTNode, EmailSourceMap, ExpressionResolution, ConditionalInfo, LoopInfo, OutputRole, StyleOrigin } from '../types.js';
import type { ISourceMapCollector } from './source-map-collector.js';

/**
 * No-op source map collector.
 *
 * Every method is an empty stub. `build()` returns `null`.
 * Swap this with `SourceMapCollector` when `debug: true`.
 */
export class NullSourceMapCollector implements ISourceMapCollector {
  /** @returns Empty string — no tracking in production mode. */
  enter(_node: ASTNode, _component: string): string { return ''; }

  /** No-op. */
  leave(_id: string): void { /* no-op */ }

  /** @returns Empty string — no tracking in production mode. */
  emit(_parentId: string, _role: OutputRole, _tag: string): string { return ''; }

  /** No-op. */
  addStyle(_id: string, _style: StyleOrigin): void { /* no-op */ }

  /** No-op. */
  addExpression(_id: string, _expr: ExpressionResolution): void { /* no-op */ }

  /** No-op. */
  setConditional(_id: string, _info: ConditionalInfo): void { /* no-op */ }

  /** No-op. */
  setLoop(_id: string, _info: LoopInfo): void { /* no-op */ }

  /** Empty string — no active entry in production mode. */
  readonly activeEntryId: string = '';

  /**
   * Always returns `null` — no source map is built in production mode.
   *
   * @returns null
   */
  build(_meta: {
    sourceFile: string;
    outputFile: string;
    templateData: unknown;
    mailcVersion: string;
    inputSize: number;
    outputSize: number;
  }): EmailSourceMap | null {
    return null;
  }
}
