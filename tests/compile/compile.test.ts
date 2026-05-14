/**
 * Integration tests for the compile() orchestrator.
 *
 * Tests the full pipeline: source markup → email HTML.
 * Covers BUILD_ORDER items 8.6, 8.7, 8.8.
 */
import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compile.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Checks that compile result is successful (has HTML, no errors). */
function expectSuccess(source: string, opts?: Parameters<typeof compile>[1]): ReturnType<typeof compile> {
  const result = compile(source, opts);
  expect(result.errors).toHaveLength(0);
  expect(result.html).not.toBeNull();
  return result;
}

// ---------------------------------------------------------------------------
// 8.6 — Simple static .mc → complete email HTML
// ---------------------------------------------------------------------------

describe('compile — simple static template', () => {
  it('compiles a minimal mc-body into a full email document', () => {
    const source = `<mc>
  <mc-body><mc-section><mc-column><mc-text>Hello</mc-text></mc-column></mc-section></mc-body>
</mc>`;
    const result = expectSuccess(source);

    expect(result.html).toContain('<!DOCTYPE html>');
    expect(result.html).toContain('<html');
    expect(result.html).toContain('</html>');
    expect(result.html).toContain('<head>');
    expect(result.html).toContain('</head>');
    expect(result.html).toContain('<body');
    expect(result.html).toContain('</body>');
    expect(result.html).toContain('Hello');
  });

  it('includes reset CSS in head', () => {
    const source = `<mc>
  <mc-body><mc-section><mc-column><mc-text>Test</mc-text></mc-column></mc-section></mc-body>
</mc>`;
    const result = expectSuccess(source);

    expect(result.html).toContain('-webkit-text-size-adjust:100%');
    expect(result.html).toContain('mso-table-lspace:0pt');
  });

  it('includes responsive CSS', () => {
    const source = `<mc>
  <mc-body><mc-section><mc-column><mc-text>Test</mc-text></mc-column></mc-section></mc-body>
</mc>`;
    const result = expectSuccess(source);

    expect(result.html).toContain('@media only screen');
    expect(result.html).toContain('mc-responsive');
  });

  it('populates stats correctly', () => {
    const source = `<mc>
  <mc-body><mc-section><mc-column><mc-text>Hi</mc-text></mc-column></mc-section></mc-body>
</mc>`;
    const result = expectSuccess(source);

    expect(result.stats.inputSize).toBeGreaterThan(0);
    expect(result.stats.outputSize).toBeGreaterThan(0);
    expect(result.stats.compileTime).toBeGreaterThanOrEqual(0);
    expect(result.stats.components).toBeGreaterThan(0);
  });

  it('output size is larger than input size (email boilerplate)', () => {
    const source = `<mc>
  <mc-body><mc-section><mc-column><mc-text>X</mc-text></mc-column></mc-section></mc-body>
</mc>`;
    const result = expectSuccess(source);
    expect(result.stats.outputSize).toBeGreaterThan(result.stats.inputSize);
  });

  it('includes Outlook conditional comments', () => {
    const source = `<mc>
  <mc-body><mc-section><mc-column><mc-text>Test</mc-text></mc-column></mc-section></mc-body>
</mc>`;
    const result = expectSuccess(source);

    expect(result.html).toContain('<!--[if mso');
    expect(result.html).toContain('<![endif]-->');
  });

  it('applies Tailwind classes as inline styles', () => {
    const source = `<mc>
  <mc-body><mc-section><mc-column><mc-text class="text-lg text-center">Styled</mc-text></mc-column></mc-section></mc-body>
</mc>`;
    const result = expectSuccess(source, { templateStyle: 'class' });

    expect(result.html).toContain('font-size:18px');
    expect(result.html).toContain('text-align:center');
  });
});

// ---------------------------------------------------------------------------
// 8.7 — Two-column layout
// ---------------------------------------------------------------------------

describe('compile — two-column layout', () => {
  const TWO_COL = `
<mc>
  <mc-body>
  <mc-section>
    <mc-column class="w-1/2">
      <mc-text>Left column</mc-text>
    </mc-column>
    <mc-column class="w-1/2">
      <mc-text>Right column</mc-text>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;

  const CLASS_MODE = { templateStyle: 'class' as const };

  it('compiles successfully', () => {
    expectSuccess(TWO_COL, CLASS_MODE);
  });

  it('contains both column contents', () => {
    const result = expectSuccess(TWO_COL, CLASS_MODE);
    expect(result.html).toContain('Left column');
    expect(result.html).toContain('Right column');
  });

  it('generates correct column widths', () => {
    const result = expectSuccess(TWO_COL, CLASS_MODE);
    // At 600px parent, w-1/2 = 300px
    expect(result.html).toContain('max-width:300px');
  });

  it('includes Outlook column table', () => {
    const result = expectSuccess(TWO_COL, CLASS_MODE);
    // Outlook <td> for columns
    expect(result.html).toContain('width:300px');
  });

  it('has mc-responsive classes on column divs', () => {
    const result = expectSuccess(TWO_COL, CLASS_MODE);
    expect(result.html).toContain('class="mc-responsive"');
  });
});

// ---------------------------------------------------------------------------
// 8.8 — Full email (header + body with image + button + footer)
// ---------------------------------------------------------------------------

describe('compile — full email template', () => {
  const FULL_EMAIL = `
<mc>
  <mc-head>
    <mc-preview>Your order has been confirmed</mc-preview>
  </mc-head>
  <mc-body class="bg-gray-100">
    <mc-section class="bg-white">
    <mc-column>
      <mc-image src="https://example.com/logo.png" alt="Logo" width="200px" />
    </mc-column>
  </mc-section>
  <mc-section class="bg-white">
    <mc-column>
      <mc-text class="text-xl font-bold">Order Confirmed</mc-text>
      <mc-text>Thank you for your purchase.</mc-text>
      <mc-button href="https://example.com/order">View Order</mc-button>
    </mc-column>
  </mc-section>
  <mc-section>
    <mc-column>
      <mc-divider />
      <mc-text class="text-sm text-center">© 2025 Example Inc.</mc-text>
    </mc-column>
  </mc-section>
  </mc-body>
</mc>`;

  const CLASS_MODE = { templateStyle: 'class' as const };

  it('compiles successfully with zero errors', () => {
    const result = compile(FULL_EMAIL, CLASS_MODE);
    expect(result.errors).toHaveLength(0);
    expect(result.html).not.toBeNull();
  });

  it('contains preview text', () => {
    const result = expectSuccess(FULL_EMAIL, CLASS_MODE);
    expect(result.html).toContain('Your order has been confirmed');
  });

  it('contains image', () => {
    const result = expectSuccess(FULL_EMAIL, CLASS_MODE);
    expect(result.html).toContain('src="https://example.com/logo.png"');
    expect(result.html).toContain('alt="Logo"');
  });

  it('contains button with VML and anchor', () => {
    const result = expectSuccess(FULL_EMAIL, CLASS_MODE);
    expect(result.html).toContain('View Order');
    expect(result.html).toContain('href="https://example.com/order"');
    // VML for Outlook
    expect(result.html).toContain('v:roundrect');
    // Non-Outlook anchor
    expect(result.html).toContain('<!--[if !mso]><!-->');
  });

  it('contains divider', () => {
    const result = expectSuccess(FULL_EMAIL, CLASS_MODE);
    expect(result.html).toContain('border-top:');
  });

  it('contains footer text', () => {
    const result = expectSuccess(FULL_EMAIL, CLASS_MODE);
    expect(result.html).toContain('© 2025 Example Inc.');
  });

  it('applies body background color', () => {
    const result = expectSuccess(FULL_EMAIL, CLASS_MODE);
    expect(result.html).toContain('background-color');
  });

  it('has valid document structure', () => {
    const result = expectSuccess(FULL_EMAIL, CLASS_MODE);
    const html = result.html as string;

    // Proper nesting order
    const doctypeIdx = html.indexOf('<!DOCTYPE html>');
    const htmlOpenIdx = html.indexOf('<html');
    const headOpenIdx = html.indexOf('<head>');
    const headCloseIdx = html.indexOf('</head>');
    const bodyOpenIdx = html.indexOf('<body');
    const bodyCloseIdx = html.indexOf('</body>');
    const htmlCloseIdx = html.indexOf('</html>');

    expect(doctypeIdx).toBeLessThan(htmlOpenIdx);
    expect(htmlOpenIdx).toBeLessThan(headOpenIdx);
    expect(headOpenIdx).toBeLessThan(headCloseIdx);
    expect(headCloseIdx).toBeLessThan(bodyOpenIdx);
    expect(bodyOpenIdx).toBeLessThan(bodyCloseIdx);
    expect(bodyCloseIdx).toBeLessThan(htmlCloseIdx);
  });

  it('reports stats with multiple components', () => {
    const result = expectSuccess(FULL_EMAIL, CLASS_MODE);
    // body + head + preview + 3 sections + 4 columns + 3 text + 1 image + 1 button + 1 divider = 14+
    expect(result.stats.components).toBeGreaterThanOrEqual(10);
  });
});

// ---------------------------------------------------------------------------
// Error cases
// ---------------------------------------------------------------------------

describe('compile — error handling', () => {
  it('returns errors for invalid markup (unclosed tag)', () => {
    const result = compile(`<mc>
  <mc-body><mc-section>');
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.html).toBeNull();
  });

  it('returns errors for invalid nesting', () => {
    const result = compile('<mc-body><mc-text>Bad</mc-text></mc-body>
</mc>`);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.html).toBeNull();
  });

  it('returns errors for unknown components', () => {
    // mc-footer is unknown — validator warns, compiler throws
    const result = compile(`<mc>
  <mc-body><mc-section><mc-column><mc-footer /></mc-column></mc-section></mc-body>
</mc>`);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.html).toBeNull();
  });

  it('produces partial output with stats on validation error', () => {
    const result = compile(`<mc>
  <mc-body><mc-text>Bad nesting</mc-text></mc-body>
</mc>`);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.partial).toBe(true);
    expect(result.html).not.toBeNull();
    expect(result.stats.compileTime).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Config overrides
// ---------------------------------------------------------------------------

describe('compile — config overrides', () => {
  it('respects custom width', () => {
    const source = `<mc>
  <mc-body><mc-section><mc-column><mc-text>Wide</mc-text></mc-column></mc-section></mc-body>
</mc>`;
    const result = compile(source, { config: { width: 800 } });
    expect(result.html).toContain('max-width:800px');
  });

  it('respects minify option', () => {
    const source = `<mc>
  <mc-body><mc-section><mc-column><mc-text>Min</mc-text></mc-column></mc-section></mc-body>
</mc>`;
    const normal = compile(source);
    const minified = compile(source, { config: { output: { minify: true, comments: false } } });

    // Minified should be same or smaller than the default (pretty) output.
    expect((minified.html as string).length).toBeLessThanOrEqual((normal.html as string).length);
  });
});

// ---------------------------------------------------------------------------
// Spacer and raw components
// ---------------------------------------------------------------------------

describe('compile — additional components', () => {
  it('compiles spacer component', () => {
    const source = `<mc>
  <mc-body><mc-section><mc-column><mc-spacer height="32px" /></mc-column></mc-section></mc-body>
</mc>`;
    const result = expectSuccess(source, { templateStyle: 'attribute' });
    expect(result.html).toContain('height:32px');
  });

  it('compiles raw component', () => {
    const source = `<mc>
  <mc-body><mc-section><mc-column><mc-raw><custom-html>Pass through</custom-html></mc-raw></mc-column></mc-section></mc-body>
</mc>`;
    const result = expectSuccess(source);
    expect(result.html).toContain('<custom-html>Pass through</custom-html>');
  });
});

describe('compile — mc-table', () => {
  it('compiles a minimal mc-table inside a full document tree', () => {
    const source = `<mc>
  <mc-body><mc-section><mc-column>
    <mc-table>
      <tr><td>Product</td><td>Price</td></tr>
    </mc-table>
  </mc-column></mc-section></mc-body>
</mc>`;
    const result = expectSuccess(source);
    expect(result.html).toContain('<table');
    expect(result.html).toContain('cellpadding="0"');
    expect(result.html).toContain('cellspacing="0"');
    expect(result.html).toContain('width="100%"');
    expect(result.html).toContain('role="table"');
    expect(result.html).toContain('Product');
    expect(result.html).toContain('Price');
    expect(result.html).toContain('</table>');
  });

  it('does not add role="presentation" to the data table', () => {
    const source = `<mc>
  <mc-body><mc-section><mc-column>
    <mc-table>
      <tr><th scope="col">Item</th><th scope="col">Total</th></tr>
      <tr><td>Widget</td><td>$9.99</td></tr>
    </mc-table>
  </mc-column></mc-section></mc-body>
</mc>`;
    const result = expectSuccess(source);
    // The HTML contains multiple <table> elements (layout tables with role="presentation"
    // from section/column compilers). We need to find the data table specifically.
    expect(result.html).not.toBeNull();
    const dataTableMatch = (result.html ?? '').match(/<table[^>]*role="table"[^>]*>/);
    expect(dataTableMatch).not.toBeNull();
    expect(dataTableMatch?.[0] ?? '').not.toContain('role="presentation"');
  });

  it('compiles mc-table with Tailwind classes resolved to inline styles', () => {
    const source = `<mc>
  <mc-body><mc-section><mc-column>
    <mc-table class="text-sm">
      <tr>
        <td class="text-gray-500 py-2">Label</td>
        <td class="text-right font-bold">Value</td>
      </tr>
    </mc-table>
  </mc-column></mc-section></mc-body>
</mc>`;
    const result = expectSuccess(source, { templateStyle: 'class' });
    expect(result.html).toContain('font-size:');
    expect(result.html).toContain('text-align:right');
  });

  it('compiles mc-table with th headers preserving scope', () => {
    const source = `<mc>
  <mc-body><mc-section><mc-column>
    <mc-table>
      <thead>
        <tr>
          <th scope="col">Product</th>
          <th scope="col">Price</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Widget</td><td>$9.99</td></tr>
      </tbody>
    </mc-table>
  </mc-column></mc-section></mc-body>
</mc>`;
    const result = expectSuccess(source);
    expect(result.html).toContain('<thead>');
    expect(result.html).toContain('<tbody>');
    expect(result.html).toContain('<th');
    expect(result.html).toContain('scope="col"');
  });
});
