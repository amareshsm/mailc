import { describe, it, expect } from 'vitest';
import { resolveClass, resolveColor } from '../../src/css/resolver.js';
import { resolveTheme } from '../../src/css/theme-resolver.js';
import { ErrorCode } from '../../src/errors/codes.js';
import type { ResolvedTheme } from '../../src/types.js';

/** Default theme for all tests. */
const theme = resolveTheme();

/** Theme with custom brand colors for nested color tests. */
const brandTheme = resolveTheme({
  extend: {
    colors: {
      brand: { DEFAULT: '#e85d3a', dark: '#c4432a', light: '#ff8a65' },
    },
    fontSize: {
      'email-heading': '28px',
    },
  },
});

/** Helper: resolve and return just the properties. */
function props(
  cls: string,
  t: ResolvedTheme = theme,
): { property: string; value: string }[] {
  return resolveClass(cls, t).properties.map(({ property, value }) => ({ property, value }));
}

/** Helper: resolve and return the issue. */
function issue(
  cls: string,
  t: ResolvedTheme = theme,
): ReturnType<typeof resolveClass>['issue'] {
  return resolveClass(cls, t).issue;
}

// ---------------------------------------------------------------------------
// Typography — text-*
// ---------------------------------------------------------------------------

describe('resolveClass — text-* (fontSize / color / alignment)', () => {
  it('resolves text-base to font-size: 16px', () => {
    expect(props('text-base')).toEqual([{ property: 'font-size', value: '16px' }]);
  });

  it('resolves text-lg to font-size: 18px', () => {
    expect(props('text-lg')).toEqual([{ property: 'font-size', value: '18px' }]);
  });

  it('resolves text-2xl to font-size: 24px', () => {
    expect(props('text-2xl')).toEqual([{ property: 'font-size', value: '24px' }]);
  });

  it('resolves text-red-500 to color', () => {
    expect(props('text-red-500')).toEqual([{ property: 'color', value: '#ef4444' }]);
  });

  it('resolves text-white to color', () => {
    expect(props('text-white')).toEqual([{ property: 'color', value: '#ffffff' }]);
  });

  it('resolves text-left to text-align', () => {
    expect(props('text-left')).toEqual([{ property: 'text-align', value: 'left' }]);
  });

  it('resolves text-center to text-align', () => {
    expect(props('text-center')).toEqual([{ property: 'text-align', value: 'center' }]);
  });

  it('resolves text-right to text-align', () => {
    expect(props('text-right')).toEqual([{ property: 'text-align', value: 'right' }]);
  });

  it('fontSize takes priority over color for text-* ambiguity', () => {
    // "base" is a fontSize key — should resolve as font-size, not color
    const result = props('text-base');
    expect(result[0]!.property).toBe('font-size');
  });

  it('resolves custom fontSize from theme', () => {
    expect(props('text-email-heading', brandTheme)).toEqual([
      { property: 'font-size', value: '28px' },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Arbitrary values: text-[…]
// ---------------------------------------------------------------------------

describe('resolveClass — arbitrary values', () => {
  it('resolves text-[#e85d3a] to color', () => {
    expect(props('text-[#e85d3a]')).toEqual([{ property: 'color', value: '#e85d3a' }]);
  });

  it('resolves text-[22px] to font-size', () => {
    expect(props('text-[22px]')).toEqual([{ property: 'font-size', value: '22px' }]);
  });

  it('resolves p-[20px] to padding longhands', () => {
    expect(props('p-[20px]')).toEqual([
      { property: 'padding-top', value: '20px' },
      { property: 'padding-right', value: '20px' },
      { property: 'padding-bottom', value: '20px' },
      { property: 'padding-left', value: '20px' },
    ]);
  });

  it('resolves bg-[#ff0000] to background-color', () => {
    expect(props('bg-[#ff0000]')).toEqual([{ property: 'background-color', value: '#ff0000' }]);
  });

  it('resolves w-[300px] to width', () => {
    expect(props('w-[300px]')).toEqual([{ property: 'width', value: '300px' }]);
  });

  it('resolves border-[#ccc] to border-color', () => {
    expect(props('border-[#ccc]')).toEqual([{ property: 'border-color', value: '#ccc' }]);
  });

  it('resolves rounded-[10px] to border-radius', () => {
    expect(props('rounded-[10px]')).toEqual([{ property: 'border-radius', value: '10px' }]);
  });

  it('resolves leading-[1.75] to line-height', () => {
    expect(props('leading-[1.75]')).toEqual([{ property: 'line-height', value: '1.75' }]);
  });
});

// ---------------------------------------------------------------------------
// Background
// ---------------------------------------------------------------------------

describe('resolveClass — bg-*', () => {
  it('resolves bg-white', () => {
    expect(props('bg-white')).toEqual([{ property: 'background-color', value: '#ffffff' }]);
  });

  it('resolves bg-blue-600', () => {
    expect(props('bg-blue-600')).toEqual([{ property: 'background-color', value: '#2563eb' }]);
  });

  it('resolves bg-transparent', () => {
    expect(props('bg-transparent')).toEqual([{ property: 'background-color', value: 'transparent' }]);
  });
});

// ---------------------------------------------------------------------------
// Font
// ---------------------------------------------------------------------------

describe('resolveClass — font-*', () => {
  it('resolves font-bold', () => {
    expect(props('font-bold')).toEqual([{ property: 'font-weight', value: '700' }]);
  });

  it('resolves font-semibold', () => {
    expect(props('font-semibold')).toEqual([{ property: 'font-weight', value: '600' }]);
  });

  it('resolves font-normal', () => {
    expect(props('font-normal')).toEqual([{ property: 'font-weight', value: '400' }]);
  });

  it('resolves font-sans to font-family', () => {
    expect(props('font-sans')).toEqual([
      { property: 'font-family', value: 'Arial, Helvetica, sans-serif' },
    ]);
  });

  it('resolves font-serif to font-family', () => {
    expect(props('font-serif')).toEqual([
      { property: 'font-family', value: 'Georgia, Times New Roman, serif' },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Spacing
// ---------------------------------------------------------------------------

describe('resolveClass — spacing (p-*, m-*)', () => {
  it('resolves p-4 to padding longhands: 16px', () => {
    expect(props('p-4')).toEqual([
      { property: 'padding-top', value: '16px' },
      { property: 'padding-right', value: '16px' },
      { property: 'padding-bottom', value: '16px' },
      { property: 'padding-left', value: '16px' },
    ]);
  });

  it('resolves py-4 to padding-top + padding-bottom', () => {
    expect(props('py-4')).toEqual([
      { property: 'padding-top', value: '16px' },
      { property: 'padding-bottom', value: '16px' },
    ]);
  });

  it('resolves px-8 to padding-left + padding-right', () => {
    expect(props('px-8')).toEqual([
      { property: 'padding-left', value: '32px' },
      { property: 'padding-right', value: '32px' },
    ]);
  });

  it('resolves pt-2 to padding-top', () => {
    expect(props('pt-2')).toEqual([{ property: 'padding-top', value: '8px' }]);
  });

  it('resolves mb-6 to margin-bottom', () => {
    expect(props('mb-6')).toEqual([{ property: 'margin-bottom', value: '24px' }]);
  });

  it('resolves mx-auto', () => {
    expect(props('mx-auto')).toEqual([
      { property: 'margin-left', value: 'auto' },
      { property: 'margin-right', value: 'auto' },
    ]);
  });

  it('resolves m-0 to margin longhands: 0px', () => {
    expect(props('m-0')).toEqual([
      { property: 'margin-top', value: '0px' },
      { property: 'margin-right', value: '0px' },
      { property: 'margin-bottom', value: '0px' },
      { property: 'margin-left', value: '0px' },
    ]);
  });

  it('resolves p-0 to padding longhands: 0px', () => {
    expect(props('p-0')).toEqual([
      { property: 'padding-top', value: '0px' },
      { property: 'padding-right', value: '0px' },
      { property: 'padding-bottom', value: '0px' },
      { property: 'padding-left', value: '0px' },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Sizing: w-*, h-*, max-w-*
// ---------------------------------------------------------------------------

describe('resolveClass — sizing', () => {
  it('resolves w-full to 100%', () => {
    expect(props('w-full')).toEqual([{ property: 'width', value: '100%' }]);
  });

  it('resolves w-1/2 to 50%', () => {
    expect(props('w-1/2')).toEqual([{ property: 'width', value: '50%' }]);
  });

  it('resolves w-1/3 to 33.333333%', () => {
    expect(props('w-1/3')).toEqual([{ property: 'width', value: '33.333333%' }]);
  });

  it('resolves w-2/3 to 66.666667%', () => {
    expect(props('w-2/3')).toEqual([{ property: 'width', value: '66.666667%' }]);
  });

  it('resolves w-4 to 16px (via spacing fallback)', () => {
    expect(props('w-4')).toEqual([{ property: 'width', value: '16px' }]);
  });

  it('resolves h-auto', () => {
    expect(props('h-auto')).toEqual([{ property: 'height', value: 'auto' }]);
  });

  it('resolves max-w-email to 600px', () => {
    expect(props('max-w-email')).toEqual([{ property: 'max-width', value: '600px' }]);
  });

  it('resolves max-w-full to 100%', () => {
    expect(props('max-w-full')).toEqual([{ property: 'max-width', value: '100%' }]);
  });
});

// ---------------------------------------------------------------------------
// Borders
// ---------------------------------------------------------------------------

describe('resolveClass — border-*', () => {
  it('resolves border to border-width: 1px', () => {
    expect(props('border')).toEqual([{ property: 'border-width', value: '1px' }]);
  });

  it('resolves border-2 to border-width: 2px', () => {
    expect(props('border-2')).toEqual([{ property: 'border-width', value: '2px' }]);
  });

  it('resolves border-t to border-top-width: 1px', () => {
    expect(props('border-t')).toEqual([{ property: 'border-top-width', value: '1px' }]);
  });

  it('resolves border-b-2 to border-bottom-width: 2px', () => {
    expect(props('border-b-2')).toEqual([{ property: 'border-bottom-width', value: '2px' }]);
  });

  it('resolves border-solid to border-style', () => {
    expect(props('border-solid')).toEqual([{ property: 'border-style', value: 'solid' }]);
  });

  it('resolves border-dashed', () => {
    expect(props('border-dashed')).toEqual([{ property: 'border-style', value: 'dashed' }]);
  });

  it('resolves border-red-500 to border-color', () => {
    expect(props('border-red-500')).toEqual([{ property: 'border-color', value: '#ef4444' }]);
  });

  it('resolves rounded to border-radius: 4px', () => {
    expect(props('rounded')).toEqual([{ property: 'border-radius', value: '4px' }]);
  });

  it('resolves rounded-lg to 8px', () => {
    expect(props('rounded-lg')).toEqual([{ property: 'border-radius', value: '8px' }]);
  });

  it('resolves rounded-full to 9999px', () => {
    expect(props('rounded-full')).toEqual([{ property: 'border-radius', value: '9999px' }]);
  });
});

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

describe('resolveClass — display', () => {
  it('resolves block', () => {
    expect(props('block')).toEqual([{ property: 'display', value: 'block' }]);
  });

  it('resolves inline-block', () => {
    expect(props('inline-block')).toEqual([{ property: 'display', value: 'inline-block' }]);
  });

  it('resolves hidden to display: none', () => {
    expect(props('hidden')).toEqual([{ property: 'display', value: 'none' }]);
  });
});

// ---------------------------------------------------------------------------
// Vertical align
// ---------------------------------------------------------------------------

describe('resolveClass — align-*', () => {
  it('resolves align-top', () => {
    expect(props('align-top')).toEqual([{ property: 'vertical-align', value: 'top' }]);
  });

  it('resolves align-middle', () => {
    expect(props('align-middle')).toEqual([{ property: 'vertical-align', value: 'middle' }]);
  });
});

// ---------------------------------------------------------------------------
// Text decoration + transform + style
// ---------------------------------------------------------------------------

describe('resolveClass — text decoration, transform, style', () => {
  it('resolves underline', () => {
    expect(props('underline')).toEqual([{ property: 'text-decoration', value: 'underline' }]);
  });

  it('resolves no-underline', () => {
    expect(props('no-underline')).toEqual([{ property: 'text-decoration', value: 'none' }]);
  });

  it('resolves line-through', () => {
    expect(props('line-through')).toEqual([{ property: 'text-decoration', value: 'line-through' }]);
  });

  it('resolves uppercase', () => {
    expect(props('uppercase')).toEqual([{ property: 'text-transform', value: 'uppercase' }]);
  });

  it('resolves lowercase', () => {
    expect(props('lowercase')).toEqual([{ property: 'text-transform', value: 'lowercase' }]);
  });

  it('resolves capitalize', () => {
    expect(props('capitalize')).toEqual([{ property: 'text-transform', value: 'capitalize' }]);
  });

  it('resolves italic', () => {
    expect(props('italic')).toEqual([{ property: 'font-style', value: 'italic' }]);
  });

  it('resolves not-italic', () => {
    expect(props('not-italic')).toEqual([{ property: 'font-style', value: 'normal' }]);
  });
});

// ---------------------------------------------------------------------------
// Leading + tracking
// ---------------------------------------------------------------------------

describe('resolveClass — leading-*, tracking-*', () => {
  it('resolves leading-normal to 1.5', () => {
    expect(props('leading-normal')).toEqual([{ property: 'line-height', value: '1.5' }]);
  });

  it('resolves leading-tight to 1.25', () => {
    expect(props('leading-tight')).toEqual([{ property: 'line-height', value: '1.25' }]);
  });

  it('resolves tracking-wide to 0.4px', () => {
    expect(props('tracking-wide')).toEqual([{ property: 'letter-spacing', value: '0.4px' }]);
  });

  it('resolves tracking-tighter to -0.8px', () => {
    expect(props('tracking-tighter')).toEqual([{ property: 'letter-spacing', value: '-0.8px' }]);
  });
});

// ---------------------------------------------------------------------------
// Whitespace
// ---------------------------------------------------------------------------

describe('resolveClass — whitespace', () => {
  it('resolves whitespace-nowrap', () => {
    expect(props('whitespace-nowrap')).toEqual([{ property: 'white-space', value: 'nowrap' }]);
  });

  it('resolves break-words', () => {
    expect(props('break-words')).toEqual([{ property: 'word-break', value: 'break-word' }]);
  });
});

// ---------------------------------------------------------------------------
// Nested color resolution
// ---------------------------------------------------------------------------

describe('resolveClass — nested colors', () => {
  it('resolves text-brand to DEFAULT color', () => {
    expect(props('text-brand', brandTheme)).toEqual([
      { property: 'color', value: '#e85d3a' },
    ]);
  });

  it('resolves text-brand-dark to nested shade', () => {
    expect(props('text-brand-dark', brandTheme)).toEqual([
      { property: 'color', value: '#c4432a' },
    ]);
  });

  it('resolves bg-brand-light to nested shade', () => {
    expect(props('bg-brand-light', brandTheme)).toEqual([
      { property: 'background-color', value: '#ff8a65' },
    ]);
  });
});

// ---------------------------------------------------------------------------
// resolveColor (exported helper)
// ---------------------------------------------------------------------------

describe('resolveColor', () => {
  it('resolves flat color', () => {
    expect(resolveColor('white', theme)).toBe('#ffffff');
  });

  it('resolves nested color', () => {
    expect(resolveColor('blue-500', theme)).toBe('#3b82f6');
  });

  it('resolves DEFAULT nested color', () => {
    expect(resolveColor('brand', brandTheme)).toBe('#e85d3a');
  });

  it('returns null for unknown color', () => {
    expect(resolveColor('nonexistent', theme)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Rejected utilities
// ---------------------------------------------------------------------------

describe('resolveClass — rejected utilities', () => {
  it('rejects flex', () => {
    const result = issue('flex');
    expect(result).not.toBeNull();
    expect(result!.code).toBe(ErrorCode.BREAKING_CSS);
    expect(result!.message).toContain('flex');
  });

  it('rejects grid', () => {
    expect(issue('grid')!.code).toBe(ErrorCode.BREAKING_CSS);
  });

  it('rejects absolute', () => {
    expect(issue('absolute')!.code).toBe(ErrorCode.BREAKING_CSS);
  });

  it('rejects items-center', () => {
    expect(issue('items-center')!.code).toBe(ErrorCode.BREAKING_CSS);
  });

  it('rejects justify-between', () => {
    expect(issue('justify-between')!.code).toBe(ErrorCode.BREAKING_CSS);
  });

  it('rejects float-left', () => {
    expect(issue('float-left')!.code).toBe(ErrorCode.BREAKING_CSS);
  });

  it('rejects z-10', () => {
    expect(issue('z-10')!.code).toBe(ErrorCode.BREAKING_CSS);
  });

  it('silently strips transition-all (NO_EFFECT — no issue emitted)', () => {
    const result = resolveClass('transition-all', theme);
    expect(result.properties).toHaveLength(0);
    expect(result.issue).toBeNull();
  });

  it('silently strips animate-spin (NO_EFFECT — no issue emitted)', () => {
    const result = resolveClass('animate-spin', theme);
    expect(result.properties).toHaveLength(0);
    expect(result.issue).toBeNull();
  });

  it('silently strips cursor-pointer (NO_EFFECT — no issue emitted)', () => {
    const result = resolveClass('cursor-pointer', theme);
    expect(result.properties).toHaveLength(0);
    expect(result.issue).toBeNull();
  });

  it('silently strips rotate-45 (NO_EFFECT — no issue emitted)', () => {
    const result = resolveClass('rotate-45', theme);
    expect(result.properties).toHaveLength(0);
    expect(result.issue).toBeNull();
  });

  it('silently strips scale-110 (NO_EFFECT — no issue emitted)', () => {
    const result = resolveClass('scale-110', theme);
    expect(result.properties).toHaveLength(0);
    expect(result.issue).toBeNull();
  });

  it('rejected utilities have helpful error messages', () => {
    const result = issue('flex');
    expect(result!.message).toContain('mc-section');
  });
});

// ---------------------------------------------------------------------------
// Unknown classes
// ---------------------------------------------------------------------------

describe('resolveClass — unknown classes', () => {
  it('returns UNKNOWN_CLASS warning for gibberish', () => {
    const result = issue('foobar');
    expect(result).not.toBeNull();
    expect(result!.code).toBe(ErrorCode.UNKNOWN_CLASS);
    expect(result!.severity).toBe('warning');
  });

  it('returns empty properties for unknown class', () => {
    expect(props('foobar')).toEqual([]);
  });
});
