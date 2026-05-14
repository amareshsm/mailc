/**
 * Tests for the CSS inliner.
 *
 * @module tests/css/inliner
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { inlineCSS } from '../../src/css/inliner.js';
import { resolveTheme } from '../../src/css/theme-resolver.js';
import { ErrorCode } from '../../src/errors/codes.js';
import type { ResolvedTheme } from '../../src/types.js';

let theme: ResolvedTheme;

beforeEach(() => {
  theme = resolveTheme();
});

// ---------------------------------------------------------------------------
// inlineCSS — basic
// ---------------------------------------------------------------------------

describe('inlineCSS', () => {
  describe('SAFE properties', () => {
    it('inlines color and font-size', () => {
      const result = inlineCSS('text-white text-lg', theme);
      expect(result.inlineStyle).toContain('color');
      expect(result.inlineStyle).toContain('font-size');
      expect(result.warnings.filter((w) => w.severity === 'error')).toHaveLength(0);
    });

    it('inlines background-color', () => {
      const result = inlineCSS('bg-red-500', theme);
      expect(result.inlineStyle).toContain('background-color');
    });

    it('inlines padding from utility', () => {
      const result = inlineCSS('p-4', theme);
      expect(result.inlineStyle).toContain('padding-top');
      expect(result.inlineStyle).toContain('padding-right');
      expect(result.inlineStyle).toContain('padding-bottom');
      expect(result.inlineStyle).toContain('padding-left');
    });

    it('inlines text-align', () => {
      const result = inlineCSS('text-center', theme);
      expect(result.inlineStyle).toContain('text-align:center');
    });

    it('returns empty style for empty class string', () => {
      const result = inlineCSS('', theme);
      expect(result.inlineStyle).toBe('');
      expect(result.warnings).toEqual([]);
    });
  });

  describe('ENHANCE properties — liberal mode (default)', () => {
    it('inlines border-radius in liberal mode', () => {
      const result = inlineCSS('rounded-lg', theme);
      expect(result.inlineStyle).toContain('border-radius');
      expect(result.warnings.filter((w) => w.code === ErrorCode.ENHANCE_PROPERTY_STRIPPED)).toHaveLength(0);
    });

    it('inlines box-shadow in liberal mode', () => {
      const result = inlineCSS('shadow-md', theme);
      expect(result.inlineStyle).toContain('box-shadow');
      expect(result.warnings).toHaveLength(0);
    });

    it('inlines opacity in liberal mode', () => {
      const result = inlineCSS('opacity-50', theme);
      expect(result.inlineStyle).toContain('opacity:0.5');
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('ENHANCE properties — strict mode', () => {
    it('strips border-radius in strict mode with ENHANCE_PROPERTY_STRIPPED warning', () => {
      const result = inlineCSS('rounded-lg', theme, {}, undefined, 'strict');
      expect(result.inlineStyle).not.toContain('border-radius');
      const warn = result.warnings.find((w) => w.code === ErrorCode.ENHANCE_PROPERTY_STRIPPED);
      expect(warn).toBeDefined();
      expect(warn?.message).toContain('border-radius');
    });

    it('strips box-shadow in strict mode', () => {
      const result = inlineCSS('shadow-md', theme, {}, undefined, 'strict');
      expect(result.inlineStyle).not.toContain('box-shadow');
      const warn = result.warnings.find((w) => w.code === ErrorCode.ENHANCE_PROPERTY_STRIPPED);
      expect(warn).toBeDefined();
    });
  });

  describe('BREAKING properties', () => {
    it('strips BREAKING class and emits error warning', () => {
      const result = inlineCSS('flex', theme);
      expect(result.inlineStyle).toBe('');
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('NO_EFFECT properties', () => {
    it('strips transition-all silently with no warning', () => {
      const result = inlineCSS('transition-all', theme);
      expect(result.inlineStyle).toBe('');
      expect(result.warnings).toHaveLength(0);
    });

    it('strips animate-spin silently with no warning', () => {
      const result = inlineCSS('animate-spin', theme);
      expect(result.inlineStyle).toBe('');
      expect(result.warnings).toHaveLength(0);
    });

    it('strips cursor-pointer silently with no warning', () => {
      const result = inlineCSS('cursor-pointer', theme);
      expect(result.inlineStyle).toBe('');
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('mixed classes', () => {
    it('handles mix of SAFE and ENHANCE classes — all inline in liberal mode', () => {
      const result = inlineCSS('bg-red-500 text-white rounded', theme);
      // All three go to inline in liberal mode (default)
      expect(result.inlineStyle).toContain('background-color');
      expect(result.inlineStyle).toContain('color');
      expect(result.inlineStyle).toContain('border-radius');
    });
  });

  describe('attribute precedence', () => {
    it('excludes width from inline style when width attribute exists', () => {
      const result = inlineCSS('w-full', theme, { width: '200' });
      expect(result.inlineStyle).not.toContain('width');
    });

    it('excludes background-color when bgcolor attribute exists', () => {
      const result = inlineCSS('bg-red-500', theme, { bgcolor: '#ef4444' });
      expect(result.inlineStyle).not.toContain('background-color');
    });

    it('keeps properties not covered by attributes', () => {
      const result = inlineCSS('bg-red-500 text-white', theme, { bgcolor: '#ef4444' });
      expect(result.inlineStyle).not.toContain('background-color');
      expect(result.inlineStyle).toContain('color');
    });
  });

  describe('responsive class separation', () => {
    it('ignores sm: classes in desktop inline style', () => {
      const result = inlineCSS('text-lg sm:text-base', theme);
      expect(result.inlineStyle).toContain('font-size');
    });

    it('warns about sm: classes without desktop fallback', () => {
      const result = inlineCSS('sm:bg-red-500', theme);
      const fallbackWarnings = result.warnings.filter(
        (w) => w.code === ErrorCode.NO_DESKTOP_FALLBACK,
      );
      expect(fallbackWarnings.length).toBeGreaterThan(0);
    });

    it('does not warn when desktop fallback exists', () => {
      const result = inlineCSS('bg-blue-500 sm:bg-red-500', theme);
      const fallbackWarnings = result.warnings.filter(
        (w) => w.code === ErrorCode.NO_DESKTOP_FALLBACK,
      );
      expect(fallbackWarnings).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// !important — not supported
// ---------------------------------------------------------------------------

describe('inlineCSS — !important not supported', () => {
  it('strips ! prefix and emits a warning', () => {
    const r = inlineCSS('!m-5', theme);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]?.code).toBe(ErrorCode.IMPORTANT_NOT_SUPPORTED);
    expect(r.warnings[0]?.message).toContain('!m-5');
    expect(r.warnings[0]?.message).toContain('m-5');
  });

  it('stripped class still resolves correctly', () => {
    const r = inlineCSS('!m-5', theme);
    expect(r.inlineStyle).toContain('margin-top:20px');
    expect(r.inlineStyle).toContain('margin-bottom:20px');
  });

  it('!m-5 mb-3 — stripped m-5 then specific mb-3 wins for bottom', () => {
    const r = inlineCSS('!m-5 mb-3', theme);
    expect(r.warnings.some(w => w.code === ErrorCode.IMPORTANT_NOT_SUPPORTED)).toBe(true);
    expect(r.inlineStyle).toContain('margin-top:20px');
    expect(r.inlineStyle).toContain('margin-bottom:12px');
  });

  it('multiple ! classes each emit their own warning', () => {
    const r = inlineCSS('!m-3 !mt-6', theme);
    const importantWarnings = r.warnings.filter(
      w => w.code === ErrorCode.IMPORTANT_NOT_SUPPORTED,
    );
    expect(importantWarnings).toHaveLength(2);
    expect(importantWarnings[0]?.message).toContain('!m-3');
    expect(importantWarnings[1]?.message).toContain('!mt-6');
  });

  it('warning severity is warning, not error', () => {
    const r = inlineCSS('!m-5', theme);
    expect(r.warnings[0]?.severity).toBe('warning');
  });

  it('non-! classes emit no important warning', () => {
    const r = inlineCSS('m-5 mb-3', theme);
    expect(r.warnings.some(w => w.code === ErrorCode.IMPORTANT_NOT_SUPPORTED)).toBe(false);
  });
});
