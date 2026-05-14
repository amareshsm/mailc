/**
 * Email HTML lint rules — Content rules.
 *
 * Checks for empty links and javascript: href patterns.
 *
 * @module lint/rules/content
 */

import type { LintRule, LintIssue } from '../types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Regex to match `<a ...>` opening tags. */
const ANCHOR_TAG_RE = /<a\b([^>]*)>/gi;

/**
 * Finds the 1-based line number at an offset.
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

/** `<a>` tags must have a non-empty `href`. */
export const noEmptyLinks: LintRule = {
  id: 'no-empty-links',
  description: '<a> tags must have href',
  severity: 'warning',
  category: 'content',
  check(html: string): LintIssue[] {
    const issues: LintIssue[] = [];
    const re = new RegExp(ANCHOR_TAG_RE.source, ANCHOR_TAG_RE.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(html)) !== null) {
      const attrs = match[1] ?? '';
      const hrefMatch = /href\s*=\s*"([^"]*)"/i.exec(attrs);
      if (!hrefMatch || hrefMatch[1] === '') {
        issues.push({
          ruleId: 'no-empty-links',
          message: '<a> tag has an empty or missing href. Links without destinations may confuse screen readers.',
          severity: 'warning',
          line: lineAt(html, match.index),
        });
      }
    }
    return issues;
  },
};

/** No `javascript:` in href attributes. */
export const noJavascriptHref: LintRule = {
  id: 'no-javascript-href',
  description: 'No javascript: in href',
  severity: 'error',
  category: 'content',
  check(html: string): LintIssue[] {
    const issues: LintIssue[] = [];
    const re = /href\s*=\s*"javascript:/gi;
    let match: RegExpExecArray | null;
    while ((match = re.exec(html)) !== null) {
      issues.push({
        ruleId: 'no-javascript-href',
        message: 'href contains "javascript:". JavaScript is not supported in email clients and poses security risks.',
        severity: 'error',
        line: lineAt(html, match.index),
      });
    }
    return issues;
  },
};

/** All content rules. */
export const CONTENT_RULES: LintRule[] = [
  noEmptyLinks,
  noJavascriptHref,
];
