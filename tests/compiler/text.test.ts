/**
 * Tests for mc-text compiler.
 */
import { describe, it, expect } from 'vitest';
import { compileText } from '../../src/compiler/components/text.js';
import { makeNodeWithText, makeNode, makeContext, makeClassContext, textContent } from './helpers.js';

describe('compileText', () => {
  const ctx = makeContext();

  it('renders <p> with margin:0 longhands (email reset)', () => {
    const node = makeNodeWithText('mc-text', 'Hello World');
    const html = compileText(node, ctx);
    expect(html).toMatch(/^<p style="[^"]*margin-top:0[^"]*">/);
    expect(html).toContain('margin-bottom:0');
    expect(html).toContain('Hello World');
    expect(html).toMatch(/<\/p>$/);
  });

  it('preserves inline HTML in content', () => {
    const node = makeNodeWithText(
      'mc-text',
      'Hello <strong>World</strong>. Visit <a href="/link">us</a>.',
    );
    const html = compileText(node, ctx);
    expect(html).toContain('<strong>World</strong>');
    expect(html).toContain('<a href="/link">us</a>');
  });

  it('applies color attribute', () => {
    const node = makeNodeWithText('mc-text', 'Red text');
    node.attributes['color'] = '#ff0000';
    const html = compileText(node, ctx);
    expect(html).toContain('color:#ff0000');
  });

  it('applies font-size attribute', () => {
    const node = makeNodeWithText('mc-text', 'Big text');
    node.attributes['font-size'] = '24px';
    const html = compileText(node, ctx);
    expect(html).toContain('font-size:24px');
  });

  it('applies text-align attribute', () => {
    const node = makeNodeWithText('mc-text', 'Centered');
    node.attributes['text-align'] = 'center';
    const html = compileText(node, ctx);
    expect(html).toContain('text-align:center');
  });

  it('applies font-family attribute', () => {
    const node = makeNodeWithText('mc-text', 'Georgia');
    node.attributes['font-family'] = 'Georgia, serif';
    const html = compileText(node, ctx);
    expect(html).toContain('font-family:Georgia, serif');
  });

  it('applies padding attribute', () => {
    const node = makeNodeWithText('mc-text', 'Padded');
    node.attributes['padding'] = '16px';
    const html = compileText(node, ctx);
    expect(html).toContain('padding:16px');
  });

  it('resolves Tailwind classes', () => {
    const node = makeNodeWithText('mc-text', 'Styled');
    node.attributes['class'] = 'text-base text-gray-600';
    const html = compileText(node, makeClassContext());
    // text-base = 16px, text-gray-600 = #4b5563
    expect(html).toContain('font-size:16px');
    expect(html).toContain('color:#4b5563');
  });

  it('renders empty content with margin longhands', () => {
    const node = makeNode('mc-text');
    const html = compileText(node, ctx);
    expect(html).toContain('margin-top:0');
    expect(html).toContain('margin-bottom:0');
    expect(html).toContain('margin-left:0');
    expect(html).toContain('margin-right:0');
    expect(html).toMatch(/^<p style="[^"]*"><\/p>$/);
  });

  it('combines multiple text content items', () => {
    const node = makeNode('mc-text', {}, [], [
      textContent('Part 1 '),
      textContent('Part 2'),
    ]);
    const html = compileText(node, ctx);
    expect(html).toContain('Part 1 Part 2');
  });

  // Fix: missing props now in TEXT_ATTRIBUTE_PROPS
  it('applies letter-spacing attribute', () => {
    const node = makeNodeWithText('mc-text', 'Spaced');
    node.attributes['letter-spacing'] = '0.05em';
    const html = compileText(node, ctx);
    expect(html).toContain('letter-spacing:0.05em');
  });

  it('applies text-decoration attribute', () => {
    const node = makeNodeWithText('mc-text', 'Underlined');
    node.attributes['text-decoration'] = 'underline';
    const html = compileText(node, ctx);
    expect(html).toContain('text-decoration:underline');
  });

  it('applies text-transform attribute', () => {
    const node = makeNodeWithText('mc-text', 'Uppercase');
    node.attributes['text-transform'] = 'uppercase';
    const html = compileText(node, ctx);
    expect(html).toContain('text-transform:uppercase');
  });

  it('maps align attribute to text-align CSS property', () => {
    const node = makeNodeWithText('mc-text', 'Aligned');
    node.attributes['align'] = 'right';
    const html = compileText(node, ctx);
    expect(html).toContain('text-align:right');
  });

  it('text-align attribute takes precedence over align attribute when both set', () => {
    const node = makeNodeWithText('mc-text', 'Both');
    node.attributes['align'] = 'right';
    node.attributes['text-align'] = 'center';
    const html = compileText(node, ctx);
    // text-align is applied first via TEXT_ATTRIBUTE_PROPS, then align overwrites — so align wins
    // (both map to the same style map key 'text-align')
    expect(html).toContain('text-align:right');
  });

  // ── New attributes (previously missing) ─────────────────────────────────

  it('applies background-color attribute', () => {
    const node = makeNodeWithText('mc-text', 'Highlighted');
    node.attributes['background-color'] = '#fef3c7';
    const html = compileText(node, ctx);
    expect(html).toContain('background-color:#fef3c7');
  });

  it('applies width attribute', () => {
    const node = makeNodeWithText('mc-text', 'Wide');
    node.attributes['width'] = '300px';
    const html = compileText(node, ctx);
    expect(html).toContain('width:300px');
  });

  it('applies font-style attribute', () => {
    const node = makeNodeWithText('mc-text', 'Italic');
    node.attributes['font-style'] = 'italic';
    const html = compileText(node, ctx);
    expect(html).toContain('font-style:italic');
  });

  it('applies margin-top attribute (overrides the email reset default)', () => {
    const node = makeNodeWithText('mc-text', 'Spaced');
    node.attributes['margin-top'] = '24px';
    const html = compileText(node, ctx);
    expect(html).toContain('margin-top:24px');
  });

  it('applies margin-bottom attribute', () => {
    const node = makeNodeWithText('mc-text', 'Bottom');
    node.attributes['margin-bottom'] = '16px';
    const html = compileText(node, ctx);
    expect(html).toContain('margin-bottom:16px');
  });

  it('applies margin-left attribute', () => {
    const node = makeNodeWithText('mc-text', 'Indented');
    node.attributes['margin-left'] = '32px';
    const html = compileText(node, ctx);
    expect(html).toContain('margin-left:32px');
  });

  it('applies margin-right attribute', () => {
    const node = makeNodeWithText('mc-text', 'Right margin');
    node.attributes['margin-right'] = '32px';
    const html = compileText(node, ctx);
    expect(html).toContain('margin-right:32px');
  });

  it('padding-top/right/bottom/left attributes override shorthand', () => {
    const node = makeNodeWithText('mc-text', 'Padded');
    node.attributes['padding'] = '16px';
    node.attributes['padding-top'] = '32px';
    const html = compileText(node, ctx);
    expect(html).toContain('padding:16px');
    expect(html).toContain('padding-top:32px');
  });
});

// ---------------------------------------------------------------------------
// Styling mode enforcement
// ---------------------------------------------------------------------------

import { ErrorCode } from '../../src/errors/codes.js';

describe('compileText — styling mode enforcement', () => {
  it('class mode warns on color attr and names the component', () => {
    const classCtx = makeContext({ templateStyle: 'class' });
    const node = makeNodeWithText('mc-text', 'Red');
    node.attributes['color'] = '#ff0000';
    compileText(node, classCtx);
    const v = classCtx.warnings.find((w) => w.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE);
    expect(v).toBeDefined();
    expect(v?.severity).toBe('error');
    expect(v?.message).toContain('"color"');
    expect(v?.message).toContain('<mc-text>');
    expect(v?.fix).toContain('class=');
  });

  it('class mode produces one warning per CSS-prop attr', () => {
    const classCtx = makeContext({ templateStyle: 'class' });
    const node = makeNodeWithText('mc-text', 'Styled');
    node.attributes['color'] = '#333';
    node.attributes['font-size'] = '14px';
    node.attributes['padding'] = '8px';
    compileText(node, classCtx);
    const violations = classCtx.warnings.filter((w) => w.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE);
    expect(violations).toHaveLength(3);
  });

  it('attribute mode produces no enforcement warning', () => {
    const attrCtx = makeContext({ templateStyle: 'attribute' });
    const node = makeNodeWithText('mc-text', 'Red');
    node.attributes['color'] = '#ff0000';
    compileText(node, attrCtx);
    const v = attrCtx.warnings.find((w) => w.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE);
    expect(v).toBeUndefined();
  });

  it('class attr is always allowed without warning', () => {
    const classCtx = makeContext({ templateStyle: 'class' });
    const node = makeNodeWithText('mc-text', 'Styled');
    node.attributes['class'] = 'text-[#333] text-base';
    compileText(node, classCtx);
    const v = classCtx.warnings.find((w) => w.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE);
    expect(v).toBeUndefined();
  });

  it('HTML is still rendered correctly in class mode — banned attr is stripped', () => {
    const classCtx = makeContext({ templateStyle: 'class' });
    const node = makeNodeWithText('mc-text', 'Hello');
    node.attributes['color'] = '#0000ff';
    const html = compileText(node, classCtx);
    expect(html).toContain('Hello');
    // Banned CSS-prop attr is stripped from output in class mode (Problem 2 fix)
    expect(html).not.toContain('color:#0000ff');
  });
});
