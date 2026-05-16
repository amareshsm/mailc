/**
 * HTML formatter for prettified compiler output.
 *
 * Uses a static top-level *default* import of `js-beautify` so that bundlers
 * (esbuild, Vite, Rollup) emit a real ESM `import` statement instead of a CJS
 * `require()` shim. js-beautify is a CommonJS package (`export =`); a default
 * import resolves to its `module.exports` across esbuild, consumer bundlers,
 * and native Node ESM alike. A *named* import (`import { html }`) instead
 * throws under strict Node ESM / tsx because the CJS module exposes no real
 * named bindings. js-beautify is bundled inline for Node and IIFE builds; kept
 * external for browser ESM so Vite/webpack resolve it from the consumer's
 * node_modules.
 *
 * @module utils/formatter
 */

import jsBeautify from 'js-beautify';
import type { HTMLBeautifyOptions } from 'js-beautify';

const _beautifyHtml = jsBeautify.html;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Email-safe js-beautify configuration.
 *
 * - `wrap_line_length: 0` — never wraps long attribute values; email client
 *   parsers can be sensitive to mid-attribute line breaks.
 * - `content_unformatted: ['script', 'style']` — don't reformat embedded CSS
 *   or JS; the MSO conditional style blocks must be left intact.
 * - `templating: ['django', 'erb', 'handlebars', 'php']` — preserves `{{ }}`
 *   tokens and other template expressions that may remain in debug output.
 * - `inline: []` — treat every element as block-level so each tag gets its
 *   own line; this is what makes source map line numbers meaningful.
 */
const BEAUTIFY_OPTIONS: HTMLBeautifyOptions = {
  indent_size: 2,
  indent_char: ' ',
  max_preserve_newlines: 1,
  preserve_newlines: true,
  wrap_line_length: 0,
  end_with_newline: false,
  inline: [],
  extra_liners: [],
  content_unformatted: ['script', 'style'],
  templating: ['django', 'erb', 'handlebars', 'php'],
} as const;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface PrettifyResult {
  /** The HTML string — prettified if `formatted` is true, original otherwise. */
  html: string;
  /** Whether prettification actually ran. Always true. */
  formatted: boolean;
}

/** Prettifies an HTML string. Never throws. */
export function prettifyHtml(html: string): PrettifyResult {
  return { html: _beautifyHtml(html, BEAUTIFY_OPTIONS), formatted: true };
}

/**
 * @deprecated No-op — kept only so existing test imports don't break.
 * @internal
 */
export function loadFormatter(): ((html: string) => string) | null {
  return (html: string) => _beautifyHtml(html, BEAUTIFY_OPTIONS);
}

/** @internal — for tests only */
export function _resetFormatterCache(): void { /* no-op */ }
