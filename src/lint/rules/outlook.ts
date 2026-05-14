/**
 * Email HTML lint rules — Outlook rules.
 *
 * Checks for MSO conditional comments and VML XML namespace.
 *
 * @module lint/rules/outlook
 */

import type { LintRule, LintIssue } from '../types.js';

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

/** Must have `<!--[if mso]>` conditional structure for Outlook rendering. */
export const hasMsoConditionals: LintRule = {
  id: 'has-mso-conditionals',
  description: 'Must have <!--[if mso]> conditional structure',
  severity: 'warning',
  category: 'outlook',
  check(html: string): LintIssue[] {
    if (/<!--\[if\s+mso\]>/i.test(html)) return [];
    return [{
      ruleId: 'has-mso-conditionals',
      message: 'Missing Outlook conditional comments (<!--[if mso]>). Email may not render correctly in Outlook desktop clients.',
      severity: 'warning',
    }];
  },
};

/** Outlook VML requires `xmlns:v` namespace on `<html>`. */
export const msoHasXmlNamespace: LintRule = {
  id: 'mso-has-xml-namespace',
  description: 'Outlook VML requires xmlns:v namespace on <html>',
  severity: 'warning',
  category: 'outlook',
  check(html: string): LintIssue[] {
    // If there are no MSO conditionals, this rule doesn't apply
    if (!/<!--\[if\s+mso\]>/i.test(html)) return [];

    if (/xmlns:v\s*=\s*"urn:schemas-microsoft-com:vml"/i.test(html)) return [];

    const idx = html.search(/<html/i);
    const line = idx >= 0 ? html.slice(0, idx).split('\n').length : undefined;
    return [{
      ruleId: 'mso-has-xml-namespace',
      message: '<html> is missing xmlns:v="urn:schemas-microsoft-com:vml". VML buttons and shapes will not render in Outlook.',
      severity: 'warning',
      line,
    }];
  },
};

/** All Outlook rules. */
export const OUTLOOK_RULES: LintRule[] = [
  hasMsoConditionals,
  msoHasXmlNamespace,
];
