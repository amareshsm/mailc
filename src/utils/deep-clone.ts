/**
 * Deep clone utility for AST nodes and plain objects.
 *
 * Uses structuredClone (available in Node ≥17) for correctness.
 * Falls back to JSON round-trip for edge cases.
 */

/**
 * Creates a deep clone of a value.
 *
 * Handles plain objects, arrays, primitives. Does not handle
 * class instances, functions, Symbols, or circular references.
 *
 * @param value - The value to deep clone.
 * @returns A deep clone of the value.
 */
export function deepClone<T>(value: T): T {
  return structuredClone(value);
}
