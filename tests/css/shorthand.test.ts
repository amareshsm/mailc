/**
 * Tests for the CSS shorthand expander.
 *
 * @module tests/css/shorthand
 */
import { describe, it, expect } from 'vitest';
import { expandShorthand, expandAllShorthands } from '../../src/css/shorthand.js';
import type { CSSProperty } from '../../src/types.js';

// ---------------------------------------------------------------------------
// expandShorthand — single property
// ---------------------------------------------------------------------------

describe('expandShorthand', () => {
  // ── Non-shorthand passthrough ──────────────────────────────────────────

  describe('non-shorthand properties', () => {
    it('returns the original property unchanged for color', () => {
      const result = expandShorthand({ property: 'color', value: '#fff' });
      expect(result).toEqual([{ property: 'color', value: '#fff' }]);
    });

    it('returns the original property unchanged for font-size', () => {
      const result = expandShorthand({ property: 'font-size', value: '16px' });
      expect(result).toEqual([{ property: 'font-size', value: '16px' }]);
    });

    it('returns the original property unchanged for display', () => {
      const result = expandShorthand({ property: 'display', value: 'block' });
      expect(result).toEqual([{ property: 'display', value: 'block' }]);
    });
  });

  // ── Margin shorthand ──────────────────────────────────────────────────

  describe('margin shorthand', () => {
    it('expands single value to all four sides', () => {
      const result = expandShorthand({ property: 'margin', value: '10px' });
      expect(result).toEqual([
        { property: 'margin-top', value: '10px' },
        { property: 'margin-right', value: '10px' },
        { property: 'margin-bottom', value: '10px' },
        { property: 'margin-left', value: '10px' },
      ]);
    });

    it('expands two values to vertical/horizontal', () => {
      const result = expandShorthand({ property: 'margin', value: '10px 20px' });
      expect(result).toEqual([
        { property: 'margin-top', value: '10px' },
        { property: 'margin-right', value: '20px' },
        { property: 'margin-bottom', value: '10px' },
        { property: 'margin-left', value: '20px' },
      ]);
    });

    it('expands three values to top/horizontal/bottom', () => {
      const result = expandShorthand({ property: 'margin', value: '10px 20px 30px' });
      expect(result).toEqual([
        { property: 'margin-top', value: '10px' },
        { property: 'margin-right', value: '20px' },
        { property: 'margin-bottom', value: '30px' },
        { property: 'margin-left', value: '20px' },
      ]);
    });

    it('expands four values to each side', () => {
      const result = expandShorthand({ property: 'margin', value: '1px 2px 3px 4px' });
      expect(result).toEqual([
        { property: 'margin-top', value: '1px' },
        { property: 'margin-right', value: '2px' },
        { property: 'margin-bottom', value: '3px' },
        { property: 'margin-left', value: '4px' },
      ]);
    });

    it('handles 0 values', () => {
      const result = expandShorthand({ property: 'margin', value: '0' });
      expect(result).toEqual([
        { property: 'margin-top', value: '0' },
        { property: 'margin-right', value: '0' },
        { property: 'margin-bottom', value: '0' },
        { property: 'margin-left', value: '0' },
      ]);
    });
  });

  // ── Padding shorthand ─────────────────────────────────────────────────

  describe('padding shorthand', () => {
    it('expands single value to all four sides', () => {
      const result = expandShorthand({ property: 'padding', value: '8px' });
      expect(result).toEqual([
        { property: 'padding-top', value: '8px' },
        { property: 'padding-right', value: '8px' },
        { property: 'padding-bottom', value: '8px' },
        { property: 'padding-left', value: '8px' },
      ]);
    });

    it('expands two values correctly', () => {
      const result = expandShorthand({ property: 'padding', value: '16px 24px' });
      expect(result).toEqual([
        { property: 'padding-top', value: '16px' },
        { property: 'padding-right', value: '24px' },
        { property: 'padding-bottom', value: '16px' },
        { property: 'padding-left', value: '24px' },
      ]);
    });
  });

  // ── Border shorthand ──────────────────────────────────────────────────

  describe('border shorthand', () => {
    it('expands border: 1px solid #ccc', () => {
      const result = expandShorthand({ property: 'border', value: '1px solid #ccc' });
      expect(result).toEqual([
        { property: 'border-width', value: '1px' },
        { property: 'border-style', value: 'solid' },
        { property: 'border-color', value: '#ccc' },
      ]);
    });

    it('expands border with only width and style', () => {
      const result = expandShorthand({ property: 'border', value: '2px dashed' });
      expect(result).toEqual([
        { property: 'border-width', value: '2px' },
        { property: 'border-style', value: 'dashed' },
        { property: 'border-color', value: 'currentcolor' },
      ]);
    });

    it('expands border with only style', () => {
      const result = expandShorthand({ property: 'border', value: 'solid' });
      expect(result).toEqual([
        { property: 'border-width', value: 'medium' },
        { property: 'border-style', value: 'solid' },
        { property: 'border-color', value: 'currentcolor' },
      ]);
    });

    it('expands border: none', () => {
      const result = expandShorthand({ property: 'border', value: 'none' });
      expect(result).toEqual([
        { property: 'border-width', value: 'medium' },
        { property: 'border-style', value: 'none' },
        { property: 'border-color', value: 'currentcolor' },
      ]);
    });

    it('handles border with color keyword', () => {
      const result = expandShorthand({ property: 'border', value: '1px solid red' });
      expect(result).toEqual([
        { property: 'border-width', value: '1px' },
        { property: 'border-style', value: 'solid' },
        { property: 'border-color', value: 'red' },
      ]);
    });
  });

  // ── Border side shorthands ────────────────────────────────────────────

  describe('border-side shorthands', () => {
    it('expands border-top', () => {
      const result = expandShorthand({ property: 'border-top', value: '1px solid blue' });
      expect(result).toEqual([
        { property: 'border-top-width', value: '1px' },
        { property: 'border-top-style', value: 'solid' },
        { property: 'border-top-color', value: 'blue' },
      ]);
    });

    it('expands border-bottom', () => {
      const result = expandShorthand({ property: 'border-bottom', value: '2px dashed #333' });
      expect(result).toEqual([
        { property: 'border-bottom-width', value: '2px' },
        { property: 'border-bottom-style', value: 'dashed' },
        { property: 'border-bottom-color', value: '#333' },
      ]);
    });
  });

  // ── Background shorthand ──────────────────────────────────────────────

  describe('background shorthand', () => {
    it('expands background with just a color', () => {
      const result = expandShorthand({ property: 'background', value: '#fff' });
      expect(result).toEqual([{ property: 'background-color', value: '#fff' }]);
    });

    it('expands background with color and url', () => {
      const result = expandShorthand({ property: 'background', value: '#fff url(bg.jpg)' });
      expect(result).toEqual([
        { property: 'background-color', value: '#fff' },
        { property: 'background-image', value: 'url(bg.jpg)' },
      ]);
    });

    it('expands full background shorthand', () => {
      const result = expandShorthand({
        property: 'background',
        value: '#fff url(bg.jpg) center/cover no-repeat',
      });
      expect(result).toEqual([
        { property: 'background-color', value: '#fff' },
        { property: 'background-image', value: 'url(bg.jpg)' },
        { property: 'background-position', value: 'center' },
        { property: 'background-size', value: 'cover' },
        { property: 'background-repeat', value: 'no-repeat' },
      ]);
    });

    it('expands background with repeat only', () => {
      const result = expandShorthand({ property: 'background', value: 'repeat-x' });
      expect(result).toEqual([{ property: 'background-repeat', value: 'repeat-x' }]);
    });
  });

  // ── Font shorthand ────────────────────────────────────────────────────

  describe('font shorthand', () => {
    it('expands font with size and family', () => {
      const result = expandShorthand({ property: 'font', value: '16px Arial' });
      expect(result).toEqual([
        { property: 'font-size', value: '16px' },
        { property: 'font-family', value: 'Arial' },
      ]);
    });

    it('expands font with style, weight, size/line-height, and family', () => {
      const result = expandShorthand({
        property: 'font',
        value: 'italic bold 16px/1.5 Arial, sans-serif',
      });
      expect(result).toEqual([
        { property: 'font-style', value: 'italic' },
        { property: 'font-weight', value: 'bold' },
        { property: 'font-size', value: '16px' },
        { property: 'line-height', value: '1.5' },
        { property: 'font-family', value: 'Arial, sans-serif' },
      ]);
    });

    it('expands font with weight and size', () => {
      const result = expandShorthand({ property: 'font', value: '700 14px Georgia' });
      expect(result).toEqual([
        { property: 'font-weight', value: '700' },
        { property: 'font-size', value: '14px' },
        { property: 'font-family', value: 'Georgia' },
      ]);
    });
  });
});

// ---------------------------------------------------------------------------
// expandAllShorthands — batch expansion
// ---------------------------------------------------------------------------

describe('expandAllShorthands', () => {
  it('expands shorthands and passes through non-shorthands', () => {
    const props: CSSProperty[] = [
      { property: 'color', value: '#000' },
      { property: 'margin', value: '10px 20px' },
      { property: 'font-size', value: '16px' },
    ];
    const result = expandAllShorthands(props);
    expect(result).toEqual([
      { property: 'color', value: '#000' },
      { property: 'margin-top', value: '10px' },
      { property: 'margin-right', value: '20px' },
      { property: 'margin-bottom', value: '10px' },
      { property: 'margin-left', value: '20px' },
      { property: 'font-size', value: '16px' },
    ]);
  });

  it('returns empty array for empty input', () => {
    expect(expandAllShorthands([])).toEqual([]);
  });

  it('handles multiple shorthands in one call', () => {
    const props: CSSProperty[] = [
      { property: 'border', value: '1px solid #ccc' },
      { property: 'padding', value: '8px' },
    ];
    const result = expandAllShorthands(props);
    expect(result).toHaveLength(7); // 3 border + 4 padding
    expect(result[0]).toEqual({ property: 'border-width', value: '1px' });
    expect(result[3]).toEqual({ property: 'padding-top', value: '8px' });
  });
});
