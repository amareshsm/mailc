/**
 * Phase 9 — Introspection verification for mc-class.
 *
 * Verifies that the introspect API handles mc-class nodes correctly:
 * 1. Component spec: mc-class is registered with the correct shape
 * 2. validate() accepts mc-class in mc-attributes without UNKNOWN_COMPONENT warnings
 * 3. validate() rejects mc-class with missing name
 * 4. validate() rejects mc-class in wrong parent
 * 5. mc-class attribute on body components is NOT flagged as UNKNOWN_ATTRIBUTE
 * 6. dataContract() ignores mc-class head nodes (no spurious required/optional fields)
 * 7. compile() emits no UNKNOWN_ATTRIBUTE warnings for mc-class attr on body components
 */

import { describe, it, expect } from 'vitest';
import { introspect } from '../../src/introspect/index.js';
import { compile } from '../../src/compile.js';
import { tokenize } from '../../src/tokenizer/index.js';
import { parse } from '../../src/parser/index.js';

// ---------------------------------------------------------------------------
// 1. Component spec
// ---------------------------------------------------------------------------

describe('Phase 9: mc-class component spec', () => {
  it('introspect.component("mc-class") returns a defined spec', () => {
    const spec = introspect.component('mc-class');
    expect(spec).toBeDefined();
  });

  it('mc-class spec has category "head"', () => {
    const spec = introspect.component('mc-class');
    expect(spec?.category).toBe('head');
  });

  it('mc-class spec has "name" as a required attribute', () => {
    const spec = introspect.component('mc-class');
    const required = spec?.requiredAttributes.map((a) => a.name);
    expect(required).toContain('name');
  });

  it('mc-class spec has "extends" as an optional attribute', () => {
    const spec = introspect.component('mc-class');
    const optional = spec?.optionalAttributes.map((a) => a.name);
    expect(optional).toContain('extends');
  });

  it('introspect.all() includes mc-class', () => {
    const all = introspect.all();
    const types = all.map((s) => s.type);
    expect(types).toContain('mc-class');
  });

  it('mc-class spec has a non-empty description', () => {
    const spec = introspect.component('mc-class');
    expect(spec?.description.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 2. validate() — mc-class node itself
// ---------------------------------------------------------------------------

describe('Phase 9: introspect.validate — mc-class node in head', () => {
  it('mc-class with name inside mc-attributes is valid (no errors, no warnings)', () => {
    const result = introspect.validate(
      { type: 'mc-class', attributes: { name: 'hero', 'font-size': '28px' } },
      'mc-attributes',
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('mc-class with only name is valid', () => {
    const result = introspect.validate(
      { type: 'mc-class', attributes: { name: 'minimal' } },
      'mc-attributes',
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('mc-class with name and extends is valid', () => {
    const result = introspect.validate(
      { type: 'mc-class', attributes: { name: 'child', extends: 'parent', color: '#000' } },
      'mc-attributes',
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('mc-class without name produces MISSING_ATTRIBUTE error', () => {
    const result = introspect.validate(
      { type: 'mc-class', attributes: { 'font-size': '28px' } },
      'mc-attributes',
    );
    expect(result.valid).toBe(false);
    const err = result.errors.find((e) => e.code === 'MISSING_ATTRIBUTE');
    expect(err).toBeDefined();
    expect(err?.message).toContain('name');
  });

  it('mc-class in wrong parent (mc-section) produces INVALID_NESTING error', () => {
    const result = introspect.validate(
      { type: 'mc-class', attributes: { name: 'hero' } },
      'mc-section',
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'INVALID_NESTING')).toBe(true);
  });

  it('mc-class in mc-body produces INVALID_NESTING error', () => {
    const result = introspect.validate(
      { type: 'mc-class', attributes: { name: 'hero' } },
      'mc-body',
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'INVALID_NESTING')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. mc-class attribute on body components — must NOT be UNKNOWN_ATTRIBUTE
// ---------------------------------------------------------------------------

describe('Phase 9: mc-class attribute is a global directive (no UNKNOWN_ATTRIBUTE)', () => {
  it('introspect.validate: mc-text with mc-class attr produces no UNKNOWN_ATTRIBUTE warning', () => {
    const result = introspect.validate(
      { type: 'mc-text', attributes: { 'mc-class': 'hero' } },
      'mc-column',
    );
    const unknownAttrWarns = result.warnings.filter((w) => w.code === 'UNKNOWN_ATTRIBUTE');
    expect(unknownAttrWarns).toHaveLength(0);
  });

  it('introspect.validate: mc-button with mc-class attr produces no UNKNOWN_ATTRIBUTE warning', () => {
    const result = introspect.validate(
      { type: 'mc-button', attributes: { href: 'https://example.com', 'mc-class': 'cta' } },
      'mc-column',
    );
    const unknownAttrWarns = result.warnings.filter((w) => w.code === 'UNKNOWN_ATTRIBUTE');
    expect(unknownAttrWarns).toHaveLength(0);
  });

  it('introspect.validate: mc-image with mc-class attr produces no UNKNOWN_ATTRIBUTE warning', () => {
    const result = introspect.validate(
      { type: 'mc-image', attributes: { src: 'logo.png', alt: 'Logo', 'mc-class': 'branded' } },
      'mc-column',
    );
    const unknownAttrWarns = result.warnings.filter((w) => w.code === 'UNKNOWN_ATTRIBUTE');
    expect(unknownAttrWarns).toHaveLength(0);
  });

  it('introspect.validate: mc-section with mc-class attr produces no UNKNOWN_ATTRIBUTE warning', () => {
    const result = introspect.validate(
      { type: 'mc-section', attributes: { 'mc-class': 'promo-section' } },
      'mc-body',
    );
    const unknownAttrWarns = result.warnings.filter((w) => w.code === 'UNKNOWN_ATTRIBUTE');
    expect(unknownAttrWarns).toHaveLength(0);
  });

  it('compile(): mc-class attr on mc-button produces no UNKNOWN_ATTRIBUTE warning', () => {
    const result = compile(`
      <mc>
        <mc-head>
          <mc-attributes>
            <mc-class name="cta" background-color="#e85d3a" />
          </mc-attributes>
        </mc-head>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-button href="https://example.com" mc-class="cta">Click</mc-button>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `, { templateStyle: 'attribute' });
    const unknownAttrWarns = result.warnings.filter((w) => w.code === 'UNKNOWN_ATTRIBUTE');
    expect(unknownAttrWarns).toHaveLength(0);
  });

  it('compile(): mc-class attr on mc-text produces no UNKNOWN_ATTRIBUTE warning', () => {
    const result = compile(`
      <mc>
        <mc-head>
          <mc-attributes>
            <mc-class name="hero" font-size="28px" />
          </mc-attributes>
        </mc-head>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-text mc-class="hero">Heading</mc-text>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `, { templateStyle: 'attribute' });
    const unknownAttrWarns = result.warnings.filter((w) => w.code === 'UNKNOWN_ATTRIBUTE');
    expect(unknownAttrWarns).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 4. dataContract() — mc-class head nodes produce no spurious fields
// ---------------------------------------------------------------------------

describe('Phase 9: dataContract — mc-class head nodes are not data producers', () => {
  it('template with mc-class definitions but no expressions has empty data contract', () => {
    const ast = parse(tokenize(`
      <mc>
        <mc-head>
          <mc-attributes>
            <mc-class name="hero" font-size="28px" font-weight="bold" />
            <mc-class name="muted" color="#999999" font-size="12px" />
            <mc-class name="cta" extends="hero" background-color="#e85d3a" />
          </mc-attributes>
        </mc-head>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-text mc-class="hero">Static heading</mc-text>
              <mc-text mc-class="muted">Static fine print</mc-text>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `));
    const dc = introspect.dataContract(ast);
    expect(dc.required).toHaveLength(0);
    expect(dc.optional).toHaveLength(0);
    expect(dc.loops).toHaveLength(0);
  });

  it('dataContract extracts expressions from mc-text content but not from mc-class name/extends', () => {
    const ast = parse(tokenize(`
      <mc>
        <mc-head>
          <mc-attributes>
            <mc-class name="hero" font-size="28px" extends="base" />
          </mc-attributes>
        </mc-head>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-text mc-class="hero">Hello {{user.name}}!</mc-text>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `));
    const dc = introspect.dataContract(ast);
    // user.name from expression — required
    expect(dc.required.some((f) => f.path === 'user.name')).toBe(true);
    // "hero" and "base" from mc-class attrs — NOT recorded as data fields
    expect(dc.required.some((f) => f.path === 'hero')).toBe(false);
    expect(dc.required.some((f) => f.path === 'base')).toBe(false);
  });

  it('dataContract does not record mc-class attribute value as a data path', () => {
    // mc-class="hero" on mc-text is a directive, not a template expression
    const ast = parse(tokenize(`
      <mc>
        <mc-head>
          <mc-attributes>
            <mc-class name="hero" font-size="24px" />
          </mc-attributes>
        </mc-head>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-text mc-class="hero">Plain text</mc-text>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `));
    const dc = introspect.dataContract(ast);
    // "hero" is a literal class name, not an expression — should NOT appear
    expect(dc.required.some((f) => f.path === 'hero')).toBe(false);
    expect(dc.optional.some((f) => f.path === 'hero')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. Nesting matrix includes mc-class
// ---------------------------------------------------------------------------

describe('Phase 9: nesting matrix includes mc-class', () => {
  it('nesting matrix parentToChildren["mc-attributes"] includes mc-class', () => {
    const matrix = introspect.nesting();
    const children = matrix.parentToChildren['mc-attributes'];
    expect(children).toBeDefined();
    expect(children).toContain('mc-class');
  });

  it('mc-class appears in the required paths list with mc-attributes in the path', () => {
    const matrix = introspect.nesting();
    const nestingPath = matrix.requiredPaths.find((p) => p.target === 'mc-class');
    expect(nestingPath).toBeDefined();
    // path is an ordered array from root to target, e.g. ['mc', 'mc-head', 'mc-attributes', 'mc-class']
    expect(nestingPath?.path).toContain('mc-attributes');
    expect(nestingPath?.path).toContain('mc-class');
  });
});
