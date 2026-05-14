import { describe, it, expect } from 'vitest';
import { levenshtein, fuzzyMatch, suggest } from '../../src/utils/fuzzy-match.js';

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('abc', 'abc')).toBe(0);
  });

  it('returns length of other string when one is empty', () => {
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', '')).toBe(3);
  });

  it('returns 0 for two empty strings', () => {
    expect(levenshtein('', '')).toBe(0);
  });

  it('handles single character difference', () => {
    expect(levenshtein('cat', 'bat')).toBe(1);
  });

  it('handles insertion', () => {
    expect(levenshtein('abc', 'abcd')).toBe(1);
  });

  it('handles deletion', () => {
    expect(levenshtein('abcd', 'abc')).toBe(1);
  });

  it('handles multiple edits', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
  });

  it('handles completely different strings', () => {
    expect(levenshtein('abc', 'xyz')).toBe(3);
  });
});

describe('fuzzyMatch', () => {
  const components = [
    'mc-body',
    'mc-section',
    'mc-column',
    'mc-text',
    'mc-image',
    'mc-button',
    'mc-divider',
    'mc-spacer',
    'mc-raw',
    'mc-preview',
    'mc-head',
    'mc-if',
    'mc-else-if',
    'mc-else',
    'mc-each',
  ];

  it('returns exact match with distance 0', () => {
    const result = fuzzyMatch('mc-text', components);
    expect(result[0]).toEqual({ candidate: 'mc-text', distance: 0 });
  });

  it('finds close matches', () => {
    const result = fuzzyMatch('mc-txt', components);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]!.candidate).toBe('mc-text');
  });

  it('finds mc-button for mc-buton (typo)', () => {
    const result = fuzzyMatch('mc-buton', components);
    expect(result[0]!.candidate).toBe('mc-button');
    expect(result[0]!.distance).toBe(1);
  });

  it('returns empty array for no close matches', () => {
    const result = fuzzyMatch('totally-unrelated', components);
    expect(result).toEqual([]);
  });

  it('is case-insensitive', () => {
    const result = fuzzyMatch('MC-TEXT', components);
    expect(result[0]!.candidate).toBe('mc-text');
    expect(result[0]!.distance).toBe(0);
  });

  it('respects maxDistance parameter', () => {
    const result = fuzzyMatch('mc-xyz', components, 1);
    // Should find nothing within distance 1
    expect(result.length).toBe(0);
  });

  it('sorts results by distance', () => {
    const result = fuzzyMatch('mc-tex', components);
    for (let i = 1; i < result.length; i++) {
      expect(result[i]!.distance).toBeGreaterThanOrEqual(result[i - 1]!.distance);
    }
  });
});

describe('suggest', () => {
  const candidates = ['mc-body', 'mc-section', 'mc-column', 'mc-text', 'mc-image'];

  it('returns a suggestion for a close match', () => {
    expect(suggest('mc-txt', candidates)).toBe('Did you mean "mc-text"?');
  });

  it('returns a suggestion for a typo', () => {
    expect(suggest('mc-colum', candidates)).toBe('Did you mean "mc-column"?');
  });

  it('returns undefined for no close match', () => {
    expect(suggest('totally-different', candidates)).toBeUndefined();
  });

  it('returns exact match suggestion (distance 0)', () => {
    expect(suggest('mc-body', candidates)).toBe('Did you mean "mc-body"?');
  });
});
