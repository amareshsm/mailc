import { describe, it, expect } from 'vitest';
import { resolveTheme, remToPx } from '../../src/css/theme-resolver.js';
import { DEFAULT_THEME } from '../../src/css/theme-defaults.js';

// ---------------------------------------------------------------------------
// resolveTheme — no user config
// ---------------------------------------------------------------------------

describe('resolveTheme — defaults', () => {
  it('returns DEFAULT_THEME when no config is provided', () => {
    const theme = resolveTheme();
    expect(theme).toBe(DEFAULT_THEME);
  });

  it('returns DEFAULT_THEME when extend is undefined', () => {
    const theme = resolveTheme({});
    expect(theme).toBe(DEFAULT_THEME);
  });
});

// ---------------------------------------------------------------------------
// resolveTheme — extend merging
// ---------------------------------------------------------------------------

describe('resolveTheme — extend merging', () => {
  it('adds custom spacing values', () => {
    const theme = resolveTheme({ extend: { spacing: { 'section': '40px' } } });
    expect(theme.spacing['section']).toBe('40px');
    // Default values preserved
    expect(theme.spacing['4']).toBe('16px');
  });

  it('adds custom fontSize values', () => {
    const theme = resolveTheme({
      extend: { fontSize: { 'email-heading': '28px' } },
    });
    expect(theme.fontSize['email-heading']).toBe('28px');
    expect(theme.fontSize['base']).toBe('16px');
  });

  it('overrides existing fontSize value', () => {
    const theme = resolveTheme({
      extend: { fontSize: { 'base': '18px' } },
    });
    expect(theme.fontSize['base']).toBe('18px');
  });

  it('merges fontFamily (user replaces per key)', () => {
    const theme = resolveTheme({
      extend: { fontFamily: { email: ['Inter', 'Arial', 'sans-serif'] } },
    });
    expect(theme.fontFamily['email']).toEqual(['Inter', 'Arial', 'sans-serif']);
    expect(theme.fontFamily['sans']).toEqual(['Arial', 'Helvetica', 'sans-serif']);
  });

  it('merges fontWeight values', () => {
    const theme = resolveTheme({
      extend: { fontWeight: { 'custom': '450' } },
    });
    expect(theme.fontWeight['custom']).toBe('450');
    expect(theme.fontWeight['bold']).toBe('700');
  });

  it('merges borderRadius values', () => {
    const theme = resolveTheme({
      extend: { borderRadius: { 'btn': '10px' } },
    });
    expect(theme.borderRadius['btn']).toBe('10px');
    expect(theme.borderRadius['DEFAULT']).toBe('4px');
  });
});

// ---------------------------------------------------------------------------
// resolveTheme — color merging
// ---------------------------------------------------------------------------

describe('resolveTheme — color merging', () => {
  it('adds flat custom colors', () => {
    const theme = resolveTheme({
      extend: { colors: { brand: '#e85d3a' } },
    });
    expect(theme.colors['brand']).toBe('#e85d3a');
    expect(theme.colors['white']).toBe('#ffffff');
  });

  it('adds nested custom colors', () => {
    const theme = resolveTheme({
      extend: {
        colors: {
          brand: { DEFAULT: '#e85d3a', dark: '#c4432a', light: '#ff8a65' },
        },
      },
    });
    const brand = theme.colors['brand'] as Record<string, string>;
    expect(brand['DEFAULT']).toBe('#e85d3a');
    expect(brand['dark']).toBe('#c4432a');
    expect(brand['light']).toBe('#ff8a65');
  });

  it('deep-merges nested colors with defaults', () => {
    const theme = resolveTheme({
      extend: { colors: { gray: { '950': '#000000' } } },
    });
    const gray = theme.colors['gray'] as Record<string, string>;
    expect(gray['950']).toBe('#000000'); // overridden
    expect(gray['500']).toBe('#6b7280'); // preserved
  });

  it('flat color overrides nested object', () => {
    const theme = resolveTheme({
      extend: { colors: { gray: '#888888' } },
    });
    expect(theme.colors['gray']).toBe('#888888');
  });
});

// ---------------------------------------------------------------------------
// resolveTheme — rem → px conversion
// ---------------------------------------------------------------------------

describe('resolveTheme — rem to px conversion', () => {
  it('converts rem spacing values to px', () => {
    const theme = resolveTheme({
      extend: { spacing: { 'custom': '1.5rem' } },
    });
    expect(theme.spacing['custom']).toBe('24px');
  });

  it('converts rem fontSize values to px', () => {
    const theme = resolveTheme({
      extend: { fontSize: { 'custom': '2rem' } },
    });
    expect(theme.fontSize['custom']).toBe('32px');
  });

  it('leaves px values unchanged', () => {
    const theme = resolveTheme({
      extend: { spacing: { 'custom': '20px' } },
    });
    expect(theme.spacing['custom']).toBe('20px');
  });
});

// ---------------------------------------------------------------------------
// remToPx (unit)
// ---------------------------------------------------------------------------

describe('remToPx', () => {
  it('converts 1rem to 16px', () => {
    expect(remToPx('1rem')).toBe('16px');
  });

  it('converts 0.5rem to 8px', () => {
    expect(remToPx('0.5rem')).toBe('8px');
  });

  it('converts 2.5rem to 40px', () => {
    expect(remToPx('2.5rem')).toBe('40px');
  });

  it('returns px values unchanged', () => {
    expect(remToPx('16px')).toBe('16px');
  });

  it('returns plain numbers unchanged', () => {
    expect(remToPx('1.5')).toBe('1.5');
  });

  it('returns named values unchanged', () => {
    expect(remToPx('auto')).toBe('auto');
  });
});
