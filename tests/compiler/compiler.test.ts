/**
 * Tests for compileNode tree walker and registry.
 */
import { describe, it, expect } from 'vitest';
import { compileNode, compileChildren, getTextContent, getEffectiveAttributes, COMPONENT_COMPILERS } from '../../src/compiler/index.js';
import { makeNode, makeNodeWithText, makeContext, textContent } from './helpers.js';
import { ErrorCode } from '../../src/errors/codes.js';

describe('COMPONENT_COMPILERS registry', () => {
  it('has compilers for all core components', () => {
    const expected = [
      'mc-body',
      'mc-head',
      'mc-preview',
      'mc-section',
      'mc-column',
      'mc-text',
      'mc-image',
      'mc-button',
      'mc-divider',
      'mc-spacer',
      'mc-raw',
    ];
    for (const type of expected) {
      expect(COMPONENT_COMPILERS[type]).toBeDefined();
      expect(typeof COMPONENT_COMPILERS[type]).toBe('function');
    }
  });

  it('has exactly 20 registered compilers', () => {
    expect(Object.keys(COMPONENT_COMPILERS)).toHaveLength(20);
  });
});

describe('compileNode', () => {
  const ctx = makeContext();

  it('dispatches to the correct compiler', () => {
    const node = makeNodeWithText('mc-raw', '<div>test</div>');
    const html = compileNode(node, ctx);
    expect(html).toBe('<div>test</div>');
  });

  it('throws MCError for unknown component type', () => {
    const node = makeNode('mc-unknown-component');
    expect(() => compileNode(node, ctx)).toThrow('Unknown component');
    expect(() => compileNode(node, ctx)).toThrow('mc-unknown-component');
  });

  it('compiles mc-text through dispatch', () => {
    const node = makeNodeWithText('mc-text', 'Hello');
    const html = compileNode(node, ctx);
    expect(html).toContain('<p');
    expect(html).toContain('Hello');
  });

  it('compiles mc-spacer through dispatch', () => {
    const node = makeNode('mc-spacer', { height: '40px' });
    const html = compileNode(node, ctx);
    expect(html).toContain('height:40px');
  });
});

describe('compileChildren', () => {
  const ctx = makeContext();

  it('returns empty string for empty array', () => {
    expect(compileChildren([], ctx)).toBe('');
  });

  it('concatenates multiple children', () => {
    const children = [
      makeNodeWithText('mc-text', 'First'),
      makeNodeWithText('mc-text', 'Second'),
    ];
    const html = compileChildren(children, ctx);
    expect(html).toContain('First');
    expect(html).toContain('Second');
  });

  it('preserves child order', () => {
    const children = [
      makeNodeWithText('mc-raw', 'AAA'),
      makeNodeWithText('mc-raw', 'BBB'),
    ];
    const html = compileChildren(children, ctx);
    const aIdx = html.indexOf('AAA');
    const bIdx = html.indexOf('BBB');
    expect(aIdx).toBeLessThan(bIdx);
  });
});

describe('getTextContent', () => {
  it('extracts text from text content', () => {
    const node = makeNodeWithText('mc-text', 'Hello World');
    expect(getTextContent(node)).toBe('Hello World');
  });

  it('joins multiple content items', () => {
    const node = makeNode('mc-text', {}, [], [
      textContent('Hello '),
      textContent('World'),
    ]);
    expect(getTextContent(node)).toBe('Hello World');
  });

  it('converts expression nodes to placeholder syntax', () => {
    const node = makeNode('mc-text', {}, [], [
      textContent('Hi '),
      {
        type: 'expression',
        value: 'name',
        raw: false,
        loc: { start: { line: 1, col: 1, offset: 0 }, end: { line: 1, col: 1, offset: 0 } },
      },
    ]);
    expect(getTextContent(node)).toBe('Hi {{name}}');
  });

  it('converts raw expression nodes to triple-brace syntax', () => {
    const node = makeNode('mc-text', {}, [], [
      {
        type: 'expression',
        value: 'html',
        raw: true,
        loc: { start: { line: 1, col: 1, offset: 0 }, end: { line: 1, col: 1, offset: 0 } },
      },
    ]);
    expect(getTextContent(node)).toBe('{{{html}}}');
  });

  it('returns empty string for no content', () => {
    const node = makeNode('mc-text');
    expect(getTextContent(node)).toBe('');
  });
});

describe('getEffectiveAttributes', () => {
  it('returns node attributes when no defaults exist', () => {
    const ctx = makeContext();
    const node = makeNode('mc-text', { 'font-size': '16px', color: '#333' });
    const attrs = getEffectiveAttributes(node, ctx);
    expect(attrs).toEqual({ 'font-size': '16px', color: '#333' });
  });

  it('applies mc-all defaults', () => {
    const ctx = makeContext({
      attributeDefaults: new Map([
        ['mc-all', { 'font-family': 'Arial, sans-serif' }],
      ]),
    });
    const node = makeNode('mc-text', {});
    const attrs = getEffectiveAttributes(node, ctx);
    expect(attrs['font-family']).toBe('Arial, sans-serif');
  });

  it('applies per-type defaults', () => {
    const ctx = makeContext({
      attributeDefaults: new Map([
        ['mc-text', { 'font-size': '16px' }],
      ]),
    });
    const node = makeNode('mc-text', {});
    const attrs = getEffectiveAttributes(node, ctx);
    expect(attrs['font-size']).toBe('16px');
  });

  it('per-type defaults override mc-all', () => {
    const defaults = new Map<string, Record<string, string>>();
    defaults.set('mc-all', { 'font-size': '12px', 'font-family': 'Arial' });
    defaults.set('mc-text', { 'font-size': '16px' });
    const ctx = makeContext({ attributeDefaults: defaults });
    const node = makeNode('mc-text', {});
    const attrs = getEffectiveAttributes(node, ctx);
    // mc-text wins for font-size
    expect(attrs['font-size']).toBe('16px');
    // mc-all still applies for font-family
    expect(attrs['font-family']).toBe('Arial');
  });

  it('explicit attributes override all defaults', () => {
    const defaults = new Map<string, Record<string, string>>();
    defaults.set('mc-all', { 'font-size': '12px' });
    defaults.set('mc-text', { 'font-size': '16px', color: '#333' });
    const ctx = makeContext({ attributeDefaults: defaults });
    const node = makeNode('mc-text', { 'font-size': '24px' });
    const attrs = getEffectiveAttributes(node, ctx);
    // Explicit wins for font-size
    expect(attrs['font-size']).toBe('24px');
    // Default still applies for color
    expect(attrs['color']).toBe('#333');
  });

  it('does not apply mc-text defaults to mc-button', () => {
    const ctx = makeContext({
      attributeDefaults: new Map([
        ['mc-text', { 'font-size': '16px' }],
      ]),
    });
    const node = makeNode('mc-button', { href: '#' });
    const attrs = getEffectiveAttributes(node, ctx);
    expect(attrs['font-size']).toBeUndefined();
    expect(attrs['href']).toBe('#');
  });

  it('returns same reference when no defaults match', () => {
    const ctx = makeContext({
      attributeDefaults: new Map([
        ['mc-button', { 'background-color': 'blue' }],
      ]),
    });
    const node = makeNode('mc-text', { color: 'red' });
    const attrs = getEffectiveAttributes(node, ctx);
    expect(attrs).toBe(node.attributes);
  });

  it('returns same reference when defaults map is empty', () => {
    const ctx = makeContext();
    const node = makeNode('mc-text', { color: 'red' });
    const attrs = getEffectiveAttributes(node, ctx);
    expect(attrs).toBe(node.attributes);
  });
});

// ---------------------------------------------------------------------------
// Phase 6: getEffectiveAttributes — mc-class resolution
// ---------------------------------------------------------------------------

describe('getEffectiveAttributes — Phase 6: mc-class resolution', () => {
  it('mc-class attribute is stripped from the returned attributes', () => {
    const ctx = makeContext({
      namedClasses: new Map([['cta', { color: '#fff' }]]),
    });
    const node = makeNode('mc-text', { 'mc-class': 'cta' });
    const attrs = getEffectiveAttributes(node, ctx);
    expect('mc-class' in attrs).toBe(false);
  });

  it('mc-class is stripped even when the class name is not found', () => {
    const ctx = makeContext({ namedClasses: new Map() });
    const node = makeNode('mc-text', { 'mc-class': 'ghost', color: 'red' });
    const attrs = getEffectiveAttributes(node, ctx);
    expect('mc-class' in attrs).toBe(false);
    expect(attrs['color']).toBe('red');
  });

  it('mc-class attrs are applied to the component', () => {
    const ctx = makeContext({
      namedClasses: new Map([['cta', { 'background-color': '#e85d3a', color: '#fff' }]]),
    });
    const node = makeNode('mc-button', { href: '#', 'mc-class': 'cta' });
    const attrs = getEffectiveAttributes(node, ctx);
    expect(attrs['background-color']).toBe('#e85d3a');
    expect(attrs['color']).toBe('#fff');
    expect(attrs['href']).toBe('#');
  });

  it('explicit attrs override mc-class attrs', () => {
    const ctx = makeContext({
      namedClasses: new Map([['cta', { color: '#fff', 'font-size': '14px' }]]),
    });
    const node = makeNode('mc-button', { href: '#', 'mc-class': 'cta', color: '#000' });
    const attrs = getEffectiveAttributes(node, ctx);
    expect(attrs['color']).toBe('#000');       // explicit wins
    expect(attrs['font-size']).toBe('14px');   // class attr present
  });

  it('mc-class attrs override mc-all defaults', () => {
    const ctx = makeContext({
      attributeDefaults: new Map([['mc-all', { color: 'gray', 'font-family': 'Arial' }]]),
      namedClasses: new Map([['cta', { color: '#e85d3a' }]]),
    });
    const node = makeNode('mc-button', { href: '#', 'mc-class': 'cta' });
    const attrs = getEffectiveAttributes(node, ctx);
    expect(attrs['color']).toBe('#e85d3a');      // class wins over mc-all
    expect(attrs['font-family']).toBe('Arial');   // mc-all still applies for unset props
  });

  it('mc-class attrs override mc-type defaults', () => {
    const ctx = makeContext({
      attributeDefaults: new Map([['mc-button', { 'background-color': '#000' }]]),
      namedClasses: new Map([['cta', { 'background-color': '#e85d3a' }]]),
    });
    const node = makeNode('mc-button', { href: '#', 'mc-class': 'cta' });
    const attrs = getEffectiveAttributes(node, ctx);
    expect(attrs['background-color']).toBe('#e85d3a'); // class wins over mc-type
  });

  it('unknown mc-class pushes an UNKNOWN_MC_CLASS warning', () => {
    const ctx = makeContext({ namedClasses: new Map() });
    const node = makeNode('mc-button', { href: '#', 'mc-class': 'no-such-class' });
    getEffectiveAttributes(node, ctx);
    const warning = ctx.warnings.find(w => w.code === ErrorCode.UNKNOWN_MC_CLASS);
    expect(warning).toBeDefined();
    expect(warning?.message).toContain('no-such-class');
  });

  it('known mc-class produces no UNKNOWN_MC_CLASS warning', () => {
    const ctx = makeContext({
      namedClasses: new Map([['cta', { color: '#fff' }]]),
    });
    const node = makeNode('mc-button', { href: '#', 'mc-class': 'cta' });
    getEffectiveAttributes(node, ctx);
    const warning = ctx.warnings.find(w => w.code === ErrorCode.UNKNOWN_MC_CLASS);
    expect(warning).toBeUndefined();
  });

  it('space-separated mc-class applies classes left-to-right (later wins)', () => {
    const ctx = makeContext({
      namedClasses: new Map<string, Record<string, string>>([
        ['base', { color: 'gray', 'font-size': '14px' }],
        ['primary', { color: '#e85d3a' }],
      ]),
    });
    const node = makeNode('mc-button', { href: '#', 'mc-class': 'base primary' });
    const attrs = getEffectiveAttributes(node, ctx);
    expect(attrs['color']).toBe('#e85d3a');    // primary (later) wins over base
    expect(attrs['font-size']).toBe('14px');   // base attr still present
  });

  it('mc-class="" (empty string) is stripped with no warnings', () => {
    const ctx = makeContext({ namedClasses: new Map() });
    const node = makeNode('mc-text', { 'mc-class': '', color: 'red' });
    const attrs = getEffectiveAttributes(node, ctx);
    expect('mc-class' in attrs).toBe(false);
    expect(attrs['color']).toBe('red');
    expect(ctx.warnings.filter(w => w.code === ErrorCode.UNKNOWN_MC_CLASS)).toHaveLength(0);
  });

  it('full precedence chain: mc-all < mc-type < mc-class < explicit', () => {
    const ctx = makeContext({
      attributeDefaults: new Map<string, Record<string, string>>([
        ['mc-all', { 'font-family': 'serif', color: 'gray', 'font-size': '12px' }],
        ['mc-button', { 'font-size': '14px', 'background-color': '#999' }],
      ]),
      namedClasses: new Map<string, Record<string, string>>([
        ['cta', { 'font-size': '16px', 'background-color': '#e85d3a' }],
      ]),
    });
    const node = makeNode('mc-button', {
      href: '#',
      'mc-class': 'cta',
      'background-color': '#fff',
    });
    const attrs = getEffectiveAttributes(node, ctx);
    expect(attrs['font-family']).toBe('serif');        // mc-all (no override)
    expect(attrs['color']).toBe('gray');               // mc-all (no override)
    expect(attrs['font-size']).toBe('16px');           // mc-class beats mc-type (14px) and mc-all (12px)
    expect(attrs['background-color']).toBe('#fff');    // explicit beats mc-class (#e85d3a)
    expect('mc-class' in attrs).toBe(false);           // always stripped
  });
});
