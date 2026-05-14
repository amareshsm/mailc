import { describe, it, expect } from 'vitest';
import { tokenize } from '../../src/tokenizer/index.js';
import { parse } from '../../src/parser/index.js';
import { validate } from '../../src/validator/index.js';
import { ErrorCode } from '../../src/errors/codes.js';
import type { ValidationResult } from '../../src/types.js';

/** Helper: tokenize → parse → validate. */
function v(source: string): ValidationResult {
  return validate(parse(tokenize(source)));
}

// ---------------------------------------------------------------------------
// Valid templates (no errors)
// ---------------------------------------------------------------------------

describe('validate — valid templates', () => {
  it('accepts a well-formed email structure', () => {
    const result = v(`
      <mc>
      <mc-head>
          <mc-attributes>
            <mc-all font-family="Arial" />
          </mc-attributes>
        </mc-head>
      <mc-body>
        <mc-section>
          <mc-column>
            <mc-text>Hello</mc-text>
            <mc-image src="x.png" alt="X" />
            <mc-button href="https://x.com">Click</mc-button>
            <mc-divider />
            <mc-spacer height="20px" />
          </mc-column>
        </mc-section>
      </mc-body>
    </mc>
    `);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts logic wrappers around components', () => {
    const result = v(`
      <mc>
      <mc-body>
        <mc-section>
          <mc-if condition="showCol">
            <mc-column>
              <mc-text>Hi</mc-text>
            </mc-column>
          </mc-if>
        </mc-section>
      </mc-body>
    </mc>
    `);
    expect(result.isValid).toBe(true);
  });

  it('accepts mc-each wrapping components', () => {
    const result = v(`
      <mc>
      <mc-body>
        <mc-section>
          <mc-each items="products" as="product">
            <mc-column>
              <mc-text>{{product.name}}</mc-text>
            </mc-column>
          </mc-each>
        </mc-section>
      </mc-body>
    </mc>
    `);
    expect(result.isValid).toBe(true);
  });

  it('accepts mc-image with alt=""', () => {
    const result = v(`
      <mc>
      <mc-body>
        <mc-section>
          <mc-column>
            <mc-image src="x.png" alt="" />
          </mc-column>
        </mc-section>
      </mc-body>
    </mc>
    `);
    expect(result.isValid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Nesting errors
// ---------------------------------------------------------------------------

describe('validate — nesting errors', () => {
  it('errors when mc-text is not inside mc-column', () => {
    const result = v(`
      <mc>
      <mc-body>
        <mc-section>
          <mc-text>Wrong</mc-text>
        </mc-section>
      </mc-body>
    </mc>
    `);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.code === ErrorCode.INVALID_NESTING)).toBe(true);
  });

  it('errors when mc-column is not inside mc-section', () => {
    const result = v(`
      <mc>
      <mc-body>
        <mc-column>
          <mc-text>Wrong</mc-text>
        </mc-column>
      </mc-body>
    </mc>
    `);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.code === ErrorCode.INVALID_NESTING)).toBe(true);
  });

  it('errors when mc-section is not inside mc-body', () => {
    const result = v('<mc-section><mc-column></mc-column></mc-section>');
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.code === ErrorCode.INVALID_NESTING)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Required attributes
// ---------------------------------------------------------------------------

describe('validate — required attributes', () => {
  it('errors when mc-image is missing src', () => {
    const result = v(`
      <mc>
      <mc-body><mc-section><mc-column>
        <mc-image alt="X" />
      </mc-column></mc-section></mc-body>
    </mc>
    `);
    expect(result.errors.some(e =>
      e.code === ErrorCode.MISSING_ATTRIBUTE && e.message.includes('src'),
    )).toBe(true);
  });

  it('does not error when mc-image is missing alt (handled by compiler)', () => {
    const result = v(`
      <mc>
      <mc-body><mc-section><mc-column>
        <mc-image src="x.png" />
      </mc-column></mc-section></mc-body>
    </mc>
    `);
    expect(result.errors.some(e =>
      e.code === ErrorCode.MISSING_ATTRIBUTE && e.message.includes('alt'),
    )).toBe(false);
  });

  it('errors when mc-button is missing href', () => {
    const result = v(`
      <mc>
      <mc-body><mc-section><mc-column>
        <mc-button>Click</mc-button>
      </mc-column></mc-section></mc-body>
    </mc>
    `);
    expect(result.errors.some(e =>
      e.code === ErrorCode.MISSING_ATTRIBUTE && e.message.includes('href'),
    )).toBe(true);
  });

  it('errors when mc-if is missing condition', () => {
    const result = v(`
      <mc>
      <mc-body>
        <mc-if><mc-section><mc-column></mc-column></mc-section></mc-if>
      </mc-body>
    </mc>
    `);
    expect(result.errors.some(e =>
      e.code === ErrorCode.MISSING_ATTRIBUTE && e.message.includes('condition'),
    )).toBe(true);
  });

  it('errors when mc-each is missing items and as', () => {
    const result = v(`
      <mc>
      <mc-body>
        <mc-each><mc-section><mc-column></mc-column></mc-section></mc-each>
      </mc-body>
    </mc>
    `);
    const missingAttrs = result.errors.filter(e => e.code === ErrorCode.MISSING_ATTRIBUTE);
    expect(missingAttrs.some(e => e.message.includes('items'))).toBe(true);
    expect(missingAttrs.some(e => e.message.includes('as'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Logic ordering
// ---------------------------------------------------------------------------

describe('validate — logic ordering', () => {
  it('errors when mc-else-if does not follow mc-if', () => {
    const result = v(`
      <mc>
      <mc-body>
        <mc-else-if condition="x">
          <mc-section><mc-column></mc-column></mc-section>
        </mc-else-if>
      </mc-body>
    </mc>
    `);
    expect(result.errors.some(e => e.code === ErrorCode.INVALID_LOGIC_ORDER)).toBe(true);
  });

  it('errors when mc-else does not follow mc-if or mc-else-if', () => {
    const result = v(`
      <mc>
      <mc-body>
        <mc-else>
          <mc-section><mc-column></mc-column></mc-section>
        </mc-else>
      </mc-body>
    </mc>
    `);
    expect(result.errors.some(e => e.code === ErrorCode.INVALID_LOGIC_ORDER)).toBe(true);
  });

  it('accepts mc-if → mc-else-if → mc-else chain', () => {
    const result = v(`
      <mc>
      <mc-body>
        <mc-if condition="a">
          <mc-section><mc-column><mc-text>A</mc-text></mc-column></mc-section>
        </mc-if>
        <mc-else-if condition="b">
          <mc-section><mc-column><mc-text>B</mc-text></mc-column></mc-section>
        </mc-else-if>
        <mc-else>
          <mc-section><mc-column><mc-text>C</mc-text></mc-column></mc-section>
        </mc-else>
      </mc-body>
    </mc>
    `);
    const logicErrors = result.errors.filter(e => e.code === ErrorCode.INVALID_LOGIC_ORDER);
    expect(logicErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// mc-head placement
// ---------------------------------------------------------------------------

describe('validate — mc-head placement', () => {
  it('errors when mc-head is inside mc-body (wrong parent)', () => {
    const result = v(`
      <mc>
        <mc-body>
          <mc-head></mc-head>
          <mc-section><mc-column></mc-column></mc-section>
        </mc-body>
      </mc>
    `);
    expect(result.errors.some(e => e.code === ErrorCode.INVALID_NESTING)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Column count — no upper bound (matches MJML's behaviour). Dense layouts are
// a soft style concern, not a compile error.
// ---------------------------------------------------------------------------

describe('validate — column count', () => {
  it('accepts mc-section with 5 columns (no hard cap)', () => {
    const result = v(`
      <mc>
      <mc-body>
        <mc-section>
          <mc-column></mc-column>
          <mc-column></mc-column>
          <mc-column></mc-column>
          <mc-column></mc-column>
          <mc-column></mc-column>
        </mc-section>
      </mc-body>
    </mc>
    `);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts mc-section with 8 columns (no hard cap)', () => {
    const result = v(`
      <mc>
      <mc-body>
        <mc-section>
          <mc-column></mc-column><mc-column></mc-column><mc-column></mc-column>
          <mc-column></mc-column><mc-column></mc-column><mc-column></mc-column>
          <mc-column></mc-column><mc-column></mc-column>
        </mc-section>
      </mc-body>
    </mc>
    `);
    expect(result.errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// mc-attributes children
// ---------------------------------------------------------------------------

describe('validate — mc-attributes children', () => {
  it('errors on invalid child inside mc-attributes', () => {
    const result = v(`
      <mc>
      <mc-head>
          <mc-attributes>
            <mc-body></mc-body>
          </mc-attributes>
        </mc-head>
      <mc-body></mc-body>
    </mc>
    `);
    expect(result.errors.some(e => e.code === ErrorCode.INVALID_ATTRIBUTES_CHILD)).toBe(true);
  });

  it('accepts valid mc-attributes children', () => {
    const result = v(`
      <mc>
      <mc-head>
          <mc-attributes>
            <mc-all font-family="Arial" />
            <mc-text font-size="14px" />
            <mc-button background-color="#e85d3a" />
          </mc-attributes>
        </mc-head>
      <mc-body></mc-body>
    </mc>
    `);
    const childErrors = result.errors.filter(e => e.code === ErrorCode.INVALID_ATTRIBUTES_CHILD);
    expect(childErrors).toHaveLength(0);
  });

  // Phase 3: mc-class validator tests
  it('Phase 3: mc-class is accepted as a valid child of mc-attributes', () => {
    const result = v(`
      <mc>
        <mc-head>
          <mc-attributes>
            <mc-class name="cta" background-color="#e85d3a" color="#ffffff" />
          </mc-attributes>
        </mc-head>
        <mc-body></mc-body>
      </mc>
    `);
    const childErrors = result.errors.filter(e => e.code === ErrorCode.INVALID_ATTRIBUTES_CHILD);
    expect(childErrors).toHaveLength(0);
  });

  it('Phase 3: mc-class without name attribute produces MISSING_ATTRIBUTE error', () => {
    const result = v(`
      <mc>
        <mc-head>
          <mc-attributes>
            <mc-class background-color="#e85d3a" />
          </mc-attributes>
        </mc-head>
        <mc-body></mc-body>
      </mc>
    `);
    const missingNameErrors = result.errors.filter(
      e => e.code === ErrorCode.MISSING_ATTRIBUTE && e.message.includes('mc-class') && e.message.includes('name'),
    );
    expect(missingNameErrors.length).toBeGreaterThan(0);
  });

  it('Phase 3: mc-class with valid name and attributes has no MISSING_ATTRIBUTE or INVALID_ATTRIBUTES_CHILD errors', () => {
    const result = v(`
      <mc>
        <mc-head>
          <mc-attributes>
            <mc-class name="hero-btn" background-color="#e85d3a" color="#fff" font-size="16px" />
          </mc-attributes>
        </mc-head>
        <mc-body></mc-body>
      </mc>
    `);
    const attrErrors = result.errors.filter(
      e => e.code === ErrorCode.MISSING_ATTRIBUTE || e.code === ErrorCode.INVALID_ATTRIBUTES_CHILD,
    );
    expect(attrErrors).toHaveLength(0);
  });

  it('Phase 3: mc-class with extends attribute is accepted', () => {
    const result = v(`
      <mc>
        <mc-head>
          <mc-attributes>
            <mc-class name="base" background-color="#000" />
            <mc-class name="primary" extends="base" color="#fff" />
          </mc-attributes>
        </mc-head>
        <mc-body></mc-body>
      </mc>
    `);
    const attrErrors = result.errors.filter(
      e => e.code === ErrorCode.MISSING_ATTRIBUTE || e.code === ErrorCode.INVALID_ATTRIBUTES_CHILD,
    );
    expect(attrErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Unknown component / attribute warnings
// ---------------------------------------------------------------------------

describe('validate — unknown component warnings', () => {
  it('warns on unknown component with suggestion', () => {
    const result = v(`
      <mc>
      <mc-body>
        <mc-secton><mc-column></mc-column></mc-secton>
      </mc-body>
    </mc>
    `);
    const unknowns = result.warnings.filter(w => w.code === ErrorCode.UNKNOWN_COMPONENT);
    expect(unknowns.length).toBeGreaterThan(0);
    expect(unknowns[0]?.message).toContain('mc-secton');
  });
});

describe('validate — mc-raw skips inner HTML', () => {
  it('does not warn on native HTML tags inside mc-raw', () => {
    const result = v(`
      <mc>
      <mc-body>
        <mc-section>
          <mc-column>
            <mc-raw>
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tbody>
                  <tr>
                    <td><p>Hello</p></td>
                    <td><img src="img.png" alt="x" /></td>
                  </tr>
                </tbody>
              </table>
            </mc-raw>
          </mc-column>
        </mc-section>
      </mc-body>
    </mc>
    `);
    const rawWarnings = result.warnings.filter(w => w.code === ErrorCode.UNKNOWN_COMPONENT);
    expect(rawWarnings).toHaveLength(0);
  });

  it('still warns on unknown mc-components outside mc-raw', () => {
    const result = v(`
      <mc>
      <mc-body>
        <mc-secton><mc-column></mc-column></mc-secton>
      </mc-body>
    </mc>
    `);
    const unknowns = result.warnings.filter(w => w.code === ErrorCode.UNKNOWN_COMPONENT);
    expect(unknowns.length).toBeGreaterThan(0);
  });
});

describe('validate — unknown attribute warnings', () => {
  it('warns on unknown attribute', () => {
    const result = v(`
      <mc>
      <mc-body>
        <mc-section>
          <mc-column>
            <mc-text colr="#333">Hi</mc-text>
          </mc-column>
        </mc-section>
      </mc-body>
    </mc>
    `);
    const unknowns = result.warnings.filter(w => w.code === ErrorCode.UNKNOWN_ATTRIBUTE);
    expect(unknowns.length).toBeGreaterThan(0);
    expect(unknowns[0]?.message).toContain('colr');
  });
});

// ---------------------------------------------------------------------------
// Collects ALL errors
// ---------------------------------------------------------------------------

describe('validate — collects all errors', () => {
  it('reports multiple errors at once', () => {
    const result = v(`
      <mc>
      <mc-body>
        <mc-section>
          <mc-text>Wrong nesting</mc-text>
          <mc-column>
            <mc-image />
            <mc-button>No href</mc-button>
          </mc-column>
        </mc-section>
      </mc-body>
    </mc>
    `);
    // Should have at least: INVALID_NESTING for mc-text, MISSING_ATTRIBUTE for mc-image (src), MISSING_ATTRIBUTE for mc-button (href)
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// Issue 1 fix: mc-head first-child check should skip text/whitespace nodes
// ---------------------------------------------------------------------------

describe('validate — mc-head first-child check', () => {
  it('does not error when mc-head is a direct child of mc', () => {
    // mc-head as first sibling of mc-body inside mc is valid.
    const result = v(`<mc>
      <mc-head></mc-head>
      <mc-body>
        <mc-section><mc-column><mc-text>Hello</mc-text></mc-column></mc-section>
      </mc-body>
    </mc>`);
    const nestingErrors = result.errors.filter(
      (e) => e.code === ErrorCode.INVALID_NESTING,
    );
    expect(nestingErrors).toHaveLength(0);
  });

  it('errors when mc-head is inside mc-body (wrong parent)', () => {
    const result = v(`<mc>
      <mc-body>
        <mc-head></mc-head>
        <mc-section><mc-column><mc-text>First</mc-text></mc-column></mc-section>
      </mc-body>
    </mc>`);
    // mc-head inside mc-body should trigger INVALID_NESTING (parent must be mc)
    const nestingErrors = result.errors.filter(
      (e) => e.code === ErrorCode.INVALID_NESTING,
    );
    expect(nestingErrors.length).toBeGreaterThan(0);
  });
});
