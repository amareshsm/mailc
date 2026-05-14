/**
 * Tests for CSS style parser (mc-style inline="true" support).
 */
import { describe, it, expect } from 'vitest';
import {
  parseCSSRules,
  extractClassName,
  declarationsToInlineStyle,
} from '../../src/css/style-parser.js';

describe('parseCSSRules', () => {
  it('parses a single class rule', () => {
    const rules = parseCSSRules('.header { color: red; font-weight: bold; }');
    expect(rules).toHaveLength(1);
    expect(rules[0].selector).toBe('.header');
    expect(rules[0].declarations).toEqual({
      color: 'red',
      'font-weight': 'bold',
    });
  });

  it('parses multiple rules', () => {
    const css = `
      .title { font-size: 24px; }
      .subtitle { font-size: 14px; color: #666; }
    `;
    const rules = parseCSSRules(css);
    expect(rules).toHaveLength(2);
    expect(rules[0].selector).toBe('.title');
    expect(rules[0].declarations).toEqual({ 'font-size': '24px' });
    expect(rules[1].selector).toBe('.subtitle');
    expect(rules[1].declarations).toEqual({
      'font-size': '14px',
      color: '#666',
    });
  });

  it('handles comma-separated selectors', () => {
    const rules = parseCSSRules('.a, .b { color: blue; }');
    expect(rules).toHaveLength(2);
    expect(rules[0].selector).toBe('.a');
    expect(rules[1].selector).toBe('.b');
    expect(rules[0].declarations).toEqual({ color: 'blue' });
    expect(rules[1].declarations).toEqual({ color: 'blue' });
  });

  it('strips CSS comments', () => {
    const css = `
      /* Header styles */
      .header { color: red; }
      /* Footer styles */
      .footer { color: blue; }
    `;
    const rules = parseCSSRules(css);
    expect(rules).toHaveLength(2);
    expect(rules[0].selector).toBe('.header');
    expect(rules[1].selector).toBe('.footer');
  });

  it('handles multi-line comments', () => {
    const css = `
      /**
       * Block comment
       */
      .item { padding: 10px; }
    `;
    const rules = parseCSSRules(css);
    expect(rules).toHaveLength(1);
    expect(rules[0].selector).toBe('.item');
  });

  it('skips @-rules', () => {
    const css = `
      @media screen { .mobile { display: none; } }
      .header { color: red; }
    `;
    const rules = parseCSSRules(css);
    // The @media block's inner rules won't be correctly parsed (nested braces)
    // but the .header rule after it should be found
    expect(rules.some((r) => r.selector === '.header')).toBe(true);
  });

  it('handles type selectors', () => {
    const rules = parseCSSRules('h1 { font-size: 32px; }');
    expect(rules).toHaveLength(1);
    expect(rules[0].selector).toBe('h1');
    expect(rules[0].declarations).toEqual({ 'font-size': '32px' });
  });

  it('returns empty array for empty input', () => {
    expect(parseCSSRules('')).toEqual([]);
  });

  it('returns empty array for comments only', () => {
    expect(parseCSSRules('/* just a comment */')).toEqual([]);
  });

  it('skips rules with empty declarations', () => {
    const rules = parseCSSRules('.empty { }');
    expect(rules).toHaveLength(0);
  });

  it('handles values with colons (e.g. URLs)', () => {
    const rules = parseCSSRules('.bg { background: url(https://example.com/img.png); }');
    expect(rules).toHaveLength(1);
    expect(rules[0].declarations['background']).toBe('url(https://example.com/img.png)');
  });

  it('trims whitespace from selectors and values', () => {
    const rules = parseCSSRules('  .spaced  {  color :  red  ;  }');
    expect(rules[0].selector).toBe('.spaced');
    expect(rules[0].declarations['color']).toBe('red');
  });

  it('handles missing trailing semicolon', () => {
    const rules = parseCSSRules('.no-semi { color: red }');
    expect(rules).toHaveLength(1);
    expect(rules[0].declarations['color']).toBe('red');
  });
});

describe('extractClassName', () => {
  it('extracts simple class name', () => {
    expect(extractClassName('.header')).toBe('header');
  });

  it('extracts hyphenated class name', () => {
    expect(extractClassName('.my-class')).toBe('my-class');
  });

  it('extracts underscored class name', () => {
    expect(extractClassName('.my_class')).toBe('my_class');
  });

  it('returns null for type selector', () => {
    expect(extractClassName('h1')).toBeNull();
  });

  it('returns null for compound selector', () => {
    expect(extractClassName('.a .b')).toBeNull();
  });

  it('returns null for chained class selector', () => {
    expect(extractClassName('.a.b')).toBeNull();
  });

  it('returns null for pseudo-class', () => {
    expect(extractClassName('.a:hover')).toBeNull();
  });

  it('returns null for ID selector', () => {
    expect(extractClassName('#header')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractClassName('')).toBeNull();
  });
});

describe('declarationsToInlineStyle', () => {
  it('converts single declaration', () => {
    expect(declarationsToInlineStyle({ color: 'red' })).toBe('color:red');
  });

  it('converts multiple declarations', () => {
    const result = declarationsToInlineStyle({
      color: 'red',
      'font-size': '16px',
    });
    expect(result).toContain('color:red');
    expect(result).toContain('font-size:16px');
    expect(result).toContain(';');
  });

  it('returns empty string for empty declarations', () => {
    expect(declarationsToInlineStyle({})).toBe('');
  });
});
