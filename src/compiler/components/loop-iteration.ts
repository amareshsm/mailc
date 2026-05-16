/**
 * `_mc-loop-iteration` compiler — synthetic wrapper for loop iteration tracking.
 *
 * This is an internal component created by `resolveTemplate()` when
 * `debugMode: true`. Each iteration of an `mc-each` loop is
 * wrapped in one of these nodes so the source map collector can record
 * `LoopInfo` for every iteration.
 *
 * It is never authored by template writers — it only exists in the
 * post-resolution AST during debug compilation.
 *
 * @module compiler/components/loop-iteration
 */

import type { ASTNode, CompileContext } from '../../types.js';
import { compileChildren } from '../index.js';

/**
 * Compiles a `_mc-loop-iteration` node.
 *
 * Attaches the `LoopInfo` from `node._debug.loopInfo` to the current source
 * map entry, then compiles the children transparently (no HTML wrapper added).
 *
 * @param node    - The synthetic loop-iteration AST node.
 * @param context - Compile context.
 * @returns The compiled children HTML (no wrapping element).
 */
export function compileLoopIteration(
  node: ASTNode,
  context: CompileContext,
): string {
  // Record loop info on the source map entry created by compileNode()'s enter()
  if ((context.debug || context.cleanSourceMap) && node._debug?.loopInfo) {
    const entryId = context.sourceMap.activeEntryId;
    if (entryId) {
      context.sourceMap.setLoop(entryId, node._debug.loopInfo);
    }
  }

  // Compile children transparently — no HTML wrapper
  return compileChildren(node.children, context);
}
