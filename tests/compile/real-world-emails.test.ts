/**
 * Real-world email integration tests.
 *
 * These tests replicate production-grade email templates (invoice, newsletter,
 * report) with dynamic data, conditionals, loops, and formatters — through
 * BOTH the markup (compile()) and JSON (compileFromJSON()) flows.
 *
 * This is the ultimate proof that the full system works end-to-end.
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compile.js';
import { compileFromJSON } from '../../src/json/index.js';
import type { MCNode } from '../../src/json/schema.js';
import type { CompileOptions } from '../../src/types.js';

// ===========================================================================
// Shared formatters
// ===========================================================================

const FORMATTERS: CompileOptions['formatters'] = {
  currency: (v: unknown) => `$${(Number(v) / 100).toFixed(2)}`,
  upper: (v: unknown) => String(v).toUpperCase(),
  date: (v: unknown) => {
    const d = new Date(String(v));
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  },
  percent: (v: unknown) => `${Number(v)}%`,
  number: (v: unknown) => Number(v).toLocaleString('en-US'),
};

// ===========================================================================
// 1. INVOICE EMAIL
// ===========================================================================

describe('Real-world: Invoice email (markup flow)', () => {
  const INVOICE_MARKUP = `
<mc>
  <mc-head>
    <mc-preview>Invoice #{{invoice.number}} from {{company.name}}</mc-preview>
  </mc-head>
  <mc-body class="bg-gray-100">
    <mc-section class="bg-white">
    <mc-column>
      <mc-image src="{{company.logo}}" alt="{{company.name}}" width="150px" />
    </mc-column>
  </mc-section>
  <mc-section class="bg-white">
    <mc-column>
      <mc-text class="text-xl font-bold">Invoice #{{invoice.number}}</mc-text>
      <mc-text>Date: {{invoice.date | date}}</mc-text>
      <mc-text>Bill to: {{customer.name}}</mc-text>
      <mc-text>{{customer.email}}</mc-text>
    </mc-column>
  </mc-section>
  <mc-section class="bg-white">
    <mc-column>
      <mc-text class="font-bold">Items</mc-text>
    </mc-column>
  </mc-section>
  <mc-each items="items" as="item">
    <mc-section class="bg-white">
      <mc-column>
        <mc-text>{{item.name}} (x{{item.qty}}) — {{item.price | currency}}</mc-text>
      </mc-column>
    </mc-section>
  </mc-each>
  <mc-section class="bg-white">
    <mc-column>
      <mc-divider />
      <mc-text class="font-bold">Subtotal: {{invoice.subtotal | currency}}</mc-text>
    </mc-column>
  </mc-section>
  <mc-if condition="hasDiscount">
    <mc-section class="bg-white">
      <mc-column>
        <mc-text>Discount ({{discount.percent | percent}}): -{{discount.amount | currency}}</mc-text>
      </mc-column>
    </mc-section>
  </mc-if>
  <mc-section class="bg-white">
    <mc-column>
      <mc-text class="text-xl font-bold">Total: {{invoice.total | currency}}</mc-text>
      <mc-button href="https://pay.example.com/inv/{{invoice.id}}">Pay Now</mc-button>
    </mc-column>
  </mc-section>
  <mc-section>
    <mc-column>
      <mc-text class="text-sm text-center">{{company.name}} · {{company.address}}</mc-text>
    </mc-column>
  </mc-section>
  </mc-body>
</mc>`;

  const INVOICE_DATA = {
    company: {
      name: 'Acme Corp',
      logo: 'https://acme.com/logo.png',
      address: '123 Main St, Portland, OR',
    },
    customer: { name: 'Sarah Connor', email: 'sarah@example.com' },
    invoice: {
      id: 'INV-2025-0042',
      number: '2025-0042',
      date: '2025-03-15',
      subtotal: 23400,
      total: 19890,
    },
    items: [
      { name: 'Widget Pro', qty: 2, price: 9900 },
      { name: 'USB-C Cable', qty: 3, price: 1200 },
    ],
    hasDiscount: true,
    discount: { percent: 15, amount: 3510 },
  };

  it('compiles with zero errors', () => {
    const result = compile(INVOICE_MARKUP, { data: INVOICE_DATA, formatters: FORMATTERS, templateStyle: "class" });
    expect(result.errors).toHaveLength(0);
    expect(result.html).not.toBeNull();
  });

  it('resolves preview text with company name', () => {
    const result = compile(INVOICE_MARKUP, { data: INVOICE_DATA, formatters: FORMATTERS, templateStyle: "class" });
    expect(result.html).toContain('Invoice #2025-0042 from Acme Corp');
  });

  it('resolves dynamic image src', () => {
    const result = compile(INVOICE_MARKUP, { data: INVOICE_DATA, formatters: FORMATTERS, templateStyle: "class" });
    expect(result.html).toContain('src="https://acme.com/logo.png"');
  });

  it('resolves customer info', () => {
    const result = compile(INVOICE_MARKUP, { data: INVOICE_DATA, formatters: FORMATTERS, templateStyle: "class" });
    expect(result.html).toContain('Sarah Connor');
    expect(result.html).toContain('sarah@example.com');
  });

  it('applies date formatter', () => {
    const result = compile(INVOICE_MARKUP, { data: INVOICE_DATA, formatters: FORMATTERS, templateStyle: "class" });
    expect(result.html).toContain('Mar 15, 2025');
  });

  it('expands mc-each with line items', () => {
    const result = compile(INVOICE_MARKUP, { data: INVOICE_DATA, formatters: FORMATTERS, templateStyle: "class" });
    expect(result.html).toContain('Widget Pro');
    expect(result.html).toContain('(x2)');
    expect(result.html).toContain('$99.00');
    expect(result.html).toContain('USB-C Cable');
    expect(result.html).toContain('(x3)');
    expect(result.html).toContain('$12.00');
  });

  it('applies currency formatter to subtotal and total', () => {
    const result = compile(INVOICE_MARKUP, { data: INVOICE_DATA, formatters: FORMATTERS, templateStyle: "class" });
    expect(result.html).toContain('$234.00');
    expect(result.html).toContain('$198.90');
  });

  it('shows discount section when hasDiscount is true', () => {
    const result = compile(INVOICE_MARKUP, { data: INVOICE_DATA, formatters: FORMATTERS, templateStyle: "class" });
    expect(result.html).toContain('15%');
    expect(result.html).toContain('-$35.10');
  });

  it('hides discount section when hasDiscount is false', () => {
    const noDiscountData = { ...INVOICE_DATA, hasDiscount: false };
    const result = compile(INVOICE_MARKUP, { data: noDiscountData, formatters: FORMATTERS, templateStyle: "class" });
    expect(result.html).not.toContain('-$35.10');
    expect(result.html).not.toContain('Discount');
  });

  it('resolves dynamic Pay Now button href', () => {
    const result = compile(INVOICE_MARKUP, { data: INVOICE_DATA, formatters: FORMATTERS, templateStyle: "class" });
    expect(result.html).toContain('https://pay.example.com/inv/INV-2025-0042');
  });

  it('resolves footer with company info', () => {
    const result = compile(INVOICE_MARKUP, { data: INVOICE_DATA, formatters: FORMATTERS, templateStyle: "class" });
    expect(result.html).toContain('Acme Corp');
    expect(result.html).toContain('123 Main St, Portland, OR');
  });

  it('produces full HTML document structure', () => {
    const result = compile(INVOICE_MARKUP, { data: INVOICE_DATA, formatters: FORMATTERS, templateStyle: "class" });
    expect(result.html).toContain('<!DOCTYPE html');
    expect(result.html).toContain('</html>');
  });
});

describe('Real-world: Invoice email (JSON flow)', () => {
  const INVOICE_JSON: MCNode = {
    type: 'mc',
    attributes: {},
    children: [
      {
        type: 'mc-head',
        attributes: {},
        children: [
          { type: 'mc-preview', attributes: {}, content: 'Invoice #{{invoice.number}} from {{company.name}}' },
        ],
      },
      {
        type: 'mc-body',
        attributes: { class: 'bg-gray-100' },
        children: [
        {
          type: 'mc-section',
          attributes: { class: 'bg-white' },
          children: [
            {
              type: 'mc-column',
              attributes: {},
              children: [
                { type: 'mc-image', attributes: { src: '{{company.logo}}', alt: '{{company.name}}', width: '150px' } },
              ],
            },
          ],
        },
        {
          type: 'mc-section',
          attributes: { class: 'bg-white' },
          children: [
            {
              type: 'mc-column',
              attributes: {},
              children: [
                { type: 'mc-text', attributes: { class: 'text-xl font-bold' }, content: 'Invoice #{{invoice.number}}' },
                { type: 'mc-text', attributes: {}, content: 'Bill to: {{customer.name}}' },
              ],
            },
          ],
        },
        {
          type: 'mc-each',
          attributes: { items: 'items', as: 'item' },
          children: [
            {
              type: 'mc-section',
              attributes: { class: 'bg-white' },
              children: [
                {
                  type: 'mc-column',
                  attributes: {},
                  children: [
                    { type: 'mc-text', attributes: {}, content: '{{item.name}} (x{{item.qty}}) — {{item.price | currency}}' },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'mc-if',
          attributes: { condition: 'hasDiscount' },
          children: [
            {
              type: 'mc-section',
              attributes: { class: 'bg-white' },
              children: [
                {
                  type: 'mc-column',
                  attributes: {},
                  children: [
                    { type: 'mc-text', attributes: {}, content: 'Discount: -{{discount.amount | currency}}' },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: 'mc-section',
          attributes: { class: 'bg-white' },
          children: [
            {
              type: 'mc-column',
              attributes: {},
              children: [
                { type: 'mc-text', attributes: { class: 'text-xl font-bold' }, content: 'Total: {{invoice.total | currency}}' },
                { type: 'mc-button', attributes: { href: 'https://pay.example.com/inv/{{invoice.id}}' }, content: 'Pay Now' },
              ],
            },
          ],
        },
      ],
    }],
  };

  const INVOICE_DATA = {
    company: { name: 'Acme Corp', logo: 'https://acme.com/logo.png' },
    customer: { name: 'Sarah Connor' },
    invoice: { id: 'INV-2025-0042', number: '2025-0042', subtotal: 23400, total: 19890 },
    items: [
      { name: 'Widget Pro', qty: 2, price: 9900 },
      { name: 'USB-C Cable', qty: 3, price: 1200 },
    ],
    hasDiscount: true,
    discount: { amount: 3510 },
  };

  it('compiles with zero errors', () => {
    const result = compileFromJSON(INVOICE_JSON, { data: INVOICE_DATA, formatters: FORMATTERS, templateStyle: "class" });
    expect(result.errors).toHaveLength(0);
    expect(result.html).not.toBeNull();
  });

  it('resolves preview and customer name', () => {
    const result = compileFromJSON(INVOICE_JSON, { data: INVOICE_DATA, formatters: FORMATTERS, templateStyle: "class" });
    expect(result.html).toContain('Invoice #2025-0042 from Acme Corp');
    expect(result.html).toContain('Sarah Connor');
  });

  it('expands line items via mc-each', () => {
    const result = compileFromJSON(INVOICE_JSON, { data: INVOICE_DATA, formatters: FORMATTERS, templateStyle: "class" });
    expect(result.html).toContain('Widget Pro');
    expect(result.html).toContain('$99.00');
    expect(result.html).toContain('USB-C Cable');
    expect(result.html).toContain('$12.00');
  });

  it('shows discount when hasDiscount is true', () => {
    const result = compileFromJSON(INVOICE_JSON, { data: INVOICE_DATA, formatters: FORMATTERS, templateStyle: "class" });
    expect(result.html).toContain('-$35.10');
  });

  it('hides discount when hasDiscount is false', () => {
    const data = { ...INVOICE_DATA, hasDiscount: false };
    const result = compileFromJSON(INVOICE_JSON, { data, formatters: FORMATTERS, templateStyle: "class" });
    expect(result.html).not.toContain('-$35.10');
  });

  it('resolves dynamic button href', () => {
    const result = compileFromJSON(INVOICE_JSON, { data: INVOICE_DATA, formatters: FORMATTERS, templateStyle: "class" });
    expect(result.html).toContain('https://pay.example.com/inv/INV-2025-0042');
  });

  it('resolves total with currency formatter', () => {
    const result = compileFromJSON(INVOICE_JSON, { data: INVOICE_DATA, formatters: FORMATTERS, templateStyle: "class" });
    expect(result.html).toContain('$198.90');
  });

  it('works with sampleData from MCDocument', () => {
    const doc = {
      version: '1.0',
      metadata: { id: 'inv-001', name: 'Invoice', created: '2025-01-01', updated: '2025-01-01' },
      sampleData: INVOICE_DATA,
      template: INVOICE_JSON,
    };
    const result = compileFromJSON(doc, { formatters: FORMATTERS, templateStyle: "class" });
    expect(result.html).toContain('Sarah Connor');
    expect(result.html).toContain('Widget Pro');
  });
});

// ===========================================================================
// 2. NEWSLETTER EMAIL
// ===========================================================================

describe('Real-world: Newsletter email (markup flow)', () => {
  const NEWSLETTER_MARKUP = `
<mc>
  <mc-head>
    <mc-preview>{{newsletter.subject}}</mc-preview>
  </mc-head>
  <mc-body class="bg-gray-100">
    <mc-section class="bg-white">
    <mc-column>
      <mc-text class="text-2xl font-bold text-center">{{newsletter.title}}</mc-text>
      <mc-text class="text-center">{{newsletter.subtitle}}</mc-text>
    </mc-column>
  </mc-section>
  <mc-if condition="featured">
    <mc-section class="bg-white">
      <mc-column>
        <mc-image src="{{featured.image}}" alt="{{featured.title}}" width="600px" />
        <mc-text class="text-lg font-bold">{{featured.title}}</mc-text>
        <mc-text>{{featured.excerpt}}</mc-text>
        <mc-button href="{{featured.url}}">Read More</mc-button>
      </mc-column>
    </mc-section>
  </mc-if>
  <mc-each items="articles" as="article">
    <mc-section class="bg-white">
      <mc-column class="w-1/3">
        <mc-image src="{{article.thumbnail}}" alt="{{article.title}}" width="200px" />
      </mc-column>
      <mc-column class="w-2/3">
        <mc-text class="font-bold">{{article.title}}</mc-text>
        <mc-text>{{article.excerpt}}</mc-text>
        <mc-button href="{{article.url}}">Read Article</mc-button>
      </mc-column>
    </mc-section>
  </mc-each>
  <mc-section>
    <mc-column>
      <mc-divider />
      <mc-text class="text-sm text-center">You received this because you subscribed to {{newsletter.name}}.</mc-text>
      <mc-button href="https://example.com/unsubscribe?id={{subscriber.id}}">Unsubscribe</mc-button>
    </mc-column>
  </mc-section>
  </mc-body>
</mc>`;

  const NEWSLETTER_DATA = {
    newsletter: {
      name: 'TechWeekly',
      title: 'This Week in Tech',
      subtitle: 'Issue #47 — March 2025',
      subject: 'TechWeekly #47: AI, Security & DevOps',
    },
    subscriber: { id: 'sub-abc-123' },
    featured: {
      title: 'The Future of AI in 2025',
      image: 'https://cdn.example.com/ai-hero.jpg',
      excerpt: 'AI continues to reshape how we build software...',
      url: 'https://example.com/articles/ai-2025',
    },
    articles: [
      {
        title: 'Zero-Trust Security Guide',
        thumbnail: 'https://cdn.example.com/sec.jpg',
        excerpt: 'Implementing zero-trust in your org...',
        url: 'https://example.com/articles/zero-trust',
      },
      {
        title: 'DevOps Pipeline Best Practices',
        thumbnail: 'https://cdn.example.com/devops.jpg',
        excerpt: 'Streamline your CI/CD workflow...',
        url: 'https://example.com/articles/devops',
      },
    ],
  };

  it('compiles with zero errors', () => {
    const result = compile(NEWSLETTER_MARKUP, { data: NEWSLETTER_DATA, templateStyle: "class" });
    expect(result.errors).toHaveLength(0);
    expect(result.html).not.toBeNull();
  });

  it('resolves newsletter title and subtitle', () => {
    const result = compile(NEWSLETTER_MARKUP, { data: NEWSLETTER_DATA, templateStyle: "class" });
    expect(result.html).toContain('This Week in Tech');
    expect(result.html).toContain('Issue #47');
  });

  it('shows featured article when featured data exists', () => {
    const result = compile(NEWSLETTER_MARKUP, { data: NEWSLETTER_DATA, templateStyle: "class" });
    expect(result.html).toContain('The Future of AI in 2025');
    expect(result.html).toContain('https://cdn.example.com/ai-hero.jpg');
    expect(result.html).toContain('https://example.com/articles/ai-2025');
  });

  it('hides featured article when featured is falsy', () => {
    const data = { ...NEWSLETTER_DATA, featured: null };
    const result = compile(NEWSLETTER_MARKUP, { data, templateStyle: "class" });
    expect(result.html).not.toContain('The Future of AI in 2025');
  });

  it('expands article list via mc-each', () => {
    const result = compile(NEWSLETTER_MARKUP, { data: NEWSLETTER_DATA, templateStyle: "class" });
    expect(result.html).toContain('Zero-Trust Security Guide');
    expect(result.html).toContain('DevOps Pipeline Best Practices');
    expect(result.html).toContain('https://cdn.example.com/sec.jpg');
    expect(result.html).toContain('https://cdn.example.com/devops.jpg');
  });

  it('resolves dynamic unsubscribe URL', () => {
    const result = compile(NEWSLETTER_MARKUP, { data: NEWSLETTER_DATA, templateStyle: "class" });
    expect(result.html).toContain('https://example.com/unsubscribe?id=sub-abc-123');
  });

  it('resolves newsletter name in footer', () => {
    const result = compile(NEWSLETTER_MARKUP, { data: NEWSLETTER_DATA, templateStyle: "class" });
    expect(result.html).toContain('subscribed to TechWeekly');
  });
});

// ===========================================================================
// 3. REPORT / ANALYTICS SUMMARY EMAIL
// ===========================================================================

describe('Real-world: Report email (markup flow)', () => {
  const REPORT_MARKUP = `
<mc>
  <mc-body>
  <mc-section class="bg-white">
    <mc-column>
      <mc-text class="text-2xl font-bold">{{report.title}}</mc-text>
      <mc-text>Period: {{report.period}}</mc-text>
    </mc-column>
  </mc-section>
  <mc-section class="bg-white">
    <mc-column class="w-1/2">
      <mc-text class="text-3xl font-bold text-center">{{metrics.revenue | currency}}</mc-text>
      <mc-text class="text-center">Revenue</mc-text>
    </mc-column>
    <mc-column class="w-1/2">
      <mc-text class="text-3xl font-bold text-center">{{metrics.users | number}}</mc-text>
      <mc-text class="text-center">Active Users</mc-text>
    </mc-column>
  </mc-section>
  <mc-if condition="alerts">
    <mc-section class="bg-white">
      <mc-column>
        <mc-text class="font-bold">Alerts</mc-text>
      </mc-column>
    </mc-section>
    <mc-each items="alerts" as="alert">
      <mc-section class="bg-white">
        <mc-column>
          <mc-text>{{alert.message}}</mc-text>
        </mc-column>
      </mc-section>
    </mc-each>
  </mc-if>
  <mc-if condition="showTopPages">
    <mc-section class="bg-white">
      <mc-column>
        <mc-text class="font-bold">Top Pages</mc-text>
      </mc-column>
    </mc-section>
    <mc-each items="topPages" as="page">
      <mc-section class="bg-white">
        <mc-column>
          <mc-text>{{page.path}} — {{page.views | number}} views</mc-text>
        </mc-column>
      </mc-section>
    </mc-each>
  </mc-if>
  <mc-else>
    <mc-section class="bg-white">
      <mc-column>
        <mc-text>No page data available for this period.</mc-text>
      </mc-column>
    </mc-section>
  </mc-else>
  <mc-section>
    <mc-column>
      <mc-button href="https://dashboard.example.com/reports/{{report.id}}">View Full Report</mc-button>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;

  const REPORT_DATA = {
    report: {
      id: 'rpt-2025-q1',
      title: 'Q1 2025 Performance Report',
      period: 'Jan 1 — Mar 31, 2025',
    },
    metrics: {
      revenue: 4528900,
      users: 12847,
    },
    alerts: [
      { message: 'Server response time increased by 23% this week' },
      { message: 'Bounce rate on /pricing exceeded threshold' },
    ],
    showTopPages: true,
    topPages: [
      { path: '/home', views: 45230 },
      { path: '/pricing', views: 23100 },
      { path: '/docs', views: 18950 },
    ],
  };

  it('compiles with zero errors', () => {
    const result = compile(REPORT_MARKUP, { data: REPORT_DATA, formatters: FORMATTERS, templateStyle: "class" });
    expect(result.errors).toHaveLength(0);
    expect(result.html).not.toBeNull();
  });

  it('resolves report title and period', () => {
    const result = compile(REPORT_MARKUP, { data: REPORT_DATA, formatters: FORMATTERS, templateStyle: "class" });
    expect(result.html).toContain('Q1 2025 Performance Report');
    expect(result.html).toContain('Jan 1');
  });

  it('formats revenue with currency formatter', () => {
    const result = compile(REPORT_MARKUP, { data: REPORT_DATA, formatters: FORMATTERS, templateStyle: "class" });
    expect(result.html).toContain('$45289.00');
  });

  it('formats user count with number formatter', () => {
    const result = compile(REPORT_MARKUP, { data: REPORT_DATA, formatters: FORMATTERS, templateStyle: "class" });
    expect(result.html).toContain('12,847');
  });

  it('shows alerts when alerts array is non-empty', () => {
    const result = compile(REPORT_MARKUP, { data: REPORT_DATA, formatters: FORMATTERS, templateStyle: "class" });
    expect(result.html).toContain('Server response time increased by 23%');
    expect(result.html).toContain('Bounce rate on /pricing exceeded threshold');
  });

  it('hides alerts when alerts is empty array', () => {
    const data = { ...REPORT_DATA, alerts: [] };
    const result = compile(REPORT_MARKUP, { data, formatters: FORMATTERS, templateStyle: "class" });
    // Empty array = falsy per our evaluateCondition
    expect(result.html).not.toContain('Alerts');
  });

  it('shows top pages with formatted view counts', () => {
    const result = compile(REPORT_MARKUP, { data: REPORT_DATA, formatters: FORMATTERS, templateStyle: "class" });
    expect(result.html).toContain('/home');
    expect(result.html).toContain('45,230');
    expect(result.html).toContain('/pricing');
    expect(result.html).toContain('/docs');
  });

  it('shows fallback message when showTopPages is false', () => {
    const data = { ...REPORT_DATA, showTopPages: false };
    const result = compile(REPORT_MARKUP, { data, formatters: FORMATTERS, templateStyle: "class" });
    expect(result.html).toContain('No page data available');
    expect(result.html).not.toContain('/home');
  });

  it('resolves dynamic report link', () => {
    const result = compile(REPORT_MARKUP, { data: REPORT_DATA, formatters: FORMATTERS, templateStyle: "class" });
    expect(result.html).toContain('https://dashboard.example.com/reports/rpt-2025-q1');
  });
});

describe('Real-world: Report email (JSON flow)', () => {
  const REPORT_JSON: MCNode = {
    type: 'mc',
    attributes: {},
    children: [{

      type: 'mc-body',
      attributes: {},
      children: [
        {
          type: 'mc-section',
          attributes: { class: 'bg-white' },
          children: [
            {
              type: 'mc-column',
              attributes: {},
              children: [
                { type: 'mc-text', attributes: { class: 'text-2xl font-bold' }, content: '{{report.title}}' },
                { type: 'mc-text', attributes: {}, content: 'Period: {{report.period}}' },
              ],
            },
          ],
        },
        {
          type: 'mc-if',
          attributes: { condition: 'hasAlerts' },
          children: [
            {
              type: 'mc-each',
              attributes: { items: 'alerts', as: 'alert' },
              children: [
                {
                  type: 'mc-section',
                  attributes: {},
                  children: [
                    {
                      type: 'mc-column',
                      attributes: {},
                      children: [
                        { type: 'mc-text', attributes: {}, content: '{{alert.message}}' },
                      ],
                    },
                  ],
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
                  type: 'mc-button',
                  attributes: { href: 'https://dashboard.example.com/reports/{{report.id}}' },
                  content: 'View Full Report',
                },
              ],
            },
          ],
        },
      ],
  
    }],
  };

  const REPORT_DATA = {
    report: { id: 'rpt-q1', title: 'Q1 Report', period: 'Jan-Mar 2025' },
    hasAlerts: true,
    alerts: [
      { message: 'CPU spike detected' },
      { message: 'Disk usage warning' },
    ],
  };

  it('compiles with zero errors', () => {
    const result = compileFromJSON(REPORT_JSON, { data: REPORT_DATA, templateStyle: "class" });
    expect(result.errors).toHaveLength(0);
    expect(result.html).not.toBeNull();
  });

  it('resolves title and period', () => {
    const result = compileFromJSON(REPORT_JSON, { data: REPORT_DATA, templateStyle: "class" });
    expect(result.html).toContain('Q1 Report');
    expect(result.html).toContain('Jan-Mar 2025');
  });

  it('expands nested mc-if + mc-each', () => {
    const result = compileFromJSON(REPORT_JSON, { data: REPORT_DATA, templateStyle: "class" });
    expect(result.html).toContain('CPU spike detected');
    expect(result.html).toContain('Disk usage warning');
  });

  it('hides alerts when condition is false', () => {
    const data = { ...REPORT_DATA, hasAlerts: false };
    const result = compileFromJSON(REPORT_JSON, { data, templateStyle: "class" });
    expect(result.html).not.toContain('CPU spike');
  });

  it('resolves dynamic button href', () => {
    const result = compileFromJSON(REPORT_JSON, { data: REPORT_DATA, templateStyle: "class" });
    expect(result.html).toContain('https://dashboard.example.com/reports/rpt-q1');
  });
});

// ===========================================================================
// 4. WELCOME / ONBOARDING EMAIL
// ===========================================================================

describe('Real-world: Welcome email (markup flow)', () => {
  const WELCOME_MARKUP = `
<mc>
  <mc-head>
    <mc-preview>Welcome to {{app.name}}, {{user.firstName}}!</mc-preview>
  </mc-head>
  <mc-body class="bg-gray-100">
    <mc-section class="bg-white">
    <mc-column>
      <mc-text class="text-2xl font-bold">Welcome, {{user.firstName}}!</mc-text>
      <mc-text>We're thrilled to have you on board.</mc-text>
    </mc-column>
  </mc-section>
  <mc-if condition="user.isPremium">
    <mc-section class="bg-white">
      <mc-column>
        <mc-text class="font-bold">Your Premium Benefits</mc-text>
        <mc-text>As a premium member, you get access to all features.</mc-text>
      </mc-column>
    </mc-section>
  </mc-if>
  <mc-else>
    <mc-section class="bg-white">
      <mc-column>
        <mc-text>Upgrade to Premium to unlock all features.</mc-text>
        <mc-button href="https://{{app.domain}}/upgrade?ref={{user.id}}">Upgrade Now</mc-button>
      </mc-column>
    </mc-section>
  </mc-else>
  <mc-if condition="steps">
    <mc-section class="bg-white">
      <mc-column>
        <mc-text class="font-bold">Getting Started</mc-text>
      </mc-column>
    </mc-section>
    <mc-each items="steps" as="step">
      <mc-section class="bg-white">
        <mc-column>
          <mc-text>{{step.number}}. {{step.title}}</mc-text>
          <mc-text>{{step.description}}</mc-text>
        </mc-column>
      </mc-section>
    </mc-each>
  </mc-if>
  <mc-section>
    <mc-column>
      <mc-divider />
      <mc-text class="text-sm text-center">Need help? Reply to this email or visit our docs.</mc-text>
    </mc-column>
  </mc-section>
  </mc-body>
</mc>`;

  const FREE_USER_DATA = {
    app: { name: 'MailCraft', domain: 'mailcraft.dev' },
    user: { id: 'usr-42', firstName: 'Alex', isPremium: false },
    steps: [
      { number: 1, title: 'Create your first template', description: 'Use our drag-and-drop builder.' },
      { number: 2, title: 'Connect your data', description: 'Link your API or upload a CSV.' },
      { number: 3, title: 'Send your first email', description: 'Preview, test, and send!' },
    ],
  };

  const PREMIUM_USER_DATA = {
    ...FREE_USER_DATA,
    user: { id: 'usr-99', firstName: 'Jordan', isPremium: true },
  };

  it('compiles successfully for free user', () => {
    const result = compile(WELCOME_MARKUP, { data: FREE_USER_DATA, templateStyle: "class" });
    expect(result.errors).toHaveLength(0);
    expect(result.html).not.toBeNull();
  });

  it('shows upgrade section for free user', () => {
    const result = compile(WELCOME_MARKUP, { data: FREE_USER_DATA, templateStyle: "class" });
    expect(result.html).toContain('Upgrade to Premium');
    expect(result.html).toContain('https://mailcraft.dev/upgrade?ref=usr-42');
    expect(result.html).not.toContain('Premium Benefits');
  });

  it('shows premium benefits for premium user', () => {
    const result = compile(WELCOME_MARKUP, { data: PREMIUM_USER_DATA, templateStyle: "class" });
    expect(result.html).toContain('Premium Benefits');
    expect(result.html).not.toContain('Upgrade to Premium');
  });

  it('expands onboarding steps', () => {
    const result = compile(WELCOME_MARKUP, { data: FREE_USER_DATA, templateStyle: "class" });
    expect(result.html).toContain('Create your first template');
    expect(result.html).toContain('Connect your data');
    expect(result.html).toContain('Send your first email');
  });

  it('resolves preview text with app name and user name', () => {
    const result = compile(WELCOME_MARKUP, { data: FREE_USER_DATA, templateStyle: "class" });
    expect(result.html).toContain('Welcome to MailCraft, Alex!');
  });
});
