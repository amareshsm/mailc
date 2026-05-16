/**
 * Template resolution entry point.
 *
 * `resolveTemplate()` walks an AST tree and resolves all template expressions:
 * - `{{variable}}` → data substitution (HTML-escaped)
 * - `{{{variable}}}` → raw data substitution (unescaped)
 * - `{{var || "fallback"}}` → fallback when nullish/empty
 * - `{{var | formatter}}` → user callback formatting
 * - `mc-if condition="..."` → conditional branch evaluation
 * - `mc-each items="..." as="..."` → loop expansion
 * - Attribute expressions → inline resolution
 *
 * Returns a **new** AST — the original is never mutated.
 *
 * SM-D: When `debugMode: true`, the resolved AST is annotated with debug
 * metadata (`_debug` on ASTNode) and contains synthetic wrapper nodes
 * (`_mc-loop-iteration`, `_mc-conditional-branch`) that the compiler
 * processes to populate the source map with loop/conditional tracking data.
 *
 * @module template
 */

import type { ASTNode, ExpressionResolution, LoopInfo, ConditionalInfo } from '../types.js';
import type { TemplateData, FormatterMap, OnMissingVariable } from './types.js';
import { resolveContent, resolveAttributes, resolvePath } from './expressions.js';
import { evaluateCondition } from './conditions.js';
import { expandEach, BLOCKED_AS_NAMES } from './loops.js';

// Re-export public types and functions
export type { TemplateData, FormatterMap, Formatter, ParsedExpression, FormatterCall, OnMissingVariable, MissingVariable } from './types.js';
export { resolvePath, parseExpression, resolveContent, resolveAttributes } from './expressions.js';
export { evaluateCondition } from './conditions.js';
export { expandEach } from './loops.js';
export { applyFormatters } from './formatter.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolves all template expressions in an AST tree.
 *
 * Walks the tree depth-first and:
 * 1. Resolves `{{...}}` expressions in content nodes.
 * 2. Resolves `{{...}}` expressions in attribute values.
 * 3. Evaluates `mc-if` / `mc-else-if` / `mc-else` conditional chains.
 * 4. Expands `mc-each` loops.
 * 5. Recurses into child nodes.
 *
 * Returns a new AST tree — the original is never mutated.
 *
 * @param ast        - The root AST node to resolve.
 * @param data       - Template data object.
 * @param formatters - Optional map of named formatter callbacks.
 * @param debugMode  - When `true`, annotates nodes with debug metadata for source map tracking.
 * @returns A new AST node with all resolvable expressions replaced.
 */
export function resolveTemplate(
  ast: ASTNode,
  data: TemplateData,
  formatters?: FormatterMap,
  debugMode?: boolean,
  onMissing?: OnMissingVariable,
): ASTNode {
  return resolveNode(ast, data, formatters, debugMode, onMissing);
}

// ---------------------------------------------------------------------------
// Internal — Node resolution
// ---------------------------------------------------------------------------

/**
 * Resolves a single AST node and its subtree.
 *
 * @param node       - The AST node to resolve.
 * @param data       - Current template data scope.
 * @param formatters - Optional formatters.
 * @param debugMode  - Whether to collect debug metadata.
 * @returns A new resolved AST node.
 */
function resolveNode(
  node: ASTNode,
  data: TemplateData,
  formatters?: FormatterMap,
  debugMode?: boolean,
  onMissing?: OnMissingVariable,
): ASTNode {
  // Collect expression resolutions when debug mode is active
  const collectedExpressions: ExpressionResolution[] = [];
  const onExpression = debugMode
    ? (expr: ExpressionResolution) => { collectedExpressions.push(expr); }
    : undefined;

  // Clone to avoid mutating the original. Preserve `id` so JSON-sourced
  // builder identity survives template resolution (data-binding) intact.
  const resolved: ASTNode = {
    ...(node.id !== undefined ? { id: node.id } : {}),
    type: node.type,
    attributes: resolveAttributes(node.attributes, data, formatters, onMissing, node.loc),
    children: [],
    content: resolveContent(node.content, data, formatters, onExpression, onMissing),
    loc: node.loc,
  };

  // Attach debug metadata for expressions
  if (debugMode && collectedExpressions.length > 0) {
    resolved._debug = { expressions: collectedExpressions };
  }

  // Process children, handling conditionals and loops
  resolved.children = resolveChildren(node.children, data, formatters, debugMode, onMissing);

  return resolved;
}

/**
 * Resolves a list of child nodes, processing conditionals and loops.
 *
 * Handles:
 * - `mc-if` → `mc-else-if` → `mc-else` chains
 * - `mc-each` → loop expansion
 * - Regular nodes → recursive resolution
 *
 * @param children   - The child nodes to process.
 * @param data       - Current template data scope.
 * @param formatters - Optional formatters.
 * @param debugMode  - Whether to create debug wrapper nodes.
 * @returns Resolved list of child nodes.
 */
function resolveChildren(
  children: ASTNode[],
  data: TemplateData,
  formatters?: FormatterMap,
  debugMode?: boolean,
  onMissing?: OnMissingVariable,
): ASTNode[] {
  const result: ASTNode[] = [];
  let i = 0;

  while (i < children.length) {
    const child = children[i];
    if (!child) break;

    if (child.type === 'mc-if') {
      // Process the entire mc-if / mc-else-if / mc-else chain
      const chainResult = resolveConditionalChain(children, i, data, formatters, debugMode, onMissing);
      result.push(...chainResult.nodes);
      i = chainResult.nextIndex;
      continue;
    }

    if (child.type === 'mc-each') {
      const expanded = expandEachWithDebug(child, data, formatters, debugMode, onMissing);
      result.push(...expanded);
      i++;
      continue;
    }

    // Regular node — recurse
    result.push(resolveNode(child, data, formatters, debugMode, onMissing));
    i++;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Loop expansion (with debug support)
// ---------------------------------------------------------------------------

/**
 * Expands a loop node. When `debugMode` is true, wraps each iteration's
 * resolved children in a synthetic `_mc-loop-iteration` node that the
 * compiler uses to emit loop-tracking source map entries.
 *
 * @param node       - The `mc-each` AST node.
 * @param data       - Template data object.
 * @param formatters - Optional formatters.
 * @param debugMode  - Whether to wrap iterations in debug nodes.
 * @returns Resolved children (flat in production, wrapped in debug mode).
 */
function expandEachWithDebug(
  node: ASTNode,
  data: TemplateData,
  formatters?: FormatterMap,
  debugMode?: boolean,
  onMissing?: OnMissingVariable,
): ASTNode[] {
  if (!debugMode) {
    // Production: standard loop expansion
    return expandEach(node, data, (n, d, f) => resolveNode(n, d, f, false, onMissing), formatters);
  }

  // Debug mode: wrap each iteration in a synthetic _mc-loop-iteration node
  const itemsPath = node.attributes['items'] ?? '';
  const asName = node.attributes['as'] ?? 'item';
  const indexAlias = node.attributes['index'];

  // Resolve the items array
  const items = resolvePath(data, itemsPath);

  if (!Array.isArray(items)) {
    return [];
  }

  const totalIterations = items.length;
  const result: ASTNode[] = [];

  for (let idx = 0; idx < totalIterations; idx++) {
    const item = items[idx] as unknown;
    const scopedData: TemplateData = {
      ...data,
      [asName]: item,
      _index: idx,
      _first: idx === 0,
      _last: idx === totalIterations - 1,
      _total: totalIterations,
    };

    // Wire the optional `index` alias (e.g. index="i" → {{i}} == _index).
    if (indexAlias !== undefined && indexAlias !== '' && !BLOCKED_AS_NAMES.has(indexAlias)) {
      scopedData[indexAlias] = idx;
    }

    // Resolve each child with scoped data
    const resolvedChildren: ASTNode[] = [];
    for (const child of node.children) {
      const resolved = resolveNode(child, scopedData, formatters, true, onMissing);
      resolvedChildren.push(resolved);
    }

    // Create a synthetic _mc-loop-iteration wrapper node
    const loopInfo: LoopInfo = {
      itemsExpression: itemsPath,
      loopVariable: asName,
      iterationIndex: idx,
      totalIterations,
      iterationData: item,
    };

    const wrapperNode: ASTNode = {
      type: '_mc-loop-iteration',
      attributes: {},
      children: resolvedChildren,
      content: [],
      loc: node.loc,
      _debug: { loopInfo },
    };
    result.push(wrapperNode);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Conditional chain resolution
// ---------------------------------------------------------------------------

/** Result of processing a conditional chain. */
interface ConditionalChainResult {
  /** The resolved nodes from the winning branch. */
  nodes: ASTNode[];
  /** The index after the last node in the chain. */
  nextIndex: number;
}

/**
 * Resolves an mc-if / mc-else-if / mc-else chain.
 *
 * Starting from an mc-if node, walks forward through consecutive
 * mc-else-if and mc-else nodes. The first truthy branch wins.
 * mc-else is always truthy (final fallback).
 *
 * When `debugMode` is true, wraps the winning branch's children in a
 * synthetic `_mc-conditional-branch` node for source map tracking.
 *
 * @param children   - The full children array.
 * @param startIndex - Index of the mc-if node.
 * @param data       - Current template data scope.
 * @param formatters - Optional formatters.
 * @param debugMode  - Whether to wrap result in debug nodes.
 * @returns Resolved nodes and the next index to continue from.
 */
function resolveConditionalChain(
  children: ASTNode[],
  startIndex: number,
  data: TemplateData,
  formatters?: FormatterMap,
  debugMode?: boolean,
  onMissing?: OnMissingVariable,
): ConditionalChainResult {
  let winningBranch: ASTNode | null = null;
  let winningCondition = '';
  let winningType: ConditionalInfo['type'] = 'mc-if';
  let i = startIndex;

  // Process mc-if
  const ifNode = children[i];
  if (!ifNode) {
    return { nodes: [], nextIndex: startIndex + 1 };
  }
  const ifCondition = ifNode.attributes['condition'] ?? '';
  if (evaluateCondition(data, ifCondition)) {
    winningBranch = ifNode;
    winningCondition = ifCondition;
    winningType = 'mc-if';
  }
  i++;

  // Process consecutive mc-else-if and mc-else nodes
  while (i < children.length) {
    const next = children[i];
    if (!next) break;

    if (next.type === 'mc-else-if') {
      if (!winningBranch) {
        const condition = next.attributes['condition'] ?? '';
        if (evaluateCondition(data, condition)) {
          winningBranch = next;
          winningCondition = condition;
          winningType = 'mc-else-if';
        }
      }
      i++;
      continue;
    }

    if (next.type === 'mc-else') {
      if (!winningBranch) {
        winningBranch = next;
        winningCondition = '';
        winningType = 'mc-else';
      }
      i++;
      break; // mc-else is always the last in the chain
    }

    // Not part of the chain — stop
    break;
  }

  // Resolve the winning branch's children (or return empty)
  if (winningBranch) {
    const resolvedChildren = resolveChildren(winningBranch.children, data, formatters, debugMode, onMissing);

    if (debugMode) {
      // Wrap the winning branch in a _mc-conditional-branch node
      const conditionalInfo: ConditionalInfo = {
        type: winningType,
        condition: winningCondition,
        branchTaken: true,
      };
      const wrapperNode: ASTNode = {
        type: '_mc-conditional-branch',
        attributes: {},
        children: resolvedChildren,
        content: [],
        loc: winningBranch.loc,
        _debug: { conditionalInfo },
      };
      return { nodes: [wrapperNode], nextIndex: i };
    }

    return { nodes: resolvedChildren, nextIndex: i };
  }

  return { nodes: [], nextIndex: i };
}
