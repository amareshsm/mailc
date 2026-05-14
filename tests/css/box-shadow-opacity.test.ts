/**
 * Tests for the `box-shadow` and `opacity` CSS-property attributes exposed
 * on mc-button, mc-section, mc-column, and mc-image.
 *
 * Coverage:
 *  - Single, multi-comma stacked, rgba(), and inset box-shadow syntaxes
 *    all pass through the pipeline as opaque strings (no comma-splitting,
 *    no value mangling).
 *  - opacity accepts decimal values.
 *  - In liberal mode, both properties are inlined for graceful degradation.
 *  - In strict mode, both properties are stripped with an
 *    `ENHANCE_PROPERTY_STRIPPED` warning (they are ENHANCE-classified).
 *  - JSON round-trip preserves the value exactly.
 */
import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compile.js';
import { compileFromJSON, markupToJSON, jsonToMarkup } from '../../src/json/index.js';

function wrap(inner: string): string {
  return `<mc><mc-head><mc-title>X</mc-title></mc-head><mc-body><mc-section><mc-column>${inner}</mc-column></mc-section></mc-body></mc>`;
}

function stripWarn(html: string): string {
  // Inline style on the wrapping element where shadow/opacity attach.
  // For most components mailc inlines onto a <td> or <a>; we just need
  // to know the value appears verbatim somewhere in the output.
  return html;
}

// ---------------------------------------------------------------------------
// box-shadow — every syntax variant
// ---------------------------------------------------------------------------

describe('box-shadow attribute — syntax variants', () => {
  const VARIANTS = [
    { label: 'single shadow',          value: '0 2px 4px red' },
    { label: 'rgba color',             value: '0 0 10px rgba(0,0,0,0.5)' },
    { label: 'multi-comma stacked',    value: '0 2px 4px red, 0 8px 16px blue' },
    { label: 'inset keyword',          value: 'inset 0 0 4px red' },
    { label: 'none',                   value: 'none' },
  ];

  it.each(VARIANTS)('mc-button — $label round-trips to inlined output', ({ value }) => {
    const r = compile(wrap(`<mc-button box-shadow="${value}" href="#" color="white" background-color="purple">Click</mc-button>`));
    expect(r.errors).toHaveLength(0);
    expect(r.warnings.filter((w) => w.code === 'UNKNOWN_ATTRIBUTE' && w.message.includes('box-shadow'))).toHaveLength(0);
    expect(stripWarn(r.html ?? '')).toContain(`box-shadow:${value}`);
  });

  it.each(VARIANTS)('mc-section — $label round-trips to inlined output', ({ value }) => {
    const r = compile(`<mc><mc-head><mc-title>X</mc-title></mc-head><mc-body><mc-section box-shadow="${value}"><mc-column><mc-text>hi</mc-text></mc-column></mc-section></mc-body></mc>`);
    expect(r.errors).toHaveLength(0);
    expect(stripWarn(r.html ?? '')).toContain(`box-shadow:${value}`);
  });

  it.each(VARIANTS)('mc-column — $label round-trips to inlined output', ({ value }) => {
    // `wrap()` adds its own outer column; for column-targeted tests we hand-
    // build the source so box-shadow attaches to the column we care about.
    const src = `<mc><mc-head><mc-title>X</mc-title></mc-head><mc-body><mc-section><mc-column box-shadow="${value}"><mc-text>hi</mc-text></mc-column></mc-section></mc-body></mc>`;
    const r = compile(src);
    expect(r.errors).toHaveLength(0);
    expect(stripWarn(r.html ?? '')).toContain(`box-shadow:${value}`);
  });

  it.each(VARIANTS)('mc-image — $label round-trips to inlined output', ({ value }) => {
    const r = compile(wrap(`<mc-image src="https://example.com/x.png" alt="x" box-shadow="${value}" />`));
    expect(r.errors).toHaveLength(0);
    expect(stripWarn(r.html ?? '')).toContain(`box-shadow:${value}`);
  });
});

// ---------------------------------------------------------------------------
// opacity — decimal values
// ---------------------------------------------------------------------------

describe('opacity attribute — values', () => {
  const VALUES = ['0', '0.5', '0.95', '1'];

  it.each(VALUES)('mc-button — opacity="%s" round-trips', (v) => {
    const r = compile(wrap(`<mc-button opacity="${v}" href="#" color="white" background-color="purple">Click</mc-button>`));
    expect(r.errors).toHaveLength(0);
    expect(stripWarn(r.html ?? '')).toContain(`opacity:${v}`);
  });

  it.each(VALUES)('mc-image — opacity="%s" round-trips', (v) => {
    const r = compile(wrap(`<mc-image src="https://example.com/x.png" alt="x" opacity="${v}" />`));
    expect(r.errors).toHaveLength(0);
    expect(stripWarn(r.html ?? '')).toContain(`opacity:${v}`);
  });
});

// ---------------------------------------------------------------------------
// Liberal vs Strict mode behavior
// ---------------------------------------------------------------------------

describe('box-shadow + opacity — mode behavior', () => {
  const SRC = `<mc><mc-head><mc-title>X</mc-title></mc-head><mc-body><mc-section><mc-column>
    <mc-button href="#" box-shadow="0 2px 4px red" opacity="0.9" color="white" background-color="purple">Click</mc-button>
  </mc-column></mc-section></mc-body></mc>`;

  it('liberal mode inlines both properties (no warnings)', () => {
    const r = compile(SRC, { compatibilityMode: 'liberal' });
    expect(stripWarn(r.html ?? '')).toContain('box-shadow:0 2px 4px red');
    expect(stripWarn(r.html ?? '')).toContain('opacity:0.9');
    expect(r.warnings.some((w) => w.code === 'ENHANCE_PROPERTY_STRIPPED')).toBe(false);
  });

  it('strict mode strips both properties and warns', () => {
    const r = compile(SRC, { compatibilityMode: 'strict', targetClients: 'default' });
    const stripped = r.warnings.filter((w) => w.code === 'ENHANCE_PROPERTY_STRIPPED');
    const props = stripped.map((w) => w.message.match(/"([a-z-]+)"/)?.[1]);
    expect(props).toContain('box-shadow');
    expect(props).toContain('opacity');
    expect(stripWarn(r.html ?? '')).not.toContain('box-shadow:');
    expect(stripWarn(r.html ?? '')).not.toContain('opacity:0.9');
  });
});

// ---------------------------------------------------------------------------
// JSON round-trip — attribute survives markup ↔ JSON conversion
// ---------------------------------------------------------------------------

describe('box-shadow + opacity — JSON round-trip', () => {
  const SRC = `<mc><mc-head><mc-title>X</mc-title></mc-head><mc-body><mc-section><mc-column>
<mc-button href="#" box-shadow="0 2px 4px red, 0 8px 16px blue" opacity="0.85" color="white" background-color="purple">Click</mc-button>
</mc-column></mc-section></mc-body></mc>`;

  it('markup → JSON preserves the box-shadow value with commas intact', () => {
    const node = markupToJSON(SRC);
    function findButton(n: typeof node): typeof node | undefined {
      if (n.type === 'mc-button') return n;
      for (const c of n.children ?? []) {
        const f = findButton(c);
        if (f) return f;
      }
      return undefined;
    }
    const btn = findButton(node);
    expect(btn?.attributes['box-shadow']).toBe('0 2px 4px red, 0 8px 16px blue');
    expect(btn?.attributes['opacity']).toBe('0.85');
  });

  it('JSON → markup → compile produces the same HTML as compile() of the source', () => {
    const fromSource = compile(SRC).html;
    const node = markupToJSON(SRC);
    const fromJson = compile(jsonToMarkup(node)).html;
    expect(fromJson).toBe(fromSource);
  });

  it('compileFromJSON with box-shadow + opacity produces the same HTML as markup compile', () => {
    const fromSource = compile(SRC).html;
    const node = markupToJSON(SRC);
    const fromJson = compileFromJSON(node).html;
    expect(fromJson).toBe(fromSource);
  });
});
