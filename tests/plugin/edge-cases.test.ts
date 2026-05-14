/**
 * Plugin API edge-case tests — covers behaviour that's harder to discover but
 * important to lock in:
 *
 *   - Plugin CSS-property attrs in class-strict mode (opt-in enforcement model)
 *   - Container-style plugins (children resolved before plugin runs)
 *   - Plugin-emitted warnings via ctx.warnings
 *   - Template-variable interpolation flows into plugin attrs
 *   - Plugins inside mc-for-each loops
 *   - Plugins compiled via compileFromJSON (JSON IR path)
 *   - Validator rejects plugin used under disallowed parent
 *   - mc-attributes type-wide defaults flow into plugin attrs
 *
 * Each test uses _resetRegistry() + _reseedBuiltins() in beforeEach so the
 * module-singleton registry is isolated.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  defineComponent,
  compile,
  compileFromJSON,
  introspect,
  ErrorCode,
  type ComponentMetadata,
  type ComponentCompiler,
  type CompileContext,
  type ASTNode,
  type MCIssue,
} from '../../src/index.js';
import { compileNode, getTextContent } from '../../src/compiler/index.js';
import { _resetRegistry } from '../../src/registry/component-registry.js';
import { _reseedBuiltins } from '../../src/registry/init.js';
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

const NOOP_COMPILER: ComponentCompiler = () => '<div data-test="noop"></div>';

beforeEach(() => {
  _resetRegistry();
  _reseedBuiltins();
});

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
    // Plugin compiler that does NOT call assertClassModeAttributes
    defineComponent({
      type: 'acme-passive-card',
      metadata: PLUGIN_METADATA,
      compile: () => '<div data-test="passive"></div>',
    });

    const result = compile(
      `<mc><mc-body><mc-section><mc-column>` +
        `<acme-passive-card background-color="#ff0000" />` +
        `</mc-column></mc-section></mc-body></mc>`,
    );

    // No CSS_ATTR_IN_CLASS_MODE warning fires because the plugin's compile
    // didn't call assertClassModeAttributes. This is the documented trust
    // model: plugins are responsible for their own class-mode enforcement.
    const cssAttrWarnings = [
      ...result.errors,
      ...result.warnings,
    ].filter((w) => w.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE);
    expect(cssAttrWarnings).toEqual([]);
  });

  it('DOES warn when plugin opts in by calling assertClassModeAttributes', () => {
    // Plugin compiler that opts into class-mode enforcement
    const pluginCompiler: ComponentCompiler = (node, ctx) => {
      assertClassModeAttributes(node, ctx);
      return '<div data-test="strict"></div>';
    };

    defineComponent({
      type: 'acme-strict-card',
      metadata: PLUGIN_METADATA,
      compile: pluginCompiler,
    });

    const result = compile(
      `<mc><mc-body><mc-section><mc-column>` +
        `<acme-strict-card background-color="#ff0000" />` +
        `</mc-column></mc-section></mc-body></mc>`,
      { templateStyle: 'class' },
    );

    const cssAttrErrors = result.errors.filter(
      (e) => e.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE,
    );
    expect(cssAttrErrors.length).toBe(1);
    expect(cssAttrErrors[0].message).toContain('background-color');
    expect(cssAttrErrors[0].message).toContain('acme-strict-card');
  });

  // Documented limitation — surfaced for awareness. attrToClassHint() reads
  // the static COMPONENT_METADATA, so plugin classHints don't appear in error
  // messages today. If we want them, attrToClassHint should switch to the
  // registry. Not blocking — the error still fires; only the hint is missing.
  it('plugin classHints are NOT yet surfaced in error messages (known limitation)', () => {
    const pluginCompiler: ComponentCompiler = (node, ctx) => {
      assertClassModeAttributes(node, ctx);
      return '<div></div>';
    };
    defineComponent({
      type: 'acme-hint-card',
      metadata: PLUGIN_METADATA,
      compile: pluginCompiler,
    });
    const result = compile(
      `<mc><mc-body><mc-section><mc-column>` +
        `<acme-hint-card background-color="#fff" />` +
        `</mc-column></mc-section></mc-body></mc>`,
      { templateStyle: 'class' },
    );
    const err = result.errors.find(
      (e) => e.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE,
    );
    // The metadata-defined classHint "bg-[#hex]" is NOT in the message
    // because attrToClassHint reads the static COMPONENT_METADATA.
    expect(err?.message).not.toContain('bg-[#hex]');
  });
});

// ---------------------------------------------------------------------------
// 4.2 — Container plugins (children resolve before plugin runs)
// ---------------------------------------------------------------------------

describe('container-style plugin (maxChildren > 0)', () => {
  it('children resolve normally; plugin composes plugin-child output', () => {
    // FINDING: built-in components have fixed `parent` constraints in their
    // metadata (e.g. mc-text requires parent: 'mc-column'). The validator
    // does NOT know that a plugin container can host them, so placing a
    // built-in directly inside a plugin produces an INVALID_NESTING warning
    // today. To compose with built-ins inside a container plugin, either
    //   - place the container plugin where its declared parent allows, AND
    //     have the plugin emit a wrapper that bridges to the built-ins via
    //     compileNode() — this works at runtime, but the validator still
    //     warns about the structural mismatch
    //   - register a sibling plugin (parent: 'acme-container') as the child
    // We test the second pattern below since it's the cleaner long-term fix.

    // Child plugin declares the container as its parent.
    defineComponent({
      type: 'acme-container-child',
      metadata: { ...BASE_METADATA, parent: 'acme-container' },
      compile: (node) => `<span data-child="${node.attributes['label'] ?? ''}">leaf</span>`,
    });

    // Container plugin recursively compiles its children.
    defineComponent({
      type: 'acme-container',
      metadata: { ...BASE_METADATA, maxChildren: Infinity },
      compile: (node, ctx) => {
        const inner = node.children.map((child) => compileNode(child, ctx)).join('');
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
    );

    expect(result.errors).toEqual([]);
    expect(result.html).toContain('data-test="container"');
    expect(result.html).toContain('data-child="A"');
    expect(result.html).toContain('data-child="B"');
  });

  it('LIMITATION: nesting built-ins inside a container plugin emits INVALID_NESTING (compile still produces output)', () => {
    // Documents the known limitation. The plugin runs and produces correct
    // HTML, but the validator's nesting check (driven by the built-in's
    // own metadata) doesn't know about the plugin parent.
    defineComponent({
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
    );

    // Validator complains about mc-text being outside mc-column.
    const nesting = result.errors.find((e) => e.code === ErrorCode.INVALID_NESTING);
    expect(nesting).toBeDefined();
    expect(nesting?.message).toContain('mc-text');
    // But output is still produced — the validator is non-fatal in liberal mode.
    expect(result.html).toContain('data-test="builtin-host"');
    expect(result.html).toContain('Hello from inside');
  });

  it('container plugin sees pre-resolved mc-for-each children (template stage runs first)', () => {
    const containerCompiler: ComponentCompiler = (node) => {
      // After template stage, the mc-for-each is gone — children are already
      // expanded. So node.children should be the EXPANDED set, not a single
      // mc-for-each wrapper.
      const childTypes = node.children.map((c) => c.type).join(',');
      return `<div data-children="${childTypes}"></div>`;
    };

    defineComponent({
      type: 'acme-loop-host',
      metadata: { ...BASE_METADATA, maxChildren: Infinity },
      compile: containerCompiler,
    });

    const result = compile(
      `<mc><mc-body><mc-section><mc-column>` +
        `<acme-loop-host>` +
        `<mc-for-each collection="items" as="item">` +
        `<mc-text>{{item}}</mc-text>` +
        `</mc-for-each>` +
        `</acme-loop-host>` +
        `</mc-column></mc-section></mc-body></mc>`,
      { data: { items: ['a', 'b', 'c'] } },
    );

    expect(result.errors).toEqual([]);
    // Three mc-text nodes after expansion.
    expect(result.html).toContain('data-children="mc-text,mc-text,mc-text"');
  });

  it('exposes child text via getTextContent helper (used by built-in compilers too)', () => {
    const compiler: ComponentCompiler = (node) => {
      const text = getTextContent(node).trim();
      return `<div data-text="${text}"></div>`;
    };

    defineComponent({
      type: 'acme-text-host',
      metadata: { ...BASE_METADATA, maxChildren: Infinity, allowsTextContent: true },
      compile: compiler,
    });

    const result = compile(
      `<mc><mc-body><mc-section><mc-column>` +
        `<acme-text-host>plain text inside</acme-text-host>` +
        `</mc-column></mc-section></mc-body></mc>`,
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
    const compiler: ComponentCompiler = (node, ctx: CompileContext) => {
      ctx.warnings.push({
        code: ErrorCode.UNSAFE_URL,
        message: 'Plugin says: this href smells fishy.',
        severity: 'warning',
        loc: node.loc
          ? { line: node.loc.start.line, col: node.loc.start.col }
          : undefined,
      });
      return '<div></div>';
    };

    defineComponent({
      type: 'acme-noisy',
      metadata: BASE_METADATA,
      compile: compiler,
    });

    const result = compile(
      `<mc><mc-body><mc-section><mc-column>` +
        `<acme-noisy />` +
        `</mc-column></mc-section></mc-body></mc>`,
    );

    expect(result.errors).toEqual([]);
    const pluginWarn = result.warnings.find(
      (w: MCIssue) => w.message === 'Plugin says: this href smells fishy.',
    );
    expect(pluginWarn).toBeDefined();
    expect(pluginWarn?.severity).toBe('warning');
  });

  it('LIMITATION: ctx has no `errors` array — plugins cannot directly gate compilation via partial=true', () => {
    // FINDING: CompileContext exposes `warnings: MCIssue[]` only. Plugins
    // pushing severity:'error' issues into ctx.warnings see them surface in
    // result.warnings, NOT result.errors. The compile pipeline only routes
    // CSS_ATTR_IN_CLASS_MODE warnings to errors today (see compile.ts:210-216).
    //
    // Workaround: a plugin that wants to gate compilation can `throw new
    // MCError({ code, message, severity: 'error' })`. mailc catches the
    // thrown MCError and adds it to result.errors, setting partial=true.
    const compiler: ComponentCompiler = (_node, ctx) => {
      ctx.warnings.push({
        code: ErrorCode.UNSAFE_URL,
        message: 'Plugin pushed a severity:error to ctx.warnings.',
        severity: 'error',
      });
      return '<div></div>';
    };

    defineComponent({
      type: 'acme-fatal',
      metadata: BASE_METADATA,
      compile: compiler,
    });

    const result = compile(
      `<mc><mc-body><mc-section><mc-column>` +
        `<acme-fatal />` +
        `</mc-column></mc-section></mc-body></mc>`,
    );

    // Without a special routing rule, severity:error in ctx.warnings ends up
    // in result.warnings rather than result.errors — partial stays false.
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
    const compiler: ComponentCompiler = (node) => {
      observedAttr = node.attributes['title'];
      return `<div data-title="${observedAttr ?? ''}"></div>`;
    };

    defineComponent({
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
      compile: compiler,
    });

    const result = compile(
      `<mc><mc-body><mc-section><mc-column>` +
        `<acme-titled title="Hello {{name}}" />` +
        `</mc-column></mc-section></mc-body></mc>`,
      { data: { name: 'world' } },
    );

    expect(result.errors).toEqual([]);
    // Plugin received the resolved value, not the raw `{{name}}`.
    expect(observedAttr).toBe('Hello world');
    expect(result.html).toContain('data-title="Hello world"');
  });
});

// ---------------------------------------------------------------------------
// 4.5 — Plugin inside mc-for-each loop
// ---------------------------------------------------------------------------

describe('plugin used inside mc-for-each', () => {
  it('plugin is invoked once per iteration with the iteration data', () => {
    const calls: string[] = [];
    const compiler: ComponentCompiler = (node) => {
      const t = node.attributes['title'] ?? '';
      calls.push(t);
      return `<div data-iter="${t}"></div>`;
    };

    defineComponent({
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
      compile: compiler,
    });

    const result = compile(
      `<mc><mc-body><mc-section><mc-column>` +
        `<mc-for-each collection="items" as="item">` +
        `<acme-iter title="{{item}}" />` +
        `</mc-for-each>` +
        `</mc-column></mc-section></mc-body></mc>`,
      { data: { items: ['one', 'two', 'three'] } },
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
    defineComponent({
      type: 'acme-json-block',
      metadata: BASE_METADATA,
      compile: (node) => `<div data-json="${node.attributes['flag'] ?? 'none'}"></div>`,
    });

    const result = compileFromJSON({
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
                      { type: 'acme-json-block', attributes: { flag: 'on' } },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    expect(result.errors).toEqual([]);
    expect(result.html).toContain('data-json="on"');
  });
});

// ---------------------------------------------------------------------------
// 4.7 — Validator rejects plugin used under disallowed parent
// ---------------------------------------------------------------------------

describe('validator nesting rules apply to plugins', () => {
  it('rejects plugin placed under a parent it did not declare', () => {
    defineComponent({
      type: 'acme-column-only',
      metadata: {
        ...BASE_METADATA,
        parent: 'mc-column',
        alternateParents: undefined, // ONLY mc-column allowed
      },
      compile: NOOP_COMPILER,
    });

    // Place it directly under mc-section (illegal — parent is mc-column only).
    const result = compile(
      `<mc><mc-body><mc-section>` +
        `<acme-column-only />` +
        `</mc-section></mc-body></mc>`,
    );

    // Validator should produce an error for invalid nesting.
    const nestingError = result.errors.find(
      (e) => e.code === ErrorCode.INVALID_NESTING,
    );
    expect(nestingError).toBeDefined();
    expect(nestingError?.message).toContain('acme-column-only');
  });

  it('accepts plugin placed under any of its declared alternateParents', () => {
    defineComponent({
      type: 'acme-flexible',
      metadata: {
        ...BASE_METADATA,
        parent: 'mc-column',
        alternateParents: ['mc-section'],
      },
      compile: NOOP_COMPILER,
    });

    // Direct child of mc-section is one of the alternateParents.
    const result = compile(
      `<mc><mc-body><mc-section>` +
        `<acme-flexible />` +
        `</mc-section></mc-body></mc>`,
    );

    const nestingErr = result.errors.find(
      (e) => e.code === ErrorCode.INVALID_NESTING,
    );
    expect(nestingErr).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 4.8 — mc-attributes type-wide defaults flow into plugin attrs
// ---------------------------------------------------------------------------

describe('mc-attributes defaults and plugin nodes', () => {
  it('plugin components are valid <mc-attributes> children — type-wide defaults flow to plugin instances', () => {
    // FIX: VALID_ATTRIBUTES_CHILDREN is now registry-backed (rebuilt on every
    // onRegistryChange), so plugin types are automatically included. The old
    // hardcoded set has been replaced.
    let seenColor: string | undefined;
    const compiler: ComponentCompiler = (node) => {
      seenColor = node.attributes['color'];
      return `<div></div>`;
    };

    defineComponent({
      type: 'acme-themed',
      metadata: {
        ...BASE_METADATA,
        attributes: {
          color: {
            type: 'color',
            required: false,
            description: 'Text colour.',
            example: '#000',
            default: '#000000',
            hasEmailCompatibilityNotes: false,
          },
        },
      },
      compile: compiler,
    });

    const result = compile(
      `<mc>` +
        `<mc-head><mc-attributes>` +
        `<acme-themed color="#ff8800" />` +
        `</mc-attributes></mc-head>` +
        `<mc-body><mc-section><mc-column>` +
        `<acme-themed />` +
        `</mc-column></mc-section></mc-body>` +
        `</mc>`,
    );

    // Validator no longer flags the plugin inside mc-attributes.
    expect(result.errors).toHaveLength(0);
    // The default IS now picked up by the plugin instance.
    expect(seenColor).toBe('#ff8800');
  });

  it('plugin can apply its own metadata `default` value inside compile() as a workaround', () => {
    // The recommended pattern: the plugin reads its own metadata default
    // inside compile() — no mc-attributes needed.
    let observedColor: string | undefined;
    const compiler: ComponentCompiler = (node) => {
      observedColor = node.attributes['color'] ?? '#defaultplum';
      return `<div data-color="${observedColor}"></div>`;
    };

    defineComponent({
      type: 'acme-self-defaulting',
      metadata: {
        ...BASE_METADATA,
        attributes: {
          color: {
            type: 'color',
            required: false,
            description: 'Text colour.',
            example: '#000',
            default: '#defaultplum',
            hasEmailCompatibilityNotes: false,
          },
        },
      },
      compile: compiler,
    });

    const result = compile(
      `<mc><mc-body><mc-section><mc-column>` +
        `<acme-self-defaulting />` +
        `</mc-column></mc-section></mc-body></mc>`,
    );

    expect(result.errors).toEqual([]);
    expect(observedColor).toBe('#defaultplum');
    expect(result.html).toContain('data-color="#defaultplum"');
  });
});

// ---------------------------------------------------------------------------
// 4.9 — Introspection: plugin appears in every introspection facet
// ---------------------------------------------------------------------------

describe('plugin coverage across the introspection surface', () => {
  beforeEach(() => {
    defineComponent({
      type: 'acme-introspect-target',
      metadata: BASE_METADATA,
      compile: NOOP_COMPILER,
    });
  });

  it('introspect.component returns the plugin spec', () => {
    expect(introspect.component('acme-introspect-target')).toBeDefined();
  });

  it('introspect.all includes the plugin', () => {
    expect(introspect.all().some((s) => s.type === 'acme-introspect-target')).toBe(true);
  });

  it('introspect.compilesTo returns the declared output elements', () => {
    const compilesTo = introspect.compilesTo('acme-introspect-target');
    expect(compilesTo?.outputElements).toEqual(['div']);
  });
});

// ---------------------------------------------------------------------------
// 4.10 — Recursion depth guard (safety net for buggy plugins)
// ---------------------------------------------------------------------------

describe('compileNode recursion depth guard', () => {
  it('catches infinite recursion from a self-recursing plugin and surfaces a clear error', () => {
    // A buggy plugin whose compile() always recurses on a node of its own
    // type. Without the depth guard, this would blow the JS call stack.
    const recursiveCompiler: ComponentCompiler = (node, ctx) => {
      // Synthesise a child of the same type and recurse — this is the
      // mistake pattern the depth guard exists to catch.
      const fakeChild: ASTNode = {
        type: node.type,
        attributes: {},
        children: [],
        loc: node.loc,
      } as ASTNode;
      return compileNode(fakeChild, ctx);
    };

    defineComponent({
      type: 'acme-loop-bug',
      metadata: { ...BASE_METADATA, maxChildren: Infinity },
      compile: recursiveCompiler,
    });

    const result = compile(
      `<mc><mc-body><mc-section><mc-column>` +
        `<acme-loop-bug />` +
        `</mc-column></mc-section></mc-body></mc>`,
    );

    // Compile should NOT crash with stack overflow — should produce a clean
    // MCError in result.errors with code MAX_RECURSION_DEPTH. Note: when an
    // MCError propagates all the way to the top of compile(), mailc returns
    // html=null and partial=false (full failure, not partial output). The
    // important guarantee is that the error is structured, not a stack
    // overflow.
    expect(result.html).toBeNull();
    const recursionErr = result.errors.find(
      (e) => e.code === ErrorCode.MAX_RECURSION_DEPTH,
    );
    expect(recursionErr).toBeDefined();
    expect(recursionErr?.message).toContain('acme-loop-bug');
    expect(recursionErr?.message).toContain('100');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Plugin throws a non-MCError exception (TypeError / ReferenceError / …)
  //
  // Plugin compile functions are third-party code. If one throws a generic
  // exception, the entire email compile must NOT crash. The exception is
  // converted to a structured PLUGIN_COMPILE_ERROR warning and a placeholder
  // HTML comment is emitted so the rest of the document still compiles.
  // ─────────────────────────────────────────────────────────────────────────

  it('plugin that throws a TypeError surfaces as PLUGIN_COMPILE_ERROR; rest of email still compiles', () => {
    defineComponent({
      type: 'acme-buggy',
      metadata: { ...BASE_METADATA, maxChildren: 0 },
      compile: () => {
        // Realistic plugin bug — reading a property of undefined.
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
    );

    // Compile must still produce HTML — surrounding mc-text nodes survive.
    expect(result.html).not.toBeNull();
    expect(result.html).toContain('Before');
    expect(result.html).toContain('After');

    // The thrown error surfaces as a structured PLUGIN_COMPILE_ERROR with
    // severity 'error', clearly attributing the bug to the plugin.
    const pluginErr = result.warnings.find(
      (w) => w.code === ErrorCode.PLUGIN_COMPILE_ERROR,
    );
    expect(pluginErr).toBeDefined();
    expect(pluginErr?.severity).toBe('error');
    expect(pluginErr?.message).toContain('acme-buggy');
    expect(pluginErr?.message).toContain('bug in the plugin, not in mailc');
  });

  it('plugin throwing a string (non-Error) is still wrapped cleanly', () => {
    defineComponent({
      type: 'acme-throws-string',
      metadata: { ...BASE_METADATA, maxChildren: 0 },
      compile: () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'something went wrong';
      },
    });

    const result = compile(
      `<mc><mc-body><mc-section><mc-column>` +
        `<acme-throws-string />` +
        `</mc-column></mc-section></mc-body></mc>`,
    );

    expect(result.html).not.toBeNull();
    const pluginErr = result.warnings.find(
      (w) => w.code === ErrorCode.PLUGIN_COMPILE_ERROR,
    );
    expect(pluginErr).toBeDefined();
    expect(pluginErr?.message).toContain('something went wrong');
  });
});
