/**
 * Tests for best-effort (partial) output behaviour.
 *
 * When validation errors are present but the AST can be built, `compile()` and
 * `compileFromJSON()` must return HTML output (not null) and set `partial: true`.
 * Genuinely unrecoverable cases (tokenizer/parser crash, missing <mc> root)
 * must still return `html: null` with `partial: false`.
 *
 * Note: basic error-case assertions (errors reported, html not null, partial true)
 * for specific scenarios (invalid nesting, duplicate IDs, missing attrs) live in
 * their respective test files (compile.test.ts, compile-from-json.test.ts).
 * This file tests the partial output CONTRACT — the invariants and edge cases.
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compile.js';
import { compileFromJSON } from '../../src/json/index.js';
import { ErrorCode } from '../../src/errors/codes.js';

// ---------------------------------------------------------------------------
// compile() — partial output contract
// ---------------------------------------------------------------------------

describe('partial output — compile()', () => {
  it('partial is false on a clean compile', () => {
    const result = compile(`<mc>
  <mc-body>
    <mc-section><mc-column><mc-text>Hello</mc-text></mc-column></mc-section>
  </mc-body>
</mc>`);
    expect(result.errors).toHaveLength(0);
    expect(result.partial).toBe(false);
    expect(result.html).not.toBeNull();
  });

  it('returns valid HTML document despite validation errors (mc-all outside mc-attributes)', () => {
    const source = `<mc>
  <mc-head>
    <mc-all font-family="Arial, sans-serif" />
  </mc-head>
  <mc-body>
    <mc-section><mc-column><mc-text>Hello</mc-text></mc-column></mc-section>
  </mc-body>
</mc>`;
    const result = compile(source);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.partial).toBe(true);
    expect(result.html).toContain('<!DOCTYPE html>');
    expect(result.html!.length).toBeGreaterThan(500);
  });

  it('stats.outputSize is non-zero on partial output', () => {
    const result = compile(`<mc><mc-body><mc-text>Bad</mc-text></mc-body></mc>`);
    expect(result.partial).toBe(true);
    expect(result.html).not.toBeNull();
    expect(result.stats.outputSize).toBeGreaterThan(0);
    expect(result.stats.components).toBeGreaterThan(0);
  });

  it('html is null on tokenizer failure (unclosed tag) — not a partial case', () => {
    const result = compile('<mc><mc-body><mc-section>');
    expect(result.html).toBeNull();
    expect(result.partial).toBe(false);
  });

  it('html is null when <mc> root is missing — not a partial case', () => {
    const result = compile('<mc-body><mc-section><mc-column><mc-text>Hi</mc-text></mc-column></mc-section></mc-body>');
    expect(result.html).toBeNull();
    expect(result.partial).toBe(false);
  });

  it('errors array is populated alongside partial html', () => {
    const result = compile(`<mc><mc-body><mc-text>Bad nesting</mc-text></mc-body></mc>`);
    expect(result.partial).toBe(true);
    expect(result.html).not.toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
    // Each error should have a code and message
    for (const err of result.errors) {
      expect(err.code).toBeTruthy();
      expect(err.message).toBeTruthy();
      expect(err.severity).toBe('error');
    }
  });
});

// ---------------------------------------------------------------------------
// compileFromJSON() — partial output contract
// ---------------------------------------------------------------------------

describe('partial output — compileFromJSON()', () => {
  it('partial is false on a clean JSON compile', () => {
    const result = compileFromJSON({
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
            children: [{ type: 'mc-text', attributes: {}, content: 'Hi' }],
          }],
        }],
      }],
    });
    expect(result.errors).toHaveLength(0);
    expect(result.partial).toBe(false);
    expect(result.html).not.toBeNull();
  });

  it('stats reflect actual compilation on partial JSON output', () => {
    // mc-text directly in mc-body — validation error, but compilation continues
    const result = compileFromJSON({
      type: 'mc',
      attributes: {},
      children: [{
        type: 'mc-body',
        attributes: {},
        children: [{ type: 'mc-text', attributes: {}, content: 'Bad' }],
      }],
    });
    expect(result.partial).toBe(true);
    expect(result.html).not.toBeNull();
    expect(result.stats.outputSize).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Problem 6: partial flag — styling violations
//
// partial must be true whenever result.errors is non-empty.
// Class-mode violations (CSS_ATTR_IN_CLASS_MODE) go to result.errors with
// severity:'error' and set partial:true. HTML is still fully produced (best-effort).
// ---------------------------------------------------------------------------

describe('partial output — styling violations set partial:true', () => {
  it('compile(): class-mode violation goes to result.errors — partial is true', () => {
    const source = `<mc><mc-body><mc-section><mc-column>
      <mc-text color="#ff0000">Hello</mc-text>
    </mc-column></mc-section></mc-body></mc>`;

    const result = compile(source, { templateStyle: 'class' });

    const violations = result.errors.filter(
      (e) => e.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE,
    );
    expect(violations).toHaveLength(1);
    expect(violations.at(0)?.severity).toBe('error');
    expect(result.partial).toBe(true);
    expect(result.html).not.toBeNull(); // best-effort output still produced
  });

  it('compile(): multiple violations all go to result.errors — partial is true', () => {
    const source = `<mc><mc-body><mc-section><mc-column>
      <mc-text color="#ff0000" font-size="16px" padding="8px">Hello</mc-text>
    </mc-column></mc-section></mc-body></mc>`;

    const result = compile(source, { templateStyle: 'class' });

    expect(result.errors.filter((e) => e.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE)).toHaveLength(3);
    expect(result.partial).toBe(true);
  });

  it('compile(): attribute mode produces no violations and partial:false', () => {
    const source = `<mc><mc-body><mc-section><mc-column>
      <mc-text color="#ff0000">Hello</mc-text>
    </mc-column></mc-section></mc-body></mc>`;

    const result = compile(source, { templateStyle: 'attribute' });

    expect(result.warnings.filter((w) => w.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE)).toHaveLength(0);
    expect(result.errors.filter((e) => e.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE)).toHaveLength(0);
    expect(result.partial).toBe(false);
  });

  it('compileFromJSON(): class mode violation goes to result.errors — partial is true', () => {
    const result = compileFromJSON(
      {
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
              children: [{ type: 'mc-text', attributes: { color: '#ff0000' }, content: 'Hi' }],
            }],
          }],
        }],
      },
      { templateStyle: 'class' },
    );

    const violations = result.errors.filter(
      (e) => e.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE,
    );
    expect(violations).toHaveLength(1);
    expect(violations.at(0)?.severity).toBe('error');
    expect(result.partial).toBe(true);
    expect(result.html).not.toBeNull();
  });

  it('compileFromJSON(): default is attribute mode — CSS-prop attrs accepted, no violations', () => {
    // JSON path defaults to config.styling.templateStyle ('attribute' from DEFAULT_CONFIG),
    // matching compile()'s default. Visual builders authoring attribute-style JSON
    // see no violations; class-mode authors must opt in explicitly.
    const result = compileFromJSON({
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
            children: [{ type: 'mc-text', attributes: { color: '#ff0000' }, content: 'Hi' }],
          }],
        }],
      }],
    }); // no templateStyle override — defaults to 'attribute'

    expect(result.errors.filter((e) => e.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE)).toHaveLength(0);
    expect(result.partial).toBe(false);
    expect(result.html).not.toBeNull();
  });

  it('compileFromJSON(): explicit templateStyle:"attribute" suppresses violations', () => {
    const result = compileFromJSON(
      {
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
              children: [{ type: 'mc-text', attributes: { color: '#ff0000' }, content: 'Hi' }],
            }],
          }],
        }],
      },
      { templateStyle: 'attribute' },
    );

    expect(result.errors.filter((e) => e.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE)).toHaveLength(0);
    expect(result.partial).toBe(false);
  });

  it('partial:true iff errors is non-empty — the invariant holds', () => {
    // Clean compile — no errors, no violations
    const clean = compile(`<mc><mc-body><mc-section><mc-column>
      <mc-text>Hello</mc-text>
    </mc-column></mc-section></mc-body></mc>`);
    expect(clean.errors).toHaveLength(0);
    expect(clean.partial).toBe(false);

    // Structural error → partial:true
    const structural = compile(`<mc><mc-body>
      <mc-text>Bad nesting</mc-text>
    </mc-body></mc>`);
    expect(structural.errors.length).toBeGreaterThan(0);
    expect(structural.partial).toBe(true);

    // Styling violation in class mode → partial:true (must opt in explicitly now)
    const styling = compile(
      `<mc><mc-body><mc-section><mc-column>
        <mc-text color="red">Red</mc-text>
      </mc-column></mc-section></mc-body></mc>`,
      { templateStyle: 'class' },
    );
    expect(styling.errors.length).toBeGreaterThan(0);
    expect(styling.partial).toBe(true);
  });
});
