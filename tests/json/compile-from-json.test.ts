/**
 * End-to-end tests for compileFromJSON() — the JSON → Email entry point.
 *
 * KEY test: mc-button via JSON produces email-safe VML for Outlook.
 */

import { describe, it, expect } from 'vitest';
import { compileFromJSON } from '../../src/json/index.js';
import type { MCNode, MCDocument } from '../../src/json/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wraps a body-level child set in the minimal mc → mc-body → section → column chain. */
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
              {
                type: 'mc-column',
                attributes: {},
                children,
              },
            ],
          },
        ],
      },
    ],
  };
}

/** Creates a full MCDocument from a root node. */
function wrapInDocument(template: MCNode): MCDocument {
  return {
    version: '1.0',
    metadata: {
      id: 'test',
      name: 'Test',
      created: '2026-01-01T00:00:00Z',
      updated: '2026-01-01T00:00:00Z',
    },
    template,
  };
}

// ---------------------------------------------------------------------------
// Compile success cases
// ---------------------------------------------------------------------------

describe('compileFromJSON', () => {
  describe('basic compilation', () => {
    it('compiles bare mc-body to valid HTML', () => {
      const result = compileFromJSON({
        type: 'mc',
        attributes: {},
        children: [{ type: 'mc-body', attributes: {} }],
      });
      expect(result.errors).toHaveLength(0);
      expect(result.html).not.toBeNull();
      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('</html>');
    });

    it('compiles MCDocument input', () => {
      const doc = wrapInDocument({
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
                      { type: 'mc-text', attributes: {}, content: 'From doc' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = compileFromJSON(doc);
      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('From doc');
    });

    it('compiles mc-body > mc-section > mc-column > mc-text', () => {
      const result = compileFromJSON(
        wrapInColumn([
          { type: 'mc-text', attributes: {}, content: 'Hello JSON' },
        ]),
      );
      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('Hello JSON');
    });

    it('returns stats with component count', () => {
      const result = compileFromJSON(
        wrapInColumn([
          { type: 'mc-text', attributes: {}, content: 'Stats' },
        ]),
      );
      expect(result.stats.components).toBeGreaterThan(0);
      expect(result.stats.inputSize).toBeGreaterThan(0);
      expect(result.stats.outputSize).toBeGreaterThan(0);
      expect(result.stats.compileTime).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------------------
  // ⭐ mc-button VML verification — the user's #1 check
  // -----------------------------------------------------------------------

  describe('mc-button VML output', () => {
    const buttonNode: MCNode = {
      type: 'mc-button',
      attributes: { href: 'https://example.com/buy' },
      content: 'Buy Now',
    };

    const json = wrapInColumn([buttonNode]);

    it('compiles without errors', () => {
      const result = compileFromJSON(json);
      expect(result.errors).toHaveLength(0);
      expect(result.html).not.toBeNull();
    });

    it('contains Outlook VML conditional comment', () => {
      const result = compileFromJSON(json);
      expect(result.html).toContain('<!--[if mso]>');
    });

    it('contains v:roundrect VML element', () => {
      const result = compileFromJSON(json);
      expect(result.html).toContain('v:roundrect');
    });

    it('contains the href in VML', () => {
      const result = compileFromJSON(json);
      expect(result.html).toContain('href="https://example.com/buy"');
    });

    it('contains non-Outlook fallback <a> link', () => {
      const result = compileFromJSON(json);
      expect(result.html).toContain('<!--[if !mso]><!-->');
      expect(result.html).toContain('<a href="https://example.com/buy"');
    });

    it('contains button text "Buy Now"', () => {
      const result = compileFromJSON(json);
      expect(result.html).toContain('Buy Now');
    });

    it('contains inline display:inline-block for the link', () => {
      const result = compileFromJSON(json);
      expect(result.html).toContain('display:inline-block');
    });

    it('applies custom background-color attribute (attribute mode)', () => {
      // CSS-prop attrs are an attribute-mode feature; pass templateStyle:'attribute'
      // explicitly since compileFromJSON now defaults to class mode.
      const customButton: MCNode = {
        type: 'mc-button',
        attributes: {
          href: 'https://example.com',
          'background-color': '#e85d3a',
        },
        content: 'Custom BG',
      };
      const result = compileFromJSON(wrapInColumn([customButton]), { templateStyle: 'attribute' });
      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('fillcolor="#e85d3a"');
      expect(result.html).toContain('background-color:#e85d3a');
    });

    it('applies custom color attribute (attribute mode)', () => {
      const customButton: MCNode = {
        type: 'mc-button',
        attributes: {
          href: '#',
          color: '#333333',
        },
        content: 'Dark Text',
      };
      const result = compileFromJSON(wrapInColumn([customButton]), { templateStyle: 'attribute' });
      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('color:#333333');
    });
  });

  // -----------------------------------------------------------------------
  // mc-image table wrapper (Outlook safety)
  // -----------------------------------------------------------------------

  describe('mc-image output', () => {
    it('renders email-safe image with Outlook table wrapper', () => {
      const imgNode: MCNode = {
        type: 'mc-image',
        attributes: { src: 'https://example.com/logo.png', alt: 'Logo' },
      };
      const result = compileFromJSON(wrapInColumn([imgNode]));
      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('<img');
      expect(result.html).toContain('src="https://example.com/logo.png"');
      expect(result.html).toContain('alt="Logo"');
    });
  });

  // -----------------------------------------------------------------------
  // mc-divider and mc-spacer
  // -----------------------------------------------------------------------

  describe('mc-divider output', () => {
    it('renders a horizontal rule element', () => {
      const result = compileFromJSON(
        wrapInColumn([{ type: 'mc-divider', attributes: {} }]),
      );
      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('border-top');
    });
  });

  describe('mc-spacer output', () => {
    it('renders a spacer with height (attribute mode)', () => {
      // height is a CSS-prop attr on mc-spacer; needs attribute mode to be accepted.
      const result = compileFromJSON(
        wrapInColumn([
          { type: 'mc-spacer', attributes: { height: '30px' } },
        ]),
        { templateStyle: 'attribute' },
      );
      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('30px');
    });
  });

  // -----------------------------------------------------------------------
  // mc-head / mc-preview
  // -----------------------------------------------------------------------

  describe('mc-head and mc-preview', () => {
    it('renders preview text', () => {
      const result = compileFromJSON({
        type: 'mc',
        attributes: {},
        children: [
          {
            type: 'mc-head',
            attributes: {},
            children: [
              {
                type: 'mc-preview',
                attributes: {},
                content: 'Preview text goes here',
              },
            ],
          },
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
                      { type: 'mc-text', attributes: {}, content: 'Body' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });
      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('Preview text goes here');
    });
  });

  // -----------------------------------------------------------------------
  // mc-raw passthrough
  // -----------------------------------------------------------------------

  describe('mc-raw output', () => {
    it('passes raw HTML through', () => {
      const result = compileFromJSON(
        wrapInColumn([
          {
            type: 'mc-raw',
            attributes: {},
            content: '<p style="margin:0">Custom HTML</p>',
          },
        ]),
      );
      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('<p style="margin:0">Custom HTML</p>');
    });
  });

  // -----------------------------------------------------------------------
  // Content with template expressions (passthrough)
  // -----------------------------------------------------------------------

  describe('template expression passthrough', () => {
    it('preserves {{ }} expressions in output', () => {
      const result = compileFromJSON(
        wrapInColumn([
          {
            type: 'mc-text',
            attributes: {},
            content: 'Hello {{name}}',
          },
        ]),
      );
      expect(result.errors).toHaveLength(0);
      // Expressions should pass through to final HTML for external
      // template engines (Handlebars, Liquid, etc.) to resolve
      expect(result.html).toContain('{{name}}');
    });
  });

  // -----------------------------------------------------------------------
  // Full email JSON — realistic scenario
  // -----------------------------------------------------------------------

  describe('full email JSON', () => {
    it('compiles a realistic multi-section email', () => {
      const email: MCNode = {
        type: 'mc',
        attributes: {},
        children: [
          {
            type: 'mc-head',
            attributes: {},
            children: [
              {
                type: 'mc-preview',
                attributes: {},
                content: 'Your order is confirmed!',
              },
            ],
          },
          {
            type: 'mc-body',
            attributes: { 'background-color': '#f4f4f4' },
            children: [
          {
            type: 'mc-section',
            attributes: { 'background-color': '#ffffff' },
            children: [
              {
                type: 'mc-column',
                attributes: {},
                children: [
                  {
                    type: 'mc-image',
                    attributes: {
                      src: 'https://example.com/logo.png',
                      alt: 'Company Logo',
                      width: '150px',
                    },
                  },
                ],
              },
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
                  {
                    type: 'mc-text',
                    attributes: {},
                    content: '<h1>Order Confirmed!</h1><p>Thanks for your purchase.</p>',
                  },
                  {
                    type: 'mc-button',
                    attributes: {
                      href: 'https://example.com/orders',
                      'background-color': '#28a745',
                    },
                    content: 'View Order',
                  },
                ],
              },
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
                  { type: 'mc-divider', attributes: {} },
                  {
                    type: 'mc-text',
                    attributes: { 'font-size': '12px', color: '#999999' },
                    content: '© 2026 Example Corp. All rights reserved.',
                  },
                ],
              },
            ],
          },
            ],
          },
        ],
      };

      // Fixture uses raw CSS-prop attrs (background-color, color, font-size) on
      // mc-body / mc-section / mc-button / mc-text — opt into attribute mode so
      // those values are accepted (compileFromJSON now defaults to class mode).
      const result = compileFromJSON(email, { templateStyle: 'attribute' });

      expect(result.errors).toHaveLength(0);
      expect(result.html).not.toBeNull();

      // Structural checks
      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('</html>');

      // Content checks
      expect(result.html).toContain('Your order is confirmed!');
      expect(result.html).toContain('Order Confirmed!');
      expect(result.html).toContain('View Order');
      expect(result.html).toContain('Company Logo');

      // VML button present
      expect(result.html).toContain('v:roundrect');
      expect(result.html).toContain('fillcolor="#28a745"');

      // Stats
      expect(result.stats.components).toBeGreaterThan(5);
    });
  });

  // -----------------------------------------------------------------------
  // Error cases
  // -----------------------------------------------------------------------

  describe('error cases', () => {
    it('returns errors for invalid nesting', () => {
      const result = compileFromJSON({
        type: 'mc',
        attributes: {},
        children: [
          {
            type: 'mc-body',
            attributes: {},
            children: [
              { type: 'mc-text', attributes: {}, content: 'Bad' },
            ],
          },
        ],
      });
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.html).not.toBeNull();
      expect(result.partial).toBe(true);
    });

    it('returns errors for missing required attributes', () => {
      const result = compileFromJSON(
        wrapInColumn([{ type: 'mc-image', attributes: {} }]),
      );
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.html).not.toBeNull();
      expect(result.partial).toBe(true);
    });

    it('returns errors for duplicate IDs', () => {
      const result = compileFromJSON({
        id: 'root',
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
            children: [
              {
                id: 'dup',
                type: 'mc-column',
                attributes: {},
              },
            ],
          },
            ],
          },
        ],
      });
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.html).not.toBeNull();
      expect(result.partial).toBe(true);
    });

    it('includes errors for unknown components', () => {
      const result = compileFromJSON({
        type: 'mc',
        attributes: {},
        children: [
          {
            type: 'mc-body',
            attributes: {},
            children: [{ type: 'mc-carousel', attributes: {} }],
          },
        ],
      });
      // mc-carousel is unknown → surfaced as an error so isValid/partial
      // are honest about the fact that the compiler will reject it.
      const unknownErrors = result.errors.filter(
        (e) => e.code === 'UNKNOWN_COMPONENT',
      );
      expect(unknownErrors.length).toBeGreaterThan(0);
    });
  });

  // -----------------------------------------------------------------------
  // Multiple columns
  // -----------------------------------------------------------------------

  describe('multi-column layout', () => {
    it('compiles 2-column layout', () => {
      const result = compileFromJSON({
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
                      { type: 'mc-text', attributes: {}, content: 'Column 1' },
                    ],
                  },
                  {
                    type: 'mc-column',
                    attributes: {},
                    children: [
                      { type: 'mc-text', attributes: {}, content: 'Column 2' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });
      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('Column 1');
      expect(result.html).toContain('Column 2');
    });
  });

  // -----------------------------------------------------------------------
  // Options passthrough
  // -----------------------------------------------------------------------

  describe('options', () => {
    it('accepts config overrides via options', () => {
      const result = compileFromJSON(
        wrapInColumn([
          { type: 'mc-text', attributes: {}, content: 'Width test' },
        ]),
        { config: { width: 700 } },
      );
      expect(result.errors).toHaveLength(0);
      expect(result.html).toContain('700px');
    });
  });
});
