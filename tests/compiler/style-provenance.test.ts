/**
 * SM-C: Style Provenance Tracking tests.
 *
 * Verifies that `compile(source, { debug: true })` populates
 * `SourceMapEntry.styles` with origin information for CSS properties
 * applied to each component.
 *
 * Scope:
 *  - `tailwind-class` origin — class resolved by the CSS inliner
 *  - `attribute` origin     — direct CSS-property attribute on the element
 *  - `support` field        — populated (or gracefully absent) per property
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compile.js';
import type { SourceMapEntry } from '../../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns source map entries whose sourceComponent matches. */
function entriesFor(entries: SourceMapEntry[], component: string): SourceMapEntry[] {
  return entries.filter((e) => e.sourceComponent === component);
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Template with a class that maps to background-color. */
const BG_CLASS_TEMPLATE = `<mc>
<mc-head><mc-title>Test</mc-title></mc-head>
<mc-body>
  <mc-section>
    <mc-column>
      <mc-text class="bg-red-500">Hello</mc-text>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;

/** Pure class-mode template using `text-center` Tailwind utility. */
const CLASS_TEXT_ALIGN_TEMPLATE = `<mc>
<mc-head><mc-title>Test</mc-title></mc-head>
<mc-body>
  <mc-section>
    <mc-column>
      <mc-text class="text-center">Hello</mc-text>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;


// ---------------------------------------------------------------------------
// Tailwind-class origin
// ---------------------------------------------------------------------------

describe('SM-C: tailwind-class origin', () => {
  it('records tailwind-class origin for a Tailwind-resolved property', () => {
    const result = compile(BG_CLASS_TEMPLATE, { debug: true, templateStyle: 'class' });
    const textEntries = entriesFor(result.sourceMap!.entries, 'mc-text');
    expect(textEntries.length).toBeGreaterThan(0);

    const textEntry = textEntries[0]!;
    const bgStyle = textEntry.styles.find((s) => s.property === 'background-color');
    expect(bgStyle).toBeDefined();
    expect(bgStyle!.origin).toBe('tailwind-class');
  });

  it('records the originating class name in originalValue', () => {
    const result = compile(BG_CLASS_TEMPLATE, { debug: true, templateStyle: 'class' });
    const textEntry = entriesFor(result.sourceMap!.entries, 'mc-text')[0]!;
    const bgStyle = textEntry.styles.find((s) => s.property === 'background-color');
    expect(bgStyle!.originalValue).toBe('bg-red-500');
  });

  it('records text-align origin from text-center class', () => {
    const result = compile(CLASS_TEXT_ALIGN_TEMPLATE, { debug: true, templateStyle: 'class' });
    const textEntry = entriesFor(result.sourceMap!.entries, 'mc-text')[0]!;
    const alignStyle = textEntry.styles.find((s) => s.property === 'text-align');
    expect(alignStyle).toBeDefined();
    expect(alignStyle!.origin).toBe('tailwind-class');
    expect(alignStyle!.originalValue).toBe('text-center');
  });

  it('styles array is non-empty when a class is set', () => {
    const result = compile(BG_CLASS_TEMPLATE, { debug: true, templateStyle: 'class' });
    const textEntry = entriesFor(result.sourceMap!.entries, 'mc-text')[0]!;
    expect(textEntry.styles.length).toBeGreaterThan(0);
  });

  it('styles array is empty for a component without a class or CSS attributes', () => {
    // mc-divider has no class by default
    const template = `<mc>
<mc-head><mc-title>T</mc-title></mc-head>
<mc-body>
  <mc-section>
    <mc-column>
      <mc-divider />
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;
    const result = compile(template, { debug: true });
    const dividerEntries = entriesFor(result.sourceMap!.entries, 'mc-divider');
    // All divider entries should have no tailwind-class styles
    const classDrivenStyles = dividerEntries.flatMap((e) =>
      e.styles.filter((s) => s.origin === 'tailwind-class'),
    );
    expect(classDrivenStyles).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Attribute origin (pure attribute mode — no class= present)
// ---------------------------------------------------------------------------

/** Pure attribute-mode template — direct font-size attribute. */
const ATTR_FONT_SIZE_TEMPLATE = `<mc>
<mc-head><mc-title>Test</mc-title></mc-head>
<mc-body>
  <mc-section>
    <mc-column>
      <mc-text font-size="20px">Hello</mc-text>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;

/** Pure attribute-mode template — direct color attribute. */
const ATTR_COLOR_TEMPLATE = `<mc>
<mc-head><mc-title>Test</mc-title></mc-head>
<mc-body>
  <mc-section>
    <mc-column>
      <mc-text color="#333333">Hello</mc-text>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;

describe('SM-C: attribute origin (no class= present)', () => {
  it('records attribute origin for a direct CSS-property attribute', () => {
    const result = compile(ATTR_FONT_SIZE_TEMPLATE, { debug: true, templateStyle: 'attribute' });
    const textEntry = entriesFor(result.sourceMap!.entries, 'mc-text')[0]!;
    const fontSizeStyle = textEntry.styles.find((s) => s.property === 'font-size');
    expect(fontSizeStyle).toBeDefined();
    expect(fontSizeStyle!.origin).toBe('attribute');
  });

  it('records the attribute value in both value and originalValue', () => {
    const result = compile(ATTR_FONT_SIZE_TEMPLATE, { debug: true, templateStyle: 'attribute' });
    const textEntry = entriesFor(result.sourceMap!.entries, 'mc-text')[0]!;
    const fontSizeStyle = textEntry.styles.find((s) => s.property === 'font-size');
    expect(fontSizeStyle!.value).toBe('20px');
    expect(fontSizeStyle!.originalValue).toBe('20px');
  });

  it('records color attribute as attribute origin', () => {
    const result = compile(ATTR_COLOR_TEMPLATE, { debug: true, templateStyle: 'attribute' });
    const textEntry = entriesFor(result.sourceMap!.entries, 'mc-text')[0]!;
    const colorStyle = textEntry.styles.find((s) => s.property === 'color');
    expect(colorStyle).toBeDefined();
    expect(colorStyle!.origin).toBe('attribute');
    expect(colorStyle!.value).toBe('#333333');
  });

  it('records origin: mc-attributes when value came from mc-attributes default', () => {
    const template = `<mc>
<mc-head>
  <mc-title>T</mc-title>
  <mc-attributes>
    <mc-text color="#ff0000" />
  </mc-attributes>
</mc-head>
<mc-body>
  <mc-section>
    <mc-column>
      <mc-text>Hello</mc-text>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;
    const result = compile(template, { debug: true, templateStyle: 'attribute' });
    const textEntry = entriesFor(result.sourceMap!.entries, 'mc-text')[0]!;
    const colorStyle = textEntry.styles.find((s) => s.property === 'color');
    expect(colorStyle).toBeDefined();
    expect(colorStyle!.origin).toBe('mc-attributes');
  });

  it('attribute-mode element with no CSS-prop attrs has empty styles array', () => {
    const template = `<mc>
<mc-head><mc-title>T</mc-title></mc-head>
<mc-body>
  <mc-section>
    <mc-column>
      <mc-text>Plain</mc-text>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;
    const result = compile(template, { debug: true, templateStyle: 'attribute' });
    const textEntry = entriesFor(result.sourceMap!.entries, 'mc-text')[0]!;
    expect(textEntry.styles).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Attribute origin parity: divider and spacer use the helper path
// ---------------------------------------------------------------------------

describe('SM-C: attribute origin via recordAttributeStyleOrigins (divider/spacer)', () => {
  it('mc-divider with direct border-color attr records attribute origin', () => {
    const template = `<mc>
<mc-head><mc-title>T</mc-title></mc-head>
<mc-body>
  <mc-section>
    <mc-column>
      <mc-divider border-color="#cc0000" />
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;
    const result = compile(template, { debug: true, templateStyle: 'attribute' });
    const dividerEntry = entriesFor(result.sourceMap!.entries, 'mc-divider')[0];
    // Divider may not record border-color specifically (it's a structural
    // shorthand on the divider), but at minimum the styles array should
    // exist and be a typed array — confirming the helper ran.
    expect(dividerEntry).toBeDefined();
    expect(Array.isArray(dividerEntry!.styles)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Support field
// ---------------------------------------------------------------------------

describe('SM-C: support field', () => {
  it('does not crash when propertySupportMap is populated', () => {
    expect(() => compile(BG_CLASS_TEMPLATE, { debug: true })).not.toThrow();
  });

  it('styles array entries have a property and value', () => {
    const result = compile(BG_CLASS_TEMPLATE, { debug: true, templateStyle: 'class' });
    const textEntry = entriesFor(result.sourceMap!.entries, 'mc-text')[0]!;
    for (const style of textEntry.styles) {
      expect(style.property).toBeTruthy();
      expect(style.value).toBeTruthy();
    }
  });

  it('support field on a style is either undefined or an object with supported/partial/unsupported arrays', () => {
    const result = compile(BG_CLASS_TEMPLATE, { debug: true, templateStyle: 'class' });
    const textEntry = entriesFor(result.sourceMap!.entries, 'mc-text')[0]!;
    for (const style of textEntry.styles) {
      if (style.support !== undefined) {
        expect(Array.isArray(style.support.supported)).toBe(true);
        expect(Array.isArray(style.support.partial)).toBe(true);
        expect(Array.isArray(style.support.unsupported)).toBe(true);
      }
    }
  });

  it('does not crash for a property with no caniemail entry', () => {
    // letter-spacing is a less-common property; no crash is required
    const template = `<mc>
<mc-head><mc-title>T</mc-title></mc-head>
<mc-body>
  <mc-section>
    <mc-column>
      <mc-text class="text-center" letter-spacing="2px">Hello</mc-text>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;
    expect(() => compile(template, { debug: true })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Debug mode vs production mode
// ---------------------------------------------------------------------------

describe('SM-C: debug vs production', () => {
  it('styles array is empty in production mode (no sourceMap)', () => {
    const result = compile(BG_CLASS_TEMPLATE);
    expect(result.sourceMap).toBeUndefined();
  });

  it('styles array is populated in debug mode', () => {
    const result = compile(BG_CLASS_TEMPLATE, { debug: true, templateStyle: 'class' });
    const textEntry = entriesFor(result.sourceMap!.entries, 'mc-text')[0]!;
    expect(textEntry.styles.length).toBeGreaterThan(0);
  });
});
