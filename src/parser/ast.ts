/**
 * AST node helpers for the parser.
 *
 * Provides factory functions for creating well-formed AST nodes
 * without repeating boilerplate in the parser.
 */
import type { ASTNode, ASTTextNode, ASTExpressionNode, SourceLocation, SourcePosition } from '../types.js';

/**
 * Creates a new AST node with sensible defaults.
 *
 * @param type - Component tag name (e.g. "mc-text").
 * @param loc - Source location of the node.
 * @returns A fully initialised ASTNode.
 */
export function createNode(
  type: string,
  loc: SourceLocation,
  attributes: Record<string, string> = {},
): ASTNode {
  return { type, attributes, children: [], content: [], loc };
}

/**
 * Creates an AST text node.
 *
 * @param value - The literal text.
 * @param loc - Source location.
 * @returns An ASTTextNode.
 */
export function createTextNode(value: string, loc: SourceLocation): ASTTextNode {
  return { type: 'text', value, loc };
}

/**
 * Creates an AST expression node.
 *
 * @param value - The expression path (e.g. "customer.name").
 * @param raw - Whether this is a triple-brace (unescaped) expression.
 * @param loc - Source location.
 * @returns An ASTExpressionNode.
 */
export function createExpressionNode(
  value: string,
  raw: boolean,
  loc: SourceLocation,
): ASTExpressionNode {
  const node: ASTExpressionNode = { type: 'expression', value, raw, loc };

  // Parse fallback: "name || 'default'" → value = "name", fallback = "default"
  const fallbackMatch = value.match(/^(.+?)\s*\|\|\s*(['"])(.*?)\2\s*$/);
  if (fallbackMatch) {
    node.value = fallbackMatch[1]!.trim();
    node.fallback = fallbackMatch[3]!;
  }

  return node;
}

/**
 * Creates a zero-width source location from a single position.
 *
 * @param pos - The position to use for both start and end.
 * @returns A SourceLocation.
 */
export function locFromPos(pos: SourcePosition): SourceLocation {
  return { start: { ...pos }, end: { ...pos } };
}
