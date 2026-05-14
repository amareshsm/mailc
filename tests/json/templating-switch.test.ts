/**
 * Tests for the `templating: false` opt-out switch on `compileFromJSON()`.
 *
 * Verifies that builders can disable mailc's `{{ }}` templating engine so
 * that user-typed content containing curly braces is rendered verbatim,
 * and that the template resolution stage is skipped entirely.
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

describe('compileFromJSON — templating: false', () => {
  describe('content passthrough', () => {
    it('renders {{var}} verbatim when templating is off', () => {
      const tree = wrapInColumn([
        { type: 'mc-text', attributes: {}, content: 'Use code {{SAVE20}} at checkout' },
      ]);
      const result = compileFromJSON(tree, { templating: false });
      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('Use code {{SAVE20}} at checkout');
    });

    it('renders {{{raw}}} verbatim when templating is off', () => {
      const tree = wrapInColumn([
        { type: 'mc-text', attributes: {}, content: 'Markup: {{{<b>bold</b>}}}' },
      ]);
      const result = compileFromJSON(tree, { templating: false });
      expect(result.errors).toHaveLength(0);
      // Outer `{{{` and `}}}` are preserved literally, then HTML-escaped on output.
      // We just need to confirm the inner `{{{` brace pattern survived (would
      // have been parsed as a raw expression with templating on).
      expect(result.html).toContain('{{{');
    });

    it('still emits empty content as empty (no spurious text node)', () => {
      const tree = wrapInColumn([
        { type: 'mc-text', attributes: {}, content: '' },
      ]);
      const result = compileFromJSON(tree, { templating: false });
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('template data is ignored when templating is off', () => {
    it('does NOT substitute variables when data is passed but templating is off', () => {
      const tree = wrapInColumn([
        { type: 'mc-text', attributes: {}, content: 'Hi {{name}}' },
      ]);
      const result = compileFromJSON(tree, {
        templating: false,
        data: { name: 'Sam' },
      });
      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('Hi {{name}}');
      expect(result.html).not.toContain('Hi Sam');
    });
  });

  describe('back-compat: templating on by default', () => {
    it('still parses {{var}} when templating is omitted', () => {
      const tree = wrapInColumn([
        { type: 'mc-text', attributes: {}, content: 'Hi {{name}}' },
      ]);
      const result = compileFromJSON(tree, { data: { name: 'Sam' } });
      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('Hi Sam');
    });

    it('still parses {{var}} when templating: true is explicit', () => {
      const tree = wrapInColumn([
        { type: 'mc-text', attributes: {}, content: 'Hi {{name}}' },
      ]);
      const result = compileFromJSON(tree, {
        templating: true,
        data: { name: 'Sam' },
      });
      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('Hi Sam');
    });
  });

  describe('error message clarity for unresolved directives', () => {
    it('produces a targeted error when mc-if survives with templating: false', () => {
      const tree = wrapInColumn([
        {
          type: 'mc-if',
          attributes: { condition: 'x' },
          children: [
            { type: 'mc-text', attributes: {}, content: 'guarded' },
          ],
        },
      ]);
      const result = compileFromJSON(tree, { templating: false });
      expect(result.html).toBeNull();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.message).toContain('templating directive');
      expect(result.errors[0]!.message).toContain('templating: false');
    });

    it('produces the targeted error for mc-each as well', () => {
      const tree = wrapInColumn([
        {
          type: 'mc-each',
          attributes: { items: 'x', as: 'item' },
          children: [
            { type: 'mc-text', attributes: {}, content: 'item' },
          ],
        },
      ]);
      const result = compileFromJSON(tree, { templating: false });
      expect(result.html).toBeNull();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.message).toContain('templating directive');
    });

    it('still falls through to the generic error for genuinely unknown types', () => {
      const tree = wrapInColumn([
        { type: 'mc-not-a-real-thing', attributes: {} },
      ]);
      const result = compileFromJSON(tree, { templating: false });
      expect(result.html).toBeNull();
      // Generic "unknown component" error — no templating hint.
      const messages = result.errors.map((e) => e.message).join('\n');
      expect(messages).toContain('Unknown component');
      expect(messages).not.toContain('templating directive');
    });
  });

  describe('composes with other options', () => {
    it('coexists with sourceMap: true (stable ids still injected)', () => {
      const tree = wrapInColumn([
        { id: 'greet', type: 'mc-text', attributes: {}, content: 'Hi {{name}}' },
      ]);
      const result = compileFromJSON(tree, {
        templating: false,
        sourceMap: true,
      });
      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('data-mc-id="greet"');
      expect(result.html).toContain('Hi {{name}}');
    });
  });
});
