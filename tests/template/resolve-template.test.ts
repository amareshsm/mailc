/**
 * Tests for the resolveTemplate full-tree walker.
 *
 * Covers BUILD_ORDER items 10.5.22 (full tree), 10.5.13 (passthrough),
 * 10.5.14 (external syntax passthrough), 10.5.27 (security).
 */

import { describe, it, expect } from 'vitest';
import { resolveTemplate } from '../../src/template/index.js';
import type { ASTNode, SourceLocation } from '../../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LOC: SourceLocation = {
  start: { line: 1, col: 1, offset: 0 },
  end: { line: 1, col: 10, offset: 9 },
};

function node(
  type: string,
  attrs: Record<string, string> = {},
  children: ASTNode[] = [],
  content: ASTNode['content'] = [],
): ASTNode {
  return { type, attributes: attrs, children, content, loc: LOC };
}

function text(value: string): ASTNode['content'][number] {
  return { type: 'text', value, loc: LOC };
}

function expr(value: string, raw = false, fallback?: string): ASTNode['content'][number] {
  return { type: 'expression', value, raw, fallback, loc: LOC };
}

/** Helper to get text content from resolved AST node. */
function getTextContent(n: ASTNode): string {
  return n.content.map((c) => (c.type === 'text' ? c.value : `{{${c.value}}}`)).join('');
}

// ===========================================================================
// Full tree resolution
// ===========================================================================

describe('resolveTemplate — full tree', () => {
  it('resolves expressions in leaf content', () => {
    const ast = node('mc-body', {}, [
      node('mc-section', {}, [
        node('mc-column', {}, [
          node('mc-text', {}, [], [text('Hello '), expr('name'), text('!')]),
        ]),
      ]),
    ]);

    const result = resolveTemplate(ast, { name: 'Sarah' });

    const mcText = result.children[0]!.children[0]!.children[0]!;
    expect(getTextContent(mcText)).toBe('Hello Sarah!');
  });

  it('resolves expressions in attributes', () => {
    const ast = node('mc-body', {}, [
      node('mc-section', {}, [
        node('mc-column', {}, [
          node('mc-button', { href: 'https://example.com/orders/{{order.id}}' }, [], [text('View Order')]),
        ]),
      ]),
    ]);

    const result = resolveTemplate(ast, { order: { id: 'ORD-123' } });

    const mcButton = result.children[0]!.children[0]!.children[0]!;
    expect(mcButton.attributes.href).toBe('https://example.com/orders/ORD-123');
  });

  it('evaluates mc-if (truthy) — keeps children', () => {
    const ast = node('mc-body', {}, [
      node('mc-if', { condition: 'showMessage' }, [
        node('mc-text', {}, [], [text('Visible!')]),
      ]),
    ]);

    const result = resolveTemplate(ast, { showMessage: true });

    expect(result.children).toHaveLength(1);
    expect(result.children[0]!.type).toBe('mc-text');
    expect(getTextContent(result.children[0]!)).toBe('Visible!');
  });

  it('evaluates mc-if (falsy) — removes children', () => {
    const ast = node('mc-body', {}, [
      node('mc-if', { condition: 'showMessage' }, [
        node('mc-text', {}, [], [text('Hidden')]),
      ]),
    ]);

    const result = resolveTemplate(ast, { showMessage: false });

    expect(result.children).toHaveLength(0);
  });

  it('evaluates mc-if / mc-else chain', () => {
    const ast = node('mc-body', {}, [
      node('mc-if', { condition: 'isPremium' }, [
        node('mc-text', {}, [], [text('Premium user')]),
      ]),
      node('mc-else', {}, [
        node('mc-text', {}, [], [text('Free user')]),
      ]),
    ]);

    // isPremium = false → mc-else wins
    const result = resolveTemplate(ast, { isPremium: false });

    expect(result.children).toHaveLength(1);
    expect(getTextContent(result.children[0]!)).toBe('Free user');
  });

  it('evaluates mc-if / mc-else-if / mc-else chain', () => {
    const ast = node('mc-body', {}, [
      node('mc-if', { condition: 'isAdmin' }, [
        node('mc-text', {}, [], [text('Admin')]),
      ]),
      node('mc-else-if', { condition: 'isMod' }, [
        node('mc-text', {}, [], [text('Moderator')]),
      ]),
      node('mc-else', {}, [
        node('mc-text', {}, [], [text('User')]),
      ]),
    ]);

    // isMod = true → mc-else-if wins
    const result1 = resolveTemplate(ast, { isAdmin: false, isMod: true });
    expect(result1.children).toHaveLength(1);
    expect(getTextContent(result1.children[0]!)).toBe('Moderator');

    // isAdmin = true → mc-if wins
    const result2 = resolveTemplate(ast, { isAdmin: true, isMod: true });
    expect(result2.children).toHaveLength(1);
    expect(getTextContent(result2.children[0]!)).toBe('Admin');

    // Both false → mc-else wins
    const result3 = resolveTemplate(ast, { isAdmin: false, isMod: false });
    expect(result3.children).toHaveLength(1);
    expect(getTextContent(result3.children[0]!)).toBe('User');
  });

  it('expands mc-for-each', () => {
    const ast = node('mc-body', {}, [
      node('mc-for-each', { collection: 'items', as: 'item' }, [
        node('mc-text', {}, [], [expr('item.name')]),
      ]),
    ]);

    const data = {
      items: [{ name: 'Headphones' }, { name: 'Cable' }],
    };

    const result = resolveTemplate(ast, data);

    expect(result.children).toHaveLength(2);
    expect(getTextContent(result.children[0]!)).toBe('Headphones');
    expect(getTextContent(result.children[1]!)).toBe('Cable');
  });

  it('expands mc-for-each with loop metadata', () => {
    const ast = node('mc-body', {}, [
      node('mc-for-each', { collection: 'names', as: 'name' }, [
        node('mc-text', {}, [], [expr('name'), text(' '), expr('_index')]),
      ]),
    ]);

    const data = { names: ['A', 'B', 'C'] };
    const result = resolveTemplate(ast, data);

    expect(result.children).toHaveLength(3);
    expect(getTextContent(result.children[0]!)).toBe('A 0');
    expect(getTextContent(result.children[2]!)).toBe('C 2');
  });

  it('handles mixed if + for-each + expressions', () => {
    const ast = node('mc-body', {}, [
      node('mc-text', {}, [], [text('Hello '), expr('customer.name')]),
      node('mc-if', { condition: 'hasItems' }, [
        node('mc-for-each', { collection: 'items', as: 'item' }, [
          node('mc-text', {}, [], [expr('item.name')]),
        ]),
      ]),
    ]);

    const data = {
      customer: { name: 'Sarah' },
      hasItems: true,
      items: [{ name: 'Widget' }, { name: 'Gadget' }],
    };

    const result = resolveTemplate(ast, data);

    // First child: resolved greeting
    expect(getTextContent(result.children[0]!)).toBe('Hello Sarah');
    // Second/third: expanded loop items (from mc-if > mc-for-each)
    expect(result.children).toHaveLength(3);
    expect(getTextContent(result.children[1]!)).toBe('Widget');
    expect(getTextContent(result.children[2]!)).toBe('Gadget');
  });

  it('applies formatters in resolved expressions', () => {
    const ast = node('mc-body', {}, [
      node('mc-text', {}, [], [expr('price | currency')]),
    ]);

    const formatters = {
      currency: (v: unknown) => `$${(Number(v) / 100).toFixed(2)}`,
    };

    const result = resolveTemplate(ast, { price: 12750 }, formatters);

    expect(getTextContent(result.children[0]!)).toBe('$127.50');
  });

  it('does not mutate the original AST', () => {
    const original = node('mc-body', {}, [
      node('mc-text', {}, [], [expr('name')]),
    ]);

    const originalContent = [...original.children[0]!.content];
    resolveTemplate(original, { name: 'Sarah' });

    // Original is untouched
    expect(original.children[0]!.content).toEqual(originalContent);
    expect(original.children[0]!.content[0]!.type).toBe('expression');
  });
});

// ===========================================================================
// Passthrough behavior
// ===========================================================================

describe('resolveTemplate — passthrough', () => {
  it('passes through expressions when path is not in data', () => {
    const ast = node('mc-body', {}, [
      node('mc-text', {}, [], [expr('unknown.path')]),
    ]);

    const result = resolveTemplate(ast, {});

    // Expression should remain as-is
    expect(result.children[0]!.content[0]!.type).toBe('expression');
  });

  it('passes through attribute expressions when path is missing', () => {
    const ast = node('mc-body', {}, [
      node('mc-button', { href: 'https://example.com/{{missing}}' }, [], [text('Click')]),
    ]);

    const result = resolveTemplate(ast, {});

    expect(result.children[0]!.attributes.href).toBe('https://example.com/{{missing}}');
  });

  it('resolves some expressions, passes through others', () => {
    const ast = node('mc-body', {}, [
      node('mc-text', {}, [], [
        text('Hi '),
        expr('name'),
        text(', your code is '),
        expr('code'),
      ]),
    ]);

    const result = resolveTemplate(ast, { name: 'Sarah' });

    const content = result.children[0]!.content;
    expect(content[0]!.type).toBe('text');
    expect((content[0] as { value: string }).value).toBe('Hi ');
    expect(content[1]!.type).toBe('text'); // resolved
    expect((content[1] as { value: string }).value).toBe('Sarah');
    expect(content[2]!.type).toBe('text');
    expect((content[2] as { value: string }).value).toBe(', your code is ');
    expect(content[3]!.type).toBe('expression'); // unresolved — passthrough
  });
});

// ===========================================================================
// Security
// ===========================================================================

describe('resolveTemplate — security', () => {
  it('blocks __proto__ in content expressions', () => {
    const ast = node('mc-body', {}, [
      node('mc-text', {}, [], [expr('__proto__.polluted')]),
    ]);

    const result = resolveTemplate(ast, {});

    // Should NOT resolve — remains as expression
    expect(result.children[0]!.content[0]!.type).toBe('expression');
  });

  it('blocks constructor in attribute expressions', () => {
    const ast = node('mc-body', {}, [
      node('mc-button', { href: '{{constructor.name}}' }, [], [text('Click')]),
    ]);

    const result = resolveTemplate(ast, {});

    expect(result.children[0]!.attributes.href).toBe('{{constructor.name}}');
  });

  it('blocks prototype in deeply nested path', () => {
    const ast = node('mc-body', {}, [
      node('mc-text', {}, [], [expr('obj.prototype.hack')]),
    ]);

    const result = resolveTemplate(ast, { obj: {} });

    expect(result.children[0]!.content[0]!.type).toBe('expression');
  });
});

// ===========================================================================
// Bug 5 fix: mc-each alias handled the same as mc-for-each
// ===========================================================================

describe('resolveTemplate — mc-each alias', () => {
  it('expands mc-each with items attribute the same as mc-for-each', () => {
    const ast = node('mc-body', {}, [
      node('mc-each', { items: 'products', as: 'product' }, [
        node('mc-text', {}, [], [expr('product.name')]),
      ]),
    ]);

    const result = resolveTemplate(ast, {
      products: [{ name: 'Widget' }, { name: 'Gadget' }],
    });

    // mc-each should expand to 2 mc-text nodes, not remain as mc-each
    expect(result.children).toHaveLength(2);
    expect(result.children[0]!.type).toBe('mc-text');
    expect(result.children[1]!.type).toBe('mc-text');
  });

  it('resolves expressions in mc-each children', () => {
    const ast = node('mc-body', {}, [
      node('mc-each', { items: 'items', as: 'item' }, [
        node('mc-text', {}, [], [expr('item.label')]),
      ]),
    ]);

    const result = resolveTemplate(ast, {
      items: [{ label: 'Alpha' }],
    });

    const textNode = result.children[0]!;
    const textPart = textNode.content[0];
    expect(textPart?.type).toBe('text');
    expect(textPart?.value).toBe('Alpha');
  });

  it('returns empty children for mc-each with empty array', () => {
    const ast = node('mc-body', {}, [
      node('mc-each', { items: 'list', as: 'x' }, [
        node('mc-text', {}, [], [text('item')]),
      ]),
    ]);

    const result = resolveTemplate(ast, { list: [] });

    expect(result.children).toHaveLength(0);
  });
});

// ===========================================================================
// onMissing callback (powers templateEngine.strictVariables)
// ===========================================================================

describe('resolveTemplate — onMissing callback', () => {
  it('invokes onMissing for unresolved content expressions', () => {
    const ast = node('mc-text', {}, [], [expr('user.email')]);
    const missing: { path: string; expression: string }[] = [];

    resolveTemplate(ast, { user: { name: 'A' } }, undefined, false, (info) => {
      missing.push({ path: info.path, expression: info.expression });
    });

    expect(missing).toHaveLength(1);
    expect(missing[0]?.path).toBe('user.email');
  });

  it('invokes onMissing for unresolved attribute expressions', () => {
    const ast = node('mc-button', { href: 'https://x.com/{{user.id}}' });
    const missing: string[] = [];

    resolveTemplate(ast, {}, undefined, false, (info) => {
      missing.push(info.path);
    });

    expect(missing).toContain('user.id');
  });

  it('does NOT invoke onMissing when the expression has a fallback', () => {
    const ast = node('mc-text', {}, [], [expr('user.name || "Guest"')]);
    const missing: string[] = [];

    resolveTemplate(ast, {}, undefined, false, (info) => {
      missing.push(info.path);
    });

    expect(missing).toHaveLength(0);
  });

  it('does NOT invoke onMissing when the path resolves to an empty string', () => {
    const ast = node('mc-text', {}, [], [expr('user.name')]);
    const missing: string[] = [];

    resolveTemplate(ast, { user: { name: '' } }, undefined, false, (info) => {
      missing.push(info.path);
    });

    expect(missing).toHaveLength(0);
  });

  it('reports each missing path within a loop iteration', () => {
    const ast = node('mc-body', {}, [
      node('mc-for-each', { collection: 'items', as: 'item' }, [
        node('mc-text', {}, [], [expr('item.missing')]),
      ]),
    ]);
    const missing: string[] = [];

    resolveTemplate(ast, { items: [{ name: 'a' }, { name: 'b' }] }, undefined, false, (info) => {
      missing.push(info.path);
    });

    expect(missing).toEqual(['item.missing', 'item.missing']);
  });

  it('threads onMissing through conditional branches', () => {
    const ast = node('mc-body', {}, [
      node('mc-if', { condition: 'show' }, [
        node('mc-text', {}, [], [expr('user.email')]),
      ]),
    ]);
    const missing: string[] = [];

    resolveTemplate(ast, { show: true, user: {} }, undefined, false, (info) => {
      missing.push(info.path);
    });

    expect(missing).toEqual(['user.email']);
  });

  it('does NOT invoke onMissing when no callback is provided (default behaviour)', () => {
    const ast = node('mc-text', {}, [], [expr('user.email')]);
    // Should not throw — passthrough is the default
    const result = resolveTemplate(ast, {});
    expect(result.content).toHaveLength(1);
  });
});

// ===========================================================================
// strictVariables config field — end-to-end through compile()
// ===========================================================================

describe('compile() — config.templateEngine.strictVariables', () => {
  it('passes through missing variables when strictVariables is false (default)', async () => {
    const { compile, mergeConfig } = await import('../../src/index.js');
    const src = '<mc><mc-body><mc-section><mc-column><mc-text>Hi {{missing}}</mc-text></mc-column></mc-section></mc-body></mc>';
    const result = compile(src, {
      config: mergeConfig({ templateEngine: { strictVariables: false } }),
      data: {},
    });
    expect(result.errors.filter((e) => e.code === 'UNDEFINED_VARIABLE')).toHaveLength(0);
    expect(result.html).toContain('{{missing}}');
  });

  it('emits UNDEFINED_VARIABLE error when strictVariables is true and a variable is missing', async () => {
    const { compile, mergeConfig } = await import('../../src/index.js');
    const src = '<mc><mc-body><mc-section><mc-column><mc-text>Hi {{user.name}}</mc-text></mc-column></mc-section></mc-body></mc>';
    const result = compile(src, {
      config: mergeConfig({ templateEngine: { strictVariables: true } }),
      data: {},
    });
    const undef = result.errors.filter((e) => e.code === 'UNDEFINED_VARIABLE');
    expect(undef).toHaveLength(1);
    expect(undef[0]?.message).toContain('user.name');
    expect(undef[0]?.severity).toBe('error');
    expect(result.partial).toBe(true);
  });

  it('emits no errors when strictVariables is true and all variables are present', async () => {
    const { compile, mergeConfig } = await import('../../src/index.js');
    const src = '<mc><mc-body><mc-section><mc-column><mc-text>Hi {{user.name}}</mc-text></mc-column></mc-section></mc-body></mc>';
    const result = compile(src, {
      config: mergeConfig({ templateEngine: { strictVariables: true } }),
      data: { user: { name: 'Amaresh' } },
    });
    expect(result.errors.filter((e) => e.code === 'UNDEFINED_VARIABLE')).toHaveLength(0);
    expect(result.html).toContain('Amaresh');
  });

  it('emits no errors when strictVariables is true but the expression has a fallback', async () => {
    const { compile, mergeConfig } = await import('../../src/index.js');
    const src = '<mc><mc-body><mc-section><mc-column><mc-text>Hi {{user.name || "Guest"}}</mc-text></mc-column></mc-section></mc-body></mc>';
    const result = compile(src, {
      config: mergeConfig({ templateEngine: { strictVariables: true } }),
      data: {},
    });
    expect(result.errors.filter((e) => e.code === 'UNDEFINED_VARIABLE')).toHaveLength(0);
    expect(result.html).toContain('Guest');
  });

  it('catches missing variables inside attribute expressions', async () => {
    const { compile, mergeConfig } = await import('../../src/index.js');
    const src = '<mc><mc-body><mc-section><mc-column><mc-button href="https://x.com/{{user.id}}">Go</mc-button></mc-column></mc-section></mc-body></mc>';
    const result = compile(src, {
      config: mergeConfig({ templateEngine: { strictVariables: true } }),
      data: {},
    });
    const undef = result.errors.filter((e) => e.code === 'UNDEFINED_VARIABLE');
    expect(undef).toHaveLength(1);
    expect(undef[0]?.message).toContain('user.id');
  });
});
