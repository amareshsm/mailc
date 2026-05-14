/**
 * Top-level CSS checking convenience function.
 *
 * Accepts a raw CSS string (e.g. "color: red; font-size: 16px") and
 * checks each property against caniemail for email client compatibility.
 *
 * This is the user-facing API wrapper around the lower-level `checkCSS()`
 * which takes `CSSProperty[]`.
 *
 * @module css/check-css
 */

import type { CSSProperty } from '../types.js';
import { checkCSS, clearCheckerCache } from './checker.js';
import type { CSSCheckResult } from './checker.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parses a CSS declarations string into an array of CSSProperty objects.
 *
 * @param css - Raw CSS declarations, e.g. "color: red; font-size: 16px".
 * @returns Array of property-value pairs.
 */
function parseDeclarations(css: string): CSSProperty[] {
  const props: CSSProperty[] = [];
  const parts = css.split(';');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const property = trimmed.slice(0, colonIdx).trim();
    const value = trimmed.slice(colonIdx + 1).trim();

    if (property && value) {
      props.push({ property, value });
    }
  }

  return props;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Checks CSS declarations against email client compatibility using caniemail.
 *
 * Accepts a raw CSS string (semicolon-delimited declarations) and an
 * optional list of target client globs. Returns a `CSSCheckResult` with
 * any compatibility issues found.
 *
 * @param css     - CSS declarations string, e.g. `"color: red; display: flex"`.
 * @param clients - Target client globs, e.g. `["gmail.*", "outlook.*"]`.
 *                  Defaults to all clients if omitted.
 * @returns Check result with issues array and success flag.
 *
 * @example
 * ```ts
 * import { checkCss } from 'mailc';
 *
 * const result = checkCss('display: flex; gap: 16px', ['gmail.*', 'outlook.*']);
 * if (!result.success) {
 *   console.log(result.issues);
 * }
 * ```
 */
export function checkCss(
  css: string,
  clients: string[] = ['*'],
): CSSCheckResult {
  clearCheckerCache();
  const props = parseDeclarations(css);

  if (props.length === 0) {
    return { issues: [], success: true };
  }

  return checkCSS(props, clients);
}
