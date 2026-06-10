/**
 * Plugin API edge-case tests — locks in behaviour around the per-call
 * `compile(src, { plugins })` API after the plugin-as-values migration:
 *
 *   - Plugin CSS-property attrs in class-strict mode (opt-in enforcement)
 *   - Container-style plugins (children resolved before plugin runs)
 *   - Plugin-emitted warnings via ctx.warnings
 *   - Template-variable interpolation flows into plugin attrs
 *   - Plugins inside mc-each loops
 *   - Plugins compiled via compileFromJSON (JSON IR path)
 *   - Recursion depth guard for buggy plugins
 *   - Non-MCError exceptions from plugins are wrapped cleanly
 *
 * Note: per-call plugins are NOT subject to rule-driven nesting validation
 * (the validator's COMPONENT_RULES table is built from built-ins only).
 * The legacy "validator rejects bad nesting for plugin types" cases were
 * removed with this migration — a per-call plugin's children are walked
 * without applying built-in nesting rules to the plugin node itself.
 * Plugins are responsible for validating their own structural constraints
 * inside `compile()`.
 */

import { describe, it, expect } from 'vitest';
import {
  defineComponent,
  compile,
  compileFromJSON,
  ErrorCode,
  type ComponentMetadata,
  type ComponentCompiler,
  type CompileContext,
  type ASTNode,
  type MCIssue,
} from '../../src/index.js';
import { compileNode, getTextContent } from '../../src/compiler/index.js';
import { assertClassModeAttributes } from '../../src/compiler/styling-mode.js';

// ---------------------------------------------------------------------------
// Shared base metadata (each test customises as needed)
// ---------------------------------------------------------------------------

const BASE_METADATA: ComponentMetadata = {
  description: 'Test plugin component.',
  category: 'content',
  parent: 'mc-column',
  alternateParents: ['mc-section'],
  maxChildren: 0,
  allowsTextContent: false,
  compilerOutputElements: ['div'],
  compilerOutputReason: 'Plain div for tests.',
  validClassCategories: [],
  commonMistakes: [],
  attributes: {},
};

// ---------------------------------------------------------------------------
// 4.1 — Plugin CSS-attr in class-strict mode
// ---------------------------------------------------------------------------

describe('plugin attrs in class-strict mode (opt-in enforcement)', () => {
  const PLUGIN_METADATA: ComponentMetadata = {
    ...BASE_METADATA,
    attributes: {
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

  it('does NOT auto-warn — class-mode enforcement is opt-in for plugin compilers', () => {
    const plugin = defineComponent({
      type: 'acme-passive-card',
      metadata: PLUGIN_METADATA,
      compile: () => '<div data-test="passive"></div>',
    });

    const result = compile(
      `<mc><mc-body><mc-section><mc-column>` +
        `<acme-passive-card background-color="#ff0000" />` +
        `</mc-column></mc-section></mc-body></mc>`,
      { plugins: [plugin] },
    );

    const cssAttrWarnings = [...result.errors, ...result.warnings].filter(
      (w) => w.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE,
    );
    expect(cssAttrWarnings).toEqual([]);
  });

  it('DOES warn when plugin opts in by calling assertClassModeAttributes', () => {
    const plugin = defineComponent({
      type: 'acme-strict-card',
      metadata: PLUGIN_METADATA,
      compile: (node, ctx) => {
        assertClassModeAttributes(node, ctx);
        return '<div data-test="strict"></div>';
      },
    });

    const result = compile(
      `<mc><mc-body><mc-section><mc-column>` +
        `<acme-strict-card background-color="#ff0000" />` +
        `</mc-column></mc-section></mc-body></mc>`,
      { plugins: [plugin], templateStyle: 'class' },
    );

    const cssAttrErrors = result.errors.filter(
      (e) => e.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE,
    );
    expect(cssAttrErrors.length).toBe(1);
    expect(cssAttrErrors[0].message).toContain('background-color');
    expect(cssAttrErrors[0].message).toContain('acme-strict-card');
  });

  it('plugin classHints ARE surfaced in error messages (now per-call-aware)', () => {
    // After the plugin-as-values migration, assertClassModeAttributes
    // reads plugin metadata from context.registry, so per-call plugin
    // classHints flow into the error message — same parity as built-ins.
    const plugin = defineComponent({
      type: 'acme-hint-card',
      metadata: PLUGIN_METADATA,
      compile: (node, ctx) => {
        assertClassModeAttributes(node, ctx);
        return '<div></div>';
      },
    });
    const result = compile(
      `<mc><mc-body><mc-section><mc-column>` +
        `<acme-hint-card background-color="#fff" />` +
        `</mc-column></mc-section></mc-body></mc>`,
      { plugins: [plugin], templateStyle: 'class' },
    );
    const err = result.errors.find(
      (e) => e.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE,
    );
    expect(err?.message).toContain('bg-[#hex]');
  });
});

// ---------------------------------------------------------------------------
// 4.2 — Container plugins (children resolve before plugin runs)
// ---------------------------------------------------------------------------

describe('container-style plugin (maxChildren > 0)', () => {
  it('children resolve normally; container plugin composes plugin-child output', () => {
    const child = defineComponent({
      type: 'acme-container-child',
      metadata: { ...BASE_METADATA, parent: 'acme-container' },
      compile: (node) =>
        `<span data-child="${node.attributes['label'] ?? ''}">leaf</span>`,
    });

    const container = defineComponent({
      type: 'acme-container',
      metadata: { ...BASE_METADATA, maxChildren: Infinity },
      compile: (node, ctx) => {
        const inner = node.children.map((c) => compileNode(c, ctx)).join('');
        return `<table data-test="container"><tr><td>${inner}</td></tr></table>`;
      },
    });

    const result = compile(
      `<mc><mc-body><mc-section><mc-column>` +
        `<acme-container>` +
        `<acme-container-child label="A" />` +
        `<acme-container-child label="B" />` +
        `</acme-container>` +
        `</mc-column></mc-section></mc-body></mc>`,
      { plugins: [child, container] },
    );

    expect(result.errors).toEqual([]);
    expect(result.html).toContain('data-test="container"');
    expect(result.html).toContain('data-child="A"');
    expect(result.html).toContain('data-child="B"');
  });

  it('LIMITATION: nesting built-ins inside a container plugin emits INVALID_NESTING (compile still produces output)', () => {
    const host = defineComponent({
      type: 'acme-builtin-host',
      metadata: { ...BASE_METADATA, maxChildren: Infinity },
      compile: (node, ctx) => {
        const inner = node.children.map((c) => compileNode(c, ctx)).join('');
        return `<table data-test="builtin-host"><tr><td>${inner}</td></tr></table>`;
      },
    });

    const result = compile(
      `<mc><mc-body><mc-section><mc-column>` +
        `<acme-builtin-host>` +
        `<mc-text>Hello from inside</mc-text>` +
        `</acme-builtin-host>` +
        `</mc-column></mc-section></mc-body></mc>`,
      { plugins: [host] },
    );

    const nesting = result.errors.find(
      (e) => e.code === ErrorCode.INVALID_NESTING,
    );
    expect(nesting).toBeDefined();
    expect(nesting?.message).toContain('mc-text');
    expect(result.html).toContain('data-test="builtin-host"');
    expect(result.html).toContain('Hello from inside');
  });

  it('container plugin sees pre-resolved mc-each children (template stage runs first)', () => {
    const containerCompiler: ComponentCompiler = (node) => {
      const childTypes = node.children.map((c) => c.type).join(',');
      return `<div data-children="${childTypes}"></div>`;
    };

    const plugin = defineComponent({
      type: 'acme-loop-host',
      metadata: { ...BASE_METADATA, maxChildren: Infinity },
      compile: containerCompiler,
    });

    const result = compile(
      `<mc><mc-body><mc-section><mc-column>` +
        `<acme-loop-host>` +
        `<mc-each items="items" as="item">` +
        `<mc-text>{{item}}</mc-text>` +
        `</mc-each>` +
        `</acme-loop-host>` +
        `</mc-column></mc-section></mc-body></mc>`,
      { plugins: [plugin], data: { items: ['a', 'b', 'c'] } },
    );

    expect(result.errors).toEqual([]);
    expect(result.html).toContain('data-children="mc-text,mc-text,mc-text"');
  });

  it('exposes child text via getTextContent helper (used by built-in compilers too)', () => {
    const plugin = defineComponent({
      type: 'acme-text-host',
      metadata: {
        ...BASE_METADATA,
        maxChildren: Infinity,
        allowsTextContent: true,
      },
      compile: (node) => {
        const text = getTextContent(node).trim();
        return `<div data-text="${text}"></div>`;
      },
    });

    const result = compile(
      `<mc><mc-body><mc-section><mc-column>` +
        `<acme-text-host>plain text inside</acme-text-host>` +
        `</mc-column></mc-section></mc-body></mc>`,
      { plugins: [plugin] },
    );

    expect(result.errors).toEqual([]);
    expect(result.html).toContain('data-text="plain text inside"');
  });
});

// ---------------------------------------------------------------------------
// 4.3 — Plugin warnings via ctx.warnings
// ---------------------------------------------------------------------------

describe('plugin warnings via ctx.warnings', () => {
  it('warnings pushed by plugin surface in result.warnings', () => {
    const plugin = defineComponent({
      type: 'acme-noisy',
      metadata: BASE_METADATA,
      compile: (node, ctx: CompileContext) => {
        ctx.warnings.push({
          code: ErrorCode.UNSAFE_URL,
          message: 'Plugin says: this href smells fishy.',
          severity: 'warning',
          loc: node.loc
            ? { line: node.loc.start.line, col: node.loc.start.col }
            : undefined,
        });
        return '<div></div>';
      },
    });

    const result = compile(
      `<mc><mc-body><mc-section><mc-column>` +
        `<acme-noisy />` +
        `</mc-column></mc-section></mc-body></mc>`,
      { plugins: [plugin] },
    );

    expect(result.errors).toEqual([]);
    const pluginWarn = result.warnings.find(
      (w: MCIssue) => w.message === 'Plugin says: this href smells fishy.',
    );
    expect(pluginWarn).toBeDefined();
    expect(pluginWarn?.severity).toBe('warning');
  });

  it('LIMITATION: ctx has no `errors` array — plugins cannot directly gate compilation via partial=true', () => {
    const plugin = defineComponent({
      type: 'acme-fatal',
      metadata: BASE_METADATA,
      compile: (_node, ctx) => {
        ctx.warnings.push({
          code: ErrorCode.UNSAFE_URL,
          message: 'Plugin pushed a severity:error to ctx.warnings.',
          severity: 'error',
        });
        return '<div></div>';
      },
    });

    const result = compile(
      `<mc><mc-body><mc-section><mc-column>` +
        `<acme-fatal />` +
        `</mc-column></mc-section></mc-body></mc>`,
      { plugins: [plugin] },
    );

    expect(result.partial).toBe(false);
    const inWarnings = result.warnings.some(
      (w) => w.message === 'Plugin pushed a severity:error to ctx.warnings.',
    );
    const inErrors = result.errors.some(
      (e) => e.message === 'Plugin pushed a severity:error to ctx.warnings.',
    );
    expect(inWarnings).toBe(true);
    expect(inErrors).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4.4 — Template variable interpolation in plugin attributes
// ---------------------------------------------------------------------------

describe('template variable interpolation in plugin attrs', () => {
  it('{{vars}} are resolved BEFORE the plugin compile sees them', () => {
    let observedAttr: string | undefined;
    const plugin = defineComponent({
      type: 'acme-titled',
      metadata: {
        ...BASE_METADATA,
        attributes: {
          title: {
            type: 'string',
            required: false,
            description: 'Title.',
            example: 'Hi',
            hasEmailCompatibilityNotes: false,
          },
        },
      },
      compile: (node) => {
        observedAttr = node.attributes['title'];
        return `<div data-title="${observedAttr ?? ''}"></div>`;
      },
    });

    const result = compile(
      `<mc><mc-body><mc-section><mc-column>` +
        `<acme-titled title="Hello {{name}}" />` +
        `</mc-column></mc-section></mc-body></mc>`,
      { plugins: [plugin], data: { name: 'world' } },
    );

    expect(result.errors).toEqual([]);
    expect(observedAttr).toBe('Hello world');
    expect(result.html).toContain('data-title="Hello world"');
  });
});

// ---------------------------------------------------------------------------
// 4.5 — Plugin inside mc-each loop
// ---------------------------------------------------------------------------

describe('plugin used inside mc-each', () => {
  it('plugin is invoked once per iteration with the iteration data', () => {
    const calls: string[] = [];
    const plugin = defineComponent({
      type: 'acme-iter',
      metadata: {
        ...BASE_METADATA,
        attributes: {
          title: {
            type: 'string',
            required: false,
            description: 'Title.',
            example: 'Hi',
            hasEmailCompatibilityNotes: false,
          },
        },
      },
      compile: (node) => {
        const t = node.attributes['title'] ?? '';
        calls.push(t);
        return `<div data-iter="${t}"></div>`;
      },
    });

    const result = compile(
      `<mc><mc-body><mc-section><mc-column>` +
        `<mc-each items="items" as="item">` +
        `<acme-iter title="{{item}}" />` +
        `</mc-each>` +
        `</mc-column></mc-section></mc-body></mc>`,
      { plugins: [plugin], data: { items: ['one', 'two', 'three'] } },
    );

    expect(result.errors).toEqual([]);
    expect(calls).toEqual(['one', 'two', 'three']);
    expect(result.html).toContain('data-iter="one"');
    expect(result.html).toContain('data-iter="two"');
    expect(result.html).toContain('data-iter="three"');
  });
});

// ---------------------------------------------------------------------------
// 4.6 — Plugin via compileFromJSON
// ---------------------------------------------------------------------------

describe('plugin via compileFromJSON (JSON IR path)', () => {
  it('JSON IR dispatches to the plugin compiler', () => {
    const plugin = defineComponent({
      type: 'acme-json-block',
      metadata: BASE_METADATA,
      compile: (node) =>
        `<div data-json="${node.attributes['flag'] ?? 'none'}"></div>`,
    });

    const result = compileFromJSON(
      {
        version: 1,
        metadata: { id: 't1', name: 'Test', created: '', updated: '' },
        template: {
          type: 'mc',
          attributes: {},
          children: [
            {
              type: 'mc-body',
              attributes: {},
              children: [
                {
                  type: 'mc-section',
                  attributes: {},
                  children: [
                    {
                      type: 'mc-column',
                      attributes: {},
                      children: [
                        {
                          type: 'acme-json-block',
                          attributes: { flag: 'on' },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      { plugins: [plugin] },
    );

    expect(result.errors).toEqual([]);
    expect(result.html).toContain('data-json="on"');
  });
});

// ---------------------------------------------------------------------------
// 4.7 — Recursion depth guard (safety net for buggy plugins)
// ---------------------------------------------------------------------------

describe('compileNode recursion depth guard', () => {
  it('catches infinite recursion from a self-recursing plugin and surfaces a clear error', () => {
    const plugin = defineComponent({
      type: 'acme-loop-bug',
      metadata: { ...BASE_METADATA, maxChildren: Infinity },
      compile: (node, ctx) => {
        // Synthesise a child of the same type and recurse — exactly the
        // mistake the depth guard exists to catch.
        const fakeChild: ASTNode = {
          type: node.type,
          attributes: {},
          children: [],
          content: [],
          loc: node.loc,
        };
        return compileNode(fakeChild, ctx);
      },
    });

    const result = compile(
      `<mc><mc-body><mc-section><mc-column>` +
        `<acme-loop-bug />` +
        `</mc-column></mc-section></mc-body></mc>`,
      { plugins: [plugin] },
    );

    expect(result.html).toBeNull();
    const recursionErr = result.errors.find(
      (e) => e.code === ErrorCode.MAX_RECURSION_DEPTH,
    );
    expect(recursionErr).toBeDefined();
    expect(recursionErr?.message).toContain('acme-loop-bug');
    expect(recursionErr?.message).toContain('100');
  });

  it('plugin that throws a TypeError surfaces as PLUGIN_COMPILE_ERROR; rest of email still compiles', () => {
    const plugin = defineComponent({
      type: 'acme-buggy',
      metadata: { ...BASE_METADATA, maxChildren: 0 },
      compile: () => {
        const broken = undefined as unknown as { x: string };
        return broken.x;
      },
    });

    const result = compile(
      `<mc><mc-body><mc-section><mc-column>` +
        `<mc-text>Before</mc-text>` +
        `<acme-buggy />` +
        `<mc-text>After</mc-text>` +
        `</mc-column></mc-section></mc-body></mc>`,
      { plugins: [plugin] },
    );

    expect(result.html).not.toBeNull();
    expect(result.html).toContain('Before');
    expect(result.html).toContain('After');

    const pluginErr = result.warnings.find(
      (w) => w.code === ErrorCode.PLUGIN_COMPILE_ERROR,
    );
    expect(pluginErr).toBeDefined();
    expect(pluginErr?.severity).toBe('error');
    expect(pluginErr?.message).toContain('acme-buggy');
    expect(pluginErr?.message).toContain('bug in the plugin, not in mailc');
  });

  it('plugin throwing a string (non-Error) is still wrapped cleanly', () => {
    const plugin = defineComponent({
      type: 'acme-throws-string',
      metadata: { ...BASE_METADATA, maxChildren: 0 },
      compile: () => {
        throw 'something went wrong';
      },
    });

    const result = compile(
      `<mc><mc-body><mc-section><mc-column>` +
        `<acme-throws-string />` +
        `</mc-column></mc-section></mc-body></mc>`,
      { plugins: [plugin] },
    );

    expect(result.html).not.toBeNull();
    const pluginErr = result.warnings.find(
      (w) => w.code === ErrorCode.PLUGIN_COMPILE_ERROR,
    );
    expect(pluginErr).toBeDefined();
    expect(pluginErr?.message).toContain('something went wrong');
  });
});

// ---------------------------------------------------------------------------
// 4.8 — Per-call plugins receive the SAME rule-based validation as built-ins
//
// Regression suite covering two bugs found post-migration: per-call plugins
// were silently skipping nesting + required-attribute validation. The
// validator now derives a ComponentRule from each plugin's metadata at the
// top of `validate()` so every rule that applies to built-ins also applies
// to plugins.
// ---------------------------------------------------------------------------

describe('per-call plugin: nesting rules from metadata are enforced', () => {
  it('plugin used under a parent NOT in its metadata is flagged INVALID_NESTING', () => {
    const card = defineComponent({
      type: 'acme-strict-card',
      metadata: {
        ...BASE_METADATA,
        parent: 'mc-column',
        alternateParents: [],
      },
      compile: () => '<div data-card/>',
    });

    // Placed directly under <mc-section>, skipping the required <mc-column>.
    const result = compile(
      `<mc><mc-body><mc-section><acme-strict-card/></mc-section></mc-body></mc>`,
      { plugins: [card] },
    );

    const nestingErr = result.errors.find(
      (e) => e.code === ErrorCode.INVALID_NESTING,
    );
    expect(nestingErr).toBeDefined();
    expect(nestingErr?.message).toContain('acme-strict-card');
    expect(nestingErr?.message).toContain('mc-column');
  });

  it('plugin used under an alternateParent is accepted (no INVALID_NESTING)', () => {
    const card = defineComponent({
      type: 'acme-flexible-card',
      metadata: {
        ...BASE_METADATA,
        parent: 'mc-column',
        alternateParents: ['mc-section'],
      },
      compile: () => '<div data-card/>',
    });

    const result = compile(
      `<mc><mc-body><mc-section><acme-flexible-card/></mc-section></mc-body></mc>`,
      { plugins: [card] },
    );

    const nestingErr = result.errors.find(
      (e) => e.code === ErrorCode.INVALID_NESTING,
    );
    expect(nestingErr).toBeUndefined();
    expect(result.html).toContain('data-card');
  });

  it('parity through compileFromJSON — nesting rules also apply to JSON IR input', () => {
    const card = defineComponent({
      type: 'acme-json-strict',
      metadata: {
        ...BASE_METADATA,
        parent: 'mc-column',
        alternateParents: [],
      },
      compile: () => '<div/>',
    });

    // <acme-json-strict> placed directly under <mc-section> in JSON.
    const result = compileFromJSON(
      {
        type: 'mc',
        attributes: {},
        children: [
          {
            type: 'mc-body',
            attributes: {},
            children: [
              {
                type: 'mc-section',
                attributes: {},
                children: [{ type: 'acme-json-strict', attributes: {} }],
              },
            ],
          },
        ],
      },
      { plugins: [card] },
    );

    const nestingErr = result.errors.find(
      (e) => e.code === ErrorCode.INVALID_NESTING,
    );
    expect(nestingErr).toBeDefined();
    expect(nestingErr?.message).toContain('acme-json-strict');
  });
});

describe('per-call plugin: required attributes from metadata are enforced', () => {
  it('plugin missing a metadata-declared required attribute emits MISSING_ATTRIBUTE', () => {
    const card = defineComponent({
      type: 'acme-needs-title',
      metadata: {
        ...BASE_METADATA,
        attributes: {
          title: {
            type: 'string',
            required: true,
            description: 'Required.',
            example: 'Welcome',
            hasEmailCompatibilityNotes: false,
          },
        },
      },
      compile: (node) =>
        `<div data-title="${node.attributes['title'] ?? ''}"/>`,
    });

    // <acme-needs-title /> without the required `title` attr.
    const result = compile(
      `<mc><mc-body><mc-section><mc-column>` +
        `<acme-needs-title/>` +
        `</mc-column></mc-section></mc-body></mc>`,
      { plugins: [card] },
    );

    const missing = result.errors.find(
      (e) => e.code === ErrorCode.MISSING_ATTRIBUTE,
    );
    expect(missing).toBeDefined();
    expect(missing?.message).toContain('acme-needs-title');
    expect(missing?.message).toContain('title');
  });

  it('all required attributes present → no MISSING_ATTRIBUTE error', () => {
    const card = defineComponent({
      type: 'acme-needs-many',
      metadata: {
        ...BASE_METADATA,
        attributes: {
          title: { type: 'string', required: true, description: 't', example: 't', hasEmailCompatibilityNotes: false },
          href: { type: 'url', required: true, description: 't', example: 'https://x.com', hasEmailCompatibilityNotes: false },
        },
      },
      compile: () => '<div/>',
    });

    const result = compile(
      `<mc><mc-body><mc-section><mc-column>` +
        `<acme-needs-many title="ok" href="https://example.com"/>` +
        `</mc-column></mc-section></mc-body></mc>`,
      { plugins: [card] },
    );

    expect(
      result.errors.some((e) => e.code === ErrorCode.MISSING_ATTRIBUTE),
    ).toBe(false);
    // Plugin compiled to a self-closing div — exact serialisation may vary
    // (`<div/>` vs `<div></div>`); the important assertion is "no missing-attr
    // error" above. Loose check that the plugin output reached the HTML:
    expect(result.html).toMatch(/<div/);
  });

  it('parity through compileFromJSON — required attrs also enforced on JSON IR', () => {
    const card = defineComponent({
      type: 'acme-json-needs',
      metadata: {
        ...BASE_METADATA,
        attributes: {
          title: {
            type: 'string',
            required: true,
            description: 'Required.',
            example: 't',
            hasEmailCompatibilityNotes: false,
          },
        },
      },
      compile: () => '<div/>',
    });

    const result = compileFromJSON(
      {
        type: 'mc',
        attributes: {},
        children: [
          {
            type: 'mc-body',
            attributes: {},
            children: [
              {
                type: 'mc-section',
                attributes: {},
                children: [
                  {
                    type: 'mc-column',
                    attributes: {},
                    children: [{ type: 'acme-json-needs', attributes: {} }],
                  },
                ],
              },
            ],
          },
        ],
      },
      { plugins: [card] },
    );

    const missing = result.errors.find(
      (e) => e.code === ErrorCode.MISSING_ATTRIBUTE,
    );
    expect(missing).toBeDefined();
    expect(missing?.message).toContain('acme-json-needs');
    expect(missing?.message).toContain('title');
  });
});

describe('per-call plugin: valid as <mc-attributes> child for type-wide defaults', () => {
  // After the plugin-as-values migration, per-call plugin types are
  // accepted inside <mc-attributes> when their metadata category permits
  // it (content / container / custom — not head, not logic). This mirrors
  // the eligibility built-ins receive via VALID_ATTRIBUTES_CHILDREN.

  it('content-category plugin is a valid <mc-attributes> child', () => {
    const themed = defineComponent({
      type: 'acme-themed',
      metadata: {
        ...BASE_METADATA,
        category: 'content',
        attributes: {
          color: {
            type: 'color',
            required: false,
            description: 'Color.',
            example: '#000',
            hasEmailCompatibilityNotes: false,
          },
        },
      },
      compile: (node) =>
        `<div data-color="${node.attributes['color'] ?? ''}"/>`,
    });

    const result = compile(
      `<mc>
        <mc-head><mc-attributes><acme-themed color="#ff0000"/></mc-attributes></mc-head>
        <mc-body><mc-section><mc-column>
          <acme-themed/>
        </mc-column></mc-section></mc-body>
      </mc>`,
      { plugins: [themed] },
    );

    // No INVALID_ATTRIBUTES_CHILD / INVALID_NESTING for the plugin spec.
    expect(
      result.errors.some(
        (e) =>
          e.code === ErrorCode.INVALID_ATTRIBUTES_CHILD ||
          (e.code === ErrorCode.INVALID_NESTING &&
            e.message.includes('mc-attributes')),
      ),
    ).toBe(false);
    // mc-attributes default flows into the plugin instance below.
    expect(result.html).toContain('data-color="#ff0000"');
  });

  it('logic-category plugin is REJECTED as <mc-attributes> child', () => {
    const logicPlugin = defineComponent({
      type: 'acme-logic',
      metadata: { ...BASE_METADATA, category: 'logic' },
      compile: () => '<div/>',
    });
    const result = compile(
      `<mc><mc-head><mc-attributes><acme-logic/></mc-attributes></mc-head>` +
        `<mc-body><mc-section><mc-column><mc-text>x</mc-text></mc-column></mc-section></mc-body></mc>`,
      { plugins: [logicPlugin] },
    );
    expect(
      result.errors.some(
        (e) => e.code === ErrorCode.INVALID_ATTRIBUTES_CHILD,
      ),
    ).toBe(true);
  });

  it('same eligibility through compileFromJSON', () => {
    const themed = defineComponent({
      type: 'acme-themed-json',
      metadata: { ...BASE_METADATA, category: 'content' },
      compile: () => '<div/>',
    });
    const result = compileFromJSON(
      {
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
                children: [{ type: 'acme-themed-json', attributes: {} }],
              },
            ],
          },
          {
            type: 'mc-body',
            attributes: {},
            children: [
              {
                type: 'mc-section',
                attributes: {},
                children: [
                  {
                    type: 'mc-column',
                    attributes: {},
                    children: [{ type: 'mc-text', content: 'x' }],
                  },
                ],
              },
            ],
          },
        ],
      },
      { plugins: [themed] },
    );
    expect(
      result.errors.some(
        (e) =>
          e.code === ErrorCode.INVALID_NESTING &&
          e.message.includes('mc-attributes'),
      ),
    ).toBe(false);
  });
});

describe('per-call plugin: unknown attributes from metadata are flagged', () => {
  it('attribute not declared in plugin metadata produces UNKNOWN_ATTRIBUTE warning', () => {
    const card = defineComponent({
      type: 'acme-typed-card',
      metadata: {
        ...BASE_METADATA,
        attributes: {
          color: {
            type: 'color',
            required: false,
            description: 'Color.',
            example: '#fff',
            hasEmailCompatibilityNotes: false,
          },
        },
      },
      compile: () => '<div/>',
    });

    // `colour` (British spelling) is not in the plugin's metadata — should warn.
    const result = compile(
      `<mc><mc-body><mc-section><mc-column>` +
        `<acme-typed-card colour="#ff0000"/>` +
        `</mc-column></mc-section></mc-body></mc>`,
      { plugins: [card] },
    );

    const unknownAttr = result.warnings.find(
      (w) => w.code === ErrorCode.UNKNOWN_ATTRIBUTE,
    );
    expect(unknownAttr).toBeDefined();
    expect(unknownAttr?.message).toContain('colour');
  });
});
