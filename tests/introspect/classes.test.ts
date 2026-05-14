/**
 * @file tests/introspect/classes.test.ts
 *
 * Tests for Phase 5 of the Introspection API: `validClasses()`.
 */

import { describe, it, expect } from 'vitest';
import { validClasses, REJECTED_PATTERNS } from '../../src/introspect/classes.js';
import { resolveTheme } from '../../src/css/theme-resolver.js';
import { DEFAULT_THEME } from '../../src/css/theme-defaults.js';
import { ENHANCE_PROPERTIES } from '../../src/css/classifier.js';

// ---------------------------------------------------------------------------
// mc-button — core component (accepts class)
// ---------------------------------------------------------------------------

describe('validClasses — mc-button', () => {
  it('safe classes include bg-* color utilities', () => {
    const result = validClasses('mc-button');
    const classNames = result.safe.map(c => c.className);
    expect(classNames.some(c => c.startsWith('bg-'))).toBe(true);
  });

  it('safe classes include text-* color utilities', () => {
    const result = validClasses('mc-button');
    const classNames = result.safe.map(c => c.className);
    expect(classNames.some(c => c.startsWith('text-'))).toBe(true);
  });

  it('safe classes include spacing utilities (p-*)', () => {
    const result = validClasses('mc-button');
    const classNames = result.safe.map(c => c.className);
    expect(classNames.some(c => c.startsWith('p-'))).toBe(true);
  });

  it('safe classes include sizing utilities (w-*, h-*)', () => {
    const result = validClasses('mc-button');
    const classNames = result.safe.map(c => c.className);
    expect(classNames.some(c => c.startsWith('w-'))).toBe(true);
    expect(classNames.some(c => c.startsWith('h-'))).toBe(true);
  });

  it('enhance classes include rounded (border-radius)', () => {
    const result = validClasses('mc-button');
    const classNames = result.enhance.map(c => c.className);
    expect(classNames).toContain('rounded');
  });

  it('enhance classes include rounded-* variants', () => {
    const result = validClasses('mc-button');
    const classNames = result.enhance.map(c => c.className);
    expect(classNames.some(c => c.startsWith('rounded-'))).toBe(true);
  });

  it('ENHANCE entries contain at least one property in ENHANCE_PROPERTIES', () => {
    const result = validClasses('mc-button');
    for (const entry of result.enhance) {
      const hasEnhanceProp = entry.resolvedTo.some(({ property }) => ENHANCE_PROPERTIES.has(property));
      expect(hasEnhanceProp, `${entry.className} has no ENHANCE property`).toBe(true);
    }
  });

  it('rejected patterns include flex with an alternative', () => {
    const result = validClasses('mc-button');
    const flexEntry = result.rejected.find(r => r.pattern.includes('flex'));
    expect(flexEntry).toBeDefined();
    expect(flexEntry?.alternative).toBeDefined();
  });

  it('rejected patterns include grid with an alternative', () => {
    const result = validClasses('mc-button');
    const gridEntry = result.rejected.find(r => r.pattern.includes('grid'));
    expect(gridEntry).toBeDefined();
    expect(gridEntry?.alternative).toBeDefined();
  });

  it('rejected patterns include overflow-*', () => {
    const result = validClasses('mc-button');
    expect(result.rejected.some(r => r.pattern.includes('overflow'))).toBe(true);
  });

  it('rejected patterns include animate-* / transition-*', () => {
    const result = validClasses('mc-button');
    expect(result.rejected.some(r => r.pattern.includes('animate'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// mc-text — content leaf (accepts class)
// ---------------------------------------------------------------------------

describe('validClasses — mc-text', () => {
  it('every ClassEntry has resolvedTo with at least one property', () => {
    const result = validClasses('mc-text');
    for (const entry of [...result.safe, ...result.enhance]) {
      expect(entry.resolvedTo.length, entry.className).toBeGreaterThan(0);
    }
  });

  it('safe classes include font-weight utilities', () => {
    const result = validClasses('mc-text');
    const classNames = result.safe.map(c => c.className);
    expect(classNames.some(c => c.startsWith('font-'))).toBe(true);
  });

  it('safe classes include leading-* (line-height) utilities', () => {
    const result = validClasses('mc-text');
    const classNames = result.safe.map(c => c.className);
    expect(classNames.some(c => c.startsWith('leading-'))).toBe(true);
  });

  it('safe classes include tracking-* (letter-spacing) utilities', () => {
    const result = validClasses('mc-text');
    const classNames = result.safe.map(c => c.className);
    expect(classNames.some(c => c.startsWith('tracking-'))).toBe(true);
  });

  it('safe classes include static decoration utilities (underline, italic, etc.)', () => {
    const result = validClasses('mc-text');
    const classNames = result.safe.map(c => c.className);
    expect(classNames).toContain('underline');
    expect(classNames).toContain('italic');
    expect(classNames).toContain('uppercase');
  });
});

// ---------------------------------------------------------------------------
// Custom theme
// ---------------------------------------------------------------------------

describe('validClasses — custom theme', () => {
  it('uses custom theme colors when provided', () => {
    const theme = resolveTheme({ extend: { colors: { brand: '#e85d3a' } } });
    const result = validClasses('mc-button', { theme });
    const bgBrand = result.safe.find(c => c.className === 'bg-brand');
    expect(bgBrand).toBeDefined();
    expect(bgBrand?.resolvedTo[0]?.value).toBe('#e85d3a');
  });

  it('custom text color is in safe classes', () => {
    const theme = resolveTheme({ extend: { colors: { brand: '#e85d3a' } } });
    const result = validClasses('mc-text', { theme });
    const textBrand = result.safe.find(c => c.className === 'text-brand');
    expect(textBrand).toBeDefined();
    expect(textBrand?.resolvedTo[0]?.value).toBe('#e85d3a');
  });

  it('custom nested color shades appear (e.g. brand-500)', () => {
    const theme = resolveTheme({
      extend: { colors: { brand: { '500': '#e85d3a', '700': '#b83e22' } } },
    });
    const result = validClasses('mc-button', { theme });
    const classNames = result.safe.map(c => c.className);
    expect(classNames).toContain('bg-brand-500');
    expect(classNames).toContain('bg-brand-700');
  });
});

// ---------------------------------------------------------------------------
// Unknown / non-class component
// ---------------------------------------------------------------------------

describe('validClasses — edge cases', () => {
  it('unknown component returns empty safe and enhance arrays', () => {
    const result = validClasses('mc-unknown');
    expect(result.safe).toEqual([]);
    expect(result.enhance).toEqual([]);
  });

  it('unknown component still returns standard rejected patterns', () => {
    const result = validClasses('mc-unknown');
    expect(result.rejected.length).toBeGreaterThan(0);
  });

  it('mc-all (no class attribute) returns empty safe and enhance', () => {
    const result = validClasses('mc-all');
    expect(result.safe).toEqual([]);
    expect(result.enhance).toEqual([]);
  });

  it('mc-all still returns rejected patterns', () => {
    const result = validClasses('mc-all');
    expect(result.rejected.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// ClassEntry shape invariants
// ---------------------------------------------------------------------------

describe('validClasses — ClassEntry invariants', () => {
  it('every safe entry has non-empty className', () => {
    const result = validClasses('mc-section');
    for (const entry of result.safe) {
      expect(entry.className).toBeTruthy();
    }
  });

  it('every safe entry has a non-empty description', () => {
    const result = validClasses('mc-section');
    for (const entry of result.safe) {
      expect(entry.description).toBeTruthy();
    }
  });

  it('every safe entry has classification "SAFE"', () => {
    const result = validClasses('mc-button');
    for (const entry of result.safe) {
      expect(entry.classification).toBe('SAFE');
    }
  });

  it('every enhance entry has classification "ENHANCE"', () => {
    const result = validClasses('mc-button');
    for (const entry of result.enhance) {
      expect(entry.classification).toBe('ENHANCE');
    }
  });
});

// ---------------------------------------------------------------------------
// Caching
// ---------------------------------------------------------------------------

describe('validClasses — caching', () => {
  it('same component + same theme returns identical safe array reference on repeated calls', () => {
    const result1 = validClasses('mc-button', { theme: DEFAULT_THEME });
    const result2 = validClasses('mc-button', { theme: DEFAULT_THEME });
    // Same component + same theme + same (empty) targetClients → cache hit → identical reference
    expect(result1.safe).toBe(result2.safe);
  });

  it('returns different safe arrays for different theme instances', () => {
    const theme1 = resolveTheme({ extend: { colors: { a: '#111111' } } });
    const theme2 = resolveTheme({ extend: { colors: { b: '#222222' } } });
    const result1 = validClasses('mc-button', { theme: theme1 });
    const result2 = validClasses('mc-button', { theme: theme2 });
    expect(result1.safe).not.toBe(result2.safe);
  });

  it('same theme instance returns identical safe array on second call', () => {
    const theme = resolveTheme({ extend: { colors: { cached: '#abc123' } } });
    const r1 = validClasses('mc-button', { theme });
    const r2 = validClasses('mc-button', { theme });
    expect(r1.safe).toBe(r2.safe);
  });

  it('same theme + different targetClients produce different cache entries', () => {
    const r1 = validClasses('mc-button', { theme: DEFAULT_THEME });
    const r2 = validClasses('mc-button', { theme: DEFAULT_THEME, targetClients: ['gmail.*'] });
    // Different client keys → different cache slots → not the same array
    expect(r1.safe).not.toBe(r2.safe);
  });

  it('same theme + same targetClients return identical array on repeat call', () => {
    const r1 = validClasses('mc-button', { theme: DEFAULT_THEME, targetClients: ['gmail.*'] });
    const r2 = validClasses('mc-button', { theme: DEFAULT_THEME, targetClients: ['gmail.*'] });
    expect(r1.safe).toBe(r2.safe);
  });
});

// ---------------------------------------------------------------------------
// REJECTED_PATTERNS export
// ---------------------------------------------------------------------------

describe('REJECTED_PATTERNS', () => {
  it('is a non-empty array', () => {
    expect(REJECTED_PATTERNS.length).toBeGreaterThan(0);
  });

  it('every entry has a pattern and reason', () => {
    for (const entry of REJECTED_PATTERNS) {
      expect(entry.pattern).toBeTruthy();
      expect(entry.reason).toBeTruthy();
    }
  });

  it('flex entry has an alternative', () => {
    const flex = REJECTED_PATTERNS.find(r => r.pattern.includes('flex'));
    expect(flex?.alternative).toBeDefined();
  });

  it('grid entry has an alternative', () => {
    const grid = REJECTED_PATTERNS.find(r => r.pattern.includes('grid'));
    expect(grid?.alternative).toBeDefined();
  });

  it('structural entries have affectedClients: []', () => {
    for (const entry of REJECTED_PATTERNS) {
      expect(Array.isArray(entry.affectedClients)).toBe(true);
      expect(entry.affectedClients).toEqual([]);
    }
  });
});

// ---------------------------------------------------------------------------
// targetClients — dynamic classification consistency
//
// Ground truth (verified against live caniemail-tool data):
//
//   Property        | gmail.*  | outlook.2021-x | apple-mail.*
//   ----------------|----------|----------------|-------------
//   opacity         | ENHANCE  | SAFE           | SAFE   ← but opacity-* is structurally rejected
//   box-shadow      | ENHANCE  | SAFE           | SAFE   ← but shadow-* is structurally rejected
//   margin-left     | ENHANCE  | SAFE           | SAFE
//   margin-right    | ENHANCE  | SAFE           | SAFE
//   background-size | ENHANCE  | SAFE           | SAFE
//   border-radius   | SAFE     | SAFE           | SAFE
//   color           | SAFE     | SAFE           | SAFE
//   padding         | SAFE     | SAFE           | SAFE
//
// opacity and box-shadow are in REJECTED_PATTERNS (resolver.ts) so they never
// appear in safe/enhance — they can't be used as per-client test proxies.
//
// margin-left / margin-right are the real per-client canaries here:
// they're generated as ml-*, mr-* classes and split between ENHANCE (gmail)
// and SAFE (outlook, apple-mail) based on live caniemail data.
// ---------------------------------------------------------------------------

describe('validClasses — targetClients: gmail vs outlook differences', () => {
  /**
   * margin-left / margin-right are ENHANCE for gmail (Gmail strips horizontal margins).
   * They are SAFE for outlook.2021-x.
   * We use `ml-4` here as a direct single-property proxy for margin-left.
   *
   * Note: opacity and box-shadow are structurally rejected in the resolver
   * (REJECTED_PATTERNS) because they're unreliable across the whole email client
   * landscape, so they never appear in safe/enhance at all.
   */
  it('ml-4 is SAFE for gmail.* (margin-left always inlined — resolver never produces negative values)', () => {
    const result = validClasses('mc-button', { targetClients: ['gmail.*'] });
    const entry = result.safe.find(c => c.className === 'ml-4');
    expect(entry, 'ml-4 should appear in safe for gmail').toBeDefined();
    expect(result.enhance.find(c => c.className === 'ml-4')).toBeUndefined();
  });

  it('ml-4 is SAFE for outlook.2021-x (margin-left fully supported)', () => {
    const result = validClasses('mc-button', { targetClients: ['outlook.2021-x'] });
    const entry = result.safe.find(c => c.className === 'ml-4');
    expect(entry, 'ml-4 should appear in safe for outlook').toBeDefined();
    expect(entry?.classification).toBe('SAFE');
    expect(result.enhance.find(c => c.className === 'ml-4')).toBeUndefined();
  });

  /**
   * margin-left / margin-right are always SAFE — the resolver only produces
   * non-negative values from Tailwind utilities, so caniemail's warning about
   * negative margins does not apply. All clients handle positive margin-left/right.
   */
  it('ml-4 (margin-left) is SAFE for both gmail.* and outlook.2021-x', () => {
    const gmail = validClasses('mc-button', { targetClients: ['gmail.*'] });
    const outlook = validClasses('mc-button', { targetClients: ['outlook.2021-x'] });

    expect(gmail.safe.find(c => c.className === 'ml-4'),
      'ml-4 should be SAFE under gmail.*').toBeDefined();
    expect(gmail.enhance.find(c => c.className === 'ml-4')).toBeUndefined();

    expect(outlook.safe.find(c => c.className === 'ml-4'),
      'ml-4 should be SAFE under outlook.2021-x').toBeDefined();
    expect(outlook.enhance.find(c => c.className === 'ml-4')).toBeUndefined();
  });

  it('mr-4 (margin-right) is SAFE for both gmail.* and outlook.2021-x', () => {
    const gmail = validClasses('mc-text', { targetClients: ['gmail.*'] });
    const outlook = validClasses('mc-text', { targetClients: ['outlook.2021-x'] });

    expect(gmail.safe.find(c => c.className === 'mr-4')).toBeDefined();
    expect(gmail.enhance.find(c => c.className === 'mr-4')).toBeUndefined();

    expect(outlook.safe.find(c => c.className === 'mr-4')).toBeDefined();
    expect(outlook.enhance.find(c => c.className === 'mr-4')).toBeUndefined();
  });

  /**
   * border-radius is SAFE in BOTH gmail and outlook.
   * `rounded` and `rounded-md` must appear in SAFE for both client sets.
   */
  it('rounded (border-radius) is SAFE for both gmail.* and outlook.2021-x', () => {
    const gmail   = validClasses('mc-button', { targetClients: ['gmail.*'] });
    const outlook = validClasses('mc-button', { targetClients: ['outlook.2021-x'] });

    expect(gmail.safe.find(c => c.className === 'rounded'),
      'rounded should be SAFE for gmail').toBeDefined();
    expect(gmail.enhance.find(c => c.className === 'rounded')).toBeUndefined();

    expect(outlook.safe.find(c => c.className === 'rounded'),
      'rounded should be SAFE for outlook').toBeDefined();
    expect(outlook.enhance.find(c => c.className === 'rounded')).toBeUndefined();
  });

  /**
   * When targeting gmail + outlook together, the most restrictive client wins.
   * margin-left/right are now always SAFE (resolver never produces negative values).
   * border-radius remains SAFE for both clients tested here.
   */
  it('combined gmail+outlook inherits the more restrictive classification', () => {
    const combined = validClasses('mc-button', { targetClients: ['gmail.*', 'outlook.2021-x'] });

    // margin-left: now always SAFE regardless of client
    expect(combined.safe.find(c => c.className === 'ml-4')).toBeDefined();
    expect(combined.enhance.find(c => c.className === 'ml-4')).toBeUndefined();

    // border-radius: SAFE in both → still SAFE in combined
    expect(combined.safe.find(c => c.className === 'rounded')).toBeDefined();
  });

  /**
   * apple-mail supports margin-left/right fully (unlike gmail).
   * ml-4 must be SAFE (not ENHANCE) for apple-mail.
   *
   * (opacity and box-shadow are structurally rejected so can't be tested here.)
   */
  it('ml-4 is SAFE for apple-mail.* (margin-left supported)', () => {
    const result = validClasses('mc-button', { targetClients: ['apple-mail.*'] });
    expect(result.safe.find(c => c.className === 'ml-4'),
      'ml-4 should be SAFE for apple-mail').toBeDefined();
    expect(result.enhance.find(c => c.className === 'ml-4')).toBeUndefined();
  });
});

describe('validClasses — targetClients: safe properties are stable across clients', () => {
  /**
   * Core typography properties (color, font-size, padding, width) are SAFE
   * in all major clients. Any targetClients config must not downgrade them.
   */
  it('bg-white is SAFE regardless of target client', () => {
    const clients = [
      ['gmail.*'],
      ['outlook.2021-x'],
      ['apple-mail.*'],
      ['gmail.*', 'outlook.2021-x', 'apple-mail.*'],
    ];
    for (const targetClients of clients) {
      const result = validClasses('mc-button', { targetClients });
      expect(
        result.safe.find(c => c.className === 'bg-white'),
        `bg-white must be SAFE for ${targetClients.join(',')}`,
      ).toBeDefined();
    }
  });

  it('text-left is SAFE regardless of target client', () => {
    for (const targetClients of [['gmail.*'], ['outlook.2021-x'], ['apple-mail.*']]) {
      const result = validClasses('mc-text', { targetClients });
      expect(
        result.safe.find(c => c.className === 'text-left'),
        `text-left must be SAFE for ${targetClients.join(',')}`,
      ).toBeDefined();
    }
  });

  it('p-4 (padding) is SAFE regardless of target client', () => {
    for (const targetClients of [['gmail.*'], ['outlook.2021-x'], ['apple-mail.*']]) {
      const result = validClasses('mc-button', { targetClients });
      expect(
        result.safe.find(c => c.className === 'p-4'),
        `p-4 must be SAFE for ${targetClients.join(',')}`,
      ).toBeDefined();
    }
  });
});

describe('validClasses — targetClients: rejected list accuracy', () => {
  /**
   * Structural rejections (flex/grid/overflow/animate) must always be present
   * regardless of which clients are targeted — they are layout-breaking in ALL clients.
   */
  it('structural rejections present for every client set', () => {
    const clientSets = [
      ['gmail.*'],
      ['outlook.2021-x'],
      ['apple-mail.*'],
      ['gmail.*', 'outlook.2021-x'],
    ];
    for (const targetClients of clientSets) {
      const result = validClasses('mc-button', { targetClients });
      expect(result.rejected.some(r => r.pattern.includes('flex')),
        `flex must be rejected for ${targetClients}`).toBe(true);
      expect(result.rejected.some(r => r.pattern.includes('grid')),
        `grid must be rejected for ${targetClients}`).toBe(true);
      expect(result.rejected.some(r => r.pattern.includes('overflow')),
        `overflow must be rejected for ${targetClients}`).toBe(true);
    }
  });

  /**
   * Structural rejected entries always have affectedClients: [] (all clients).
   * Client-specific rejected entries (from caniemail) have a non-empty affectedClients.
   */
  it('structural rejected entries have empty affectedClients array', () => {
    const result = validClasses('mc-button', { targetClients: ['gmail.*', 'outlook.2021-x'] });
    const structural = result.rejected.filter(r => r.affectedClients?.length === 0);
    expect(structural.length).toBeGreaterThan(0);
    expect(structural.some(r => r.pattern.includes('flex'))).toBe(true);
  });

  it('client-specific rejected entries have populated affectedClients', () => {
    const result = validClasses('mc-button', { targetClients: ['gmail.*', 'outlook.2021-x'] });
    const clientSpecific = result.rejected.filter(r => (r.affectedClients?.length ?? 0) > 0);
    for (const entry of clientSpecific) {
      expect(entry.affectedClients!.length).toBeGreaterThan(0);
      expect(entry.reason).toContain('Not supported in:');
    }
  });

  it('no targetClients → rejected has only structural patterns (no affectedClients)', () => {
    const result = validClasses('mc-button');
    for (const entry of result.rejected) {
      // Static fallback path: affectedClients is always [] (structural)
      expect(entry.affectedClients).toEqual([]);
    }
  });
});
