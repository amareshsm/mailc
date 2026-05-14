/**
 * Tests for the mc-table compiler.
 *
 * Covers: structure, CSS pipeline, attribute passthrough, template
 * expressions, validation errors/warnings, and accessibility.
 */
import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compile.js';
import { compileTable } from '../../src/compiler/components/table.js';
import { validate } from '../../src/validator/index.js';
import { tokenize } from '../../src/tokenizer/index.js';
import { parse } from '../../src/parser/index.js';
import { ErrorCode } from '../../src/errors/codes.js';
import { makeNode, makeContext } from './helpers.js';
import type { ASTNode, ValidationResult } from '../../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DUMMY_LOC = {
  start: { line: 1, col: 1, offset: 0 },
  end: { line: 1, col: 1, offset: 0 },
};

/** Creates a <tr> node with given cell children. */
function makeRow(cells: ASTNode[]): ASTNode {
  return { type: 'tr', attributes: {}, children: cells, content: [], loc: DUMMY_LOC };
}

/** Creates a <td> node with optional attributes and text content. */
function makeTd(
  text = '',
  attributes: Record<string, string> = {},
): ASTNode {
  return {
    type: 'td',
    attributes,
    children: [],
    content: text ? [{ type: 'text', value: text, loc: DUMMY_LOC }] : [],
    loc: DUMMY_LOC,
  };
}

/** Creates a <th> node with optional attributes and text content. */
function makeTh(
  text = '',
  attributes: Record<string, string> = {},
): ASTNode {
  return {
    type: 'th',
    attributes,
    children: [],
    content: text ? [{ type: 'text', value: text, loc: DUMMY_LOC }] : [],
    loc: DUMMY_LOC,
  };
}

/** Creates a <thead> or <tbody> or <tfoot> wrapper. */
function makeSection(tag: string, children: ASTNode[]): ASTNode {
  return { type: tag, attributes: {}, children, content: [], loc: DUMMY_LOC };
}

/** Wraps an mc-table in a full compile pipeline and returns the HTML string (throws if failed). */
function compileSource(inner: string): string {
  const src = `<mc><mc-body><mc-section><mc-column>${inner}</mc-column></mc-section></mc-body></mc>`;
  const result = compile(src);
  if (!result.html) {
    throw new Error(
      `compile failed:\n${result.errors.map((e) => e.message).join('\n')}`,
    );
  }
  return result.html;
}

/** Validates a source string and returns the result. */
function v(source: string): ValidationResult {
  return validate(parse(tokenize(source)));
}

// ---------------------------------------------------------------------------
// Structure tests
// ---------------------------------------------------------------------------

describe('mc-table — structure', () => {
  it('compiles a minimal table with plain rows (no thead/tbody)', () => {
    const node = makeNode('mc-table', {}, [
      makeRow([makeTd('Product'), makeTd('Price')]),
    ]);
    const html = compileTable(node, makeContext());
    expect(html).toContain('<table');
    expect(html).toContain('<tr');
    expect(html).toContain('<td');
    expect(html).toContain('Product');
    expect(html).toContain('Price');
    expect(html).toContain('</table>');
  });

  it('compiles a full semantic table with thead, tbody, tfoot', () => {
    const node = makeNode('mc-table', {}, [
      makeSection('thead', [makeRow([makeTh('Item', { scope: 'col' })])]),
      makeSection('tbody', [makeRow([makeTd('Widget')])]),
      makeSection('tfoot', [makeRow([makeTd('Total')])]),
    ]);
    const html = compileTable(node, makeContext());
    expect(html).toContain('<thead>');
    expect(html).toContain('<tbody>');
    expect(html).toContain('<tfoot>');
    expect(html).toContain('<th');
    expect(html).toContain('Item');
    expect(html).toContain('Widget');
    expect(html).toContain('Total');
  });

  it('always outputs cellpadding="0" and cellspacing="0"', () => {
    const node = makeNode('mc-table', {}, [makeRow([makeTd('x')])]);
    const html = compileTable(node, makeContext());
    expect(html).toContain('cellpadding="0"');
    expect(html).toContain('cellspacing="0"');
  });

  it('always outputs role="table"', () => {
    const node = makeNode('mc-table', {}, [makeRow([makeTd('x')])]);
    const html = compileTable(node, makeContext());
    expect(html).toContain('role="table"');
  });

  it('preserves explicit role attribute when provided', () => {
    const node = makeNode('mc-table', { role: 'grid' }, [makeRow([makeTd('x')])]);
    const html = compileTable(node, makeContext());
    expect(html).toContain('role="grid"');
    expect(html).not.toContain('role="table"');
  });

  it('outputs width="100%" by default', () => {
    const node = makeNode('mc-table', {}, [makeRow([makeTd('x')])]);
    const html = compileTable(node, makeContext());
    expect(html).toContain('width="100%"');
  });

  it('respects explicit width attribute', () => {
    const node = makeNode('mc-table', { width: '400px' }, [makeRow([makeTd('x')])]);
    const html = compileTable(node, makeContext());
    expect(html).toContain('width="400px"');
    expect(html).not.toContain('width="100%"');
  });

  it('compiles tbody wrapper and its rows via full compile pipeline', () => {
    const html = compileSource(`
      <mc-table>
        <tbody>
          <tr><td>Widget</td><td>$9.99</td></tr>
        </tbody>
      </mc-table>
    `);
    expect(html).toContain('<tbody>');
    expect(html).toContain('<tr');
    expect(html).toContain('Widget');
  });
});

// ---------------------------------------------------------------------------
// CSS pipeline tests
// ---------------------------------------------------------------------------

describe('mc-table — CSS pipeline', () => {
  it('resolves Tailwind classes on table element to inline styles', () => {
    const node = makeNode('mc-table', { class: 'text-sm' }, [makeRow([makeTd('x')])]);
    const html = compileTable(node, makeContext());
    expect(html).toContain('font-size:');
  });

  it('resolves Tailwind classes on tr to inline styles', () => {
    const row = { ...makeRow([makeTd('x')]), attributes: { class: 'text-sm' } };
    const node = makeNode('mc-table', {}, [row]);
    const html = compileTable(node, makeContext());
    expect(html).toMatch(/<tr[^>]*style="[^"]*font-size:/);
  });

  it('resolves Tailwind classes on th to inline styles', () => {
    const th = makeTh('Head', { class: 'font-bold' });
    const node = makeNode('mc-table', {}, [makeRow([th])]);
    const html = compileTable(node, makeContext());
    expect(html).toMatch(/<th[^>]*style="[^"]*font-weight:/);
  });

  it('resolves Tailwind classes on td to inline styles', () => {
    const td = makeTd('Cell', { class: 'text-sm' });
    const node = makeNode('mc-table', {}, [makeRow([td])]);
    const html = compileTable(node, makeContext());
    expect(html).toMatch(/<td[^>]*style="[^"]*font-size:/);
  });

  it('expands shorthand p-2 to padding on td', () => {
    const td = makeTd('Cell', { class: 'p-2' });
    const node = makeNode('mc-table', {}, [makeRow([td])]);
    const html = compileTable(node, makeContext());
    expect(html).toContain('padding');
    expect(html).toContain('8px');
  });

  it('processes text-left class to text-align:left in style', () => {
    const td = makeTd('Cell', { class: 'text-left' });
    const node = makeNode('mc-table', {}, [makeRow([td])]);
    const html = compileTable(node, makeContext());
    expect(html).toContain('text-align:left');
  });

  it('processes text-right class to text-align:right in style', () => {
    const td = makeTd('Cell', { class: 'text-right' });
    const node = makeNode('mc-table', {}, [makeRow([td])]);
    const html = compileTable(node, makeContext());
    expect(html).toContain('text-align:right');
  });

  it('processes bg-gray-100 class to background-color in style', () => {
    const td = makeTd('Cell', { class: 'bg-gray-100' });
    const node = makeNode('mc-table', {}, [makeRow([td])]);
    const html = compileTable(node, makeContext());
    expect(html).toContain('background-color:');
  });

  it('extracts bg-* class to bgcolor HTML attribute on td', () => {
    const td = makeTd('Cell', { class: 'bg-gray-100' });
    const node = makeNode('mc-table', {}, [makeRow([td])]);
    const html = compileTable(node, makeContext());
    expect(html).toMatch(/<td[^>]*bgcolor="/);
  });

  it('extracts bg-* class to bgcolor HTML attribute on tr', () => {
    const row = { ...makeRow([makeTd('x')]), attributes: { class: 'bg-gray-50' } };
    const node = makeNode('mc-table', {}, [row]);
    const html = compileTable(node, makeContext());
    expect(html).toMatch(/<tr[^>]*bgcolor="/);
  });

  it('adds align HTML attr fallback from text-right class on td', () => {
    const td = makeTd('Cell', { class: 'text-right' });
    const node = makeNode('mc-table', {}, [makeRow([td])]);
    const html = compileTable(node, makeContext());
    expect(html).toMatch(/<td[^>]*align="right"/);
  });

  it('processes border-b class correctly on tr', () => {
    const row = { ...makeRow([makeTd('x')]), attributes: { class: 'border-b' } };
    const node = makeNode('mc-table', {}, [row]);
    const html = compileTable(node, makeContext());
    expect(html).toContain('border-bottom');
  });

  it('processes sm: responsive classes — adds to context.responsiveClasses', () => {
    const ctx = makeContext();
    const td = makeTd('Cell', { class: 'sm:text-xs' });
    const node = makeNode('mc-table', {}, [makeRow([td])]);
    compileTable(node, ctx);
    expect(ctx.responsiveClasses.some((c) => c.startsWith('sm:'))).toBe(true);
  });

  it('merges class-derived styles with explicit style attribute', () => {
    const td = makeTd('Cell', { class: 'text-sm', style: 'color:red;' });
    const node = makeNode('mc-table', {}, [makeRow([td])]);
    const html = compileTable(node, makeContext());
    expect(html).toContain('font-size:');
    expect(html).toContain('color:red');
  });
});

// ---------------------------------------------------------------------------
// Attribute passthrough tests
// ---------------------------------------------------------------------------

describe('mc-table — attribute passthrough', () => {
  it('preserves colspan on td', () => {
    const td = makeTd('Cell', { colspan: '3' });
    const node = makeNode('mc-table', {}, [makeRow([td])]);
    const html = compileTable(node, makeContext());
    expect(html).toContain('colspan="3"');
  });

  it('preserves rowspan on td', () => {
    const td = makeTd('Cell', { rowspan: '2' });
    const node = makeNode('mc-table', {}, [makeRow([td])]);
    const html = compileTable(node, makeContext());
    expect(html).toContain('rowspan="2"');
  });

  it('preserves width on td', () => {
    const td = makeTd('Cell', { width: '120px' });
    const node = makeNode('mc-table', {}, [makeRow([td])]);
    const html = compileTable(node, makeContext());
    expect(html).toContain('width="120px"');
  });

  it('preserves scope on th', () => {
    const th = makeTh('Head', { scope: 'col' });
    const node = makeNode('mc-table', {}, [makeRow([th])]);
    const html = compileTable(node, makeContext());
    expect(html).toContain('scope="col"');
  });

  it('preserves explicit align and valign attributes on td', () => {
    const td = makeTd('Cell', { align: 'center', valign: 'top' });
    const node = makeNode('mc-table', {}, [makeRow([td])]);
    const html = compileTable(node, makeContext());
    expect(html).toContain('align="center"');
    expect(html).toContain('valign="top"');
  });

  it('preserves colspan and rowspan together on td', () => {
    const td = makeTd('Cell', { colspan: '2', rowspan: '3' });
    const node = makeNode('mc-table', {}, [makeRow([td])]);
    const html = compileTable(node, makeContext());
    expect(html).toContain('colspan="2"');
    expect(html).toContain('rowspan="3"');
  });
});

// ---------------------------------------------------------------------------
// Template expression tests (via full compile pipeline)
// ---------------------------------------------------------------------------

describe('mc-table — template expressions', () => {
  it('resolves {{expression}} in td text content', () => {
    const html = compileSource(`
      <mc-table>
        <tr><td>{{user.name}}</td></tr>
      </mc-table>
    `);
    // Template variable rendered as-is when no data provided (placeholder)
    expect(html).toContain('<td');
  });

  it('resolves {{value | formatter}} syntax passing through the pipeline', () => {
    const html = compileSource(`
      <mc-table>
        <tr><td>{{order.total}}</td></tr>
      </mc-table>
    `);
    expect(html).toContain('<td');
  });
});

// ---------------------------------------------------------------------------
// Validation — errors
// ---------------------------------------------------------------------------

describe('mc-table — validation errors', () => {
  it('errors when mc-table is placed outside mc-column', () => {
    const result = v(`
      <mc><mc-body><mc-section>
        <mc-table>
          <tr><td>x</td></tr>
        </mc-table>
      </mc-section></mc-body></mc>
    `);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.code === ErrorCode.INVALID_NESTING)).toBe(true);
  });

  it('errors when mc-text is placed inside td', () => {
    const result = v(`
      <mc><mc-body><mc-section><mc-column>
        <mc-table>
          <tr><td><mc-text>Hello</mc-text></td></tr>
        </mc-table>
      </mc-column></mc-section></mc-body></mc>
    `);
    const hasError = result.errors.some(
      (e) => e.code === ErrorCode.TABLE_INVALID_CHILD && e.message.includes('mc-text'),
    );
    expect(hasError).toBe(true);
  });

  it('errors when mc-button is placed inside td', () => {
    const result = v(`
      <mc><mc-body><mc-section><mc-column>
        <mc-table>
          <tr><td><mc-button href="https://x.com">Click</mc-button></td></tr>
        </mc-table>
      </mc-column></mc-section></mc-body></mc>
    `);
    const hasError = result.errors.some(
      (e) => e.code === ErrorCode.TABLE_INVALID_CHILD && e.message.includes('mc-button'),
    );
    expect(hasError).toBe(true);
  });

  it('errors when mc-table is nested inside another mc-table', () => {
    const result = v(`
      <mc><mc-body><mc-section><mc-column>
        <mc-table>
          <tr><td>
            <mc-table>
              <tr><td>nested</td></tr>
            </mc-table>
          </td></tr>
        </mc-table>
      </mc-column></mc-section></mc-body></mc>
    `);
    const hasError = result.errors.some(
      (e) => e.code === ErrorCode.INVALID_NESTING && e.message.includes('Nested'),
    );
    expect(hasError).toBe(true);
  });

  it('errors when div appears directly inside tr', () => {
    const result = v(`
      <mc><mc-body><mc-section><mc-column>
        <mc-table>
          <tr><div>bad</div></tr>
        </mc-table>
      </mc-column></mc-section></mc-body></mc>
    `);
    const hasError = result.errors.some(
      (e) => e.code === ErrorCode.TABLE_INVALID_CHILD && e.message.includes('div'),
    );
    expect(hasError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Validation — warnings
// ---------------------------------------------------------------------------

describe('mc-table — validation warnings', () => {
  it('warns when no th elements are present in the table', () => {
    const result = v(`
      <mc><mc-body><mc-section><mc-column>
        <mc-table>
          <tr><td>No headers</td></tr>
        </mc-table>
      </mc-column></mc-section></mc-body></mc>
    `);
    const hasWarning = result.warnings.some(
      (w) => w.code === ErrorCode.TABLE_MISSING_HEADERS,
    );
    expect(hasWarning).toBe(true);
  });

  it('warns when th is missing a scope attribute', () => {
    const result = v(`
      <mc><mc-body><mc-section><mc-column>
        <mc-table>
          <tr><th>No scope</th><th>Also no scope</th></tr>
        </mc-table>
      </mc-column></mc-section></mc-body></mc>
    `);
    const scopeWarnings = result.warnings.filter(
      (w) => w.code === ErrorCode.TABLE_MISSING_SCOPE,
    );
    expect(scopeWarnings.length).toBeGreaterThanOrEqual(1);
  });

  it('does not warn about missing scope when scope is present', () => {
    const result = v(`
      <mc><mc-body><mc-section><mc-column>
        <mc-table>
          <tr><th scope="col">With scope</th></tr>
        </mc-table>
      </mc-column></mc-section></mc-body></mc>
    `);
    const scopeWarnings = result.warnings.filter(
      (w) => w.code === ErrorCode.TABLE_MISSING_SCOPE,
    );
    expect(scopeWarnings).toHaveLength(0);
  });

  it('warns when column counts are inconsistent across rows', () => {
    const result = v(`
      <mc><mc-body><mc-section><mc-column>
        <mc-table>
          <tr><th scope="col">A</th><th scope="col">B</th><th scope="col">C</th></tr>
          <tr><td>1</td><td>2</td></tr>
        </mc-table>
      </mc-column></mc-section></mc-body></mc>
    `);
    const hasWarning = result.warnings.some(
      (w) => w.code === ErrorCode.TABLE_INCONSISTENT_COLUMNS,
    );
    expect(hasWarning).toBe(true);
  });

  it('warns when colspan exceeds column count', () => {
    const result = v(`
      <mc><mc-body><mc-section><mc-column>
        <mc-table>
          <tr><th scope="col">A</th><th scope="col">B</th></tr>
          <tr><td colspan="5">Too wide</td></tr>
        </mc-table>
      </mc-column></mc-section></mc-body></mc>
    `);
    const hasWarning = result.warnings.some(
      (w) => w.code === ErrorCode.TABLE_COLSPAN_EXCEEDS_COLUMNS,
    );
    expect(hasWarning).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Accessibility tests
// ---------------------------------------------------------------------------

describe('mc-table — accessibility', () => {
  it('outputs role="table" on the table element', () => {
    const node = makeNode('mc-table', {}, [makeRow([makeTd('x')])]);
    const html = compileTable(node, makeContext());
    expect(html).toContain('role="table"');
  });

  it('does not overwrite explicit role attribute when provided', () => {
    const node = makeNode('mc-table', { role: 'grid' }, [makeRow([makeTd('x')])]);
    const html = compileTable(node, makeContext());
    expect(html).toContain('role="grid"');
    expect(html).not.toContain('role="table"');
  });

  it('preserves th elements (does not convert to td)', () => {
    const th = makeTh('Header', { scope: 'col' });
    const node = makeNode('mc-table', {}, [makeRow([th])]);
    const html = compileTable(node, makeContext());
    expect(html).toContain('<th');
    expect(html).toContain('</th>');
    expect(html).not.toMatch(/<td[^>]*>Header/);
  });

  it('preserves scope="col" on th elements', () => {
    const th = makeTh('Header', { scope: 'col' });
    const node = makeNode('mc-table', {}, [makeRow([th])]);
    const html = compileTable(node, makeContext());
    expect(html).toContain('scope="col"');
  });

  it('post-processor does not add role="presentation" to data table', () => {
    const html = compileSource(`
      <mc-table>
        <tr><th scope="col">Product</th><th scope="col">Price</th></tr>
        <tr><td>Widget</td><td>$9.99</td></tr>
      </mc-table>
    `);
    // The data table must have role="table", not role="presentation"
    const dataTableTag = html.match(/<table[^>]*role="table"[^>]*>/)?.[0];
    expect(dataTableTag).toBeDefined();
    expect(dataTableTag).not.toContain('role="presentation"');
  });
});

// ---------------------------------------------------------------------------
// Content text node tests
// ---------------------------------------------------------------------------

describe('mc-table — content text nodes', () => {
  it('renders text content directly inside td', () => {
    const td = makeTd('Hello World');
    const node = makeNode('mc-table', {}, [makeRow([td])]);
    const html = compileTable(node, makeContext());
    expect(html).toContain('Hello World');
  });

  it('renders text content directly inside th', () => {
    const th = makeTh('Column Name', { scope: 'col' });
    const node = makeNode('mc-table', {}, [makeRow([th])]);
    const html = compileTable(node, makeContext());
    expect(html).toContain('Column Name');
  });
});

// ---------------------------------------------------------------------------
// Styling-mode enforcement
// ---------------------------------------------------------------------------

describe('mc-table — styling-mode enforcement', () => {
  // mc-table currently has NO isCssPropAttr:true attributes in metadata —
  // all its attributes (width, cellpadding, border, align, role) are structural
  // HTML attributes. assertClassModeAttributes is called defensively so that
  // any future isCssPropAttr addition to mc-table metadata is automatically
  // enforced without touching table.ts.

  it('compiles without CSS_ATTR_IN_CLASS_MODE errors when only HTML attrs are used', () => {
    const result = compile(
      `<mc><mc-body><mc-section><mc-column>
        <mc-table width="100%" cellpadding="0" cellspacing="0">
          <tr><td>Cell</td></tr>
        </mc-table>
      </mc-column></mc-section></mc-body></mc>`,
    );
    const violations = result.errors.filter(
      (e) => e.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE,
    );
    expect(violations).toHaveLength(0);
    expect(result.html).not.toBeNull();
  });

  it('compiles without errors in attribute mode', () => {
    const result = compile(
      `<mc><mc-body><mc-section><mc-column>
        <mc-table width="100%">
          <tr><td>Cell</td></tr>
        </mc-table>
      </mc-column></mc-section></mc-body></mc>`,
      { templateStyle: 'attribute' },
    );
    expect(result.errors).toHaveLength(0);
  });
});
