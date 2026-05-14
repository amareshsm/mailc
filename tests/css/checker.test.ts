/**
 * Tests for the CSS checker (caniemail integration).
 *
 * @module tests/css/checker
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkCSS,
  clearCheckerCache,
  checkIssuesToMCIssues,
} from '../../src/css/checker.js';
import type { CSSProperty } from '../../src/types.js';
import { ErrorCode } from '../../src/errors/codes.js';

const DEFAULT_CLIENTS = [
  'gmail.*',
  'apple-mail.*',
  'outlook.*',
  'yahoo.*',
  'samsung-email.android',
];

beforeEach(() => {
  clearCheckerCache();
});

// ---------------------------------------------------------------------------
// checkCSS
// ---------------------------------------------------------------------------

describe('checkCSS', () => {
  it('returns success for empty property list', () => {
    const result = checkCSS([], DEFAULT_CLIENTS);
    expect(result.success).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('returns zero issues and success:true for universally supported properties', () => {
    // color is supported in all known email clients — no issues expected.
    // (font-size is intentionally excluded: caniemail flags it as partial in
    // outlook/yahoo/samsung because rem values are unsupported there, even
    // though the property itself works fine with px values.)
    const props: CSSProperty[] = [{ property: 'color', value: 'red' }];
    const result = checkCSS(props, DEFAULT_CLIENTS);
    expect(result.success).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('never includes wrapper-noise titles like "Type selector" in issues', () => {
    // Our p{} wrapper triggers caniemail "Type selector" — must be filtered out.
    // Using a fully-supported property ensures the ONLY caniemail output is the noise.
    const props: CSSProperty[] = [{ property: 'color', value: 'red' }];
    const result = checkCSS(props, DEFAULT_CLIENTS);
    const noiseTitles = result.issues.map((i) => i.property).filter((p) =>
      p.includes(' ') || p.startsWith('@') || p.startsWith(':'),
    );
    expect(noiseTitles).toHaveLength(0);
  });

  it('reports display:flex as unsupported in outlook (error) and gmail (warning)', () => {
    const props: CSSProperty[] = [{ property: 'display', value: 'flex' }];
    const result = checkCSS(props, ['gmail.*', 'outlook.*']);

    // Must NOT be success — flexbox is broken in key email clients
    expect(result.success).toBe(false);

    // "display:flex" error must appear for Outlook (completely unsupported)
    const flexError = result.issues.find(
      (i) => i.property === 'display:flex' && i.severity === 'error',
    );
    expect(flexError).toBeDefined();
    expect(flexError?.affectedClients).toContain('outlook.windows');

    // "display:flex" warning must appear for Gmail (partially supported)
    const flexWarn = result.issues.find(
      (i) => i.property === 'display:flex' && i.severity === 'warning',
    );
    expect(flexWarn).toBeDefined();
    expect(flexWarn?.affectedClients.some((c) => c.startsWith('gmail.'))).toBe(true);

    // "Type selector" noise must NOT appear
    expect(result.issues.map((i) => i.property)).not.toContain('Type selector');
  });

  it('reports position:absolute as an error (unsupported in gmail and outlook)', () => {
    const props: CSSProperty[] = [{ property: 'position', value: 'absolute' }];
    const result = checkCSS(props, ['gmail.*', 'outlook.*']);

    expect(result.success).toBe(false);
    const posError = result.issues.find(
      (i) => i.property === 'position' && i.severity === 'error',
    );
    expect(posError).toBeDefined();
    expect(posError?.affectedClients.some((c) => c.startsWith('gmail.'))).toBe(true);
    expect(result.issues.map((i) => i.property)).not.toContain('Type selector');
  });

  it('rejects invalid property names immediately without calling caniemail', () => {
    const result = checkCSS([{ property: '.selector', value: 'red' }], DEFAULT_CLIENTS);
    expect(result.success).toBe(false);
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.severity).toBe('error');
    expect(result.issues[0]?.message).toContain('.selector');
  });

  it('rejects at-rule strings as property names', () => {
    const result = checkCSS([{ property: '@media', value: 'screen' }], DEFAULT_CLIENTS);
    expect(result.success).toBe(false);
    expect(result.issues[0]?.message).toContain('@media');
  });

  it('caches results for identical inputs', () => {
    const props: CSSProperty[] = [
      { property: 'color', value: '#fff' },
    ];
    const result1 = checkCSS(props, DEFAULT_CLIENTS);
    const result2 = checkCSS(props, DEFAULT_CLIENTS);
    // Results should be the same object (cached)
    expect(result1).toBe(result2);
  });

  it('does not use cache after clearCheckerCache', () => {
    const props: CSSProperty[] = [
      { property: 'color', value: '#fff' },
    ];
    const result1 = checkCSS(props, DEFAULT_CLIENTS);
    clearCheckerCache();
    const result2 = checkCSS(props, DEFAULT_CLIENTS);
    // Results should be equal but not the same object
    expect(result1).not.toBe(result2);
    expect(result1).toEqual(result2);
  });

  it('returns different results for different client targets', () => {
    const props: CSSProperty[] = [
      { property: 'border-radius', value: '8px' },
    ];
    const allClients = checkCSS(props, ['*']);
    const appleOnly = checkCSS(props, ['apple-mail.*']);
    // Apple Mail supports border-radius, so fewer (or no) issues expected
    expect(appleOnly.issues.length).toBeLessThanOrEqual(allClients.issues.length);
  });

  it('returns structured issue objects', () => {
    const props: CSSProperty[] = [
      { property: 'border-radius', value: '8px' },
    ];
    const result = checkCSS(props, DEFAULT_CLIENTS);
    for (const issue of result.issues) {
      expect(issue).toHaveProperty('property');
      expect(issue).toHaveProperty('message');
      expect(issue).toHaveProperty('affectedClients');
      expect(issue).toHaveProperty('severity');
      expect(issue).toHaveProperty('notes');
      expect(Array.isArray(issue.affectedClients)).toBe(true);
      expect(Array.isArray(issue.notes)).toBe(true);
      expect(['error', 'warning']).toContain(issue.severity);
    }
  });
});

// ---------------------------------------------------------------------------
// checkIssuesToMCIssues
// ---------------------------------------------------------------------------

describe('checkIssuesToMCIssues', () => {
  it('converts error issues to MCIssue format', () => {
    const result = checkIssuesToMCIssues([
      {
        property: 'display',
        message: '"display" is not supported in: outlook.windows',
        affectedClients: ['outlook.windows'],
        severity: 'error',
        notes: [],
      },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.code).toBe(ErrorCode.BREAKING_CSS);
    expect(result[0]?.severity).toBe('error');
    expect(result[0]?.message).toContain('display');
  });

  it('converts warning issues to MCIssue format', () => {
    const result = checkIssuesToMCIssues([
      {
        property: 'border-radius',
        message: '"border-radius" is only partially supported in: outlook.windows',
        affectedClients: ['outlook.windows'],
        severity: 'warning',
        notes: ['Needs fallback'],
      },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.code).toBe(ErrorCode.UNSUPPORTED_UTILITY);
    expect(result[0]?.severity).toBe('warning');
  });

  it('returns empty array for empty input', () => {
    expect(checkIssuesToMCIssues([])).toEqual([]);
  });

  it('converts mixed severity issues', () => {
    const result = checkIssuesToMCIssues([
      {
        property: 'display',
        message: 'error msg',
        affectedClients: ['outlook.windows'],
        severity: 'error',
        notes: [],
      },
      {
        property: 'border-radius',
        message: 'warning msg',
        affectedClients: ['outlook.windows'],
        severity: 'warning',
        notes: [],
      },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]?.severity).toBe('error');
    expect(result[1]?.severity).toBe('warning');
  });
});
