/**
 * Tests for mc-divider compiler.
 */
import { describe, it, expect } from 'vitest';
import { compileDivider } from '../../src/compiler/components/divider.js';
import { ErrorCode } from '../../src/errors/codes.js';
import { makeNode, makeContext } from './helpers.js';

describe('compileDivider', () => {
  const ctx = makeContext();

  it('renders default divider', () => {
    const node = makeNode('mc-divider');
    const html = compileDivider(node, ctx);
    expect(html).toContain('border-top:1px solid #e5e7eb');
    expect(html).toContain('padding:16px 0');
    expect(html).toContain('width:100%');
  });

  it('wraps in <p> with margin:0', () => {
    const node = makeNode('mc-divider');
    const html = compileDivider(node, ctx);
    expect(html).toMatch(/^<p style="margin:0;/);
  });

  it('includes font-size:1px and line-height:1px on <p>', () => {
    const node = makeNode('mc-divider');
    const html = compileDivider(node, ctx);
    expect(html).toContain('font-size:1px');
    expect(html).toContain('line-height:1px');
  });

  it('uses span with display:block for the line', () => {
    const node = makeNode('mc-divider');
    const html = compileDivider(node, ctx);
    expect(html).toContain('<span style="display:block;');
  });

  it('respects border-color attribute', () => {
    const node = makeNode('mc-divider', { 'border-color': '#ff0000' });
    const html = compileDivider(node, ctx);
    expect(html).toContain('#ff0000');
  });

  it('respects border-width attribute', () => {
    const node = makeNode('mc-divider', { 'border-width': '2px' });
    const html = compileDivider(node, ctx);
    expect(html).toContain('border-top:2px solid');
  });

  it('respects border-style attribute', () => {
    const node = makeNode('mc-divider', { 'border-style': 'dashed' });
    const html = compileDivider(node, ctx);
    expect(html).toContain('dashed');
  });

  it('respects padding attribute', () => {
    const node = makeNode('mc-divider', { padding: '24px 0' });
    const html = compileDivider(node, ctx);
    expect(html).toContain('padding:24px 0');
  });

  it('respects width attribute', () => {
    const node = makeNode('mc-divider', { width: '80%' });
    const html = compileDivider(node, ctx);
    expect(html).toContain('width:80%');
  });

  it('combines all custom attributes', () => {
    const node = makeNode('mc-divider', {
      'border-color': '#333',
      'border-width': '3px',
      'border-style': 'dotted',
      padding: '8px 0',
      width: '50%',
    });
    const html = compileDivider(node, ctx);
    expect(html).toContain('border-top:3px dotted #333');
    expect(html).toContain('padding:8px 0');
    expect(html).toContain('width:50%');
  });

  // Contract: every knownAttribute must appear in compiled output
  it('applies container-background-color to the outer <p>', () => {
    const node = makeNode('mc-divider', { 'container-background-color': '#fef9c3' });
    const html = compileDivider(node, ctx);
    expect(html).toContain('background-color:#fef9c3');
    // Must be on the <p> wrapper, not the inner span
    expect(html).toMatch(/<p style="[^"]*background-color:#fef9c3[^"]*">/);
  });
});

// ---------------------------------------------------------------------------
// Styling mode enforcement
// ---------------------------------------------------------------------------

describe('compileDivider — styling mode enforcement', () => {
  it('class mode warns on border-color attr', () => {
    const classCtx = makeContext({ templateStyle: 'class' });
    const node = makeNode('mc-divider', { 'border-color': '#ff0000' });
    compileDivider(node, classCtx);
    const v = classCtx.warnings.find((w) => w.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE);
    expect(v).toBeDefined();
    expect(v?.severity).toBe('error');
    expect(v?.message).toContain('"border-color"');
    expect(v?.message).toContain('<mc-divider>');
  });

  it('class mode warns on padding attr', () => {
    const classCtx = makeContext({ templateStyle: 'class' });
    const node = makeNode('mc-divider', { padding: '8px 0' });
    compileDivider(node, classCtx);
    const v = classCtx.warnings.find((w) => w.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE);
    expect(v).toBeDefined();
  });

  it('attribute mode produces no enforcement warning', () => {
    const attrCtx = makeContext({ templateStyle: 'attribute' });
    const node = makeNode('mc-divider', { 'border-color': '#ff0000', padding: '8px 0' });
    compileDivider(node, attrCtx);
    const v = attrCtx.warnings.find((w) => w.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE);
    expect(v).toBeUndefined();
  });

  it('class attr is always allowed without warning', () => {
    const classCtx = makeContext({ templateStyle: 'class' });
    const node = makeNode('mc-divider', { class: 'border-[#e0e0e0] pb-[16px]' });
    compileDivider(node, classCtx);
    const v = classCtx.warnings.find((w) => w.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE);
    expect(v).toBeUndefined();
  });
});
