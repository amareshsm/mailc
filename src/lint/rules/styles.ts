/**
 * Email HTML lint rules — Style rules.
 *
 * Checks for shorthand properties in inline styles, that styles are
 * actually inlined, and that no relative units (rem, em, vh, vw) are used.
 *
 * @module lint/rules/styles
 */

import type { LintRule, LintIssue } from '../types.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * CSS shorthand properties that should be expanded to longhand in inline styles.
 * Email clients handle shorthands inconsistently.
 *
 * Note: `outline` and `text-decoration` are NOT included because their
 * simple forms (`outline:none`, `text-decoration:none`) are standard
 * in email resets and well-supported. Only complex multi-value shorthands
 * that email clients parse inconsistently are flagged.
 */
const SHORTHAND_PROPERTIES = [
  'font',
  'background',
  'list-style',
  'transition',
  'animation',
  'flex',
  'grid',
  'columns',
  'column-rule',
];

/**
 * Relative units that are unsupported in email.
 */
const RELATIVE_UNIT_RE = /:\s*[^;]*(?:\d+(?:\.\d+)?)(rem|em|vh|vw|vmin|vmax)\b/gi;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extracts all inline style declarations from the HTML.
 * Returns an array of `{ style, line }` for each `style="..."` found.
 *
 * @param html - The HTML string.
 * @returns Array of style strings with their line numbers.
 */
function extractInlineStyles(
  html: string,
): { style: string; line: number; offset: number }[] {
  const results: { style: string; line: number; offset: number }[] = [];
  const re = /style\s*=\s*"([^"]*)"/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    results.push({
      style: match[1] ?? '',
      line: html.slice(0, match.index).split('\n').length,
      offset: match.index,
    });
  }
  return results;
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

/**
 * Inline styles must not use CSS shorthand properties.
 * Email clients parse shorthands inconsistently.
 */
export const noShorthandInInline: LintRule = {
  id: 'no-shorthand-in-inline',
  description: 'Inline styles must not use CSS shorthand (font, background, etc.)',
  severity: 'warning',
  category: 'styles',
  check(html: string): LintIssue[] {
    const issues: LintIssue[] = [];
    const styles = extractInlineStyles(html);

    for (const { style, line } of styles) {
      for (const prop of SHORTHAND_PROPERTIES) {
        // Match exact property name followed by colon
        // Avoid matching "background-color" when looking for "background"
        const re = new RegExp(`(?:^|;)\\s*${prop}\\s*:`, 'i');
        if (re.test(style)) {
          issues.push({
            ruleId: 'no-shorthand-in-inline',
            message: `Inline style uses shorthand property "${prop}". Expand to longhand properties for consistent email rendering.`,
            severity: 'warning',
            line,
          });
        }
      }
    }
    return issues;
  },
};

/**
 * Primary styles must be inline, not class-based.
 * Checks for class attributes containing common utility class patterns
 * that suggest styles weren't inlined.
 */
export const stylesAreInlined: LintRule = {
  id: 'styles-are-inlined',
  description: 'Primary styles must be inline, not class-based',
  severity: 'info',
  category: 'styles',
  check(html: string): LintIssue[] {
    const issues: LintIssue[] = [];
    // Look for class attributes with Tailwind-like utility classes
    const re = /class\s*=\s*"([^"]*)"/gi;
    let match: RegExpExecArray | null;

    while ((match = re.exec(html)) !== null) {
      const classes = match[1] ?? '';
      // mc-responsive is our internal class, that's fine
      // Check for Tailwind-style utility classes that should have been inlined
      const utilityClasses = classes
        .split(/\s+/)
        .filter((c) => c && !c.startsWith('mc-') && /^(bg-|text-|p-|px-|py-|pt-|pr-|pb-|pl-|m-|mx-|my-|mt-|mr-|mb-|ml-|w-|h-|font-|border-|rounded-)/.test(c));

      if (utilityClasses.length > 0) {
        issues.push({
          ruleId: 'styles-are-inlined',
          message: `Element has utility classes that should be inlined: ${utilityClasses.join(', ')}`,
          severity: 'info',
          line: html.slice(0, match.index).split('\n').length,
        });
      }
    }
    return issues;
  },
};

/**
 * No relative units (rem, em, vh, vw, vmin, vmax) in inline styles.
 * Email clients don't reliably support relative CSS units.
 */
export const noRelativeUnits: LintRule = {
  id: 'no-relative-units',
  description: 'No rem, em, vh, vw in inline styles',
  severity: 'error',
  category: 'styles',
  check(html: string): LintIssue[] {
    const issues: LintIssue[] = [];
    const styles = extractInlineStyles(html);

    for (const { style, line } of styles) {
      const re = new RegExp(RELATIVE_UNIT_RE.source, RELATIVE_UNIT_RE.flags);
      let match: RegExpExecArray | null;
      while ((match = re.exec(style)) !== null) {
        const unit = match[1] ?? '';
        issues.push({
          ruleId: 'no-relative-units',
          message: `Inline style uses relative unit "${unit}". Use px instead for email compatibility.`,
          severity: 'error',
          line,
        });
      }
    }
    return issues;
  },
};

/** All style rules. */
export const STYLE_RULES: LintRule[] = [
  noShorthandInInline,
  stylesAreInlined,
  noRelativeUnits,
];
