/**
 * Post-processor optimizer — comment removal, prettify (default), or minify.
 *
 * Operates on the final assembled HTML string. All transformations are
 * string-based (no DOM parser) for browser compatibility per ADR-002.
 *
 * Output shape is controlled by a single decision driven by `config.output`:
 * - `minify: true`  → collapse whitespace; produces single-line HTML.
 * - `minify: false` (default) → prettify via `js-beautify` (lazy-loaded);
 *                                produces multi-line indented HTML.
 *
 * `comments: false` (default) removes non-Outlook comments before either path.
 *
 * @module post-processor/optimizer
 */

import type { OutputConfig } from '../types.js';
import { prettifyHtml } from '../utils/formatter.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Regex matching Outlook conditional comments.
 * These MUST be preserved — Outlook relies on them.
 */
const OUTLOOK_COMMENT_RE = /<!--\[if\s[^\]]*\]>[\s\S]*?<!\[endif\]-->/g;

/**
 * Regex matching standard HTML comments (non-Outlook).
 * Captures `<!--` ... `-->` that are NOT Outlook conditionals.
 */
const STANDARD_COMMENT_RE = /<!--(?!\[if\s)(?!\[endif\])[\s\S]*?-->/g;

/**
 * Regex matching `<!-- mc:source ... -->` and `<!-- mc:/... -->` debug comments.
 * These are injected by `compileNode()` when `debug: true` and must be preserved
 * in the output (not stripped by `removeStandardComments`).
 */
const MC_SOURCE_COMMENT_RE = /<!--\s*mc:[/\w][\s\S]*?-->/g;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Optimizes the final HTML output based on output config.
 *
 * Single decision, single execution path:
 *   `config.minify === true` → minify (single-line)
 *   otherwise                → prettify (multi-line, default)
 *
 * Source-map id-offset calculation runs *after* this in `compile.ts` and
 * only reads the HTML — it never reformats. Prettify cannot run twice.
 *
 * @param html   - The assembled HTML document.
 * @param config - Output configuration (minify, comments).
 * @param debug  - When true, `mc:source` debug comments are preserved.
 * @returns The optimized HTML string.
 */
export function optimize(html: string, config: OutputConfig, debug = false): string {
  let result = html;

  // Remove non-Outlook comments unless comments are explicitly kept
  if (!config.comments) {
    result = removeStandardComments(result, debug);
  }

  // ── Output shape ─────────────────────────────────────────────────────────
  if (config.minify) {
    result = minifyHTML(result);
  } else {
    // Default — prettify via js-beautify when available. Falls back silently
    // (returns input unchanged) on lean CDN builds or when js-beautify is
    // not installed. Never throws.
    const pretty = prettifyHtml(result);
    if (pretty.formatted) result = pretty.html;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Comment removal
// ---------------------------------------------------------------------------

/**
 * Removes standard HTML comments, preserving Outlook conditionals and
 * (when `debug: true`) `mc:source` debug comments.
 *
 * Strategy: temporarily replace Outlook conditionals (and mc:source comments
 * when debug is on) with placeholders, strip all other comments, then restore.
 *
 * @param html  - The HTML to process.
 * @param debug - When true, also preserve mc:source debug comments.
 * @returns HTML with standard comments removed.
 */
function removeStandardComments(html: string, debug = false): string {
  // Save Outlook conditionals
  const outlookComments: string[] = [];
  let preserved = html.replace(OUTLOOK_COMMENT_RE, (match) => {
    const idx = outlookComments.length;
    outlookComments.push(match);
    return `\x00MC_OUTLOOK_${idx}\x00`;
  });

  // Save mc:source debug comments when debug mode is on
  const mcSourceComments: string[] = [];
  if (debug) {
    preserved = preserved.replace(MC_SOURCE_COMMENT_RE, (match) => {
      const idx = mcSourceComments.length;
      mcSourceComments.push(match);
      return `\x00MC_SOURCE_${idx}\x00`;
    });
  }

  // Remove standard comments
  preserved = preserved.replace(STANDARD_COMMENT_RE, '');

  // Restore mc:source debug comments
  for (let i = 0; i < mcSourceComments.length; i++) {
    preserved = preserved.replace(
      `\x00MC_SOURCE_${i}\x00`,
      mcSourceComments[i] as string,
    );
  }

  // Restore Outlook conditionals
  for (let i = 0; i < outlookComments.length; i++) {
    preserved = preserved.replace(
      `\x00MC_OUTLOOK_${i}\x00`,
      outlookComments[i] as string,
    );
  }

  return preserved;
}

// ---------------------------------------------------------------------------
// Minification
// ---------------------------------------------------------------------------

/**
 * Block-level HTML elements. Whitespace between these tags is safe to remove.
 * Inline elements (span, a, strong, em, etc.) are deliberately excluded —
 * removing whitespace adjacent to them would collapse word spacing.
 *
 * Note: VML tags use a colon in the name (`v:roundrect`, `w:anchorlock`).
 * The tag-extraction regex stops at `:`, so they arrive as `v` and `w`.
 */
const BLOCK_TAGS = new Set([
  'html', 'head', 'body', 'div', 'table', 'thead', 'tbody', 'tfoot',
  'tr', 'td', 'th', 'p', 'ul', 'ol', 'li', 'blockquote',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'footer', 'main',
  'section', 'article', 'aside', 'nav', 'figure', 'figcaption',
  'style', 'script', 'link', 'meta', 'title', 'noscript',
  'center',
  // VML namespace tags — tag extractor stops at ':', 'v:roundrect' → 'v'
  'v', 'w',
]);

/** A segment of HTML, either a preserved block (style/pre) or regular content. */
interface HTMLSegment {
  content: string;
  /** True when this segment must not be modified (style or pre block). */
  isPreserved: boolean;
}

/**
 * Splits HTML into alternating segments of regular content and preserved blocks.
 *
 * Preserved blocks: `<style>` and `<pre>` — their content must not be
 * whitespace-collapsed. `<style>` content is CSS; `<pre>` is preformatted text.
 *
 * @param html - The full HTML string.
 * @returns Array of segments.
 */
function splitAroundPreserved(html: string): HTMLSegment[] {
  const segments: HTMLSegment[] = [];
  const preservedRe = /<(style|pre)[^>]*>[\s\S]*?<\/\1>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = preservedRe.exec(html)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ content: html.slice(lastIndex, match.index), isPreserved: false });
    }
    segments.push({ content: match[0], isPreserved: true });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < html.length) {
    segments.push({ content: html.slice(lastIndex), isPreserved: false });
  }

  return segments;
}

/**
 * Minifies HTML by collapsing whitespace.
 *
 * Rules:
 * - Collapse whitespace between block-level tags only (not inside inline content).
 *   `Hello <strong>world</strong>` preserves the space before `<strong>`.
 * - Collapse runs of 2+ whitespace in *text nodes only* (between `>` and `<`).
 *   Tag attribute values such as `alt="hello   world"` are never touched.
 * - Trim leading/trailing whitespace.
 * - `<style>` and `<pre>` blocks are passed through unchanged.
 *
 * This is a pure whitespace transformation — it does NOT change any HTML
 * semantics, CSS values, or rendered output. It only reduces file size.
 *
 * @param html - The HTML to minify.
 * @returns Minified HTML.
 */
function minifyHTML(html: string): string {
  const parts = splitAroundPreserved(html);

  const processed = parts.map((part: HTMLSegment): string => {
    if (part.isPreserved) {
      return part.content;
    }

    // Step 1: remove whitespace-only gaps between known block-level tags.
    let result = part.content.replace(/>(\s+)</g, (_match: string, _space: string, offset: number, str: string) => {
      const afterIdx = offset + _match.length - 1;
      const nextTag = str.slice(afterIdx + 1, afterIdx + 20).match(/^([a-zA-Z][a-zA-Z0-9]*|\/[a-zA-Z][a-zA-Z0-9]*|!--|\[if)/);
      if (!nextTag) {
        return _match;
      }
      const tagName = nextTag[1]?.replace('/', '').toLowerCase() ?? '';
      const isBlock = BLOCK_TAGS.has(tagName) || tagName === '' || tagName.startsWith('!') || tagName.startsWith('[');
      return isBlock ? '><' : _match;
    });

    // Step 2: collapse 2+ whitespace runs in text nodes only (not in attributes).
    result = result.replace(/>([^<]*)</g, (_m: string, textNode: string) => {
      return `>${textNode.replace(/\s{2,}/g, ' ')}<`;
    });

    return result;
  });

  return processed.join('').trim();
}
