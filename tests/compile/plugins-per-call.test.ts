/**
 * Per-call plugin API — `compile(src, { plugins })` and `createCompiler()`.
 *
 * These tests cover behaviours that ONLY the per-call path introduces:
 *   - A plugin passed inline (never via ambient `defineComponent`) compiles.
 *   - Per-call plugins do NOT leak to subsequent calls that omit them.
 *   - Two parallel `createCompiler()` instances coexist with different
 *     plugin sets (multi-instance — impossible with the global path).
 *   - The validator does not emit `UNKNOWN_COMPONENT` for per-call plugin
 *     types (extraKnownTypes is threaded correctly).
 *   - `compileFromJSON()` mirrors the same per-call plugin behaviour.
 *
 * Ambient-style `defineComponent()` coverage lives in
 * `tests/plugin/define-component.test.ts` — we don't re-test that path here.
 */

import { describe, it, expect } from 'vitest';
import {
  compile,
  compileFromJSON,
  createCompiler,
  type ComponentMetadata,
  type ComponentCompiler,
  type Plugin,
} from '../../src/index.js';
import type { MCNode } from '../../src/json/index.js';

// No global cleanup needed: after the plugin-as-values migration,
// `defineComponent()` returns a value with no global side effects, and
// per-call plugins live on the per-call `RegistryView`. Tests are
// naturally isolated.

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makePlugin(
  type: string,
  emit: (node: { attributes: Record<string, string> }) => string,
): Plugin {
  const metadata: ComponentMetadata = {
    description: `Test plugin ${type}.`,
    category: 'content',
    parent: 'mc-column',
    alternateParents: ['mc-section'],
    maxChildren: 0,
    allowsTextContent: false,
    compilerOutputElements: ['div'],
    compilerOutputReason: 'Test plugin output.',
    validClassCategories: [],
    commonMistakes: [],
    attributes: {},
  };
  const compileFn: ComponentCompiler = (node) => emit({ attributes: node.attributes });
  return {
    type,
    metadata,
    compile: compileFn,
  };
}

const TEMPLATE_USING = (pluginType: string): string => `
<mc>
  <mc-head><mc-preview>p</mc-preview></mc-head>
  <mc-body>
    <mc-section>
      <mc-column>
        <${pluginType} label="hi"></${pluginType}>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('compile(src, { plugins })', () => {
  it('compiles a plugin passed only per-call (never via defineComponent)', () => {
    const acme = makePlugin('acme-card', (n) => `<div class="acme">${n.attributes['label']}</div>`);
    const result = compile(TEMPLATE_USING('acme-card'), { plugins: [acme] });
    expect(result.errors).toEqual([]);
    expect(result.html).toContain('<div class="acme">hi</div>');
  });

  it('does NOT emit UNKNOWN_COMPONENT for per-call plugin types', () => {
    const acme = makePlugin('acme-card', () => `<div></div>`);
    const result = compile(TEMPLATE_USING('acme-card'), { plugins: [acme] });
    const unknown = [...result.errors, ...result.warnings].filter(
      (i) => i.code === 'UNKNOWN_COMPONENT',
    );
    expect(unknown).toEqual([]);
  });

  it('does NOT leak per-call plugins to a later call that omits them', () => {
    const acme = makePlugin('acme-leak', () => `<div data-leak></div>`);

    // Call 1: plugin present, compiles cleanly.
    const r1 = compile(TEMPLATE_USING('acme-leak'), { plugins: [acme] });
    expect(r1.html).toContain('data-leak');
    expect(r1.errors).toEqual([]);

    // Call 2: NO plugins option — should treat acme-leak as unknown.
    const r2 = compile(TEMPLATE_USING('acme-leak'));
    const unknown = [...r2.errors, ...r2.warnings].filter(
      (i) => i.code === 'UNKNOWN_COMPONENT' && i.message.includes('acme-leak'),
    );
    expect(unknown.length).toBeGreaterThan(0);
  });

  it('throws on a plugin whose type collides with a built-in', () => {
    const colliding = makePlugin('mc-section', () => `<table></table>`);
    // The view rejects built-in collisions at construction time, which
    // surfaces as an INTERNAL_ERROR with the built-in collision message.
    const result = compile(TEMPLATE_USING('mc-section'), { plugins: [colliding] });
    expect(result.html).toBeNull();
    expect(
      result.errors.some(
        (e) => e.code === 'INTERNAL_ERROR' && e.message.includes('built-in'),
      ),
    ).toBe(true);
  });

  it('last-write-wins when two plugins declare the same type in one call', () => {
    const first = makePlugin('acme-dup', () => `<div data-which="first"></div>`);
    const second = makePlugin('acme-dup', () => `<div data-which="second"></div>`);
    const result = compile(TEMPLATE_USING('acme-dup'), {
      plugins: [first, second],
    });
    expect(result.html).toContain('data-which="second"');
    expect(result.html).not.toContain('data-which="first"');
  });
});

describe('compileFromJSON(json, { plugins })', () => {
  it('compiles a plugin passed only per-call via JSON', () => {
    const acme = makePlugin('acme-tile', (n) => `<div class="tile">${n.attributes['x'] ?? ''}</div>`);
    const json: MCNode = {
      type: 'mc',
      children: [
        { type: 'mc-head', children: [{ type: 'mc-preview', content: 'p' }] },
        {
          type: 'mc-body',
          children: [
            {
              type: 'mc-section',
              children: [
                {
                  type: 'mc-column',
                  children: [{ type: 'acme-tile', attributes: { x: 'ok' } }],
                },
              ],
            },
          ],
        },
      ],
    };
    const result = compileFromJSON(json, { plugins: [acme] });
    expect(result.errors).toEqual([]);
    expect(result.html).toContain('<div class="tile">ok</div>');
  });
});

describe('createCompiler({ plugins })', () => {
  it('binds plugins once and reuses them across many compile calls', () => {
    const card = makePlugin('acme-bound', (n) => `<div data-label="${n.attributes['label']}"></div>`);
    const mailc = createCompiler({ plugins: [card] });

    const r1 = mailc.compile(TEMPLATE_USING('acme-bound').replace('hi', 'one'));
    const r2 = mailc.compile(TEMPLATE_USING('acme-bound').replace('hi', 'two'));

    expect(r1.html).toContain('data-label="one"');
    expect(r2.html).toContain('data-label="two"');
    expect(r1.errors).toEqual([]);
    expect(r2.errors).toEqual([]);
  });

  it('two compilers with different plugin sets coexist in the same process', () => {
    // The key multi-instance assertion. Impossible with the legacy global path —
    // both tenants would have to share one registry.
    const tenantA = makePlugin('a-card', () => `<div data-tenant="a"></div>`);
    const tenantB = makePlugin('b-card', () => `<div data-tenant="b"></div>`);

    const compilerA = createCompiler({ plugins: [tenantA] });
    const compilerB = createCompiler({ plugins: [tenantB] });

    const rA = compilerA.compile(TEMPLATE_USING('a-card'));
    const rB = compilerB.compile(TEMPLATE_USING('b-card'));

    expect(rA.html).toContain('data-tenant="a"');
    expect(rB.html).toContain('data-tenant="b"');
    expect(rA.errors).toEqual([]);
    expect(rB.errors).toEqual([]);

    // Cross-tenant isolation: compilerA cannot render b-card.
    const rCross = compilerA.compile(TEMPLATE_USING('b-card'));
    const unknown = [...rCross.errors, ...rCross.warnings].filter(
      (i) => i.code === 'UNKNOWN_COMPONENT' && i.message.includes('b-card'),
    );
    expect(unknown.length).toBeGreaterThan(0);
  });

  it('per-call plugins on the bound compiler REPLACE (not append) the bound set', () => {
    // Documented semantic from create-compiler.ts: per-call plugins replace
    // the bound set for that call. This locks in that contract so it can't
    // silently drift to "append" later.
    const bound = makePlugin('bound-card', () => `<div data-from="bound"></div>`);
    const adhoc = makePlugin('adhoc-card', () => `<div data-from="adhoc"></div>`);
    const mailc = createCompiler({ plugins: [bound] });

    // Per-call override: only adhoc is active, bound is gone.
    const r = mailc.compile(TEMPLATE_USING('adhoc-card'), { plugins: [adhoc] });
    expect(r.html).toContain('data-from="adhoc"');
    expect(r.errors).toEqual([]);

    // Trying to use bound-card with the override active should fail.
    const r2 = mailc.compile(TEMPLATE_USING('bound-card'), { plugins: [adhoc] });
    const unknown = [...r2.errors, ...r2.warnings].filter(
      (i) => i.code === 'UNKNOWN_COMPONENT' && i.message.includes('bound-card'),
    );
    expect(unknown.length).toBeGreaterThan(0);
  });
});
