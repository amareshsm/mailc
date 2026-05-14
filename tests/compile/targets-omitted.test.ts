/**
 * End-to-end tests for the "no client gating" path of `compile()` /
 * `compileFromJSON()` — what happens when the caller omits `targetClients`.
 *
 * Path under test: `targetClients === undefined` → `buildPassthroughMap()`
 * → classifier short-circuits to SAFE for ENHANCE properties (but still
 * runs ALWAYS_BREAKING / ALWAYS_NO_EFFECT).
 *
 * Contrast in strict mode:
 *   - `targetClients: 'default'` + strict → ENHANCE properties (e.g.
 *     box-shadow from `shadow-2xl`) are stripped with
 *     `ENHANCE_PROPERTY_STRIPPED`.
 *   - omitted targetClients + strict       → same property is SAFE → no
 *     strip, no warning.
 */
import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compile.js';
import { compileFromJSON } from '../../src/json/index.js';
import { ErrorCode } from '../../src/errors/codes.js';

const SHADOW_DOC = `<mc>
  <mc-head><mc-title>T</mc-title></mc-head>
  <mc-body>
    <mc-section>
      <mc-column class="shadow-2xl">
        <mc-text>Hi</mc-text>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`;

describe('compile() — omitted targetClients (passthrough)', () => {
  it("baseline: strict mode WITH targetClients:'default' strips box-shadow + warns", () => {
    const r = compile(SHADOW_DOC, {
      compatibilityMode: 'strict',
      targetClients: 'default',
      templateStyle: 'class',
    });
    expect(r.html).not.toContain('box-shadow');
    const warn = r.warnings.find((w) => w.code === ErrorCode.ENHANCE_PROPERTY_STRIPPED);
    expect(warn).toBeDefined();
  });

  it('passthrough: strict mode WITHOUT targetClients keeps box-shadow + no warning', () => {
    const r = compile(SHADOW_DOC, { compatibilityMode: 'strict', templateStyle: 'class' });
    expect(r.html).toContain('box-shadow');
    const warn = r.warnings.find((w) => w.code === ErrorCode.ENHANCE_PROPERTY_STRIPPED);
    expect(warn).toBeUndefined();
  });

  it('passthrough does not turn errors into successes — invalid markup still errors', () => {
    const r = compile('<mc></mc>');
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('passthrough leaves SAFE properties untouched (no double-application)', () => {
    const safeDoc = `<mc><mc-head><mc-title>T</mc-title></mc-head><mc-body>
      <mc-section><mc-column class="bg-white p-4"><mc-text>Hi</mc-text></mc-column></mc-section>
    </mc-body></mc>`;
    const r = compile(safeDoc, { templateStyle: 'class' });
    expect(r.errors).toHaveLength(0);
    expect(r.html).toContain('background-color');
    expect(r.html).toContain('padding');
  });

  it('passthrough STILL strips ALWAYS_BREAKING — display:flex never reaches output', () => {
    // The whole point of the safer-passthrough fix: even when the caller
    // opts out of caniemail-driven gating, properties that universally
    // corrupt Outlook (display:flex, position:absolute, float) are kept
    // out of the output.
    const flexDoc = `<mc><mc-head><mc-title>T</mc-title></mc-head><mc-body>
      <mc-section><mc-column class="flex"><mc-text>Hi</mc-text></mc-column></mc-section>
    </mc-body></mc>`;
    const r = compile(flexDoc, { templateStyle: 'class' });
    expect(r.html).not.toMatch(/display\s*:\s*flex/);
  });
});

describe('compileFromJSON() — omitted targetClients (passthrough)', () => {
  // The JSON entry-point has its own copy of the passthrough wiring
  // (src/json/index.ts). This catches drift between the two paths.
  const SHADOW_NODE = {
    type: 'mc',
    attributes: {},
    children: [
      {
        type: 'mc-head',
        attributes: {},
        children: [{ type: 'mc-title', attributes: {}, content: 'T' }],
      },
      {
        type: 'mc-body',
        attributes: {},
        children: [{
          type: 'mc-section',
          attributes: {},
          children: [{
            type: 'mc-column',
            attributes: { class: 'shadow-2xl' },
            children: [{ type: 'mc-text', attributes: {}, content: 'Hi' }],
          }],
        }],
      },
    ],
  };

  it("baseline: strict mode WITH targetClients:'default' strips box-shadow", () => {
    const r = compileFromJSON(SHADOW_NODE, {
      compatibilityMode: 'strict',
      targetClients: 'default',
      templateStyle: 'class',
    });
    expect(r.html).not.toContain('box-shadow');
  });

  it('passthrough: strict mode WITHOUT targetClients keeps box-shadow', () => {
    const r = compileFromJSON(SHADOW_NODE, { compatibilityMode: 'strict', templateStyle: 'class' });
    expect(r.html).toContain('box-shadow');
  });
});
