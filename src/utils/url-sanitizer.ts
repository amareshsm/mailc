/**
 * URL sanitisation utilities for email security.
 *
 * Prevents injection of dangerous URL schemes (`javascript:`, `data:`,
 * `vbscript:`) that can execute arbitrary code when rendered in email
 * clients or webmail that renders HTML directly.
 *
 * @module utils/url-sanitizer
 */

/**
 * URL schemes that are dangerous in email HTML context.
 *
 * - `javascript:` — executes JS in webmail (Gmail, Outlook Web, Apple Mail)
 * - `data:`        — can embed HTML/JS payloads; renders inline content
 * - `vbscript:`    — legacy IE script execution
 */
const UNSAFE_SCHEMES = /^[\s\u200B-\u200D\uFEFF]*(?:javascript|data|vbscript)\s*:/i;

/**
 * Safe placeholder used when a URL fails the safety check.
 * Produces a no-op link rather than an unsafe one.
 */
export const SAFE_URL_FALLBACK = '#';

/**
 * Checks whether a URL is safe to use in an email `href` or `src` attribute.
 *
 * Strips leading whitespace and zero-width characters before checking to
 * defeat bypass attempts like `  javascript:alert(1)`.
 *
 * @param url - The URL string to check.
 * @returns `true` if the URL is safe, `false` if it should be rejected.
 */
export function isSafeUrl(url: string): boolean {
  return !UNSAFE_SCHEMES.test(url);
}

/**
 * Returns the URL if it is safe, otherwise returns `SAFE_URL_FALLBACK`.
 *
 * Use this as the last defence when emitting `href` or `src` into HTML.
 *
 * @param url - The URL string to sanitise.
 * @returns The original URL if safe, or `'#'` if unsafe.
 */
export function sanitizeUrl(url: string): string {
  return isSafeUrl(url) ? url : SAFE_URL_FALLBACK;
}
