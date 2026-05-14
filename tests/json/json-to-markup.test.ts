/**
 * Tests for json-to-markup.ts — MCNode → .mc markup serializer.
 */

import { describe, it, expect } from 'vitest';
import { jsonToMarkup } from '../../src/json/json-to-markup.js';
import type { MCNode } from '../../src/json/schema.js';

// ---------------------------------------------------------------------------
// jsonToMarkup
// ---------------------------------------------------------------------------

describe('jsonToMarkup', () => {
  // ── Self-closing nodes ──────────────────────────────────────────────

  it('renders mc-image as self-closing with attributes', () => {
    const node: MCNode = {
      type: 'mc-image',
      attributes: { src: 'https://example.com/img.jpg', alt: 'Logo', width: '200px' },
    };
    expect(jsonToMarkup(node)).toBe(
      '<mc-image src="https://example.com/img.jpg" alt="Logo" width="200px" />',
    );
  });

  it('renders mc-divider as self-closing', () => {
    const node: MCNode = {
      type: 'mc-divider',
      attributes: { 'border-color': '#ccc' },
    };
    expect(jsonToMarkup(node)).toBe('<mc-divider border-color="#ccc" />');
  });

  it('renders mc-spacer as self-closing', () => {
    const node: MCNode = {
      type: 'mc-spacer',
      attributes: { height: '30px' },
    };
    expect(jsonToMarkup(node)).toBe('<mc-spacer height="30px" />');
  });

  // ── Content nodes ──────────────────────────────────────────────────

  it('renders mc-text with content', () => {
    const node: MCNode = {
      type: 'mc-text',
      attributes: {},
      content: '<p>Hello World</p>',
    };
    expect(jsonToMarkup(node)).toBe('<mc-text><p>Hello World</p></mc-text>');
  });

  it('renders mc-button with content and attributes', () => {
    const node: MCNode = {
      type: 'mc-button',
      attributes: { href: 'https://example.com', 'background-color': '#007bff' },
      content: 'Click Me',
    };
    expect(jsonToMarkup(node)).toBe(
      '<mc-button href="https://example.com" background-color="#007bff">Click Me</mc-button>',
    );
  });

  it('renders mc-preview with content', () => {
    const node: MCNode = {
      type: 'mc-preview',
      attributes: {},
      content: 'Preview text here',
    };
    expect(jsonToMarkup(node)).toBe('<mc-preview>Preview text here</mc-preview>');
  });

  it('renders mc-raw with content', () => {
    const node: MCNode = {
      type: 'mc-raw',
      attributes: {},
      content: '<table><tr><td>raw html</td></tr></table>',
    };
    expect(jsonToMarkup(node)).toBe(
      '<mc-raw><table><tr><td>raw html</td></tr></table></mc-raw>',
    );
  });

  // ── Content with expressions ───────────────────────────────────────

  it('preserves template expressions in content', () => {
    const node: MCNode = {
      type: 'mc-text',
      attributes: {},
      content: 'Hello {{customer.name}}!',
    };
    expect(jsonToMarkup(node)).toBe('<mc-text>Hello {{customer.name}}!</mc-text>');
  });

  it('preserves raw expressions in content', () => {
    const node: MCNode = {
      type: 'mc-text',
      attributes: {},
      content: '{{{rawHtml}}}',
    };
    expect(jsonToMarkup(node)).toBe('<mc-text>{{{rawHtml}}}</mc-text>');
  });

  // ── Container nodes ────────────────────────────────────────────────

  it('renders empty mc-body with open/close tags', () => {
    const node: MCNode = {
      type: 'mc-body',
      attributes: {},
    };
    expect(jsonToMarkup(node)).toBe(`<mc>
  <mc-body></mc-body>
</mc>`);
  });

  it('renders mc-column with children', () => {
    const node: MCNode = {
      type: 'mc-column',
      attributes: {},
      children: [
        { type: 'mc-text', attributes: {}, content: 'Hello' },
        { type: 'mc-divider', attributes: {} },
      ],
    };
    const expected = [
      '<mc-column>',
      '  <mc-text>Hello</mc-text>',
      '  <mc-divider />',
      '</mc-column>',
    ].join('\n');
    expect(jsonToMarkup(node)).toBe(expected);
  });

  it('renders nested structure with correct indentation', () => {
    const node: MCNode = {
      type: 'mc-body',
      attributes: { 'background-color': '#f4f4f4' },
      children: [
        {
          type: 'mc-section',
          attributes: {},
          children: [
            {
              type: 'mc-column',
              attributes: {},
              children: [
                { type: 'mc-text', attributes: {}, content: 'Hello' },
              ],
            },
          ],
        },
      ],
    };
    const expected = `<mc>
  <mc-body background-color="#f4f4f4">
    <mc-section>
      <mc-column>
        <mc-text>Hello</mc-text>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`;
    expect(jsonToMarkup(node)).toBe(expected);
  });

  // ── Logic nodes ────────────────────────────────────────────────────

  it('renders mc-if with children', () => {
    const node: MCNode = {
      type: 'mc-if',
      attributes: { condition: 'showDiscount' },
      children: [
        { type: 'mc-text', attributes: {}, content: 'Discount applied!' },
      ],
    };
    const expected = [
      '<mc-if condition="showDiscount">',
      '  <mc-text>Discount applied!</mc-text>',
      '</mc-if>',
    ].join('\n');
    expect(jsonToMarkup(node)).toBe(expected);
  });

  it('renders mc-for-each with children', () => {
    const node: MCNode = {
      type: 'mc-for-each',
      attributes: { collection: 'items', as: 'item' },
      children: [
        { type: 'mc-text', attributes: {}, content: '{{item.name}}' },
      ],
    };
    const expected = [
      '<mc-for-each collection="items" as="item">',
      '  <mc-text>{{item.name}}</mc-text>',
      '</mc-for-each>',
    ].join('\n');
    expect(jsonToMarkup(node)).toBe(expected);
  });

  // ── Attribute escaping ─────────────────────────────────────────────

  it('escapes double quotes in attribute values', () => {
    const node: MCNode = {
      type: 'mc-text',
      attributes: { 'data-info': 'say "hello"' },
      content: 'test',
    };
    expect(jsonToMarkup(node)).toBe(
      '<mc-text data-info="say &quot;hello&quot;">test</mc-text>',
    );
  });

  // ── No attributes ─────────────────────────────────────────────────

  it('renders node with empty attributes cleanly', () => {
    const node: MCNode = {
      type: 'mc-text',
      attributes: {},
      content: 'Plain text',
    };
    expect(jsonToMarkup(node)).toBe('<mc-text>Plain text</mc-text>');
  });

  // ── Full email ────────────────────────────────────────────────────

  it('serializes a complete email structure', () => {
    const email: MCNode = {
      type: 'mc-body',
      attributes: { 'background-color': '#ffffff' },
      children: [
        {
          type: 'mc-section',
          attributes: {},
          children: [
            {
              type: 'mc-column',
              attributes: {},
              children: [
                { type: 'mc-text', attributes: {}, content: '<h1>Welcome</h1>' },
                { type: 'mc-image', attributes: { src: 'logo.png', alt: 'Logo' } },
                { type: 'mc-button', attributes: { href: 'https://example.com' }, content: 'Get Started' },
                { type: 'mc-divider', attributes: {} },
                { type: 'mc-spacer', attributes: { height: '20px' } },
              ],
            },
          ],
        },
      ],
    };

    const markup = jsonToMarkup(email);
    expect(markup).toContain('<mc>');
    expect(markup).toContain('<mc-body');
    expect(markup).toContain('<mc-section>');
    expect(markup).toContain('<mc-column>');
    expect(markup).toContain('<mc-text><h1>Welcome</h1></mc-text>');
    expect(markup).toContain('<mc-image src="logo.png" alt="Logo" />');
    expect(markup).toContain('<mc-button href="https://example.com">Get Started</mc-button>');
    expect(markup).toContain('<mc-divider />');
    expect(markup).toContain('<mc-spacer height="20px" />');
    expect(markup).toContain('</mc-body>');
    expect(markup).toContain('</mc>');
  });
});

// ---------------------------------------------------------------------------
// Phase 7: mc-class serialization
// ---------------------------------------------------------------------------

describe('Phase 7: jsonToMarkup — mc-class', () => {
  it('renders mc-class as a self-closing tag', () => {
    const node: MCNode = {
      type: 'mc-class',
      attributes: { name: 'cta', 'background-color': '#e85d3a', color: '#fff' },
    };
    const markup = jsonToMarkup(node);
    expect(markup).toContain('/>');
    expect(markup).not.toContain('</mc-class>');
  });

  it('mc-class self-closing tag includes all attributes', () => {
    const node: MCNode = {
      type: 'mc-class',
      attributes: { name: 'hero', 'font-size': '24px', extends: 'base' },
    };
    const markup = jsonToMarkup(node);
    expect(markup).toBe('<mc-class name="hero" font-size="24px" extends="base" />');
  });

  it('mc-class inside mc-attributes renders self-closing with indentation', () => {
    const node: MCNode = {
      type: 'mc-attributes',
      attributes: {},
      children: [
        { type: 'mc-class', attributes: { name: 'cta', color: '#fff' } },
      ],
    };
    const markup = jsonToMarkup(node);
    expect(markup).toContain('<mc-class name="cta" color="#fff" />');
    expect(markup).not.toContain('</mc-class>');
  });
});

describe('jsonToMarkup — container classification (mc-hero, mc-table, mc-title)', () => {
  it('empty mc-hero serializes as a container, not self-closing', () => {
    const node: MCNode = { type: 'mc-hero', attributes: {} };
    const markup = jsonToMarkup(node);
    expect(markup).toContain('<mc-hero>');
    expect(markup).toContain('</mc-hero>');
    expect(markup).not.toContain('<mc-hero />');
  });

  it('empty mc-table serializes as a container, not self-closing', () => {
    const node: MCNode = { type: 'mc-table', attributes: {} };
    const markup = jsonToMarkup(node);
    expect(markup).toContain('<mc-table>');
    expect(markup).toContain('</mc-table>');
    expect(markup).not.toContain('<mc-table />');
  });

  it('mc-title serializes its text content (not as self-closing)', () => {
    const node: MCNode = {
      type: 'mc-head',
      attributes: {},
      children: [
        { type: 'mc-title', attributes: {}, content: 'Welcome' },
      ],
    };
    const markup = jsonToMarkup(node);
    expect(markup).toContain('<mc-title>Welcome</mc-title>');
    expect(markup).not.toContain('<mc-title />');
  });
});
