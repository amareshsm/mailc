/**
 * Tests for src/introspect/registry.ts — Phase 2 of the Introspection API.
 *
 * Coverage:
 *   - getComponentSpec() — known, unknown, field correctness
 *   - getAllComponentSpecs() — completeness, structural invariants
 *   - Registry is fully derived from COMPONENT_METADATA (no manual strings)
 */
import { afterEach, describe, expect, it } from 'vitest';
import { COMPONENT_METADATA } from '../../src/components/metadata.js';
import { COMPONENT_RULES } from '../../src/validator/rules.js';
import {
  _resetRegistryCache,
  getAllComponentSpecs,
  getComponentSpec,
} from '../../src/introspect/registry.js';

afterEach(() => {
  // Reset cache between tests so mutation tests start fresh.
  _resetRegistryCache();
});

// ---------------------------------------------------------------------------
// getComponentSpec — unknown type
// ---------------------------------------------------------------------------

describe('getComponentSpec — unknown type', () => {
  it('returns undefined for a completely unknown type', () => {
    expect(getComponentSpec('mc-unknown')).toBeUndefined();
  });

  it('returns undefined for an empty string', () => {
    expect(getComponentSpec('')).toBeUndefined();
  });

  it('returns undefined for a plain HTML tag name', () => {
    expect(getComponentSpec('div')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getComponentSpec — core fields
// ---------------------------------------------------------------------------

describe('getComponentSpec — mc-button', () => {
  it('returns a spec object', () => {
    expect(getComponentSpec('mc-button')).toBeDefined();
  });

  it('type field matches the requested key', () => {
    expect(getComponentSpec('mc-button')?.type).toBe('mc-button');
  });

  it('category is "content"', () => {
    expect(getComponentSpec('mc-button')?.category).toBe('content');
  });

  it('allowedParents includes mc-column and mc-hero', () => {
    const parents = getComponentSpec('mc-button')?.allowedParents ?? [];
    expect(parents).toContain('mc-column');
    expect(parents).toContain('mc-hero');
  });

  it('allowedChildren is empty (leaf component)', () => {
    expect(getComponentSpec('mc-button')?.allowedChildren).toHaveLength(0);
  });

  it('allowsTextContent is true', () => {
    expect(getComponentSpec('mc-button')?.allowsTextContent).toBe(true);
  });

  it('acceptsClassAttribute is true', () => {
    expect(getComponentSpec('mc-button')?.acceptsClassAttribute).toBe(true);
  });

  it('requiredAttributes contains href', () => {
    const spec = getComponentSpec('mc-button')!;
    const names = spec.requiredAttributes.map(a => a.name);
    expect(names).toContain('href');
  });

  it('href AttributeSpec has type "url"', () => {
    const spec = getComponentSpec('mc-button')!;
    const href = spec.requiredAttributes.find(a => a.name === 'href');
    expect(href?.type).toBe('url');
  });

  it('href AttributeSpec has required: true', () => {
    const spec = getComponentSpec('mc-button')!;
    const href = spec.requiredAttributes.find(a => a.name === 'href');
    expect(href?.required).toBe(true);
  });

  it('optionalAttributes does NOT contain href', () => {
    const spec = getComponentSpec('mc-button')!;
    const names = spec.optionalAttributes.map(a => a.name);
    expect(names).not.toContain('href');
  });

  it('background-color is in optionalAttributes (not required)', () => {
    const spec = getComponentSpec('mc-button')!;
    const names = spec.optionalAttributes.map(a => a.name);
    expect(names).toContain('background-color');
  });

  it('compilesTo.outputElements includes "table" and "a"', () => {
    const spec = getComponentSpec('mc-button')!;
    expect(spec.compilesTo.outputElements).toContain('table');
    expect(spec.compilesTo.outputElements).toContain('a');
  });

  it('compilesTo.reason is a non-empty string', () => {
    expect(getComponentSpec('mc-button')?.compilesTo.reason.length).toBeGreaterThan(10);
  });

  it('example.node.type matches the component type', () => {
    expect(getComponentSpec('mc-button')?.example.node.type).toBe('mc-button');
  });

  it('example.markup contains the component tag', () => {
    expect(getComponentSpec('mc-button')?.example.markup).toMatch(/mc-button/);
  });

  it('example.node.attributes contains href (required attr)', () => {
    const attrs = getComponentSpec('mc-button')?.example.node.attributes;
    expect(attrs).toHaveProperty('href');
  });

  it('commonMistakes is a non-empty array', () => {
    expect(getComponentSpec('mc-button')?.commonMistakes.length).toBeGreaterThan(0);
  });
});

describe('getComponentSpec — mc-image', () => {
  it('requiredAttributes contains src', () => {
    const spec = getComponentSpec('mc-image')!;
    expect(spec.requiredAttributes.map(a => a.name)).toContain('src');
  });

  it('allowsTextContent is false', () => {
    expect(getComponentSpec('mc-image')?.allowsTextContent).toBe(false);
  });

  it('compilesTo.outputElements includes "img"', () => {
    expect(getComponentSpec('mc-image')?.compilesTo.outputElements).toContain('img');
  });
});

describe('getComponentSpec — mc-body', () => {
  it('allowedParents is empty (mc-body is a top-level container — no user-facing parent)', () => {
    // The internal 'mc' document root is excluded from allowedParents —
    // it is never a parent an agent would explicitly nest inside of.
    const spec = getComponentSpec('mc-body')!;
    expect(spec.allowedParents).toEqual([]);
  });

  it('allowedChildren includes mc-section', () => {
    expect(getComponentSpec('mc-body')?.allowedChildren).toContain('mc-section');
  });

  it('allowedChildren includes mc-hero (mc-hero has parent: mc-body)', () => {
    expect(getComponentSpec('mc-body')?.allowedChildren).toContain('mc-hero');
  });
});

describe('getComponentSpec — mc-section', () => {
  it('allowedParents is ["mc-body"]', () => {
    expect(getComponentSpec('mc-section')?.allowedParents).toEqual(['mc-body']);
  });

  it('allowedChildren includes mc-column', () => {
    expect(getComponentSpec('mc-section')?.allowedChildren).toContain('mc-column');
  });

  it('allowsTextContent is false', () => {
    expect(getComponentSpec('mc-section')?.allowsTextContent).toBe(false);
  });
});

describe('getComponentSpec — mc-raw', () => {
  it('allowedParents includes mc-column, mc-body, mc-section', () => {
    const parents = getComponentSpec('mc-raw')?.allowedParents ?? [];
    expect(parents).toContain('mc-column');
    expect(parents).toContain('mc-body');
    expect(parents).toContain('mc-section');
  });
});

describe('getComponentSpec — logic components', () => {
  it('mc-if compilesTo.outputElements is empty (directive)', () => {
    expect(getComponentSpec('mc-if')?.compilesTo.outputElements).toHaveLength(0);
  });

  it('mc-if requiredAttributes contains condition', () => {
    const spec = getComponentSpec('mc-if')!;
    expect(spec.requiredAttributes.map(a => a.name)).toContain('condition');
  });

  it('mc-each requiredAttributes contains items and as', () => {
    const spec = getComponentSpec('mc-each')!;
    const names = spec.requiredAttributes.map(a => a.name);
    expect(names).toContain('items');
    expect(names).toContain('as');
  });
});

// ---------------------------------------------------------------------------
// getComponentSpec — cache identity
// ---------------------------------------------------------------------------

describe('getComponentSpec — cache identity', () => {
  it('returns the same object reference on repeated calls', () => {
    const first = getComponentSpec('mc-button');
    const second = getComponentSpec('mc-button');
    expect(first).toBe(second);
  });

  it('returns a fresh object after cache reset', () => {
    const before = getComponentSpec('mc-button');
    _resetRegistryCache();
    const after = getComponentSpec('mc-button');
    expect(before).not.toBe(after);
    // But the content must be equal
    expect(before?.type).toBe(after?.type);
    expect(before?.description).toBe(after?.description);
  });
});

// ---------------------------------------------------------------------------
// getAllComponentSpecs — completeness
// ---------------------------------------------------------------------------

describe('getAllComponentSpecs — completeness', () => {
  it('returns a spec for every key in COMPONENT_METADATA', () => {
    const specs = getAllComponentSpecs();
    const specTypes = new Set(specs.map(s => s.type));
    for (const type of Object.keys(COMPONENT_METADATA)) {
      expect(specTypes.has(type), `missing spec for ${type}`).toBe(true);
    }
  });

  it('count matches COMPONENT_METADATA key count', () => {
    expect(getAllComponentSpecs().length).toBe(Object.keys(COMPONENT_METADATA).length);
  });

  it('count matches COMPONENT_RULES key count', () => {
    expect(getAllComponentSpecs().length).toBe(Object.keys(COMPONENT_RULES).length);
  });

  it('every spec has a non-empty description', () => {
    for (const spec of getAllComponentSpecs()) {
      expect(spec.description.length, `${spec.type}.description`).toBeGreaterThan(10);
    }
  });

  it('every spec has a non-empty type string', () => {
    for (const spec of getAllComponentSpecs()) {
      expect(spec.type.length).toBeGreaterThan(0);
    }
  });

  it('every spec has a valid category', () => {
    const valid = new Set(['container', 'content', 'head', 'logic']);
    for (const spec of getAllComponentSpecs()) {
      expect(valid.has(spec.category), `${spec.type}.category "${spec.category}"`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// getAllComponentSpecs — structural invariants
// ---------------------------------------------------------------------------

describe('getAllComponentSpecs — structural invariants', () => {
  it('every required attribute has a non-empty description', () => {
    for (const spec of getAllComponentSpecs()) {
      for (const attr of spec.requiredAttributes) {
        expect(
          attr.description.length,
          `${spec.type}.${attr.name}.description`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it('every optional attribute has a non-empty description', () => {
    for (const spec of getAllComponentSpecs()) {
      for (const attr of spec.optionalAttributes) {
        expect(
          attr.description.length,
          `${spec.type}.${attr.name}.description`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it('no attribute appears in both requiredAttributes and optionalAttributes', () => {
    for (const spec of getAllComponentSpecs()) {
      const reqNames = new Set(spec.requiredAttributes.map(a => a.name));
      for (const opt of spec.optionalAttributes) {
        expect(
          reqNames.has(opt.name),
          `${spec.type}.${opt.name} is in both required and optional`,
        ).toBe(false);
      }
    }
  });

  it('requiredAttributes all have required: true', () => {
    for (const spec of getAllComponentSpecs()) {
      for (const attr of spec.requiredAttributes) {
        expect(attr.required, `${spec.type}.${attr.name} should be required: true`).toBe(true);
      }
    }
  });

  it('optionalAttributes all have required: false', () => {
    for (const spec of getAllComponentSpecs()) {
      for (const attr of spec.optionalAttributes) {
        expect(attr.required, `${spec.type}.${attr.name} should be required: false`).toBe(false);
      }
    }
  });

  it('every spec with a class attribute has acceptsClassAttribute: true', () => {
    for (const spec of getAllComponentSpecs()) {
      const hasClass = [...spec.requiredAttributes, ...spec.optionalAttributes].some(
        a => a.name === 'class',
      );
      if (hasClass) {
        expect(spec.acceptsClassAttribute, `${spec.type} has class attr but acceptsClassAttribute is false`).toBe(true);
      }
    }
  });

  it('every spec example.node.type matches spec.type', () => {
    for (const spec of getAllComponentSpecs()) {
      expect(spec.example.node.type, `${spec.type} example.node.type mismatch`).toBe(spec.type);
    }
  });

  it('every spec example.markup contains the component tag name', () => {
    for (const spec of getAllComponentSpecs()) {
      expect(spec.example.markup, `${spec.type} example.markup missing tag`).toMatch(
        new RegExp(spec.type),
      );
    }
  });

  it('every spec compilesTo has a non-empty reason', () => {
    for (const spec of getAllComponentSpecs()) {
      expect(
        spec.compilesTo.reason.length,
        `${spec.type}.compilesTo.reason`,
      ).toBeGreaterThan(10);
    }
  });

  it('allowedChildren of P contains C when C.allowedParents contains P', () => {
    // Bidirectionality check: if C says P is a parent, P must list C as a child.
    const allSpecs = getAllComponentSpecs();
    const specByType = new Map(allSpecs.map(s => [s.type, s]));

    for (const child of allSpecs) {
      for (const parentType of child.allowedParents) {
        const parent = specByType.get(parentType);
        if (parent) {
          expect(
            parent.allowedChildren,
            `${parentType}.allowedChildren should contain ${child.type}`,
          ).toContain(child.type);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// cssPropertyAttributes — Phase 3 of introspect styling-mode plan
// ---------------------------------------------------------------------------

describe('getComponentSpec — cssPropertyAttributes', () => {
  it('mc-button cssPropertyAttributes includes background-color', () => {
    const spec = getComponentSpec('mc-button')!;
    const names = spec.cssPropertyAttributes.map(a => a.name);
    expect(names).toContain('background-color');
  });

  it('mc-button cssPropertyAttributes includes all 26 expected CSS-prop attrs', () => {
    const spec = getComponentSpec('mc-button')!;
    const names = new Set(spec.cssPropertyAttributes.map(a => a.name));
    // Spot-check the key ones
    for (const attr of [
      'color', 'font-size', 'font-weight', 'border-radius', 'padding',
      'margin', 'max-width', 'height', 'text-align', 'line-height',
    ]) {
      expect(names.has(attr), `mc-button cssPropertyAttributes missing ${attr}`).toBe(true);
    }
  });

  it('mc-button cssPropertyAttributes does NOT include structural attrs', () => {
    const spec = getComponentSpec('mc-button')!;
    const names = new Set(spec.cssPropertyAttributes.map(a => a.name));
    expect(names.has('href')).toBe(false);
    expect(names.has('target')).toBe(false);
    expect(names.has('rel')).toBe(false);
    expect(names.has('align')).toBe(false);
  });

  it('mc-text cssPropertyAttributes includes color and padding', () => {
    const spec = getComponentSpec('mc-text')!;
    const names = spec.cssPropertyAttributes.map(a => a.name);
    expect(names).toContain('color');
    expect(names).toContain('padding');
  });

  it('mc-image cssPropertyAttributes includes border-radius and padding-* but NOT width', () => {
    const spec = getComponentSpec('mc-image')!;
    const names = new Set(spec.cssPropertyAttributes.map(a => a.name));
    expect(names.has('border-radius')).toBe(true);
    expect(names.has('padding')).toBe(true);
    // width on mc-image is structural (sets the HTML width attr), not a CSS class
    expect(names.has('width')).toBe(false);
    expect(names.has('src')).toBe(false);
  });

  it('mc-divider cssPropertyAttributes includes border-color, border-style, border-width', () => {
    const spec = getComponentSpec('mc-divider')!;
    const names = new Set(spec.cssPropertyAttributes.map(a => a.name));
    expect(names.has('border-color')).toBe(true);
    expect(names.has('border-style')).toBe(true);
    expect(names.has('border-width')).toBe(true);
    expect(names.has('container-background-color')).toBe(true);
  });

  it('mc-spacer cssPropertyAttributes includes height and padding but not padding-top', () => {
    const spec = getComponentSpec('mc-spacer')!;
    const names = new Set(spec.cssPropertyAttributes.map(a => a.name));
    expect(names.has('height')).toBe(true);
    expect(names.has('padding')).toBe(true);
    // Individual padding sides are not in CSS_PROP_ATTRS for mc-spacer
    expect(names.has('padding-top')).toBe(false);
  });

  it('mc-hero cssPropertyAttributes includes background-color, padding, border-radius', () => {
    const spec = getComponentSpec('mc-hero')!;
    const names = new Set(spec.cssPropertyAttributes.map(a => a.name));
    expect(names.has('background-color')).toBe(true);
    expect(names.has('padding')).toBe(true);
    expect(names.has('border-radius')).toBe(true);
    expect(names.has('overlay-color')).toBe(true);
    // height and width on mc-hero are structural (Outlook VML requires pixel values)
    expect(names.has('height')).toBe(false);
    expect(names.has('width')).toBe(false);
  });

  it('every cssPropertyAttribute entry has isCssPropAttr: true', () => {
    for (const spec of getAllComponentSpecs()) {
      for (const attr of spec.cssPropertyAttributes) {
        expect(
          attr.isCssPropAttr,
          `${spec.type}.${attr.name} in cssPropertyAttributes but isCssPropAttr is not true`,
        ).toBe(true);
      }
    }
  });

  it('every cssPropertyAttribute is also present in optionalAttributes or requiredAttributes', () => {
    for (const spec of getAllComponentSpecs()) {
      const allAttrNames = new Set([
        ...spec.requiredAttributes.map(a => a.name),
        ...spec.optionalAttributes.map(a => a.name),
      ]);
      for (const cssPropAttr of spec.cssPropertyAttributes) {
        expect(
          allAttrNames.has(cssPropAttr.name),
          `${spec.type}.${cssPropAttr.name} in cssPropertyAttributes but not in required/optional`,
        ).toBe(true);
      }
    }
  });

  it('logic components have empty cssPropertyAttributes', () => {
    for (const type of ['mc-if', 'mc-each', 'mc-else', 'mc-else-if', 'mc-for-each']) {
      const spec = getComponentSpec(type)!;
      expect(spec.cssPropertyAttributes, `${type} should have empty cssPropertyAttributes`).toHaveLength(0);
    }
  });
});
