/**
 * Parity tests — `compileFromJSON()` post-processing stages.
 *
 * Until this test file, `compileFromJSON()` was missing three post-processing
 * stages that `compile()` had: dark mode, accessibility, contrast checking.
 * These tests assert each stage runs from the JSON entry-point and produces
 * the same observable behaviour as the markup pipeline.
 *
 * Each test isolates ONE behaviour and would fail if that behaviour regresses.
 */

import { describe, it, expect } from 'vitest';
import { compileFromJSON } from '../../src/json/index.js';
import type { MCNode } from '../../src/json/schema.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Minimal JSON tree — body/section/column/text. */
function makeNode(opts?: {
  title?: string
  bodyLang?: string
  bodyDir?: string
  bodyBg?: string
  textColor?: string
  textBg?: string
}): MCNode {
  const head: MCNode | null = opts?.title
    ? {
        type: 'mc-head',
        attributes: {},
        children: [
          // JSON schema: leaf text lives in `content: string`, not in children.
          { type: 'mc-title', attributes: {}, content: opts.title },
        ],
      }
    : null;

  const bodyAttributes: Record<string, string> = {};
  if (opts?.bodyLang) bodyAttributes['lang'] = opts.bodyLang;
  if (opts?.bodyDir) bodyAttributes['dir'] = opts.bodyDir;
  if (opts?.bodyBg) bodyAttributes['background-color'] = opts.bodyBg;

  const textAttributes: Record<string, string> = {};
  if (opts?.textColor) textAttributes['color'] = opts.textColor;
  if (opts?.textBg) textAttributes['background-color'] = opts.textBg;

  return {
    type: 'mc',
    attributes: {},
    children: [
      ...(head ? [head] : []),
      {
        type: 'mc-body',
        attributes: bodyAttributes,
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
                    type: 'mc-text',
                    attributes: textAttributes,
                    content: 'Hi',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Dark mode parity
// ---------------------------------------------------------------------------

describe('compileFromJSON — dark mode post-processing parity', () => {
  const darkConfig = {
    darkMode: {
      enabled: true,
      strategy: 'media-query' as const,
      colorMapping: {
        '#ffffff': '#1a1a1a',
        '#18181b': '#f5f5f5',
      },
    },
  };

  it('injects color-scheme meta tags when dark mode is enabled', () => {
    const result = compileFromJSON(makeNode({ bodyBg: '#ffffff' }), { config: darkConfig });
    expect(result.html).not.toBeNull();
    expect(result.html!).toContain('<meta name="color-scheme" content="light dark">');
    expect(result.html!).toContain('<meta name="supported-color-schemes" content="light dark">');
  });

  it('injects @media (prefers-color-scheme:dark) rules for mapped bg colors', () => {
    // Fixture uses raw `background-color` attr on mc-body — needs attribute mode
    // so the attr is not stripped by class-mode enforcement before dark-mode mapping.
    const result = compileFromJSON(makeNode({ bodyBg: '#ffffff' }), { config: darkConfig, templateStyle: 'attribute' });
    expect(result.html).not.toBeNull();
    expect(result.html!).toContain('@media(prefers-color-scheme:dark)');
  });

  it('does NOT inject color-scheme meta when dark mode is disabled (default)', () => {
    const result = compileFromJSON(makeNode({ bodyBg: '#ffffff' }));
    expect(result.html).not.toBeNull();
    expect(result.html!).not.toContain('<meta name="color-scheme"');
  });

  it('adds dark-mode class for mapped text color', () => {
    // Fixture uses raw `color` attr on mc-text — needs attribute mode.
    const result = compileFromJSON(
      makeNode({ textColor: '#18181b' }),
      { config: darkConfig, templateStyle: 'attribute' },
    );
    expect(result.html).not.toBeNull();
    // Mapped colors get a `dm-c-*` (text) or `dm-bg-*` (background) class.
    expect(result.html!).toMatch(/dm-c-/);
  });
});

// ---------------------------------------------------------------------------
// Accessibility parity
// ---------------------------------------------------------------------------

describe('compileFromJSON — accessibility post-processing parity', () => {
  it('injects mc-title content into <title> tag (always-on)', () => {
    // Title injection is document content, not an a11y opt-in. The a11y stage
    // runs the title step regardless of `accessibility.enabled`.
    const result = compileFromJSON(makeNode({ title: 'Order Confirmation' }), {
      config: {
        accessibility: { enabled: true, checkContrast: false, warnMissingAlt: true, enforceAltText: false },
      },
    });
    expect(result.html).not.toBeNull();
    expect(result.html!).toContain('<title>Order Confirmation</title>');
  });

  it('still injects <title> when accessibility is disabled (always-on, parity with markup path)', () => {
    const result = compileFromJSON(makeNode({ title: 'Order Confirmation' }));
    expect(result.html).not.toBeNull();
    expect(result.html!).toContain('<title>Order Confirmation</title>');
  });

  it('honors mc-body lang attribute on the <html> tag', () => {
    // Body-compiler responsibility: reads `lang` from mc-body. We assert this
    // works through the JSON path (regression catch).
    const result = compileFromJSON(makeNode({ bodyLang: 'fr' }));
    expect(result.html).not.toBeNull();
    expect(result.html!).toMatch(/<html[^>]*lang="fr"/);
  });

  it('honors mc-body dir attribute on the <html> tag', () => {
    const result = compileFromJSON(makeNode({ bodyLang: 'ar', bodyDir: 'rtl' }));
    expect(result.html).not.toBeNull();
    expect(result.html!).toMatch(/<html[^>]*dir="rtl"/);
  });

  it('a11y stage adds xml:lang on <html> (parity with markup path)', () => {
    const result = compileFromJSON(makeNode({ title: 'T' }), {
      config: { accessibility: { enabled: true, checkContrast: false, warnMissingAlt: true, enforceAltText: false } },
    });
    expect(result.html).not.toBeNull();
    expect(result.html!).toMatch(/<html[^>]*xml:lang=/);
  });

  it('a11y stage STILL adds xml:lang when disabled (always-on, parity with markup path)', () => {
    // xml:lang on <html> is standard XHTML markup correctness (mirrors the
    // existing `lang` attribute) and is not a gated a11y feature.
    const result = compileFromJSON(makeNode({ title: 'T' }), {
      config: { accessibility: { enabled: false, checkContrast: false, warnMissingAlt: true, enforceAltText: false } },
    });
    expect(result.html).not.toBeNull();
    expect(result.html!).toMatch(/<html[^>]*xml:lang=/);
  });

  it('emits MISSING_TITLE warning when no <mc-title> is present (a11y stage runs)', () => {
    // The a11y stage emits MISSING_TITLE regardless of `enabled`. This test
    // would fail if the a11y stage were skipped entirely — proving the JSON
    // path now wires it up.
    const result = compileFromJSON(makeNode()); // no title
    const titleWarnings = result.warnings.filter((w) => w.code === 'MISSING_TITLE');
    expect(titleWarnings.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Contrast check parity
// ---------------------------------------------------------------------------

describe('compileFromJSON — contrast check parity', () => {
  // All contrast tests below use raw `color` / `background-color` attrs on mc-text.
  // Pass templateStyle:'attribute' so those attrs reach the post-processor and
  // contrast can actually be measured (in class mode they would be stripped).
  it('emits LOW_CONTRAST warning when ratio < 3:1 and checkContrast is enabled', () => {
    // #cccccc on #ffffff ≈ 1.61:1 — below the 3:1 large-text floor → warning tier
    const result = compileFromJSON(
      makeNode({ textColor: '#cccccc', textBg: '#ffffff' }),
      {
        config: { accessibility: { enabled: true, checkContrast: true, warnMissingAlt: true, enforceAltText: false } },
        templateStyle: 'attribute',
      },
    );
    const lowContrast = result.warnings.filter((i) => i.code === 'LOW_CONTRAST');
    expect(lowContrast.length).toBeGreaterThan(0);
    expect(lowContrast[0]!.severity).toBe('warning');
  });

  it('emits LOW_CONTRAST info when ratio is 3:1–4.5:1 and checkContrast is enabled', () => {
    // #888888 on #ffffff ≈ 3.54:1 — fails AA for normal text but ok for large → info tier
    const result = compileFromJSON(
      makeNode({ textColor: '#888888', textBg: '#ffffff' }),
      {
        config: { accessibility: { enabled: true, checkContrast: true, warnMissingAlt: true, enforceAltText: false } },
        templateStyle: 'attribute',
      },
    );
    const lowContrast = result.info.filter((i) => i.code === 'LOW_CONTRAST');
    expect(lowContrast.length).toBeGreaterThan(0);
    expect(lowContrast[0]!.severity).toBe('info');
  });

  it('does NOT run contrast check when checkContrast is disabled', () => {
    const result = compileFromJSON(
      makeNode({ textColor: '#cccccc', textBg: '#ffffff' }),
      {
        config: { accessibility: { enabled: true, checkContrast: false, warnMissingAlt: true, enforceAltText: false } },
        templateStyle: 'attribute',
      },
    );
    const allContrast = [
      ...result.warnings.filter((i) => i.code === 'LOW_CONTRAST'),
      ...result.info.filter((i) => i.code === 'LOW_CONTRAST'),
    ];
    expect(allContrast.length).toBe(0);
  });

  it('emits NO LOW_CONTRAST issues for high-contrast pairs (sanity)', () => {
    // Black on white — well above WCAG AA.
    const result = compileFromJSON(
      makeNode({ textColor: '#000000', textBg: '#ffffff' }),
      {
        config: { accessibility: { enabled: true, checkContrast: true, warnMissingAlt: true, enforceAltText: false } },
        templateStyle: 'attribute',
      },
    );
    const allContrast = [
      ...result.warnings.filter((i) => i.code === 'LOW_CONTRAST'),
      ...result.info.filter((i) => i.code === 'LOW_CONTRAST'),
    ];
    expect(allContrast.length).toBe(0);
  });
});
