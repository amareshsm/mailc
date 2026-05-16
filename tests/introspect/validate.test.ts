/**
 * @file tests/introspect/validate.test.ts
 *
 * Tests for Phase 7 of the Introspection API: `validateNode()`.
 *
 * Every test asserts a specific, observable behaviour — not just "no throw".
 * The four checks (UNKNOWN_COMPONENT, INVALID_NESTING, MISSING_ATTRIBUTE,
 * UNKNOWN_ATTRIBUTE) are each tested in isolation and in combination.
 *
 * Ground truth: COMPONENT_RULES, COMPONENT_METADATA (via registry).
 * No compiler imports. No HTML generation.
 */

import { describe, it, expect } from 'vitest';
import { validateNode } from '../../src/introspect/validate.js';

/**
 * Asserts a value is non-nullable and narrows its type. Use this after a
 * `.find(...)` or array index when the test expects a result to be present,
 * so subsequent property access doesn't need non-null assertions (`!`).
 *
 * Throws a clear error if the value is undefined/null — the test fails with
 * a message that points to the missing value rather than a cryptic
 * "cannot read property of undefined".
 */
function assertDefined<T>(value: T, message = 'expected value to be defined'): asserts value is NonNullable<T> {
  if (value === undefined || value === null) {
    throw new Error(message);
  }
}

// ---------------------------------------------------------------------------
// Valid nodes — zero errors expected
// ---------------------------------------------------------------------------

describe('validateNode — valid nodes', () => {
  it('mc-button with href inside mc-column returns valid', () => {
    const result = validateNode(
      { type: 'mc-button', attributes: { href: 'https://example.com' }, content: 'Click' },
      'mc-column',
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('mc-text with no required attributes inside mc-column returns valid', () => {
    const result = validateNode(
      { type: 'mc-text', attributes: {}, content: 'Hello world' },
      'mc-column',
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('mc-image with src and alt inside mc-column returns valid', () => {
    const result = validateNode(
      { type: 'mc-image', attributes: { src: 'https://example.com/img.png', alt: 'Photo' } },
      'mc-column',
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('mc-section inside mc-body returns valid', () => {
    const result = validateNode({ type: 'mc-section', attributes: {} }, 'mc-body');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('mc-column inside mc-section returns valid', () => {
    const result = validateNode({ type: 'mc-column', attributes: {} }, 'mc-section');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('mc-divider inside mc-column returns valid', () => {
    const result = validateNode({ type: 'mc-divider', attributes: {} }, 'mc-column');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('mc-spacer inside mc-column returns valid', () => {
    const result = validateNode({ type: 'mc-spacer', attributes: {} }, 'mc-column');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('known global attributes (class, id) are always accepted', () => {
    const result = validateNode(
      {
        type: 'mc-text',
        attributes: { class: 'text-lg text-gray-700', id: 'intro-text' },
        content: 'Hello',
      },
      'mc-column',
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('no parentType provided — nesting check is skipped, node validates on attributes only', () => {
    // mc-button is only valid inside mc-column, but we provide no parentType
    // so no nesting error should appear — only attribute errors if any
    const result = validateNode(
      { type: 'mc-button', attributes: { href: 'https://example.com' } },
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Check 1: UNKNOWN_COMPONENT
// ---------------------------------------------------------------------------

describe('validateNode — UNKNOWN_COMPONENT', () => {
  it('returns UNKNOWN_COMPONENT for a completely unknown type', () => {
    const result = validateNode({ type: 'mc-unknown', attributes: {} });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    const firstError = result.errors[0];
    assertDefined(firstError);
    expect(firstError.code).toBe('UNKNOWN_COMPONENT');
  });

  it('stops all further checks when component is unknown', () => {
    // Even with a parentType and attributes, only UNKNOWN_COMPONENT should appear
    const result = validateNode(
      { type: 'mc-ghost', attributes: { foo: 'bar' } },
      'mc-column',
    );
    expect(result.errors).toHaveLength(1);
    const firstError = result.errors[0];
    assertDefined(firstError);
    expect(firstError.code).toBe('UNKNOWN_COMPONENT');
  });

  it('UNKNOWN_COMPONENT fix has low confidence', () => {
    const result = validateNode({ type: 'mc-nowhere', attributes: {} });
    const firstError = result.errors[0];
    assertDefined(firstError);
    expect(firstError.fix.confidence).toBe('low');
  });

  it('UNKNOWN_COMPONENT message contains the unknown type name', () => {
    const result = validateNode({ type: 'mc-xyz', attributes: {} });
    const firstError = result.errors[0];
    assertDefined(firstError);
    expect(firstError.message).toContain('mc-xyz');
  });
});

// ---------------------------------------------------------------------------
// Check 2: INVALID_NESTING
// ---------------------------------------------------------------------------

describe('validateNode — INVALID_NESTING', () => {
  it('mc-button inside mc-section (missing mc-column wrapper) returns INVALID_NESTING', () => {
    const result = validateNode(
      { type: 'mc-button', attributes: { href: 'https://example.com' } },
      'mc-section',
    );
    const err = result.errors.find(e => e.code === 'INVALID_NESTING');
    expect(err).toBeDefined();
  });

  it('INVALID_NESTING fix for mc-button is wrap-in mc-column', () => {
    const result = validateNode(
      { type: 'mc-button', attributes: { href: 'https://example.com' } },
      'mc-section',
    );
    const err = result.errors.find(e => e.code === 'INVALID_NESTING'); assertDefined(err);
    expect(err.fix.action).toBe('wrap-in');
    expect(err.fix.wrapWith).toBe('mc-column');
    expect(err.fix.confidence).toBe('high');
  });

  it('mc-column inside mc-body (missing mc-section wrapper) returns INVALID_NESTING', () => {
    const result = validateNode({ type: 'mc-column', attributes: {} }, 'mc-body');
    const err = result.errors.find(e => e.code === 'INVALID_NESTING');
    assertDefined(err);
    // The fix should suggest wrapping in mc-section, the canonical parent
    expect(err.fix.wrapWith).toBe('mc-section');
  });

  it('mc-section inside mc-column returns INVALID_NESTING', () => {
    const result = validateNode({ type: 'mc-section', attributes: {} }, 'mc-column');
    expect(result.errors.some(e => e.code === 'INVALID_NESTING')).toBe(true);
  });

  it('mc-text inside mc-body (missing mc-column) returns INVALID_NESTING', () => {
    const result = validateNode({ type: 'mc-text', attributes: {} }, 'mc-body');
    expect(result.errors.some(e => e.code === 'INVALID_NESTING')).toBe(true);
  });

  it('INVALID_NESTING message names both the component and the wrong parent', () => {
    const result = validateNode(
      { type: 'mc-button', attributes: { href: 'https://example.com' } },
      'mc-body',
    );
    const err = result.errors.find(e => e.code === 'INVALID_NESTING'); assertDefined(err);
    expect(err.message).toContain('mc-button');
    expect(err.message).toContain('mc-body');
  });

  it('mc-raw inside mc-column is valid (mc-column is an alternateParent)', () => {
    const result = validateNode({ type: 'mc-raw', attributes: {} }, 'mc-column');
    expect(result.errors.some(e => e.code === 'INVALID_NESTING')).toBe(false);
  });

  it('mc-raw inside mc-body is valid (mc-body is an alternateParent)', () => {
    const result = validateNode({ type: 'mc-raw', attributes: {} }, 'mc-body');
    expect(result.errors.some(e => e.code === 'INVALID_NESTING')).toBe(false);
  });

  // Logic tags are exempt from the nesting check (they have no structural parent)
  it('mc-if inside any parent does NOT produce INVALID_NESTING', () => {
    const result = validateNode(
      { type: 'mc-if', attributes: { condition: 'showBanner' } },
      'mc-section',
    );
    expect(result.errors.some(e => e.code === 'INVALID_NESTING')).toBe(false);
  });

  it('mc-each inside any parent does NOT produce INVALID_NESTING', () => {
    const result = validateNode(
      { type: 'mc-each', attributes: { items: 'products', as: 'product' } },
      'mc-column',
    );
    expect(result.errors.some(e => e.code === 'INVALID_NESTING')).toBe(false);
  });

});

// ---------------------------------------------------------------------------
// Check 3: MISSING_ATTRIBUTE
// ---------------------------------------------------------------------------

describe('validateNode — MISSING_ATTRIBUTE', () => {
  it('mc-button without href returns MISSING_ATTRIBUTE', () => {
    const result = validateNode(
      { type: 'mc-button', attributes: {}, content: 'Click' },
      'mc-column',
    );
    const err = result.errors.find(e => e.code === 'MISSING_ATTRIBUTE');
    expect(err).toBeDefined();
  });

  it('MISSING_ATTRIBUTE fix action is add-attribute', () => {
    const result = validateNode(
      { type: 'mc-button', attributes: {} },
      'mc-column',
    );
    const err = result.errors.find(e => e.code === 'MISSING_ATTRIBUTE'); assertDefined(err);
    expect(err.fix.action).toBe('add-attribute');
    expect(err.fix.attribute).toBe('href');
    expect(err.fix.confidence).toBe('high');
  });

  it('MISSING_ATTRIBUTE fix includes a non-empty example value', () => {
    const result = validateNode(
      { type: 'mc-button', attributes: {} },
      'mc-column',
    );
    const err = result.errors.find(e => e.code === 'MISSING_ATTRIBUTE'); assertDefined(err);
    // href example in metadata is 'https://example.com'
    expect(err.fix.value).toBe('https://example.com');
  });

  it('mc-image without src returns MISSING_ATTRIBUTE for src', () => {
    const result = validateNode(
      { type: 'mc-image', attributes: { alt: 'Logo' } },
      'mc-column',
    );
    const err = result.errors.find(
      e => e.code === 'MISSING_ATTRIBUTE' && e.fix.attribute === 'src',
    );
    expect(err).toBeDefined();
  });

  it('mc-image without alt does NOT return MISSING_ATTRIBUTE (alt is optional — empty string is valid)', () => {
    // alt="" (decorative) is intentionally valid. The accessibility warning
    // for a missing alt attribute is emitted by the compiler, not this validator.
    // See: metadata.ts — alt required: false, default: ''
    const result = validateNode(
      { type: 'mc-image', attributes: { src: 'https://example.com/img.png' } },
      'mc-column',
    );
    const altErr = result.errors.find(
      e => e.code === 'MISSING_ATTRIBUTE' && e.fix.attribute === 'alt',
    );
    expect(altErr).toBeUndefined();
    expect(result.valid).toBe(true);
  });

  it('mc-if without condition returns MISSING_ATTRIBUTE for condition', () => {
    const result = validateNode({ type: 'mc-if', attributes: {} });
    const err = result.errors.find(e => e.code === 'MISSING_ATTRIBUTE');
    expect(err?.fix.attribute).toBe('condition');
  });

  it('mc-each without items and as returns two MISSING_ATTRIBUTE errors', () => {
    const result = validateNode({ type: 'mc-each', attributes: {} });
    const missingErrors = result.errors.filter(e => e.code === 'MISSING_ATTRIBUTE');
    const missingNames = missingErrors.map(e => e.fix.attribute);
    expect(missingNames).toContain('items');
    expect(missingNames).toContain('as');
  });

  it('components with no required attributes produce no MISSING_ATTRIBUTE errors', () => {
    // mc-text, mc-divider, mc-spacer have no required attributes
    for (const type of ['mc-text', 'mc-divider', 'mc-spacer']) {
      const result = validateNode({ type, attributes: {} }, 'mc-column');
      const missing = result.errors.filter(e => e.code === 'MISSING_ATTRIBUTE');
      expect(missing, `${type} should have no MISSING_ATTRIBUTE errors`).toHaveLength(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Check 4: UNKNOWN_ATTRIBUTE (now a warning, not an error)
// ---------------------------------------------------------------------------

describe('validateNode — UNKNOWN_ATTRIBUTE', () => {
  it('unrecognised attribute produces UNKNOWN_ATTRIBUTE warning (not error)', () => {
    const result = validateNode(
      { type: 'mc-text', attributes: { 'data-weird': 'value' } },
      'mc-column',
    );
    // valid is still true — unknown attr is a warning, not a blocking error
    expect(result.valid).toBe(true);
    expect(result.errors.find(e => e.code === 'UNKNOWN_ATTRIBUTE')).toBeUndefined();
    const warn = result.warnings.find(w => w.code === 'UNKNOWN_ATTRIBUTE');
    expect(warn).toBeDefined();
  });

  it('UNKNOWN_ATTRIBUTE warning fix action is remove-attribute with high confidence', () => {
    const result = validateNode(
      { type: 'mc-text', attributes: { 'not-real': 'value' } },
      'mc-column',
    );
    const warn = result.warnings.find(w => w.code === 'UNKNOWN_ATTRIBUTE'); assertDefined(warn);
    expect(warn.fix.action).toBe('remove-attribute');
    expect(warn.fix.attribute).toBe('not-real');
    expect(warn.fix.confidence).toBe('high');
  });

  it('UNKNOWN_ATTRIBUTE warning message names the unrecognised attribute', () => {
    const result = validateNode(
      { type: 'mc-button', attributes: { href: 'https://example.com', 'random-prop': 'x' } },
      'mc-column',
    );
    const warn = result.warnings.find(w => w.code === 'UNKNOWN_ATTRIBUTE'); assertDefined(warn);
    expect(warn.message).toContain('random-prop');
  });

  it('multiple unrecognised attributes produce one warning each', () => {
    const result = validateNode(
      {
        type: 'mc-button',
        attributes: { href: 'https://example.com', foo: '1', bar: '2' },
      },
      'mc-column',
    );
    // Still valid — warnings don't block
    expect(result.valid).toBe(true);
    const unknownWarnings = result.warnings.filter(w => w.code === 'UNKNOWN_ATTRIBUTE');
    expect(unknownWarnings).toHaveLength(2);
    const names = unknownWarnings.map(w => w.fix.attribute);
    expect(names).toContain('foo');
    expect(names).toContain('bar');
  });

  it('global attributes class and id are never flagged as UNKNOWN_ATTRIBUTE', () => {
    const result = validateNode(
      {
        type: 'mc-section',
        attributes: { class: 'bg-white', id: 'hero-section' },
      },
      'mc-body',
    );
    const unknownWarnings = result.warnings.filter(w => w.code === 'UNKNOWN_ATTRIBUTE');
    expect(unknownWarnings).toHaveLength(0);
  });

  it('known optional attributes are not flagged as UNKNOWN_ATTRIBUTE', () => {
    const result = validateNode(
      {
        type: 'mc-button',
        attributes: {
          href: 'https://example.com',
          'background-color': '#ff0000',
          'border-radius': '4px',
        },
      },
      'mc-column',
    );
    const unknownWarnings = result.warnings.filter(w => w.code === 'UNKNOWN_ATTRIBUTE');
    expect(unknownWarnings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Multiple errors collected in a single call
// ---------------------------------------------------------------------------

describe('validateNode — multiple errors in one call', () => {
  it('mc-button without href AND wrong parent returns both INVALID_NESTING and MISSING_ATTRIBUTE', () => {
    const result = validateNode(
      { type: 'mc-button', attributes: {} },
      'mc-section',
    );
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
    const codes = result.errors.map(e => e.code);
    expect(codes).toContain('INVALID_NESTING');
    expect(codes).toContain('MISSING_ATTRIBUTE');
  });

  it('mc-button with wrong parent + missing href returns errors; unknown attr goes to warnings', () => {
    const result = validateNode(
      { type: 'mc-button', attributes: { 'totally-unknown': 'x' } },
      'mc-section',
    );
    // INVALID_NESTING + MISSING_ATTRIBUTE are errors
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
    const codes = result.errors.map(e => e.code);
    expect(codes).toContain('INVALID_NESTING');
    expect(codes).toContain('MISSING_ATTRIBUTE');
    // UNKNOWN_ATTRIBUTE is a warning, not an error
    expect(codes).not.toContain('UNKNOWN_ATTRIBUTE');
    expect(result.warnings.find(w => w.code === 'UNKNOWN_ATTRIBUTE')).toBeDefined();
  });

  it('all errors are returned — collection does not stop at first error', () => {
    // mc-image: wrong parent + missing src + unknown attr
    const result = validateNode(
      { type: 'mc-image', attributes: { 'bogus': 'val' } },
      'mc-body',
    );
    // INVALID_NESTING + MISSING_ATTRIBUTE(src) = at least 2 errors
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
    // bogus is a warning
    expect(result.warnings.find(w => w.code === 'UNKNOWN_ATTRIBUTE')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Return value shape
// ---------------------------------------------------------------------------

describe('validateNode — return value shape', () => {
  it('valid result has valid: true, empty errors, empty warnings', () => {
    const result = validateNode(
      { type: 'mc-button', attributes: { href: 'https://example.com' } },
      'mc-column',
    );
    expect(result).toMatchObject({ valid: true, errors: [], warnings: [] });
  });

  it('invalid result has valid: false and non-empty errors array', () => {
    const result = validateNode({ type: 'mc-button', attributes: {} }, 'mc-section');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('warnings do not set valid: false', () => {
    // Unknown attribute → warning, template still valid
    const result = validateNode(
      { type: 'mc-button', attributes: { href: 'https://example.com', typo: 'x' } },
      'mc-column',
    );
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
  });

  it('every error has code, message, and fix', () => {
    const result = validateNode(
      { type: 'mc-button', attributes: {} },
      'mc-section',
    );
    for (const err of result.errors) {
      expect(err.code).toBeTruthy();
      expect(err.message).toBeTruthy();
      expect(err.fix).toBeDefined();
      expect(err.fix.action).toBeTruthy();
      expect(err.fix.confidence).toMatch(/^(high|low)$/);
    }
  });

  it('every warning has code, message, and fix', () => {
    const result = validateNode(
      { type: 'mc-button', attributes: { href: 'https://example.com', typo: 'x' } },
      'mc-column',
    );
    for (const warn of result.warnings) {
      expect(warn.code).toBeTruthy();
      expect(warn.message).toBeTruthy();
      expect(warn.fix).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Check 5: CSS_ATTR_IN_CLASS_MODE (class mode warnings)
// ---------------------------------------------------------------------------

describe('validateNode — CSS_ATTR_IN_CLASS_MODE (class mode)', () => {
  it('does NOT emit CSS_ATTR_IN_CLASS_MODE when templateStyle is omitted', () => {
    const result = validateNode(
      { type: 'mc-text', attributes: { color: '#ff0000' } },
      'mc-column',
    );
    expect(result.warnings.find(w => w.code === 'CSS_ATTR_IN_CLASS_MODE')).toBeUndefined();
  });

  it('does NOT emit CSS_ATTR_IN_CLASS_MODE when templateStyle is "attribute"', () => {
    const result = validateNode(
      { type: 'mc-text', attributes: { color: '#ff0000' } },
      'mc-column',
      { templateStyle: 'attribute' },
    );
    expect(result.warnings.find(w => w.code === 'CSS_ATTR_IN_CLASS_MODE')).toBeUndefined();
  });

  it('emits CSS_ATTR_IN_CLASS_MODE warning for color on mc-text in class mode', () => {
    const result = validateNode(
      { type: 'mc-text', attributes: { color: '#ff0000' } },
      'mc-column',
      { templateStyle: 'class' },
    );
    expect(result.valid).toBe(true);
    const warn = result.warnings.find(w => w.code === 'CSS_ATTR_IN_CLASS_MODE');
    assertDefined(warn);
    expect(warn.fix.action).toBe('replace-with-class');
    expect(warn.fix.attribute).toBe('color');
    expect(warn.fix.confidence).toBe('high');
  });

  it('warning fix carries classHint from metadata', () => {
    const result = validateNode(
      { type: 'mc-text', attributes: { color: '#333' } },
      'mc-column',
      { templateStyle: 'class' },
    );
    const warn = result.warnings.find(w => w.code === 'CSS_ATTR_IN_CLASS_MODE'); assertDefined(warn);
    expect(warn.fix.classHint).toContain('text-');
  });

  it('emits one CSS_ATTR_IN_CLASS_MODE warning per CSS-prop attr', () => {
    const result = validateNode(
      {
        type: 'mc-button',
        attributes: {
          href: 'https://example.com',
          'background-color': '#0066cc',
          color: '#ffffff',
          'font-size': '16px',
        },
      },
      'mc-column',
      { templateStyle: 'class' },
    );
    const classModeWarnings = result.warnings.filter(w => w.code === 'CSS_ATTR_IN_CLASS_MODE');
    expect(classModeWarnings).toHaveLength(3);
    const attrNames = classModeWarnings.map(w => w.fix.attribute);
    expect(attrNames).toContain('background-color');
    expect(attrNames).toContain('color');
    expect(attrNames).toContain('font-size');
  });

  it('does NOT warn on structural attrs (href, src, align) in class mode', () => {
    const result = validateNode(
      { type: 'mc-button', attributes: { href: 'https://example.com' } },
      'mc-column',
      { templateStyle: 'class' },
    );
    const classModeWarnings = result.warnings.filter(w => w.code === 'CSS_ATTR_IN_CLASS_MODE');
    expect(classModeWarnings).toHaveLength(0);
    expect(result.valid).toBe(true);
  });

  it('CSS_ATTR_IN_CLASS_MODE warnings do not affect valid flag', () => {
    const result = validateNode(
      { type: 'mc-text', attributes: { color: '#333', 'background-color': '#fff' } },
      'mc-column',
      { templateStyle: 'class' },
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings.filter(w => w.code === 'CSS_ATTR_IN_CLASS_MODE')).toHaveLength(2);
  });

  it('classHint substitutes #value with the user-supplied attribute value (color)', () => {
    const result = validateNode(
      { type: 'mc-text', attributes: { color: '#0066cc' } },
      'mc-column',
      { templateStyle: 'class' },
    );
    const warn = result.warnings.find(w => w.code === 'CSS_ATTR_IN_CLASS_MODE'); assertDefined(warn);
    expect(warn.fix.classHint).toBe('text-[#0066cc]');
    expect(warn.fix.classHint).not.toContain('#value');
    expect(warn.message).toContain('text-[#0066cc]');
  });

  it('classHint substitutes #value for arbitrary spacing values (padding-top)', () => {
    const result = validateNode(
      { type: 'mc-section', attributes: { 'padding-top': '20px' } },
      'mc-body',
      { templateStyle: 'class' },
    );
    const warn = result.warnings.find(w => w.code === 'CSS_ATTR_IN_CLASS_MODE'); assertDefined(warn);
    expect(warn.fix.classHint).toBe('pt-[20px]');
  });

  it('classHint maps enum values into prefix-#value form (text-align)', () => {
    const result = validateNode(
      { type: 'mc-text', attributes: { 'text-align': 'center' } },
      'mc-column',
      { templateStyle: 'class' },
    );
    const warn = result.warnings.find(w => w.code === 'CSS_ATTR_IN_CLASS_MODE'); assertDefined(warn);
    expect(warn.fix.classHint).toBe('text-center');
    expect(warn.fix.classHint).not.toContain(' or ');
  });

  it('classHint never contains English " or " prose in the resolved canonical', () => {
    const result = validateNode(
      {
        type: 'mc-text',
        attributes: {
          padding: '16px',
          'text-align': 'left',
          'font-size': '24px',
        },
      },
      'mc-column',
      { templateStyle: 'class' },
    );
    const warns = result.warnings.filter(w => w.code === 'CSS_ATTR_IN_CLASS_MODE');
    for (const w of warns) {
      expect(w.fix.classHint ?? '').not.toMatch(/\bor\b/);
      expect(w.fix.classHint ?? '').not.toContain('#value');
    }
  });

  it('classHint with alternatives populates classHintAlternatives (text-decoration)', () => {
    const result = validateNode(
      { type: 'mc-text', attributes: { 'text-decoration': 'none' } },
      'mc-column',
      { templateStyle: 'class' },
    );
    const warn = result.warnings.find(w => w.code === 'CSS_ATTR_IN_CLASS_MODE'); assertDefined(warn);
    expect(warn.fix.classHint).toBe('underline');
    expect(warn.fix.classHintAlternatives).toEqual(['no-underline']);
  });

  it('classHint omitted when attribute has no Tailwind equivalent (border shorthand)', () => {
    const result = validateNode(
      { type: 'mc-section', attributes: { border: '1px solid red' } },
      'mc-body',
      { templateStyle: 'class' },
    );
    const warn = result.warnings.find(w => w.code === 'CSS_ATTR_IN_CLASS_MODE'); assertDefined(warn);
    expect(warn.fix.classHint).toBeUndefined();
  });

  it('mc-image padding attr flagged in class mode', () => {
    const result = validateNode(
      { type: 'mc-image', attributes: { src: 'https://example.com/img.png', padding: '8px' } },
      'mc-column',
      { templateStyle: 'class' },
    );
    const warn = result.warnings.find(w => w.code === 'CSS_ATTR_IN_CLASS_MODE');
    assertDefined(warn);
    expect(warn.fix.attribute).toBe('padding');
  });

  it('mc-divider border-color flagged in class mode', () => {
    const result = validateNode(
      { type: 'mc-divider', attributes: { 'border-color': '#e5e7eb' } },
      'mc-column',
      { templateStyle: 'class' },
    );
    const warn = result.warnings.find(w => w.code === 'CSS_ATTR_IN_CLASS_MODE');
    assertDefined(warn);
    expect(warn.fix.attribute).toBe('border-color');
  });

  it('mc-spacer height flagged in class mode', () => {
    const result = validateNode(
      { type: 'mc-spacer', attributes: { height: '32px' } },
      'mc-column',
      { templateStyle: 'class' },
    );
    const warn = result.warnings.find(w => w.code === 'CSS_ATTR_IN_CLASS_MODE');
    assertDefined(warn);
    expect(warn.fix.attribute).toBe('height');
  });

  it('warning message mentions the attr and "class mode"', () => {
    const result = validateNode(
      { type: 'mc-text', attributes: { color: '#000' } },
      'mc-column',
      { templateStyle: 'class' },
    );
    const warn = result.warnings.find(w => w.code === 'CSS_ATTR_IN_CLASS_MODE'); assertDefined(warn);
    expect(warn.message).toContain('color');
    expect(warn.message).toContain('class mode');
  });
});

// ---------------------------------------------------------------------------
// Check 6: CLASS_ATTR_IN_ATTRIBUTE_MODE (attribute mode warnings)
// ---------------------------------------------------------------------------

describe('validateNode — CLASS_ATTR_IN_ATTRIBUTE_MODE (attribute mode)', () => {
  it('emits CLASS_ATTR_IN_ATTRIBUTE_MODE when templateStyle is "attribute" and class present', () => {
    const result = validateNode(
      { type: 'mc-text', attributes: { class: 'text-red-500' } },
      'mc-column',
      { templateStyle: 'attribute' },
    );
    expect(result.valid).toBe(true);
    const warn = result.warnings.find(w => w.code === 'CLASS_ATTR_IN_ATTRIBUTE_MODE');
    assertDefined(warn);
    expect(warn.fix.action).toBe('remove-attribute');
    expect(warn.fix.attribute).toBe('class');
    expect(warn.fix.confidence).toBe('high');
  });

  it('does NOT emit when templateStyle is omitted (no mode signal — no check)', () => {
    const result = validateNode(
      { type: 'mc-text', attributes: { class: 'x' } },
      'mc-column',
    );
    expect(result.warnings.find(w => w.code === 'CLASS_ATTR_IN_ATTRIBUTE_MODE')).toBeUndefined();
  });

  it('does NOT emit when templateStyle is "class" (class= is the primary mechanism there)', () => {
    const result = validateNode(
      { type: 'mc-text', attributes: { class: 'x' } },
      'mc-column',
      { templateStyle: 'class' },
    );
    expect(result.warnings.find(w => w.code === 'CLASS_ATTR_IN_ATTRIBUTE_MODE')).toBeUndefined();
  });

  it('does NOT emit when no class= present in attribute mode', () => {
    const result = validateNode(
      { type: 'mc-text', attributes: { color: '#333' } },
      'mc-column',
      { templateStyle: 'attribute' },
    );
    expect(result.warnings.find(w => w.code === 'CLASS_ATTR_IN_ATTRIBUTE_MODE')).toBeUndefined();
  });

  it('fires on every component type that accepts class', () => {
    const types = ['mc-text', 'mc-button', 'mc-image', 'mc-section', 'mc-column', 'mc-body'] as const;
    for (const type of types) {
      const attrs: Record<string, string> = { class: 'x' };
      if (type === 'mc-button') attrs.href = 'https://example.com';
      if (type === 'mc-image') { attrs.src = 'https://example.com/a.png'; attrs.alt = 'a'; }
      const result = validateNode(
        { type, attributes: attrs },
        type === 'mc-section' ? 'mc-body'
          : type === 'mc-column' ? 'mc-section'
          : type === 'mc-body' ? 'mc'
          : 'mc-column',
        { templateStyle: 'attribute' },
      );
      const warn = result.warnings.find(w => w.code === 'CLASS_ATTR_IN_ATTRIBUTE_MODE');
      expect(warn, `expected ${type} to emit CLASS_ATTR_IN_ATTRIBUTE_MODE`).toBeDefined();
    }
  });

  it('does not affect valid flag (warning, not error)', () => {
    const result = validateNode(
      { type: 'mc-text', attributes: { class: 'x' } },
      'mc-column',
      { templateStyle: 'attribute' },
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('warning message mentions the attr and "attribute mode"', () => {
    const result = validateNode(
      { type: 'mc-text', attributes: { class: 'big' } },
      'mc-column',
      { templateStyle: 'attribute' },
    );
    const warn = result.warnings.find(w => w.code === 'CLASS_ATTR_IN_ATTRIBUTE_MODE'); assertDefined(warn);
    expect(warn.message).toContain('class');
    expect(warn.message).toContain('attribute mode');
  });
});

// ---------------------------------------------------------------------------
// Logic component nesting (Gap 1 fix)
// ---------------------------------------------------------------------------

describe('validateNode — logic component nesting', () => {
  it('mc-each in mc-section is valid (template engine expands before compile)', () => {
    const result = validateNode(
      { type: 'mc-each', attributes: { items: 'list', as: 'item' } },
      'mc-section',
    );
    expect(result.valid).toBe(true);
  });

  it('mc-if in mc-column is valid', () => {
    const result = validateNode(
      { type: 'mc-if', attributes: { condition: 'user.pro' } },
      'mc-column',
    );
    expect(result.valid).toBe(true);
  });

  it('mc-each inside a leaf component (mc-button) is invalid', () => {
    const result = validateNode(
      { type: 'mc-each', attributes: { items: 'list', as: 'item' } },
      'mc-button',
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe('INVALID_NESTING');
  });

  it('mc-if inside mc-spacer (leaf) is invalid', () => {
    const result = validateNode(
      { type: 'mc-if', attributes: { condition: 'x' } },
      'mc-spacer',
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe('INVALID_NESTING');
  });

  it('mc-each without required attrs produces MISSING_ATTRIBUTE errors', () => {
    const result = validateNode(
      { type: 'mc-each', attributes: {} },
      'mc-section',
    );
    expect(result.valid).toBe(false);
    const codes = result.errors.map(e => e.code);
    expect(codes).toContain('MISSING_ATTRIBUTE');
  });
});
