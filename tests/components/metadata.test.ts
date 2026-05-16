/**
 * Tests for src/components/metadata.ts — the single source of truth.
 *
 * These tests verify:
 *   1. COMPONENT_METADATA is complete and internally consistent
 *   2. deriveComponentRule() produces structurally correct rules
 *   3. deriveDefaults() only returns attributes that have a declared default
 *   4. Derived COMPONENT_RULES agrees with what the validator uses
 *
 * Phase 0d of the Introspection API build plan.
 */
import { describe, it, expect } from 'vitest';
import {
  COMPONENT_METADATA,
  deriveComponentRule,
  deriveDefaults,
} from '../../src/components/metadata.js';
import { COMPONENT_RULES } from '../../src/validator/rules.js';

// ---------------------------------------------------------------------------
// COMPONENT_METADATA completeness
// ---------------------------------------------------------------------------

describe('COMPONENT_METADATA', () => {
  it('contains at least 15 components', () => {
    expect(Object.keys(COMPONENT_METADATA).length).toBeGreaterThanOrEqual(15);
  });

  it('every component has a non-empty description (> 10 chars)', () => {
    for (const [type, meta] of Object.entries(COMPONENT_METADATA)) {
      expect(
        meta.description.length,
        `${type}.description should be > 10 chars`,
      ).toBeGreaterThan(10);
    }
  });

  it('every component has a valid category', () => {
    const valid = new Set(['container', 'content', 'head', 'logic']);
    for (const [type, meta] of Object.entries(COMPONENT_METADATA)) {
      expect(
        valid.has(meta.category),
        `${type}.category "${meta.category}" is not a valid category`,
      ).toBe(true);
    }
  });

  it('every component has a non-empty compilerOutputReason', () => {
    for (const [type, meta] of Object.entries(COMPONENT_METADATA)) {
      expect(
        meta.compilerOutputReason.length,
        `${type}.compilerOutputReason must be non-empty`,
      ).toBeGreaterThan(10);
    }
  });

  it('structural components have compiler output elements; logic/directive components may have none', () => {
    const logicAndDirective = new Set([
      'mc',           // transparent root — delegates to mc-head + mc-body
      'mc-if',
      'mc-else-if',
      'mc-else',
      'mc-each',
      'mc-all',
      'mc-class',     // compile-time named attribute bundle — no HTML output
      'mc-attributes',
      'mc-raw',
    ]);
    for (const [type, meta] of Object.entries(COMPONENT_METADATA)) {
      if (!logicAndDirective.has(type)) {
        expect(
          meta.compilerOutputElements.length,
          `${type} should declare at least one compiler output element`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it('every attribute entry has a non-empty description', () => {
    for (const [type, meta] of Object.entries(COMPONENT_METADATA)) {
      for (const [attrName, attrMeta] of Object.entries(meta.attributes)) {
        expect(
          attrMeta.description.length,
          `${type}.attributes.${attrName}.description must be non-empty`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it('every attribute entry has a valid type', () => {
    const validTypes = new Set([
      'string',
      'url',
      'color',
      'number',
      'enum',
      'boolean',
      'css-value',
      'tailwind-classes',
    ]);
    for (const [type, meta] of Object.entries(COMPONENT_METADATA)) {
      for (const [attrName, attrMeta] of Object.entries(meta.attributes)) {
        expect(
          validTypes.has(attrMeta.type),
          `${type}.attributes.${attrName}.type "${attrMeta.type}" is invalid`,
        ).toBe(true);
      }
    }
  });

  it('enum attributes have a non-empty values array', () => {
    for (const [type, meta] of Object.entries(COMPONENT_METADATA)) {
      for (const [attrName, attrMeta] of Object.entries(meta.attributes)) {
        if (attrMeta.type === 'enum') {
          expect(
            attrMeta.values?.length ?? 0,
            `${type}.attributes.${attrName} is type enum but has no values array`,
          ).toBeGreaterThan(0);
        }
      }
    }
  });

  it('required attributes are marked required: true', () => {
    for (const [type] of Object.entries(COMPONENT_METADATA)) {
      const rule = deriveComponentRule(type);
      for (const attrName of rule.required) {
        const attrMeta = COMPONENT_METADATA[type]!.attributes[attrName];
        expect(
          attrMeta?.required,
          `${type}.attributes.${attrName} is in required list but not marked required: true`,
        ).toBe(true);
      }
    }
  });

  it('mc-body has parent: "mc" (must be inside the root mc element)', () => {
    expect(COMPONENT_METADATA['mc-body']?.parent).toBe('mc');
  });

  it('mc-section has parent: "mc-body"', () => {
    expect(COMPONENT_METADATA['mc-section']?.parent).toBe('mc-body');
  });

  it('mc-column has parent: "mc-section"', () => {
    expect(COMPONENT_METADATA['mc-column']?.parent).toBe('mc-section');
  });

  it('mc-button has allowsTextContent: true', () => {
    expect(COMPONENT_METADATA['mc-button']?.allowsTextContent).toBe(true);
  });

  it('mc-image has allowsTextContent: false', () => {
    expect(COMPONENT_METADATA['mc-image']?.allowsTextContent).toBe(false);
  });

  it('mc-button wrapperProps is a non-empty array', () => {
    const wrapperProps = COMPONENT_METADATA['mc-button']?.wrapperProps;
    expect(Array.isArray(wrapperProps)).toBe(true);
    expect(wrapperProps!.length).toBeGreaterThan(0);
  });

  // Phase 2: mc-class metadata
  it('Phase 2: mc-class exists in COMPONENT_METADATA', () => {
    expect(COMPONENT_METADATA['mc-class']).toBeDefined();
  });

  it('Phase 2: mc-class has correct parent (mc-attributes)', () => {
    expect(COMPONENT_METADATA['mc-class']?.parent).toBe('mc-attributes');
  });

  it('Phase 2: mc-class has correct category (head)', () => {
    expect(COMPONENT_METADATA['mc-class']?.category).toBe('head');
  });

  it('Phase 2: mc-class has maxChildren 0 (self-closing, no children)', () => {
    expect(COMPONENT_METADATA['mc-class']?.maxChildren).toBe(0);
  });

  it('Phase 2: mc-class has allowsTextContent false', () => {
    expect(COMPONENT_METADATA['mc-class']?.allowsTextContent).toBe(false);
  });

  it('Phase 2: mc-class has empty compilerOutputElements (compile-time directive)', () => {
    expect(COMPONENT_METADATA['mc-class']?.compilerOutputElements).toHaveLength(0);
  });

  it('Phase 2: mc-class name attribute is marked required', () => {
    expect(COMPONENT_METADATA['mc-class']?.attributes['name']?.required).toBe(true);
  });

  it('Phase 2: mc-class extends attribute is not required', () => {
    expect(COMPONENT_METADATA['mc-class']?.attributes['extends']?.required).toBe(false);
  });

  it('Phase 2: mc-class attributes include style properties (font-size, color, padding, background-color)', () => {
    const attrs = COMPONENT_METADATA['mc-class']?.attributes ?? {};
    expect(attrs['font-size']).toBeDefined();
    expect(attrs['color']).toBeDefined();
    expect(attrs['padding']).toBeDefined();
    expect(attrs['background-color']).toBeDefined();
  });

  it('Phase 2: mc-class class attribute exists for Tailwind bundling', () => {
    expect(COMPONENT_METADATA['mc-class']?.attributes['class']).toBeDefined();
    expect(COMPONENT_METADATA['mc-class']?.attributes['class']?.type).toBe('tailwind-classes');
  });
});

// ---------------------------------------------------------------------------
// deriveComponentRule()
// ---------------------------------------------------------------------------

describe('deriveComponentRule', () => {
  it('throws for unknown component type', () => {
    expect(() => deriveComponentRule('mc-unknown')).toThrow();
  });

  it('mc-button: required includes href', () => {
    expect(deriveComponentRule('mc-button').required).toContain('href');
  });

  it('mc-image: required includes src', () => {
    expect(deriveComponentRule('mc-image').required).toContain('src');
  });

  it('mc-if: required includes condition', () => {
    expect(deriveComponentRule('mc-if').required).toContain('condition');
  });

  it('mc-each: required includes items and as', () => {
    const rule = deriveComponentRule('mc-each');
    expect(rule.required).toContain('items');
    expect(rule.required).toContain('as');
  });

  it('mc-body: no required attributes', () => {
    expect(deriveComponentRule('mc-body').required).toHaveLength(0);
  });

  it('mc-raw: alternateParents includes mc-body and mc-section', () => {
    const rule = deriveComponentRule('mc-raw');
    expect(rule.alternateParents).toContain('mc-body');
    expect(rule.alternateParents).toContain('mc-section');
  });

  it('mc-section: maxChildren is Infinity (no upper bound; matches MJML)', () => {
    expect(deriveComponentRule('mc-section').maxChildren).toBe(Infinity);
  });

  it('mc-body: maxChildren is Infinity', () => {
    expect(deriveComponentRule('mc-body').maxChildren).toBe(Infinity);
  });

  it('knownAttributes includes all attribute keys from metadata', () => {
    const rule = deriveComponentRule('mc-button');
    const metaAttrs = Object.keys(COMPONENT_METADATA['mc-button']!.attributes);
    for (const attr of metaAttrs) {
      expect(rule.knownAttributes).toContain(attr);
    }
  });

  it('derived rules structurally match COMPONENT_RULES used by validator', () => {
    for (const [type, rule] of Object.entries(COMPONENT_RULES)) {
      const derived = deriveComponentRule(type);
      expect(derived.parent, `${type}.parent`).toBe(rule.parent);
      expect(derived.maxChildren, `${type}.maxChildren`).toBe(rule.maxChildren);
      for (const req of rule.required) {
        expect(derived.required, `${type} required must contain "${req}"`).toContain(req);
      }
    }
  });

  // Phase 2: mc-class rule derivation
  it('Phase 2: mc-class rule has parent mc-attributes', () => {
    expect(deriveComponentRule('mc-class').parent).toBe('mc-attributes');
  });

  it('Phase 2: mc-class rule has name in required list', () => {
    expect(deriveComponentRule('mc-class').required).toContain('name');
  });

  it('Phase 2: mc-class rule does not have extends in required list', () => {
    expect(deriveComponentRule('mc-class').required).not.toContain('extends');
  });

  it('Phase 2: mc-class rule maxChildren is 0', () => {
    expect(deriveComponentRule('mc-class').maxChildren).toBe(0);
  });

  it('Phase 2: mc-class knownAttributes includes name, extends, font-size, color, background-color', () => {
    const rule = deriveComponentRule('mc-class');
    expect(rule.knownAttributes).toContain('name');
    expect(rule.knownAttributes).toContain('extends');
    expect(rule.knownAttributes).toContain('font-size');
    expect(rule.knownAttributes).toContain('color');
    expect(rule.knownAttributes).toContain('background-color');
  });
});

// ---------------------------------------------------------------------------
// deriveDefaults()
// ---------------------------------------------------------------------------

describe('deriveDefaults', () => {
  it('throws for unknown component type', () => {
    expect(() => deriveDefaults('mc-unknown')).toThrow();
  });

  it('mc-button defaults include background-color', () => {
    expect(deriveDefaults('mc-button')['background-color']).toBeDefined();
  });

  it('mc-button defaults include color', () => {
    expect(deriveDefaults('mc-button')['color']).toBeDefined();
  });

  it('mc-button defaults include font-size', () => {
    expect(deriveDefaults('mc-button')['font-size']).toBeDefined();
  });

  it('mc-divider defaults include border-color, border-width, border-style', () => {
    const defaults = deriveDefaults('mc-divider');
    expect(defaults['border-color']).toBeDefined();
    expect(defaults['border-width']).toBeDefined();
    expect(defaults['border-style']).toBeDefined();
  });

  it('mc-spacer defaults include height', () => {
    expect(deriveDefaults('mc-spacer')['height']).toBeDefined();
  });

  it('mc-body defaults include width', () => {
    expect(deriveDefaults('mc-body')['width']).toBeDefined();
  });

  it('href is NOT in mc-button defaults (required attribute with no default)', () => {
    expect(deriveDefaults('mc-button')['href']).toBeUndefined();
  });

  it('src is NOT in mc-image defaults (required attribute with no default)', () => {
    expect(deriveDefaults('mc-image')['src']).toBeUndefined();
  });

  it('every default value is a string', () => {
    for (const [type] of Object.entries(COMPONENT_METADATA)) {
      const defaults = deriveDefaults(type);
      for (const [key, value] of Object.entries(defaults)) {
        expect(
          typeof value,
          `${type}.defaults.${key} must be a string`,
        ).toBe('string');
      }
    }
  });

  it('only attributes with a declared default field appear in deriveDefaults result', () => {
    for (const [type, meta] of Object.entries(COMPONENT_METADATA)) {
      const defaults = deriveDefaults(type);
      for (const key of Object.keys(defaults)) {
        expect(
          meta.attributes[key]?.default,
          `${type}.${key} appears in defaults but has no default field in metadata`,
        ).toBeDefined();
      }
    }
  });
});
