/**
 * HTML entity escaping for safe text output in email HTML.
 */

const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const ESCAPE_RE = /[&<>"']/g;

/**
 * Escapes HTML special characters in a string.
 *
 * @param str - The raw string to escape.
 * @returns The escaped string safe for HTML content.
 */
export function escapeHtml(str: string): string {
  return str.replace(ESCAPE_RE, (char) => ESCAPE_MAP[char] ?? char);
}

const UNESCAPE_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};

const UNESCAPE_RE = /&(?:amp|lt|gt|quot|#39);/g;

/**
 * Unescapes HTML entities back to their raw characters.
 *
 * @param str - The escaped string.
 * @returns The unescaped string.
 */
export function unescapeHtml(str: string): string {
  return str.replace(UNESCAPE_RE, (entity) => UNESCAPE_MAP[entity] ?? entity);
}
