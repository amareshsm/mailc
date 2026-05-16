/**
 * Loop expansion for `mc-each` nodes.
 *
 * Iterates over an array from template data, deep-cloning
 * children per item and injecting scoped data with loop metadata
 * (`_index`, `_first`, `_last`).
 *
 * @module template/loops
 */

import type { ASTNode } from '../types.js';
import type { TemplateData, FormatterMap } from './types.js';
import { resolvePath } from './expressions.js';
import { deepClone } from '../utils/deep-clone.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Keys that must never be used as scoped variable names in loops.
 * Prevents prototype pollution when `as="__proto__"` is used in templates.
 */
export const BLOCKED_AS_NAMES = new Set(['__proto__', 'constructor', 'prototype']);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Expands an `mc-each` node into resolved child nodes.
 *
 * Reads `items`, `as`, and `index` attributes from the node:
 * - `items`: dot-path to an array in data
 * - `as`: variable name to inject each item under
 * - `index` (optional): alias name for the zero-based index (e.g. `index="i"` → `{{i}}`)
 *
 * For each item, deep-clones the children and creates scoped data with:
 * - `[asName]`: the current item
 * - `_index`: zero-based index (always injected)
 * - `_first`: `true` for the first item
 * - `_last`: `true` for the last item
 * - `_total`: total number of items in the collection
 * - `[indexAlias]`: same value as `_index`, injected when `index` attr is set
 *
 * **Nested loop note:** `_index`, `_first`, `_last`, and `_total` from an outer
 * loop are overwritten by the inner loop's values inside the inner block. To
 * preserve the outer loop's index, use the `index` attribute on the outer loop
 * (e.g. `<mc-each items="orders" as="order" index="orderIndex">`) and
 * reference `{{orderIndex}}` inside the inner loop — it will not be shadowed.
 *
 * The `mc-each` wrapper is removed — only its resolved children are returned.
 *
 * @param node        - The `mc-each` ASTNode.
 * @param data        - Template data object.
 * @param resolveNode - Callback to recursively resolve each cloned child.
 * @param formatters  - Optional formatter callback map.
 * @returns Flat array of resolved child nodes.
 */
export function expandEach(
  node: ASTNode,
  data: TemplateData,
  resolveNode: (n: ASTNode, d: TemplateData, f?: FormatterMap) => ASTNode,
  formatters?: FormatterMap,
): ASTNode[] {
  const itemsPath = node.attributes['items'] ?? '';
  const asName = node.attributes['as'] ?? 'item';
  // Optional user-defined alias for the index (e.g. index="i" → {{i}})
  const indexAlias = node.attributes['index'];

  // Guard against prototype pollution: if someone sets as="__proto__",
  // the spread `{ ...data, [asName]: item }` would mutate Object.prototype.
  // Return empty — templates with blocked key names produce no output.
  if (BLOCKED_AS_NAMES.has(asName)) {
    return [];
  }

  const items = resolvePath(data, itemsPath);

  // Not an array or missing → return empty
  if (!Array.isArray(items)) {
    return [];
  }

  const len = items.length;
  const results: ASTNode[] = [];

  for (let i = 0; i < len; i++) {
    const scopedData: TemplateData = {
      ...data,
      [asName]: items[i] as unknown,
      _index: i,
      _first: i === 0,
      _last: i === len - 1,
      _total: len,
    };

    // Wire the optional `index` alias (e.g. index="i" → {{i}} == _index).
    // Guard against prototype pollution just like we do for `as`.
    if (indexAlias !== undefined && indexAlias !== '' && !BLOCKED_AS_NAMES.has(indexAlias)) {
      scopedData[indexAlias] = i;
    }

    // Deep-clone and resolve each child with scoped data
    for (const child of node.children) {
      const cloned = deepClone(child);
      const resolved = resolveNode(cloned, scopedData, formatters);
      results.push(resolved);
    }
  }

  return results;
}
