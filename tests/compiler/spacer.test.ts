/**
 * Tests for mc-spacer compiler.
 */
import { describe, it, expect } from 'vitest';
import { compileSpacer } from '../../src/compiler/components/spacer.js';
import { makeNode, makeContext, makeClassContext } from './helpers.js';
import { ErrorCode } from '../../src/errors/codes.js';

describe('compileSpacer', () => {
  const ctx = makeContext();

  it('renders default 20px spacer', () => {
    const node = makeNode('mc-spacer');
    const html = compileSpacer(node, ctx);
    expect(html).toBe(
      '<div style="height:20px;line-height:20px;font-size:1px">&nbsp;</div>',
    );
  });

  it('uses explicit height attribute', () => {
    const node = makeNode('mc-spacer', { height: '32px' });
    const html = compileSpacer(node, ctx);
    expect(html).toContain('height:32px');
    expect(html).toContain('line-height:32px');
  });

  it('handles height without px suffix', () => {
    const node = makeNode('mc-spacer', { height: '48' });
    const html = compileSpacer(node, ctx);
    expect(html).toContain('height:48px');
    expect(html).toContain('line-height:48px');
  });

  it('includes font-size:1px to prevent minimum height', () => {
    const node = makeNode('mc-spacer');
    const html = compileSpacer(node, ctx);
    expect(html).toContain('font-size:1px');
  });

  it('includes &nbsp; to prevent empty div collapse', () => {
    const node = makeNode('mc-spacer');
    const html = compileSpacer(node, ctx);
    expect(html).toContain('&nbsp;');
  });

  it('resolves height from Tailwind h-* class', () => {
    const node = makeNode('mc-spacer', { class: 'h-8' });
    const html = compileSpacer(node, makeClassContext());
    // h-8 = 32px in default theme
    expect(html).toContain('height:32px');
    expect(html).toContain('line-height:32px');
  });

  // Contract: every knownAttribute must appear in compiled output
  it('applies padding attribute to the outer <div>', () => {
    const node = makeNode('mc-spacer', { height: '20px', padding: '8px 0' });
    const html = compileSpacer(node, ctx);
    expect(html).toContain('padding:8px 0');
  });

  it('applies container-background-color to the outer <div>', () => {
    const node = makeNode('mc-spacer', { 'container-background-color': '#f0fdf4' });
    const html = compileSpacer(node, ctx);
    expect(html).toContain('background-color:#f0fdf4');
    expect(html).toMatch(/<div style="[^"]*background-color:#f0fdf4[^"]*">/);
  });
});

// ---------------------------------------------------------------------------
// Styling mode enforcement
// ---------------------------------------------------------------------------

describe('compileSpacer — styling mode enforcement', () => {
  it('class mode warns on height attr', () => {
    const classCtx = makeContext({ templateStyle: 'class' });
    const node = makeNode('mc-spacer', { height: '32px' });
    compileSpacer(node, classCtx);
    const v = classCtx.warnings.find((w) => w.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE);
    expect(v).toBeDefined();
    expect(v?.severity).toBe('error');
    expect(v?.message).toContain('"height"');
    expect(v?.message).toContain('<mc-spacer>');
  });

  it('class mode warns on container-background-color attr', () => {
    const classCtx = makeContext({ templateStyle: 'class' });
    const node = makeNode('mc-spacer', { 'container-background-color': '#ffffff' });
    compileSpacer(node, classCtx);
    const v = classCtx.warnings.find((w) => w.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE);
    expect(v).toBeDefined();
  });

  it('attribute mode produces no enforcement warning', () => {
    const attrCtx = makeContext({ templateStyle: 'attribute' });
    const node = makeNode('mc-spacer', { height: '32px' });
    compileSpacer(node, attrCtx);
    const v = attrCtx.warnings.find((w) => w.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE);
    expect(v).toBeUndefined();
  });

  it('class attr is always allowed without warning', () => {
    const classCtx = makeContext({ templateStyle: 'class' });
    const node = makeNode('mc-spacer', { class: 'h-[32px]' });
    compileSpacer(node, classCtx);
    const v = classCtx.warnings.find((w) => w.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE);
    expect(v).toBeUndefined();
  });
});
