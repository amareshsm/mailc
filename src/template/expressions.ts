/**
 * Template expression resolution.
 *
 * Core functions for resolving dot-path variables, parsing expression syntax,
 * and resolving ASTContent arrays and attribute values against template data.
 *
 * @module template/expressions
 */

import type { ASTContent, ASTTextNode, SourceLocation } from '../types.js';
import type { FormatterMap, ParsedExpression, FormatterCall, TemplateData, OnMissingVariable } from './types.js';
import { escapeHtml } from '../utils/html-escape.js';
import { applyFormatters } from './formatter.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Path segments that are blocked for security reasons. */
const BLOCKED_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

/** Regex to find `{{...}}` or `{{{...}}}` in attribute values. */
const EXPRESSION_RE = /\{\{\{(.+?)\}\}\}|\{\{(.+?)\}\}/g;

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

/**
 * Resolves a dot-separated path through a data object.
 *
 * Supports dot-notation for nested objects and numeric indices for arrays.
 * Returns `undefined` for missing paths. Blocks prototype pollution paths.
 *
 * @param data - The root data object.
 * @param path - Dot-separated path, e.g. `"customer.name"` or `"items.0.price"`.
 * @returns The resolved value, or `undefined` if not found.
 */
export function resolvePath(data: unknown, path: string): unknown {
  if (path === '') {
    return data;
  }

  const segments = path.split('.');
  let current: unknown = data;

  for (const segment of segments) {
    if (BLOCKED_SEGMENTS.has(segment)) {
      return undefined;
    }

    if (current === null || current === undefined) {
      return undefined;
    }

    if (typeof current !== 'object') {
      return undefined;
    }

    // Array numeric index
    const index = Number(segment);
    if (Array.isArray(current) && !Number.isNaN(index)) {
      current = current[index];
    } else {
      current = (current as Record<string, unknown>)[segment];
    }
  }

  return current;
}

// ---------------------------------------------------------------------------
// Expression parsing
// ---------------------------------------------------------------------------

/**
 * Parses an expression string into a structured ParsedExpression.
 *
 * Grammar:
 * ```
 * expression → path ( "||" fallback )? ( "|" formatter )*
 * ```
 *
 * @param expr - The raw expression string (without braces), e.g. `"name || \"Guest\" | upper"`.
 * @returns Parsed expression with path, optional fallback, and formatter chain.
 */
export function parseExpression(expr: string): ParsedExpression {
  const trimmed = expr.trim();

  // Split on `|` but not `||` — use a careful approach:
  // First, extract fallback by finding `||`
  let path: string;
  let fallback: string | undefined;
  let formatterPart: string;

  const fallbackIndex = trimmed.indexOf('||');

  if (fallbackIndex !== -1) {
    path = trimmed.slice(0, fallbackIndex).trim();

    // Everything after `||` — may contain `|` for formatters
    const afterFallback = trimmed.slice(fallbackIndex + 2).trim();

    // Find the first `|` that separates fallback from formatters
    const pipeIndex = findFormatterPipe(afterFallback);

    if (pipeIndex !== -1) {
      fallback = extractQuotedValue(afterFallback.slice(0, pipeIndex).trim());
      formatterPart = afterFallback.slice(pipeIndex + 1);
    } else {
      fallback = extractQuotedValue(afterFallback);
      formatterPart = '';
    }
  } else {
    // No fallback — split path from formatters
    const pipeIndex = findFormatterPipe(trimmed);

    if (pipeIndex !== -1) {
      path = trimmed.slice(0, pipeIndex).trim();
      formatterPart = trimmed.slice(pipeIndex + 1);
    } else {
      path = trimmed;
      formatterPart = '';
    }
  }

  const formatters = parseFormatters(formatterPart);

  return { path, fallback, formatters };
}

// ---------------------------------------------------------------------------
// Content resolution
// ---------------------------------------------------------------------------

/**
 * Resolves ASTContent expressions against template data.
 *
 * - Text nodes: kept as-is.
/**
 * Resolves ASTContent expressions against template data.
 *
 * - Text nodes: kept as-is.
 * - Expression nodes (raw: false): resolve → format → HTML-escape → text node.
 * - Expression nodes (raw: true): resolve → format → text node (no escaping).
 * - Unknown paths with no fallback: keep expression as-is (passthrough).
 *
 * @param content      - The ASTContent array to resolve.
 * @param data         - Template data object.
 * @param formatters   - Optional formatter callback map.
 * @param onExpression - Optional debug callback: called for each resolved expression.
 * @returns Resolved ASTContent array (expressions replaced with text nodes).
 */
export function resolveContent(
  content: ASTContent[],
  data: TemplateData,
  formatters?: FormatterMap,
  onExpression?: (expr: import('../types.js').ExpressionResolution) => void,
  onMissing?: OnMissingVariable,
): ASTContent[] {
  return content.map((node) => {
    if (node.type === 'text') {
      return node;
    }

    // Expression node
    const parsed = parseExpression(node.value);
    let value = resolvePath(data, parsed.path);

    // Apply fallback: check parsed expression first, then AST node's fallback
    // (the parser may have already extracted the fallback from `{{var || "fb"}}`)
    const fallback = parsed.fallback ?? node.fallback;

    const usedFallback = isNullishOrEmpty(value) && fallback !== undefined;
    if (usedFallback) {
      value = fallback;
    }

    // If still unresolved and no fallback, pass through as-is
    if (value === undefined) {
      onMissing?.({ path: parsed.path, expression: node.value, loc: node.loc });
      return node;
    }

    // Apply formatters
    let result = String(value);
    if (parsed.formatters.length > 0 && formatters) {
      result = applyFormatters(value, parsed.formatters, formatters);
    }

    // HTML-escape unless raw
    if (!node.raw) {
      result = escapeHtml(result);
    }

    // SM-D: record expression resolution for debug/source-map tracking
    if (onExpression) {
      onExpression({
        expression: node.value,
        resolvedValue: result,
        dataPath: parsed.path.split('.').filter(Boolean),
        usedFallback,
        fallbackValue: usedFallback ? String(fallback) : undefined,
        sourceLoc: node.loc
          ? { line: node.loc.start.line, col: node.loc.start.col }
          : undefined,
      });
    }

    // Return as text node
    return createTextNode(result, node.loc);
  });
}

// ---------------------------------------------------------------------------
// Attribute resolution
// ---------------------------------------------------------------------------

/**
 * Resolves `{{...}}` expressions embedded in attribute values.
 *
 * Scans each attribute value for expression patterns and replaces them
 * with resolved values from the data object.
 *
 * @param attributes - The attribute map to resolve.
 * @param data       - Template data object.
 * @param formatters - Optional formatter callback map.
 * @returns New attribute map with resolved expressions.
 */
export function resolveAttributes(
  attributes: Record<string, string>,
  data: TemplateData,
  formatters?: FormatterMap,
  onMissing?: OnMissingVariable,
  loc?: SourceLocation,
): Record<string, string> {
  const resolved: Record<string, string> = {};

  for (const [key, value] of Object.entries(attributes)) {
    resolved[key] = resolveAttributeValue(value, data, formatters, onMissing, loc);
  }

  return resolved;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Resolves expressions within a single attribute value string.
 *
 * Returns the raw resolved value — does NOT HTML-escape. Attribute escaping
 * is the compiler's responsibility (single-boundary escape at the output
 * stage, via `attr()`/`reqAttr()` in `src/utils/html-attr.ts`).
 *
 * Putting the escape here would double-escape: the compiler would re-escape
 * the already-escaped value and a `&amp;` from data would become `&amp;amp;`
 * in output. AST and intermediate values are always raw; only the final
 * HTML serialization escapes.
 *
 * The `{{{ raw }}}` form is retained for symmetry with the content path,
 * but in the attribute context it has the same effect as `{{ var }}`
 * because no escaping happens here either way.
 *
 * @param value      - The attribute value, e.g. `"https://example.com/{{order.id}}"`.
 * @param data       - Template data.
 * @param formatters - Optional formatters.
 * @returns The resolved attribute value (raw, unescaped).
 */
function resolveAttributeValue(
  value: string,
  data: TemplateData,
  formatters?: FormatterMap,
  onMissing?: OnMissingVariable,
  loc?: SourceLocation,
): string {
  return value.replace(EXPRESSION_RE, (match, rawExpr: string | undefined, normalExpr: string | undefined) => {
    const expr = rawExpr ?? normalExpr ?? '';

    const parsed = parseExpression(expr);
    let resolved = resolvePath(data, parsed.path);

    if (isNullishOrEmpty(resolved) && parsed.fallback !== undefined) {
      resolved = parsed.fallback;
    }

    // Unresolved → keep original expression
    if (resolved === undefined) {
      onMissing?.({ path: parsed.path, expression: expr, loc });
      return match;
    }

    let result = String(resolved);
    if (parsed.formatters.length > 0 && formatters) {
      result = applyFormatters(resolved, parsed.formatters, formatters);
    }

    return result;
  });
}

/**
 * Finds the first `|` that is NOT part of `||` and NOT inside a quoted string.
 *
 * Used by `parseFormatters` to split formatter chains without breaking on
 * pipes that appear inside quoted arguments (e.g. `replace "|" ","`).
 *
 * @param str - The string to search.
 * @returns Index of the formatter pipe, or -1 if not found.
 */
function findFormatterPipeInTokenized(str: string): number {
  let inQuote: string | null = null;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (!ch) continue;

    if (inQuote) {
      if (ch === inQuote) {
        inQuote = null;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      inQuote = ch;
      continue;
    }

    if (ch === '|' && str[i + 1] !== '|' && (i === 0 || str[i - 1] !== '|')) {
      return i;
    }
  }
  return -1;
}

/**
 * Finds the first `|` that is NOT part of `||`.
 *
 * @param str - The string to search.
 * @returns Index of the formatter pipe, or -1 if not found.
 */
function findFormatterPipe(str: string): number {
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '|' && str[i + 1] !== '|' && (i === 0 || str[i - 1] !== '|')) {
      return i;
    }
  }
  return -1;
}

/**
 * Extracts the inner value from a possibly-quoted string.
 *
 * @param str - The string, e.g. `"\"Guest\""` or `"Guest"`.
 * @returns The unquoted value.
 */
function extractQuotedValue(str: string): string {
  const trimmed = str.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * Parses formatter chains from a pipe-separated string.
 *
 * Uses `findFormatterPipe` to locate each `|` separator, which correctly
 * skips `||` sequences and `|` characters inside quoted strings.
 * This avoids the bug where `input.split('|')` would incorrectly split on
 * pipes that appear inside quoted formatter arguments (e.g. `replace "|" ","`).
 *
 * @param input - The formatter part, e.g. `"trim | upper"` or `"date \"short\""`.
 * @returns Array of FormatterCall objects.
 */
function parseFormatters(input: string): FormatterCall[] {
  if (!input.trim()) {
    return [];
  }

  // Split on `|` that are NOT inside quoted strings and NOT part of `||`.
  // We iterate using findFormatterPipe instead of split('|') to avoid
  // incorrectly splitting on pipes inside quoted formatter arguments.
  const parts: string[] = [];
  let remaining = input;

  while (remaining.length > 0) {
    const pipeIndex = findFormatterPipeInTokenized(remaining);
    if (pipeIndex === -1) {
      parts.push(remaining);
      break;
    }
    parts.push(remaining.slice(0, pipeIndex));
    remaining = remaining.slice(pipeIndex + 1);
  }

  return parts.map((part) => {
    const tokens = tokenizeFormatterPart(part.trim());
    const name = tokens[0] ?? '';
    const args = tokens.slice(1).map(extractQuotedValue);
    return { name, args };
  }).filter((f) => f.name !== '');
}

/**
 * Tokenizes a formatter part into name + arguments.
 * Respects quoted strings as single tokens.
 *
 * @param part - e.g. `'date "short"'` → `['date', '"short"']`
 * @returns Array of tokens.
 */
function tokenizeFormatterPart(part: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuote: string | null = null;

  for (const ch of part) {
    if (inQuote) {
      current += ch;
      if (ch === inQuote) {
        inQuote = null;
      }
    } else if (ch === '"' || ch === "'") {
      inQuote = ch;
      current += ch;
    } else if (ch === ' ') {
      if (current) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Checks if a value is null, undefined, or an empty string.
 *
 * @param value - The value to check.
 * @returns `true` if the value is nullish or empty.
 */
function isNullishOrEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

/**
 * Creates an ASTTextNode with the given value and location.
 *
 * @param value - The text value.
 * @param loc   - Source location to inherit.
 * @returns A new ASTTextNode.
 */
function createTextNode(value: string, loc: SourceLocation): ASTTextNode {
  return { type: 'text', value, loc };
}
