/**
 * Strict mode must filter ENHANCE properties from BOTH paths uniformly:
 *
 *   class="rounded-lg"           direct attr: border-radius="8px"
 *           ↓                              ↓
 *      collectAndInline()                  attribute classifier
 *           ↓                              ↓
 *      classifyProperties + strict-strip   classifyProperties + strict-strip
 *           ↓                              ↓
 *      Tailwind ENHANCE stripped     Direct attr ENHANCE stripped
 *
 * Previously only the Tailwind path was wired up — direct CSS-property
 * attributes bypassed classification entirely. These tests pin both paths
 * to the same behaviour so the gap can't reappear silently.
 */
import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compile.js';
import { ErrorCode } from '../../src/errors/codes.js';

// ---------------------------------------------------------------------------
// mc-column
// ---------------------------------------------------------------------------

describe('compatibilityMode: strict — direct attribute (mc-column)', () => {
  const src = (_mode: 'liberal' | 'strict'): string => `<mc>
    <mc-head><mc-title>T</mc-title></mc-head>
    <mc-body><mc-section><mc-column border-radius="8px" background-color="#fff">
      <mc-text>Hi</mc-text>
    </mc-column></mc-section></mc-body>
  </mc>`;

  it('liberal mode: keeps border-radius from a direct attribute', () => {
    const r = compile(src('liberal'), { compatibilityMode: 'liberal' });
    expect(r.html).toContain('border-radius:8px');
  });

  it('strict mode: STRIPS border-radius from a direct attribute', () => {
    const r = compile(src('strict'), { compatibilityMode: 'strict', targetClients: 'default' });
    expect(r.html).not.toContain('border-radius:8px');
  });

  it('strict mode: emits ENHANCE_PROPERTY_STRIPPED warning for direct attribute', () => {
    const r = compile(src('strict'), { compatibilityMode: 'strict', targetClients: 'default' });
    const warn = r.warnings.find(
      (w) => w.code === ErrorCode.ENHANCE_PROPERTY_STRIPPED && w.message.includes('border-radius'),
    );
    expect(warn).toBeDefined();
  });

  it('strict mode: keeps SAFE direct attribute (background-color)', () => {
    const r = compile(src('strict'), { compatibilityMode: 'strict', targetClients: 'default' });
    expect(r.html).toContain('background-color:#fff');
  });
});

// ---------------------------------------------------------------------------
// mc-button
// ---------------------------------------------------------------------------

describe('compatibilityMode: strict — direct attribute (mc-button)', () => {
  const src = `<mc>
    <mc-head><mc-title>T</mc-title></mc-head>
    <mc-body><mc-section><mc-column>
      <mc-button href="https://example.com" border-radius="8px">Click</mc-button>
    </mc-column></mc-section></mc-body>
  </mc>`;

  it('liberal mode: keeps border-radius', () => {
    const r = compile(src, { compatibilityMode: 'liberal' });
    expect(r.html).toContain('border-radius:8px');
  });

  it('strict mode: strips border-radius', () => {
    const r = compile(src, { compatibilityMode: 'strict', targetClients: 'default' });
    expect(r.html).not.toContain('border-radius:8px');
  });

  it('strict mode: emits ENHANCE_PROPERTY_STRIPPED for direct border-radius', () => {
    const r = compile(src, { compatibilityMode: 'strict', targetClients: 'default' });
    const warn = r.warnings.find(
      (w) => w.code === ErrorCode.ENHANCE_PROPERTY_STRIPPED && w.message.includes('border-radius'),
    );
    expect(warn).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// mc-image
// ---------------------------------------------------------------------------

describe('compatibilityMode: strict — direct attribute (mc-image)', () => {
  const src = `<mc>
    <mc-head><mc-title>T</mc-title></mc-head>
    <mc-body><mc-section><mc-column>
      <mc-image src="https://example.com/x.png" border-radius="8px" alt="Hero" />
    </mc-column></mc-section></mc-body>
  </mc>`;

  it('liberal mode: keeps border-radius', () => {
    const r = compile(src, { compatibilityMode: 'liberal' });
    expect(r.html).toContain('border-radius:8px');
  });

  it('strict mode: strips border-radius', () => {
    const r = compile(src, { compatibilityMode: 'strict', targetClients: 'default' });
    expect(r.html).not.toContain('border-radius:8px');
  });
});

// ---------------------------------------------------------------------------
// Symmetry — direct attr vs Tailwind class produce identical strict output
// ---------------------------------------------------------------------------

describe('compatibilityMode: strict — Tailwind path and direct-attribute path are symmetric', () => {
  it('strict mode strips both class-derived AND attribute-derived border-radius', () => {
    const cls = `<mc><mc-head><mc-title>T</mc-title></mc-head><mc-body><mc-section><mc-column class="rounded-lg"><mc-text>Hi</mc-text></mc-column></mc-section></mc-body></mc>`;
    const attr = `<mc><mc-head><mc-title>T</mc-title></mc-head><mc-body><mc-section><mc-column border-radius="8px"><mc-text>Hi</mc-text></mc-column></mc-section></mc-body></mc>`;

    const rCls = compile(cls, { compatibilityMode: 'strict', targetClients: 'default', templateStyle: 'class' });
    const rAttr = compile(attr, { compatibilityMode: 'strict', targetClients: 'default' });

    expect(rCls.html).not.toContain('border-radius');
    expect(rAttr.html).not.toContain('border-radius');

    const warnCls = rCls.warnings.find((w) => w.code === ErrorCode.ENHANCE_PROPERTY_STRIPPED);
    const warnAttr = rAttr.warnings.find((w) => w.code === ErrorCode.ENHANCE_PROPERTY_STRIPPED);
    expect(warnCls).toBeDefined();
    expect(warnAttr).toBeDefined();
  });
});
