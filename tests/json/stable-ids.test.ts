/**
 * Stable IDs from JSON input — Gap 2 fix.
 *
 * Verifies that builder-supplied `MCNode.id` round-trips through the JSON
 * pipeline as a `data-mc-id` attribute on the corresponding component's root
 * output element when `options.sourceMap: true` is set.
 *
 * Covers the three bugs that previously broke this path:
 * - 2a: `node.id` was dropped during JSON→AST conversion
 * - 2b: `cleanSourceMap` was hardcoded to `false` in compileFromJSON
 * - 2c: source-map collector ignored `node.id` and used a positional counter
 */

import { describe, it, expect } from 'vitest';
import { compileFromJSON } from '../../src/json/index.js';
import type { MCNode } from '../../src/json/index.js';

function wrapInColumn(children: MCNode[]): MCNode {
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
              { type: 'mc-column', attributes: {}, children },
            ],
          },
        ],
      },
    ],
  };
}

describe('compileFromJSON — stable IDs (Gap 2 fix)', () => {
  describe('opt-in via options.sourceMap', () => {
    it('emits data-mc-id="<node.id>" on the component root element', () => {
      const tree = wrapInColumn([
        { id: 'btn-checkout', type: 'mc-button', attributes: { href: 'https://example.com' }, content: 'Buy' },
      ]);
      const result = compileFromJSON(tree, { sourceMap: true });
      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('data-mc-id="btn-checkout"');
    });

    it('emits ids for nested nodes simultaneously', () => {
      const tree: MCNode = {
        id: 'root',
        type: 'mc',
        attributes: {},
        children: [
          {
            id: 'body-1',
            type: 'mc-body',
            attributes: {},
            children: [
              {
                id: 'sec-1',
                type: 'mc-section',
                attributes: {},
                children: [
                  {
                    id: 'col-1',
                    type: 'mc-column',
                    attributes: {},
                    children: [
                      { id: 'txt-1', type: 'mc-text', attributes: {}, content: 'Hi' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };
      const result = compileFromJSON(tree, { sourceMap: true });
      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('data-mc-id="sec-1"');
      expect(result.html).toContain('data-mc-id="col-1"');
      expect(result.html).toContain('data-mc-id="txt-1"');
    });

    it('attaches a sourceMap object on the result', () => {
      const tree = wrapInColumn([
        { id: 'btn-1', type: 'mc-button', attributes: { href: 'https://example.com' }, content: 'Buy' },
      ]);
      const result = compileFromJSON(tree, { sourceMap: true });
      expect(result.sourceMap).toBeDefined();
      expect(result.sourceMapIds).toBe(true);
      // The button entry should keep its caller-supplied id.
      const ids = result.sourceMap!.entries.map((e) => e.id);
      expect(ids).toContain('btn-1');
    });

    it('survives template data resolution (id preserved through resolveNode)', () => {
      const tree = wrapInColumn([
        { id: 'greet', type: 'mc-text', attributes: {}, content: 'Hi {{name}}' },
      ]);
      const result = compileFromJSON(tree, {
        sourceMap: true,
        data: { name: 'Sam' },
      });
      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('data-mc-id="greet"');
      expect(result.html).toContain('Hi Sam');
    });

    it('IDs are stable when sibling order changes (positional counter would shift)', () => {
      const before = compileFromJSON(
        wrapInColumn([
          { id: 'a', type: 'mc-text', attributes: {}, content: 'A' },
          { id: 'b', type: 'mc-text', attributes: {}, content: 'B' },
        ]),
        { sourceMap: true },
      );
      const after = compileFromJSON(
        wrapInColumn([
          { id: 'b', type: 'mc-text', attributes: {}, content: 'B' },
          { id: 'a', type: 'mc-text', attributes: {}, content: 'A' },
        ]),
        { sourceMap: true },
      );
      expect(before.html).toContain('data-mc-id="a"');
      expect(before.html).toContain('data-mc-id="b"');
      expect(after.html).toContain('data-mc-id="a"');
      expect(after.html).toContain('data-mc-id="b"');
    });
  });

  describe('graceful degradation', () => {
    it('falls back to entry-N counter when node.id collides with a prior entry', () => {
      // Two sections sharing the same id — second one must not overwrite the
      // first. Validation is not the focus here; collector behavior is.
      const tree: MCNode = {
        type: 'mc',
        attributes: {},
        children: [
          {
            type: 'mc-body',
            attributes: {},
            children: [
              {
                id: 'dup',
                type: 'mc-section',
                attributes: {},
                children: [{ type: 'mc-column', attributes: {}, children: [] }],
              },
              {
                id: 'dup',
                type: 'mc-section',
                attributes: {},
                children: [{ type: 'mc-column', attributes: {}, children: [] }],
              },
            ],
          },
        ],
      };
      const result = compileFromJSON(tree, { sourceMap: true });
      // First wins.
      expect(result.html).toContain('data-mc-id="dup"');
      // Both source-map entries must exist (no overwrite). The second
      // collider falls back to a counter id.
      const ids = result.sourceMap!.entries.map((e) => e.id);
      expect(ids.filter((id) => id === 'dup')).toHaveLength(1);
      expect(ids.some((id) => id.startsWith('entry-'))).toBe(true);
    });

    it('treats empty-string id as absent (falls back to counter)', () => {
      const tree = wrapInColumn([
        { id: '', type: 'mc-button', attributes: { href: 'https://example.com' }, content: 'Buy' },
      ]);
      const result = compileFromJSON(tree, { sourceMap: true });
      expect(result.errors).toHaveLength(0);
      // Empty id must NEVER appear as data-mc-id="" — that would be invalid HTML.
      expect(result.html).not.toContain('data-mc-id=""');
    });

    it('mixes id-bearing and id-less siblings correctly', () => {
      const tree = wrapInColumn([
        { id: 'kept', type: 'mc-text', attributes: {}, content: 'kept' },
        { type: 'mc-text', attributes: {}, content: 'no id' },
      ]);
      const result = compileFromJSON(tree, { sourceMap: true });
      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('data-mc-id="kept"');
      // The unkept sibling still gets a counter-based data-mc-id (clean source
      // map mode tags every component).
      expect(result.html).toMatch(/data-mc-id="entry-\d+"/);
    });
  });

  describe('back-compat: no behavior change without opt-in', () => {
    it('does NOT emit data-mc-id when options.sourceMap is omitted', () => {
      const tree = wrapInColumn([
        { id: 'btn-1', type: 'mc-button', attributes: { href: 'https://example.com' }, content: 'Buy' },
      ]);
      const result = compileFromJSON(tree);
      expect(result.errors).toHaveLength(0);
      expect(result.html).not.toContain('data-mc-id');
    });

    it('does NOT attach a sourceMap object without opt-in', () => {
      const tree = wrapInColumn([
        { id: 'btn-1', type: 'mc-button', attributes: { href: 'https://example.com' }, content: 'Buy' },
      ]);
      const result = compileFromJSON(tree);
      expect(result.sourceMap).toBeUndefined();
      expect(result.sourceMapIds).toBeUndefined();
    });

    it('debug mode still works alongside sourceMap mode (both can be active)', () => {
      const tree = wrapInColumn([
        { id: 'btn-1', type: 'mc-button', attributes: { href: 'https://example.com' }, content: 'Buy' },
      ]);
      const result = compileFromJSON(tree, { sourceMap: true, debug: true });
      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('data-mc-id="btn-1"');
      expect(result.sourceMapComments).toBe(true);
      expect(result.sourceMapIds).toBe(true);
    });
  });
});
