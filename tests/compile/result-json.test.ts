/**
 * Tests for `compile().json` — the parsed JSON IR field on CompileResult.
 *
 * Lifecycle matrix:
 *   - Tokeniser throws    → json undefined, html null
 *   - Parser throws       → json undefined, html null
 *   - EMPTY_DOCUMENT      → json DEFINED, html null
 *   - Compiler throws     → json DEFINED, html null
 *   - Validation errors   → json DEFINED, html partial
 *   - Clean compile       → json DEFINED, html present
 *
 * Plus invariants: pre-resolution capture, mutation isolation, equivalence
 * with `markupToJSON(source)`.
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compile.js';
import { markupToJSON } from '../../src/json/markup-to-json.js';
import type { MCNode } from '../../src/json/schema.js';

function findByType(node: MCNode, type: string): MCNode | undefined {
  if (node.type === type) return node;
  for (const child of node.children ?? []) {
    const found = findByType(child, type);
    if (found) return found;
  }
  return undefined;
}

describe('compile() — result.json', () => {
  it('returns parsed MCNode after a clean compile', () => {
    const r = compile(
      '<mc><mc-body><mc-section><mc-column><mc-text>x</mc-text></mc-column></mc-section></mc-body></mc>',
    );
    expect(r.errors).toHaveLength(0);
    expect(r.html).not.toBeNull();
    expect(r.json).toBeDefined();
    expect(r.json?.type).toBe('mc');
  });

  it('result.json deep-equals markupToJSON(source) for the same input', () => {
    const src =
      '<mc><mc-body><mc-section><mc-column><mc-text>Hi</mc-text></mc-column></mc-section></mc-body></mc>';
    const r = compile(src);
    expect(r.json).toEqual(markupToJSON(src));
  });

  it('json is undefined when the tokeniser throws', () => {
    // Unclosed attribute string — tokeniser fails before parse.
    const r = compile('<mc-text attr="unclosed');
    expect(r.html).toBeNull();
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.json).toBeUndefined();
  });

  it('json is undefined when the parser throws', () => {
    // Unclosed mc-body — parser fails.
    const r = compile('<mc><mc-body>');
    expect(r.html).toBeNull();
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.json).toBeUndefined();
  });

  it('json IS defined when EMPTY_DOCUMENT is emitted (missing <mc> root)', () => {
    const r = compile('<mc-body><mc-text>x</mc-text></mc-body>');
    expect(r.html).toBeNull();
    expect(r.errors.some((e) => e.code === 'EMPTY_DOCUMENT')).toBe(true);
    expect(r.json).toBeDefined();
    // Root child was mc-body — we captured it raw.
    expect(r.json?.type).toBe('mc-body');
  });

  it('json IS defined when html is partial (validation errors)', () => {
    // Missing required mc-image alt → validation error but html still emitted.
    const r = compile(
      '<mc><mc-body><mc-section><mc-column><mc-image src="x.png" /></mc-column></mc-section></mc-body></mc>',
    );
    // Whether or not partial fires depends on rule severities; the invariant
    // we care about is that the captured JSON tree is present.
    expect(r.json).toBeDefined();
    expect(r.json?.type).toBe('mc');
  });

  it('json is captured PRE-template-resolution — preserves {{vars}} literally', () => {
    const r = compile(
      '<mc><mc-body><mc-section><mc-column><mc-text>Hi {{name}}</mc-text></mc-column></mc-section></mc-body></mc>',
      { data: { name: 'Alice' } },
    );
    expect(r.html).toContain('Hi Alice'); // resolved in html
    const text = findByType(r.json!, 'mc-text');
    expect(text?.content).toContain('{{name}}'); // raw in json
  });

  it('json is captured PRE-template-resolution — preserves mc-each unexpanded', () => {
    const r = compile(
      `<mc><mc-body><mc-section><mc-column>
        <mc-each items="xs" as="x"><mc-text>{{x}}</mc-text></mc-each>
      </mc-column></mc-section></mc-body></mc>`,
      { data: { xs: ['a', 'b'] } },
    );
    expect(r.html).toContain('a');
    expect(r.html).toContain('b');
    // json still has the mc-each node, not the expanded iterations
    expect(findByType(r.json!, 'mc-each')).toBeDefined();
  });

  it('mutating result.json does not affect a subsequent compile of the same source', () => {
    const src =
      '<mc><mc-body><mc-section><mc-column><mc-text>a</mc-text></mc-column></mc-section></mc-body></mc>';
    const r1 = compile(src);
    expect(r1.json).toBeDefined();
    if (r1.json) {
      r1.json.attributes['bogus'] = 'true';
      const text = findByType(r1.json, 'mc-text');
      if (text) text.content = 'TAMPERED';
    }
    const r2 = compile(src);
    expect(r2.json?.attributes['bogus']).toBeUndefined();
    const text2 = findByType(r2.json!, 'mc-text');
    expect(text2?.content).toBe('a');
  });

  it('multiple compiles return independent json trees (no shared references)', () => {
    const src =
      '<mc><mc-body><mc-section><mc-column><mc-text>x</mc-text></mc-column></mc-section></mc-body></mc>';
    const r1 = compile(src);
    const r2 = compile(src);
    expect(r1.json).not.toBe(r2.json);
    expect(r1.json).toEqual(r2.json);
  });
});
