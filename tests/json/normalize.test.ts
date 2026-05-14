/**
 * Tests for `normalizeJSON()` — the canonical-form helper that bakes
 * compile-time merges (mc-attributes defaults, mc-class expansion) into
 * each node's explicit attributes.
 */

import { describe, it, expect } from 'vitest';
import { normalizeJSON, compileFromJSON } from '../../src/json/index.js';
import type { MCNode, MCDocument } from '../../src/json/index.js';

function withHead(headChildren: MCNode[], bodyChildren: MCNode[]): MCNode {
  return {
    type: 'mc',
    attributes: {},
    children: [
      { type: 'mc-head', attributes: {}, children: headChildren },
      {
        type: 'mc-body',
        attributes: {},
        children: [
          {
            type: 'mc-section',
            attributes: {},
            children: [
              { type: 'mc-column', attributes: {}, children: bodyChildren },
            ],
          },
        ],
      },
    ],
  };
}

function buttonAt(tree: MCNode): MCNode {
  return tree.children![1]!.children![0]!.children![0]!.children![0]!;
}

describe('normalizeJSON', () => {
  describe('mc-class expansion', () => {
    it('expands a single mc-class onto explicit attributes and strips mc-class', () => {
      const input = withHead(
        [
          {
            type: 'mc-attributes',
            attributes: {},
            children: [
              {
                type: 'mc-class',
                attributes: {
                  name: 'primary',
                  'background-color': '#0066cc',
                  color: 'white',
                  padding: '12px 24px',
                },
              },
            ],
          },
        ],
        [
          {
            type: 'mc-button',
            attributes: { 'mc-class': 'primary', href: 'https://example.com' },
            content: 'Buy',
          },
        ],
      );

      const out = normalizeJSON(input);
      const btn = buttonAt(out);

      expect(btn.attributes).toEqual({
        'background-color': '#0066cc',
        color: 'white',
        padding: '12px 24px',
        href: 'https://example.com',
      });
      expect(btn.attributes['mc-class']).toBeUndefined();
    });

    it('explicit attribute wins over mc-class value', () => {
      const input = withHead(
        [
          {
            type: 'mc-attributes',
            attributes: {},
            children: [
              {
                type: 'mc-class',
                attributes: { name: 'primary', color: 'white' },
              },
            ],
          },
        ],
        [
          {
            type: 'mc-button',
            attributes: { 'mc-class': 'primary', color: 'red', href: '/' },
            content: 'Buy',
          },
        ],
      );

      const out = normalizeJSON(input);
      expect(buttonAt(out).attributes['color']).toBe('red');
    });

    it('multiple class names: later names win', () => {
      const input = withHead(
        [
          {
            type: 'mc-attributes',
            attributes: {},
            children: [
              {
                type: 'mc-class',
                attributes: { name: 'base', color: 'gray', padding: '8px' },
              },
              {
                type: 'mc-class',
                attributes: { name: 'primary', color: 'white' },
              },
            ],
          },
        ],
        [
          {
            type: 'mc-button',
            attributes: { 'mc-class': 'base primary', href: '/' },
            content: 'Buy',
          },
        ],
      );

      const out = normalizeJSON(input);
      expect(buttonAt(out).attributes).toMatchObject({
        color: 'white',  // primary wins
        padding: '8px',  // only base provides this
        href: '/',
      });
    });

    it('handles extends chains', () => {
      const input = withHead(
        [
          {
            type: 'mc-attributes',
            attributes: {},
            children: [
              {
                type: 'mc-class',
                attributes: { name: 'base', color: 'gray', padding: '8px' },
              },
              {
                type: 'mc-class',
                attributes: { name: 'primary', extends: 'base', color: 'white' },
              },
            ],
          },
        ],
        [
          {
            type: 'mc-button',
            attributes: { 'mc-class': 'primary', href: '/' },
            content: 'Buy',
          },
        ],
      );

      const out = normalizeJSON(input);
      expect(buttonAt(out).attributes).toMatchObject({
        color: 'white',  // own overrides base
        padding: '8px',  // inherited from base
      });
    });

    it('unknown class names are silently ignored', () => {
      const input = withHead(
        [],
        [
          {
            type: 'mc-button',
            attributes: { 'mc-class': 'nonexistent', href: '/', color: 'red' },
            content: 'Buy',
          },
        ],
      );

      const out = normalizeJSON(input);
      const btn = buttonAt(out);
      expect(btn.attributes['mc-class']).toBeUndefined();
      expect(btn.attributes['color']).toBe('red');
    });
  });

  describe('mc-attributes defaults', () => {
    it('applies <mc-text> type defaults', () => {
      const input = withHead(
        [
          {
            type: 'mc-attributes',
            attributes: {},
            children: [
              { type: 'mc-text', attributes: { color: '#333', 'font-size': '16px' } },
            ],
          },
        ],
        [
          { type: 'mc-text', attributes: {}, content: 'Hello' },
        ],
      );

      const out = normalizeJSON(input);
      const text = buttonAt(out); // same path
      expect(text.attributes).toEqual({ color: '#333', 'font-size': '16px' });
    });

    it('applies <mc-all> defaults to every component', () => {
      const input = withHead(
        [
          {
            type: 'mc-attributes',
            attributes: {},
            children: [
              { type: 'mc-all', attributes: { 'font-family': 'Arial' } },
            ],
          },
        ],
        [
          { type: 'mc-text', attributes: {}, content: 'Hello' },
        ],
      );

      const out = normalizeJSON(input);
      expect(buttonAt(out).attributes['font-family']).toBe('Arial');
    });

    it('explicit attrs win over mc-all and type defaults', () => {
      const input = withHead(
        [
          {
            type: 'mc-attributes',
            attributes: {},
            children: [
              { type: 'mc-all', attributes: { color: 'gray' } },
              { type: 'mc-text', attributes: { color: 'blue' } },
            ],
          },
        ],
        [
          { type: 'mc-text', attributes: { color: 'red' }, content: 'Hi' },
        ],
      );

      const out = normalizeJSON(input);
      expect(buttonAt(out).attributes['color']).toBe('red');
    });
  });

  describe('head subtree is preserved untouched', () => {
    it('does not apply defaults to nodes inside mc-head', () => {
      const input = withHead(
        [
          {
            type: 'mc-attributes',
            attributes: {},
            children: [
              { type: 'mc-text', attributes: { color: '#333' } },
              {
                type: 'mc-class',
                attributes: { name: 'primary', color: 'white' },
              },
            ],
          },
        ],
        [],
      );

      const out = normalizeJSON(input);
      const head = out.children![0]!;
      const attrs = head.children![0]!.children!;
      // The <mc-text> default block must keep its single attribute, not get merged.
      expect(attrs[0]).toMatchObject({ type: 'mc-text', attributes: { color: '#333' } });
      // The <mc-class> definition must keep its `name` attribute.
      expect(attrs[1]!.attributes['name']).toBe('primary');
    });
  });

  describe('idempotency', () => {
    it('normalizing twice produces the same result', () => {
      const input = withHead(
        [
          {
            type: 'mc-attributes',
            attributes: {},
            children: [
              { type: 'mc-all', attributes: { 'font-family': 'Arial' } },
              {
                type: 'mc-class',
                attributes: { name: 'primary', color: 'white' },
              },
            ],
          },
        ],
        [
          {
            type: 'mc-button',
            attributes: { 'mc-class': 'primary', href: '/' },
            content: 'Buy',
          },
        ],
      );

      const once = normalizeJSON(input);
      const twice = normalizeJSON(once);
      expect(twice).toEqual(once);
    });
  });

  describe('semantic equivalence', () => {
    it('compiling the original and the normalized form produces identical HTML', () => {
      const input = withHead(
        [
          {
            type: 'mc-attributes',
            attributes: {},
            children: [
              {
                type: 'mc-class',
                attributes: {
                  name: 'primary',
                  'background-color': '#0066cc',
                  color: 'white',
                },
              },
            ],
          },
        ],
        [
          {
            type: 'mc-button',
            attributes: { 'mc-class': 'primary', href: 'https://example.com' },
            content: 'Buy',
          },
        ],
      );

      // Compile in attribute mode — the normalized tree has CSS-property
      // attributes inline (class mode would flag those as violations, which
      // is a separate, expected concern).
      const original = compileFromJSON(input, { templateStyle: 'attribute' });
      const normalized = compileFromJSON(
        normalizeJSON(input),
        { templateStyle: 'attribute' },
      );

      expect(original.errors).toHaveLength(0);
      expect(normalized.errors).toHaveLength(0);
      expect(normalized.html).toBe(original.html);
    });
  });

  describe('edge cases', () => {
    it('returns a tree even when there is no mc-head', () => {
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
                        type: 'mc-button',
                        attributes: { 'mc-class': 'whatever', href: '/' },
                        content: 'Buy',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };
      const out = normalizeJSON(input);
      // mc-class still gets stripped (compile-time directive, no real HTML meaning).
      const btn = out.children![0]!.children![0]!.children![0]!.children![0]!;
      expect(btn.attributes['mc-class']).toBeUndefined();
      expect(btn.attributes['href']).toBe('/');
    });

    it('preserves node.id', () => {
      const input = withHead(
        [],
        [
          { id: 'btn-1', type: 'mc-button', attributes: { href: '/' }, content: 'Buy' },
        ],
      );
      const out = normalizeJSON(input);
      expect(buttonAt(out).id).toBe('btn-1');
    });

    it('preserves content strings verbatim', () => {
      const input = withHead(
        [],
        [
          { type: 'mc-text', attributes: {}, content: 'Hi {{name}}' },
        ],
      );
      const out = normalizeJSON(input);
      expect(buttonAt(out).content).toBe('Hi {{name}}');
    });

    it('accepts an MCDocument and returns an MCDocument', () => {
      const doc: MCDocument = {
        version: '1.0',
        metadata: {
          id: 't', name: 'T',
          created: '2026-01-01T00:00:00Z',
          updated: '2026-01-01T00:00:00Z',
        },
        template: withHead([], [
          { type: 'mc-button', attributes: { href: '/' }, content: 'Buy' },
        ]),
      };
      const out = normalizeJSON(doc);
      expect(out.version).toBe('1.0');
      expect(out.metadata.id).toBe('t');
      expect(out.template.type).toBe('mc');
    });
  });

  describe('plugin components', () => {
    it('expands mc-class onto plugin component nodes', () => {
      const input = withHead(
        [
          {
            type: 'mc-attributes',
            attributes: {},
            children: [
              {
                type: 'mc-class',
                attributes: {
                  name: 'card-style',
                  'background-color': '#f0f0f0',
                  padding: '16px',
                },
              },
            ],
          },
        ],
        [
          {
            type: 'acme-card',
            attributes: { 'mc-class': 'card-style', title: 'Hello' },
          },
        ],
      );

      const out = normalizeJSON(input);
      const card = buttonAt(out);
      expect(card.type).toBe('acme-card');
      expect(card.attributes).toEqual({
        'background-color': '#f0f0f0',
        padding: '16px',
        title: 'Hello',
      });
    });
  });
});
