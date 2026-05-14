/**
 * Integration tests for template resolution in both compile flows.
 *
 * Covers BUILD_ORDER items 10.5.23-10.5.28:
 * - JSON flow with data + formatters
 * - Markup flow with data + formatters
 * - Both flows WITHOUT data (passthrough)
 * - Security tests (both flows)
 * - Mixed passthrough (some resolved, some not)
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compile.js';
import { compileFromJSON } from '../../src/json/index.js';
import type { MCNode } from '../../src/json/schema.js';

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

const TEST_DATA = {
  customer: { name: 'Sarah', email: 'sarah@example.com' },
  order: { id: 'ORD-9842', total: 12750, date: '2024-01-15' },
  items: [
    { name: 'Headphones', qty: 1, price: 7900 },
    { name: 'USB-C Cable', qty: 2, price: 1200 },
  ],
  showDiscount: true,
  discount: 15,
};

const TEST_FORMATTERS = {
  currency: (v: unknown) => `$${(Number(v) / 100).toFixed(2)}`,
  upper: (v: unknown) => String(v).toUpperCase(),
};

// ===========================================================================
// 10.5.24 — Markup flow with data + formatters
// ===========================================================================

describe('Markup flow — compile() with data', () => {
  it('resolves simple variable substitution', () => {
    const source = `
<mc>
  <mc-body>
  <mc-section>
    <mc-column>
      <mc-text>Hello {{customer.name}}!</mc-text>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;

    const result = compile(source, { data: TEST_DATA });
    expect(result.html).toContain('Hello Sarah!');
    expect(result.errors).toHaveLength(0);
  });

  it('resolves formatter pipe', () => {
    const source = `
<mc>
  <mc-body>
  <mc-section>
    <mc-column>
      <mc-text>Total: {{order.total | currency}}</mc-text>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;

    const result = compile(source, { data: TEST_DATA, formatters: TEST_FORMATTERS });
    expect(result.html).toContain('Total: $127.50');
  });

  it('resolves attribute expressions', () => {
    const source = `
<mc>
  <mc-body>
  <mc-section>
    <mc-column>
      <mc-button href="https://example.com/orders/{{order.id}}">View Order</mc-button>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;

    const result = compile(source, { data: TEST_DATA });
    expect(result.html).toContain('https://example.com/orders/ORD-9842');
  });

  it('resolves fallback when value is missing', () => {
    const source = `
<mc>
  <mc-body>
  <mc-section>
    <mc-column>
      <mc-text>Hi {{customer.nickname || "Customer"}}!</mc-text>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;

    const result = compile(source, { data: TEST_DATA });
    expect(result.html).toContain('Hi Customer!');
  });
});

// ===========================================================================
// 10.5.26 — Markup flow WITHOUT data (passthrough)
// ===========================================================================

describe('Markup flow — compile() WITHOUT data', () => {
  it('passes through expressions as-is', () => {
    const source = `
<mc>
  <mc-body>
  <mc-section>
    <mc-column>
      <mc-text>Hello {{customer.name}}!</mc-text>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;

    const result = compile(source);
    expect(result.html).toContain('{{customer.name}}');
    expect(result.errors).toHaveLength(0);
  });

  it('passes through raw expressions as-is', () => {
    const source = `
<mc>
  <mc-body>
  <mc-section>
    <mc-column>
      <mc-text>{{{rawHtml}}}</mc-text>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;

    const result = compile(source);
    expect(result.html).toContain('{{{rawHtml}}}');
  });
});

// ===========================================================================
// 10.5.23 — JSON flow with data + formatters
// ===========================================================================

describe('JSON flow — compileFromJSON() with data', () => {
  it('resolves simple variable substitution', () => {
    const template: MCNode = {
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
                { type: 'mc-text', attributes: {}, content: 'Hello {{customer.name}}!' },
              ],
            },
          ],
        },
          ],
        },
      ],
    };

    const result = compileFromJSON(template, { data: TEST_DATA });
    expect(result.html).toContain('Hello Sarah!');
    expect(result.errors).toHaveLength(0);
  });

  it('resolves formatter pipe', () => {
    const template: MCNode = {
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
                { type: 'mc-text', attributes: {}, content: 'Total: {{order.total | currency}}' },
              ],
            },
          ],
        },
          ],
        },
      ],
    };

    const result = compileFromJSON(template, { data: TEST_DATA, formatters: TEST_FORMATTERS });
    expect(result.html).toContain('Total: $127.50');
  });

  it('resolves attribute expressions', () => {
    const template: MCNode = {
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
                  attributes: { href: 'https://example.com/orders/{{order.id}}' },
                  content: 'View Order',
                },
              ],
            },
          ],
        },
          ],
        },
      ],
    };

    const result = compileFromJSON(template, { data: TEST_DATA });
    expect(result.html).toContain('https://example.com/orders/ORD-9842');
  });

  it('uses sampleData from MCDocument when options.data is absent', () => {
    const doc = {
      version: '1.0',
      metadata: { id: 'test', name: 'Test', created: '2024-01-01', updated: '2024-01-01' },
      sampleData: { customer: { name: 'DocSample' } },
      template: {
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
                      { type: 'mc-text', attributes: {}, content: 'Hello {{customer.name}}!' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    const result = compileFromJSON(doc);
    expect(result.html).toContain('Hello DocSample!');
  });

  it('options.data takes precedence over sampleData', () => {
    const doc = {
      version: '1.0',
      metadata: { id: 'test', name: 'Test', created: '2024-01-01', updated: '2024-01-01' },
      sampleData: { customer: { name: 'DocSample' } },
      template: {
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
                      { type: 'mc-text', attributes: {}, content: 'Hello {{customer.name}}!' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    const result = compileFromJSON(doc, { data: { customer: { name: 'Override' } } });
    expect(result.html).toContain('Hello Override!');
  });
});

// ===========================================================================
// 10.5.25 — JSON flow WITHOUT data (passthrough)
// ===========================================================================

describe('JSON flow — compileFromJSON() WITHOUT data', () => {
  it('passes through expressions as-is', () => {
    const template: MCNode = {
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
                { type: 'mc-text', attributes: {}, content: 'Hello {{customer.name}}!' },
              ],
            },
          ],
        },
          ],
        },
      ],
    };

    const result = compileFromJSON(template);
    expect(result.html).toContain('{{customer.name}}');
    expect(result.errors).toHaveLength(0);
  });
});

// ===========================================================================
// 10.5.27 — Security (both flows)
// ===========================================================================

describe('Security — prototype pollution blocked', () => {
  it('blocks __proto__ in markup flow', () => {
    const source = `
<mc>
  <mc-body>
  <mc-section>
    <mc-column>
      <mc-text>{{__proto__.polluted}}</mc-text>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;

    const result = compile(source, { data: { __proto__: { polluted: 'hacked' } } });
    // Should NOT resolve — expression should pass through or be empty
    expect(result.html).not.toContain('hacked');
  });

  it('blocks constructor in JSON flow', () => {
    const template: MCNode = {
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
                { type: 'mc-text', attributes: {}, content: '{{constructor.name}}' },
              ],
            },
          ],
        },
          ],
        },
      ],
    };

    const result = compileFromJSON(template, { data: {} });
    expect(result.html).not.toContain('Object');
  });
});

// ===========================================================================
// 10.5.28 — Mixed passthrough
// ===========================================================================

describe('Mixed passthrough — some resolved, some not', () => {
  it('resolves known expressions, passes through unknown ones (markup)', () => {
    const source = `
<mc>
  <mc-body>
  <mc-section>
    <mc-column>
      <mc-text>Hello {{name}}, code: {{activation_code}}</mc-text>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;

    const result = compile(source, { data: { name: 'Sarah' } });
    expect(result.html).toContain('Hello Sarah');
    expect(result.html).toContain('{{activation_code}}');
  });

  it('resolves known expressions, passes through unknown ones (JSON)', () => {
    const template: MCNode = {
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
                { type: 'mc-text', attributes: {}, content: 'Hello {{name}}, code: {{activation_code}}' },
              ],
            },
          ],
        },
          ],
        },
      ],
    };

    const result = compileFromJSON(template, { data: { name: 'Sarah' } });
    expect(result.html).toContain('Hello Sarah');
    expect(result.html).toContain('{{activation_code}}');
  });
});
