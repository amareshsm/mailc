/**
 * Tests for mc-head compiler and extractHeadData.
 */
import { describe, it, expect } from 'vitest';
import { compileHead, extractHeadData } from '../../src/compiler/components/head.js';
import { makeNode, makeNodeWithText, makeContext } from './helpers.js';
import type { CompileContext } from '../../src/types.js';

describe('compileHead', () => {
  const ctx = makeContext();

  it('returns empty string (no standalone HTML)', () => {
    const node = makeNode('mc-head');
    expect(compileHead(node, ctx)).toBe('');
  });

  it('returns empty string even with children', () => {
    const preview = makeNodeWithText('mc-preview', 'Hello');
    const node = makeNode('mc-head', {}, [preview]);
    expect(compileHead(node, ctx)).toBe('');
  });
});

describe('extractHeadData', () => {
  const ctx = makeContext();

  it('extracts preview text', () => {
    const preview = makeNodeWithText('mc-preview', 'Order shipped!');
    const head = makeNode('mc-head', {}, [preview]);
    const data = extractHeadData(head, ctx);
    expect(data.previewHtml).toContain('Order shipped!');
    expect(data.previewHtml).toContain('display:none');
  });

  it('extracts style blocks', () => {
    const style = makeNodeWithText('mc-style', '.custom { color: red; }');
    const head = makeNode('mc-head', {}, [style]);
    const data = extractHeadData(head, ctx);
    expect(data.styleBlocks).toHaveLength(1);
    expect(data.styleBlocks[0]).toBe('.custom { color: red; }');
  });

  it('extracts multiple style blocks', () => {
    const style1 = makeNodeWithText('mc-style', '.a { color: red; }');
    const style2 = makeNodeWithText('mc-style', '.b { color: blue; }');
    const head = makeNode('mc-head', {}, [style1, style2]);
    const data = extractHeadData(head, ctx);
    expect(data.styleBlocks).toHaveLength(2);
  });

  it('extracts attribute defaults from mc-attributes', () => {
    const allDefaults = makeNode('mc-all', {
      'font-family': 'Arial, sans-serif',
    });
    const textDefaults = makeNode('mc-text', {
      'font-size': '16px',
      color: '#333333',
    });
    const attributesNode = makeNode('mc-attributes', {}, [allDefaults, textDefaults]);
    const head = makeNode('mc-head', {}, [attributesNode]);
    const data = extractHeadData(head, ctx);

    expect(data.attributeDefaults.get('mc-all')).toEqual({
      'font-family': 'Arial, sans-serif',
    });
    expect(data.attributeDefaults.get('mc-text')).toEqual({
      'font-size': '16px',
      color: '#333333',
    });
  });

  it('returns empty defaults when no children', () => {
    const head = makeNode('mc-head');
    const data = extractHeadData(head, ctx);
    expect(data.previewHtml).toBe('');
    expect(data.styleBlocks).toHaveLength(0);
    expect(data.attributeDefaults.size).toBe(0);
  });

  it('handles all head children together', () => {
    const preview = makeNodeWithText('mc-preview', 'Preview');
    const style = makeNodeWithText('mc-style', '.x { color: blue; }');
    const allDefaults = makeNode('mc-all', { 'font-family': 'Arial' });
  const attributesNode = makeNode('mc-attributes', {}, [allDefaults]);
  const head = makeNode('mc-head', {}, [preview, style, attributesNode]);
    const data = extractHeadData(head, ctx);

    expect(data.previewHtml).toContain('Preview');
    expect(data.styleBlocks).toHaveLength(1);
    expect(data.attributeDefaults.has('mc-all')).toBe(true);
  });

  it('ignores unknown children', () => {
    const unknown = makeNode('mc-unknown');
    const head = makeNode('mc-head', {}, [unknown]);
    const data = extractHeadData(head, ctx);
    expect(data.previewHtml).toBe('');
    expect(data.styleBlocks).toHaveLength(0);
  });

  it('routes mc-style inline="true" to inlineStyleRules', () => {
    const style = makeNodeWithText(
      'mc-style',
      '.header { background-color: #ffffff; padding: 20px; }',
    );
    style.attributes['inline'] = 'true';
    const head = makeNode('mc-head', {}, [style]);
    const data = extractHeadData(head, ctx);
    // Should NOT go to styleBlocks
    expect(data.styleBlocks).toHaveLength(0);
    // Should go to inlineStyleRules
    expect(data.inlineStyleRules).toHaveLength(1);
  const firstRule = data.inlineStyleRules[0];
  expect(firstRule).toBeDefined();
  if (!firstRule) return;
  expect(firstRule.selector).toBe('.header');
  expect(firstRule.declarations['background-color']).toBe('#ffffff');
  expect(firstRule.declarations['padding']).toBe('20px');
  });

  it('routes regular mc-style to styleBlocks (not inlineStyleRules)', () => {
    const style = makeNodeWithText('mc-style', '.x { color: red; }');
    const head = makeNode('mc-head', {}, [style]);
    const data = extractHeadData(head, ctx);
    expect(data.styleBlocks).toHaveLength(1);
    expect(data.styleBlocks[0]).toBe('.x { color: red; }');
    expect(data.inlineStyleRules).toHaveLength(0);
  });

  it('handles both regular and inline mc-style blocks', () => {
    const regular = makeNodeWithText('mc-style', '.a { color: red; }');
    const inline = makeNodeWithText('mc-style', '.b { font-size: 14px; }');
    inline.attributes['inline'] = 'true';
    const head = makeNode('mc-head', {}, [regular, inline]);
    const data = extractHeadData(head, ctx);
    expect(data.styleBlocks).toHaveLength(1);
    expect(data.styleBlocks[0]).toBe('.a { color: red; }');
    expect(data.inlineStyleRules).toHaveLength(1);
    const firstRule = data.inlineStyleRules[0];
    expect(firstRule).toBeDefined();
    if (!firstRule) return;
    expect(firstRule.selector).toBe('.b');
  });

  it('mc-style inline="false" goes to styleBlocks', () => {
    const style = makeNodeWithText('mc-style', '.x { color: blue; }');
    style.attributes['inline'] = 'false';
    const head = makeNode('mc-head', {}, [style]);
    const data = extractHeadData(head, ctx);
    expect(data.styleBlocks).toHaveLength(1);
    expect(data.inlineStyleRules).toHaveLength(0);
  });

  it('initializes inlineStyleRules as empty array', () => {
    const head = makeNode('mc-head');
    const data = extractHeadData(head, ctx);
    expect(data.inlineStyleRules).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Phase 4: mc-class extraction into namedClasses
// ---------------------------------------------------------------------------

describe('extractHeadData — Phase 4: mc-class namedClasses', () => {
  const ctx = makeContext();

  it('namedClasses is initialized as an empty Map', () => {
    const head = makeNode('mc-head');
    const data = extractHeadData(head, ctx);
    expect(data.namedClasses).toBeInstanceOf(Map);
    expect(data.namedClasses.size).toBe(0);
  });

  it('mc-class children populate namedClasses with name as key', () => {
    const mcClass = makeNode('mc-class', {
      name: 'cta',
      'background-color': '#e85d3a',
      color: '#ffffff',
    });
    const attrs = makeNode('mc-attributes', {}, [mcClass]);
    const head = makeNode('mc-head', {}, [attrs]);
    const data = extractHeadData(head, ctx);
    expect(data.namedClasses.has('cta')).toBe(true);
    expect(data.namedClasses.get('cta')).toMatchObject({
      'background-color': '#e85d3a',
      color: '#ffffff',
    });
  });

  it('mc-class: "name" and "extends" attrs are stripped from the resolved value', () => {
    const mcClass = makeNode('mc-class', { name: 'cta', extends: 'base', 'font-size': '16px' });
    const attrs = makeNode('mc-attributes', {}, [mcClass]);
    const head = makeNode('mc-head', {}, [attrs]);
    const data = extractHeadData(head, ctx);
    const ctaAttrs = data.namedClasses.get('cta') ?? {};
    expect('name' in ctaAttrs).toBe(false);
    expect('extends' in ctaAttrs).toBe(false);
  });

  it('mc-class children are NOT added to attributeDefaults', () => {
    const mcClass = makeNode('mc-class', { name: 'cta', 'background-color': '#e85d3a' });
    const attrs = makeNode('mc-attributes', {}, [mcClass]);
    const head = makeNode('mc-head', {}, [attrs]);
    const data = extractHeadData(head, ctx);
    expect(data.attributeDefaults.has('mc-class')).toBe(false);
  });

  it('mc-class with extends inherits base class attributes', () => {
    const base = makeNode('mc-class', { name: 'base', 'font-size': '14px', color: '#000' });
    const primary = makeNode('mc-class', { name: 'primary', extends: 'base', color: '#fff' });
    const attrs = makeNode('mc-attributes', {}, [base, primary]);
    const head = makeNode('mc-head', {}, [attrs]);
    const data = extractHeadData(head, ctx);
    const primaryAttrs = data.namedClasses.get('primary') ?? {};
    expect(primaryAttrs['font-size']).toBe('14px'); // inherited from base
    expect(primaryAttrs['color']).toBe('#fff');      // own value overrides base
  });

  it('mc-class extending attrs override base when same property', () => {
    const base = makeNode('mc-class', { name: 'base', 'background-color': '#000', padding: '10px' });
    const child = makeNode('mc-class', { name: 'child', extends: 'base', 'background-color': '#fff' });
    const attrs = makeNode('mc-attributes', {}, [base, child]);
    const head = makeNode('mc-head', {}, [attrs]);
    const data = extractHeadData(head, ctx);
    const childAttrs = data.namedClasses.get('child') ?? {};
    expect(childAttrs['background-color']).toBe('#fff'); // own wins over base
    expect(childAttrs['padding']).toBe('10px');          // inherited from base
  });

  it('circular extends does not throw or hang', () => {
    const a = makeNode('mc-class', { name: 'a', extends: 'b', color: 'red' });
    const b = makeNode('mc-class', { name: 'b', extends: 'a', color: 'blue' });
    const attrs = makeNode('mc-attributes', {}, [a, b]);
    const head = makeNode('mc-head', {}, [attrs]);
    expect(() => extractHeadData(head, ctx)).not.toThrow();
    // Both should still be present in namedClasses with their own attrs at minimum
    const dataResult = extractHeadData(head, ctx);
    expect(dataResult.namedClasses.has('a')).toBe(true);
    expect(dataResult.namedClasses.has('b')).toBe(true);
  });

  it('multiple mc-class definitions all appear in namedClasses', () => {
    const c1 = makeNode('mc-class', { name: 'hero', 'font-size': '24px' });
    const c2 = makeNode('mc-class', { name: 'footer', 'font-size': '12px' });
    const attrs = makeNode('mc-attributes', {}, [c1, c2]);
    const head = makeNode('mc-head', {}, [attrs]);
    const data = extractHeadData(head, ctx);
    expect(data.namedClasses.has('hero')).toBe(true);
    expect(data.namedClasses.has('footer')).toBe(true);
    expect(data.namedClasses.get('hero')).toMatchObject({ 'font-size': '24px' });
    expect(data.namedClasses.get('footer')).toMatchObject({ 'font-size': '12px' });
  });

  it('non-mc-class children still go into attributeDefaults as before', () => {
    const allNode = makeNode('mc-all', { 'font-family': 'Arial' });
    const mcClass = makeNode('mc-class', { name: 'cta', color: '#e85d3a' });
    const attrs = makeNode('mc-attributes', {}, [allNode, mcClass]);
    const head = makeNode('mc-head', {}, [attrs]);
    const data = extractHeadData(head, ctx);
    expect(data.attributeDefaults.has('mc-all')).toBe(true);
    expect(data.namedClasses.has('cta')).toBe(true);
  });

  it('mc-class without a name attribute is skipped gracefully', () => {
    const noName = makeNode('mc-class', { color: '#fff' }); // validator catches this, but be defensive
    const attrs = makeNode('mc-attributes', {}, [noName]);
    const head = makeNode('mc-head', {}, [attrs]);
    expect(() => extractHeadData(head, ctx)).not.toThrow();
    const data = extractHeadData(head, ctx);
    expect(data.namedClasses.size).toBe(0); // nameless class is dropped
  });

  it('extends chain works across 3 levels: grandparent → parent → child', () => {
    const gp = makeNode('mc-class', { name: 'gp', 'font-size': '12px', color: 'gray' });
    const par = makeNode('mc-class', { name: 'par', extends: 'gp', 'font-size': '14px' });
    const child = makeNode('mc-class', { name: 'child', extends: 'par', color: 'black' });
    const attrs = makeNode('mc-attributes', {}, [gp, par, child]);
    const head = makeNode('mc-head', {}, [attrs]);
    const data = extractHeadData(head, ctx);
    const childAttrs = data.namedClasses.get('child') ?? {};
    expect(childAttrs['font-size']).toBe('14px'); // parent overrides grandparent
    expect(childAttrs['color']).toBe('black');     // child overrides grandparent
  });
});

// ---------------------------------------------------------------------------
// Phase 5: namedClasses wired into CompileContext
// ---------------------------------------------------------------------------

describe('Phase 5: namedClasses in CompileContext', () => {
  it('makeContext provides namedClasses as an empty Map by default', () => {
    const ctx: CompileContext = makeContext();
    expect(ctx.namedClasses).toBeInstanceOf(Map);
    expect(ctx.namedClasses.size).toBe(0);
  });

  it('makeContext namedClasses override is respected', () => {
    const classes = new Map([['cta', { color: '#fff', 'background-color': '#e85d3a' }]]);
    const ctx: CompileContext = makeContext({ namedClasses: classes });
    expect(ctx.namedClasses.has('cta')).toBe(true);
    expect(ctx.namedClasses.get('cta')?.['color']).toBe('#fff');
  });

  it('CompileContext namedClasses field accepts a populated Map without TS error', () => {
    const ctx: CompileContext = makeContext({
      namedClasses: new Map([['hero', { 'font-size': '24px' }]]),
    });
    expect(ctx.namedClasses.get('hero')).toMatchObject({ 'font-size': '24px' });
  });
});
