/**
 * @file tests/introspect/index.test.ts
 *
 * Integration tests for the `introspect` namespace — Phase 8.
 *
 * Each test represents a real agent workflow: discover → validate → generate.
 * Zero compiler round-trips required.
 */

import { describe, it, expect } from 'vitest';
import { introspect } from '../../src/introspect/index.js';

describe('introspect — full agent workflow (zero compiler round-trips)', () => {
  it('agent discovers the required nesting path for mc-button', () => {
    const matrix = introspect.nesting();
    const path = matrix.requiredPaths.find(p => p.target === 'mc-button');
    // Path starts from the document root ('mc'), not mc-body.
    expect(path?.path).toContain('mc-section');
    expect(path?.path).toContain('mc-column');
    expect(path?.path).toContain('mc-button');
    // mc-button must appear after mc-column
    const p = path!.path;
    expect(p.indexOf('mc-column')).toBeLessThan(p.indexOf('mc-button'));
  });

  it('agent finds required attributes before generating a node', () => {
    const spec = introspect.component('mc-button');
    const required = spec?.requiredAttributes.map(a => a.name);
    expect(required).toContain('href');
  });

  it('agent gets valid class names before generating markup', () => {
    const result = introspect.validClasses('mc-button');
    expect(result.safe.length).toBeGreaterThan(0);
    expect(result.enhance.length).toBeGreaterThan(0);
    expect(result.rejected.length).toBeGreaterThan(0);
  });

  it('agent pre-validates a correct node — zero errors', () => {
    const check = introspect.validate(
      { type: 'mc-button', attributes: { href: 'https://example.com' }, content: 'Go' },
      'mc-column',
    );
    expect(check.valid).toBe(true);
    expect(check.errors).toHaveLength(0);
  });

  it('agent pre-validates an incorrect node — gets machine-readable fix', () => {
    const check = introspect.validate(
      { type: 'mc-button', attributes: {} },
      'mc-section',
    );
    expect(check.valid).toBe(false);
    const nestingFix = check.errors.find(e => e.code === 'INVALID_NESTING')?.fix;
    expect(nestingFix?.action).toBe('wrap-in');
    expect(nestingFix?.wrapWith).toBe('mc-column');
    expect(nestingFix?.confidence).toBe('high');
  });

  // Regression: callers that serialise over JSON (the MCP server, builder
  // UIs) cannot express `undefined` — they send `null` for "root-level
  // node". validateNode used to treat null as a real parent named "null"
  // and emit a false INVALID_NESTING ("cannot be placed inside <null>").
  it('parentType: null means root-level — same as omitting it, no false INVALID_NESTING', () => {
    const withNull = introspect.validate(
      { type: 'mc-button', attributes: { href: 'https://example.com' } },
      null,
    );
    expect(withNull.errors.filter(e => e.code === 'INVALID_NESTING')).toHaveLength(0);

    const withUndefined = introspect.validate(
      { type: 'mc-button', attributes: { href: 'https://example.com' } },
      undefined,
    );
    expect(withNull.valid).toBe(withUndefined.valid);
    expect(withNull.errors).toEqual(withUndefined.errors);
  });

  it('agent uses compilesTo to understand Outlook VML output', () => {
    const spec = introspect.compilesTo('mc-button');
    expect(spec?.outputElements).toContain('v:roundrect');
  });

  it('introspect.all() returns a spec for every component', () => {
    const specs = introspect.all();
    expect(specs.length).toBeGreaterThan(10);
    expect(specs.every(s => s.description.length > 0)).toBe(true);
  });

  it('unknown component returns undefined from component() and compilesTo()', () => {
    expect(introspect.component('mc-unknown')).toBeUndefined();
    expect(introspect.compilesTo('mc-unknown')).toBeUndefined();
  });

  it('IDE workflow: reads cssPropertyAttributes to build replace-with-class actions', () => {
    const spec = introspect.component('mc-button');
    expect(spec?.cssPropertyAttributes.length).toBeGreaterThan(0);
    const bgAttr = spec?.cssPropertyAttributes.find(a => a.name === 'background-color');
    expect(bgAttr?.isCssPropAttr).toBe(true);
    expect(bgAttr?.classHint).toContain('bg-');
  });

  it('IDE workflow: validate in class mode returns replace-with-class fix', () => {
    const check = introspect.validate(
      { type: 'mc-text', attributes: { color: '#ff0000' } },
      'mc-column',
      { templateStyle: 'class' },
    );
    expect(check.valid).toBe(true);
    const warn = check.warnings.find(w => w.code === 'CSS_ATTR_IN_CLASS_MODE');
    expect(warn).toBeDefined();
    expect(warn?.fix.action).toBe('replace-with-class');
    expect(warn?.fix.classHint).toContain('text-');
  });

  it('validate in attribute mode does not warn on CSS-prop attrs', () => {
    const check = introspect.validate(
      { type: 'mc-text', attributes: { color: '#ff0000', 'font-size': '16px' } },
      'mc-column',
      { templateStyle: 'attribute' },
    );
    expect(check.valid).toBe(true);
    expect(check.warnings.filter(w => w.code === 'CSS_ATTR_IN_CLASS_MODE')).toHaveLength(0);
  });

  describe('mc-list / mc-list-item coverage', () => {
    it('lists are surfaced in introspect.all()', () => {
      const all = introspect.all();
      const types = all.map((s) => s.type);
      expect(types).toContain('mc-list');
      expect(types).toContain('mc-list-item');
    });

    it('mc-list spec advertises list-style-type and item-spacing', () => {
      const spec = introspect.component('mc-list');
      const attrNames = [...spec!.requiredAttributes, ...spec!.optionalAttributes].map((a) => a.name);
      expect(attrNames).toContain('list-style-type');
      expect(attrNames).toContain('list-style-position');
      expect(attrNames).toContain('item-spacing');
    });

    it('canNest matrix knows mc-list-item only fits inside mc-list', () => {
      expect(introspect.canNest('mc-list', 'mc-list-item')).toBe(true);
      expect(introspect.canNest('mc-column', 'mc-list-item')).toBe(false);
    });

    it('list-disc / list-decimal appear in mc-list valid classes', () => {
      const result = introspect.validClasses('mc-list');
      const safeNames = result.safe.map((c) => c.className);
      expect(safeNames).toContain('list-disc');
      expect(safeNames).toContain('list-decimal');
      expect(safeNames).toContain('list-none');
    });

    it('compilesTo for mc-list lists the table+ul output', () => {
      const spec = introspect.compilesTo('mc-list');
      expect(spec?.outputElements).toContain('ul');
      expect(spec?.outputElements).toContain('table');
    });
  });
});
