/**
 * End-to-end tests for dynamic template features through the full compile pipeline.
 *
 * Tests mc-if/else-if/else chains, mc-for-each loops, nested conditionals
 * inside loops, chained formatters, and edge cases — through BOTH the
 * markup (compile()) and JSON (compileFromJSON()) flows.
 *
 * These tests verify that the entire pipeline works together:
 * tokenize → parse → validate → resolve template → compile → assemble → optimize
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compile.js';
import { compileFromJSON } from '../../src/json/index.js';
import type { MCNode } from '../../src/json/schema.js';
import type { CompileResult } from '../../src/types.js';

// ===========================================================================
// Helpers
// ===========================================================================

/** Asserts compile succeeds with zero errors. */
function compileOk(source: string, options = {}): CompileResult {
  const result = compile(source, options);
  expect(result.errors, `Compile errors: ${JSON.stringify(result.errors)}`).toHaveLength(0);
  expect(result.html).not.toBeNull();
  return result;
}

// ===========================================================================
// mc-if / mc-else-if / mc-else — MARKUP FLOW
// ===========================================================================

describe('E2E: mc-if/else chains (markup)', () => {
  const TEMPLATE = `
<mc>
  <mc-body>
  <mc-section>
    <mc-column>
      <mc-if condition="tier">
        <mc-if condition="isAdmin">
          <mc-text>Admin Dashboard</mc-text>
        </mc-if>
        <mc-else-if condition="isModerator">
          <mc-text>Moderator Panel</mc-text>
        </mc-else-if>
        <mc-else>
          <mc-text>User Dashboard</mc-text>
        </mc-else>
      </mc-if>
      <mc-else>
        <mc-text>Please log in</mc-text>
      </mc-else>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;

  it('shows admin dashboard when isAdmin is true', () => {
    const result = compileOk(TEMPLATE, { data: { tier: true, isAdmin: true, isModerator: false } });
    expect(result.html).toContain('Admin Dashboard');
    expect(result.html).not.toContain('Moderator Panel');
    expect(result.html).not.toContain('User Dashboard');
    expect(result.html).not.toContain('Please log in');
  });

  it('shows moderator panel when isModerator is true', () => {
    const result = compileOk(TEMPLATE, { data: { tier: true, isAdmin: false, isModerator: true } });
    expect(result.html).toContain('Moderator Panel');
    expect(result.html).not.toContain('Admin Dashboard');
  });

  it('shows user dashboard as fallback', () => {
    const result = compileOk(TEMPLATE, { data: { tier: true, isAdmin: false, isModerator: false } });
    expect(result.html).toContain('User Dashboard');
    expect(result.html).not.toContain('Admin Dashboard');
    expect(result.html).not.toContain('Moderator Panel');
  });

  it('shows login prompt when tier is falsy', () => {
    const result = compileOk(TEMPLATE, { data: { tier: false } });
    expect(result.html).toContain('Please log in');
    expect(result.html).not.toContain('Dashboard');
  });
});

// ===========================================================================
// mc-for-each — MARKUP FLOW
// ===========================================================================

describe('E2E: mc-for-each (markup)', () => {
  it('expands loop with resolved expressions', () => {
    const source = `
<mc>
  <mc-body>
  <mc-for-each collection="names" as="name">
    <mc-section><mc-column><mc-text>{{name}}</mc-text></mc-column></mc-section>
  </mc-for-each>
</mc-body>
</mc>`;

    const result = compileOk(source, { data: { names: ['Alice', 'Bob', 'Charlie'] } });
    expect(result.html).toContain('Alice');
    expect(result.html).toContain('Bob');
    expect(result.html).toContain('Charlie');
  });

  it('expands loop with object items', () => {
    const source = `
<mc>
  <mc-body>
  <mc-for-each collection="products" as="product">
    <mc-section><mc-column>
      <mc-text>{{product.name}} - {{product.sku}}</mc-text>
    </mc-column></mc-section>
  </mc-for-each>
</mc-body>
</mc>`;

    const data = {
      products: [
        { name: 'Laptop', sku: 'SKU-001' },
        { name: 'Mouse', sku: 'SKU-002' },
      ],
    };
    const result = compileOk(source, { data });
    expect(result.html).toContain('Laptop - SKU-001');
    expect(result.html).toContain('Mouse - SKU-002');
  });

  it('handles empty collection (no output)', () => {
    const source = `
<mc>
  <mc-body>
  <mc-for-each collection="items" as="item">
    <mc-section><mc-column><mc-text>{{item.name}}</mc-text></mc-column></mc-section>
  </mc-for-each>
  <mc-section><mc-column><mc-text>Footer</mc-text></mc-column></mc-section>
</mc-body>
</mc>`;

    const result = compileOk(source, { data: { items: [] } });
    expect(result.html).toContain('Footer');
    // Should have no leftover {{item.name}}
    expect(result.html).not.toContain('{{item.name}}');
  });

  it('uses loop metadata (_index, _first, _last)', () => {
    const source = `
<mc>
  <mc-body>
  <mc-for-each collection="items" as="item">
    <mc-section><mc-column>
      <mc-text>{{_index}}: {{item}}</mc-text>
    </mc-column></mc-section>
  </mc-for-each>
</mc-body>
</mc>`;

    const result = compileOk(source, { data: { items: ['A', 'B', 'C'] } });
    expect(result.html).toContain('0: A');
    expect(result.html).toContain('1: B');
    expect(result.html).toContain('2: C');
  });
});

// ===========================================================================
// Nested conditionals inside loops
// ===========================================================================

describe('E2E: nested conditionals + loops (markup)', () => {
  it('conditionally renders inside loop', () => {
    const source = `
<mc>
  <mc-body>
  <mc-for-each collection="orders" as="order">
    <mc-section><mc-column>
      <mc-text>Order #{{order.id}}</mc-text>
      <mc-if condition="order.shipped">
        <mc-text>Status: Shipped</mc-text>
      </mc-if>
      <mc-else>
        <mc-text>Status: Processing</mc-text>
      </mc-else>
    </mc-column></mc-section>
  </mc-for-each>
</mc-body>
</mc>`;

    const data = {
      orders: [
        { id: '001', shipped: true },
        { id: '002', shipped: false },
      ],
    };

    const result = compileOk(source, { data });
    expect(result.html).toContain('Order #001');
    expect(result.html).toContain('Order #002');
    expect(result.html).toContain('Status: Shipped');
    expect(result.html).toContain('Status: Processing');
  });

  it('loop inside conditional', () => {
    const source = `
<mc>
  <mc-body>
  <mc-if condition="showItems">
    <mc-for-each collection="items" as="item">
      <mc-section><mc-column><mc-text>{{item}}</mc-text></mc-column></mc-section>
    </mc-for-each>
  </mc-if>
  <mc-else>
    <mc-section><mc-column><mc-text>No items to show</mc-text></mc-column></mc-section>
  </mc-else>
</mc-body>
</mc>`;

    const resultShow = compileOk(source, { data: { showItems: true, items: ['X', 'Y'] } });
    expect(resultShow.html).toContain('X');
    expect(resultShow.html).toContain('Y');
    expect(resultShow.html).not.toContain('No items to show');

    const resultHide = compileOk(source, { data: { showItems: false, items: ['X', 'Y'] } });
    expect(resultHide.html).toContain('No items to show');
    expect(resultHide.html).not.toContain('>X<');
  });
});

// ===========================================================================
// Formatters through full pipeline
// ===========================================================================

describe('E2E: formatters through compile pipeline', () => {
  const FORMATTERS = {
    upper: (v: unknown) => String(v).toUpperCase(),
    lower: (v: unknown) => String(v).toLowerCase(),
    currency: (v: unknown) => `$${(Number(v) / 100).toFixed(2)}`,
    truncate: (v: unknown, len: string) => String(v).slice(0, Number(len)),
    wrap: (v: unknown, prefix: string, suffix: string) => `${prefix}${v}${suffix}`,
  };

  it('applies single formatter in markup flow', () => {
    const source = `
<mc>
  <mc-body><mc-section><mc-column>
  <mc-text>{{name | upper}}</mc-text>
</mc-column></mc-section></mc-body>
</mc>`;

    const result = compileOk(source, { data: { name: 'sarah' }, formatters: FORMATTERS });
    expect(result.html).toContain('SARAH');
  });

  it('chains multiple formatters in markup flow', () => {
    const source = `
<mc>
  <mc-body><mc-section><mc-column>
  <mc-text>{{title | upper | truncate "5"}}</mc-text>
</mc-column></mc-section></mc-body>
</mc>`;

    const result = compileOk(source, { data: { title: 'hello world' }, formatters: FORMATTERS });
    expect(result.html).toContain('HELLO');
    expect(result.html).not.toContain('HELLO WORLD');
  });

  it('applies formatter with multiple args', () => {
    const source = `
<mc>
  <mc-body><mc-section><mc-column>
  <mc-text>{{name | wrap "[" "]"}}</mc-text>
</mc-column></mc-section></mc-body>
</mc>`;

    const result = compileOk(source, { data: { name: 'Sarah' }, formatters: FORMATTERS });
    expect(result.html).toContain('[Sarah]');
  });

  it('applies formatter in attribute expressions', () => {
    const source = `
<mc>
  <mc-body><mc-section><mc-column>
  <mc-button href="https://example.com/user/{{slug | lower}}">Profile</mc-button>
</mc-column></mc-section></mc-body>
</mc>`;

    const result = compileOk(source, { data: { slug: 'SarahConnor' }, formatters: FORMATTERS });
    expect(result.html).toContain('https://example.com/user/sarahconnor');
  });

  it('applies formatter in mc-for-each loop items', () => {
    const source = `
<mc>
  <mc-body>
  <mc-for-each collection="prices" as="price">
    <mc-section><mc-column><mc-text>{{price | currency}}</mc-text></mc-column></mc-section>
  </mc-for-each>
</mc-body>
</mc>`;

    const result = compileOk(source, { data: { prices: [9900, 4500] }, formatters: FORMATTERS });
    expect(result.html).toContain('$99.00');
    expect(result.html).toContain('$45.00');
  });

  it('skips unknown formatters gracefully', () => {
    const source = `
<mc>
  <mc-body><mc-section><mc-column>
  <mc-text>{{name | nonExistent}}</mc-text>
</mc-column></mc-section></mc-body>
</mc>`;

    const result = compileOk(source, { data: { name: 'Sarah' }, formatters: FORMATTERS });
    expect(result.html).toContain('Sarah');
  });

  it('handles formatter that returns empty string', () => {
    const formatters = {
      empty: () => '',
    };
    const source = `
<mc>
  <mc-body><mc-section><mc-column>
  <mc-text>Before{{name | empty}}After</mc-text>
</mc-column></mc-section></mc-body>
</mc>`;

    const result = compileOk(source, { data: { name: 'X' }, formatters });
    expect(result.html).toContain('BeforeAfter');
  });
});

// ===========================================================================
// JSON flow — mc-if/else, mc-for-each, formatters
// ===========================================================================

describe('E2E: dynamic features (JSON flow)', () => {
  const FORMATTERS = {
    upper: (v: unknown) => String(v).toUpperCase(),
    currency: (v: unknown) => `$${(Number(v) / 100).toFixed(2)}`,
  };

  it('resolves mc-if/else chain in JSON', () => {
    const template: MCNode = {
      type: 'mc',
      attributes: {},
      children: [{

        type: 'mc-body',
        attributes: {},
        children: [
          {
            type: 'mc-if',
            attributes: { condition: 'isPremium' },
            children: [
              {
                type: 'mc-section',
                attributes: {},
                children: [
                  {
                    type: 'mc-column',
                    attributes: {},
                    children: [{ type: 'mc-text', attributes: {}, content: 'Premium user' }],
                  },
                ],
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
                children: [
                  {
                    type: 'mc-column',
                    attributes: {},
                    children: [{ type: 'mc-text', attributes: {}, content: 'Free user' }],
                  },
                ],
              },
            ],
          },
        ],
    
      }],
    };

    const premium = compileFromJSON(template, { data: { isPremium: true } });
    expect(premium.errors).toHaveLength(0);
    expect(premium.html).toContain('Premium user');
    expect(premium.html).not.toContain('Free user');

    const free = compileFromJSON(template, { data: { isPremium: false } });
    expect(free.html).toContain('Free user');
    expect(free.html).not.toContain('Premium user');
  });

  it('expands mc-for-each in JSON', () => {
    const template: MCNode = {
      type: 'mc',
      attributes: {},
      children: [{

        type: 'mc-body',
        attributes: {},
        children: [
          {
            type: 'mc-for-each',
            attributes: { collection: 'items', as: 'item' },
            children: [
              {
                type: 'mc-section',
                attributes: {},
                children: [
                  {
                    type: 'mc-column',
                    attributes: {},
                    children: [
                      { type: 'mc-text', attributes: {}, content: '{{item.name}}: {{item.price | currency}}' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
    
      }],
    };

    const data = {
      items: [
        { name: 'Widget', price: 2500 },
        { name: 'Gadget', price: 5000 },
      ],
    };

    const result = compileFromJSON(template, { data, formatters: FORMATTERS });
    expect(result.errors).toHaveLength(0);
    expect(result.html).toContain('Widget: $25.00');
    expect(result.html).toContain('Gadget: $50.00');
  });

  it('nested mc-if inside mc-for-each in JSON', () => {
    const template: MCNode = {
      type: 'mc',
      attributes: {},
      children: [{

        type: 'mc-body',
        attributes: {},
        children: [
          {
            type: 'mc-for-each',
            attributes: { collection: 'users', as: 'user' },
            children: [
              {
                type: 'mc-section',
                attributes: {},
                children: [
                  {
                    type: 'mc-column',
                    attributes: {},
                    children: [
                      { type: 'mc-text', attributes: {}, content: '{{user.name}}' },
                      {
                        type: 'mc-if',
                        attributes: { condition: 'user.isActive' },
                        children: [
                          { type: 'mc-text', attributes: {}, content: ' (Active)' },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
    
      }],
    };

    const data = {
      users: [
        { name: 'Alice', isActive: true },
        { name: 'Bob', isActive: false },
      ],
    };

    const result = compileFromJSON(template, { data });
    expect(result.errors).toHaveLength(0);
    expect(result.html).toContain('Alice');
    expect(result.html).toContain('Bob');
    // "Active" should appear for Alice only
    expect(result.html).toContain('(Active)');
  });

  it('applies formatters in JSON flow attributes', () => {
    const template: MCNode = {
      type: 'mc',
      attributes: {},
      children: [{

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
                    attributes: { href: 'https://example.com/{{slug | upper}}' },
                    content: 'Visit',
                  },
                ],
              },
            ],
          },
        ],
    
      }],
    };

    const result = compileFromJSON(template, { data: { slug: 'profile' }, formatters: FORMATTERS });
    expect(result.errors).toHaveLength(0);
    expect(result.html).toContain('https://example.com/PROFILE');
  });
});

// ===========================================================================
// Fallback and passthrough
// ===========================================================================

describe('E2E: fallback and passthrough', () => {
  it('uses fallback when value is missing (markup)', () => {
    const source = `
<mc>
  <mc-body><mc-section><mc-column>
  <mc-text>Hello {{name || "Guest"}}!</mc-text>
</mc-column></mc-section></mc-body>
</mc>`;

    const result = compileOk(source, { data: {} });
    expect(result.html).toContain('Hello Guest!');
  });

  it('resolves value over fallback when present (markup)', () => {
    const source = `
<mc>
  <mc-body><mc-section><mc-column>
  <mc-text>Hello {{name || "Guest"}}!</mc-text>
</mc-column></mc-section></mc-body>
</mc>`;

    const result = compileOk(source, { data: { name: 'Sarah' } });
    expect(result.html).toContain('Hello Sarah!');
  });

  it('passes through expressions when no data provided (markup)', () => {
    const source = `
<mc>
  <mc-body><mc-section><mc-column>
  <mc-text>Hello {{name}}!</mc-text>
</mc-column></mc-section></mc-body>
</mc>`;

    const result = compileOk(source);
    expect(result.html).toContain('{{name}}');
  });

  it('partially resolves — some known, some unknown (markup)', () => {
    const source = `
<mc>
  <mc-body><mc-section><mc-column>
  <mc-text>{{greeting}} {{name}}, code: {{code}}</mc-text>
</mc-column></mc-section></mc-body>
</mc>`;

    const result = compileOk(source, { data: { greeting: 'Hi', name: 'Sarah' } });
    expect(result.html).toContain('Hi');
    expect(result.html).toContain('Sarah');
    expect(result.html).toContain('{{code}}');
  });

  it('uses fallback in JSON flow', () => {
    const template: MCNode = {
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
              { type: 'mc-text', attributes: {}, content: 'Hello {{name || "Guest"}}!' },
            ],
          }],
        }],
    
      }],
    };

    const result = compileFromJSON(template, { data: {} });
    expect(result.html).toContain('Hello Guest!');
  });
});

// ===========================================================================
// Raw (triple-brace) expressions
// ===========================================================================

describe('E2E: raw expressions {{{ }}}', () => {
  it('does not HTML-escape raw expressions (markup)', () => {
    const source = `
<mc>
  <mc-body><mc-section><mc-column>
  <mc-text>{{{rawContent}}}</mc-text>
</mc-column></mc-section></mc-body>
</mc>`;

    const result = compileOk(source, { data: { rawContent: '<strong>Bold</strong>' } });
    expect(result.html).toContain('<strong>Bold</strong>');
    expect(result.html).not.toContain('&lt;strong&gt;');
  });

  it('HTML-escapes double-brace expressions (markup)', () => {
    const source = `
<mc>
  <mc-body><mc-section><mc-column>
  <mc-text>{{rawContent}}</mc-text>
</mc-column></mc-section></mc-body>
</mc>`;

    const result = compileOk(source, { data: { rawContent: '<strong>Bold</strong>' } });
    expect(result.html).toContain('&lt;strong&gt;Bold&lt;/strong&gt;');
  });

  it('passes through raw expressions when no data (markup)', () => {
    const source = `
<mc>
  <mc-body><mc-section><mc-column>
  <mc-text>{{{rawContent}}}</mc-text>
</mc-column></mc-section></mc-body>
</mc>`;

    const result = compileOk(source);
    expect(result.html).toContain('{{{rawContent}}}');
  });
});

// ===========================================================================
// Edge cases
// ===========================================================================

describe('E2E: edge cases', () => {
  it('handles deeply nested expressions', () => {
    const source = `
<mc>
  <mc-body><mc-section><mc-column>
  <mc-text>{{a.b.c.d.e}}</mc-text>
</mc-column></mc-section></mc-body>
</mc>`;

    const result = compileOk(source, { data: { a: { b: { c: { d: { e: 'deep' } } } } } });
    expect(result.html).toContain('deep');
  });

  it('handles boolean values in expressions', () => {
    const source = `
<mc>
  <mc-body><mc-section><mc-column>
  <mc-text>Active: {{isActive}}</mc-text>
</mc-column></mc-section></mc-body>
</mc>`;

    const result = compileOk(source, { data: { isActive: true } });
    expect(result.html).toContain('Active: true');
  });

  it('handles numeric values in expressions', () => {
    const source = `
<mc>
  <mc-body><mc-section><mc-column>
  <mc-text>Count: {{count}}</mc-text>
</mc-column></mc-section></mc-body>
</mc>`;

    const result = compileOk(source, { data: { count: 42 } });
    expect(result.html).toContain('Count: 42');
  });

  it('handles zero value (not falsy for display)', () => {
    const source = `
<mc>
  <mc-body><mc-section><mc-column>
  <mc-text>Score: {{score}}</mc-text>
</mc-column></mc-section></mc-body>
</mc>`;

    const result = compileOk(source, { data: { score: 0 } });
    expect(result.html).toContain('Score: 0');
  });

  it('handles template with no dynamic content', () => {
    const source = `
<mc>
  <mc-body><mc-section><mc-column>
  <mc-text>Static content only</mc-text>
</mc-column></mc-section></mc-body>
</mc>`;

    const result = compileOk(source, { data: { unused: 'data' } });
    expect(result.html).toContain('Static content only');
  });

  it('handles mc-for-each with single item', () => {
    const source = `
<mc>
  <mc-body>
  <mc-for-each collection="items" as="item">
    <mc-section><mc-column><mc-text>{{item}}</mc-text></mc-column></mc-section>
  </mc-for-each>
</mc-body>
</mc>`;

    const result = compileOk(source, { data: { items: ['only'] } });
    expect(result.html).toContain('only');
  });

  it('handles HTML special chars in data (auto-escaped)', () => {
    const source = `
<mc>
  <mc-body><mc-section><mc-column>
  <mc-text>{{name}}</mc-text>
</mc-column></mc-section></mc-body>
</mc>`;

    const result = compileOk(source, { data: { name: 'O\'Brien & Co <LLC>' } });
    expect(result.html).toContain('O&#39;Brien &amp; Co &lt;LLC&gt;');
  });
});
