/**
 * Pretty console output helpers for the CLI.
 *
 * Provides colored, formatted output for compile results,
 * validation results, and progress messages.
 *
 * Node-only: uses ANSI codes. No external dependencies.
 *
 * @module cli/output
 */

import type { MCIssue, CompileResult } from '../types.js';
import { buildCodeFrame, DOCS_BASE_URL } from '../errors/formatter.js';

// ---------------------------------------------------------------------------
// ANSI color helpers
// ---------------------------------------------------------------------------

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';

/**
 * Formats a success message with a green checkmark.
 *
 * @param msg - The message to display.
 * @returns Formatted string like "✓ Compiled email.mc → dist/email.html (47ms)".
 */
export function success(msg: string): string {
  return `${GREEN}✓${RESET} ${msg}`;
}

/**
 * Formats a warning message with a yellow triangle.
 *
 * @param msg - The message to display.
 * @returns Formatted string like "⚠ 3 warnings".
 */
export function warn(msg: string): string {
  return `${YELLOW}⚠${RESET} ${msg}`;
}

/**
 * Formats an error message with a red cross.
 *
 * @param msg - The message to display.
 * @returns Formatted string like "✗ 2 errors".
 */
export function error(msg: string): string {
  return `${RED}✗${RESET} ${msg}`;
}

/**
 * Formats an info message with a cyan dot.
 *
 * @param msg - The message to display.
 * @returns Formatted string like "● Processing 3 files...".
 */
export function info(msg: string): string {
  return `${CYAN}●${RESET} ${msg}`;
}

// ---------------------------------------------------------------------------
// Issue formatting
// ---------------------------------------------------------------------------

/**
 * Formats a single MCIssue for console output.
 *
 * @param issue - The issue to format.
 * @returns Formatted issue string with severity, location, and message.
 */
export function formatIssue(issue: MCIssue): string {
  const sev = issue.severity === 'error'
    ? `${RED}${BOLD}ERROR${RESET}`
    : issue.severity === 'warning'
      ? `${YELLOW}WARN${RESET}`
      : `${CYAN}INFO${RESET}`;

  const code = issue.code ? `${DIM}[${issue.code}]${RESET}` : '';
  const loc = issue.loc
    ? `${DIM}${issue.loc.file ? issue.loc.file + ':' : ''}${issue.loc.line}:${issue.loc.col}${RESET} `
    : '';

  let output = `  ${sev} ${code} ${loc}${issue.message}`;

  if (issue.fix) {
    output += `\n        ${DIM}Fix: ${issue.fix}${RESET}`;
  }

  return output;
}

/**
 * Formats a single MCIssue with a source code frame for rich CLI output.
 *
 * Produces output like:
 * ```
 * ERROR  [INVALID_NESTING] at line 23, col 5–13:
 *
 * > 21 | <mc-section>
 *   22 |   <!-- comment -->
 * > 23 |   <mc-text>Hello</mc-text>
 *      |   ^^^^^^^^^
 *   24 | </mc-section>
 *
 *   <mc-text> must be inside <mc-column>.
 *   Fix: Wrap it: <mc-column><mc-text>Hello</mc-text></mc-column>
 *   Docs: https://mailc.dev/errors/INVALID_NESTING
 * ```
 *
 * @param issue  - The issue to format.
 * @param source - The full source string (for the code frame).
 * @returns Rich formatted issue string with code frame, fix, and docs link.
 */
export function formatIssueWithSource(issue: MCIssue, source: string): string {
  const sev = issue.severity === 'error'
    ? `${RED}${BOLD}ERROR${RESET}`
    : issue.severity === 'warning'
      ? `${YELLOW}${BOLD}WARN${RESET}`
      : `${CYAN}${BOLD}INFO${RESET}`;

  const code = issue.code ? ` ${DIM}[${issue.code}]${RESET}` : '';
  const parts: string[] = [];

  // ── Header ────────────────────────────────────────────────────────────────
  if (issue.loc) {
    parts.push(`  ${sev}${code} at line ${BOLD}${issue.loc.line}${RESET}, col ${BOLD}${issue.loc.col}${RESET}:`);
  } else {
    parts.push(`  ${sev}${code}:`);
  }

  parts.push('');

  // ── Code frame ────────────────────────────────────────────────────────────
  if (issue.loc) {
    const frame = buildCodeFrame(source, issue.loc.line, issue.loc.col, undefined, true);
    // Indent each frame line by 2 spaces for consistent CLI alignment
    const indented = frame.split('\n').map((l) => `  ${l}`).join('\n');
    parts.push(indented);
    parts.push('');
  }

  // ── Message + fix + docs ──────────────────────────────────────────────────
  parts.push(`  ${issue.message}`);

  if (issue.fix) {
    parts.push(`  ${CYAN}Fix:${RESET} ${issue.fix}`);
  }

  parts.push(`  ${DIM}Docs: ${DOCS_BASE_URL}/${issue.code}${RESET}`);

  return parts.join('\n');
}

/**
 * Formats a list of issues, grouped by severity.
 *
 * @param issues - The issues to format.
 * @returns Formatted multi-line string.
 */
export function formatIssues(issues: MCIssue[]): string {
  return issues.map(formatIssue).join('\n');
}

// ---------------------------------------------------------------------------
// Compile result formatting
// ---------------------------------------------------------------------------

/**
 * Formats a CompileResult summary for a single file.
 *
 * When `source` is provided, errors and warnings are rendered with a
 * full code frame via {@link formatIssueWithSource}. Otherwise falls back
 * to the compact {@link formatIssue} one-liner.
 *
 * @param inputPath  - The input file path.
 * @param outputPath - The output file path (or "stdout").
 * @param result     - The compile result.
 * @param source     - Original source string for rich code frames (optional).
 * @returns Formatted summary string.
 */
export function formatCompileResult(
  inputPath: string,
  outputPath: string,
  result: CompileResult,
  source?: string,
): string {
  const lines: string[] = [];
  const time = `${DIM}(${result.stats.compileTime.toFixed(0)}ms)${RESET}`;

  if (result.html !== null && result.errors.length === 0) {
    lines.push(success(`Compiled ${BOLD}${inputPath}${RESET} → ${BOLD}${outputPath}${RESET} ${time}`));
  } else if (result.html !== null && result.partial) {
    lines.push(warn(`Partial ${BOLD}${inputPath}${RESET} → ${BOLD}${outputPath}${RESET} ${time} (compiled with errors — not written to file)`));
  } else {
    lines.push(error(`Failed to compile ${BOLD}${inputPath}${RESET} ${time}`));
  }

  // Show errors — rich format when source is available, compact otherwise
  if (result.errors.length > 0) {
    lines.push(
      source
        ? result.errors.map((e) => formatIssueWithSource(e, source)).join('\n\n')
        : formatIssues(result.errors),
    );
  }

  // Show warnings — rich format when source is available, compact otherwise
  if (result.warnings.length > 0) {
    lines.push(
      source
        ? result.warnings.map((w) => formatIssueWithSource(w, source)).join('\n\n')
        : formatIssues(result.warnings),
    );
  }

  // Show info messages. These are heads-up signals (e.g.
  // STRICT_MODE_MCSTYLE_BYPASS) that the user opted into something whose
  // scope they should know — print always so CI users without --verbose
  // still see them.
  if (result.info.length > 0) {
    lines.push(
      source
        ? result.info.map((i) => formatIssueWithSource(i, source)).join('\n\n')
        : formatIssues(result.info),
    );
  }

  return lines.join('\n');
}

/**
 * Formats a verbose stats line for a compile result.
 *
 * @param result - The compile result.
 * @returns Formatted stats string.
 */
export function formatStats(result: CompileResult): string {
  const s = result.stats;
  const parts = [
    `${s.components} components`,
    `${s.cssPropertiesInlined} CSS inlined`,
    `${s.cssPropertiesStripped} CSS stripped`,
  ];

  if (s.inputSize > 0 && s.outputSize > 0) {
    const ratio = (s.outputSize / s.inputSize).toFixed(1);
    parts.push(`${formatBytes(s.inputSize)} → ${formatBytes(s.outputSize)} (${ratio}x)`);
  }

  return `  ${DIM}${parts.join(' · ')}${RESET}`;
}

/**
 * Formats a summary line for a batch of compile results.
 *
 * @param total    - Total files processed.
 * @param passed   - Files compiled successfully.
 * @param failed   - Files that failed to compile.
 * @param warnings - Total warning count across all files.
 * @param timeMs   - Total time in milliseconds.
 * @returns Formatted summary string.
 */
export function formatBatchSummary(
  total: number,
  passed: number,
  failed: number,
  warnings: number,
  timeMs: number,
): string {
  const parts: string[] = [];

  if (failed > 0) {
    parts.push(error(`${failed} failed`));
  }
  if (passed > 0) {
    parts.push(success(`${passed} compiled`));
  }
  if (warnings > 0) {
    parts.push(warn(`${warnings} warnings`));
  }

  const time = `${DIM}(${timeMs.toFixed(0)}ms total)${RESET}`;
  return `\n${parts.join(', ')} — ${total} file${total === 1 ? '' : 's'} ${time}`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Formats a byte count as a human-readable string.
 *
 * @param bytes - The byte count.
 * @returns Formatted string like "1.2KB" or "47B".
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)}KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)}MB`;
}
