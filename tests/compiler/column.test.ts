/**
 * Tests for mc-column compiler.
 */
import { describe, it, expect } from 'vitest';
import { compileColumn } from '../../src/compiler/components/column.js';
import { makeNode, makeNodeWithText, makeContext, makeClassContext } from './helpers.js';

describe('compileColumn', () => {
  // Most tests in this file exercise Tailwind class= behavior, so the shared
  // context is class mode. Tests that exercise attribute-mode behavior
  // override locally with `makeContext({ templateStyle: 'attribute' })`.
  const ctx = makeClassContext({ parentWidth: 600 });

  it('renders Outlook conditional <td>', () => {
    const node = makeNode('mc-column', { class: 'w-1/2' });
    const html = compileColumn(node, ctx);
    expect(html).toContain('<!--[if mso | IE]>');
    expect(html).toContain('<td style="vertical-align:top;width:300px;">');
  });

  it('renders fluid-hybrid <div> with mc-responsive class', () => {
    const node = makeNode('mc-column', { class: 'w-1/2' });
    const html = compileColumn(node, ctx);
    expect(html).toContain('class="mc-responsive"');
    expect(html).toContain('display:inline-block');
    expect(html).toContain('max-width:300px');
    expect(html).toContain('width:100%');
    // font-size:0px and direction:ltr for whitespace collapse and RTL safety
    expect(html).toContain('font-size:0px');
    expect(html).toContain('direction:ltr');
  });

  it('calculates w-1/2 as 300px at 600px parent', () => {
    const node = makeNode('mc-column', { class: 'w-1/2' });
    const html = compileColumn(node, ctx);
    expect(html).toContain('width:300px');
    expect(html).toContain('max-width:300px');
  });

  it('calculates w-1/3 as 200px at 600px parent', () => {
    const node = makeNode('mc-column', { class: 'w-1/3' });
    const html = compileColumn(node, ctx);
    expect(html).toContain('width:200px');
    expect(html).toContain('max-width:200px');
  });

  it('calculates w-2/3 as 400px at 600px parent', () => {
    const node = makeNode('mc-column', { class: 'w-2/3' });
    const html = compileColumn(node, ctx);
    expect(html).toContain('width:400px');
    expect(html).toContain('max-width:400px');
  });

  it('calculates w-1/4 as 150px at 600px parent', () => {
    const node = makeNode('mc-column', { class: 'w-1/4' });
    const html = compileColumn(node, ctx);
    expect(html).toContain('width:150px');
    expect(html).toContain('max-width:150px');
  });

  it('calculates w-3/4 as 450px at 600px parent', () => {
    const node = makeNode('mc-column', { class: 'w-3/4' });
    const html = compileColumn(node, ctx);
    expect(html).toContain('width:450px');
    expect(html).toContain('max-width:450px');
  });

  it('defaults to full parent width when no width class', () => {
    const node = makeNode('mc-column');
    const html = compileColumn(node, ctx);
    expect(html).toContain('width:600px');
    expect(html).toContain('max-width:600px');
  });

  it('uses explicit width attribute over class', () => {
    const node = makeNode('mc-column', { width: '250px' });
    const html = compileColumn(node, ctx);
    expect(html).toContain('width:250px');
    expect(html).toContain('max-width:250px');
  });

  it('applies vertical-align attribute', () => {
    // CSS-prop attrs require attribute mode (class mode rejects them).
    const attrCtx = makeContext({ parentWidth: 600, templateStyle: 'attribute' });
    const node = makeNode('mc-column', {
      width: '50%',
      'vertical-align': 'middle',
    });
    const html = compileColumn(node, attrCtx);
    expect(html).toContain('vertical-align:middle');
    // On both Outlook td and div
    const count = (html.match(/vertical-align:middle/g) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it('defaults vertical-align to top', () => {
    const node = makeNode('mc-column', { class: 'w-1/2' });
    const html = compileColumn(node, ctx);
    expect(html).toContain('vertical-align:top');
  });

  it('wraps content in presentation table', () => {
    const node = makeNode('mc-column');
    const html = compileColumn(node, ctx);
    expect(html).toContain('role="presentation"');
    expect(html).toContain('cellpadding="0"');
    expect(html).toContain('cellspacing="0"');
  });

  it('compiles child nodes inside column', () => {
    const textChild = makeNodeWithText('mc-text', 'Hello');
    const node = makeNode('mc-column', { class: 'w-1/2' }, [textChild]);
    const html = compileColumn(node, ctx);
    // text.ts now emits margin longhands instead of shorthand
    expect(html).toContain('margin-top:0');
    expect(html).toContain('margin-bottom:0');
    expect(html).toContain('Hello</p>');
  });

  it('closes Outlook conditional td', () => {
    const node = makeNode('mc-column');
    const html = compileColumn(node, ctx);
    // Should have both opening and closing Outlook td
    expect(html).toContain('</td>');
  });

  it('handles percentage width attribute', () => {
    const node = makeNode('mc-column', { width: '50%' });
    const html = compileColumn(node, ctx);
    expect(html).toContain('width:300px');
    expect(html).toContain('max-width:300px');
  });

  it('includes word-break:break-word on content td', () => {
    const node = makeNode('mc-column', { class: 'w-1/2' });
    const html = compileColumn(node, ctx);
    expect(html).toContain('word-break:break-word');
  });

  // Bug 3 fix: background-color, border, border-radius applied to column output
  // These tests use CSS-prop attrs and need attribute-mode context.
  const attrCtxBugFix = makeContext({ parentWidth: 600, templateStyle: 'attribute' });

  it('applies background-color to Outlook td and fluid div', () => {
    const node = makeNode('mc-column', { 'background-color': '#fef3c7' });
    const html = compileColumn(node, attrCtxBugFix);
    expect(html).toContain('background-color:#fef3c7');
  });

  it('applies border to Outlook td and content td', () => {
    const node = makeNode('mc-column', { border: '1px solid #e5e7eb' });
    const html = compileColumn(node, attrCtxBugFix);
    expect(html).toContain('border:1px solid #e5e7eb');
  });

  it('applies border-radius to fluid div', () => {
    const node = makeNode('mc-column', { 'border-radius': '8px' });
    const html = compileColumn(node, attrCtxBugFix);
    expect(html).toContain('border-radius:8px');
  });

  it('applies background-color, border, and border-radius together', () => {
    const node = makeNode('mc-column', {
      'background-color': '#ffffff',
      border: '1px solid #cccccc',
      'border-radius': '4px',
    });
    const html = compileColumn(node, attrCtxBugFix);
    expect(html).toContain('background-color:#ffffff');
    expect(html).toContain('border:1px solid #cccccc');
    expect(html).toContain('border-radius:4px');
  });
});

// ---------------------------------------------------------------------------
// Ghost attribute fix: inner-background-color
// ---------------------------------------------------------------------------

describe('compileColumn — inner-background-color', () => {
  const ctx = makeContext({ parentWidth: 600 });

  it('applies inner-background-color to the inner content <td>', () => {
    const node = makeNode('mc-column', {
      'inner-background-color': '#fffbeb',
    });
    const html = compileColumn(node, ctx);
    // Must appear somewhere in the markup
    expect(html).toContain('background-color:#fffbeb');
    // The inner content <td> always has padding and word-break — match it specifically
    const innerTdMatch = html.match(/padding:[^;]+;word-break:[^;]+;([^"]*)">/);
    expect(innerTdMatch).not.toBeNull();
    expect(innerTdMatch![0]).toContain('background-color:#fffbeb');
  });

  it('does not apply inner-background-color to the outer div or Outlook td', () => {
    const node = makeNode('mc-column', {
      'inner-background-color': '#fde8e8',
    });
    const html = compileColumn(node, ctx);
    // The Outlook <td> comment block should NOT have the inner background
    const outlookTdMatch = html.match(/<!--\[if mso \| IE\]>(.*?)<!\[endif\]-->/s);
    expect(outlookTdMatch).not.toBeNull();
    expect(outlookTdMatch![1]).not.toContain('background-color:#fde8e8');
  });

  it('works alongside background-color (outer vs inner bg)', () => {
    const node = makeNode('mc-column', {
      'background-color': '#1e293b',
      'inner-background-color': '#ffffff',
    });
    const html = compileColumn(node, ctx);
    // Both colors present
    expect(html).toContain('background-color:#1e293b');
    expect(html).toContain('background-color:#ffffff');
  });

  it('does not add inner background style when attribute is not set', () => {
    const node = makeNode('mc-column', {});
    const html = compileColumn(node, ctx);
    // The inner content <td> (matched by padding + word-break) should have no background-color
    // when inner-background-color is not set
    expect(html).not.toContain('background-color');
  });
});

// ---------------------------------------------------------------------------
// Padding longhands + border sides
// ---------------------------------------------------------------------------

describe('compileColumn — padding longhands and border sides', () => {
  const ctx = makeContext({ parentWidth: 600 });

  it('applies padding-top attribute', () => {
    const node = makeNode('mc-column', { 'padding-top': '24px' });
    const html = compileColumn(node, ctx);
    expect(html).toContain('padding-top:24px');
  });

  it('applies padding-right attribute', () => {
    const node = makeNode('mc-column', { 'padding-right': '16px' });
    const html = compileColumn(node, ctx);
    expect(html).toContain('padding-right:16px');
  });

  it('applies padding-bottom attribute', () => {
    const node = makeNode('mc-column', { 'padding-bottom': '24px' });
    const html = compileColumn(node, ctx);
    expect(html).toContain('padding-bottom:24px');
  });

  it('applies padding-left attribute', () => {
    const node = makeNode('mc-column', { 'padding-left': '16px' });
    const html = compileColumn(node, ctx);
    expect(html).toContain('padding-left:16px');
  });

  it('padding longhands come after shorthand in style so they override it', () => {
    const node = makeNode('mc-column', {
      padding: '20px',
      'padding-top': '40px',
    });
    const html = compileColumn(node, ctx);
    // Both present; longhand overrides top side in CSS
    expect(html).toContain('padding:20px');
    expect(html).toContain('padding-top:40px');
    // Find the inner td style which contains both (word-break:break-word is its marker)
    const innerTdStyle = html.match(/style="padding:[^"]*word-break:[^"]*"/)?.[0] ?? '';
    expect(innerTdStyle.indexOf('padding-top')).toBeGreaterThan(innerTdStyle.indexOf('padding:'));
  });

  it('applies border-top attribute', () => {
    const node = makeNode('mc-column', { 'border-top': '2px solid #3b82f6' });
    const html = compileColumn(node, ctx);
    expect(html).toContain('border-top:2px solid #3b82f6');
  });

  it('applies border-bottom attribute', () => {
    const node = makeNode('mc-column', { 'border-bottom': '1px solid #e5e7eb' });
    const html = compileColumn(node, ctx);
    expect(html).toContain('border-bottom:1px solid #e5e7eb');
  });

  it('applies border-left attribute', () => {
    const node = makeNode('mc-column', { 'border-left': '4px solid #10b981' });
    const html = compileColumn(node, ctx);
    expect(html).toContain('border-left:4px solid #10b981');
  });

  it('applies border-right attribute', () => {
    const node = makeNode('mc-column', { 'border-right': '4px solid #10b981' });
    const html = compileColumn(node, ctx);
    expect(html).toContain('border-right:4px solid #10b981');
  });

  it('can mix border shorthand with individual border sides', () => {
    const node = makeNode('mc-column', {
      border: '1px solid #ccc',
      'border-left': '4px solid #0ea5e9',
    });
    const html = compileColumn(node, ctx);
    expect(html).toContain('border:1px solid #ccc');
    expect(html).toContain('border-left:4px solid #0ea5e9');
  });
});

// ---------------------------------------------------------------------------
// Styling mode enforcement
// ---------------------------------------------------------------------------

import { ErrorCode } from '../../src/errors/codes.js';

describe('compileColumn — styling mode enforcement', () => {
  it('class mode warns on background-color attr', () => {
    const classCtx = makeContext({ parentWidth: 600, templateStyle: 'class' });
    const node = makeNode('mc-column', { 'background-color': '#ffffff' });
    compileColumn(node, classCtx);
    const v = classCtx.warnings.find((w) => w.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE);
    expect(v).toBeDefined();
    expect(v?.severity).toBe('error');
    expect(v?.message).toContain('"background-color"');
    expect(v?.message).toContain('<mc-column>');
  });

  it('width attr is structural — never flagged in class mode', () => {
    const classCtx = makeContext({ parentWidth: 600, templateStyle: 'class' });
    const node = makeNode('mc-column', { width: '50%' });
    compileColumn(node, classCtx);
    const v = classCtx.warnings.find((w) => w.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE);
    expect(v).toBeUndefined();
  });

  it('attribute mode produces no enforcement warning', () => {
    const attrCtx = makeContext({ parentWidth: 600, templateStyle: 'attribute' });
    const node = makeNode('mc-column', { 'background-color': '#fff', padding: '16px' });
    compileColumn(node, attrCtx);
    const v = attrCtx.warnings.find((w) => w.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE);
    expect(v).toBeUndefined();
  });

  it('class attr is always allowed without warning', () => {
    const classCtx = makeContext({ parentWidth: 600, templateStyle: 'class' });
    const node = makeNode('mc-column', { class: 'bg-[#fff] pr-[8px]' });
    compileColumn(node, classCtx);
    const v = classCtx.warnings.find((w) => w.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE);
    expect(v).toBeUndefined();
  });
});
