/**
 * Tests for src/json/json-to-ast.ts — MCNode → ASTNode conversion + parseContent.
 */

import { describe, it, expect } from 'vitest';
import { jsonToAST, parseContent } from '../../src/json/index.js';
import type { MCNode } from '../../src/json/index.js';

// ---------------------------------------------------------------------------
// parseContent tests
// ---------------------------------------------------------------------------

describe('parseContent', () => {
  it('returns a single text node for plain text', () => {
    const result = parseContent('Hello World');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ type: 'text', value: 'Hello World' });
  });

  it('returns empty array for empty string', () => {
    expect(parseContent('')).toHaveLength(0);
  });

  it('parses a single {{ expression }}', () => {
    const result = parseContent('{{name}}');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ type: 'expression', value: 'name', raw: false });
  });

  it('parses {{ expression }} with whitespace', () => {
    const result = parseContent('{{ name }}');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ type: 'expression', value: 'name', raw: false });
  });

  it('parses {{{ raw }}} expression', () => {
    const result = parseContent('{{{rawHtml}}}');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ type: 'expression', value: 'rawHtml', raw: true });
  });

  it('parses {{{ raw }}} with whitespace', () => {
    const result = parseContent('{{{ rawContent }}}');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ type: 'expression', value: 'rawContent', raw: true });
  });

  it('parses expression with fallback using ||', () => {
    const result = parseContent('{{name || "Guest"}}');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      type: 'expression',
      value: 'name',
      raw: false,
      fallback: 'Guest',
    });
  });

  it('parses expression with fallback preserving whitespace', () => {
    const result = parseContent('{{ firstName || "Valued Customer" }}');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      type: 'expression',
      value: 'firstName',
      raw: false,
      fallback: 'Valued Customer',
    });
  });

  it('parses mixed text and expressions', () => {
    const result = parseContent('Hello {{name}}, welcome!');
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ type: 'text', value: 'Hello ' });
    expect(result[1]).toMatchObject({ type: 'expression', value: 'name' });
    expect(result[2]).toMatchObject({ type: 'text', value: ', welcome!' });
  });

  it('parses multiple expressions in a row', () => {
    const result = parseContent('{{first}} {{last}}');
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ type: 'expression', value: 'first' });
    expect(result[1]).toMatchObject({ type: 'text', value: ' ' });
    expect(result[2]).toMatchObject({ type: 'expression', value: 'last' });
  });

  it('handles unclosed {{ as literal text', () => {
    const result = parseContent('Price: {{amount');
    // Unclosed expression may be split into text + partial text
    expect(result.length).toBeGreaterThanOrEqual(1);
    const combined = result.map((n) => n.value).join('');
    expect(combined).toBe('Price: {{amount');
  });

  it('handles complex mixed content with raw and regular expressions', () => {
    const result = parseContent('Hi {{{html}}}, your code is {{code}}.');
    expect(result).toHaveLength(5);
    expect(result[0]).toMatchObject({ type: 'text', value: 'Hi ' });
    expect(result[1]).toMatchObject({ type: 'expression', value: 'html', raw: true });
    expect(result[2]).toMatchObject({ type: 'text', value: ', your code is ' });
    expect(result[3]).toMatchObject({ type: 'expression', value: 'code', raw: false });
    expect(result[4]).toMatchObject({ type: 'text', value: '.' });
  });
});

// ---------------------------------------------------------------------------
// jsonToAST tests
// ---------------------------------------------------------------------------

describe('jsonToAST', () => {
  it('converts a simple mc-body node', () => {
    const node: MCNode = { type: 'mc-body', attributes: {} };
    const ast = jsonToAST(node);
    expect(ast.type).toBe('mc-body');
    expect(ast.attributes).toEqual({});
    expect(ast.children).toEqual([]);
    expect(ast.content).toEqual([]);
    expect(ast.loc.start.line).toBe(0);
    expect(ast.loc.start.col).toBe(0);
  });

  it('preserves attributes', () => {
    const node: MCNode = {
      type: 'mc-section',
      attributes: { 'background-color': '#ffffff', padding: '20px' },
    };
    const ast = jsonToAST(node);
    expect(ast.attributes['background-color']).toBe('#ffffff');
    expect(ast.attributes['padding']).toBe('20px');
  });

  it('converts content string to ASTContent array', () => {
    const node: MCNode = {
      type: 'mc-text',
      attributes: {},
      content: 'Hello {{name}}',
    };
    const ast = jsonToAST(node);
    expect(ast.content).toHaveLength(2);
    expect(ast.content[0]).toMatchObject({ type: 'text', value: 'Hello ' });
    expect(ast.content[1]).toMatchObject({ type: 'expression', value: 'name' });
  });

  it('converts nested children recursively', () => {
    const node: MCNode = {
      type: 'mc-body',
      attributes: {},
      children: [
        {
          type: 'mc-section',
          attributes: {},
          children: [
            {
              type: 'mc-column',
              attributes: {},
              children: [
                { type: 'mc-text', attributes: {}, content: 'Leaf' },
              ],
            },
          ],
        },
      ],
    };
    const ast = jsonToAST(node);
    expect(ast.children).toHaveLength(1);
    const sectionNode = ast.children[0];
    expect(sectionNode).toBeDefined();
    if (!sectionNode) return;
    expect(sectionNode.type).toBe('mc-section');

    expect(sectionNode.children).toHaveLength(1);
    const columnNode = sectionNode.children[0];
    expect(columnNode).toBeDefined();
    if (!columnNode) return;
    expect(columnNode.type).toBe('mc-column');

    expect(columnNode.children).toHaveLength(1);
    const textNode = columnNode.children[0];
    expect(textNode).toBeDefined();
    if (!textNode) return;
    expect(textNode.type).toBe('mc-text');

    const textContent = textNode.content[0];
    expect(textContent).toBeDefined();
    if (!textContent) return;
    expect(textContent.value).toBe('Leaf');
  });

  it('defaults content to empty array when undefined', () => {
    const node: MCNode = { type: 'mc-divider', attributes: {} };
    const ast = jsonToAST(node);
    expect(ast.content).toEqual([]);
  });

  it('defaults children to empty array when undefined', () => {
    const node: MCNode = { type: 'mc-spacer', attributes: { height: '20px' } };
    const ast = jsonToAST(node);
    expect(ast.children).toEqual([]);
  });
});
