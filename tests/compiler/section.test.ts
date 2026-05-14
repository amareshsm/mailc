/**
 * Tests for mc-section compiler.
 */
import { describe, it, expect } from 'vitest';
import { compileSection } from '../../src/compiler/components/section.js';
import { makeNode, makeContext, makeClassContext } from './helpers.js';

describe('compileSection', () => {
  const ctx = makeContext();

  it('renders outer table at 100% width', () => {
    const node = makeNode('mc-section');
    const html = compileSection(node, ctx);
    expect(html).toContain('width="100%"');
    expect(html).toContain('role="presentation"');
  });

  it('renders Outlook conditional column wrapper table', () => {
    const node = makeNode('mc-section');
    const html = compileSection(node, ctx);
    // mc-section provides the column ghost table (width="100%") inside the section <td>.
    // The 600px outer ghost is mc-body's responsibility — not mc-section's.
    expect(html).toContain('<!--[if mso | IE]>');
    expect(html).toContain('width="100%"');
  });

  it('does not generate its own 600px Outlook ghost table (mc-body does that)', () => {
    const node = makeNode('mc-section');
    const html = compileSection(node, ctx);
    // No section-level width="600" ghost — that belongs to mc-body.
    const ghostTable = html.match(/width="600"/);
    expect(ghostTable).toBeNull();
  });

  it('does not generate its own max-width div (mc-body does that)', () => {
    const node = makeNode('mc-section');
    const html = compileSection(node, ctx);
    // No inner max-width div — that belongs to mc-body.
    expect(html).not.toContain('max-width:600px');
    expect(html).not.toContain('margin:0 auto');
  });

  it('renders column Outlook wrapper table', () => {
    const node = makeNode('mc-section');
    const html = compileSection(node, ctx);
    // Should have inner Outlook table for column layout
    const msoMatches = html.match(/<!--\[if mso \| IE\]>/g) ?? [];
    expect(msoMatches.length).toBeGreaterThanOrEqual(2);
  });

  it('applies background-color from attribute', () => {
    const node = makeNode('mc-section', {
      'background-color': '#ffffff',
    });
    const html = compileSection(node, ctx);
    expect(html).toContain('background-color:#ffffff');
  });

  it('applies bgcolor HTML attribute for Outlook compatibility', () => {
    const node = makeNode('mc-section', {
      'background-color': '#ffffff',
    });
    const html = compileSection(node, ctx);
    expect(html).toContain('bgcolor="#ffffff"');
  });

  it('does not include bgcolor when no background-color', () => {
    const node = makeNode('mc-section');
    const html = compileSection(node, ctx);
    expect(html).not.toContain('bgcolor');
  });

  it('applies padding from attribute', () => {
    const node = makeNode('mc-section', { padding: '32px 24px' });
    const html = compileSection(node, ctx);
    expect(html).toContain('padding:32px 24px');
  });

  it('includes font-size:0 on inner td for whitespace collapse', () => {
    const node = makeNode('mc-section');
    const html = compileSection(node, ctx);
    expect(html).toContain('font-size:0');
    expect(html).toContain('word-break:break-word');
  });

  it('supports full-width attribute without changing column pixel budget', () => {
    const classCtx = makeClassContext();
    const col = makeNode('mc-column', { class: 'w-1/2' });
    const nodeNormal = makeNode('mc-section', {}, [col]);
    const nodeFullWidth = makeNode('mc-section', { 'full-width': 'true' }, [col]);
    const htmlNormal = compileSection(nodeNormal, classCtx);
    const htmlFullWidth = compileSection(nodeFullWidth, classCtx);
    // Both variants compile without error and produce the same column widths
    expect(htmlNormal).toContain('max-width:300px');
    expect(htmlFullWidth).toContain('max-width:300px');
    // Neither section adds its own 600px wrapper — that's mc-body's job
    expect(htmlNormal).not.toContain('max-width:600px');
    expect(htmlFullWidth).not.toContain('max-width:600px');
  });

  it('compiles child column nodes', () => {
    const classCtx = makeClassContext();
    const col = makeNode('mc-column', { class: 'w-1/2' });
    const node = makeNode('mc-section', {}, [col]);
    const html = compileSection(node, classCtx);
    expect(html).toContain('mc-responsive');
    expect(html).toContain('max-width:300px');
  });

  it('uses role="presentation" on all tables', () => {
    const node = makeNode('mc-section');
    const html = compileSection(node, ctx);
    const roleCount = (html.match(/role="presentation"/g) ?? []).length;
    expect(roleCount).toBeGreaterThanOrEqual(1);
  });

  it('uses border="0" and cellpadding="0" cellspacing="0"', () => {
    const node = makeNode('mc-section');
    const html = compileSection(node, ctx);
    expect(html).toContain('border="0"');
    expect(html).toContain('cellpadding="0"');
    expect(html).toContain('cellspacing="0"');
  });

  it('resolves background-color from Tailwind class', () => {
    const node = makeNode('mc-section', { class: 'bg-white' });
    const html = compileSection(node, makeClassContext());
    expect(html).toContain('background-color:#ffffff');
  });

  // Fix: text-align attribute must be applied to the inner <td align="...">
  it('applies text-align attribute to the inner td', () => {
    const node = makeNode('mc-section', { 'text-align': 'left' });
    const html = compileSection(node, ctx);
    expect(html).toContain('align="left"');
  });

  it('defaults text-align to center when not specified', () => {
    const node = makeNode('mc-section');
    const html = compileSection(node, ctx);
    expect(html).toContain('align="center"');
  });

  it('applies text-align="right" attribute', () => {
    const node = makeNode('mc-section', { 'text-align': 'right' });
    const html = compileSection(node, ctx);
    expect(html).toContain('align="right"');
  });

  // Fix: border attribute applied to the inner <td> style
  it('applies border attribute to the inner td style', () => {
    const node = makeNode('mc-section', { border: '1px solid #cccccc' });
    const html = compileSection(node, ctx);
    expect(html).toContain('border:1px solid #cccccc');
  });

  // border-radius goes on the outer table style (not a removed inner div)
  it('applies border-radius attribute to the outer table style', () => {
    const node = makeNode('mc-section', { 'border-radius': '8px' });
    const html = compileSection(node, ctx);
    expect(html).toContain('border-radius:8px');
  });

  it('applies both border and border-radius together', () => {
    const node = makeNode('mc-section', {
      border: '2px solid #000',
      'border-radius': '4px',
    });
    const html = compileSection(node, ctx);
    expect(html).toContain('border:2px solid #000');
    expect(html).toContain('border-radius:4px');
  });

  it('applies background-url as background-image on the outer table', () => {
    const node = makeNode('mc-section', {
      'background-url': 'https://example.com/bg.jpg',
    });
    const html = compileSection(node, ctx);
    expect(html).toContain('background-image:url(https://example.com/bg.jpg)');
    expect(html).toContain('background-size:cover');
    expect(html).toContain('background-position:center');
  });

  // Bug #2 fix: mso-line-height-rule:exactly prevents Outlook adding extra
  // line-height spacing above/below the section container
  it('includes mso-line-height-rule:exactly on the section td', () => {
    const node = makeNode('mc-section');
    const html = compileSection(node, ctx);
    expect(html).toContain('mso-line-height-rule:exactly');
  });

  it('has exactly one 600px Outlook ghost table in full email (provided by mc-body)', () => {
    // When section is compiled standalone it has zero 600px ghost tables.
    // The 600px wrapper is entirely mc-body's responsibility.
    const node = makeNode('mc-section');
    const html = compileSection(node, ctx);
    const count = (html.match(/width="600"/g) ?? []).length;
    expect(count).toBe(0);
  });

  // ── Padding longhands ────────────────────────────────────────────────────

  it('applies padding-top attribute as CSS longhand', () => {
    const node = makeNode('mc-section', { 'padding-top': '40px' });
    const html = compileSection(node, ctx);
    expect(html).toContain('padding-top:40px');
  });

  it('applies padding-right attribute', () => {
    const node = makeNode('mc-section', { 'padding-right': '32px' });
    const html = compileSection(node, ctx);
    expect(html).toContain('padding-right:32px');
  });

  it('applies padding-bottom attribute', () => {
    const node = makeNode('mc-section', { 'padding-bottom': '40px' });
    const html = compileSection(node, ctx);
    expect(html).toContain('padding-bottom:40px');
  });

  it('applies padding-left attribute', () => {
    const node = makeNode('mc-section', { 'padding-left': '32px' });
    const html = compileSection(node, ctx);
    expect(html).toContain('padding-left:32px');
  });

  it('padding longhands override shorthand for specific sides', () => {
    const node = makeNode('mc-section', {
      padding: '20px',
      'padding-top': '40px',
    });
    const html = compileSection(node, ctx);
    expect(html).toContain('padding:20px');
    expect(html).toContain('padding-top:40px');
  });

  it('subtracts padding-left + padding-right longhands from column budget', () => {
    const col = makeNode('mc-column', { class: 'w-full' });
    const node = makeNode('mc-section', {
      'padding-left': '32px',
      'padding-right': '32px',
    }, [col]);
    const html = compileSection(node, ctx);
    // 600 - 32 - 32 = 536px
    expect(html).toContain('max-width:536px');
  });

  // ── Individual border sides ───────────────────────────────────────────────

  it('applies border-top attribute', () => {
    const node = makeNode('mc-section', { 'border-top': '2px solid #e5e7eb' });
    const html = compileSection(node, ctx);
    expect(html).toContain('border-top:2px solid #e5e7eb');
  });

  it('applies border-bottom attribute', () => {
    const node = makeNode('mc-section', { 'border-bottom': '1px solid #000' });
    const html = compileSection(node, ctx);
    expect(html).toContain('border-bottom:1px solid #000');
  });

  it('applies border-left and border-right attributes', () => {
    const node = makeNode('mc-section', {
      'border-left': '4px solid blue',
      'border-right': '4px solid blue',
    });
    const html = compileSection(node, ctx);
    expect(html).toContain('border-left:4px solid blue');
    expect(html).toContain('border-right:4px solid blue');
  });

  it('can combine border shorthand with individual border sides', () => {
    const node = makeNode('mc-section', {
      border: '1px solid #ccc',
      'border-top': '3px solid #000',
    });
    const html = compileSection(node, ctx);
    expect(html).toContain('border:1px solid #ccc');
    expect(html).toContain('border-top:3px solid #000');
  });

  // ── Background-position and background-size ───────────────────────────────

  it('applies background-position attribute', () => {
    const node = makeNode('mc-section', {
      'background-url': 'https://example.com/bg.jpg',
      'background-position': 'top',
    });
    const html = compileSection(node, ctx);
    expect(html).toContain('background-position:top');
  });

  it('applies background-size attribute', () => {
    const node = makeNode('mc-section', {
      'background-url': 'https://example.com/bg.jpg',
      'background-size': 'contain',
    });
    const html = compileSection(node, ctx);
    expect(html).toContain('background-size:contain');
  });

  it('defaults background-position to center when not specified', () => {
    const node = makeNode('mc-section', {
      'background-url': 'https://example.com/bg.jpg',
    });
    const html = compileSection(node, ctx);
    expect(html).toContain('background-position:center');
  });

  it('defaults background-size to cover when not specified', () => {
    const node = makeNode('mc-section', {
      'background-url': 'https://example.com/bg.jpg',
    });
    const html = compileSection(node, ctx);
    expect(html).toContain('background-size:cover');
  });
});

// ---------------------------------------------------------------------------
// Styling mode enforcement
// ---------------------------------------------------------------------------

import { ErrorCode } from '../../src/errors/codes.js';

describe('compileSection — styling mode enforcement', () => {
  it('class mode warns on background-color attr', () => {
    const classCtx = makeContext({ templateStyle: 'class' });
    const node = makeNode('mc-section', { 'background-color': '#ffffff' });
    compileSection(node, classCtx);
    const v = classCtx.warnings.find((w) => w.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE);
    expect(v).toBeDefined();
    expect(v?.severity).toBe('error');
    expect(v?.message).toContain('"background-color"');
    expect(v?.message).toContain('<mc-section>');
  });

  it('class mode warns on padding attr', () => {
    const classCtx = makeContext({ templateStyle: 'class' });
    const node = makeNode('mc-section', { padding: '32px 24px' });
    compileSection(node, classCtx);
    const v = classCtx.warnings.find((w) => w.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE);
    expect(v).toBeDefined();
  });

  it('attribute mode produces no enforcement warning', () => {
    const attrCtx = makeContext({ templateStyle: 'attribute' });
    const node = makeNode('mc-section', { 'background-color': '#fff', padding: '32px' });
    compileSection(node, attrCtx);
    const v = attrCtx.warnings.find((w) => w.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE);
    expect(v).toBeUndefined();
  });

  it('class attr is always allowed without warning', () => {
    const classCtx = makeContext({ templateStyle: 'class' });
    const node = makeNode('mc-section', { class: 'bg-[#ffffff] py-[32px] px-[24px]' });
    compileSection(node, classCtx);
    const v = classCtx.warnings.find((w) => w.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE);
    expect(v).toBeUndefined();
  });
});
