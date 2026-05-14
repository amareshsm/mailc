/**
 * Email HTML lint rules — Table rules.
 *
 * Checks that layout tables have role="presentation", cellpadding="0",
 * cellspacing="0", and border="0".
 *
 * @module lint/rules/tables
 */

import type { LintRule, LintIssue } from '../types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Regex that matches `<table ...>` opening tags (non-greedy). */
const TABLE_TAG_RE = /<table\b([^>]*)>/gi;

/**
 * Checks whether an attribute with the given value exists on a tag string.
 *
 * @param tagAttrs - The attribute portion of the tag (between `<table` and `>`).
 * @param attr     - Attribute name.
 * @param value    - Expected value.
 * @returns `true` if the attribute is present with the given value.
 */
function hasAttr(tagAttrs: string, attr: string, value: string): boolean {
  const re = new RegExp(`${attr}\\s*=\\s*"${value}"`, 'i');
  return re.test(tagAttrs);
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

/**
 * Layout tables must have `role="presentation"`.
 * Only active when accessibility is enabled (handled at lint runner level).
 */
export const tableHasRole: LintRule = {
  id: 'table-has-role',
  description: 'Layout tables must have role="presentation"',
  severity: 'warning',
  category: 'tables',
  check(html: string): LintIssue[] {
    const issues: LintIssue[] = [];
    const re = new RegExp(TABLE_TAG_RE.source, TABLE_TAG_RE.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(html)) !== null) {
      const attrs = match[1] ?? '';
      if (!hasAttr(attrs, 'role', 'presentation')) {
        issues.push({
          ruleId: 'table-has-role',
          message: 'Layout table is missing role="presentation". Screen readers may announce it as a data table.',
          severity: 'warning',
          line: lineAt(html, match.index),
        });
      }
    }
    return issues;
  },
};

/** Tables must have `cellpadding="0"`. */
export const tableHasCellpadding: LintRule = {
  id: 'table-has-cellpadding',
  description: 'Tables must have cellpadding="0"',
  severity: 'error',
  category: 'tables',
  check(html: string): LintIssue[] {
    const issues: LintIssue[] = [];
    const re = new RegExp(TABLE_TAG_RE.source, TABLE_TAG_RE.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(html)) !== null) {
      const attrs = match[1] ?? '';
      if (!hasAttr(attrs, 'cellpadding', '0')) {
        issues.push({
          ruleId: 'table-has-cellpadding',
          message: 'Table is missing cellpadding="0". Some email clients add default cell padding.',
          severity: 'error',
          line: lineAt(html, match.index),
        });
      }
    }
    return issues;
  },
};

/** Tables must have `cellspacing="0"`. */
export const tableHasCellspacing: LintRule = {
  id: 'table-has-cellspacing',
  description: 'Tables must have cellspacing="0"',
  severity: 'error',
  category: 'tables',
  check(html: string): LintIssue[] {
    const issues: LintIssue[] = [];
    const re = new RegExp(TABLE_TAG_RE.source, TABLE_TAG_RE.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(html)) !== null) {
      const attrs = match[1] ?? '';
      if (!hasAttr(attrs, 'cellspacing', '0')) {
        issues.push({
          ruleId: 'table-has-cellspacing',
          message: 'Table is missing cellspacing="0". Some email clients add default cell spacing.',
          severity: 'error',
          line: lineAt(html, match.index),
        });
      }
    }
    return issues;
  },
};

/** Tables must have `border="0"`. */
export const tableHasBorder: LintRule = {
  id: 'table-has-border',
  description: 'Tables must have border="0"',
  severity: 'error',
  category: 'tables',
  check(html: string): LintIssue[] {
    const issues: LintIssue[] = [];
    const re = new RegExp(TABLE_TAG_RE.source, TABLE_TAG_RE.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(html)) !== null) {
      const attrs = match[1] ?? '';
      if (!hasAttr(attrs, 'border', '0')) {
        issues.push({
          ruleId: 'table-has-border',
          message: 'Table is missing border="0". Some email clients render default table borders.',
          severity: 'error',
          line: lineAt(html, match.index),
        });
      }
    }
    return issues;
  },
};

/** All table rules. */
export const TABLE_RULES: LintRule[] = [
  tableHasRole,
  tableHasCellpadding,
  tableHasCellspacing,
  tableHasBorder,
];
