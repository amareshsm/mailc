/**
 * Tests for mc-preview compiler.
 */
import { describe, it, expect } from 'vitest';
import { compilePreview } from '../../src/compiler/components/preview.js';
import { makeNodeWithText, makeNode, makeContext } from './helpers.js';

describe('compilePreview', () => {
  const ctx = makeContext();

  it('renders hidden div with preview text', () => {
    const node = makeNodeWithText('mc-preview', 'Your order shipped!');
    const html = compilePreview(node, ctx);
    expect(html).toContain('Your order shipped!');
    expect(html).toContain('display:none');
  });

  it('includes all hiding styles', () => {
    const node = makeNodeWithText('mc-preview', 'Test');
    const html = compilePreview(node, ctx);
    expect(html).toContain('font-size:1px');
    expect(html).toContain('max-height:0px');
    expect(html).toContain('max-width:0px');
    expect(html).toContain('opacity:0');
    expect(html).toContain('overflow:hidden');
  });

  it('includes &#847; padding', () => {
    const node = makeNodeWithText('mc-preview', 'Hello');
    const html = compilePreview(node, ctx);
    expect(html).toContain('&#847;');
  });

  it('uses default padding length of 150', () => {
    const node = makeNodeWithText('mc-preview', 'X');
    const html = compilePreview(node, ctx);
    // Count occurrences of &#847;
    const count = (html.match(/&#847;/g) ?? []).length;
    expect(count).toBe(150);
  });

  it('respects custom padding-length attribute', () => {
    const node = makeNodeWithText('mc-preview', 'X');
    node.attributes['padding-length'] = '10';
    const html = compilePreview(node, ctx);
    const count = (html.match(/&#847;/g) ?? []).length;
    expect(count).toBe(10);
  });

  it('handles padding-length=0', () => {
    const node = makeNodeWithText('mc-preview', 'Hello');
    node.attributes['padding-length'] = '0';
    const html = compilePreview(node, ctx);
    expect(html).not.toContain('&#847;');
  });

  it('uses default for invalid padding-length', () => {
    const node = makeNodeWithText('mc-preview', 'X');
    node.attributes['padding-length'] = 'abc';
    const html = compilePreview(node, ctx);
    const count = (html.match(/&#847;/g) ?? []).length;
    expect(count).toBe(150);
  });

  it('trims whitespace from preview text', () => {
    const node = makeNodeWithText('mc-preview', '  Hello  ');
    const html = compilePreview(node, ctx);
    expect(html).toContain('>Hello');
  });

  it('renders empty string for no content', () => {
    const node = makeNode('mc-preview');
    const html = compilePreview(node, ctx);
    expect(html).toContain('display:none');
    // Still has padding
    expect(html).toContain('&#847;');
  });
});
