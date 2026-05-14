/**
 * @file src/introspect/can-nest.ts
 *
 * Single-question nesting predicate for builder UIs: "is `childType` allowed
 * directly inside `parentType`?". Reads the same registry-derived rules as
 * the validator, so plugin components registered via `defineComponent()` are
 * honored automatically.
 *
 * @module introspect/can-nest
 */

import { getComponentSpec } from './registry.js';

/**
 * Returns `true` iff `childType` is structurally allowed as a direct child of
 * `parentType`.
 *
 * Drag-and-drop UIs call this to decide whether a drop target is valid before
 * committing the move. Cheap (O(allowedParents.length)) and pure — no AST,
 * no HTML, no validation pass.
 *
 * Behavior notes:
 * - Returns `false` for unknown parent or child types (conservative — never
 *   let an unrecognized component appear "valid anywhere").
 * - Returns `false` for logic components (`mc-if`, `mc-each`, …). Logic
 *   nesting is context-sensitive (it depends on what the host parent
 *   accepts as content) and is intentionally out of scope for this
 *   predicate. Use `introspect.validate()` for full logic-aware checks.
 *
 * @example
 * canNest('mc-column', 'mc-button');  // true
 * canNest('mc-section', 'mc-button'); // false — buttons go in columns
 * canNest('mc-column', 'mc-if');      // false — use introspect.validate for logic
 *
 * @param parentType - The candidate parent component type.
 * @param childType  - The candidate child component type.
 * @returns `true` if the child can be a direct child of the parent.
 */
export function canNest(parentType: string, childType: string): boolean {
  if (!parentType || !childType) return false;

  const childSpec = getComponentSpec(childType);
  if (!childSpec) return false;

  // Logic components carry empty allowedParents — caller should use
  // introspect.validate() for context-sensitive logic nesting checks.
  if (childSpec.allowedParents.length === 0) return false;

  return childSpec.allowedParents.includes(parentType);
}
