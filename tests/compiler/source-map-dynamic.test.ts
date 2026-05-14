/**
 * SM-D: Dynamic Template Tracking tests.
 *
 * Verifies that `compile(source, { debug: true })` populates
 * `SourceMapEntry.loop`, `SourceMapEntry.conditional`, and
 * `SourceMapEntry.expressions` when template constructs are used.
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compile.js';
import type { SourceMapEntry } from '../../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function entriesFor(entries: SourceMapEntry[], component: string): SourceMapEntry[] {
  return entries.filter((e) => e.sourceComponent === component);
}

// ---------------------------------------------------------------------------
// Loop tracking (mc-each)
// ---------------------------------------------------------------------------

describe('SM-D: mc-each loop tracking', () => {
  const LOOP_TEMPLATE = `<mc>
<mc-head><mc-title>Loop</mc-title></mc-head>
<mc-body>
  <mc-section>
    <mc-column>
      <mc-each items="products" as="product">
        <mc-text>{{product.name}}</mc-text>
      </mc-each>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;

  const LOOP_DATA = {
    products: [
      { name: 'Alpha' },
      { name: 'Beta' },
      { name: 'Gamma' },
    ],
  };

  it('emits one loop-iteration entry per item', () => {
    const result = compile(LOOP_TEMPLATE, { debug: true, data: LOOP_DATA });
    const loopEntries = entriesFor(result.sourceMap!.entries, '_mc-loop-iteration');
    expect(loopEntries).toHaveLength(3);
  });

  it('each entry has loop.iterationIndex 0, 1, 2', () => {
    const result = compile(LOOP_TEMPLATE, { debug: true, data: LOOP_DATA });
    const loopEntries = entriesFor(result.sourceMap!.entries, '_mc-loop-iteration');
    const indices = loopEntries.map((e) => e.loop!.iterationIndex).sort();
    expect(indices).toEqual([0, 1, 2]);
  });

  it('each entry has loop.totalIterations === 3', () => {
    const result = compile(LOOP_TEMPLATE, { debug: true, data: LOOP_DATA });
    const loopEntries = entriesFor(result.sourceMap!.entries, '_mc-loop-iteration');
    for (const entry of loopEntries) {
      expect(entry.loop!.totalIterations).toBe(3);
    }
  });

  it('each entry has loop.itemsExpression === "products"', () => {
    const result = compile(LOOP_TEMPLATE, { debug: true, data: LOOP_DATA });
    const loopEntries = entriesFor(result.sourceMap!.entries, '_mc-loop-iteration');
    for (const entry of loopEntries) {
      expect(entry.loop!.itemsExpression).toBe('products');
    }
  });

  it('each entry has loop.loopVariable === "product"', () => {
    const result = compile(LOOP_TEMPLATE, { debug: true, data: LOOP_DATA });
    const loopEntries = entriesFor(result.sourceMap!.entries, '_mc-loop-iteration');
    for (const entry of loopEntries) {
      expect(entry.loop!.loopVariable).toBe('product');
    }
  });

  it('each entry has the correct iterationData', () => {
    const result = compile(LOOP_TEMPLATE, { debug: true, data: LOOP_DATA });
    const loopEntries = entriesFor(result.sourceMap!.entries, '_mc-loop-iteration');
    // Sort by iteration index
    const sorted = [...loopEntries].sort((a, b) => a.loop!.iterationIndex - b.loop!.iterationIndex);
    expect((sorted[0]!.loop!.iterationData as { name: string }).name).toBe('Alpha');
    expect((sorted[1]!.loop!.iterationData as { name: string }).name).toBe('Beta');
    expect((sorted[2]!.loop!.iterationData as { name: string }).name).toBe('Gamma');
  });

  it('emits zero loop entries when the collection is empty', () => {
    const result = compile(LOOP_TEMPLATE, { debug: true, data: { products: [] } });
    const loopEntries = entriesFor(result.sourceMap!.entries, '_mc-loop-iteration');
    expect(loopEntries).toHaveLength(0);
  });

  it('emits zero loop entries when the data key is missing', () => {
    const result = compile(LOOP_TEMPLATE, { debug: true, data: {} });
    const loopEntries = entriesFor(result.sourceMap!.entries, '_mc-loop-iteration');
    expect(loopEntries).toHaveLength(0);
  });

  it('loop entries have role: "loop-iteration"', () => {
    const result = compile(LOOP_TEMPLATE, { debug: true, data: LOOP_DATA });
    const loopEntries = entriesFor(result.sourceMap!.entries, '_mc-loop-iteration');
    for (const entry of loopEntries) {
      expect(entry.role).toBe('loop-iteration');
    }
  });

  it('does NOT emit loop entries in production mode', () => {
    const result = compile(LOOP_TEMPLATE, { data: LOOP_DATA });
    expect(result.sourceMap).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Conditional tracking (mc-if / mc-else)
// ---------------------------------------------------------------------------

describe('SM-D: mc-if conditional tracking', () => {
  const COND_TEMPLATE = `<mc>
<mc-head><mc-title>Cond</mc-title></mc-head>
<mc-body>
  <mc-section>
    <mc-column>
      <mc-if condition="user.isPro">
        <mc-text>Pro content</mc-text>
      </mc-if>
      <mc-else>
        <mc-text>Free content</mc-text>
      </mc-else>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;

  it('emits a conditional-branch entry when mc-if condition is truthy', () => {
    const result = compile(COND_TEMPLATE, { debug: true, data: { user: { isPro: true } } });
    const condEntries = entriesFor(result.sourceMap!.entries, '_mc-conditional-branch');
    expect(condEntries.length).toBeGreaterThan(0);
  });

  it('truthy branch has conditional.branchTaken: true', () => {
    const result = compile(COND_TEMPLATE, { debug: true, data: { user: { isPro: true } } });
    const condEntry = entriesFor(result.sourceMap!.entries, '_mc-conditional-branch')[0]!;
    expect(condEntry.conditional!.branchTaken).toBe(true);
  });

  it('truthy branch has conditional.type: "mc-if"', () => {
    const result = compile(COND_TEMPLATE, { debug: true, data: { user: { isPro: true } } });
    const condEntry = entriesFor(result.sourceMap!.entries, '_mc-conditional-branch')[0]!;
    expect(condEntry.conditional!.type).toBe('mc-if');
  });

  it('truthy branch records the condition expression', () => {
    const result = compile(COND_TEMPLATE, { debug: true, data: { user: { isPro: true } } });
    const condEntry = entriesFor(result.sourceMap!.entries, '_mc-conditional-branch')[0]!;
    expect(condEntry.conditional!.condition).toBe('user.isPro');
  });

  it('mc-else branch is taken when mc-if is falsy', () => {
    const result = compile(COND_TEMPLATE, { debug: true, data: { user: { isPro: false } } });
    const condEntries = entriesFor(result.sourceMap!.entries, '_mc-conditional-branch');
    expect(condEntries.length).toBeGreaterThan(0);
    const elseEntry = condEntries.find((e) => e.conditional!.type === 'mc-else');
    expect(elseEntry).toBeDefined();
    expect(elseEntry!.conditional!.branchTaken).toBe(true);
  });

  it('mc-else has empty condition string', () => {
    const result = compile(COND_TEMPLATE, { debug: true, data: { user: { isPro: false } } });
    const condEntries = entriesFor(result.sourceMap!.entries, '_mc-conditional-branch');
    const elseEntry = condEntries.find((e) => e.conditional!.type === 'mc-else');
    expect(elseEntry!.conditional!.condition).toBe('');
  });

  it('no conditional-branch entry is emitted when no branch is taken (standalone mc-if, falsy)', () => {
    const template = `<mc>
<mc-head><mc-title>T</mc-title></mc-head>
<mc-body>
  <mc-section>
    <mc-column>
      <mc-if condition="show">
        <mc-text>Only when show</mc-text>
      </mc-if>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;
    const result = compile(template, { debug: true, data: { show: false } });
    const condEntries = entriesFor(result.sourceMap!.entries, '_mc-conditional-branch');
    expect(condEntries).toHaveLength(0);
  });

  it('conditional-branch entries have role: "conditional-branch"', () => {
    const result = compile(COND_TEMPLATE, { debug: true, data: { user: { isPro: true } } });
    const condEntries = entriesFor(result.sourceMap!.entries, '_mc-conditional-branch');
    for (const entry of condEntries) {
      expect(entry.role).toBe('conditional-branch');
    }
  });
});

describe('SM-D: mc-else-if conditional tracking', () => {
  const ELSE_IF_TEMPLATE = `<mc>
<mc-head><mc-title>ElseIf</mc-title></mc-head>
<mc-body>
  <mc-section>
    <mc-column>
      <mc-if condition="isGold">
        <mc-text>Gold</mc-text>
      </mc-if>
      <mc-else-if condition="isSilver">
        <mc-text>Silver</mc-text>
      </mc-else-if>
      <mc-else>
        <mc-text>Bronze</mc-text>
      </mc-else>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;

  it('takes mc-else-if when mc-if is false and mc-else-if is true', () => {
    const result = compile(ELSE_IF_TEMPLATE, {
      debug: true,
      data: { isGold: false, isSilver: true },
    });
    const condEntries = entriesFor(result.sourceMap!.entries, '_mc-conditional-branch');
    expect(condEntries.length).toBeGreaterThan(0);
    const elseIfEntry = condEntries.find((e) => e.conditional!.type === 'mc-else-if');
    expect(elseIfEntry).toBeDefined();
    expect(elseIfEntry!.conditional!.branchTaken).toBe(true);
  });

  it('takes mc-else when both mc-if and mc-else-if are false', () => {
    const result = compile(ELSE_IF_TEMPLATE, {
      debug: true,
      data: { isGold: false, isSilver: false },
    });
    const condEntries = entriesFor(result.sourceMap!.entries, '_mc-conditional-branch');
    expect(condEntries.length).toBeGreaterThan(0);
    const elseEntry = condEntries.find((e) => e.conditional!.type === 'mc-else');
    expect(elseEntry).toBeDefined();
    expect(elseEntry!.conditional!.branchTaken).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Expression tracking
// ---------------------------------------------------------------------------

describe('SM-D: expression tracking', () => {
  const EXPR_TEMPLATE = `<mc>
<mc-head><mc-title>Expr</mc-title></mc-head>
<mc-body>
  <mc-section>
    <mc-column>
      <mc-text>Hello {{name}}</mc-text>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;

  it('records expression resolutions on the mc-text entry', () => {
    const result = compile(EXPR_TEMPLATE, { debug: true, data: { name: 'John' } });
    const textEntries = entriesFor(result.sourceMap!.entries, 'mc-text');
    expect(textEntries.length).toBeGreaterThan(0);
    const textEntry = textEntries[0]!;
    expect(textEntry.expressions.length).toBeGreaterThan(0);
  });

  it('expression has the correct resolvedValue', () => {
    const result = compile(EXPR_TEMPLATE, { debug: true, data: { name: 'John' } });
    const textEntry = entriesFor(result.sourceMap!.entries, 'mc-text')[0]!;
    const expr = textEntry.expressions.find((e) => e.expression === 'name');
    expect(expr).toBeDefined();
    expect(expr!.resolvedValue).toBe('John');
  });

  it('expression has dataPath as an array of path segments', () => {
    const result = compile(EXPR_TEMPLATE, { debug: true, data: { name: 'John' } });
    const textEntry = entriesFor(result.sourceMap!.entries, 'mc-text')[0]!;
    const expr = textEntry.expressions.find((e) => e.expression === 'name');
    expect(expr!.dataPath).toEqual(['name']);
  });

  it('nested path is split into segments', () => {
    const template = `<mc>
<mc-head><mc-title>T</mc-title></mc-head>
<mc-body>
  <mc-section>
    <mc-column>
      <mc-text>{{user.email}}</mc-text>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;
    const result = compile(template, { debug: true, data: { user: { email: 'a@b.com' } } });
    const textEntry = entriesFor(result.sourceMap!.entries, 'mc-text')[0]!;
    const expr = textEntry.expressions.find((e) => e.expression === 'user.email');
    expect(expr!.dataPath).toEqual(['user', 'email']);
  });

  it('usedFallback is false when the value is present in data', () => {
    const result = compile(EXPR_TEMPLATE, { debug: true, data: { name: 'John' } });
    const textEntry = entriesFor(result.sourceMap!.entries, 'mc-text')[0]!;
    const expr = textEntry.expressions.find((e) => e.expression === 'name');
    expect(expr!.usedFallback).toBe(false);
  });

  it('usedFallback is true when data key is missing and fallback is used', () => {
    const template = `<mc>
<mc-head><mc-title>T</mc-title></mc-head>
<mc-body>
  <mc-section>
    <mc-column>
      <mc-text>{{name || 'Guest'}}</mc-text>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;
    const result = compile(template, { debug: true, data: {} });
    const textEntry = entriesFor(result.sourceMap!.entries, 'mc-text')[0]!;
    expect(textEntry.expressions.length).toBeGreaterThan(0);
    const expr = textEntry.expressions[0]!;
    expect(expr.usedFallback).toBe(true);
    expect(expr.fallbackValue).toBe('Guest');
    expect(expr.resolvedValue).toBe('Guest');
  });

  it('expressions array is empty when mc-text has no template expressions', () => {
    const template = `<mc>
<mc-head><mc-title>T</mc-title></mc-head>
<mc-body>
  <mc-section>
    <mc-column>
      <mc-text>Static text</mc-text>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;
    const result = compile(template, { debug: true, data: {} });
    const textEntry = entriesFor(result.sourceMap!.entries, 'mc-text')[0]!;
    expect(textEntry.expressions).toHaveLength(0);
  });

  it('expressions are not recorded in production mode (no sourceMap)', () => {
    const result = compile(EXPR_TEMPLATE, { data: { name: 'John' } });
    expect(result.sourceMap).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Combined loop + expressions
// ---------------------------------------------------------------------------

describe('SM-D: loop items with expressions', () => {
  const LOOP_EXPR_TEMPLATE = `<mc>
<mc-head><mc-title>T</mc-title></mc-head>
<mc-body>
  <mc-section>
    <mc-column>
      <mc-each items="items" as="item">
        <mc-text>{{item.label}}</mc-text>
      </mc-each>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;

  it('each loop iteration has child mc-text entries with resolved expressions', () => {
    const data = { items: [{ label: 'One' }, { label: 'Two' }] };
    const result = compile(LOOP_EXPR_TEMPLATE, { debug: true, data });
    // Should have 2 loop-iteration entries
    const loopEntries = entriesFor(result.sourceMap!.entries, '_mc-loop-iteration');
    expect(loopEntries).toHaveLength(2);
    // Should have mc-text entries with resolved expressions
    const textEntries = entriesFor(result.sourceMap!.entries, 'mc-text');
    expect(textEntries).toHaveLength(2);
    const resolvedValues = textEntries.flatMap((e) => e.expressions.map((ex) => ex.resolvedValue));
    expect(resolvedValues).toContain('One');
    expect(resolvedValues).toContain('Two');
  });
});
