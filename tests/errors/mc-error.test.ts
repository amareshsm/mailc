import { describe, it, expect } from 'vitest';
import { MCError } from '../../src/errors/mc-error.js';
import { ErrorCode } from '../../src/errors/codes.js';
import type { SourceLocation } from '../../src/types.js';

const makeLoc = (
  startLine: number,
  startCol: number,
  endLine: number,
  endCol: number,
): SourceLocation => ({
  start: { line: startLine, col: startCol, offset: 0 },
  end: { line: endLine, col: endCol, offset: 0 },
});

describe('MCError', () => {
  it('creates an error with all fields', () => {
    const error = new MCError({
      code: ErrorCode.INVALID_NESTING,
      message: '<mc-text> must be inside <mc-column>',
      loc: makeLoc(12, 5, 12, 40),
      severity: 'error',
      fix: 'Wrap it: <mc-column><mc-text>...</mc-text></mc-column>',
    });

    expect(error.code).toBe(ErrorCode.INVALID_NESTING);
    expect(error.severity).toBe('error');
    expect(error.loc).toBeDefined();
    expect(error.loc!.start.line).toBe(12);
    expect(error.fix).toContain('mc-column');
    expect(error.name).toBe('MCError');
  });

  it('includes location in the message', () => {
    const error = new MCError({
      code: ErrorCode.UNCLOSED_TAG,
      message: 'Tag <mc-section> was never closed',
      loc: makeLoc(5, 3, 5, 20),
      severity: 'error',
    });

    expect(error.message).toContain('5:3');
    expect(error.message).toContain('UNCLOSED_TAG');
  });

  it('works without a location', () => {
    const error = new MCError({
      code: ErrorCode.CONFIG_INVALID,
      message: 'Invalid config value',
      severity: 'error',
    });

    expect(error.loc).toBeUndefined();
    expect(error.message).toContain('CONFIG_INVALID');
    expect(error.message).toContain('Invalid config value');
  });

  it('works without a fix', () => {
    const error = new MCError({
      code: ErrorCode.UNEXPECTED_EOF,
      message: 'Unexpected end of file',
      severity: 'error',
    });

    expect(error.fix).toBeUndefined();
  });

  it('is an instance of Error', () => {
    const error = new MCError({
      code: ErrorCode.MISSING_ATTRIBUTE,
      message: 'Missing required attribute',
      severity: 'error',
    });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(MCError);
  });

  it('supports warning severity', () => {
    const error = new MCError({
      code: ErrorCode.UNKNOWN_CLASS,
      message: 'Unknown Tailwind class "bg-foo"',
      severity: 'warning',
    });

    expect(error.severity).toBe('warning');
  });

  it('supports info severity', () => {
    const error = new MCError({
      code: ErrorCode.NO_EFFECT_CSS,
      message: 'cursor has no effect in email clients',
      severity: 'info',
    });

    expect(error.severity).toBe('info');
  });
});

describe('MCError.toIssue', () => {
  it('converts to an MCIssue object', () => {
    const error = new MCError({
      code: ErrorCode.INVALID_NESTING,
      message: '<mc-text> must be inside <mc-column>',
      loc: makeLoc(12, 5, 12, 40),
      severity: 'error',
      fix: 'Wrap it in <mc-column>',
    });

    const issue = error.toIssue('template.mc');

    expect(issue.code).toBe('INVALID_NESTING');
    expect(issue.severity).toBe('error');
    expect(issue.loc).toEqual({ line: 12, col: 5, file: 'template.mc' });
    expect(issue.fix).toBe('Wrap it in <mc-column>');
  });

  it('converts without file', () => {
    const error = new MCError({
      code: ErrorCode.UNCLOSED_TAG,
      message: 'Unclosed tag',
      loc: makeLoc(1, 1, 1, 10),
      severity: 'error',
    });

    const issue = error.toIssue();
    expect(issue.loc).toEqual({ line: 1, col: 1 });
    expect(issue.loc).not.toHaveProperty('file');
  });

  it('converts without location', () => {
    const error = new MCError({
      code: ErrorCode.CONFIG_INVALID,
      message: 'Bad config',
      severity: 'warning',
    });

    const issue = error.toIssue();
    expect(issue.loc).toBeUndefined();
  });
});
