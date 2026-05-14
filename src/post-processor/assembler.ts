/**
 * Post-processor assembler — injects responsive media queries into the document head.
 *
 * After `compileNode()` generates the full HTML document from the `mc` root,
 * the assembler injects `@media` rules from collected `sm:` classes into `<head>`.
 *
 * ENHANCE CSS is now inlined directly (not via a style block), so this module
 * only handles responsive media queries.
 *
 * Uses string manipulation (no DOM parser) since the document structure
 * is controlled by our own body compiler with known marker positions.
 *
 * @module post-processor/assembler
 */

import type { CompileContext } from '../types.js';
import { processResponsiveClasses } from '../css/media-queries.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Marker where the assembler injects additional `<style>` blocks. */
const HEAD_CLOSE_TAG = '</head>';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Assembles the final HTML by injecting responsive media queries into the head.
 *
 * @param html    - The raw HTML from `compileNode()`.
 * @param context - Compile context with collected responsiveClasses.
 * @returns The assembled HTML with injected media queries.
 */
export function assemble(html: string, context: CompileContext): string {
  const mediaResult = buildResponsiveBlock(context);

  // Push responsive warnings
  context.warnings.push(...mediaResult.warnings);

  if (!mediaResult.block) {
    return html;
  }

  return injectBeforeHeadClose(html, `<style>${mediaResult.block}</style>`);
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

/**
 * Builds the responsive `@media` block from collected sm: classes.
 *
 * @param context - Compile context with responsiveClasses and config.
 * @returns The media block string and any warnings.
 */
function buildResponsiveBlock(
  context: CompileContext,
): { block: string; warnings: CompileContext['warnings'] } {
  if (context.responsiveClasses.length === 0) {
    return { block: '', warnings: [] };
  }

  // Deduplicate responsive classes
  const unique = [...new Set(context.responsiveClasses)];
  const breakpoint = context.config.responsive.breakpoint;

  const result = processResponsiveClasses(unique, context.theme, breakpoint, context.classificationMap);

  return {
    block: result.mediaBlock,
    warnings: result.warnings,
  };
}

// ---------------------------------------------------------------------------
// Injection
// ---------------------------------------------------------------------------

/**
 * Injects a string before the `</head>` tag in the HTML.
 *
 * @param html      - The full HTML document.
 * @param injection - The string to inject.
 * @returns The HTML with injection placed before `</head>`.
 */
function injectBeforeHeadClose(html: string, injection: string): string {
  const idx = html.indexOf(HEAD_CLOSE_TAG);
  if (idx === -1) {
    // No </head> found — append rather than prepend before <!DOCTYPE>.
    // Appending after </html> is non-standard but keeps DOCTYPE intact and
    // ensures the injected CSS/style block is still present in the document.
    // This path cannot be reached by our compiler.
    return html + injection;
  }
  return html.slice(0, idx) + injection + html.slice(idx);
}
