/**
 * Tests for the `defineComponent()` plugin API after the plugin-as-values
 * migration.
 *
 * The pre-migration API mutated a global registry on every call. The new
 * one is pure: `defineComponent(spec)` returns a `Plugin` value, and
 * `compile(src, { plugins })` (or `createCompiler({ plugins })`) opts the
 * plugin into a specific call. These tests pin the new contract.
 *
 * Per-call merge behaviour (precedence, last-write-wins, multi-instance,
 * UNKNOWN_COMPONENT suppression) is covered in
 * `tests/compile/plugins-per-call.test.ts` — we don't duplicate it here.
 */

import { describe, it, expect } from 'vitest';
import {
  defineComponent,
  getRegisteredComponents,
  isComponentRegistered,
  compile,
  introspect,
  type ComponentMetadata,
  type ComponentCompiler,
  type Plugin,
} from '../../src/index.js';

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
    class: {
      type: 'tailwind-classes',
      required: false,
      description: 'Utility classes.',
      example: 'bg-white',
      hasEmailCompatibilityNotes: false,
    },
    title: {
      type: 'string',
      required: true,
      description: 'Product title.',
      example: 'Acme Widget',
      hasEmailCompatibilityNotes: false,
    },
    price: {
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

const SOURCE_USING_PLUGIN = `
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

// ---------------------------------------------------------------------------
// Return shape — defineComponent is now pure
// ---------------------------------------------------------------------------

describe('defineComponent — returns a Plugin value', () => {
  it('returns a Plugin with type/metadata/compile fields', () => {
    const plugin = defineComponent({
      type: 'acme-product-card',
      metadata: VALID_METADATA,
      compile: VALID_COMPILER,
    });
    expect(plugin.type).toBe('acme-product-card');
    expect(plugin.metadata).toBe(VALID_METADATA);
    expect(plugin.compile).toBe(VALID_COMPILER);
  });

  it('returns a frozen Plugin — mutation throws in strict mode', () => {
    const plugin: Plugin = defineComponent({
      type: 'acme-frozen',
      metadata: VALID_METADATA,
      compile: VALID_COMPILER,
    });
    expect(Object.isFrozen(plugin)).toBe(true);
  });

  it('does NOT mutate any global registry (pure)', () => {
    // After Phase 3, defineComponent is side-effect-free. The
    // built-in-only `isComponentRegistered` must not see the plugin type
    // even after the call returns.
    const beforeBuiltins = getRegisteredComponents().length;
    defineComponent({
      type: 'acme-no-mutation',
      metadata: VALID_METADATA,
      compile: VALID_COMPILER,
    });
    expect(getRegisteredComponents().length).toBe(beforeBuiltins);
    expect(isComponentRegistered('acme-no-mutation')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// End-to-end: plugin compiles when passed per-call
// ---------------------------------------------------------------------------

describe('defineComponent — end-to-end compilation', () => {
  it('compiles a template that uses the plugin component (per-call)', () => {
    const plugin = defineComponent({
      type: 'acme-product-card',
      metadata: VALID_METADATA,
      compile: VALID_COMPILER,
    });

    const result = compile(SOURCE_USING_PLUGIN, { plugins: [plugin] });

    expect(result.errors).toEqual([]);
    expect(result.html).toContain('<table role="presentation">');
    expect(result.html).toContain('Widget');
    expect(result.html).toContain('$10.00');
  });

  it('plugin output is spliced into the email body unchanged (trust model)', () => {
    const plugin = defineComponent({
      type: 'acme-raw-block',
      metadata: { ...VALID_METADATA, attributes: {} },
      compile: () => `<div data-plugin-marker="trust-test">UNVALIDATED</div>`,
    });

    const result = compile(
      `
      <mc>
        <mc-body>
          <mc-section>
            <mc-column>
              <acme-raw-block />
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `,
      { plugins: [plugin] },
    );

    expect(result.html).toContain('data-plugin-marker="trust-test"');
    expect(result.html).toContain('UNVALIDATED');
  });
});

// ---------------------------------------------------------------------------
// Built-in-only introspection (per-call plugins have no global identity)
// ---------------------------------------------------------------------------

describe('introspect — built-in scope after migration', () => {
  it('introspect.component() returns built-in specs only', () => {
    const section = introspect.component('mc-section');
    expect(section).toBeDefined();
    expect(section?.type).toBe('mc-section');
  });

  it('introspect.component() returns undefined for plugin types — plugins are per-call values, not globally registered', () => {
    // Even after defineComponent, the type doesn't appear in global introspection.
    defineComponent({
      type: 'acme-not-introspectable',
      metadata: VALID_METADATA,
      compile: VALID_COMPILER,
    });
    expect(introspect.component('acme-not-introspectable')).toBeUndefined();
  });

  it('plugin metadata is accessed directly via the Plugin value', () => {
    // The replacement for `introspect.component(pluginType)` in the
    // per-call world: just read `plugin.metadata`.
    const plugin = defineComponent({
      type: 'acme-thing',
      metadata: VALID_METADATA,
      compile: VALID_COMPILER,
    });
    expect(plugin.metadata.description).toBe(VALID_METADATA.description);
    expect(plugin.metadata.attributes['title']?.required).toBe(true);
  });

  it('synthetic compiler types are NOT introspectable', () => {
    expect(introspect.component('_mc-loop-iteration')).toBeUndefined();
    expect(introspect.all().every((s) => !s.type.startsWith('_'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Validation — enforced at view-build time (compile call), not at defineComponent
// ---------------------------------------------------------------------------

describe('plugin validation (at compile time)', () => {
  // Validation happens inside `createRegistryView()` when the per-call
  // plugin set is built. compile() catches and surfaces as INTERNAL_ERROR
  // so callers never see an uncaught throw.

  it('rejects a type without a hyphen', () => {
    const bad = defineComponent({
      type: 'badtype',
      metadata: VALID_METADATA,
      compile: VALID_COMPILER,
    });
    const result = compile(SOURCE_USING_PLUGIN, { plugins: [bad] });
    expect(result.html).toBeNull();
    expect(
      result.errors.some((e) =>
        /hyphenated custom element name/.test(e.message),
      ),
    ).toBe(true);
  });

  it('rejects the literal "mc" type', () => {
    const bad = defineComponent({
      type: 'mc',
      metadata: VALID_METADATA,
      compile: VALID_COMPILER,
    });
    const result = compile(SOURCE_USING_PLUGIN, { plugins: [bad] });
    expect(result.html).toBeNull();
    expect(
      result.errors.some((e) =>
        /hyphenated custom element name/.test(e.message),
      ),
    ).toBe(true);
  });

  it('rejects a type with the reserved mc- prefix', () => {
    const bad = defineComponent({
      type: 'mc-something',
      metadata: VALID_METADATA,
      compile: VALID_COMPILER,
    });
    const result = compile(SOURCE_USING_PLUGIN, { plugins: [bad] });
    expect(result.html).toBeNull();
    expect(
      result.errors.some((e) => /"mc-" prefix is reserved/.test(e.message)),
    ).toBe(true);
  });

  it('rejects collision with a built-in component', () => {
    const colliding = defineComponent({
      type: 'mc-section', // collides with a built-in
      metadata: VALID_METADATA,
      compile: VALID_COMPILER,
    });
    const result = compile(SOURCE_USING_PLUGIN, { plugins: [colliding] });
    expect(result.html).toBeNull();
    // mc-section trips the reserved-prefix check first; either message
    // is acceptable proof that the bad spec was rejected.
    expect(
      result.errors.some((e) =>
        /built-in|"mc-" prefix is reserved/.test(e.message),
      ),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// No lifecycle constraint after the migration
// ---------------------------------------------------------------------------

describe('lifecycle — pure defineComponent has no ordering constraint', () => {
  it('can define a plugin after compile() has run (no global lock)', () => {
    // Run a compile to "start" the lifecycle (would throw pre-migration).
    compile(
      `<mc><mc-body><mc-section><mc-column><mc-text>Hi</mc-text></mc-column></mc-section></mc-body></mc>`,
    );
    // Should not throw — there's no global state to protect anymore.
    const plugin = defineComponent({
      type: 'acme-after-compile',
      metadata: VALID_METADATA,
      compile: VALID_COMPILER,
    });
    expect(plugin.type).toBe('acme-after-compile');
  });
});
