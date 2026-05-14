/**
 * Pretty error formatter with code frame.
 *
 * Produces output like:
 * ```
 * ERROR  INVALID_NESTING at line 12, col 5–14:
 *
 *   10 | <mc-body>
 *   11 |   <mc-section>
 * > 12 |     <mc-text>Hello</mc-text>
 *      |     ^^^^^^^^^
 *   13 |   </mc-section>
 *
 *   <mc-text> must be inside <mc-column>, but found inside <mc-section>.
 *   Fix: Wrap it: <mc-column><mc-text>Hello</mc-text></mc-column>
 *   Docs: https://mailc.dev/errors/INVALID_NESTING
 * ```
 */

import type { MCError } from './mc-error.js';

const CONTEXT_LINES = 2;

const SEVERITY_LABELS: Record<string, string> = {
  error: 'ERROR',
  warning: 'WARNING',
  info: 'INFO',
};

// ANSI escape codes — used only when `options.colors` is true.
const A = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

/** Base URL for error documentation links. */
export const DOCS_BASE_URL = 'https://mailc.dev/errors';

/** Options for {@link formatError}. */
export interface FormatErrorOptions {
  /**
   * Emit ANSI color escape codes.
   * @default false
   */
  colors?: boolean;
  /**
   * Override the base URL for documentation links.
   * @default 'https://mailc.dev/errors'
   */
  docsBaseUrl?: string;
}

/**
 * Formats an MCError into a human-readable string with a code frame.
 *
 * @param error   - The MCError to format.
 * @param source  - The full source code string (for code frame extraction).
 * @param options - Display options (ANSI colors, docs URL base).
 * @returns A formatted error string with code frame, suggestion, and docs link.
 */
export function formatError(
  error: MCError,
  source?: string,
  options: FormatErrorOptions = {},
): string {
  const { colors = false, docsBaseUrl = DOCS_BASE_URL } = options;
  const label = SEVERITY_LABELS[error.severity] ?? 'ERROR';
  const parts: string[] = [];

  // ── Header ────────────────────────────────────────────────────────────────
  const severityColor =
    colors
      ? error.severity === 'error'
        ? A.red + A.bold
        : error.severity === 'warning'
          ? A.yellow + A.bold
          : A.cyan + A.bold
      : '';
  const reset = colors ? A.reset : '';
  const dim = colors ? A.dim : '';
  const bold = colors ? A.bold : '';

  if (error.loc) {
    const { start, end } = error.loc;
    const colRange =
      end.col > start.col + 1 ? `${start.col}–${end.col - 1}` : `${start.col}`;
    parts.push(
      `${severityColor}${label}${reset}  ${dim}${error.code}${reset} at line ${bold}${start.line}${reset}, col ${bold}${colRange}${reset}:`,
    );
  } else {
    parts.push(`${severityColor}${label}${reset}  ${dim}${error.code}${reset}:`);
  }

  parts.push('');

  // ── Code frame ────────────────────────────────────────────────────────────
  if (source && error.loc) {
    const { start, end } = error.loc;
    const endCol = end.line === start.line ? end.col : undefined;
    const frame = buildCodeFrame(source, start.line, start.col, endCol, colors);
    parts.push(frame);
    parts.push('');
  }

  // ── Error message ─────────────────────────────────────────────────────────
  parts.push(`  ${error.message}`);

  // ── Fix suggestion ────────────────────────────────────────────────────────
  if (error.fix) {
    parts.push(`  ${colors ? A.cyan : ''}Fix:${reset} ${error.fix}`);
  }

  // ── Docs link ─────────────────────────────────────────────────────────────
  parts.push(`  ${dim}Docs: ${docsBaseUrl}/${error.code}${reset}`);

  return parts.join('\n');
}

/**
 * Builds a code frame around the error location.
 *
 * The caret line spans from `errorCol` to `endCol` (exclusive), producing
 * `^^^^^^^^^` for multi-character tokens instead of a lone `^`.
 *
 * @param source    - The full source code string.
 * @param errorLine - The 1-based line number of the error.
 * @param errorCol  - The 1-based start column number of the error.
 * @param endCol    - The 1-based end column (exclusive). Defaults to `errorCol + 1` (single char).
 * @param colors    - Emit ANSI color codes.
 * @returns A formatted code frame string.
 */
export function buildCodeFrame(
  source: string,
  errorLine: number,
  errorCol: number,
  endCol?: number,
  colors = false,
): string {
  const lines = source.split('\n');
  const startLine = Math.max(1, errorLine - CONTEXT_LINES);
  const endLine = Math.min(lines.length, errorLine + CONTEXT_LINES);

  const gutterWidth = String(endLine).length;
  const frameLines: string[] = [];

  const dim = colors ? A.dim : '';
  const red = colors ? A.red : '';
  const reset = colors ? A.reset : '';

  for (let i = startLine; i <= endLine; i++) {
    const lineContent = lines[i - 1] ?? '';
    const gutter = String(i).padStart(gutterWidth);
    const isErrorLine = i === errorLine;

    if (isErrorLine) {
      frameLines.push(`${red}>${reset} ${gutter} | ${lineContent}`);

      // Caret spans from errorCol to endCol (exclusive).
      // Minimum caret length is 1 (`^`).
      const caretLength = Math.max(1, (endCol ?? errorCol + 1) - errorCol);
      const caretPadding = ' '.repeat(errorCol - 1);
      const carets = red + '^'.repeat(caretLength) + reset;
      frameLines.push(`  ${' '.repeat(gutterWidth)} | ${caretPadding}${carets}`);
    } else {
      frameLines.push(`  ${dim}${gutter}${reset} | ${lineContent}`);
    }
  }

  return frameLines.join('\n');
}

/**
 * Formats multiple MCErrors into a single readable string.
 *
 * @param errors  - Array of MCErrors to format.
 * @param source  - The full source code string.
 * @param options - Display options passed to each {@link formatError} call.
 * @returns A combined formatted string separated by blank lines.
 */
export function formatErrors(
  errors: readonly MCError[],
  source?: string,
  options: FormatErrorOptions = {},
): string {
  return errors.map((e) => formatError(e, source, options)).join('\n\n');
}
