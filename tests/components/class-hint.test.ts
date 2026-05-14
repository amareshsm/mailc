/**
 * @file tests/components/class-hint.test.ts
 *
 * Tests for `resolveClassHint()` — the helper that turns raw classHint
 * strings from COMPONENT_METADATA into substituted Tailwind classes ready
 * for emission in FixInstructions and compiler warnings.
 */

import { describe, it, expect } from 'vitest';
import { resolveClassHint } from '../../src/components/class-hint.js';

describe('resolveClassHint — placeholder substitution', () => {
  it('substitutes #value with the user attribute value (color)', () => {
    const r = resolveClassHint('bg-[#value]', '#0066cc');
    expect(r.canonical).toBe('bg-[#0066cc]');
    expect(r.alternatives).toEqual([]);
  });

  it('substitutes #value for css-value attrs (font-size)', () => {
    const r = resolveClassHint('text-[#value]', '24px');
    expect(r.canonical).toBe('text-[24px]');
  });

  it('substitutes #value for arbitrary spacing brackets (padding-top)', () => {
    const r = resolveClassHint('pt-[#value]', '20px');
    expect(r.canonical).toBe('pt-[20px]');
  });

  it('substitutes #value into enum-mapped classes (text-align)', () => {
    const r = resolveClassHint('text-#value', 'center');
    expect(r.canonical).toBe('text-center');
  });

  it('substitutes #value into vertical-align', () => {
    const r = resolveClassHint('align-#value', 'middle');
    expect(r.canonical).toBe('align-middle');
  });

  it('substitutes #value into font-weight', () => {
    const r = resolveClassHint('font-#value', 'bold');
    expect(r.canonical).toBe('font-bold');
  });
});

describe('resolveClassHint — alternatives', () => {
  it('splits on " or " and picks first as canonical', () => {
    const r = resolveClassHint('underline or no-underline', 'none');
    expect(r.canonical).toBe('underline');
    expect(r.alternatives).toEqual(['no-underline']);
  });

  it('splits on " | "', () => {
    const r = resolveClassHint('list-disc | list-decimal | list-none', 'disc');
    expect(r.canonical).toBe('list-disc');
    expect(r.alternatives).toEqual(['list-decimal', 'list-none']);
  });
});

describe('resolveClassHint — parenthetical prose stripping', () => {
  it('strips trailing parenthetical, keeps class form', () => {
    const r = resolveClassHint('bg-[#value] (applied to inner td)', '#f9f9f9');
    expect(r.canonical).toBe('bg-[#f9f9f9]');
  });

  it('returns empty when hint is pure prose (border shorthand)', () => {
    const r = resolveClassHint('(use style="border: 1px solid #ccc")', '1px solid red');
    expect(r.canonical).toBe('');
    expect(r.alternatives).toEqual([]);
  });

  it('returns empty when hint is mc-attributes prose (font-family)', () => {
    const r = resolveClassHint('(use mc-attributes for global font-family)', 'Arial');
    expect(r.canonical).toBe('');
  });
});

describe('resolveClassHint — edge cases', () => {
  it('returns empty result for undefined hint', () => {
    const r = resolveClassHint(undefined, 'whatever');
    expect(r.canonical).toBe('');
    expect(r.alternatives).toEqual([]);
  });

  it('returns empty result for empty hint string', () => {
    const r = resolveClassHint('', '16px');
    expect(r.canonical).toBe('');
  });

  it('handles undefined value — leaves placeholder substituted with empty string', () => {
    const r = resolveClassHint('bg-[#value]', undefined);
    expect(r.canonical).toBe('bg-[]');
  });

  it('preserves classes without #value placeholder unchanged', () => {
    const r = resolveClassHint('italic', 'italic');
    expect(r.canonical).toBe('italic');
  });
});
