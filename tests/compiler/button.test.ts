/**
 * Tests for mc-button compiler.
 */
import { describe, it, expect } from 'vitest';
import { compileButton } from '../../src/compiler/components/button.js';
import { makeNodeWithText, makeContext } from './helpers.js';

describe('compileButton', () => {
  const ctx = makeContext();

  it('renders VML v:roundrect for Outlook', () => {
    const node = makeNodeWithText('mc-button', 'Buy Now');
    node.attributes['href'] = 'https://example.com/buy';
    const html = compileButton(node, ctx);
    expect(html).toContain('<!--[if mso]>');
    expect(html).toContain('v:roundrect');
    expect(html).toContain('href="https://example.com/buy"');
  });

  it('renders <a> for non-Outlook', () => {
    const node = makeNodeWithText('mc-button', 'Click');
    node.attributes['href'] = 'https://example.com';
    const html = compileButton(node, ctx);
    expect(html).toContain('<!--[if !mso]><!-->');
    expect(html).toContain('<a href="https://example.com"');
    expect(html).toContain('display:inline-block');
    expect(html).toContain('Click');
  });

  it('wraps in text-align div', () => {
    const node = makeNodeWithText('mc-button', 'CTA');
    node.attributes['href'] = '#';
    const html = compileButton(node, ctx);
    expect(html).toMatch(/^<div style="text-align:center;">/);
  });

  it('uses default styles when no class or attributes', () => {
    const node = makeNodeWithText('mc-button', 'Default');
    node.attributes['href'] = '#';
    const html = compileButton(node, ctx);
    expect(html).toContain('fillcolor="#000000"');
    expect(html).toContain('color:#ffffff');
    expect(html).toContain('font-size:16px');
    expect(html).toContain('font-weight:bold');
  });

  it('applies background-color attribute', () => {
    const node = makeNodeWithText('mc-button', 'Colored');
    node.attributes['href'] = '#';
    node.attributes['background-color'] = '#e85d3a';
    const html = compileButton(node, ctx);
    expect(html).toContain('fillcolor="#e85d3a"');
    expect(html).toContain('background-color:#e85d3a');
  });

  it('applies color attribute', () => {
    const node = makeNodeWithText('mc-button', 'Text');
    node.attributes['href'] = '#';
    node.attributes['color'] = '#333333';
    const html = compileButton(node, ctx);
    expect(html).toContain('color:#333333');
  });

  it('calculates VML arcsize from border-radius', () => {
    const node = makeNodeWithText('mc-button', 'Rounded');
    node.attributes['href'] = '#';
    node.attributes['border-radius'] = '4px';
    node.attributes['font-size'] = '16px';
    node.attributes['padding'] = '12px 24px';
    const html = compileButton(node, ctx);
    // height = 16 + 12*2 = 40px, arcsize = 4/40 * 100 = 10%
    expect(html).toContain('arcsize="10%"');
  });

  it('uses 0% arcsize for no border-radius', () => {
    const node = makeNodeWithText('mc-button', 'Square');
    node.attributes['href'] = '#';
    node.attributes['border-radius'] = '0';
    const html = compileButton(node, ctx);
    expect(html).toContain('arcsize="0%"');
  });

  it('includes text-decoration:none on anchor', () => {
    const node = makeNodeWithText('mc-button', 'Link');
    node.attributes['href'] = '#';
    const html = compileButton(node, ctx);
    expect(html).toContain('text-decoration:none');
  });

  it('includes -webkit-text-size-adjust on anchor', () => {
    const node = makeNodeWithText('mc-button', 'iOS');
    node.attributes['href'] = '#';
    const html = compileButton(node, ctx);
    expect(html).toContain('-webkit-text-size-adjust:none');
  });

  it('includes w:anchorlock in VML', () => {
    const node = makeNodeWithText('mc-button', 'VML');
    node.attributes['href'] = '#';
    const html = compileButton(node, ctx);
    expect(html).toContain('<w:anchorlock/>');
  });

  it('respects text-align attribute for wrapper', () => {
    const node = makeNodeWithText('mc-button', 'Left');
    node.attributes['href'] = '#';
    node.attributes['text-align'] = 'left';
    const html = compileButton(node, ctx);
    expect(html).toContain('text-align:left');
  });

  it('uses target=_blank on anchor', () => {
    const node = makeNodeWithText('mc-button', 'Link');
    node.attributes['href'] = 'https://example.com';
    const html = compileButton(node, ctx);
    expect(html).toContain('target="_blank"');
  });

  it('VML strokecolor matches fillcolor', () => {
    const node = makeNodeWithText('mc-button', 'Match');
    node.attributes['href'] = '#';
    node.attributes['background-color'] = '#abcdef';
    const html = compileButton(node, ctx);
    expect(html).toContain('strokecolor="#abcdef"');
    expect(html).toContain('fillcolor="#abcdef"');
  });

  // Bug 1 & 6 fixes: inner-padding controls <a> tag padding and VML height
  it('uses inner-padding for <a> tag padding, not outer padding', () => {
    const node = makeNodeWithText('mc-button', 'Buy');
    node.attributes['href'] = '#';
    node.attributes['inner-padding'] = '8px 20px';
    node.attributes['padding'] = '32px'; // outer layout padding — must NOT appear on <a>
    const html = compileButton(node, ctx);
    // The <a> tag must use inner-padding, not the outer padding
    expect(html).toContain('padding:8px 20px');
    expect(html).not.toContain('padding:32px');
  });

  it('falls back to padding when inner-padding is not set', () => {
    const node = makeNodeWithText('mc-button', 'Buy');
    node.attributes['href'] = '#';
    node.attributes['padding'] = '14px 30px';
    const html = compileButton(node, ctx);
    expect(html).toContain('padding:14px 30px');
  });

  it('computes VML arcsize using inner-padding height, not outer padding', () => {
    const node = makeNodeWithText('mc-button', 'VML');
    node.attributes['href'] = '#';
    node.attributes['font-size'] = '16px';
    node.attributes['inner-padding'] = '10px 25px'; // height = 16 + 10*2 = 36
    node.attributes['border-radius'] = '4px';
    node.attributes['padding'] = '40px'; // outer padding — must NOT affect VML height
    const html = compileButton(node, ctx);
    // arcsize = round(4/36 * 100) = 11%
    expect(html).toContain('arcsize="11%"');
  });

  // Contract: every knownAttribute must appear in compiled output
  it('applies border attribute to the <a> tag style', () => {
    const node = makeNodeWithText('mc-button', 'Bordered');
    node.attributes['href'] = '#';
    node.attributes['border'] = '2px solid #333333';
    const html = compileButton(node, ctx);
    expect(html).toContain('border:2px solid #333333');
  });

  it('applies letter-spacing attribute to the <a> tag style', () => {
    const node = makeNodeWithText('mc-button', 'Spaced');
    node.attributes['href'] = '#';
    node.attributes['letter-spacing'] = '0.1em';
    const html = compileButton(node, ctx);
    expect(html).toContain('letter-spacing:0.1em');
  });

  it('applies line-height derived from font-size', () => {
    const node = makeNodeWithText('mc-button', 'Sized');
    node.attributes['href'] = '#';
    node.attributes['font-size'] = '20px';
    const html = compileButton(node, ctx);
    // line-height is set to font-size value on the <a>
    expect(html).toContain('line-height:20px');
  });
});

// ---------------------------------------------------------------------------
// Security: rel, target, URL sanitisation
// ---------------------------------------------------------------------------

describe('compileButton — security', () => {
  const ctx = makeContext();

  it('adds rel="noopener noreferrer" by default', () => {
    const node = makeNodeWithText('mc-button', 'Buy Now');
    node.attributes['href'] = 'https://example.com/buy';
    const html = compileButton(node, ctx);
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('defaults target to _blank', () => {
    const node = makeNodeWithText('mc-button', 'Buy Now');
    node.attributes['href'] = 'https://example.com/buy';
    const html = compileButton(node, ctx);
    expect(html).toContain('target="_blank"');
  });

  it('respects custom target attribute', () => {
    const node = makeNodeWithText('mc-button', 'Go');
    node.attributes['href'] = 'https://example.com';
    node.attributes['target'] = '_self';
    const html = compileButton(node, ctx);
    expect(html).toContain('target="_self"');
    expect(html).not.toContain('target="_blank"');
  });

  it('respects custom rel attribute', () => {
    const node = makeNodeWithText('mc-button', 'Go');
    node.attributes['href'] = 'https://example.com';
    node.attributes['rel'] = 'noopener';
    const html = compileButton(node, ctx);
    expect(html).toContain('rel="noopener"');
  });

  it('blocks javascript: href and emits UNSAFE_URL error', () => {
    const secCtx = makeContext();
    const node = makeNodeWithText('mc-button', 'Click');
    node.attributes['href'] = 'javascript:alert(1)';
    const html = compileButton(node, secCtx);
    // Unsafe href replaced with '#'
    expect(html).not.toContain('javascript:');
    expect(html).toContain('href="#"');
    // Error emitted
    const err = secCtx.warnings.find((w) => w.code === 'UNSAFE_URL');
    expect(err).toBeDefined();
    expect(err!.severity).toBe('error');
    expect(err!.message).toContain('"href"');
  });

  it('blocks data: href and emits UNSAFE_URL error', () => {
    const secCtx = makeContext();
    const node = makeNodeWithText('mc-button', 'Click');
    node.attributes['href'] = 'data:text/html,<script>alert(1)</script>';
    const html = compileButton(node, secCtx);
    expect(html).not.toContain('data:');
    expect(html).toContain('href="#"');
    const err = secCtx.warnings.find((w) => w.code === 'UNSAFE_URL');
    expect(err).toBeDefined();
  });

  it('blocks vbscript: href', () => {
    const secCtx = makeContext();
    const node = makeNodeWithText('mc-button', 'Click');
    node.attributes['href'] = 'vbscript:msgbox(1)';
    compileButton(node, secCtx);
    const err = secCtx.warnings.find((w) => w.code === 'UNSAFE_URL');
    expect(err).toBeDefined();
  });

  it('allows https: URLs without warning', () => {
    const secCtx = makeContext();
    const node = makeNodeWithText('mc-button', 'Click');
    node.attributes['href'] = 'https://example.com/checkout';
    compileButton(node, secCtx);
    const err = secCtx.warnings.find((w) => w.code === 'UNSAFE_URL');
    expect(err).toBeUndefined();
  });

  it('blocks javascript: with leading whitespace (bypass attempt)', () => {
    const secCtx = makeContext();
    const node = makeNodeWithText('mc-button', 'Click');
    node.attributes['href'] = '   javascript:alert(1)';
    const html = compileButton(node, secCtx);
    expect(html).toContain('href="#"');
    const err = secCtx.warnings.find((w) => w.code === 'UNSAFE_URL');
    expect(err).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Attribute gaps fixed: text-decoration, text-transform, padding longhands, height
// ---------------------------------------------------------------------------

describe('compileButton — previously broken attributes', () => {
  const ctx = makeContext();

  it('text-decoration attribute overrides hardcoded none', () => {
    const node = makeNodeWithText('mc-button', 'Underline');
    node.attributes['href'] = '#';
    node.attributes['text-decoration'] = 'underline';
    const html = compileButton(node, ctx);
    expect(html).toContain('text-decoration:underline');
  });

  it('text-decoration defaults to none when not specified', () => {
    const node = makeNodeWithText('mc-button', 'Default');
    node.attributes['href'] = '#';
    const html = compileButton(node, ctx);
    expect(html).toContain('text-decoration:none');
  });

  it('text-transform attribute is applied to the anchor', () => {
    const node = makeNodeWithText('mc-button', 'Uppercase');
    node.attributes['href'] = '#';
    node.attributes['text-transform'] = 'uppercase';
    const html = compileButton(node, ctx);
    expect(html).toContain('text-transform:uppercase');
  });

  it('text-transform is omitted when not specified', () => {
    const node = makeNodeWithText('mc-button', 'Normal');
    node.attributes['href'] = '#';
    const html = compileButton(node, ctx);
    expect(html).not.toContain('text-transform');
  });

  it('height attribute overrides computed button height in VML', () => {
    const node = makeNodeWithText('mc-button', 'Tall');
    node.attributes['href'] = '#';
    node.attributes['height'] = '60px';
    node.attributes['font-size'] = '16px';
    node.attributes['padding'] = '10px 25px';
    const html = compileButton(node, ctx);
    // Computed would be 16 + 10*2 = 36px, but explicit height=60px should be used
    expect(html).toContain('height:60px');
  });

  it('computed height still works when height attribute not set', () => {
    const node = makeNodeWithText('mc-button', 'Auto');
    node.attributes['href'] = '#';
    node.attributes['font-size'] = '16px';
    node.attributes['padding'] = '12px 24px';
    const html = compileButton(node, ctx);
    // 16 + 12*2 = 40px
    expect(html).toContain('height:40px');
  });

  it('padding-top attribute composited into inner padding', () => {
    const node = makeNodeWithText('mc-button', 'PadTop');
    node.attributes['href'] = '#';
    node.attributes['padding'] = '10px 25px';
    node.attributes['padding-top'] = '20px';
    const html = compileButton(node, ctx);
    // Should compose: 20px 25px 10px 25px
    expect(html).toContain('padding:20px 25px 10px 25px');
  });

  it('padding-left and padding-right attributes compose into inner padding', () => {
    const node = makeNodeWithText('mc-button', 'Wide');
    node.attributes['href'] = '#';
    node.attributes['padding'] = '10px 25px';
    node.attributes['padding-left'] = '40px';
    node.attributes['padding-right'] = '40px';
    const html = compileButton(node, ctx);
    expect(html).toContain('padding:10px 40px 10px 40px');
  });
});

// ---------------------------------------------------------------------------
// Styling mode enforcement
// ---------------------------------------------------------------------------

import { ErrorCode } from '../../src/errors/codes.js';

describe('compileButton — styling mode enforcement', () => {
  it('class mode warns on background-color attr', () => {
    const classCtx = makeContext({ templateStyle: 'class' });
    const node = makeNodeWithText('mc-button', 'Buy');
    node.attributes['href'] = 'https://example.com';
    node.attributes['background-color'] = '#000000';
    compileButton(node, classCtx);
    const v = classCtx.warnings.find((w) => w.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE);
    expect(v).toBeDefined();
    expect(v?.severity).toBe('error');
    expect(v?.message).toContain('"background-color"');
    expect(v?.message).toContain('<mc-button>');
  });

  it('href attr is structural — never flagged in class mode', () => {
    const classCtx = makeContext({ templateStyle: 'class' });
    const node = makeNodeWithText('mc-button', 'Buy');
    node.attributes['href'] = 'https://example.com';
    compileButton(node, classCtx);
    const v = classCtx.warnings.find((w) => w.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE);
    expect(v).toBeUndefined();
  });

  it('attribute mode produces no enforcement warning', () => {
    const attrCtx = makeContext({ templateStyle: 'attribute' });
    const node = makeNodeWithText('mc-button', 'Buy');
    node.attributes['href'] = '#';
    node.attributes['background-color'] = '#000000';
    node.attributes['color'] = '#ffffff';
    compileButton(node, attrCtx);
    const v = attrCtx.warnings.find((w) => w.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE);
    expect(v).toBeUndefined();
  });

  it('class attr is always allowed without warning', () => {
    const classCtx = makeContext({ templateStyle: 'class' });
    const node = makeNodeWithText('mc-button', 'Buy');
    node.attributes['href'] = '#';
    node.attributes['class'] = 'bg-[#000] text-[#fff] py-[12px] px-[24px]';
    compileButton(node, classCtx);
    const v = classCtx.warnings.find((w) => w.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE);
    expect(v).toBeUndefined();
  });
});
