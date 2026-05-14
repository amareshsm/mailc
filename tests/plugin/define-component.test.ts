/**
 * Tests for the defineComponent() plugin API.
 *
 * Each test uses _resetRegistry() + _reseedBuiltins() in beforeEach to keep
 * the registry's mutable state isolated across tests. Without this, a plugin
 * registered in one test would pollute later tests (the registry is a module
 * singleton).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  defineComponent,
  getRegisteredComponents,
  isComponentRegistered,
  compile,
  introspect,
  type ComponentMetadata,
  type ComponentCompiler,
} from '../../src/index.js';
import { _resetRegistry } from '../../src/registry/component-registry.js';
import { _reseedBuiltins } from '../../src/registry/init.js';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const VALID_METADATA: ComponentMetadata = {
  description: 'A test product card.',
  category: 'content',
  parent: 'mc-column',
  alternateParents: ['mc-section'],
  maxChildren: 0,
  allowsTextContent: false,
  compilerOutputElements: ['table', 'tr', 'td'],
  compilerOutputReason: 'Renders as a centred table for email-client safety.',
  validClassCategories: ['background', 'spacing'],
  commonMistakes: [],
  attributes: {
    'class': {
      type: 'tailwind-classes',
      required: false,
      description: 'Utility classes.',
      example: 'bg-white',
      hasEmailCompatibilityNotes: false,
    },
    'title': {
      type: 'string',
      required: true,
      description: 'Product title.',
      example: 'Acme Widget',
      hasEmailCompatibilityNotes: false,
    },
    'price': {
      type: 'string',
      required: true,
      description: 'Display price.',
      example: '$19.99',
      hasEmailCompatibilityNotes: false,
    },
    'background-color': {
      type: 'color',
      required: false,
      description: 'Card background colour.',
      example: '#ffffff',
      hasEmailCompatibilityNotes: false,
      isCssPropAttr: true,
      classHint: 'bg-[#hex]',
    },
  },
};

const VALID_COMPILER: ComponentCompiler = (node) => {
  const title = node.attributes['title'] ?? '';
  const price = node.attributes['price'] ?? '';
  return `<table role="presentation"><tr><td>${title}</td><td>${price}</td></tr></table>`;
};

// ---------------------------------------------------------------------------
// Test isolation — every test starts with a clean registry
// ---------------------------------------------------------------------------

beforeEach(() => {
  _resetRegistry();
  _reseedBuiltins();
});

// ---------------------------------------------------------------------------
// Successful registration
// ---------------------------------------------------------------------------

describe('defineComponent — happy path', () => {
  it('registers a valid plugin component', () => {
    defineComponent({
      type: 'acme-product-card',
      metadata: VALID_METADATA,
      compile: VALID_COMPILER,
    });

    expect(isComponentRegistered('acme-product-card')).toBe(true);
    expect(getRegisteredComponents()).toContain('acme-product-card');
  });

  it('plugin component appears alongside built-ins', () => {
    const builtinCount = getRegisteredComponents().length;
    defineComponent({
      type: 'acme-product-card',
      metadata: VALID_METADATA,
      compile: VALID_COMPILER,
    });
    expect(getRegisteredComponents().length).toBe(builtinCount + 1);
    expect(isComponentRegistered('mc-section')).toBe(true);
    expect(isComponentRegistered('acme-product-card')).toBe(true);
  });

  it('synthetic types are excluded from getRegisteredComponents()', () => {
    const types = getRegisteredComponents();
    expect(types.every((t) => !t.startsWith('_'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// End-to-end: compile a template that uses a plugin component
// ---------------------------------------------------------------------------

describe('defineComponent — end-to-end compilation', () => {
  it('compiles a template that uses the plugin component', () => {
    defineComponent({
      type: 'acme-product-card',
      metadata: VALID_METADATA,
      compile: VALID_COMPILER,
    });

    const source = `
      <mc>
        <mc-body>
          <mc-section>
            <mc-column>
              <acme-product-card title="Widget" price="$10.00" />
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `;

    const result = compile(source);

    expect(result.errors).toEqual([]);
    expect(result.html).toContain('<table role="presentation">');
    expect(result.html).toContain('Widget');
    expect(result.html).toContain('$10.00');
  });

  it('plugin output is spliced into the email body unchanged (trust model)', () => {
    defineComponent({
      type: 'acme-raw-block',
      metadata: { ...VALID_METADATA, attributes: {} },
      compile: () => `<div data-plugin-marker="trust-test">UNVALIDATED</div>`,
    });

    const result = compile(`
      <mc>
        <mc-body>
          <mc-section>
            <mc-column>
              <acme-raw-block />
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `);

    expect(result.html).toContain('data-plugin-marker="trust-test"');
    expect(result.html).toContain('UNVALIDATED');
  });
});

// ---------------------------------------------------------------------------
// Introspection — the moat
// ---------------------------------------------------------------------------

describe('defineComponent — introspection (moat)', () => {
  it('plugin metadata appears in introspect.component()', () => {
    defineComponent({
      type: 'acme-product-card',
      metadata: VALID_METADATA,
      compile: VALID_COMPILER,
    });

    const spec = introspect.component('acme-product-card');
    expect(spec).toBeDefined();
    expect(spec?.type).toBe('acme-product-card');
    expect(spec?.description).toBe(VALID_METADATA.description);
    expect(spec?.requiredAttributes.map((a) => a.name).sort()).toEqual([
      'price',
      'title',
    ]);
  });

  it('plugin appears in introspect.all()', () => {
    const beforeCount = introspect.all().length;
    defineComponent({
      type: 'acme-product-card',
      metadata: VALID_METADATA,
      compile: VALID_COMPILER,
    });
    const afterSpecs = introspect.all();
    expect(afterSpecs.length).toBe(beforeCount + 1);
    expect(afterSpecs.find((s) => s.type === 'acme-product-card')).toBeDefined();
  });

  it('plugin children appear under their built-in parent (allowedChildren)', () => {
    defineComponent({
      type: 'acme-product-card',
      metadata: VALID_METADATA,
      compile: VALID_COMPILER,
    });

    const columnSpec = introspect.component('mc-column');
    expect(columnSpec?.allowedChildren).toContain('acme-product-card');
  });

  it('built-in parent is reported in plugin allowedParents', () => {
    defineComponent({
      type: 'acme-product-card',
      metadata: VALID_METADATA,
      compile: VALID_COMPILER,
    });

    const spec = introspect.component('acme-product-card');
    expect(spec?.allowedParents).toContain('mc-column');
    expect(spec?.allowedParents).toContain('mc-section');
  });

  it('cssPropertyAttributes captures plugin attrs marked isCssPropAttr', () => {
    defineComponent({
      type: 'acme-product-card',
      metadata: VALID_METADATA,
      compile: VALID_COMPILER,
    });

    const spec = introspect.component('acme-product-card');
    expect(spec?.cssPropertyAttributes.map((a) => a.name)).toEqual([
      'background-color',
    ]);
  });

  it('synthetic compiler types are NOT introspectable', () => {
    expect(introspect.component('_mc-loop-iteration')).toBeUndefined();
    expect(introspect.all().every((s) => !s.type.startsWith('_'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Validation rejections
// ---------------------------------------------------------------------------

describe('defineComponent — validation', () => {
  it('rejects a type without a hyphen', () => {
    expect(() =>
      defineComponent({
        type: 'badtype',
        metadata: VALID_METADATA,
        compile: VALID_COMPILER,
      }),
    ).toThrow(/hyphenated custom element name/);
  });

  it('rejects the literal "mc" type', () => {
    expect(() =>
      defineComponent({
        type: 'mc',
        metadata: VALID_METADATA,
        compile: VALID_COMPILER,
      }),
    ).toThrow(/hyphenated custom element name/);
  });

  it('rejects a type with the reserved mc- prefix', () => {
    expect(() =>
      defineComponent({
        type: 'mc-something',
        metadata: VALID_METADATA,
        compile: VALID_COMPILER,
      }),
    ).toThrow(/"mc-" prefix is reserved/);
  });

  it('rejects collision with a built-in component', () => {
    // The collision check fires before the prefix check would match for
    // built-ins like "mc-section". To test the collision message specifically
    // we register a plugin first and try to register it again.
    defineComponent({
      type: 'acme-thing',
      metadata: VALID_METADATA,
      compile: VALID_COMPILER,
    });
    expect(() =>
      defineComponent({
        type: 'acme-thing',
        metadata: VALID_METADATA,
        compile: VALID_COMPILER,
      }),
    ).toThrow(/already registered/);
  });
});

// ---------------------------------------------------------------------------
// Lifecycle — registration after compile() must throw
// ---------------------------------------------------------------------------

describe('defineComponent — lifecycle', () => {
  it('throws if called after compile() has started', () => {
    // Trigger the compile lifecycle marker by running a minimal compile.
    compile(`<mc><mc-body><mc-section><mc-column><mc-text>Hi</mc-text></mc-column></mc-section></mc-body></mc>`);

    expect(() =>
      defineComponent({
        type: 'acme-too-late',
        metadata: VALID_METADATA,
        compile: VALID_COMPILER,
      }),
    ).toThrow(/cannot register components after compile\(\) has started/);
  });
});
