/**
 * Tests for the media query generator.
 *
 * @module tests/css/media-queries
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveResponsiveClasses,
  buildMediaBlock,
  processResponsiveClasses,
} from '../../src/css/media-queries.js';
import { resolveTheme } from '../../src/css/theme-resolver.js';
import type { ResolvedTheme } from '../../src/types.js';

let theme: ResolvedTheme;

beforeEach(() => {
  theme = resolveTheme();
});

// ---------------------------------------------------------------------------
// resolveResponsiveClasses
// ---------------------------------------------------------------------------

describe('resolveResponsiveClasses', () => {
  it('resolves sm:text-base to font-size declarations', () => {
    const { rules } = resolveResponsiveClasses(['sm:text-base'], theme);
    expect(rules.length).toBeGreaterThan(0);
    expect(rules[0]?.declarations).toContain('font-size');
    expect(rules[0]?.declarations).toContain('!important');
  });

  it('generates a CSS class name from the sm: class', () => {
    const { rules } = resolveResponsiveClasses(['sm:text-base'], theme);
    expect(rules[0]?.className).toBe('sm-text-base');
  });

  it('resolves sm:bg-red-500 to background-color', () => {
    const { rules } = resolveResponsiveClasses(['sm:bg-red-500'], theme);
    expect(rules.length).toBeGreaterThan(0);
    expect(rules[0]?.declarations).toContain('background-color');
  });

  it('resolves multiple responsive classes', () => {
    const { rules } = resolveResponsiveClasses(
      ['sm:text-base', 'sm:p-2'],
      theme,
    );
    expect(rules.length).toBe(2);
  });

  it('returns warnings for unknown classes', () => {
    const { warnings } = resolveResponsiveClasses(['sm:nonexistent'], theme);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('returns warnings for rejected utilities', () => {
    const { warnings } = resolveResponsiveClasses(['sm:flex'], theme);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('returns empty rules for empty input', () => {
    const { rules, warnings } = resolveResponsiveClasses([], theme);
    expect(rules).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it('strips BREAKING properties from responsive rules', () => {
    // sm:overflow-hidden resolves to overflow:hidden which is BREAKING
    // But our resolver may reject it first — either way it shouldn't produce a rule
    const { rules } = resolveResponsiveClasses(['sm:overflow-hidden'], theme);
    // overflow-hidden is a rejected utility, so no rules generated
    expect(rules).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// buildMediaBlock
// ---------------------------------------------------------------------------

describe('buildMediaBlock', () => {
  it('builds a complete @media block', () => {
    const block = buildMediaBlock(
      [{ className: 'sm-text-base', declarations: 'font-size: 16px !important' }],
      480,
    );
    expect(block).toContain('@media only screen and (max-width: 480px)');
    expect(block).toContain('.sm-text-base');
    expect(block).toContain('font-size: 16px !important');
  });

  it('builds block with multiple rules', () => {
    const block = buildMediaBlock(
      [
        { className: 'sm-text-base', declarations: 'font-size: 16px !important' },
        { className: 'sm-p-2', declarations: 'padding-top: 8px !important' },
      ],
      600,
    );
    expect(block).toContain('max-width: 600px');
    expect(block).toContain('.sm-text-base');
    expect(block).toContain('.sm-p-2');
  });

  it('returns empty string for empty rules', () => {
    const block = buildMediaBlock([], 480);
    expect(block).toBe('');
  });

  it('uses custom breakpoint', () => {
    const block = buildMediaBlock(
      [{ className: 'sm-text-base', declarations: 'font-size: 16px !important' }],
      768,
    );
    expect(block).toContain('max-width: 768px');
  });

  it('uses default breakpoint of 480', () => {
    const block = buildMediaBlock([
      { className: 'sm-text-base', declarations: 'font-size: 16px !important' },
    ]);
    expect(block).toContain('max-width: 480px');
  });
});

// ---------------------------------------------------------------------------
// processResponsiveClasses — full pipeline
// ---------------------------------------------------------------------------

describe('processResponsiveClasses', () => {
  it('produces a complete media block for responsive classes', () => {
    const result = processResponsiveClasses(['sm:text-base'], theme, 480);
    expect(result.mediaBlock).toContain('@media');
    expect(result.mediaBlock).toContain('font-size');
    expect(result.rules.length).toBe(1);
  });

  it('returns empty media block for empty input', () => {
    const result = processResponsiveClasses([], theme);
    expect(result.mediaBlock).toBe('');
    expect(result.rules).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('passes through breakpoint to the @media block', () => {
    const result = processResponsiveClasses(['sm:text-base'], theme, 600);
    expect(result.mediaBlock).toContain('max-width: 600px');
  });

  it('collects warnings from invalid classes', () => {
    const result = processResponsiveClasses(['sm:flex'], theme);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.mediaBlock).toBe('');
  });
});
