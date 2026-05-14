/**
 * Tests for loop expansion (mc-for-each).
 *
 * Covers BUILD_ORDER item 10.5.21.
 */

import { describe, it, expect } from 'vitest';
import { expandForEach } from '../../src/template/index.js';
import type { ASTNode, SourceLocation } from '../../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LOC: SourceLocation = {
  start: { line: 1, col: 1, offset: 0 },
  end: { line: 1, col: 10, offset: 9 },
};

function makeForEach(collection: string, as: string, children: ASTNode[]): ASTNode {
  return {
    type: 'mc-for-each',
    attributes: { collection, as },
    children,
    content: [],
    loc: LOC,
  };
}

function makeTextNode(exprValue: string): ASTNode {
  return {
    type: 'mc-text',
    attributes: {},
    children: [],
    content: [{ type: 'expression', value: exprValue, raw: false, loc: LOC }],
    loc: LOC,
  };
}

/**
 * Simple identity resolveNode for testing loop expansion.
 * In real usage this would be the recursive resolveTemplate.
 */
function identityResolve(node: ASTNode): ASTNode {
  return node;
}

describe('expandForEach', () => {
  it('returns empty array for 0 items', () => {
    const node = makeForEach('items', 'item', [makeTextNode('item.name')]);
    const data = { items: [] };
    const result = expandForEach(node, data, identityResolve);
    expect(result).toEqual([]);
  });

  it('expands 3 items into 3 copies', () => {
    const child = makeTextNode('item.name');
    const node = makeForEach('items', 'item', [child]);
    const data = { items: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] };
    const result = expandForEach(node, data, identityResolve);
    expect(result).toHaveLength(3);
  });

  it('returns empty for non-array collection', () => {
    const node = makeForEach('name', 'item', [makeTextNode('item')]);
    const data = { name: 'not an array' };
    const result = expandForEach(node, data, identityResolve);
    expect(result).toEqual([]);
  });

  it('returns empty for missing collection', () => {
    const node = makeForEach('missing', 'item', [makeTextNode('item')]);
    const result = expandForEach(node, {}, identityResolve);
    expect(result).toEqual([]);
  });

  it('injects _index, _first, _last into scoped data', () => {
    const captured: Record<string, unknown>[] = [];
    const capturingResolve = (n: ASTNode, d: Record<string, unknown>): ASTNode => {
      captured.push({ ...d });
      return n;
    };

    const child = makeTextNode('item.name');
    const node = makeForEach('items', 'item', [child]);
    const data = { items: ['a', 'b', 'c'] };

    expandForEach(node, data, capturingResolve);

    expect(captured).toHaveLength(3);
    expect(captured[0]).toBeDefined();
    if (captured[0]) {
      expect(captured[0]._index).toBe(0);
      expect(captured[0]._first).toBe(true);
      expect(captured[0]._last).toBe(false);
    }

    expect(captured[1]).toBeDefined();
    if (captured[1]) {
      expect(captured[1]._index).toBe(1);
      expect(captured[1]._first).toBe(false);
      expect(captured[1]._last).toBe(false);
    }

    expect(captured[2]).toBeDefined();
    if (captured[2]) {
      expect(captured[2]._index).toBe(2);
      expect(captured[2]._first).toBe(false);
      expect(captured[2]._last).toBe(true);
    }
  });

  it('injects scoped variable with the correct name', () => {
    const captured: Record<string, unknown>[] = [];
    const capturingResolve = (n: ASTNode, d: Record<string, unknown>): ASTNode => {
      captured.push({ ...d });
      return n;
    };

    const child = makeTextNode('product.name');
    const node = makeForEach('products', 'product', [child]);
    const data = { products: [{ name: 'Widget' }] };

    expandForEach(node, data, capturingResolve);

    expect(captured).toHaveLength(1);
    expect(captured[0]).toBeDefined();
    if (captured[0]) {
      expect(captured[0].product).toEqual({ name: 'Widget' });
    }
  });

  it('does not leak scope to parent data', () => {
    const captured: Record<string, unknown>[] = [];
    const capturingResolve = (n: ASTNode, d: Record<string, unknown>): ASTNode => {
      captured.push({ ...d });
      return n;
    };

    const child = makeTextNode('item');
    const node = makeForEach('items', 'item', [child]);
    const parentData = { items: ['a'], other: 'preserved' };

    expandForEach(node, parentData, capturingResolve);

    expect(captured).toHaveLength(1);
    expect(captured[0]).toBeDefined();
    if (captured[0]) {
      expect(captured[0].other).toBe('preserved');
      expect(captured[0].item).toBe('a');
    }
  });

  it('handles single-item collection', () => {
    const captured: Record<string, unknown>[] = [];
    const capturingResolve = (n: ASTNode, d: Record<string, unknown>): ASTNode => {
      captured.push({ ...d });
      return n;
    };

    const child = makeTextNode('item');
    const node = makeForEach('items', 'item', [child]);
    const data = { items: ['only'] };

    expandForEach(node, data, capturingResolve);

    expect(captured).toHaveLength(1);
    expect(captured[0]).toBeDefined();
    if (captured[0]) {
      expect(captured[0]._first).toBe(true);
      expect(captured[0]._last).toBe(true);
      expect(captured[0]._index).toBe(0);
    }
  });

  it('uses default "item" when as attribute is missing', () => {
    const captured: Record<string, unknown>[] = [];
    const capturingResolve = (n: ASTNode, d: Record<string, unknown>): ASTNode => {
      captured.push({ ...d });
      return n;
    };

    const forNode: ASTNode = {
      type: 'mc-for-each',
      attributes: { collection: 'items' },
      children: [makeTextNode('item')],
      content: [],
      loc: LOC,
    };
    const data = { items: ['x'] };

    expandForEach(forNode, data, capturingResolve);

    expect(captured).toHaveLength(1);
    expect(captured[0]).toBeDefined();
    if (captured[0]) {
      expect(captured[0].item).toBe('x');
    }
  });

  // ── Bug fix: prototype pollution via `as` attribute ───────────────────────

  it('returns empty for as="__proto__" (blocks prototype pollution)', () => {
    const node = makeForEach('items', '__proto__', [makeTextNode('item.name')]);
    const data = { items: [{ name: 'x' }] };
    const result = expandForEach(node, data, identityResolve);
    // Must not iterate — and must not pollute Object.prototype
    expect(result).toEqual([]);
    // Verify Object.prototype was not polluted
    expect(({} as Record<string, unknown>)['name']).toBeUndefined();
  });

  it('returns empty for as="constructor" (blocks prototype pollution)', () => {
    const node = makeForEach('items', 'constructor', [makeTextNode('item')]);
    const data = { items: ['a'] };
    const result = expandForEach(node, data, identityResolve);
    expect(result).toEqual([]);
  });

  it('returns empty for as="prototype" (blocks prototype pollution)', () => {
    const node = makeForEach('items', 'prototype', [makeTextNode('item')]);
    const data = { items: ['a'] };
    const result = expandForEach(node, data, identityResolve);
    expect(result).toEqual([]);
  });
});

// ===========================================================================
// _total metadata
// ===========================================================================

describe('_total loop metadata', () => {
  it('injects _total as collection length', () => {
    const captured: Record<string, unknown>[] = [];
    const capturingResolve = (n: ASTNode, d: Record<string, unknown>): ASTNode => {
      captured.push({ ...d });
      return n;
    };

    const node = makeForEach('items', 'item', [makeTextNode('item')]);
    const data = { items: ['a', 'b', 'c'] };

    expandForEach(node, data, capturingResolve);

    expect(captured).toHaveLength(3);
    captured.forEach((scope) => {
      expect(scope._total).toBe(3);
    });
  });

  it('_total is 1 for single-item collection', () => {
    const captured: Record<string, unknown>[] = [];
    const capturingResolve = (n: ASTNode, d: Record<string, unknown>): ASTNode => {
      captured.push({ ...d });
      return n;
    };

    const node = makeForEach('items', 'item', [makeTextNode('item')]);
    expandForEach(node, { items: ['only'] }, capturingResolve);

    expect(captured[0]?._total).toBe(1);
  });

});

// ===========================================================================
// index alias attribute
// ===========================================================================

describe('index alias attribute', () => {
  it('injects named alias from index attribute alongside _index', () => {
    const captured: Record<string, unknown>[] = [];
    const capturingResolve = (n: ASTNode, d: Record<string, unknown>): ASTNode => {
      captured.push({ ...d });
      return n;
    };

    const node: ASTNode = {
      type: 'mc-for-each',
      attributes: { collection: 'items', as: 'item', index: 'i' },
      children: [makeTextNode('item')],
      content: [],
      loc: LOC,
    };

    expandForEach(node, { items: ['a', 'b', 'c'] }, capturingResolve);

    expect(captured).toHaveLength(3);
    expect(captured[0]?.i).toBe(0);
    expect(captured[1]?.i).toBe(1);
    expect(captured[2]?.i).toBe(2);
    // _index still present as well
    expect(captured[0]?._index).toBe(0);
  });

  it('index alias equals _index value', () => {
    const captured: Record<string, unknown>[] = [];
    const capturingResolve = (n: ASTNode, d: Record<string, unknown>): ASTNode => {
      captured.push({ ...d });
      return n;
    };

    const node: ASTNode = {
      type: 'mc-for-each',
      attributes: { collection: 'items', as: 'item', index: 'rowNum' },
      children: [makeTextNode('item')],
      content: [],
      loc: LOC,
    };

    expandForEach(node, { items: ['x', 'y'] }, capturingResolve);

    captured.forEach((scope, i) => {
      expect(scope.rowNum).toBe(scope._index);
      expect(scope.rowNum).toBe(i);
    });
  });

  it('no index alias when index attribute is absent', () => {
    const captured: Record<string, unknown>[] = [];
    const capturingResolve = (n: ASTNode, d: Record<string, unknown>): ASTNode => {
      captured.push({ ...d });
      return n;
    };

    const node = makeForEach('items', 'item', [makeTextNode('item')]);
    expandForEach(node, { items: ['a'] }, capturingResolve);

    // Only _index, not any extra alias
    expect(captured[0]?.i).toBeUndefined();
  });

  it('blocks prototype-polluting index alias names', () => {
    const node: ASTNode = {
      type: 'mc-for-each',
      attributes: { collection: 'items', as: 'item', index: '__proto__' },
      children: [makeTextNode('item')],
      content: [],
      loc: LOC,
    };

    // Should not throw and should not inject __proto__
    const result = expandForEach(node, { items: ['a'] }, identityResolve);
    expect(result).toHaveLength(1);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });
});

// ===========================================================================
// Nested loop — outer index alias survives the inner loop
// ===========================================================================

describe('nested loop — outer index alias accessible inside inner loop', () => {
  it('outer index alias (not _index) is accessible inside nested loop', () => {
    const captured: Record<string, unknown>[] = [];

    // Simulate: outer loop sets index="orderIdx", inner loop overwrites _index
    // The outer orderIdx should still be readable inside the inner loop scope
    const innerNode = makeForEach('order.items', 'item', [makeTextNode('item')]);
    const outerNode: ASTNode = {
      type: 'mc-for-each',
      attributes: { collection: 'orders', as: 'order', index: 'orderIdx' },
      children: [innerNode],
      content: [],
      loc: LOC,
    };

    // We test by checking what data the resolveNode callback receives for inner items
    // Use a real resolve that passes data through to inner loops
    function realResolve(n: ASTNode, d: Record<string, unknown>): ASTNode {
      captured.push({ ...d });
      if (n.type === 'mc-for-each') {
        return { ...n, children: expandForEach(n, d, realResolve) };
      }
      return n;
    }

    const data = {
      orders: [
        { id: 'A', items: ['a1', 'a2'] },
        { id: 'B', items: ['b1'] },
      ],
    };

    expandForEach(outerNode, data, realResolve);

    // inner loop iterations should still have orderIdx from outer scope
    const innerScopes = captured.filter((s) => 'item' in s);
    expect(innerScopes.length).toBe(3); // 2 items + 1 item
    innerScopes.forEach((scope) => {
      // orderIdx was set by the outer loop and is NOT overwritten by inner loop
      expect(typeof scope.orderIdx).toBe('number');
    });
  });
});
