/**
 * MCError — the structured error class for the entire mailc compiler.
 *
 * Every error in the pipeline uses this class, never raw `Error`.
 * Carries a machine-readable code, human-readable message, source location,
 * severity, and optional fix suggestion.
 */

import type { Severity, SourceLocation } from '../types.js';
import type { ErrorCode } from './codes.js';

/** Options for constructing an MCError. */
export interface MCErrorOptions {
  /** Machine-readable error code from the ErrorCode enum. */
  code: ErrorCode;
  /** Human-readable error message. */
  message: string;
  /** Source location where the error occurred. */
  loc?: SourceLocation;
  /** Severity: error, warning, or info. */
  severity: Severity;
  /** Suggested fix for the user. */
  fix?: string;
}

/**
 * Structured error used throughout the mailc compiler pipeline.
 *
 * @example
 * ```ts
 * throw new MCError({
 *   code: ErrorCode.INVALID_NESTING,
 *   message: '<mc-text> must be inside <mc-column>',
 *   loc: node.loc,
 *   severity: 'error',
 *   fix: 'Wrap it: <mc-column><mc-text>...</mc-text></mc-column>',
 * });
 * ```
 */
export class MCError extends Error {
  /** Machine-readable error code. */
  readonly code: ErrorCode;
  /** Severity level. */
  readonly severity: Severity;
  /** Source location (if available). */
  readonly loc?: SourceLocation;
  /** Suggested fix (if available). */
  readonly fix?: string;

  constructor(options: MCErrorOptions) {
    const locStr = options.loc
      ? ` at ${options.loc.start.line}:${options.loc.start.col}`
      : '';

    super(`${options.code}${locStr}: ${options.message}`);

    this.name = 'MCError';
    this.code = options.code;
    this.severity = options.severity;
    this.loc = options.loc;
    this.fix = options.fix;
  }

  /**
   * Converts this error to an MCIssue object for inclusion in CompileResult.
   *
   * @param file - Optional filename to attach to the issue location.
   * @returns An MCIssue representation of this error.
   */
  toIssue(file?: string): {
    code: string;
    message: string;
    severity: Severity;
    loc?: { line: number; col: number; file?: string };
    fix?: string;
  } {
    return {
      code: this.code,
      message: this.message,
      severity: this.severity,
      loc: this.loc
        ? {
            line: this.loc.start.line,
            col: this.loc.start.col,
            ...(file ? { file } : {}),
          }
        : undefined,
      fix: this.fix,
    };
  }
}
