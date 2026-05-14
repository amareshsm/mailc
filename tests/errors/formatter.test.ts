import { describe, it, expect } from 'vitest';
import { formatError, formatErrors, buildCodeFrame, DOCS_BASE_URL } from '../../src/errors/formatter.js';
import { MCError } from '../../src/errors/mc-error.js';
import { ErrorCode } from '../../src/errors/codes.js';

const ANSI_ESCAPE = String.fromCharCode(27);
const ANSI_ESCAPE_REGEX = new RegExp(`${ANSI_ESCAPE}\\[[0-9;]*m`, 'g');

const SOURCE = `<mc>
  <mc-body>
  <mc-section>
    <mc-text>Hello</mc-text>
  </mc-section>
</mc-body>
</mc>`;

describe('buildCodeFrame', () => {
  it('highlights the error line with > marker', () => {
    const frame = buildCodeFrame(SOURCE, 3, 5);
    expect(frame).toContain('> 3 |');
    expect(frame).toContain('^');
  });

  it('shows context lines before and after', () => {
    const frame = buildCodeFrame(SOURCE, 3, 5);
    expect(frame).toContain('1 |');
    expect(frame).toContain('2 |');
    expect(frame).toContain('4 |');
    expect(frame).toContain('5 |');
  });

  it('handles first line error', () => {
    const frame = buildCodeFrame(SOURCE, 1, 1);
    expect(frame).toContain('> 1 |');
    expect(frame).toContain('^');
  });

  it('handles last line error', () => {
    const frame = buildCodeFrame(SOURCE, 5, 1);
    expect(frame).toContain('> 5 |');
  });

  it('clamps context lines at boundaries', () => {
    const frame = buildCodeFrame(SOURCE, 1, 1);
    // Should not contain line 0 or negative
    expect(frame).not.toContain(' 0 |');
  });

  it('renders a single ^ caret when endCol is not provided', () => {
    const frame = buildCodeFrame(SOURCE, 3, 5);
    // Only one caret
    const caretLine = frame.split('\n').find((l) => l.includes('^'));
    expect(caretLine).toBeDefined();
    expect(caretLine!.replace(ANSI_ESCAPE_REGEX, '').match(/\^+/)![0]).toBe('^');
  });

  it('renders multi-char ^^^^ caret spanning endCol - errorCol', () => {
    // errorCol=5, endCol=14 → span of 9 chars → ^^^^^^^^^
    const frame = buildCodeFrame(SOURCE, 3, 5, 14);
    const caretLine = frame.split('\n').find((l) => l.includes('^'));
    expect(caretLine).toBeDefined();
    const stripped = caretLine!.replace(ANSI_ESCAPE_REGEX, '');
    expect(stripped.match(/\^+/)![0]).toBe('^^^^^^^^^');
  });

  it('uses minimum caret length of 1 when endCol equals errorCol', () => {
    const frame = buildCodeFrame(SOURCE, 3, 5, 5);
    const caretLine = frame.split('\n').find((l) => l.includes('^'));
    expect(caretLine).toBeDefined();
    const stripped = caretLine!.replace(ANSI_ESCAPE_REGEX, '');
    expect(stripped.match(/\^+/)![0]).toBe('^');
  });

  it('adds ANSI color codes when colors=true', () => {
    const frame = buildCodeFrame(SOURCE, 3, 5, 14, true);
    // Should contain at least one ANSI escape sequence
    expect(frame).toContain('\x1b[');
  });

  it('produces no ANSI codes when colors=false (default)', () => {
    const frame = buildCodeFrame(SOURCE, 3, 5, 14, false);
    expect(frame).not.toContain('\x1b[');
  });
});

describe('formatError', () => {
  it('formats an error with code frame', () => {
    const error = new MCError({
      code: ErrorCode.INVALID_NESTING,
      message: '<mc-text> must be inside <mc-column>',
      loc: {
        start: { line: 3, col: 5, offset: 22 },
        end: { line: 3, col: 35, offset: 52 },
      },
      severity: 'error',
      fix: 'Wrap it: <mc-column><mc-text>...</mc-text></mc-column>',
    });

    const output = formatError(error, SOURCE);

    expect(output).toContain('ERROR');
    expect(output).toContain('INVALID_NESTING');
    expect(output).toContain('line 3');
    expect(output).toContain('> 3 |');
    expect(output).toContain('^');
    expect(output).toContain('<mc-text> must be inside <mc-column>');
    expect(output).toContain('Fix:');
  });

  it('includes a docs URL', () => {
    const error = new MCError({
      code: ErrorCode.INVALID_NESTING,
      message: 'nesting error',
      loc: { start: { line: 1, col: 1, offset: 0 }, end: { line: 1, col: 5, offset: 4 } },
      severity: 'error',
    });

    const output = formatError(error, SOURCE);
    expect(output).toContain(`${DOCS_BASE_URL}/INVALID_NESTING`);
  });

  it('uses a custom docsBaseUrl when provided', () => {
    const error = new MCError({
      code: ErrorCode.INVALID_NESTING,
      message: 'nesting error',
      severity: 'error',
    });

    const output = formatError(error, SOURCE, { docsBaseUrl: 'https://custom.dev/e' });
    expect(output).toContain('https://custom.dev/e/INVALID_NESTING');
  });

  it('shows multi-char caret span using end.col', () => {
    const error = new MCError({
      code: ErrorCode.UNKNOWN_COMPONENT,
      message: 'Unknown component',
      loc: {
        start: { line: 3, col: 5, offset: 22 },
        end: { line: 3, col: 14, offset: 31 },
      },
      severity: 'error',
    });

    const output = formatError(error, SOURCE);
    const caretLine = output.split('\n').find((l) => l.includes('^'));
    expect(caretLine).toBeDefined();
    // 9 chars from col 5 to 14 (exclusive)
    expect(caretLine!.replace(ANSI_ESCAPE_REGEX, '').match(/\^+/)![0]).toBe('^^^^^^^^^');
  });

  it('emits ANSI color codes when colors=true', () => {
    const error = new MCError({
      code: ErrorCode.INVALID_NESTING,
      message: 'nesting error',
      loc: { start: { line: 1, col: 1, offset: 0 }, end: { line: 1, col: 5, offset: 4 } },
      severity: 'error',
    });

    const output = formatError(error, SOURCE, { colors: true });
    expect(output).toContain('\x1b[');
  });

  it('emits no ANSI codes by default', () => {
    const error = new MCError({
      code: ErrorCode.INVALID_NESTING,
      message: 'nesting error',
      severity: 'error',
    });

    const output = formatError(error, SOURCE);
    expect(output).not.toContain('\x1b[');
  });

  it('shows col range "5–13" when end.col > start.col + 1', () => {
    const error = new MCError({
      code: ErrorCode.UNKNOWN_COMPONENT,
      message: 'Unknown component',
      loc: {
        start: { line: 3, col: 5, offset: 22 },
        end: { line: 3, col: 14, offset: 31 },
      },
      severity: 'error',
    });

    const output = formatError(error, SOURCE);
    expect(output).toContain('5–13');
  });

  it('formats a warning', () => {
    const error = new MCError({
      code: ErrorCode.UNKNOWN_CLASS,
      message: 'Unknown class "bg-foo"',
      loc: {
        start: { line: 1, col: 10, offset: 9 },
        end: { line: 1, col: 20, offset: 19 },
      },
      severity: 'warning',
    });

    const output = formatError(error, SOURCE);
    expect(output).toContain('WARNING');
  });

  it('formats without source code', () => {
    const error = new MCError({
      code: ErrorCode.CONFIG_INVALID,
      message: 'Invalid config',
      severity: 'error',
    });

    const output = formatError(error);
    expect(output).toContain('ERROR');
    expect(output).toContain('CONFIG_INVALID');
    expect(output).toContain('Invalid config');
    // No code frame
    expect(output).not.toContain('|');
    // But still has docs URL
    expect(output).toContain(`${DOCS_BASE_URL}/CONFIG_INVALID`);
  });

  it('formats without location', () => {
    const error = new MCError({
      code: ErrorCode.FILE_NOT_FOUND,
      message: 'File not found: template.mc',
      severity: 'error',
    });

    const output = formatError(error, SOURCE);
    // No "at line X, col Y" in header
    expect(output).not.toContain('at line');
    // No code frame since no loc
    expect(output).not.toContain('> ');
  });
});

describe('formatErrors', () => {
  it('formats multiple errors separated by blank lines', () => {
    const errors = [
      new MCError({
        code: ErrorCode.INVALID_NESTING,
        message: 'Error 1',
        severity: 'error',
        loc: {
          start: { line: 1, col: 1, offset: 0 },
          end: { line: 1, col: 10, offset: 9 },
        },
      }),
      new MCError({
        code: ErrorCode.MISSING_ATTRIBUTE,
        message: 'Error 2',
        severity: 'error',
        loc: {
          start: { line: 3, col: 5, offset: 20 },
          end: { line: 3, col: 15, offset: 30 },
        },
      }),
    ];

    const output = formatErrors(errors, SOURCE);
    expect(output).toContain('INVALID_NESTING');
    expect(output).toContain('MISSING_ATTRIBUTE');
    // Two separate error blocks
    expect(output.split('ERROR').length - 1).toBe(2);
  });

  it('passes options to each formatError call', () => {
    const errors = [
      new MCError({
        code: ErrorCode.INVALID_NESTING,
        message: 'Error 1',
        severity: 'error',
      }),
    ];

    const output = formatErrors(errors, SOURCE, { docsBaseUrl: 'https://my.dev/e' });
    expect(output).toContain('https://my.dev/e/INVALID_NESTING');
  });

  it('returns empty string for no errors', () => {
    expect(formatErrors([])).toBe('');
  });
});
