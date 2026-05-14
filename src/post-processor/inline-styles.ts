/**
 * Post-processor — injects `mc-style inline="true"` rules onto matching HTML elements.
 *
 * After body compilation produces the full HTML, this processor scans for
 * elements whose `class` attribute matches a rule selector, and merges the
 * rule's declarations into the element's existing `style` attribute.
 *
 * Only supports simple class selectors (`.classname`). Compound selectors,
 * pseudo-classes, and type selectors are ignored for inline injection — they
 * remain in the `<style>` block if present.
 *
 * @module post-processor/inline-styles
 */

import { extractClassName, declarationsToInlineStyle } from '../css/style-parser.js';
import type { CompileContext } from '../types.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Applies `mc-style inline="true"` CSS rules to matching HTML elements.
 *
 * For each rule with a simple class selector (`.classname`), finds HTML
 * elements that have that class and merges the declarations into their
 * `style` attribute. Existing inline styles take precedence (explicit
 * styles from component compilation are never overwritten).
 *
 * @param html    - The compiled HTML string.
 * @param context - Compile context with `inlineStyleRules`.
 * @returns The HTML with inline styles injected.
 */
export function applyInlineStyleRules(
  html: string,
  context: CompileContext,
): string {
  if (context.inlineStyleRules.length === 0) {
    return html;
  }

  // Build a map of class name → merged declarations
  const classDeclarations = buildClassDeclarationMap(context.inlineStyleRules);

  if (classDeclarations.size === 0) {
    return html;
  }

  // Apply declarations to matching elements
  return injectStylesIntoHtml(html, classDeclarations);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Builds a merged map of class name → declarations from inline style rules.
 *
 * Only processes simple class selectors. Later rules override earlier ones
 * for the same property (CSS cascade order).
 *
 * @param rules - Parsed CSS rules from mc-style inline="true".
 * @returns Map of class name → merged declarations.
 */
function buildClassDeclarationMap(
  rules: CompileContext['inlineStyleRules'],
): Map<string, Record<string, string>> {
  const map = new Map<string, Record<string, string>>();

  for (const rule of rules) {
    const className = extractClassName(rule.selector);
    if (!className) {
      // Skip non-class selectors (type selectors, compound selectors, etc.)
      continue;
    }
    const existing = map.get(className) ?? {};
    map.set(className, { ...existing, ...rule.declarations });
  }

  return map;
}

/**
 * Injects inline styles onto HTML elements that match class names.
 *
 * Scans for opening tags with `class` attributes, checks if any class
 * matches the declaration map, and merges styles into the `style` attribute.
 *
 * @param html             - The HTML string to process.
 * @param classDeclarations - Map of class name → CSS declarations.
 * @returns The modified HTML.
 */
function injectStylesIntoHtml(
  html: string,
  classDeclarations: Map<string, Record<string, string>>,
): string {
  // Match opening tags that have a class attribute
  // Captures: full tag, tag content before class, class value, remaining attrs, rest
  const tagWithClassRegex = /<([a-zA-Z][a-zA-Z0-9]*)\s([^>]*?class="([^"]*)"[^>]*)>/g;

  return html.replace(tagWithClassRegex, (fullMatch, _tagName: string, innerAttrs: string, classValue: string) => {
    // Check if any class matches
    const classes = classValue.split(/\s+/).filter(Boolean);
    const mergedDeclarations: Record<string, string> = {};
    let hasMatch = false;

    for (const cls of classes) {
      const decls = classDeclarations.get(cls);
      if (decls) {
        hasMatch = true;
        Object.assign(mergedDeclarations, decls);
      }
    }

    if (!hasMatch) {
      return fullMatch;
    }

    // Extract existing style attribute if present
    const existingStyleMatch = /style="([^"]*)"/.exec(innerAttrs);
    const existingStyle = existingStyleMatch?.[1] ?? '';

    // Parse existing inline styles to avoid overwriting
    const existingDecls = parseInlineStyle(existingStyle);

    // Merge: existing styles take precedence over mc-style inline rules
    const finalDecls = { ...mergedDeclarations, ...existingDecls };
    const finalStyle = declarationsToInlineStyle(finalDecls);

    if (!finalStyle) {
      return fullMatch;
    }

    // Reconstruct the tag with the updated style
    const tagName = fullMatch.match(/^<([a-zA-Z][a-zA-Z0-9]*)/)?.[1] ?? '';
    let newInner = innerAttrs;

    if (existingStyleMatch) {
      // Replace existing style attribute
      newInner = innerAttrs.replace(/style="[^"]*"/, `style="${finalStyle}"`);
    } else {
      // Add style attribute
      newInner = `${innerAttrs} style="${finalStyle}"`;
    }

    return `<${tagName} ${newInner}>`;
  });
}

/**
 * Parses an inline style string into property → value pairs.
 *
 * @param style - Inline style string, e.g. `"color:red;font-size:16px"`.
 * @returns Declarations as a record.
 */
function parseInlineStyle(style: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!style) {
    return result;
  }

  const parts = style.split(';').map((s) => s.trim()).filter(Boolean);
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
