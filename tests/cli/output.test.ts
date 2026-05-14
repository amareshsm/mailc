/**
 * Tests for CLI output formatting helpers.
 *
 * @module tests/cli/output
 */

import { describe, it, expect } from 'vitest';
import {
  success,
  warn,
  error,
  info,
  formatIssue,
  formatIssues,
  formatStats,
  formatBatchSummary,
} from '../../src/cli/output.js';
import type { MCIssue, CompileResult } from '../../src/types.js';

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

describe('success()', () => {
  it('includes a green checkmark', () => {
    const out = success('done');
    expect(out).toContain('✓');
    expect(out).toContain('done');
  });
});

describe('warn()', () => {
  it('includes a yellow triangle', () => {
    const out = warn('heads up');
    expect(out).toContain('⚠');
    expect(out).toContain('heads up');
  });
});

describe('error()', () => {
  it('includes a red cross', () => {
    const out = error('broken');
    expect(out).toContain('✗');
    expect(out).toContain('broken');
  });
});

describe('info()', () => {
  it('includes an info dot', () => {
    const out = info('processing');
    expect(out).toContain('●');
    expect(out).toContain('processing');
  });
});

// ---------------------------------------------------------------------------
// Issue formatting
// ---------------------------------------------------------------------------

describe('formatIssue()', () => {
  it('formats an error issue with code and location', () => {
    const issue: MCIssue = {
      code: 'INVALID_NESTING',
      message: 'mc-text must be inside mc-column',
      severity: 'error',
      loc: { line: 5, col: 3 },
    };
    const out = formatIssue(issue);
    expect(out).toContain('ERROR');
    expect(out).toContain('INVALID_NESTING');
    expect(out).toContain('5:3');
    expect(out).toContain('mc-text must be inside mc-column');
  });

  it('formats a warning issue', () => {
    const issue: MCIssue = {
      code: 'CSS_PARTIAL',
      message: 'letter-spacing has partial support',
      severity: 'warning',
    };
    const out = formatIssue(issue);
    expect(out).toContain('WARN');
    expect(out).toContain('CSS_PARTIAL');
  });

  it('includes fix suggestion when present', () => {
    const issue: MCIssue = {
      code: 'TEST',
      message: 'Something wrong',
      severity: 'error',
      fix: 'Try this instead',
    };
    const out = formatIssue(issue);
    expect(out).toContain('Fix: Try this instead');
  });

  it('handles issue without location', () => {
    const issue: MCIssue = {
      code: 'GENERAL',
      message: 'Something happened',
      severity: 'info',
    };
    const out = formatIssue(issue);
    expect(out).toContain('Something happened');
    expect(out).toContain('INFO');
  });
});

describe('formatIssues()', () => {
  it('formats multiple issues separated by newlines', () => {
    const issues: MCIssue[] = [
      { code: 'A', message: 'first', severity: 'error' },
      { code: 'B', message: 'second', severity: 'warning' },
    ];
    const out = formatIssues(issues);
    expect(out).toContain('first');
    expect(out).toContain('second');
    expect(out.split('\n').length).toBeGreaterThanOrEqual(2);
  });

  it('returns empty string for empty array', () => {
    expect(formatIssues([])).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Compile result formatting
// ---------------------------------------------------------------------------

describe('formatStats()', () => {
  it('shows component count, CSS stats, and size ratio', () => {
    const result: CompileResult = {
      html: '<html></html>',
      errors: [],
      warnings: [],
      info: [],
      stats: {
        inputSize: 100,
        outputSize: 500,
        compileTime: 5,
        components: 3,
        cssPropertiesInlined: 10,
        cssPropertiesStripped: 2,
        mediaQueriesGenerated: 1,
      },
    };
    const out = formatStats(result);
    expect(out).toContain('3 components');
    expect(out).toContain('10 CSS inlined');
    expect(out).toContain('2 CSS stripped');
    expect(out).toContain('5.0x');
  });
});

describe('formatBatchSummary()', () => {
  it('shows pass/fail/warning counts', () => {
    const out = formatBatchSummary(5, 3, 2, 4, 120);
    expect(out).toContain('2 failed');
    expect(out).toContain('3 compiled');
    expect(out).toContain('4 warnings');
    expect(out).toContain('5 files');
    expect(out).toContain('120ms');
  });

  it('handles singular file count', () => {
    const out = formatBatchSummary(1, 1, 0, 0, 10);
    expect(out).toContain('1 file ');
    expect(out).not.toContain('files');
  });

  it('omits sections with zero count', () => {
    const out = formatBatchSummary(3, 3, 0, 0, 50);
    expect(out).not.toContain('failed');
    expect(out).not.toContain('warnings');
    expect(out).toContain('3 compiled');
  });
});
