/**
 * Email HTML lint rules — Responsiveness rules.
 *
 * Checks for `@media` queries and `max-width` on the container.
 *
 * @module lint/rules/responsiveness
 */

import type { LintRule, LintIssue } from '../types.js';

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

/** Must have `@media` for responsive behaviour. */
export const hasMediaQueries: LintRule = {
  id: 'has-media-queries',
  description: 'Must have @media for responsive rendering',
  severity: 'info',
  category: 'responsiveness',
  check(html: string): LintIssue[] {
    if (/@media[\s(]/i.test(html)) return [];
    return [{
      ruleId: 'has-media-queries',
      message: 'No @media queries found. Email may not adapt to mobile screen widths.',
      severity: 'info',
    }];
  },
};

/** Container must have `max-width` for mobile rendering. */
export const maxWidthSet: LintRule = {
  id: 'max-width-set',
  description: 'Container must have max-width for mobile rendering',
  severity: 'warning',
  category: 'responsiveness',
  check(html: string): LintIssue[] {
    if (/max-width\s*:/i.test(html)) return [];
    return [{
      ruleId: 'max-width-set',
      message: 'No max-width found on any element. Email content may exceed mobile screen width.',
      severity: 'warning',
    }];
  },
};

/** All responsiveness rules. */
export const RESPONSIVENESS_RULES: LintRule[] = [
  hasMediaQueries,
  maxWidthSet,
];
