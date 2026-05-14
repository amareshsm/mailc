/**
 * Lint system types.
 *
 * Defines the shape of lint rules, issues, and options
 * used by the email HTML linter.
 *
 * @module lint/types
 */

// ---------------------------------------------------------------------------
// Rule IDs
// ---------------------------------------------------------------------------

/**
 * All lint rule identifiers.
 *
 * Grouped by category: structure, tables, images, styles, outlook,
 * responsiveness, and content.
 */
export type LintRuleId =
  // Structure
  | 'has-doctype'
  | 'has-xmlns'
  | 'has-meta-charset'
  | 'has-meta-viewport'
  | 'has-title'
  | 'no-script'
  | 'no-external-css'
  // Tables
  | 'table-has-role'
  | 'table-has-cellpadding'
  | 'table-has-cellspacing'
  | 'table-has-border'
  // Images
  | 'img-has-alt'
  | 'img-has-display-block'
  | 'img-has-border-zero'
  | 'img-has-width'
  // Styles
  | 'no-shorthand-in-inline'
  | 'styles-are-inlined'
  | 'no-relative-units'
  // Outlook
  | 'has-mso-conditionals'
  | 'mso-has-xml-namespace'
  // Responsiveness
  | 'has-media-queries'
  | 'max-width-set'
  // Content
  | 'no-empty-links'
  | 'no-javascript-href'
  // Hero
  | 'hero-has-fallback-color'
  | 'hero-image-is-https';

// ---------------------------------------------------------------------------
// Severity
// ---------------------------------------------------------------------------

/** Severity of a lint issue. */
export type LintSeverity = 'error' | 'warning' | 'info';

// ---------------------------------------------------------------------------
// Issue
// ---------------------------------------------------------------------------

/** A single issue found by the linter. */
export interface LintIssue {
  /** The rule that triggered this issue. */
  ruleId: LintRuleId;
  /** Human-readable description of the problem. */
  message: string;
  /** Issue severity. */
  severity: LintSeverity;
  /** Optional line number (1-based) where the issue was found. */
  line?: number;
}

// ---------------------------------------------------------------------------
// Rule definition
// ---------------------------------------------------------------------------

/** A single lint rule: checks HTML and returns issues. */
export interface LintRule {
  /** Unique identifier for this rule. */
  id: LintRuleId;
  /** Short description of what this rule checks. */
  description: string;
  /** Default severity. */
  severity: LintSeverity;
  /** Rule category for grouping. */
  category: LintCategory;
  /**
   * Run the rule against compiled HTML.
   *
   * @param html - The compiled email HTML string.
   * @returns Array of issues (empty if the rule passes).
   */
  check(html: string): LintIssue[];
}

/** Lint rule category for grouping and filtering. */
export type LintCategory =
  | 'structure'
  | 'tables'
  | 'images'
  | 'styles'
  | 'outlook'
  | 'responsiveness'
  | 'content';

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

/** Options for the linter. */
export interface LintOptions {
  /**
   * Rule IDs to skip.
   * For example, `['table-has-role']` to disable the table role check.
   */
  disable?: LintRuleId[];
  /**
   * Whether accessibility-only rules (like `table-has-role`) are enabled.
   * Defaults to `false`.
   */
  accessibilityEnabled?: boolean;
}
