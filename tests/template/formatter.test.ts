/**
 * Tests for formatter pipeline.
 *
 * Covers BUILD_ORDER item 10.5.17.
 */

import { describe, it, expect } from 'vitest';
import { applyFormatters } from '../../src/template/index.js';
import type { FormatterCall } from '../../src/template/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatters = {
  upper: (v: unknown) => String(v).toUpperCase(),
  lower: (v: unknown) => String(v).toLowerCase(),
  trim: (v: unknown) => String(v).trim(),
  currency: (v: unknown) => `$${(Number(v) / 100).toFixed(2)}`,
  date: (v: unknown, format?: string) =>
    format === 'short' ? 'Jan 15, 2024' : String(v),
  repeat: (v: unknown, times?: string) =>
    String(v).repeat(Number(times) || 1),
};

// ===========================================================================
// applyFormatters
// ===========================================================================

describe('applyFormatters', () => {
  it('applies a single formatter', () => {
    const calls: FormatterCall[] = [{ name: 'upper', args: [] }];
    expect(applyFormatters('hello', calls, formatters)).toBe('HELLO');
  });

  it('applies chained formatters left-to-right', () => {
    const calls: FormatterCall[] = [
      { name: 'trim', args: [] },
      { name: 'upper', args: [] },
    ];
    expect(applyFormatters('  hello  ', calls, formatters)).toBe('HELLO');
  });

  it('passes arguments to formatter', () => {
    const calls: FormatterCall[] = [{ name: 'date', args: ['short'] }];
    expect(applyFormatters('2024-01-15', calls, formatters)).toBe('Jan 15, 2024');
  });

  it('skips unknown formatter (keeps value)', () => {
    const calls: FormatterCall[] = [{ name: 'nonexistent', args: [] }];
    expect(applyFormatters('hello', calls, formatters)).toBe('hello');
  });

  it('coerces return type to string', () => {
    const calls: FormatterCall[] = [{ name: 'currency', args: [] }];
    expect(applyFormatters(12750, calls, formatters)).toBe('$127.50');
  });

  it('caps output at 10KB', () => {
    const bigFormatters = {
      huge: () => 'x'.repeat(20_000),
    };
    const calls: FormatterCall[] = [{ name: 'huge', args: [] }];
    const result = applyFormatters('input', calls, bigFormatters);
    expect(result.length).toBe(10_240);
  });

  it('handles empty formatter chain', () => {
    expect(applyFormatters('hello', [], formatters)).toBe('hello');
  });

  it('chains currency after trim', () => {
    const calls: FormatterCall[] = [
      { name: 'trim', args: [] },
      { name: 'currency', args: [] },
    ];
    // trim("12750") → "12750", currency("12750") → "$127.50"
    expect(applyFormatters('12750', calls, formatters)).toBe('$127.50');
  });

  it('handles non-string value input', () => {
    const calls: FormatterCall[] = [{ name: 'upper', args: [] }];
    expect(applyFormatters(42, calls, formatters)).toBe('42');
  });

  it('handles null value input', () => {
    const calls: FormatterCall[] = [{ name: 'upper', args: [] }];
    expect(applyFormatters(null, calls, formatters)).toBe('NULL');
  });

  it('handles boolean value input', () => {
    const calls: FormatterCall[] = [{ name: 'upper', args: [] }];
    expect(applyFormatters(true, calls, formatters)).toBe('TRUE');
  });
});
