/**
 * JSON → AST converter for the mailc JSON → Email API.
 *
 * Converts an MCNode tree into an ASTNode tree that can be fed
 * directly into the existing compiler pipeline (`compileNode()`).
 *
 * The key conversion is `content: string` → `ASTContent[]`,
 * which parses template expressions like `{{variable}}` and `{{{raw}}}`.
 *
 * @module json/json-to-ast
 */

import type { ASTNode, ASTContent, SourceLocation, SourcePosition } from '../types.js';
import type { MCNode } from './schema.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Synthetic source location for JSON-sourced nodes (no real source position). */
const SYNTHETIC_POSITION: SourcePosition = { line: 0, col: 0, offset: 0 };

/** Synthetic source location used for all JSON-derived AST nodes. */
const SYNTHETIC_LOC: SourceLocation = {
  start: SYNTHETIC_POSITION,
  end: SYNTHETIC_POSITION,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Options that affect JSON→AST conversion behavior. */
export interface JsonToAstOptions {
  /**
   * When `false`, content strings are not scanned for `{{ }}` template
   * expressions — they pass through as a single literal text node. This
   * makes user-typed content containing curly braces safe by default for
   * builders that don't use mailc's templating engine.
   *
   * @default true
   */
  templating?: boolean;
}

/**
 * Converts an MCNode tree into an ASTNode tree.
 *
 * The resulting ASTNode can be passed directly to `compileNode()`
 * from the compiler module.
 *
 * @param node    - The root MCNode to convert.
 * @param options - Optional conversion options (e.g. `templating: false`).
 * @returns A fully-formed ASTNode tree.
 */
export function jsonToAST(node: MCNode, options: JsonToAstOptions = {}): ASTNode {
  const templating = options.templating !== false;
  return convertNode(node, templating);
}

// ---------------------------------------------------------------------------
// Internal conversion
// ---------------------------------------------------------------------------

/**
 * Recursively converts a single MCNode to an ASTNode.
 *
 * @param node - The MCNode to convert.
 * @returns The equivalent ASTNode.
 */
function convertNode(node: MCNode, templating: boolean): ASTNode {
  const children = node.children
    ? node.children.map((child) => convertNode(child, templating))
    : [];

  const content = node.content
    ? parseContent(node.content, templating)
    : [];

  // When the input came from `compileFromJSON(string)`, the position-tracking
  // parser attaches a real `loc` to each node. Object-input callers leave it
  // undefined — fall back to synthetic so existing behavior is preserved.
  const loc: SourceLocation = node.loc
    ? { start: { ...node.loc.start }, end: { ...node.loc.end } }
    : SYNTHETIC_LOC;

  return {
    // Preserve the builder-supplied stable id when present. Empty strings are
    // treated as absent — the collector should fall back to its counter rather
    // than emit data-mc-id="".
    ...(node.id && node.id.length > 0 ? { id: node.id } : {}),
    type: node.type,
    attributes: { ...node.attributes },
    children,
    content,
    loc,
  };
}

// ---------------------------------------------------------------------------
// Content parsing — string → ASTContent[]
// ---------------------------------------------------------------------------

/**
 * Parses a content string into ASTContent nodes.
 *
 * Splits on `{{{ }}}` (raw expressions) and `{{ }}` (escaped expressions),
 * producing text nodes for everything in between.
 *
 * When `templating` is `false`, the entire string is returned as a single
 * literal text node (no scanning) — used by builders that accept arbitrary
 * user-typed content where `{{` may legitimately appear as text.
 *
 * Examples:
 * - `"Hello World"` → `[{ type: 'text', value: 'Hello World' }]`
 * - `"Hi {{name}}"` → `[text("Hi "), expression("name")]`
 * - `"{{{rawHtml}}}"` → `[expression("rawHtml", raw: true)]`
 * - `"{{name || \"there\"}}"` → `[expression("name", fallback: "there")]`
 * - With `templating=false`: `"Use code {{SAVE20}}"` → `[text("Use code {{SAVE20}}")]`
 *
 * @param content    - The raw content string to parse.
 * @param templating - When `false`, skip expression scanning entirely.
 *                     Defaults to `true` for back-compat.
 * @returns An array of ASTContent nodes (text + expression).
 */
export function parseContent(content: string, templating = true): ASTContent[] {
  if (!templating) {
    return content.length > 0
      ? [{ type: 'text', value: content, loc: SYNTHETIC_LOC }]
      : [];
  }
  const result: ASTContent[] = [];
  let remaining = content;

  while (remaining.length > 0) {
    // Look for the next expression opening: `{{{` (raw) or `{{` (escaped)
    const rawIdx = remaining.indexOf('{{{');
    const exprIdx = remaining.indexOf('{{');

    // No more expressions — rest is plain text
    if (exprIdx === -1) {
      pushText(result, remaining);
      break;
    }

    // Check if it's a raw triple-brace expression
    const isRaw = rawIdx !== -1 && rawIdx === exprIdx;
    const openLen = isRaw ? 3 : 2;
    const closeStr = isRaw ? '}}}' : '}}';

    // Text before the expression
    if (exprIdx > 0) {
      pushText(result, remaining.substring(0, exprIdx));
    }

    // Find the closing braces
    const closeIdx = remaining.indexOf(closeStr, exprIdx + openLen);
    if (closeIdx === -1) {
      // Unclosed expression — treat the rest as text
      pushText(result, remaining.substring(exprIdx));
      break;
    }

    // Extract expression value
    const rawValue = remaining.substring(exprIdx + openLen, closeIdx).trim();
    const { value, fallback } = parseFallback(rawValue);

    result.push({
      type: 'expression',
      value,
      raw: isRaw,
      ...(fallback !== undefined ? { fallback } : {}),
      loc: SYNTHETIC_LOC,
    });

    remaining = remaining.substring(closeIdx + closeStr.length);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parses a `||` fallback from an expression value.
 *
 * `"name || \"there\""` → `{ value: "name", fallback: "there" }`
 * `"order.id"` → `{ value: "order.id", fallback: undefined }`
 *
 * @param raw - The raw expression string (already trimmed).
 * @returns The parsed value and optional fallback.
 */
function parseFallback(raw: string): { value: string; fallback?: string } {
  const pipeIdx = raw.indexOf('||');
  if (pipeIdx === -1) {
    return { value: raw };
  }

  const value = raw.substring(0, pipeIdx).trim();
  let fallbackRaw = raw.substring(pipeIdx + 2).trim();

  // Strip surrounding quotes if present: "there" or 'there'
  if (
    (fallbackRaw.startsWith('"') && fallbackRaw.endsWith('"')) ||
    (fallbackRaw.startsWith("'") && fallbackRaw.endsWith("'"))
  ) {
    fallbackRaw = fallbackRaw.slice(1, -1);
  }

  return { value, fallback: fallbackRaw };
}

/**
 * Pushes a text node to the result array, only if the value is non-empty.
 *
 * @param result - The accumulator array.
 * @param value  - The text value.
 */
function pushText(result: ASTContent[], value: string): void {
  if (value.length > 0) {
    result.push({
      type: 'text',
      value,
      loc: SYNTHETIC_LOC,
    });
  }
}
