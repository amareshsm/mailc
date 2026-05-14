/**
 * Tests for `compileFromJSON().json` — the parsed JSON IR field on CompileResult.
 *
 * Lifecycle matrix:
 *   - JSON.parse fails    → json undefined, html null
 *   - Validation errors   → json DEFINED, html partial
 *   - Compiler throws     → json DEFINED, html null
 *   - Clean compile       → json DEFINED, html present
 *
 * Plus invariants: input-shape unification (MCNode | MCDocument | string),
 * mutation isolation (deep-clone), no shared references.
 */

import { describe, it, expect } from 'vitest';
import { compileFromJSON } from '../../src/json/index.js';
import type { MCNode, MCDocument } from '../../src/json/schema.js';

function minimalTree(): MCNode {
  return {
    type: 'mc',
    attributes: {},
    children: [
      {
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
                children: [{ type: 'mc-text', attributes: {}, content: 'Hello' }],
              },
            ],
          },
        ],
      },
    ],
  };
}

describe('compileFromJSON() — result.json', () => {
  it('returns the input node when given an MCNode object', () => {
    const input = minimalTree();
    const r = compileFromJSON(input);
    expect(r.html).not.toBeNull();
    expect(r.json).toBeDefined();
    expect(r.json).toEqual(input);
  });

  it('returns document.template when given an MCDocument', () => {
    const tree = minimalTree();
    const doc: MCDocument = {
      version: '1.0',
      metadata: {
        id: 'test',
        name: 'Test',
        created: '2025-01-01',
        updated: '2025-01-01',
      },
      template: tree,
    };
    const r = compileFromJSON(doc);
    expect(r.html).not.toBeNull();
    expect(r.json).toBeDefined();
    expect(r.json).toEqual(tree); // unwrapped template, NOT the document
    // Document metadata is NOT exposed on result.json.
    expect((r.json as unknown as Record<string, unknown>)['metadata']).toBeUndefined();
  });

  it('returns parsed root when given a JSON string', () => {
    const tree = minimalTree();
    const r = compileFromJSON(JSON.stringify(tree));
    expect(r.html).not.toBeNull();
    expect(r.json).toBeDefined();
    expect(r.json?.type).toBe(tree.type);
    expect(r.json?.children?.length).toBe(tree.children?.length);
  });

  it('result.json is a DEEP CLONE — mutations do not leak into the caller input', () => {
    const input = minimalTree();
    const r = compileFromJSON(input);
    expect(r.json).toBeDefined();
    // Mutate the returned tree.
    if (r.json) {
      r.json.attributes['x'] = 'tampered';
      const body = r.json.children?.[0];
      if (body) body.attributes['leaked'] = 'true';
    }
    // The caller's input is unchanged.
    expect(input.attributes).toEqual({});
    expect(input.children?.[0]?.attributes).toEqual({});
  });

  it('result.json is a DEEP CLONE — mutating it does not affect a subsequent compile', () => {
    const input = minimalTree();
    const r1 = compileFromJSON(input);
    if (r1.json) r1.json.attributes['x'] = 'tampered';
    const r2 = compileFromJSON(input);
    expect(r2.json?.attributes['x']).toBeUndefined();
  });

  it('json is undefined when JSON.parse fails', () => {
    const r = compileFromJSON('{not valid json');
    expect(r.html).toBeNull();
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.json).toBeUndefined();
  });

  it('json IS defined when html is partial (validation errors but ast built)', () => {
    // Missing required attributes / invalid nesting — produces validation errors
    // while still letting the compiler emit best-effort html. The captured JSON
    // is what the user gave us.
    const bogus: MCNode = {
      type: 'mc',
      attributes: {},
      children: [
        {
          type: 'mc-body',
          attributes: {},
          children: [
            // mc-text directly under mc-body — invalid nesting.
            { type: 'mc-text', attributes: {}, content: 'orphan' },
          ],
        },
      ],
    };
    const r = compileFromJSON(bogus);
    expect(r.json).toBeDefined();
    expect(r.json).toEqual(bogus);
  });

  it('json preserves the original tree even when templating expands children', () => {
    const input: MCNode = {
      type: 'mc',
      attributes: {},
      children: [
        {
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
                    {
                      type: 'mc-each',
                      attributes: { items: 'xs', as: 'x' },
                      children: [
                        { type: 'mc-text', attributes: {}, content: '{{x}}' },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const r = compileFromJSON(input, { data: { xs: ['a', 'b'] } });
    expect(r.html).toContain('a');
    expect(r.html).toContain('b');
    // Tree still contains mc-each — capture is pre-resolution.
    function find(n: MCNode, t: string): MCNode | undefined {
      if (n.type === t) return n;
      for (const c of n.children ?? []) {
        const f = find(c, t);
        if (f) return f;
      }
      return undefined;
    }
    expect(find(r.json!, 'mc-each')).toBeDefined();
  });

  it('repeated compiles produce independent json trees (no shared references)', () => {
    const input = minimalTree();
    const r1 = compileFromJSON(input);
    const r2 = compileFromJSON(input);
    expect(r1.json).not.toBe(r2.json);
    expect(r1.json).toEqual(r2.json);
  });
});
