/**
 * Tests for MCNode (JSON IR) tree validation via the public `validate()` API.
 *
 * Before the API consolidation these tests called `validateJSON()` directly;
 * the public surface now routes JSON IR through the universal `validate()`,
 * which internally dispatches to the same JSON walker. Same validator,
 * accessed through the single public entry point.
 */

import { describe, it, expect } from 'vitest';
import { validate, validateDocument } from '../../src/index.js';
import type { MCNode, MCDocument } from '../../src/json/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a minimal valid mc-body node. */
function makeBody(children: MCNode[] = []): MCNode {
  return {
    type: 'mc-body',
    attributes: {},
    children,
  };
}

/** Creates a minimal mc-section node. */
function makeSection(children: MCNode[] = []): MCNode {
  return {
    type: 'mc-section',
    attributes: {},
    children,
  };
}

/** Creates a minimal mc-column node. */
function makeColumn(children: MCNode[] = []): MCNode {
  return {
    type: 'mc-column',
    attributes: {},
    children,
  };
}

/** Creates a minimal valid MCDocument. */
function makeDocument(template: MCNode): MCDocument {
  return {
    version: '1.0',
    metadata: {
      id: 'test-doc',
      name: 'Test Document',
      created: '2026-01-01T00:00:00Z',
      updated: '2026-01-01T00:00:00Z',
    },
    template,
  };
}

// ---------------------------------------------------------------------------
// validate() — JSON IR input dispatch
// ---------------------------------------------------------------------------

describe('validate (JSON IR)', () => {
  describe('valid trees', () => {
    it('accepts a bare mc-body', () => {
      const result = validate(makeBody());
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts mc-body > mc-section > mc-column > mc-text', () => {
      const result = validate(
        makeBody([
          makeSection([
            makeColumn([
              { type: 'mc-text', attributes: {}, content: 'Hello' },
            ]),
          ]),
        ]),
      );
      expect(result.isValid).toBe(true);
    });

    it('accepts mc with mc-head and mc-body as siblings', () => {
      const result = validate({
        type: 'mc',
        attributes: {},
        children: [
          { type: 'mc-head', attributes: {} },
          makeBody([makeSection([makeColumn([])])]),
        ],
      });
      expect(result.isValid).toBe(true);
    });

    it('accepts logic nodes wrapping components', () => {
      const result = validate(
        makeBody([
          makeSection([
            makeColumn([
              {
                type: 'mc-if',
                attributes: { condition: 'showText' },
                children: [
                  { type: 'mc-text', attributes: {}, content: 'Conditional' },
                ],
              },
            ]),
          ]),
        ]),
      );
      expect(result.isValid).toBe(true);
    });
  });

  describe('nesting errors', () => {
    it('rejects mc-section inside mc-column', () => {
      const result = validate(
        makeBody([
          makeSection([
            makeColumn([
              makeSection([]),
            ]),
          ]),
        ]),
      );
      expect(result.isValid).toBe(false);
      expect(result.errors[0]!.code).toBe('INVALID_NESTING');
      expect(result.errors[0]!.message).toContain('mc-section');
    });

    it('rejects mc-text directly inside mc-body', () => {
      const result = validate(
        makeBody([
          { type: 'mc-text', attributes: {}, content: 'Bad' },
        ]),
      );
      expect(result.isValid).toBe(false);
      expect(result.errors[0]!.message).toContain('mc-column');
    });

    it('rejects mc-button directly inside mc-section', () => {
      const result = validate(
        makeBody([
          makeSection([
            { type: 'mc-button', attributes: { href: '#' }, content: 'Click' },
          ]),
        ]),
      );
      expect(result.isValid).toBe(false);
      expect(result.errors[0]!.code).toBe('INVALID_NESTING');
    });
  });

  describe('required attributes', () => {
    it('rejects mc-image without src and alt', () => {
      const result = validate(
        makeBody([
          makeSection([
            makeColumn([
              { type: 'mc-image', attributes: {} },
            ]),
          ]),
        ]),
      );
      expect(result.isValid).toBe(false);
      const codes = result.errors.map((e) => e.code);
      expect(codes).toContain('MISSING_ATTRIBUTE');
      const messages = result.errors.map((e) => e.message);
      expect(messages.some((m) => m.includes('"src"'))).toBe(true);
      // alt is no longer a validator error — handled by image compiler a11y checks
      expect(messages.some((m) => m.includes('"alt"'))).toBe(false);
    });

    it('rejects mc-button without href', () => {
      const result = validate(
        makeBody([
          makeSection([
            makeColumn([
              { type: 'mc-button', attributes: {}, content: 'Click' },
            ]),
          ]),
        ]),
      );
      expect(result.isValid).toBe(false);
      expect(result.errors[0]!.message).toContain('"href"');
    });

    it('accepts mc-image with src and alt', () => {
      const result = validate(
        makeBody([
          makeSection([
            makeColumn([
              {
                type: 'mc-image',
                attributes: { src: 'logo.png', alt: 'Logo' },
              },
            ]),
          ]),
        ]),
      );
      expect(result.isValid).toBe(true);
    });
  });

  describe('logic ordering', () => {
    it('rejects mc-else without preceding mc-if', () => {
      const result = validate(
        makeBody([
          makeSection([
            makeColumn([
              { type: 'mc-else', attributes: {}, children: [] },
            ]),
          ]),
        ]),
      );
      expect(result.isValid).toBe(false);
      expect(result.errors[0]!.code).toBe('INVALID_LOGIC_ORDER');
    });

    it('rejects mc-else-if after mc-text', () => {
      const result = validate(
        makeBody([
          makeSection([
            makeColumn([
              { type: 'mc-text', attributes: {}, content: 'Hi' },
              { type: 'mc-else-if', attributes: { condition: 'x' }, children: [] },
            ]),
          ]),
        ]),
      );
      expect(result.isValid).toBe(false);
      expect(result.errors[0]!.code).toBe('INVALID_LOGIC_ORDER');
    });

    it('accepts mc-if → mc-else-if → mc-else chain', () => {
      const result = validate(
        makeBody([
          makeSection([
            makeColumn([
              {
                type: 'mc-if',
                attributes: { condition: 'a' },
                children: [{ type: 'mc-text', attributes: {}, content: 'A' }],
              },
              {
                type: 'mc-else-if',
                attributes: { condition: 'b' },
                children: [{ type: 'mc-text', attributes: {}, content: 'B' }],
              },
              {
                type: 'mc-else',
                attributes: {},
                children: [{ type: 'mc-text', attributes: {}, content: 'C' }],
              },
            ]),
          ]),
        ]),
      );
      expect(result.isValid).toBe(true);
    });
  });

  describe('column count', () => {
    // No upper bound — dense layouts (5+ cols) are a soft style concern, not
    // a compile error. Matches MJML's behaviour.
    it('accepts mc-section with 5 columns', () => {
      const columns = Array.from({ length: 5 }, () => makeColumn([]));
      const result = validate(makeBody([makeSection(columns)]));
      expect(result.isValid).toBe(true);
    });

    it('accepts mc-section with 8 columns', () => {
      const columns = Array.from({ length: 8 }, () => makeColumn([]));
      const result = validate(makeBody([makeSection(columns)]));
      expect(result.isValid).toBe(true);
    });
  });

  describe('ID uniqueness', () => {
    it('rejects duplicate IDs', () => {
      const result = validate({
        id: 'root',
        type: 'mc-body',
        attributes: {},
        children: [
          {
            id: 'dupe',
            type: 'mc-section',
            attributes: {},
            children: [
              {
                id: 'dupe',
                type: 'mc-column',
                attributes: {},
              },
            ],
          },
        ],
      });
      expect(result.isValid).toBe(false);
      expect(result.errors[0]!.message).toContain('Duplicate node ID');
    });

    it('accepts unique IDs', () => {
      const result = validate({
        id: 'root',
        type: 'mc-body',
        attributes: {},
        children: [
          {
            id: 'section-1',
            type: 'mc-section',
            attributes: {},
            children: [
              {
                id: 'col-1',
                type: 'mc-column',
                attributes: {},
              },
            ],
          },
        ],
      });
      expect(result.isValid).toBe(true);
    });
  });

  describe('unknown components', () => {
    it('errors on unknown component type', () => {
      const result = validate(
        makeBody([
          { type: 'mc-carousel', attributes: {} },
        ]),
      );
      // Unknown components are errors — the compiler has no rule for them.
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.code).toBe('UNKNOWN_COMPONENT');
    });
  });

  describe('mc-head placement', () => {
    it('rejects mc-head as second child of mc-body', () => {
      const result = validate(
        makeBody([
          makeSection([makeColumn([])]),
          { type: 'mc-head', attributes: {} },
        ]),
      );
      expect(result.isValid).toBe(false);
      expect(result.errors[0]!.message).toContain('mc-head');
      expect(result.errors[0]!.message).toContain('mc');
    });
  });
});

// ---------------------------------------------------------------------------
// validateDocument tests
// ---------------------------------------------------------------------------

describe('validateDocument', () => {
  it('accepts a valid document', () => {
    const result = validateDocument(makeDocument(makeBody()));
    expect(result.isValid).toBe(true);
  });

  it('rejects document without version', () => {
    const doc = makeDocument(makeBody());
    (doc as unknown as Record<string, unknown>).version = '';
    const result = validateDocument(doc);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]!.message).toContain('version');
  });

  it('rejects document without metadata.id', () => {
    const doc = makeDocument(makeBody());
    doc.metadata.id = '';
    const result = validateDocument(doc);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]!.message).toContain('id');
  });

  it('rejects document without metadata.name', () => {
    const doc = makeDocument(makeBody());
    doc.metadata.name = '';
    const result = validateDocument(doc);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]!.message).toContain('name');
  });

  it('propagates template validation errors', () => {
    const result = validateDocument(
      makeDocument(
        makeBody([
          { type: 'mc-text', attributes: {}, content: 'Bad nesting' },
        ]),
      ),
    );
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.code === 'INVALID_NESTING')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Phase 7: mc-class in JSON validator
// ---------------------------------------------------------------------------

describe('Phase 7: mc-class in mc-attributes (JSON)', () => {
  /** Builds a minimal mc tree with mc-attributes containing the given children. */
  function makeTreeWithAttrs(attrChildren: MCNode[]): MCNode {
    return {
      type: 'mc',
      attributes: {},
      children: [
        {
          type: 'mc-head',
          attributes: {},
          children: [
            {
              type: 'mc-attributes',
              attributes: {},
              children: attrChildren,
            },
          ],
        },
        { type: 'mc-body', attributes: {} },
      ],
    };
  }

  it('mc-class with valid name is accepted (no errors)', () => {
    const result = validate(makeTreeWithAttrs([
      { type: 'mc-class', attributes: { name: 'cta', 'background-color': '#e85d3a' } },
    ]));
    expect(result.errors).toHaveLength(0);
  });

  it('mc-class with extends is accepted (no errors)', () => {
    const result = validate(makeTreeWithAttrs([
      { type: 'mc-class', attributes: { name: 'base', 'font-size': '14px' } },
      { type: 'mc-class', attributes: { name: 'primary', extends: 'base', color: '#fff' } },
    ]));
    expect(result.errors).toHaveLength(0);
  });

  it('mc-class without name produces EXACTLY ONE MISSING_ATTRIBUTE error (no duplicates)', () => {
    const result = validate(makeTreeWithAttrs([
      { type: 'mc-class', attributes: { 'background-color': '#e85d3a' } }, // no name
    ]));
    const nameErrors = result.errors.filter(
      e => e.code === 'MISSING_ATTRIBUTE' && e.message.includes('mc-class'),
    );
    expect(nameErrors).toHaveLength(1);
  });

  it('mc-class does NOT produce INVALID_NESTING error inside mc-attributes', () => {
    const result = validate(makeTreeWithAttrs([
      { type: 'mc-class', attributes: { name: 'hero', 'font-size': '24px' } },
    ]));
    expect(result.errors.filter(e => e.code === 'INVALID_NESTING')).toHaveLength(0);
  });

  it('multiple mc-class definitions all accepted', () => {
    const result = validate(makeTreeWithAttrs([
      { type: 'mc-class', attributes: { name: 'hero', 'font-size': '24px' } },
      { type: 'mc-class', attributes: { name: 'footer', 'font-size': '12px' } },
      { type: 'mc-class', attributes: { name: 'cta', 'background-color': '#e85d3a' } },
    ]));
    expect(result.errors).toHaveLength(0);
  });

  it('mc-class mixed with regular mc-attributes children is accepted', () => {
    const result = validate(makeTreeWithAttrs([
      { type: 'mc-all', attributes: { 'font-family': 'Arial' } },
      { type: 'mc-button', attributes: { 'background-color': '#000' } },
      { type: 'mc-class', attributes: { name: 'cta', color: '#fff' } },
    ]));
    expect(result.errors).toHaveLength(0);
  });

  it('truly invalid mc-attributes child (mc-body) still produces INVALID_NESTING', () => {
    const result = validate(makeTreeWithAttrs([
      { type: 'mc-body', attributes: {} }, // mc-body is NOT in VALID_ATTRIBUTES_CHILDREN
    ]));
    expect(result.errors.some(e => e.code === 'INVALID_NESTING')).toBe(true);
  });

  describe('malformed input — defensive checks', () => {
    it('produces a clear error (does not crash) when a node is missing its type', () => {
      // Cast through unknown to bypass TS — this models the runtime case where
      // user-supplied JSON arrived without going through the type system.
      const malformed = {
        type: 'mc',
        attributes: {},
        children: [
          { attributes: {}, children: [] } as unknown as never,
        ],
      } as unknown as MCNode;

      // Should NOT throw — previously this triggered TypeError in fuzzy-match
      // when suggestComponent received undefined.
      expect(() => validate(malformed)).not.toThrow();

      const result = validate(malformed);
      expect(result.errors.some((e) => e.message.includes('missing a "type"'))).toBe(true);
    });

    it('produces a clear error when a node has an empty-string type', () => {
      const malformed = {
        type: '',
        attributes: {},
      } as unknown as MCNode;

      expect(() => validate(malformed)).not.toThrow();
      const result = validate(malformed);
      expect(result.errors.some((e) => e.message.includes('missing a "type"'))).toBe(true);
    });
  });
});
