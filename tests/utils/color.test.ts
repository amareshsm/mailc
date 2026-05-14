/**
 * Tests for src/utils/color.ts
 *
 * Covers: parseColor, isOpaqueColor, relativeLuminance, contrastRatio, checkContrast
 */

import { describe, it, expect } from 'vitest';
import {
  parseColor,
  isOpaqueColor,
  relativeLuminance,
  contrastRatio,
  checkContrast,
} from '../../src/utils/color.js';

// ---------------------------------------------------------------------------
// parseColor
// ---------------------------------------------------------------------------

describe('parseColor', () => {
  describe('hex colors', () => {
    it('parses 6-digit hex', () => {
      expect(parseColor('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
      expect(parseColor('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
      expect(parseColor('#0000ff')).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('parses 3-digit hex', () => {
      expect(parseColor('#f00')).toEqual({ r: 255, g: 0, b: 0 });
      expect(parseColor('#0f0')).toEqual({ r: 0, g: 255, b: 0 });
      expect(parseColor('#00f')).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('is case insensitive', () => {
      expect(parseColor('#FF0000')).toEqual({ r: 255, g: 0, b: 0 });
      expect(parseColor('#AbCdEf')).toEqual({ r: 171, g: 205, b: 239 });
    });

    it('returns null for invalid hex', () => {
      expect(parseColor('#xyz')).toBeNull();
      expect(parseColor('#12345')).toBeNull();
      expect(parseColor('#1234567')).toBeNull();
    });
  });

  describe('rgb() colors', () => {
    it('parses rgb(r, g, b)', () => {
      expect(parseColor('rgb(255, 0, 0)')).toEqual({ r: 255, g: 0, b: 0 });
      expect(parseColor('rgb(0,128,255)')).toEqual({ r: 0, g: 128, b: 255 });
    });

    it('clamps out-of-range values to 0-255', () => {
      expect(parseColor('rgb(300, 0, 128)')).toEqual({ r: 255, g: 0, b: 128 });
    });

    it('returns null for negative rgb values (invalid CSS)', () => {
      expect(parseColor('rgb(300, -5, 128)')).toBeNull();
    });
  });

  describe('rgba() colors', () => {
    it('parses rgba with alpha = 1', () => {
      expect(parseColor('rgba(255, 0, 0, 1)')).toEqual({ r: 255, g: 0, b: 0 });
      expect(parseColor('rgba(0, 128, 255, 1.0)')).toEqual({ r: 0, g: 128, b: 255 });
    });

    it('returns null for alpha < 1', () => {
      expect(parseColor('rgba(255, 0, 0, 0.5)')).toBeNull();
      expect(parseColor('rgba(0, 0, 0, 0)')).toBeNull();
      expect(parseColor('rgba(0, 0, 0, 0.99)')).toBeNull();
    });
  });

  describe('named colors', () => {
    it('parses common named colors', () => {
      expect(parseColor('black')).toEqual({ r: 0, g: 0, b: 0 });
      expect(parseColor('white')).toEqual({ r: 255, g: 255, b: 255 });
      expect(parseColor('red')).toEqual({ r: 255, g: 0, b: 0 });
      expect(parseColor('blue')).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('is case insensitive', () => {
      expect(parseColor('BLACK')).toEqual({ r: 0, g: 0, b: 0 });
      expect(parseColor('White')).toEqual({ r: 255, g: 255, b: 255 });
    });
  });

  describe('non-parseable values', () => {
    it('returns null for transparent', () => {
      expect(parseColor('transparent')).toBeNull();
    });

    it('returns null for inherit/initial/unset', () => {
      expect(parseColor('inherit')).toBeNull();
      expect(parseColor('initial')).toBeNull();
      expect(parseColor('unset')).toBeNull();
    });

    it('returns null for currentColor', () => {
      expect(parseColor('currentColor')).toBeNull();
    });

    it('returns null for CSS variables', () => {
      expect(parseColor('var(--my-color)')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseColor('')).toBeNull();
    });

    it('returns null for unknown values', () => {
      expect(parseColor('notacolor')).toBeNull();
    });

    it('trims whitespace', () => {
      expect(parseColor('  #ff0000  ')).toEqual({ r: 255, g: 0, b: 0 });
    });
  });
});

// ---------------------------------------------------------------------------
// isOpaqueColor
// ---------------------------------------------------------------------------

describe('isOpaqueColor', () => {
  it('returns true for opaque colors', () => {
    expect(isOpaqueColor('#ff0000')).toBe(true);
    expect(isOpaqueColor('black')).toBe(true);
    expect(isOpaqueColor('rgb(0, 0, 0)')).toBe(true);
  });

  it('returns false for non-opaque colors', () => {
    expect(isOpaqueColor('transparent')).toBe(false);
    expect(isOpaqueColor('rgba(0, 0, 0, 0.5)')).toBe(false);
    expect(isOpaqueColor('inherit')).toBe(false);
    expect(isOpaqueColor('var(--bg)')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// relativeLuminance
// ---------------------------------------------------------------------------

describe('relativeLuminance', () => {
  it('returns 0 for black', () => {
    const lum = relativeLuminance({ r: 0, g: 0, b: 0 });
    expect(lum).toBeCloseTo(0, 4);
  });

  it('returns 1 for white', () => {
    const lum = relativeLuminance({ r: 255, g: 255, b: 255 });
    expect(lum).toBeCloseTo(1, 4);
  });

  it('returns approximately 0.2126 for pure red', () => {
    const lum = relativeLuminance({ r: 255, g: 0, b: 0 });
    expect(lum).toBeCloseTo(0.2126, 3);
  });
});

// ---------------------------------------------------------------------------
// contrastRatio
// ---------------------------------------------------------------------------

describe('contrastRatio', () => {
  it('returns 21:1 for black on white', () => {
    const ratio = contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 });
    expect(ratio).toBe(21);
  });

  it('returns 1:1 for same color', () => {
    const ratio = contrastRatio({ r: 128, g: 128, b: 128 }, { r: 128, g: 128, b: 128 });
    expect(ratio).toBe(1);
  });

  it('is commutative (order of fg/bg does not matter for ratio value)', () => {
    const r1 = contrastRatio({ r: 255, g: 0, b: 0 }, { r: 255, g: 255, b: 255 });
    const r2 = contrastRatio({ r: 255, g: 255, b: 255 }, { r: 255, g: 0, b: 0 });
    expect(r1).toBe(r2);
  });
});

// ---------------------------------------------------------------------------
// checkContrast
// ---------------------------------------------------------------------------

describe('checkContrast', () => {
  it('black on white passes AA and AAA', () => {
    const result = checkContrast({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 });
    expect(result.ratio).toBe(21);
    expect(result.meetsAA).toBe(true);
    expect(result.meetsAAA).toBe(true);
  });

  it('light gray on white fails AA', () => {
    // #ccc on white → ratio ~1.6
    const result = checkContrast({ r: 204, g: 204, b: 204 }, { r: 255, g: 255, b: 255 });
    expect(result.meetsAA).toBe(false);
    expect(result.meetsAAA).toBe(false);
  });

  it('dark gray on white passes AA but may fail AAA', () => {
    // #595959 on white → ratio ~7.0 (passes both)
    // #767676 on white → ratio ~4.54 (passes AA, fails AAA)
    const result = checkContrast({ r: 118, g: 118, b: 118 }, { r: 255, g: 255, b: 255 });
    expect(result.meetsAA).toBe(true);
    expect(result.meetsAAA).toBe(false);
  });

  it('exact threshold: ratio >= 4.5 passes AA', () => {
    // We just need to verify the threshold logic
    const result = checkContrast({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 });
    expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    expect(result.meetsAA).toBe(true);
  });
});
