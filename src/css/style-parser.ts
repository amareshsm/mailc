/**
 * CSS style parser — parses raw CSS text into structured rules.
 *
 * Used by `mc-style inline="true"` to extract CSS selectors and their
 * declarations so they can be inlined onto matching HTML elements.
 *
 * Supports:
 * - Class selectors: `.header { ... }`
 * - Type selectors: `h1 { ... }`
 * - Multiple selectors: `.a, .b { ... }`
 *
 * Does NOT support:
 * - Pseudo-selectors (`:hover`, `::before`)
 * - Media queries (`@media`)
 * - Nested rules
 * - Attribute selectors (`[type="text"]`)
 *
 * @module css/style-parser
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** A parsed CSS rule with selector and declarations. */
export interface ParsedCSSRule {
  /** CSS selector string (e.g. `.header`, `h1`). */
  selector: string;
  /** CSS declarations as property → value pairs. */
  declarations: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parses raw CSS text into an array of structured rules.
 *
 * Each rule contains a selector and its declarations as key-value pairs.
 * Comma-separated selectors are split into individual rules with the
 * same declarations.
 *
 * @param cssText - Raw CSS text, e.g. `.highlight { color: red; font-weight: bold; }`
 * @returns Array of parsed CSS rules.
 */
export function parseCSSRules(cssText: string): ParsedCSSRule[] {
  const rules: ParsedCSSRule[] = [];
  const cleaned = stripComments(cssText);

  // Match rule blocks: selector(s) { declarations }
  const ruleRegex = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;

  while ((match = ruleRegex.exec(cleaned)) !== null) {
    const selectorBlock = (match[1] ?? '').trim();
    const declarationBlock = (match[2] ?? '').trim();

    if (!selectorBlock || !declarationBlock) {
      continue;
    }

    // Skip @-rules (media queries, keyframes, etc.)
    if (selectorBlock.startsWith('@')) {
      continue;
    }

    const declarations = parseDeclarations(declarationBlock);
    if (Object.keys(declarations).length === 0) {
      continue;
    }

    // Split comma-separated selectors into individual rules
    const selectors = selectorBlock.split(',').map((s) => s.trim()).filter(Boolean);
    for (const selector of selectors) {
      rules.push({ selector, declarations });
    }
  }

  return rules;
}

/**
 * Extracts the class name from a simple class selector.
 *
 * @param selector - CSS selector string.
 * @returns The class name without the dot, or `null` if not a simple class selector.
 *
 * @example
 * extractClassName('.header')   // 'header'
 * extractClassName('.my-class') // 'my-class'
 * extractClassName('h1')        // null
 * extractClassName('.a .b')     // null (compound selector)
 */
export function extractClassName(selector: string): string | null {
  // Simple class selector: exactly `.className` with no spaces, combinators, etc.
  const match = /^\.([\w-]+)$/.exec(selector);
  return match ? (match[1] ?? null) : null;
}

/**
 * Converts a declarations record into an inline style string.
 *
 * @param declarations - CSS declarations as property → value pairs.
 * @returns Inline style string, e.g. `"color:red;font-weight:bold"`.
 */
export function declarationsToInlineStyle(
  declarations: Record<string, string>,
): string {
  return Object.entries(declarations)
    .map(([prop, val]) => `${prop}:${val}`)
    .join(';');
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Strips CSS comments from text.
 *
 * @param css - CSS text potentially containing comments.
 * @returns CSS text with comments removed.
 */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Parses a CSS declaration block into property → value pairs.
 *
 * @param block - The text inside `{ }`, e.g. `"color: red; font-size: 16px;"`.
 * @returns Declarations as a record.
 */
function parseDeclarations(block: string): Record<string, string> {
  const result: Record<string, string> = {};

  const parts = block.split(';').map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    const colonIndex = part.indexOf(':');
    if (colonIndex === -1) {
      continue;
    }
    const property = part.slice(0, colonIndex).trim();
    const value = part.slice(colonIndex + 1).trim();

    if (property && value) {
      result[property] = value;
    }
  }

  return result;
}
