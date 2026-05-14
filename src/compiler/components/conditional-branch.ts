/**
 * `_mc-conditional-branch` compiler — synthetic wrapper for conditional tracking.
 *
 * This is an internal component created by `resolveTemplate()` when
 * `debugMode: true`. The winning branch of an `mc-if` / `mc-else-if` /
 * `mc-else` chain is wrapped in one of these nodes so the source map
 * collector can record `ConditionalInfo` for the taken branch.
 *
 * It is never authored by template writers — it only exists in the
 * post-resolution AST during debug compilation.
 *
 * @module compiler/components/conditional-branch
 */

import type { ASTNode, CompileContext } from '../../types.js';
import { compileChildren } from '../index.js';

/**
 * Compiles a `_mc-conditional-branch` node.
 *
 * Attaches the `ConditionalInfo` from `node._debug.conditionalInfo` to the
 * current source map entry, then compiles the children transparently (no
 * HTML wrapper added).
 *
 * @param node    - The synthetic conditional-branch AST node.
 * @param context - Compile context.
 * @returns The compiled children HTML (no wrapping element).
 */
export function compileConditionalBranch(
  node: ASTNode,
  context: CompileContext,
): string {
  // Record conditional info on the source map entry created by compileNode()'s enter()
  if ((context.debug || context.cleanSourceMap) && node._debug?.conditionalInfo) {
    const entryId = context.sourceMap.activeEntryId;
    if (entryId) {
      context.sourceMap.setConditional(entryId, node._debug.conditionalInfo);
    }
  }

  // Compile children transparently — no HTML wrapper
  return compileChildren(node.children, context);
}
