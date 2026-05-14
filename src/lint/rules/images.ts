/**
 * Email HTML lint rules — Image rules.
 *
 * Checks that images have alt, display:block, border:0, and width.
 *
 * @module lint/rules/images
 */

import type { LintRule, LintIssue } from '../types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Regex that matches `<img ...>` or `<img ... />` tags. */
const IMG_TAG_RE = /<img\b([^>]*)\/?\s*>/gi;

/**
 * Checks whether an attribute exists on a tag string.
 *
 * @param tagAttrs - The attribute portion of the tag.
 * @param attr     - Attribute name.
 * @returns `true` if the attribute is present.
 */
function hasAttribute(tagAttrs: string, attr: string): boolean {
  // Match attr="..." or attr='...' or just attr (boolean)
  const re = new RegExp(`\\b${attr}\\s*=`, 'i');
  return re.test(tagAttrs);
}

/**
 * Extracts inline style value from tag attributes.
 *
 * @param tagAttrs - The attribute portion of the tag.
 * @returns The style string, or empty string if not found.
 */
function getStyle(tagAttrs: string): string {
  const match = /style\s*=\s*"([^"]*)"/i.exec(tagAttrs);
  return match?.[1] ?? '';
}

/**
 * Finds the 1-based line number of a match offset.
 *
 * @param html   - The full HTML.
 * @param offset - Character offset.
 * @returns 1-based line number.
 */
function lineAt(html: string, offset: number): number {
  return html.slice(0, offset).split('\n').length;
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

/** All `<img>` must have an `alt` attribute. */
export const imgHasAlt: LintRule = {
  id: 'img-has-alt',
  description: 'All <img> must have an alt attribute',
  severity: 'error',
  category: 'images',
  check(html: string): LintIssue[] {
    const issues: LintIssue[] = [];
    const re = new RegExp(IMG_TAG_RE.source, IMG_TAG_RE.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(html)) !== null) {
      const attrs = match[1] ?? '';
      if (!hasAttribute(attrs, 'alt')) {
        issues.push({
          ruleId: 'img-has-alt',
          message: '<img> is missing alt attribute. Always provide alt text for accessibility, or alt="" for decorative images.',
          severity: 'error',
          line: lineAt(html, match.index),
        });
      }
    }
    return issues;
  },
};

/** Images must have `display:block` in inline styles. */
export const imgHasDisplayBlock: LintRule = {
  id: 'img-has-display-block',
  description: 'Images must have display:block in inline styles',
  severity: 'warning',
  category: 'images',
  check(html: string): LintIssue[] {
    const issues: LintIssue[] = [];
    const re = new RegExp(IMG_TAG_RE.source, IMG_TAG_RE.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(html)) !== null) {
      const attrs = match[1] ?? '';
      const style = getStyle(attrs);
      if (!/display\s*:\s*block/i.test(style)) {
        issues.push({
          ruleId: 'img-has-display-block',
          message: '<img> is missing display:block. Without it, some email clients add extra space below images.',
          severity: 'warning',
          line: lineAt(html, match.index),
        });
      }
    }
    return issues;
  },
};

/** Images must have `border:0` (in style or attribute). */
export const imgHasBorderZero: LintRule = {
  id: 'img-has-border-zero',
  description: 'Images must have border:0',
  severity: 'warning',
  category: 'images',
  check(html: string): LintIssue[] {
    const issues: LintIssue[] = [];
    const re = new RegExp(IMG_TAG_RE.source, IMG_TAG_RE.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(html)) !== null) {
      const attrs = match[1] ?? '';
      const style = getStyle(attrs);
      const hasBorderStyle = /border\s*:\s*0/i.test(style) || /border-width\s*:\s*0/i.test(style);
      const hasBorderAttr = /\bborder\s*=\s*"0"/i.test(attrs);
      if (!hasBorderStyle && !hasBorderAttr) {
        issues.push({
          ruleId: 'img-has-border-zero',
          message: '<img> is missing border:0. Linked images may show a blue border in some clients.',
          severity: 'warning',
          line: lineAt(html, match.index),
        });
      }
    }
    return issues;
  },
};

/** Images must have a `width` HTML attribute. */
export const imgHasWidth: LintRule = {
  id: 'img-has-width',
  description: 'Images must have a width HTML attribute',
  severity: 'warning',
  category: 'images',
  check(html: string): LintIssue[] {
    const issues: LintIssue[] = [];
    const re = new RegExp(IMG_TAG_RE.source, IMG_TAG_RE.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(html)) !== null) {
      const attrs = match[1] ?? '';
      if (!hasAttribute(attrs, 'width')) {
        issues.push({
          ruleId: 'img-has-width',
          message: '<img> is missing width attribute. Without it, images may not render correctly in Outlook.',
          severity: 'warning',
          line: lineAt(html, match.index),
        });
      }
    }
    return issues;
  },
};

/** All image rules. */
export const IMAGE_RULES: LintRule[] = [
  imgHasAlt,
  imgHasDisplayBlock,
  imgHasBorderZero,
  imgHasWidth,
];
