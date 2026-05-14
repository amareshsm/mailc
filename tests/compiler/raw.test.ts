/**
 * Tests for mc-raw compiler.
 */
import { describe, it, expect } from 'vitest';
import { compileRaw } from '../../src/compiler/components/raw.js';
import { makeNodeWithText, makeContext, makeNode, textContent } from './helpers.js';

describe('compileRaw', () => {
  const ctx = makeContext();

  it('passes through plain text unmodified', () => {
    const node = makeNodeWithText('mc-raw', '<div>Hello</div>');
    expect(compileRaw(node, ctx)).toBe('<div>Hello</div>');
  });

  it('passes through complex HTML unmodified', () => {
    const html = '<div style="display:flex;"><p>Custom</p></div>';
    const node = makeNodeWithText('mc-raw', html);
    expect(compileRaw(node, ctx)).toBe(html);
  });

  it('returns empty string for empty content', () => {
    const node = makeNode('mc-raw');
    expect(compileRaw(node, ctx)).toBe('');
  });

  it('preserves expression placeholders', () => {
    const node = makeNode('mc-raw', {}, [], [
      textContent('Hello '),
      { type: 'expression', value: 'name', raw: false, loc: node_loc() },
    ]);
    expect(compileRaw(node, ctx)).toBe('Hello {{name}}');
  });

  it('preserves raw expression placeholders', () => {
    const node = makeNode('mc-raw', {}, [], [
      textContent(''),
      { type: 'expression', value: 'html', raw: true, loc: node_loc() },
    ]);
    expect(compileRaw(node, ctx)).toBe('{{{html}}}');
  });

  it('reconstructs HTML from parsed child nodes', () => {
    // When the parser encounters non-inline HTML tags inside mc-raw,
    // they end up as children, not text content. compileRaw must reconstruct them.
    const child = makeNode('custom-html', {}, [], [textContent('Pass through')]);
    const node = makeNode('mc-raw', {}, [child]);
    expect(compileRaw(node, ctx)).toBe('<custom-html>Pass through</custom-html>');
  });

  it('reconstructs nested child HTML with attributes', () => {
    const inner = makeNode('span', {}, [], [textContent('inside')]);
    const outer = makeNode('div', { class: 'wrapper', id: 'test' }, [inner]);
    const node = makeNode('mc-raw', {}, [outer]);
    expect(compileRaw(node, ctx)).toBe(
      '<div class="wrapper" id="test"><span>inside</span></div>',
    );
  });

  it('reconstructs empty child elements as self-closing', () => {
    const child = makeNode('hr');
    const node = makeNode('mc-raw', {}, [child]);
    expect(compileRaw(node, ctx)).toBe('<hr />');
  });

  it('combines text content and child nodes', () => {
    const child = makeNode('div', {}, [], [textContent('child')]);
    const node = makeNode('mc-raw', {}, [child], [textContent('before ')]);
    expect(compileRaw(node, ctx)).toBe('before <div>child</div>');
  });
});

function node_loc(): { start: { line: number; col: number; offset: number }; end: { line: number; col: number; offset: number } } {
  return {
    start: { line: 1, col: 1, offset: 0 },
    end: { line: 1, col: 1, offset: 0 },
  };
}
