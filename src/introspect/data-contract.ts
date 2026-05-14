/**
 * @file src/introspect/data-contract.ts
 *
 * Static analysis of an AST tree to extract the data contract —
 * which fields the template requires, which are optional (guarded by mc-if),
 * and what each mc-each loop iterates over.
 *
 * This is a **pure static pass** — it never evaluates conditions or accesses
 * actual data. It walks the raw parsed AST (before template resolution).
 *
 * Key rules:
 * - Paths accessed at root scope or unconditionally → `required`
 * - Paths accessed inside an `mc-if` / `mc-else-if` body → `optional`
 * - Paths accessed inside an `mc-else` body → `optional` (else fires when
 *   the condition is falsy, so the data may or may not be present)
 * - Loop `source` path (e.g. `order.items`) → classified by enclosing scope
 * - Paths on the loop variable (e.g. `item.name`) → tracked in `loops[].usedPaths`
 * - Duplicate paths are merged — locations are accumulated
 * - Loop-scoped paths (e.g. `item.price`) are NOT added to required/optional
 *   because they're per-item, not top-level data fields
 *
 * @module introspect/data-contract
 */

import type { ASTNode, ASTContent } from '../types.js';
import { parseExpression } from '../template/expressions.js';
import type {
  DataContract,
  DataContractField,
  DataContractLoop,
  DataContractLocation,
} from './types.js';

// ---------------------------------------------------------------------------
// Internal walker state
// ---------------------------------------------------------------------------

/** Mutable accumulator threaded through the tree walk. */
interface WalkState {
  /** Key: path string. Value: accumulated field data. */
  required: Map<string, DataContractField>;
  optional: Map<string, DataContractField>;
  loops: DataContractLoop[];
  /**
   * Stack of condition strings — grows when entering mc-if / mc-else-if / mc-else
   * children, shrinks on exit. Non-empty = currently inside a conditional branch.
   */
  conditionStack: string[];
  /**
   * Stack of active loop variable names (e.g. ["item"] or ["order", "item"]).
   * Non-empty = currently inside an mc-each body.
   */
  loopVariableStack: string[];
  /**
   * When inside a loop body, points to the DataContractLoop being built.
   * Stack mirrors loopVariableStack.
   */
  loopStack: DataContractLoop[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Node types that carry a `condition` attribute we should record. */
const CONDITIONAL_TYPES = new Set(['mc-if', 'mc-else-if', 'mc-else']);

/** Node types that are loops. */
const LOOP_TYPES = new Set(['mc-each', 'mc-for-each']);

/** Regex to extract `{{...}}` and `{{{...}}}` from raw attribute strings. */
const EXPRESSION_RE = /\{\{\{(.+?)\}\}\}|\{\{(.+?)\}\}/g;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extracts the data contract from a parsed AST.
 *
 * Walks the entire AST tree without resolving any expressions — this is
 * pure structural analysis. Safe to call on the raw output of `parse()`.
 *
 * @param ast - The root AST node (typically the `mc` root or `mc-body`).
 * @returns A {@link DataContract} with required fields, optional fields, and loops.
 *
 * @example
 * ```typescript
 * import { parse } from 'mailc';
 * import { introspect } from 'mailc';
 *
 * const ast = parse(templateSource);
 * const contract = introspect.dataContract(ast);
 * ```
 */
export function extractDataContract(ast: ASTNode): DataContract {
  const state: WalkState = {
    required: new Map(),
    optional: new Map(),
    loops: [],
    conditionStack: [],
    loopVariableStack: [],
    loopStack: [],
  };

  walkNode(ast, state);

  return {
    required: Array.from(state.required.values()),
    optional: Array.from(state.optional.values()),
    loops: state.loops,
  };
}

// ---------------------------------------------------------------------------
// Tree walker
// ---------------------------------------------------------------------------

/**
 * Walks a single AST node, recording all expression and attribute paths.
 *
 * @param node  - The node to inspect.
 * @param state - Shared mutable accumulator.
 */
function walkNode(node: ASTNode, state: WalkState): void {
  // 1. Scan content ({{expressions}} inside text)
  walkContent(node.content, state);

  // 2. Scan attribute values for expressions (src="{{url}}", href="{{link}}")
  walkAttributes(node.attributes, node, state);

  // 3. Handle loop nodes
  if (LOOP_TYPES.has(node.type)) {
    walkLoopNode(node, state);
    return; // loop walker handles children recursively
  }

  // 4. Handle conditional nodes
  if (CONDITIONAL_TYPES.has(node.type)) {
    walkConditionalNode(node, state);
    return; // conditional walker handles children
  }

  // 5. Recurse into regular children
  for (const child of node.children) {
    walkNode(child, state);
  }
}

// ---------------------------------------------------------------------------
// Content walker
// ---------------------------------------------------------------------------

/**
 * Records expression paths from a node's content array.
 *
 * @param content - ASTContent array (text + expression nodes).
 * @param state   - Shared accumulator.
 */
function walkContent(content: ASTContent[], state: WalkState): void {
  for (const segment of content) {
    if (segment.type !== 'expression') {
      continue;
    }

    // segment.value is the raw expression string, e.g. "user.name || 'there'"
    const parsed = parseExpression(segment.value);
    if (!parsed.path || parsed.path.trim() === '') {
      continue;
    }

    // Normalise: strip trailing `.length` for fields like `items.length`
    // We want to record `items` as the array field, not `items.length`
    const path = normalizePath(parsed.path.trim());

    const loc = toLoc(segment.loc.start.line, segment.loc.start.col);
    recordPath(path, 'expression', loc, state);
  }
}

// ---------------------------------------------------------------------------
// Attribute walker
// ---------------------------------------------------------------------------

/**
 * Scans all attribute values on a node for `{{expression}}` patterns
 * and records the referenced paths.
 *
 * @param attributes - Raw attribute key-value map.
 * @param node       - The owning node (for source location).
 * @param state      - Shared accumulator.
 */
function walkAttributes(
  attributes: Record<string, string>,
  node: ASTNode,
  state: WalkState,
): void {
  for (const [, value] of Object.entries(attributes)) {
    if (typeof value !== 'string' || !value.includes('{{')) {
      continue;
    }

    EXPRESSION_RE.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = EXPRESSION_RE.exec(value)) !== null) {
      const raw = (match[1] ?? match[2] ?? '').trim();
      if (!raw) {
        continue;
      }

      const parsed = parseExpression(raw);
      if (!parsed.path || parsed.path.trim() === '') {
        continue;
      }

      const path = normalizePath(parsed.path.trim());
      const loc = toLoc(node.loc.start.line, node.loc.start.col);
      recordPath(path, 'attribute', loc, state);
    }
  }
}

// ---------------------------------------------------------------------------
// Loop walker
// ---------------------------------------------------------------------------

/**
 * Handles an `mc-each` or `mc-for-each` node:
 * 1. Records the source array path (e.g. `order.items`)
 * 2. Creates a DataContractLoop entry
 * 3. Recurses into children with the loop variable on the stack
 *
 * @param node  - The loop node.
 * @param state - Shared accumulator.
 */
function walkLoopNode(node: ASTNode, state: WalkState): void {
  // mc-each uses `items` attr; mc-for-each uses `collection`
  const sourcePath = (node.attributes['items'] ?? node.attributes['collection'] ?? '').trim();
  const loopVar = (node.attributes['as'] ?? 'item').trim();

  const loc = toLoc(node.loc.start.line, node.loc.start.col);

  if (sourcePath) {
    // The source array itself is a data field (required/optional by scope)
    recordPath(sourcePath, 'loop-source', loc, state);
  }

  // Build the DataContractLoop entry
  const loop: DataContractLoop = {
    variable: loopVar,
    source: sourcePath,
    usedPaths: [],
    location: loc,
  };
  state.loops.push(loop);

  // Push onto stacks before recursing into children
  state.loopVariableStack.push(loopVar);
  state.loopStack.push(loop);

  for (const child of node.children) {
    walkNode(child, state);
  }

  // Pop stacks after processing children
  state.loopVariableStack.pop();
  state.loopStack.pop();
}

// ---------------------------------------------------------------------------
// Conditional walker
// ---------------------------------------------------------------------------

/**
 * Handles an `mc-if`, `mc-else-if`, or `mc-else` node:
 * 1. Records any paths in the `condition` attribute itself
 * 2. Recurses into children with the condition pushed onto the stack
 *
 * @param node  - The conditional node.
 * @param state - Shared accumulator.
 */
function walkConditionalNode(node: ASTNode, state: WalkState): void {
  const condition = (node.attributes['condition'] ?? '').trim();

  // Record paths referenced directly in the condition expression
  // e.g. condition="user.plan == 'pro'" → records "user.plan"
  if (condition) {
    const loc = toLoc(node.loc.start.line, node.loc.start.col);
    const paths = extractConditionPaths(condition);
    for (const path of paths) {
      recordPath(path, 'condition', loc, state);
    }
  }

  // Push condition so children are classified as optional
  state.conditionStack.push(condition || '__else__');

  for (const child of node.children) {
    walkNode(child, state);
  }

  state.conditionStack.pop();
}

// ---------------------------------------------------------------------------
// Path recording
// ---------------------------------------------------------------------------

/**
 * Records a data path into the required or optional map, based on
 * whether the current walk is inside a conditional branch.
 *
 * Loop-scoped paths (first segment matches the active loop variable) are
 * recorded into the current loop's `usedPaths` instead.
 *
 * @param path   - Dot-separated path, e.g. `"user.name"`.
 * @param usedIn - How the path is referenced.
 * @param loc    - Source location.
 * @param state  - Shared accumulator.
 */
function recordPath(
  path: string,
  usedIn: DataContractField['usedIn'],
  loc: DataContractLocation,
  state: WalkState,
): void {
  // Skip empty or single-char paths
  if (!path || path.length < 2) {
    return;
  }

  // Skip arithmetic-only tokens like "i + 1"
  if (isArithmetic(path)) {
    return;
  }

  const topLoopVar = state.loopVariableStack[state.loopVariableStack.length - 1];

  // If the path starts with the active loop variable, it's loop-scoped
  if (topLoopVar && isLoopScopedPath(path, topLoopVar)) {
    const currentLoop = state.loopStack[state.loopStack.length - 1];
    if (currentLoop && !currentLoop.usedPaths.includes(path)) {
      currentLoop.usedPaths.push(path);
    }
    return;
  }

  const isInsideConditional = state.conditionStack.length > 0;
  const gatingCondition = isInsideConditional
    ? state.conditionStack[state.conditionStack.length - 1]
    : undefined;

  if (isInsideConditional) {
    // Only add to optional if not already classified as required.
    // A condition expression records its paths at root scope (required), then the
    // same path may appear again inside the conditional body — without this guard
    // the path would land in BOTH maps.
    if (state.required.has(path)) {
      // Already required — just accumulate the location
      const existing = state.required.get(path);
      if (existing && !existing.locations.some((l) => l.line === loc.line && l.col === loc.col)) {
        existing.locations.push(loc);
      }
      return;
    }

    // Optional field
    const existing = state.optional.get(path);
    if (existing) {
      // Accumulate locations, but only if not already recorded
      if (!existing.locations.some((l) => l.line === loc.line && l.col === loc.col)) {
        existing.locations.push(loc);
      }
    } else {
      state.optional.set(path, {
        path,
        usedIn,
        locations: [loc],
        loopScope: topLoopVar,
        condition: gatingCondition === '__else__' ? undefined : gatingCondition,
      });
    }
  } else {
    // Required field — promote from optional if previously only seen in conditional
    if (!state.required.has(path)) {
      const existingOptional = state.optional.get(path);
      if (existingOptional) {
        // Now seen unconditionally — promote to required, remove from optional
        state.optional.delete(path);
        state.required.set(path, {
          path,
          usedIn: existingOptional.usedIn,
          locations: [...existingOptional.locations, loc],
          loopScope: topLoopVar,
        });
      } else {
        state.required.set(path, {
          path,
          usedIn,
          locations: [loc],
          loopScope: topLoopVar,
        });
      }
    } else {
      // Accumulate location onto existing required entry
      const existing = state.required.get(path);
      if (existing && !existing.locations.some((l) => l.line === loc.line && l.col === loc.col)) {
        existing.locations.push(loc);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Literal keywords that are never data paths. */
const CONDITION_KEYWORDS = new Set([
  'null', 'undefined', 'true', 'false', 'NaN', 'Infinity',
]);

/**
 * Extracts all dot-path identifiers from a condition expression string.
 *
 * e.g. `"user.plan == 'pro' && order.total > 100"` → `["user.plan", "order.total"]`
 * e.g. `"isLoggedIn"` → `["isLoggedIn"]`
 *
 * Handles: `==`, `!=`, `>`, `<`, `>=`, `<=`, `&&`, `||`, `!`, parens.
 * Skips string literals, numbers, and JS keywords (null, true, false, …).
 *
 * @param condition - The raw condition attribute value.
 * @returns Array of dot-paths referenced in the condition.
 */
function extractConditionPaths(condition: string): string[] {
  const paths: string[] = [];

  // Tokenise by splitting on operators and whitespace
  // Remove string literals first to avoid extracting words from them
  const withoutStrings = condition
    .replace(/'[^']*'/g, '')
    .replace(/"[^"]*"/g, '');

  // Split on operators/whitespace/parens, then filter for identifier paths
  const tokens = withoutStrings.split(/[\s()!=<>&|,+\-*/]+/);

  for (const token of tokens) {
    const t = token.trim();
    // Must start with a letter or underscore, contain only word chars and dots,
    // and not be a JS keyword / literal
    if (
      /^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(t) &&
      t.length > 1 &&
      !CONDITION_KEYWORDS.has(t)
    ) {
      paths.push(normalizePath(t));
    }
  }

  return paths;
}

/**
 * Normalises a path string:
 * - Strips `.length` suffix (records array, not .length property)
 * - Trims whitespace
 *
 * @param path - Raw path string.
 * @returns Normalised path.
 */
function normalizePath(path: string): string {
  return path.trim().replace(/\.length$/, '');
}

/**
 * Returns true if the path starts with the given loop variable name
 * (i.e. is scoped to the current loop iteration).
 *
 * e.g. path=`"item.price"`, loopVar=`"item"` → true
 * e.g. path=`"order.total"`, loopVar=`"item"` → false
 *
 * @param path    - The data path.
 * @param loopVar - The current loop variable name.
 */
function isLoopScopedPath(path: string, loopVar: string): boolean {
  return path === loopVar || path.startsWith(`${loopVar}.`);
}

/**
 * Returns true if the string looks like a pure arithmetic expression
 * (e.g. `"i + 1"`) rather than a data path.
 *
 * @param path - The candidate string.
 */
function isArithmetic(path: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*\s*[+\-*/]\s*\d+$/.test(path);
}

/**
 * Converts AST line/column to a DataContractLocation.
 * SourcePosition uses 1-based line and 1-based col.
 *
 * @param line - 1-based line.
 * @param col  - 1-based column from AST.
 */
function toLoc(line: number, col: number): DataContractLocation {
  return { line, col };
}
