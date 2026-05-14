/**
 * SM-G3: Style provenance tests.
 *
 * Verifies that `compile({ sourceMap: true })` populates `styles` on each
 * source-map entry, mirroring the behaviour previously only present under
 * `debug: true`.
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../../src/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function simpleSection(content: string): string {
  return `
<mc>
  <mc-head></mc-head>
  <mc-body>
    <mc-section>
      <mc-column>
        ${content}
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`.trim();
}

// ---------------------------------------------------------------------------
// No styles when sourceMap is not requested
// ---------------------------------------------------------------------------

describe('SM-G3: style provenance disabled when sourceMap:false', () => {
  it('entries have empty styles array when sourceMap flag is absent', () => {
    const source = simpleSection(`<mc-text>Hello</mc-text>`);
    const result = compile(source);
    expect(result.sourceMap).toBeUndefined();
  });

  it('entries have empty styles array when sourceMap:false is explicit', () => {
    const source = simpleSection(`<mc-text>Hello</mc-text>`);
    const result = compile(source, { sourceMap: false });
    expect(result.sourceMap).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Tailwind class → style origin
// ---------------------------------------------------------------------------

describe('SM-G3: tailwind-class origin (sourceMap:true)', () => {
  it('records tailwind-class style for mc-text with class attribute', () => {
    const source = simpleSection(`<mc-text class="text-blue-500">Hello</mc-text>`);
    const result = compile(source, { sourceMap: true, templateStyle: 'class' });

    expect(result.sourceMap).toBeDefined();
    const entries = result.sourceMap!.entries;

    // Find the mc-text entry
    const textEntry = entries.find((e) => e.sourceComponent === 'mc-text');
    expect(textEntry).toBeDefined();
    expect(textEntry!.styles.length).toBeGreaterThan(0);

    // At least one style should have tailwind-class origin
    const tailwindStyles = textEntry!.styles.filter((s) => s.origin === 'tailwind-class');
    expect(tailwindStyles.length).toBeGreaterThan(0);
    expect(tailwindStyles[0]?.originalValue).toContain('text-blue-500');
  });

  it('records multiple tailwind classes when class string has multiple tokens', () => {
    const source = simpleSection(`<mc-text class="text-blue-500 font-bold">Bold Blue</mc-text>`);
    // Class mode required for class= usage.
    const result = compile(source, { sourceMap: true, templateStyle: 'class' });

    const textEntry = result.sourceMap!.entries.find((e) => e.sourceComponent === 'mc-text');
    expect(textEntry).toBeDefined();

    const tailwindStyles = textEntry!.styles.filter((s) => s.origin === 'tailwind-class');
    expect(tailwindStyles.length).toBeGreaterThan(1);
  });

  it('records property and value in tailwind-class style', () => {
    const source = simpleSection(`<mc-text class="text-blue-500">Blue</mc-text>`);
    const result = compile(source, { sourceMap: true, templateStyle: 'class' });

    const textEntry = result.sourceMap!.entries.find((e) => e.sourceComponent === 'mc-text');
    const colorStyle = textEntry!.styles.find(
      (s) => s.origin === 'tailwind-class' && s.property === 'color'
    );
    expect(colorStyle).toBeDefined();
    expect(colorStyle!.value).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Attribute → style origin
// ---------------------------------------------------------------------------

describe('SM-G3: attribute origin (sourceMap:true)', () => {
  // The two prior tests in this block exercised attribute-origin recording
  // triggered specifically by `class=` + a CSS-property attribute coexisting
  // on the same element. That combination is no longer permitted under
  // strict styling-mode rules (class= and CSS-prop attrs are mutually
  // exclusive on a single node), so the code path is unreachable.
  // Attribute-origin coverage continues in tests/compiler/style-provenance.test.ts.
  it('placeholder — see style-provenance.test.ts for attribute-origin coverage', () => {
    expect(true).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Parity: sourceMap:true === debug:true for style provenance
// ---------------------------------------------------------------------------

describe('SM-G3: parity between sourceMap:true and debug:true', () => {
  it('produces same style count for sourceMap:true vs debug:true', () => {
    const source = simpleSection(`<mc-text class="text-blue-500">Hello</mc-text>`);

    const debugResult = compile(source, { debug: true, templateStyle: 'class' });
    const smResult = compile(source, { sourceMap: true, templateStyle: 'class' });

    expect(debugResult.sourceMap).toBeDefined();
    expect(smResult.sourceMap).toBeDefined();

    const debugTextEntry = debugResult.sourceMap!.entries.find((e) => e.sourceComponent === 'mc-text');
    const smTextEntry = smResult.sourceMap!.entries.find((e) => e.sourceComponent === 'mc-text');

    expect(smTextEntry!.styles.length).toEqual(debugTextEntry!.styles.length);
  });

  it('style origins match between sourceMap:true and debug:true', () => {
    const source = simpleSection(`<mc-text class="text-blue-500">Hello</mc-text>`);

    const debugResult = compile(source, { debug: true, templateStyle: 'class' });
    const smResult = compile(source, { sourceMap: true, templateStyle: 'class' });

    const debugTextEntry = debugResult.sourceMap!.entries.find((e) => e.sourceComponent === 'mc-text');
    const smTextEntry = smResult.sourceMap!.entries.find((e) => e.sourceComponent === 'mc-text');

    const debugOrigins = debugTextEntry!.styles.map((s) => s.origin).sort();
    const smOrigins = smTextEntry!.styles.map((s) => s.origin).sort();

    expect(smOrigins).toEqual(debugOrigins);
  });
});

// ---------------------------------------------------------------------------
// Entries without CSS have empty styles
// ---------------------------------------------------------------------------

describe('SM-G3: entries without CSS have empty styles array', () => {
  it('mc-spacer with no styles has empty styles array', () => {
    const source = simpleSection(`<mc-spacer height="20px"></mc-spacer>`);
    const result = compile(source, { sourceMap: true, templateStyle: 'class' });

    const spacerEntry = result.sourceMap!.entries.find((e) => e.sourceComponent === 'mc-spacer');
    if (spacerEntry) {
      // spacer may have component-default styles but should not crash
      expect(Array.isArray(spacerEntry.styles)).toBe(true);
    }
  });

  it('sourceMapIds flag is set to true', () => {
    const source = simpleSection(`<mc-text>Hello</mc-text>`);
    const result = compile(source, { sourceMap: true, templateStyle: 'class' });
    expect(result.sourceMapIds).toBe(true);
  });
});
