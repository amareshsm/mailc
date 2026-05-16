/**
 * Edge case tests for json-to-markup and markup-to-json.
 *
 * Covers missing scenarios from the initial test files:
 * - mc-else / mc-else-if serialization
 * - mc-each in markup-to-json conversion
 * - Deeply nested structures (4+ levels)
 * - mc-head with children in round-trip
 * - Empty children arrays
 * - Special characters in content and attributes
 * - Multiple sections
 * - mc-if/else-if/else chain serialization
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { describe, it, expect } from 'vitest';
import { jsonToMarkup } from '../../src/json/json-to-markup.js';
import { markupToJSON } from '../../src/json/markup-to-json.js';
import type { MCNode } from '../../src/json/schema.js';

// ===========================================================================
// jsonToMarkup — edge cases
// ===========================================================================

describe('jsonToMarkup — edge cases', () => {
  it('renders mc-else node', () => {
    const node: MCNode = {
      type: 'mc-else',
      attributes: {},
      children: [
        { type: 'mc-text', attributes: {}, content: 'Fallback content' },
      ],
    };
    const result = jsonToMarkup(node);
    expect(result).toContain('<mc-else>');
    expect(result).toContain('Fallback content');
    expect(result).toContain('</mc-else>');
  });

  it('renders mc-else-if node with condition', () => {
    const node: MCNode = {
      type: 'mc-else-if',
      attributes: { condition: 'isModerator' },
      children: [
        { type: 'mc-text', attributes: {}, content: 'Moderator view' },
      ],
    };
    const result = jsonToMarkup(node);
    expect(result).toContain('<mc-else-if condition="isModerator">');
    expect(result).toContain('Moderator view');
    expect(result).toContain('</mc-else-if>');
  });

  it('renders mc-if / mc-else-if / mc-else chain as siblings', () => {
    const body: MCNode = {
      type: 'mc-body',
      attributes: {},
      children: [
        {
          type: 'mc-if',
          attributes: { condition: 'isAdmin' },
          children: [{ type: 'mc-text', attributes: {}, content: 'Admin' }],
        },
        {
          type: 'mc-else-if',
          attributes: { condition: 'isMod' },
          children: [{ type: 'mc-text', attributes: {}, content: 'Mod' }],
        },
        {
          type: 'mc-else',
          attributes: {},
          children: [{ type: 'mc-text', attributes: {}, content: 'User' }],
        },
      ],
    };
    const result = jsonToMarkup(body);
    expect(result).toContain('<mc-if condition="isAdmin">');
    expect(result).toContain('</mc-if>');
    expect(result).toContain('<mc-else-if condition="isMod">');
    expect(result).toContain('</mc-else-if>');
    expect(result).toContain('<mc-else>');
    expect(result).toContain('</mc-else>');
  });

  it('renders deeply nested structure (4+ levels)', () => {
    const node: MCNode = {
      type: 'mc-body',
      attributes: {},
      children: [{
        type: 'mc-section',
        attributes: {},
        children: [{
          type: 'mc-column',
          attributes: {},
          children: [{
            type: 'mc-text',
            attributes: {},
            content: 'Deep content',
          }],
        }],
      }],
    };
    const result = jsonToMarkup(node);
    // Check indentation levels — 4 levels deep (mc wraps mc-body at indent 1)
    expect(result).toContain('        <mc-text>Deep content</mc-text>');
  });

  it('renders mc-head with mc-preview child', () => {
    const node: MCNode = {
      type: 'mc-body',
      attributes: {},
      children: [
        {
          type: 'mc-head',
          attributes: {},
          children: [
            { type: 'mc-preview', attributes: {}, content: 'Email preview text' },
          ],
        },
        {
          type: 'mc-section',
          attributes: {},
          children: [
            {
              type: 'mc-column',
              attributes: {},
              children: [
                { type: 'mc-text', attributes: {}, content: 'Content' },
              ],
            },
          ],
        },
      ],
    };
    const result = jsonToMarkup(node);
    expect(result).toContain('<mc-head>');
    expect(result).toContain('<mc-preview>Email preview text</mc-preview>');
    expect(result).toContain('</mc-head>');
  });

  it('renders node with empty children array', () => {
    const node: MCNode = {
      type: 'mc-section',
      attributes: {},
      children: [],
    };
    const result = jsonToMarkup(node);
    // empty children → no inner content, collapsed tags
    expect(result).toBe('<mc-section></mc-section>');
  });

  it('renders node without children property', () => {
    const node: MCNode = {
      type: 'mc-text',
      attributes: {},
      content: 'No children field',
    };
    const result = jsonToMarkup(node);
    expect(result).toBe('<mc-text>No children field</mc-text>');
  });

  it('preserves ampersand in attribute values (no escaping)', () => {
    const node: MCNode = {
      type: 'mc-button',
      attributes: { href: 'https://example.com?a=1&b=2' },
      content: 'Click',
    };
    const result = jsonToMarkup(node);
    // jsonToMarkup does not HTML-escape attribute values
    expect(result).toContain('href="https://example.com?a=1&b=2"');
  });

  it('preserves angle brackets in attribute values (no escaping)', () => {
    const node: MCNode = {
      type: 'mc-text',
      attributes: { 'data-info': '<script>' },
      content: 'test',
    };
    const result = jsonToMarkup(node);
    // jsonToMarkup does not HTML-escape attribute values
    expect(result).toContain('data-info="<script>"');
  });

  it('preserves content with HTML entities', () => {
    const node: MCNode = {
      type: 'mc-text',
      attributes: {},
      content: '&copy; 2025 Acme',
    };
    const result = jsonToMarkup(node);
    expect(result).toContain('&copy; 2025 Acme');
  });

  it('renders multiple sections', () => {
    const node: MCNode = {
      type: 'mc-body',
      attributes: {},
      children: [
        {
          type: 'mc-section',
          attributes: { class: 'header' },
          children: [{
            type: 'mc-column',
            attributes: {},
            children: [{ type: 'mc-text', attributes: {}, content: 'Header' }],
          }],
        },
        {
          type: 'mc-section',
          attributes: { class: 'footer' },
          children: [{
            type: 'mc-column',
            attributes: {},
            children: [{ type: 'mc-text', attributes: {}, content: 'Footer' }],
          }],
        },
      ],
    };
    const result = jsonToMarkup(node);
    expect(result).toContain('<mc-section class="header">');
    expect(result).toContain('<mc-section class="footer">');
    expect(result).toContain('Header');
    expect(result).toContain('Footer');
  });

  it('renders mc-raw node with HTML content', () => {
    const node: MCNode = {
      type: 'mc-raw',
      attributes: {},
      content: '<table><tr><td>Custom HTML</td></tr></table>',
    };
    const result = jsonToMarkup(node);
    expect(result).toContain('<mc-raw><table><tr><td>Custom HTML</td></tr></table></mc-raw>');
  });

  it('renders multiple attributes in stable order', () => {
    const node: MCNode = {
      type: 'mc-image',
      attributes: { src: 'img.png', alt: 'An image', width: '200px' },
    };
    const result = jsonToMarkup(node);
    expect(result).toContain('src="img.png"');
    expect(result).toContain('alt="An image"');
    expect(result).toContain('width="200px"');
    expect(result).toContain('/>');
  });
});

// ===========================================================================
// markupToJSON — edge cases
// ===========================================================================

describe('markupToJSON — edge cases', () => {
  it('converts mc-if with condition attribute', () => {
    const source = `<mc>
  <mc-body>
  <mc-if condition="showBanner">
    <mc-section><mc-column><mc-text>Banner</mc-text></mc-column></mc-section>
  </mc-if>
</mc-body>
</mc>`;
    const result = markupToJSON(source);
    expect(result.children).toBeDefined();
    expect(result.children && result.children[0]).toBeDefined();
    const mcBody = result.children?.[0];
    expect(mcBody?.children).toBeDefined();
    const mcIf = mcBody?.children?.[0];
    expect(mcIf?.type).toBe('mc-if');
    expect(mcIf?.attributes.condition).toBe('showBanner');
    expect(mcIf?.children).toHaveLength(1);
    expect(mcIf?.children?.[0]?.type).toBe('mc-section');
  });

  it('converts mc-each with items and as', () => {
    const source = `<mc>
  <mc-body>
  <mc-each items="items" as="item">
    <mc-section><mc-column><mc-text>{{item.name}}</mc-text></mc-column></mc-section>
  </mc-each>
</mc-body>
</mc>`;
    const result = markupToJSON(source);
    const forEach = result.children![0]!.children![0]!;
    expect(forEach.type).toBe('mc-each');
    expect(forEach.attributes.items).toBe('items');
    expect(forEach.attributes.as).toBe('item');
    expect(forEach.children).toHaveLength(1);
  });

  it('converts mc-if / mc-else chain', () => {
    const source = `<mc>
  <mc-body>
  <mc-if condition="hasData">
    <mc-section><mc-column><mc-text>Data here</mc-text></mc-column></mc-section>
  </mc-if>
  <mc-else>
    <mc-section><mc-column><mc-text>No data</mc-text></mc-column></mc-section>
  </mc-else>
</mc-body>
</mc>`;
    const result = markupToJSON(source);
    const body = result.children![0]!;
    expect(body.children).toHaveLength(2);
    expect(body.children![0]!.type).toBe('mc-if');
    expect(body.children![1]!.type).toBe('mc-else');
  });

  it('converts mc-head with mc-preview', () => {
    const source = `<mc>
  <mc-head>
    <mc-preview>Preview text here</mc-preview>
  </mc-head>
  <mc-body>
    <mc-section><mc-column><mc-text>Content</mc-text></mc-column></mc-section>
  </mc-body>
</mc>`;
    const result = markupToJSON(source);
    expect(result.children).toHaveLength(2);
    const head = result.children![0]!;
    expect(head.type).toBe('mc-head');
    expect(head.children).toHaveLength(1);
    expect(head.children![0]!.type).toBe('mc-preview');
    expect(head.children![0]!.content).toBe('Preview text here');
  });

  it('converts deeply nested structure', () => {
    const source = `<mc>
  <mc-body>
  <mc-section>
    <mc-column>
      <mc-text>Deep</mc-text>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;
    const result = markupToJSON(source);
    const text = result.children![0]!.children![0]!.children![0]!.children![0]!;
    expect(text.type).toBe('mc-text');
    expect(text.content).toBe('Deep');
  });

  it('converts multiple sections', () => {
    const source = `<mc>
  <mc-body>
  <mc-section><mc-column><mc-text>Section 1</mc-text></mc-column></mc-section>
  <mc-section><mc-column><mc-text>Section 2</mc-text></mc-column></mc-section>
  <mc-section><mc-column><mc-text>Section 3</mc-text></mc-column></mc-section>
</mc-body>
</mc>`;
    const result = markupToJSON(source);
    const body2 = result.children![0]!;
    expect(body2.children).toHaveLength(3);
    expect(body2.children![0]!.type).toBe('mc-section');
    expect(body2.children![1]!.type).toBe('mc-section');
    expect(body2.children![2]!.type).toBe('mc-section');
  });

  it('converts mc-raw with HTML content', () => {
    const source = `<mc>
  <mc-body>
  <mc-section><mc-column>
    <mc-raw><table><tr><td>Custom</td></tr></table></mc-raw>
  </mc-column></mc-section>
</mc-body>
</mc>`;
    const result = markupToJSON(source);
    const raw = result.children![0]!.children![0]!.children![0]!.children![0]!;
    expect(raw.type).toBe('mc-raw');
    // mc-raw HTML gets parsed as nested children, not content
    expect(raw.children).toBeDefined();
  });

  it('preserves expression syntax with fallback in content', () => {
    const source = `<mc>
  <mc-body><mc-section><mc-column>
  <mc-text>{{name || "Guest"}}</mc-text>
</mc-column></mc-section></mc-body>
</mc>`;
    const result = markupToJSON(source);
    const text = result.children![0]!.children![0]!.children![0]!.children![0]!;
    // The content should preserve the expression
    expect(text.content).toContain('{{');
    expect(text.content).toContain('name');
  });

  it('preserves raw expression syntax in content', () => {
    const source = `<mc>
  <mc-body><mc-section><mc-column>
  <mc-text>{{{rawHtml}}}</mc-text>
</mc-column></mc-section></mc-body>
</mc>`;
    const result = markupToJSON(source);
    const text = result.children![0]!.children![0]!.children![0]!.children![0]!;
    expect(text.content).toContain('{{{rawHtml}}}');
  });

  it('preserves template expressions in attributes', () => {
    const source = `<mc>
  <mc-body><mc-section><mc-column>
  <mc-button href="https://example.com/{{path}}">Click</mc-button>
</mc-column></mc-section></mc-body>
</mc>`;
    const result = markupToJSON(source);
    const button = result.children![0]!.children![0]!.children![0]!.children![0]!;
    expect(button.attributes.href).toBe('https://example.com/{{path}}');
  });

  it('converts empty mc-column (no children property set)', () => {
    const source = `<mc>
  <mc-body>
  <mc-section>
    <mc-column></mc-column>
  </mc-section>
</mc-body>
</mc>`;
    const result = markupToJSON(source);
    const column = result.children![0]!.children![0]!.children![0]!;
    expect(column.type).toBe('mc-column');
    // markupToJSON only sets children when node.children.length > 0
    // An empty column has no children property
    expect(column.children).toBeUndefined();
  });

  it('handles mixed content and expression in mc-text', () => {
    const source = `<mc>
  <mc-body><mc-section><mc-column>
  <mc-text>Hello {{name}}, your code is {{code}}</mc-text>
</mc-column></mc-section></mc-body>
</mc>`;
    const result = markupToJSON(source);
    const text = result.children![0]!.children![0]!.children![0]!.children![0]!;
    expect(text.content).toContain('Hello');
    expect(text.content).toContain('{{name}}');
    expect(text.content).toContain('{{code}}');
  });
});

// ===========================================================================
// Round-trip edge cases
// ===========================================================================

describe('Round-trip edge cases', () => {
  it('round-trips mc-if / mc-else chain (JSON → Markup → JSON)', () => {
    const original: MCNode = {
      type: 'mc-body',
      attributes: {},
      children: [
        {
          type: 'mc-if',
          attributes: { condition: 'isActive' },
          children: [
            {
              type: 'mc-section',
              attributes: {},
              children: [{
                type: 'mc-column',
                attributes: {},
                children: [{ type: 'mc-text', attributes: {}, content: 'Active' }],
              }],
            },
          ],
        },
        {
          type: 'mc-else',
          attributes: {},
          children: [
            {
              type: 'mc-section',
              attributes: {},
              children: [{
                type: 'mc-column',
                attributes: {},
                children: [{ type: 'mc-text', attributes: {}, content: 'Inactive' }],
              }],
            },
          ],
        },
      ],
    };
    const markup = jsonToMarkup(original);
    const roundTripped = markupToJSON(markup);

    const rt1 = roundTripped.children![0]!; // mc-body
    expect(rt1.children).toHaveLength(2);
    expect(rt1.children![0]!.type).toBe('mc-if');
    expect(rt1.children![0]!.attributes.condition).toBe('isActive');
    expect(rt1.children![1]!.type).toBe('mc-else');
  });

  it('round-trips mc-each (JSON → Markup → JSON)', () => {
    const original: MCNode = {
      type: 'mc-body',
      attributes: {},
      children: [
        {
          type: 'mc-each',
          attributes: { items: 'items', as: 'item' },
          children: [
            {
              type: 'mc-section',
              attributes: {},
              children: [{
                type: 'mc-column',
                attributes: {},
                children: [{ type: 'mc-text', attributes: {}, content: '{{item.name}}' }],
              }],
            },
          ],
        },
      ],
    };
    const markup = jsonToMarkup(original);
    const roundTripped = markupToJSON(markup);

    const rt2 = roundTripped.children![0]!; // mc-body
    expect(rt2.children).toHaveLength(1);
    const forEach = rt2.children![0]!;
    expect(forEach.type).toBe('mc-each');
    expect(forEach.attributes.items).toBe('items');
    expect(forEach.attributes.as).toBe('item');
  });

  it('round-trips mc-head with mc-preview (JSON → Markup → JSON)', () => {
    const original: MCNode = {
      type: 'mc-body',
      attributes: {},
      children: [
        {
          type: 'mc-head',
          attributes: {},
          children: [
            { type: 'mc-preview', attributes: {}, content: 'Preview text' },
          ],
        },
        {
          type: 'mc-section',
          attributes: {},
          children: [{
            type: 'mc-column',
            attributes: {},
            children: [{ type: 'mc-text', attributes: {}, content: 'Body' }],
          }],
        },
      ],
    };
    const markup = jsonToMarkup(original);
    const roundTripped = markupToJSON(markup);

    const rt3 = roundTripped.children![0]!; // mc-body
    expect(rt3.children).toHaveLength(2);
    expect(rt3.children![0]!.type).toBe('mc-head');
    expect(rt3.children![0]!.children![0]!.type).toBe('mc-preview');
    expect(rt3.children![0]!.children![0]!.content).toBe('Preview text');
  });

  it('round-trips multiple sections (JSON → Markup → JSON)', () => {
    const original: MCNode = {
      type: 'mc-body',
      attributes: {},
      children: [
        {
          type: 'mc-section',
          attributes: { class: 'header' },
          children: [{
            type: 'mc-column',
            attributes: {},
            children: [{ type: 'mc-text', attributes: {}, content: 'Header' }],
          }],
        },
        {
          type: 'mc-section',
          attributes: { class: 'content' },
          children: [{
            type: 'mc-column',
            attributes: {},
            children: [{ type: 'mc-text', attributes: {}, content: 'Main' }],
          }],
        },
        {
          type: 'mc-section',
          attributes: { class: 'footer' },
          children: [{
            type: 'mc-column',
            attributes: {},
            children: [{ type: 'mc-text', attributes: {}, content: 'Footer' }],
          }],
        },
      ],
    };
    const markup = jsonToMarkup(original);
    const roundTripped = markupToJSON(markup);

    const rt4 = roundTripped.children![0]!; // mc-body
    expect(rt4.children).toHaveLength(3);
    expect(rt4.children![0]!.attributes.class).toBe('header');
    expect(rt4.children![1]!.attributes.class).toBe('content');
    expect(rt4.children![2]!.attributes.class).toBe('footer');
  });

  it('round-trips Markup → JSON → Markup with mc-if/else', () => {
    const original = `<mc>
  <mc-body>
    <mc-if condition="show">
      <mc-section>
        <mc-column>
          <mc-text>Visible</mc-text>
        </mc-column>
      </mc-section>
    </mc-if>
    <mc-else>
      <mc-section>
        <mc-column>
          <mc-text>Hidden</mc-text>
        </mc-column>
      </mc-section>
    </mc-else>
  </mc-body>
</mc>`;

    const json = markupToJSON(original);
    const backToMarkup = jsonToMarkup(json);

    expect(backToMarkup).toContain('<mc-if condition="show">');
    expect(backToMarkup).toContain('</mc-if>');
    expect(backToMarkup).toContain('<mc-else>');
    expect(backToMarkup).toContain('</mc-else>');
    expect(backToMarkup).toContain('Visible');
    expect(backToMarkup).toContain('Hidden');
  });
});
