/**
 * Email HTML linter — entry point.
 *
 * Runs all lint rules against compiled email HTML and returns
 * a list of issues. Rules check for email best practices:
 * structure, tables, images, styles, Outlook compatibility,
 * responsiveness, and content safety.
 *
 * @module lint
 */

import type { LintRule, LintIssue, LintOptions, LintRuleId } from './types.js';
import {
  STRUCTURE_RULES,
  TABLE_RULES,
  IMAGE_RULES,
  STYLE_RULES,
  OUTLOOK_RULES,
  RESPONSIVENESS_RULES,
  CONTENT_RULES,
  HERO_RULES,
} from './rules/index.js';

// Re-exports
export type { LintIssue, LintOptions, LintRuleId, LintRule, LintSeverity, LintCategory } from './types.js';

// ---------------------------------------------------------------------------
// Rule registry
// ---------------------------------------------------------------------------

/** All available lint rules. */
const ALL_RULES: LintRule[] = [
  ...STRUCTURE_RULES,
  ...TABLE_RULES,
  ...IMAGE_RULES,
  ...STYLE_RULES,
  ...OUTLOOK_RULES,
  ...RESPONSIVENESS_RULES,
  ...CONTENT_RULES,
  ...HERO_RULES,
];

/**
 * Rules that only apply when accessibility is explicitly enabled.
 * These are skipped by default.
 */
const ACCESSIBILITY_ONLY_RULES = new Set<LintRuleId>([
  'table-has-role',
]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Lints compiled email HTML against email best-practice rules.
 *
 * Runs all rules by default. Accessibility-only rules (like `table-has-role`)
 * are skipped unless `options.accessibilityEnabled` is `true`.
 * Specific rules can be disabled via `options.disable`.
 *
 * @param html    - The compiled email HTML string.
 * @param options - Optional linting configuration.
 * @returns Array of lint issues found. Empty array means clean HTML.
 */
export function lintEmailHtml(
  html: string,
  options: LintOptions = {},
): LintIssue[] {
  const disabled = new Set(options.disable ?? []);
  const a11yEnabled = options.accessibilityEnabled ?? false;

  const issues: LintIssue[] = [];

  for (const rule of ALL_RULES) {
    // Skip disabled rules
    if (disabled.has(rule.id)) continue;

    // Skip a11y-only rules unless a11y is enabled
    if (ACCESSIBILITY_ONLY_RULES.has(rule.id) && !a11yEnabled) continue;

    const ruleIssues = rule.check(html);
    issues.push(...ruleIssues);
  }

  return issues;
}

/**
 * Returns the list of all available lint rule IDs.
 *
 * @returns Array of all lint rule identifiers.
 */
export function getLintRuleIds(): LintRuleId[] {
  return ALL_RULES.map((r) => r.id);
}

/**
 * Returns a specific lint rule by ID.
 *
 * @param id - The lint rule ID.
 * @returns The lint rule, or `undefined` if not found.
 */
export function getLintRule(id: LintRuleId): LintRule | undefined {
  return ALL_RULES.find((r) => r.id === id);
}
