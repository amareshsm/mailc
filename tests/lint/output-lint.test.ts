/**
 * Integration tests — lint the output of compiled emails.
 *
 * Compiles real `.mc` markup through the full pipeline, then runs the
 * linter on the output HTML. Our compiler should produce email HTML
 * that passes all lint rules (zero errors, zero warnings).
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compile.js';
import { compileFromJSON } from '../../src/json/index.js';
import { lintEmailHtml } from '../../src/lint/index.js';
import type { LintIssue } from '../../src/lint/types.js';
import type { MCDocument } from '../../src/json/schema.js';

/**
 * Asserts a value is non-nullable and narrows its type. Throws a clear error
 * if undefined/null. Used to avoid non-null assertions (`!`) while still
 * letting TypeScript narrow the type for subsequent property access.
 */
function assertDefined<T>(value: T, message = 'expected value to be defined'): asserts value is NonNullable<T> {
  if (value === undefined || value === null) {
    throw new Error(message);
  }
}

// ===========================================================================
// Helpers
// ===========================================================================

/**
 * Compiles markup and asserts zero compile errors, then returns the HTML.
 *
 * @param source - The `.mc` markup.
 * @returns The compiled HTML string.
 */
function compileAndAssert(source: string, opts?: Parameters<typeof compile>[1]): string {
  const result = compile(source, opts);
  expect(result.errors, 'compile should produce zero errors').toEqual([]);
  assertDefined(result.html);
  return result.html;
}

/**
 * Filters lint issues to only errors and warnings (ignoring info).
 *
 * @param issues - All lint issues.
 * @returns Only error + warning severity issues.
 */
function errorsAndWarnings(issues: LintIssue[]): LintIssue[] {
  return issues.filter((i) => i.severity === 'error' || i.severity === 'warning');
}

// ===========================================================================
// Markup flow — compile() → lint
// ===========================================================================

describe('Lint compiled markup output', () => {
  it('minimal email passes all rules', () => {
    const html = compileAndAssert(`
      <mc>
  <mc-body>
        <mc-section>
          <mc-column>
            <mc-text>Hello World</mc-text>
          </mc-column>
        </mc-section>
      </mc-body>
</mc>
    `);
    const issues = lintEmailHtml(html);
    const problems = errorsAndWarnings(issues);
    expect(problems).toEqual([]);
  });

  it('email with image passes all rules', () => {
    const html = compileAndAssert(`
      <mc>
  <mc-body>
        <mc-section>
          <mc-column>
            <mc-image src="https://example.com/logo.png" alt="Logo" width="200px" />
          </mc-column>
        </mc-section>
      </mc-body>
</mc>
    `);
    const issues = lintEmailHtml(html);
    const problems = errorsAndWarnings(issues);
    expect(problems).toEqual([]);
  });

  it('email with button passes all rules', () => {
    const html = compileAndAssert(`
      <mc>
  <mc-body>
        <mc-section>
          <mc-column>
            <mc-button href="https://example.com">Click Me</mc-button>
          </mc-column>
        </mc-section>
      </mc-body>
</mc>
    `);
    const issues = lintEmailHtml(html);
    const problems = errorsAndWarnings(issues);
    expect(problems).toEqual([]);
  });

  it('two-column layout passes all rules', () => {
    const html = compileAndAssert(`
      <mc>
  <mc-body>
        <mc-section>
          <mc-column>
            <mc-text>Left column</mc-text>
          </mc-column>
          <mc-column>
            <mc-text>Right column</mc-text>
          </mc-column>
        </mc-section>
      </mc-body>
</mc>
    `);
    const issues = lintEmailHtml(html);
    const problems = errorsAndWarnings(issues);
    expect(problems).toEqual([]);
  });

  it('email with divider and spacer passes all rules', () => {
    const html = compileAndAssert(`
      <mc>
  <mc-body>
        <mc-section>
          <mc-column>
            <mc-text>Before</mc-text>
            <mc-divider />
            <mc-spacer height="20px" />
            <mc-text>After</mc-text>
          </mc-column>
        </mc-section>
      </mc-body>
</mc>
    `, { templateStyle: 'attribute' });
    const issues = lintEmailHtml(html);
    const problems = errorsAndWarnings(issues);
    expect(problems).toEqual([]);
  });

  it('email with preview text passes all rules', () => {
    const html = compileAndAssert(`
      <mc>
  <mc-head>
          <mc-preview>This is the preview text</mc-preview>
        </mc-head>
  <mc-body>
    <mc-section>
          <mc-column>
            <mc-text>Content</mc-text>
          </mc-column>
        </mc-section>
  </mc-body>
</mc>
    `);
    const issues = lintEmailHtml(html);
    const problems = errorsAndWarnings(issues);
    expect(problems).toEqual([]);
  });

  it('full email with multiple sections passes all rules', () => {
    const html = compileAndAssert(`
      <mc>
  <mc-head>
          <mc-preview>Preview</mc-preview>
        </mc-head>
  <mc-body>
    <mc-section class="bg-white py-4">
          <mc-column>
            <mc-image src="https://example.com/logo.png" alt="Logo" width="150px" />
          </mc-column>
        </mc-section>
        <mc-section class="bg-gray-100 py-8">
          <mc-column>
            <mc-text class="text-xl font-bold">Welcome!</mc-text>
            <mc-text>Thank you for signing up.</mc-text>
            <mc-button href="https://example.com/confirm" class="bg-blue-600 text-white rounded">Confirm Email</mc-button>
          </mc-column>
        </mc-section>
        <mc-section>
          <mc-column>
            <mc-divider />
            <mc-text class="text-sm text-gray-500">© 2025 Acme Inc.</mc-text>
          </mc-column>
        </mc-section>
  </mc-body>
</mc>
    `, { templateStyle: 'class' });
    const issues = lintEmailHtml(html);
    const problems = errorsAndWarnings(issues);
    expect(problems).toEqual([]);
  });

  it('email with dynamic template (resolved) passes all rules', () => {
    const html = compile(`
      <mc>
  <mc-body>
        <mc-section>
          <mc-column>
            <mc-text>Hello {{name}}</mc-text>
            <mc-button href="https://example.com/{{userId}}">Dashboard</mc-button>
          </mc-column>
        </mc-section>
      </mc-body>
</mc>
    `, {
      data: { name: 'Alice', userId: '42' },
    });
    expect(html.errors).toEqual([]);
    assertDefined(html.html);
    const issues = lintEmailHtml(html.html);
    const problems = errorsAndWarnings(issues);
    expect(problems).toEqual([]);
  });
});

// ===========================================================================
// JSON flow — compileFromJSON() → lint
// ===========================================================================

describe('Lint compiled JSON output', () => {
  it('JSON-sourced email passes all rules', () => {
    const doc: MCDocument = {
      version: '1.0',
      metadata: {
        id: 'lint-test-1',
        name: 'Lint Test',
        created: '2025-01-01T00:00:00Z',
        updated: '2025-01-01T00:00:00Z',
      },
      template: {
        type: 'mc',
        attributes: {},
        children: [{

          type: 'mc-body',
          attributes: {},
          children: [
            {
              type: 'mc-section',
              attributes: {},
              children: [{
                type: 'mc-column',
                attributes: {},
                children: [
                  { type: 'mc-text', attributes: {}, content: 'Hello from JSON' },
                ],
              }],
            },
          ],
      
        }],
      },
    };
    const result = compileFromJSON(doc);
    expect(result.errors).toEqual([]);
    assertDefined(result.html);

    const issues = lintEmailHtml(result.html);
    const problems = errorsAndWarnings(issues);
    expect(problems).toEqual([]);
  });

  it('JSON email with image + button passes all rules', () => {
    const doc: MCDocument = {
      version: '1.0',
      metadata: {
        id: 'lint-test-2',
        name: 'Lint Test 2',
        created: '2025-01-01T00:00:00Z',
        updated: '2025-01-01T00:00:00Z',
      },
      template: {
        type: 'mc',
        attributes: {},
        children: [{

          type: 'mc-body',
          attributes: {},
          children: [
            {
              type: 'mc-section',
              attributes: {},
              children: [{
                type: 'mc-column',
                attributes: {},
                children: [
                  { type: 'mc-image', attributes: { src: 'https://example.com/hero.png', alt: 'Hero', width: '600px' } },
                  { type: 'mc-text', attributes: {}, content: 'Welcome to our newsletter!' },
                  { type: 'mc-button', attributes: { href: 'https://example.com' }, content: 'Read More' },
                ],
              }],
            },
          ],
      
        }],
      },
    };
    const result = compileFromJSON(doc);
    expect(result.errors).toEqual([]);
    assertDefined(result.html);

    const issues = lintEmailHtml(result.html);
    const problems = errorsAndWarnings(issues);
    expect(problems).toEqual([]);
  });

  it('JSON email with sampleData resolved passes all rules', () => {
    const doc: MCDocument = {
      version: '1.0',
      metadata: {
        id: 'lint-test-3',
        name: 'Dynamic Lint Test',
        created: '2025-01-01T00:00:00Z',
        updated: '2025-01-01T00:00:00Z',
      },
      sampleData: {
        customerName: 'Bob',
        orderId: 'ORD-789',
      },
      template: {
        type: 'mc',
        attributes: {},
        children: [{

          type: 'mc-body',
          attributes: {},
          children: [
            {
              type: 'mc-section',
              attributes: {},
              children: [{
                type: 'mc-column',
                attributes: {},
                children: [
                  { type: 'mc-text', attributes: {}, content: 'Hi {{customerName}}!' },
                  { type: 'mc-button', attributes: { href: 'https://example.com/orders/{{orderId}}' }, content: 'View Order' },
                ],
              }],
            },
          ],
      
        }],
      },
    };
    const result = compileFromJSON(doc);
    expect(result.errors).toEqual([]);
    assertDefined(result.html);

    const issues = lintEmailHtml(result.html);
    const problems = errorsAndWarnings(issues);
    expect(problems).toEqual([]);
  });
});

// ===========================================================================
// Verify our compiler never produces certain anti-patterns
// ===========================================================================

describe('Compiler output safety guarantees', () => {
  it('never produces relative CSS units', () => {
    const html = compileAndAssert(`
      <mc>
  <mc-body>
        <mc-section>
          <mc-column>
            <mc-text class="text-base">Content</mc-text>
          </mc-column>
        </mc-section>
      </mc-body>
</mc>
    `, { templateStyle: 'class' });
    const issues = lintEmailHtml(html);
    const relativeUnitIssues = issues.filter((i) => i.ruleId === 'no-relative-units');
    expect(relativeUnitIssues).toEqual([]);
  });

  it('never produces javascript: hrefs', () => {
    const html = compileAndAssert(`
      <mc>
  <mc-body>
        <mc-section>
          <mc-column>
            <mc-button href="https://safe.com">Safe</mc-button>
          </mc-column>
        </mc-section>
      </mc-body>
</mc>
    `);
    const issues = lintEmailHtml(html);
    const jsIssues = issues.filter((i) => i.ruleId === 'no-javascript-href');
    expect(jsIssues).toEqual([]);
  });

  it('never produces <script> tags', () => {
    const html = compileAndAssert(`
      <mc>
  <mc-body>
        <mc-section>
          <mc-column>
            <mc-text>Hello</mc-text>
          </mc-column>
        </mc-section>
      </mc-body>
</mc>
    `);
    const issues = lintEmailHtml(html);
    const scriptIssues = issues.filter((i) => i.ruleId === 'no-script');
    expect(scriptIssues).toEqual([]);
  });

  it('always includes DOCTYPE, xmlns, charset, viewport', () => {
    const html = compileAndAssert(`
      <mc>
  <mc-body>
        <mc-section>
          <mc-column>
            <mc-text>Hello</mc-text>
          </mc-column>
        </mc-section>
      </mc-body>
</mc>
    `);
    const issues = lintEmailHtml(html);
    const structureIssues = issues.filter((i) =>
      ['has-doctype', 'has-xmlns', 'has-meta-charset', 'has-meta-viewport'].includes(i.ruleId)
    );
    expect(structureIssues).toEqual([]);
  });

  it('always includes MSO conditionals and VML namespace', () => {
    const html = compileAndAssert(`
      <mc>
  <mc-body>
        <mc-section>
          <mc-column>
            <mc-text>Hello</mc-text>
          </mc-column>
        </mc-section>
      </mc-body>
</mc>
    `);
    const issues = lintEmailHtml(html);
    const outlookIssues = issues.filter((i) =>
      ['has-mso-conditionals', 'mso-has-xml-namespace'].includes(i.ruleId)
    );
    expect(outlookIssues).toEqual([]);
  });
});
