/**
 * Template resolution shared types.
 *
 * Type definitions used across all template/ modules.
 *
 * @module template/types
 */

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

/** Template data — any JSON-serializable object. */
export type TemplateData = Record<string, unknown>;

/** A formatter function. Receives the resolved value and optional args. */
export type Formatter = (value: unknown, ...args: string[]) => string;

/** Map of named formatters. */
export type FormatterMap = Record<string, Formatter>;

// ---------------------------------------------------------------------------
// Expression parsing
// ---------------------------------------------------------------------------

/** A parsed template expression from `{{...}}` syntax. */
export interface ParsedExpression {
  /** The dot-path to resolve, e.g. `"customer.name"`. */
  path: string;
  /** Fallback value when the path resolves to null/undefined/empty. */
  fallback?: string;
  /** Ordered list of formatter calls to pipe the value through. */
  formatters: FormatterCall[];
}

/** A single formatter call parsed from pipe syntax. */
export interface FormatterCall {
  /** The formatter name, e.g. `"currency"` or `"upper"`. */
  name: string;
  /** Additional arguments, e.g. `["short"]` for `date "short"`. */
  args: string[];
}

// ---------------------------------------------------------------------------
// Missing-variable callback (for templateEngine.strictVariables)
// ---------------------------------------------------------------------------

/** Information about an unresolved template variable. */
export interface MissingVariable {
  /** The dot-path that failed to resolve, e.g. `"user.name"`. */
  path: string;
  /** The original expression text, e.g. `"user.name | upper"`. */
  expression: string;
  /** Source location where the expression appeared, when available. */
  loc?: import('../types.js').SourceLocation;
}

/** Callback invoked when a `{{var}}` resolves to undefined with no fallback. */
export type OnMissingVariable = (info: MissingVariable) => void;
