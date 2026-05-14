/**
 * Accessibility post-processing for compiled email HTML.
 *
 * Splits transforms into two tiers:
 *
 * **Always-on** (run regardless of `accessibility.enabled`):
 * - Injects `<title>` into `<head>` (from mc-title). Document content.
 * - Adds `xml:lang` next to `lang` on `<html>`. Standard XHTML markup.
 * - Adds `xml:lang` on `<body>`. Required for Windows Outlook + Narrator,
 *   which ignores `lang` on `<html>` and only reads it from `<body>`.
 * - Emits MISSING_TITLE warning when title is empty.
 *
 * **Gated by `enabled`** (true a11y enhancements):
 * - Enhances the wrapper `<div role="article">` with `aria-label` and a
 *   font-size reset for Apple Mail / iOS.
 *
 * Title and xml:lang are document content / standard markup correctness,
 * not opt-in enhancements — a user who set `<mc-title>` expects it in
 * the output regardless of any flag.
 *
 * These transforms operate on the assembled HTML string (post-compilation)
 * rather than at the AST level, because they need to modify the final
 * document structure.
 *
 * @module post-processor/accessibility
 */

import type { MCIssue } from '../types.js';
import { ErrorCode } from '../errors/codes.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Options for accessibility post-processing. */
export interface A11yPostProcessOptions {
  /** Whether a11y transforms are enabled. */
  enabled: boolean;
  /** The email title (from mc-title). */
  title: string;
}

/** Result of accessibility post-processing. */
export interface A11yPostProcessResult {
  /** The transformed HTML. */
  html: string;
  /** Issues generated during post-processing. */
  issues: MCIssue[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Font-size reset for the wrapper div.
 *
 * Some email clients (Apple Mail, iOS) use a smaller default font-size
 * for `role="article"` elements. This resets it to a sensible default.
 * `max(16px, 1rem)` is supported in Apple Mail and modern clients;
 * the `16px` fallback covers Outlook and older clients.
 */
const WRAPPER_FONT_RESET = 'font-size:medium;font-size:max(16px,1rem);';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Applies accessibility post-processing to compiled email HTML.
 *
 * Always (regardless of `enabled`):
 * - Injects the `<title>` text into the existing empty `<title></title>`.
 * - Adds `xml:lang` alongside `lang` on `<html>`.
 * - Adds `xml:lang` on `<body>` (Windows Outlook + Narrator support).
 * - Emits a MISSING_TITLE warning when `title` is empty.
 *
 * When `enabled` is true (additionally):
 * - Adds `aria-label` and font-size reset to the wrapper `<div role="article">`.
 *
 * @param html    - The compiled email HTML.
 * @param options - A11y options (enabled, title).
 * @returns The transformed HTML and any issues.
 */
export function applyA11yPostProcessing(
  html: string,
  options: A11yPostProcessOptions,
): A11yPostProcessResult {
  const issues: MCIssue[] = [];
  let result = html;

  // Always-on: warn when title is missing
  if (!options.title) {
    issues.push({
      code: ErrorCode.MISSING_TITLE,
      message:
        'Email has no <mc-title>. Screen readers use <title> to announce the email. ' +
        'Add <mc-title>Your subject</mc-title> inside <mc-head>.',
      severity: 'warning',
      fix: 'Add <mc-title>Your email subject</mc-title> inside <mc-head>.',
    });
  }

  // ── Always-on transforms (document content + standard markup) ──────
  // These run regardless of `enabled` because they are not "a11y
  // enhancements" — they are document content the user explicitly set
  // (mc-title) or standard markup correctness (xml:lang mirrors the
  // existing lang attribute, and Windows Outlook + Narrator only reads
  // lang from <body xml:lang="...">).
  if (options.title) {
    result = injectTitle(result, options.title);
  }
  result = injectXmlLang(result);
  result = injectBodyXmlLang(result);

  // ── Gated transform: wrapper aria-label + font-size reset ─────────
  // The wrapper enhancement is the only true "a11y enhancement" in this
  // pipeline. It adds aria-label (screen-reader only) and a font-size
  // reset that Apple Mail / iOS need. Users who want the bare HTML can
  // opt out via accessibility.enabled = false.
  if (options.enabled) {
    result = enhanceWrapper(result, options.title);
  }

  return { html: result, issues };
}

// ---------------------------------------------------------------------------
// Transform helpers
// ---------------------------------------------------------------------------

/**
 * Replaces the empty `<title></title>` in `<head>` with the given title text.
 *
 * @param html  - The HTML string.
 * @param title - The title text to inject.
 * @returns The HTML with `<title>` populated.
 */
function injectTitle(html: string, title: string): string {
  return html.replace('<title></title>', `<title>${escapeHtmlText(title)}</title>`);
}

/**
 * Adds `xml:lang` attribute to the `<html>` element, mirroring the existing `lang` value.
 *
 * @param html - The HTML string.
 * @returns The HTML with `xml:lang` added (mirrors existing `lang` value).
 */
function injectXmlLang(html: string): string {
  return html.replace(
    /(<html\s[^>]*)(lang="([^"]*)")/,
    '$1$2 xml:lang="$3"',
  );
}

/**
 * Adds `xml:lang` attribute to the `<body>` element.
 *
 * Windows Outlook's Narrator screen reader **only** reads `xml:lang`
 * from the `<body>` element — it ignores `lang` on `<html>`.
 * This is the sole way to serve Windows Outlook + Narrator users.
 *
 * The lang value is extracted from the `<html lang="...">` attribute
 * already present in the compiled HTML, so it always matches `<html>`.
 *
 * @param html - The HTML string.
 * @returns The HTML with `xml:lang` added to `<body>`.
 */
function injectBodyXmlLang(html: string): string {
  // Extract the lang already set on <html lang="..."> (set by mc-body).
  const htmlLangMatch = /\bhtml[^>]*\blang="([^"]*)"/.exec(html);
  const lang = htmlLangMatch?.[1] ?? 'en';
  return html.replace(/<body(\s|>)/, `<body xml:lang="${lang}"$1`);
}

/**
 * Enhances the `<div role="article">` wrapper with aria-label and font-size reset.
 *
 * IMPORTANT: This function — and this entire post-processor — intentionally does NOT
 * modify `role` attributes on `<table>` elements. Data tables compiled from
 * `<mc-table>` carry `role="table"` (injected by the compiler) and must never be
 * changed to `role="presentation"`. Only the top-level article wrapper is touched here.
 *
 * @param html  - The HTML string.
 * @param title - The email title (used for aria-label).
 * @returns The HTML with the enhanced wrapper.
 */
function enhanceWrapper(html: string, title: string): string {
  // Match the wrapper div with role="article"
  const wrapperRe = /<div role="article" aria-roledescription="email" lang="([^"]*)" dir="([^"]*)">/;
  const match = wrapperRe.exec(html);

  if (!match) {
    return html;
  }

  const lang = match[1] as string;
  const dir = match[2] as string;

  // Build enhanced wrapper
  let enhanced = `<div role="article" aria-roledescription="email" lang="${lang}" dir="${dir}"`;

  if (title) {
    enhanced += ` aria-label="${escapeHtmlAttr(title)}"`;
  }

  enhanced += ` style="${WRAPPER_FONT_RESET}">`;

  return html.replace(match[0], enhanced);
}

// ---------------------------------------------------------------------------
// Escape helpers
// ---------------------------------------------------------------------------

/**
 * Escapes special characters for use in HTML text content.
 *
 * @param text - The text to escape.
 * @returns Escaped text.
 */
function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Escapes special characters for use in HTML attribute values.
 *
 * @param text - The text to escape.
 * @returns Escaped text.
 */
function escapeHtmlAttr(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
