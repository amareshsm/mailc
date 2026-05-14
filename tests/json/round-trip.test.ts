/**
 * Round-trip tests: JSON → Markup → JSON and Markup → JSON → Markup.
 *
 * Verifies lossless conversion between formats (modulo whitespace).
 * BUILD_ORDER item 10.12.
 */

import { describe, it, expect } from 'vitest';
import { jsonToMarkup } from '../../src/json/json-to-markup.js';
import { markupToJSON } from '../../src/json/markup-to-json.js';
import type { MCNode } from '../../src/json/schema.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true if the string is whitespace-only (spaces, tabs, newlines). */
function isWhitespaceOnly(s: string): boolean {
  return /^\s*$/.test(s);
}

/**
 * Deep-compare two MCNode trees, ignoring `id` and normalizing
 * empty arrays/undefined to be equivalent.
 * Strips whitespace-only content (inter-tag indentation) since
 * that's formatting noise, not semantic data.
 */
function normalizeNode(node: MCNode): MCNode {
  const result: MCNode = {
    type: node.type,
    attributes: { ...node.attributes },
  };
  if (node.children && node.children.length > 0) {
    result.children = node.children.map(normalizeNode);
  }
  if (node.content !== undefined && node.content !== '' && !isWhitespaceOnly(node.content)) {
    result.content = node.content;
  }
  return result;
}

// ---------------------------------------------------------------------------
// JSON → Markup → JSON (round-trip)
// ---------------------------------------------------------------------------

describe('Round-trip: JSON → Markup → JSON', () => {
  it('preserves simple text node', () => {
    const original: MCNode = {
      type: 'mc',
      attributes: {},
      children: [{
        type: 'mc-body',
        attributes: {},
        children: [{
          type: 'mc-section',
          attributes: {},
          children: [{
            type: 'mc-column',
            attributes: {},
            children: [
              { type: 'mc-text', attributes: {}, content: 'Hello World' },
            ],
          }],
        }],
      }],
    };

    const markup = jsonToMarkup(original);
    const restored = markupToJSON(markup);

    expect(normalizeNode(restored)).toEqual(normalizeNode(original));
  });

  it('preserves self-closing nodes with attributes', () => {
    const original: MCNode = {
      type: 'mc',
      attributes: {},
      children: [{
        type: 'mc-body',
        attributes: {},
        children: [{
          type: 'mc-section',
          attributes: {},
          children: [{
            type: 'mc-column',
            attributes: {},
            children: [
              { type: 'mc-image', attributes: { src: 'logo.png', alt: 'Logo', width: '200px' } },
              { type: 'mc-divider', attributes: { 'border-color': '#ccc' } },
              { type: 'mc-spacer', attributes: { height: '30px' } },
            ],
          }],
        }],
      }],
    };

    const markup = jsonToMarkup(original);
    const restored = markupToJSON(markup);

    expect(normalizeNode(restored)).toEqual(normalizeNode(original));
  });

  it('preserves mc-button with content and attributes', () => {
    const original: MCNode = {
      type: 'mc',
      attributes: {},
      children: [{
        type: 'mc-body',
        attributes: {},
        children: [{
          type: 'mc-section',
          attributes: {},
          children: [{
            type: 'mc-column',
            attributes: {},
            children: [{
              type: 'mc-button',
              attributes: { href: 'https://example.com', 'background-color': '#007bff' },
              content: 'Click Me',
            }],
          }],
        }],
      }],
    };

    const markup = jsonToMarkup(original);
    const restored = markupToJSON(markup);

    expect(normalizeNode(restored)).toEqual(normalizeNode(original));
  });

  it('preserves template expressions in content', () => {
    const original: MCNode = {
      type: 'mc',
      attributes: {},
      children: [{
        type: 'mc-body',
        attributes: {},
        children: [{
          type: 'mc-section',
          attributes: {},
          children: [{
            type: 'mc-column',
            attributes: {},
            children: [
              { type: 'mc-text', attributes: {}, content: 'Hello {{customer.name}}!' },
            ],
          }],
        }],
      }],
    };

    const markup = jsonToMarkup(original);
    const restored = markupToJSON(markup);

    expect(normalizeNode(restored)).toEqual(normalizeNode(original));
  });

  it('preserves raw expressions', () => {
    const original: MCNode = {
      type: 'mc',
      attributes: {},
      children: [{
        type: 'mc-body',
        attributes: {},
        children: [{
          type: 'mc-section',
          attributes: {},
          children: [{
            type: 'mc-column',
            attributes: {},
            children: [
              { type: 'mc-text', attributes: {}, content: '{{{rawHtml}}}' },
            ],
          }],
        }],
      }],
    };

    const markup = jsonToMarkup(original);
    const restored = markupToJSON(markup);

    expect(normalizeNode(restored)).toEqual(normalizeNode(original));
  });

  it('preserves multi-component layout', () => {
    const original: MCNode = {
      type: 'mc',
      attributes: {},
      children: [{
        type: 'mc-body',
        attributes: { 'background-color': '#f4f4f4' },
        children: [{
          type: 'mc-section',
          attributes: { 'background-color': '#ffffff' },
          children: [{
            type: 'mc-column',
            attributes: {},
            children: [
              { type: 'mc-text', attributes: {}, content: 'Welcome to our newsletter' },
              { type: 'mc-image', attributes: { src: 'hero.png', alt: 'Hero' } },
              { type: 'mc-divider', attributes: {} },
              { type: 'mc-button', attributes: { href: 'https://example.com' }, content: 'Get Started' },
              { type: 'mc-spacer', attributes: { height: '20px' } },
            ],
          }],
        }],
      }],
    };

    const markup = jsonToMarkup(original);
    const restored = markupToJSON(markup);

    expect(normalizeNode(restored)).toEqual(normalizeNode(original));
  });

  it('preserves two-column layout', () => {
    const original: MCNode = {
      type: 'mc',
      attributes: {},
      children: [{
        type: 'mc-body',
        attributes: {},
        children: [{
          type: 'mc-section',
          attributes: {},
          children: [
            {
              type: 'mc-column',
              attributes: {},
              children: [
                { type: 'mc-text', attributes: {}, content: 'Left side' },
              ],
            },
            {
              type: 'mc-column',
              attributes: {},
              children: [
                { type: 'mc-text', attributes: {}, content: 'Right side' },
              ],
            },
          ],
        }],
      }],
    };

    const markup = jsonToMarkup(original);
    const restored = markupToJSON(markup);

    expect(normalizeNode(restored)).toEqual(normalizeNode(original));
  });
});

// ---------------------------------------------------------------------------
// Markup → JSON → Markup (round-trip)
// ---------------------------------------------------------------------------

describe('Round-trip: Markup → JSON → Markup', () => {
  it('preserves simple email structure', () => {
    const source = `<mc>
  <mc-body>
    <mc-section>
      <mc-column>
        <mc-text>Hello World</mc-text>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`;

    const json = markupToJSON(source);
    const markup = jsonToMarkup(json);

    // Re-parse the generated markup to confirm equivalence
    const reparsed = markupToJSON(markup);
    expect(normalizeNode(reparsed)).toEqual(normalizeNode(json));
  });

  it('preserves expressions through round-trip', () => {
    const source = `<mc>
  <mc-body>
    <mc-section>
      <mc-column>
        <mc-text>Hi {{name}}!</mc-text>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`;

    const json = markupToJSON(source);
    const markup = jsonToMarkup(json);
    const reparsed = markupToJSON(markup);

    expect(normalizeNode(reparsed)).toEqual(normalizeNode(json));
  });

  it('preserves mixed components through round-trip', () => {
    const source = `<mc>
  <mc-body background-color="#f4f4f4">
    <mc-section>
      <mc-column>
        <mc-text>Title text</mc-text>
        <mc-image src="img.png" alt="Image" />
        <mc-divider />
        <mc-button href="https://example.com">Go</mc-button>
        <mc-spacer height="10px" />
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`;

    const json = markupToJSON(source);
    const markup = jsonToMarkup(json);
    const reparsed = markupToJSON(markup);

    expect(normalizeNode(reparsed)).toEqual(normalizeNode(json));
  });
});
