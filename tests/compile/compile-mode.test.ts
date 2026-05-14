/**
 * Tests for strict/liberal compile mode.
 *
 * Covers:
 * - shadow-* and opacity-* CSS generation (now ENHANCE, not rejected)
 * - Liberal mode: ENHANCE → inlined, no warning (Gmail gets it in style attr)
 * - Strict mode: ENHANCE → stripped, ENHANCE_PROPERTY_STRIPPED warning
 * - Dynamic classification: targetClients changes ENHANCE ↔ SAFE
 * - NO_EFFECT classes silently stripped with zero warnings
 */
import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compile.js';
import { inlineCSS } from '../../src/css/inliner.js';
import { resolveClass } from '../../src/css/resolver.js';
import { resolveTheme } from '../../src/css/theme-resolver.js';
import { buildClassificationMap } from '../../src/css/classifier.js';
import { ErrorCode } from '../../src/errors/codes.js';

const theme = resolveTheme();

// Minimal mc document for end-to-end tests
function doc(classes: string): string {
  return `<mc><mc-head><mc-title>Test</mc-title></mc-head><mc-body><mc-section><mc-column class="${classes}"><mc-text>Hi</mc-text></mc-column></mc-section></mc-body></mc>`;
}

// ---------------------------------------------------------------------------
// Shadow resolution
// ---------------------------------------------------------------------------

describe('shadow-* → box-shadow resolution', () => {
  it('shadow-sm resolves to box-shadow', () => {
    const r = resolveClass('shadow-sm', theme);
    expect(r.issue).toBeNull();
    expect(r.properties).toHaveLength(1);
    expect(r.properties[0]?.property).toBe('box-shadow');
    expect(r.properties[0]?.value).toContain('rgba');
  });

  it('shadow resolves to box-shadow', () => {
    const r = resolveClass('shadow', theme);
    expect(r.issue).toBeNull();
    expect(r.properties[0]?.property).toBe('box-shadow');
  });

  it('shadow-md resolves to box-shadow', () => {
    const r = resolveClass('shadow-md', theme);
    expect(r.issue).toBeNull();
    expect(r.properties[0]?.property).toBe('box-shadow');
  });

  it('shadow-lg resolves to box-shadow', () => {
    const r = resolveClass('shadow-lg', theme);
    expect(r.issue).toBeNull();
    expect(r.properties[0]?.property).toBe('box-shadow');
  });

  it('shadow-xl resolves to box-shadow', () => {
    const r = resolveClass('shadow-xl', theme);
    expect(r.issue).toBeNull();
    expect(r.properties[0]?.property).toBe('box-shadow');
  });

  it('shadow-2xl resolves to box-shadow', () => {
    const r = resolveClass('shadow-2xl', theme);
    expect(r.issue).toBeNull();
    expect(r.properties[0]?.property).toBe('box-shadow');
    expect(r.properties[0]?.value).toBe('0 25px 50px -12px rgba(0,0,0,0.25)');
  });

  it('shadow-inner resolves to inset box-shadow', () => {
    const r = resolveClass('shadow-inner', theme);
    expect(r.issue).toBeNull();
    expect(r.properties[0]?.value).toContain('inset');
  });

  it('shadow-none resolves to no-op box-shadow', () => {
    const r = resolveClass('shadow-none', theme);
    expect(r.issue).toBeNull();
    expect(r.properties[0]?.value).toBe('0 0 #0000');
  });

  it('shadow-[0_4px_8px_rgba(0,0,0,0.5)] resolves arbitrary value', () => {
    const r = resolveClass('shadow-[0_4px_8px_rgba(0,0,0,0.5)]', theme);
    expect(r.issue).toBeNull();
    expect(r.properties[0]?.property).toBe('box-shadow');
    expect(r.properties[0]?.value).toBe('0 4px 8px rgba(0,0,0,0.5)');
  });
});

// ---------------------------------------------------------------------------
// Opacity resolution
// ---------------------------------------------------------------------------

describe('opacity-* → opacity resolution', () => {
  it('opacity-0 → opacity: 0', () => {
    const r = resolveClass('opacity-0', theme);
    expect(r.issue).toBeNull();
    expect(r.properties[0]?.property).toBe('opacity');
    expect(r.properties[0]?.value).toBe('0');
  });

  it('opacity-50 → opacity: 0.5', () => {
    const r = resolveClass('opacity-50', theme);
    expect(r.issue).toBeNull();
    expect(r.properties[0]?.value).toBe('0.5');
  });

  it('opacity-75 → opacity: 0.75', () => {
    const r = resolveClass('opacity-75', theme);
    expect(r.issue).toBeNull();
    expect(r.properties[0]?.value).toBe('0.75');
  });

  it('opacity-100 → opacity: 1', () => {
    const r = resolveClass('opacity-100', theme);
    expect(r.issue).toBeNull();
    expect(r.properties[0]?.value).toBe('1');
  });

  it('opacity-[0.85] resolves arbitrary value', () => {
    const r = resolveClass('opacity-[0.85]', theme);
    expect(r.issue).toBeNull();
    expect(r.properties[0]?.property).toBe('opacity');
    expect(r.properties[0]?.value).toBe('0.85');
  });
});

// ---------------------------------------------------------------------------
// NO_EFFECT classes — silently stripped
// ---------------------------------------------------------------------------

describe('NO_EFFECT classes — silently stripped with no warning', () => {
  const NO_EFFECT_CLASSES = [
    'transition-all', 'transition-colors', 'transition-opacity',
    'animate-spin', 'animate-pulse', 'animate-bounce',
    'cursor-pointer', 'cursor-default',
    'rotate-45', 'scale-110',
  ];

  for (const cls of NO_EFFECT_CLASSES) {
    it(`${cls} produces no properties and no issue`, () => {
      const r = resolveClass(cls, theme);
      expect(r.properties).toHaveLength(0);
      expect(r.issue).toBeNull();
    });
  }

  it('inlineCSS with transition-all emits zero warnings', () => {
    const r = inlineCSS('bg-white transition-all', theme);
    expect(r.warnings).toHaveLength(0);
    expect(r.inlineStyle).toContain('background-color');
  });
});

// ---------------------------------------------------------------------------
// Liberal mode (default) — ENHANCE inlined, no warning
// ---------------------------------------------------------------------------

describe('liberal mode (default) — ENHANCE → inline style', () => {
  it('shadow-2xl goes to inline style with 0 warnings (default targetClients)', () => {
    const r = compile(doc('shadow-2xl'), { templateStyle: 'class' });
    expect(r.warnings).toHaveLength(0);
    expect(r.html).toContain('box-shadow');
    // Should be in inline style attribute, not locked in a <style> block
    expect(r.html).toContain('style=');
  });

  it('opacity-50 goes to inline style with 0 warnings', () => {
    const r = compile(doc('opacity-50'), { templateStyle: 'class' });
    expect(r.warnings).toHaveLength(0);
    expect(r.html).toContain('opacity');
  });

  it('rounded-lg goes to inline style with 0 warnings', () => {
    const r = compile(doc('rounded-lg'), { templateStyle: 'class' });
    expect(r.warnings).toHaveLength(0);
    expect(r.html).toContain('border-radius');
  });

  it('explicit compatibilityMode: liberal behaves identically to default', () => {
    const defaultResult = compile(doc('shadow-2xl'), { templateStyle: 'class' });
    const explicitLiberal = compile(doc('shadow-2xl'), { compatibilityMode: 'liberal', templateStyle: 'class' });
    expect(defaultResult.html).toBe(explicitLiberal.html);
    expect(defaultResult.warnings).toHaveLength(0);
    expect(explicitLiberal.warnings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Strict mode — ENHANCE → stripped + ENHANCE_PROPERTY_STRIPPED warning
// ---------------------------------------------------------------------------

describe('strict mode — ENHANCE → stripped with warning', () => {
  it('shadow-2xl is stripped in strict mode with default targetClients', () => {
    const r = compile(doc('shadow-2xl'), { compatibilityMode: 'strict', targetClients: 'default', templateStyle: 'class' });
    // box-shadow should NOT appear anywhere (not inline, not in style block)
    expect(r.html).not.toContain('box-shadow');
    // Must emit ENHANCE_PROPERTY_STRIPPED warning
    const warn = r.warnings.find((w) => w.code === ErrorCode.ENHANCE_PROPERTY_STRIPPED);
    expect(warn).toBeDefined();
    expect(warn?.message).toContain('box-shadow');
    expect(warn?.severity).toBe('warning');
  });

  it('opacity-50 is stripped in strict mode', () => {
    const r = compile(doc('opacity-50'), { compatibilityMode: 'strict', targetClients: 'default', templateStyle: 'class' });
    expect(r.html).not.toContain('opacity:');
    const warn = r.warnings.find((w) => w.code === ErrorCode.ENHANCE_PROPERTY_STRIPPED);
    expect(warn).toBeDefined();
    expect(warn?.message).toContain('opacity');
  });

  it('rounded-lg is stripped in strict mode with default targetClients (Outlook strips border-radius)', () => {
    const r = compile(doc('rounded-lg'), { compatibilityMode: 'strict', targetClients: 'default', templateStyle: 'class' });
    expect(r.html).not.toContain('border-radius');
    const warn = r.warnings.find((w) => w.code === ErrorCode.ENHANCE_PROPERTY_STRIPPED);
    expect(warn).toBeDefined();
  });

  it('SAFE properties are untouched in strict mode', () => {
    const r = compile(doc('bg-white text-black p-4'), { compatibilityMode: 'strict', targetClients: 'default', templateStyle: 'class' });
    expect(r.warnings.filter((w) => w.code === ErrorCode.ENHANCE_PROPERTY_STRIPPED)).toHaveLength(0);
    expect(r.html).toContain('background-color');
    expect(r.html).toContain('color');
    expect(r.html).toContain('padding');
  });

  it('strict mode warning message mentions compatibilityMode: strict', () => {
    const r = compile(doc('shadow-lg'), { compatibilityMode: 'strict', targetClients: 'default', templateStyle: 'class' });
    const warn = r.warnings.find((w) => w.code === ErrorCode.ENHANCE_PROPERTY_STRIPPED);
    expect(warn?.message).toContain('strict');
  });
});

// ---------------------------------------------------------------------------
// Dynamic classification: targetClients changes ENHANCE ↔ SAFE
// ---------------------------------------------------------------------------

describe('dynamic classification — targetClients affects ENHANCE/SAFE split', () => {
  it('box-shadow is SAFE for apple-mail.macos (full support)', () => {
    // apple-mail.macos fully supports box-shadow — verified against live caniemail data
    const map = buildClassificationMap(['apple-mail.macos']);
    expect(map.get('box-shadow')).toBe('SAFE');
  });

  it('box-shadow is ENHANCE for gmail.desktop-webmail (no support)', () => {
    const map = buildClassificationMap(['gmail.desktop-webmail']);
    expect(map.get('box-shadow')).toBe('ENHANCE');
  });

  it('box-shadow is ENHANCE for default targetClients (outlook strips it)', () => {
    const map = buildClassificationMap(['gmail.*', 'apple-mail.*', 'outlook.*', 'yahoo.*', 'samsung-email.android']);
    expect(map.get('box-shadow')).toBe('ENHANCE');
  });

  it('inlineCSS liberal: box-shadow inlined for gmail target (ENHANCE → inline)', () => {
    const classificationMap = buildClassificationMap(['gmail.desktop-webmail']);
    const r = inlineCSS('shadow-2xl', theme, {}, classificationMap, 'liberal');
    expect(r.inlineStyle).toContain('box-shadow');
    expect(r.warnings).toHaveLength(0);
  });

  it('inlineCSS strict: box-shadow stripped with warning for gmail target', () => {
    const classificationMap = buildClassificationMap(['gmail.desktop-webmail']);
    const r = inlineCSS('shadow-2xl', theme, {}, classificationMap, 'strict');
    expect(r.inlineStyle).not.toContain('box-shadow');
    const warn = r.warnings.find((w) => w.code === ErrorCode.ENHANCE_PROPERTY_STRIPPED);
    expect(warn).toBeDefined();
  });

  it('inlineCSS strict: box-shadow NOT stripped for apple-mail.macos (SAFE)', () => {
    // When targeting only apple-mail.macos, box-shadow is SAFE → not stripped in strict mode
    const classificationMap = buildClassificationMap(['apple-mail.macos']);
    const r = inlineCSS('shadow-2xl', theme, {}, classificationMap, 'strict');
    // SAFE → goes to inlineStyle → no ENHANCE_PROPERTY_STRIPPED
    expect(r.warnings.filter((w) => w.code === ErrorCode.ENHANCE_PROPERTY_STRIPPED)).toHaveLength(0);
    expect(r.inlineStyle).toContain('box-shadow');
  });

  it('end-to-end: strict mode with gmail target strips shadow-2xl', () => {
    const r = compile(doc('shadow-2xl'), {
      compatibilityMode: 'strict',
      targetClients: ['gmail.desktop-webmail'],
      templateStyle: 'class',
    });
    expect(r.html).not.toContain('box-shadow');
    expect(r.warnings.some((w) => w.code === ErrorCode.ENHANCE_PROPERTY_STRIPPED)).toBe(true);
  });

  it('end-to-end: liberal mode with gmail target inlines shadow-2xl', () => {
    const r = compile(doc('shadow-2xl'), {
      compatibilityMode: 'liberal',
      targetClients: ['gmail.desktop-webmail'],
      templateStyle: 'class',
    });
    expect(r.html).toContain('box-shadow');
    expect(r.warnings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// inlineCSS unit: mode parameter
// ---------------------------------------------------------------------------

describe('inlineCSS() — mode parameter', () => {
  it('liberal: ENHANCE properties inlined (in inlineStyle)', () => {
    const r = inlineCSS('rounded-lg', theme, {}, undefined, 'liberal');
    expect(r.inlineStyle).toContain('border-radius');
    expect(r.warnings.filter((w) => w.code === ErrorCode.ENHANCE_PROPERTY_STRIPPED)).toHaveLength(0);
  });

  it('strict: ENHANCE not in inlineStyle, warning emitted', () => {
    const r = inlineCSS('rounded-lg', theme, {}, undefined, 'strict');
    expect(r.inlineStyle).not.toContain('border-radius');
    const warn = r.warnings.find((w) => w.code === ErrorCode.ENHANCE_PROPERTY_STRIPPED);
    expect(warn).toBeDefined();
    expect(warn?.message).toContain('border-radius');
  });

  it('strict: SAFE properties are unaffected', () => {
    const r = inlineCSS('bg-white p-4 rounded-lg', theme, {}, undefined, 'strict');
    expect(r.inlineStyle).toContain('background-color');
    expect(r.inlineStyle).toContain('padding');
    expect(r.inlineStyle).not.toContain('border-radius');
  });
});
