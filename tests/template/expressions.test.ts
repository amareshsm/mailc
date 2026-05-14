/**
 * Tests for template expression resolution.
 *
 * Covers: resolvePath (10.5.15), parseExpression (10.5.16),
 * resolveContent (10.5.18), resolveAttributes (10.5.19).
 */

import { describe, it, expect } from 'vitest';
import {
  resolvePath,
  parseExpression,
  resolveContent,
  resolveAttributes,
} from '../../src/template/index.js';
import type { ASTContent, ASTExpressionNode, ASTTextNode, SourceLocation } from '../../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LOC: SourceLocation = {
  start: { line: 1, col: 1, offset: 0 },
  end: { line: 1, col: 10, offset: 9 },
};

function textNode(value: string): ASTTextNode {
  return { type: 'text', value, loc: LOC };
}

function exprNode(value: string, raw = false, fallback?: string): ASTExpressionNode {
  return { type: 'expression', value, raw, fallback, loc: LOC };
}

// ===========================================================================
// resolvePath
// ===========================================================================

describe('resolvePath', () => {
  const data = {
    customer: { name: 'Sarah', address: { city: 'Seattle' } },
    items: [
      { name: 'Headphones', price: 7900 },
      { name: 'USB-C Cable', price: 1200 },
    ],
    count: 5,
    active: true,
    empty: '',
    zero: 0,
    nullVal: null,
  };

  it('resolves top-level key', () => {
    expect(resolvePath(data, 'count')).toBe(5);
  });

  it('resolves nested key', () => {
    expect(resolvePath(data, 'customer.name')).toBe('Sarah');
  });

  it('resolves deeply nested key', () => {
    expect(resolvePath(data, 'customer.address.city')).toBe('Seattle');
  });

  it('resolves array index', () => {
    expect(resolvePath(data, 'items.0.name')).toBe('Headphones');
    expect(resolvePath(data, 'items.1.price')).toBe(1200);
  });

  it('returns undefined for missing path', () => {
    expect(resolvePath(data, 'customer.email')).toBeUndefined();
  });

  it('returns undefined for deep missing path', () => {
    expect(resolvePath(data, 'customer.address.zip')).toBeUndefined();
  });

  it('returns undefined for path through null', () => {
    expect(resolvePath(data, 'nullVal.something')).toBeUndefined();
  });

  it('returns undefined for path through primitive', () => {
    expect(resolvePath(data, 'count.something')).toBeUndefined();
  });

  it('returns the data itself for empty path', () => {
    expect(resolvePath(data, '')).toBe(data);
  });

  it('blocks __proto__ access', () => {
    expect(resolvePath(data, '__proto__')).toBeUndefined();
  });

  it('blocks constructor access', () => {
    expect(resolvePath(data, 'constructor')).toBeUndefined();
  });

  it('blocks prototype access', () => {
    expect(resolvePath(data, 'prototype')).toBeUndefined();
  });

  it('blocks nested __proto__ access', () => {
    expect(resolvePath(data, 'customer.__proto__')).toBeUndefined();
  });

  it('handles boolean value', () => {
    expect(resolvePath(data, 'active')).toBe(true);
  });

  it('handles empty string value', () => {
    expect(resolvePath(data, 'empty')).toBe('');
  });

  it('handles zero value', () => {
    expect(resolvePath(data, 'zero')).toBe(0);
  });

  it('handles null value', () => {
    expect(resolvePath(data, 'nullVal')).toBeNull();
  });
});

// ===========================================================================
// parseExpression
// ===========================================================================

describe('parseExpression', () => {
  it('parses path only', () => {
    expect(parseExpression('customer.name')).toEqual({
      path: 'customer.name',
      fallback: undefined,
      formatters: [],
    });
  });

  it('parses path with fallback', () => {
    expect(parseExpression('customer.name || "Guest"')).toEqual({
      path: 'customer.name',
      fallback: 'Guest',
      formatters: [],
    });
  });

  it('parses path with single-quoted fallback', () => {
    expect(parseExpression("name || 'Friend'")).toEqual({
      path: 'name',
      fallback: 'Friend',
      formatters: [],
    });
  });

  it('parses path with formatter', () => {
    expect(parseExpression('order.total | currency')).toEqual({
      path: 'order.total',
      fallback: undefined,
      formatters: [{ name: 'currency', args: [] }],
    });
  });

  it('parses path with formatter with arg', () => {
    expect(parseExpression('order.date | date "short"')).toEqual({
      path: 'order.date',
      fallback: undefined,
      formatters: [{ name: 'date', args: ['short'] }],
    });
  });

  it('parses chained formatters', () => {
    expect(parseExpression('name | trim | upper')).toEqual({
      path: 'name',
      fallback: undefined,
      formatters: [
        { name: 'trim', args: [] },
        { name: 'upper', args: [] },
      ],
    });
  });

  it('parses fallback + formatter combo', () => {
    expect(parseExpression('price || "0" | currency')).toEqual({
      path: 'price',
      fallback: '0',
      formatters: [{ name: 'currency', args: [] }],
    });
  });

  it('trims whitespace around path', () => {
    expect(parseExpression('  customer.name  ')).toEqual({
      path: 'customer.name',
      fallback: undefined,
      formatters: [],
    });
  });

  it('handles unquoted fallback', () => {
    const result = parseExpression('name || Customer');
    expect(result.path).toBe('name');
    expect(result.fallback).toBe('Customer');
  });

  // ── Bug fix: parseFormatters must not split on | inside quoted args ──────

  it('parses formatter with pipe character inside double-quoted arg', () => {
    // Before the fix, `input.split('|')` would break "replace" into two parts.
    expect(parseExpression('text | replace "|" ","')).toEqual({
      path: 'text',
      fallback: undefined,
      formatters: [{ name: 'replace', args: ['|', ','] }],
    });
  });

  it('parses formatter with pipe character inside single-quoted arg', () => {
    expect(parseExpression("text | replace '|' ','" )).toEqual({
      path: 'text',
      fallback: undefined,
      formatters: [{ name: 'replace', args: ['|', ','] }],
    });
  });

  it('parses chained formatters where one has a quoted pipe arg', () => {
    // upper | replace "|" "," | trim — only the middle one has a pipe in arg
    expect(parseExpression('text | upper | replace "|" "," | trim')).toEqual({
      path: 'text',
      fallback: undefined,
      formatters: [
        { name: 'upper', args: [] },
        { name: 'replace', args: ['|', ','] },
        { name: 'trim', args: [] },
      ],
    });
  });

  it('parses fallback + formatter-with-pipe-arg combo', () => {
    expect(parseExpression('val || "–" | replace "|" "/"')).toEqual({
      path: 'val',
      fallback: '–',
      formatters: [{ name: 'replace', args: ['|', '/'] }],
    });
  });
});

// ===========================================================================
// resolveContent
// ===========================================================================

describe('resolveContent', () => {
  const data = {
    customer: { name: 'Sarah' },
    rawHtml: '<b>bold</b>',
    greeting: 'Hi',
  };

  const formatters = {
    upper: (v: unknown) => String(v).toUpperCase(),
    trim: (v: unknown) => String(v).trim(),
  };

  it('keeps text nodes unchanged', () => {
    const content: ASTContent[] = [textNode('Hello World')];
    const result = resolveContent(content, data);
    expect(result).toEqual(content);
  });

  it('resolves expression to text node', () => {
    const content: ASTContent[] = [exprNode('customer.name')];
    const result = resolveContent(content, data);
    expect(result).toHaveLength(1);
    expect(result[0]!.type).toBe('text');
    expect((result[0] as ASTTextNode).value).toBe('Sarah');
  });

  it('HTML-escapes resolved expression', () => {
    const content: ASTContent[] = [exprNode('rawHtml')];
    const result = resolveContent(content, data);
    expect((result[0] as ASTTextNode).value).toBe('&lt;b&gt;bold&lt;/b&gt;');
  });

  it('does NOT escape raw expression', () => {
    const content: ASTContent[] = [exprNode('rawHtml', true)];
    const result = resolveContent(content, data);
    expect((result[0] as ASTTextNode).value).toBe('<b>bold</b>');
  });

  it('uses fallback when value is missing', () => {
    const content: ASTContent[] = [exprNode('customer.email || "no-email"')];
    const result = resolveContent(content, data);
    expect((result[0] as ASTTextNode).value).toBe('no-email');
  });

  it('keeps expression as-is when path is missing and no fallback', () => {
    const node = exprNode('customer.email');
    const content: ASTContent[] = [node];
    const result = resolveContent(content, data);
    expect(result[0]).toBe(node); // Same reference — passthrough
  });

  it('applies formatter to resolved value', () => {
    const content: ASTContent[] = [exprNode('customer.name | upper')];
    const result = resolveContent(content, data, formatters);
    expect((result[0] as ASTTextNode).value).toBe('SARAH');
  });

  it('resolves mixed content (text + expression)', () => {
    const content: ASTContent[] = [
      textNode('Hello '),
      exprNode('customer.name'),
      textNode('!'),
    ];
    const result = resolveContent(content, data);
    expect(result).toHaveLength(3);
    expect((result[0] as ASTTextNode).value).toBe('Hello ');
    expect((result[1] as ASTTextNode).value).toBe('Sarah');
    expect((result[2] as ASTTextNode).value).toBe('!');
  });

  it('passes through unknown path in mixed content', () => {
    const content: ASTContent[] = [
      textNode('Hi '),
      exprNode('unknown.path'),
    ];
    const result = resolveContent(content, data);
    expect(result[0]!.type).toBe('text');
    expect(result[1]!.type).toBe('expression');
  });

  it('applies formatter to fallback value when path is missing', () => {
    // {{missing || "guest" | upper}} → "GUEST"
    const content: ASTContent[] = [exprNode('missing || "guest" | upper')];
    const result = resolveContent(content, data, formatters);
    expect((result[0] as ASTTextNode).value).toBe('GUEST');
  });

  it('does not apply fallback for zero value (0 is a valid resolved value)', () => {
    const zeroData = { count: 0 };
    // {{count || "none"}} — 0 is a real value, fallback must NOT kick in
    const content: ASTContent[] = [exprNode('count || "none"')];
    const result = resolveContent(content, zeroData);
    expect((result[0] as ASTTextNode).value).toBe('0');
  });

  it('does not apply fallback for boolean false (false is a valid resolved value)', () => {
    const boolData = { active: false };
    const content: ASTContent[] = [exprNode('active || "yes"')];
    const result = resolveContent(content, boolData);
    expect((result[0] as ASTTextNode).value).toBe('false');
  });
});

// ===========================================================================
// resolveAttributes
// ===========================================================================

describe('resolveAttributes', () => {
  const data = {
    order: { id: 'ORD-9842' },
    color: '#ff0000',
  };

  it('keeps static attributes unchanged', () => {
    const attrs = { href: 'https://example.com', target: '_blank' };
    const result = resolveAttributes(attrs, data);
    expect(result).toEqual(attrs);
  });

  it('resolves expression in attribute value', () => {
    const attrs = { href: 'https://example.com/orders/{{order.id}}' };
    const result = resolveAttributes(attrs, data);
    expect(result.href).toBe('https://example.com/orders/ORD-9842');
  });

  it('resolves multiple expressions in one value', () => {
    const attrs = { style: 'color: {{color}}; order: {{order.id}}' };
    const result = resolveAttributes(attrs, data);
    expect(result.style).toBe('color: #ff0000; order: ORD-9842');
  });

  it('keeps unresolved expression as-is', () => {
    const attrs = { href: 'https://example.com/{{unknown}}' };
    const result = resolveAttributes(attrs, data);
    expect(result.href).toBe('https://example.com/{{unknown}}');
  });

  it('resolves with formatters', () => {
    const formatters = { upper: (v: unknown) => String(v).toUpperCase() };
    const attrs = { title: '{{order.id | upper}}' };
    const result = resolveAttributes(attrs, data, formatters);
    expect(result.title).toBe('ORD-9842');
  });
});
