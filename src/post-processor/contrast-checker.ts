/**
 * Color contrast checker for compiled email HTML.
 *
 * Scans compiled HTML for elements with explicit foreground `color` and
 * background-color in their inline styles. When both are opaque and
 * parseable, checks WCAG 2.1 contrast ratio and emits a two-tier signal:
 *
 * - **warning** — ratio < 3:1. Fails WCAG AA even for large text (18pt+ / 14pt+ bold).
 *   Genuinely inaccessible; almost never intentional.
 * - **info** — ratio 3:1–4.5:1. Passes WCAG AA Large but fails AA for normal text.
 *   May be acceptable for large/bold text; worth reviewing.
 *
 * **High-confidence only** — bails out when:
 * - Background color is `transparent`, `inherit`, `currentColor`, or a CSS variable.
 * - Background uses `background-image` (gradient or url).
 * - No explicit background is found in the ancestor chain.
 * - The element is invisible (`display:none`, `visibility:hidden`, `opacity:0`, `max-height:0`).
 *
 * Outlook VML conditionals (`<!--[if mso]>...<![endif]-->`) are stripped before
 * parsing because VML uses `fillcolor` (not CSS `background-color`), making
 * contrast checking inside them structurally impossible.
 *
 * This ensures zero false positives at the cost of some false negatives.
 *
 * @module post-processor/contrast-checker
 */

import type { MCIssue } from '../types.js';
import { ErrorCode } from '../errors/codes.js';
import { parseColor, checkContrast } from '../utils/color.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** WCAG AA minimum contrast ratio for normal text (18px or smaller). */
const WCAG_AA_RATIO = 4.5;

/** WCAG AA minimum contrast ratio for large text (18pt+ / 14pt+ bold). Below this is inaccessible regardless of size. */
const WCAG_AA_LARGE_RATIO = 3.0;

/** HTML void elements (self-closing, no children). */
const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A parsed HTML element with its style and parent reference. */
interface ParsedElement {
  /** Element tag name (lowercase). */
  tag: string;
  /** Raw inline style string. */
  style: string;
  /** Index of the parent element in the flat list (-1 for root). */
  parentIndex: number;
  /** Approximate line number in the HTML (for reporting). */
  line: number;
}

// ---------------------------------------------------------------------------
// Regexes
// ---------------------------------------------------------------------------

/** Extracts inline style attribute value. */
const STYLE_RE = /style\s*=\s*"([^"]*)"/i;

/** Extracts foreground color from inline style. */
const COLOR_RE = /(?:^|;)\s*color\s*:\s*([^;]+)/i;

/** Extracts background-color from inline style. */
const BG_COLOR_RE = /background-color\s*:\s*([^;]+)/i;

/** Detects background-image usage. */
const BG_IMAGE_RE = /background(?:-image)?\s*:\s*(?:url|linear-gradient|radial-gradient)/i;

/**
 * Detects visually hidden elements — contrast is irrelevant for invisible content.
 * Covers: display:none, visibility:hidden, opacity:0, max-height:0(px).
 */
const INVISIBLE_RE = /(?:display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0(?:[^.\d]|$)|max-height\s*:\s*0px)/i;

/** Strips Outlook MSO conditional comment blocks (VML). */
function stripMsoConditionals(html: string): string {
  return html.replace(/<!--\[if mso\b[^\]]*\]>[\s\S]*?<!\[endif\]-->/gi, '');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Checks compiled HTML for low color contrast.
 *
 * Scans for elements with explicit `color` and looks up the ancestor
 * chain for the nearest explicit `background-color`. When both are opaque
 * and the ratio is below WCAG AA (4.5:1), emits a two-tier issue:
 * - warning: ratio < 3:1 (fails even WCAG AA Large — genuinely inaccessible)
 * - info:    ratio 3:1–4.5:1 (fails AA for normal text, fine for large text)
 *
 * @param html - The compiled email HTML string.
 * @returns Array of contrast issues (warning or info severity).
 */
export function checkColorContrast(html: string): MCIssue[] {
  const issues: MCIssue[] = [];
  // Strip Outlook VML blocks before parsing: VML uses fillcolor (not CSS
  // background-color), so contrast inside <!--[if mso]>...<![endif]--> is
  // structurally undetectable and would produce false positives.
  const elements = buildElementList(stripMsoConditionals(html));

  for (const elem of elements) {
    // Only check elements with explicit foreground color
    const fgMatch = COLOR_RE.exec(elem.style);
    if (!fgMatch) {
      continue;
    }

    // Skip invisible elements — display:none, visibility:hidden, opacity:0, etc.
    // Contrast is meaningless for content the user cannot see.
    if (INVISIBLE_RE.test(elem.style)) {
      continue;
    }

    const fgColorStr = (fgMatch[1] as string).trim();
    const fgRGB = parseColor(fgColorStr);
    if (!fgRGB) {
      // Unparseable or non-opaque foreground — skip
      continue;
    }

    // Walk ancestors to find nearest explicit background-color
    const bgResult = findNearestBackground(elem, elements);
    if (!bgResult) {
      // No explicit background found — bail (zero false positives)
      continue;
    }

    const result = checkContrast(fgRGB, bgResult.color);
    if (result.ratio < WCAG_AA_LARGE_RATIO) {
      issues.push({
        code: ErrorCode.LOW_CONTRAST,
        message:
          `Very low color contrast: ${fgColorStr} on ${bgResult.raw} ` +
          `(ratio ${result.ratio}:1, fails WCAG AA even for large text — needs ${WCAG_AA_LARGE_RATIO}:1).`,
        severity: 'warning',
        loc: { line: elem.line, col: 1 },
        fix: 'Use colors with a contrast ratio of at least 4.5:1 for normal text (3:1 minimum for large text).',
      });
    } else if (!result.meetsAA) {
      issues.push({
        code: ErrorCode.LOW_CONTRAST,
        message:
          `Low color contrast: ${fgColorStr} on ${bgResult.raw} ` +
          `(ratio ${result.ratio}:1, fails WCAG AA for normal text — needs ${WCAG_AA_RATIO}:1).`,
        severity: 'info',
        loc: { line: elem.line, col: 1 },
        fix: 'Use colors with a contrast ratio of at least 4.5:1 for normal text (acceptable for large/bold text at 3:1+).',
      });
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Element parser
// ---------------------------------------------------------------------------

/**
 * Builds a flat list of parsed elements from HTML with parent references.
 *
 * Uses regex-based tag matching (sufficient for compiler-generated HTML
 * which is well-formed). Each element knows its parent index in the list,
 * enabling ancestor chain traversal for background color lookup.
 *
 * @param html - The HTML string.
 * @returns Flat array of parsed elements.
 */
function buildElementList(html: string): ParsedElement[] {
  const elements: ParsedElement[] = [];

  // Stack tracks the index of the current parent element
  const parentStack: number[] = [-1];

  // We need to process tags in order, so use a single regex scan
  const combinedRe = /<(\/?)([\w-]+)([^>]*)>/g;
  let match;
  let line = 1;

  // Track line numbers
  let lastIndex = 0;

  while ((match = combinedRe.exec(html)) !== null) {
    // Count newlines between lastIndex and current match
    const slice = html.slice(lastIndex, match.index);
    for (const ch of slice) {
      if (ch === '\n') {
        line++;
      }
    }
    lastIndex = match.index;

    const isClosing = match[1] === '/';
    const tag = (match[2] as string).toLowerCase();
    const attrs = match[3] as string;

    if (isClosing) {
      // Pop the parent stack
      if (parentStack.length > 1) {
        parentStack.pop();
      }
      continue;
    }

    // Opening tag
    const styleMatch = STYLE_RE.exec(attrs);
    const style = styleMatch ? (styleMatch[1] as string) : '';

    const parentIndex = parentStack[parentStack.length - 1] as number;
    const elemIndex = elements.length;

    elements.push({ tag, style, parentIndex, line });

    // If not a void/self-closing tag, push onto parent stack
    const isSelfClosing = attrs.trimEnd().endsWith('/') || VOID_TAGS.has(tag);
    if (!isSelfClosing) {
      parentStack.push(elemIndex);
    }
  }

  return elements;
}

// ---------------------------------------------------------------------------
// Background finder
// ---------------------------------------------------------------------------

/** Result of finding a background color in the ancestor chain. */
interface BackgroundResult {
  /** The parsed RGB color. */
  color: import('../utils/color.js').RGB;
  /** The raw CSS color string (for error messages). */
  raw: string;
}

/**
 * Walks the ancestor chain to find the nearest explicit background-color.
 *
 * Bails out (returns null) if any ancestor has:
 * - `background-image` (can't determine effective background)
 * - A non-opaque background-color (transparent, rgba, inherit, etc.)
 *
 * @param elem     - The element to find background for.
 * @param elements - The flat element list.
 * @returns The background color, or null if not determinable.
 */
function findNearestBackground(
  elem: ParsedElement,
  elements: ParsedElement[],
): BackgroundResult | null {
  // Check the element itself first, then walk up
  let currentIndex: number = elements.indexOf(elem);

  while (currentIndex >= 0) {
    const current = elements[currentIndex] as ParsedElement;

    // If any ancestor has background-image, bail
    if (BG_IMAGE_RE.test(current.style)) {
      return null;
    }

    const bgMatch = BG_COLOR_RE.exec(current.style);
    if (bgMatch) {
      const bgRaw = (bgMatch[1] as string).trim();
      const bgRGB = parseColor(bgRaw);

      if (bgRGB) {
        // Found an opaque background — this is our answer
        return { color: bgRGB, raw: bgRaw };
      }

      // Non-opaque background (transparent, rgba, etc.) — bail
      return null;
    }

    // Move to parent
    currentIndex = current.parentIndex;
  }

  // No explicit background found anywhere in the chain — bail
  return null;
}
