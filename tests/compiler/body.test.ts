/**
 * Tests for mc-body compiler.
 */
import { describe, it, expect } from 'vitest';
import { compileBody } from '../../src/compiler/components/body.js';
import {
  extractHeadData,
  type HeadData,
} from '../../src/compiler/components/head.js';
import { makeNode, makeNodeWithText, makeContext, makeClassContext } from './helpers.js';

/** Minimal head data for tests that don't exercise mc-head features. */
const EMPTY_HEAD_DATA: HeadData = {
  previewHtml: '',
  styleBlocks: [],
  attributeDefaults: new Map(),
  namedClasses: new Map(),
  inlineStyleRules: [],
  title: '',
};

describe('compileBody', () => {
  const ctx = makeContext();

  it('generates DOCTYPE', () => {
    const node = makeNode('mc-body');
    const html = compileBody(node, ctx, EMPTY_HEAD_DATA);
    expect(html).toMatch(/^<!DOCTYPE html>/);
  });

  it('generates <html> with xmlns and VML namespaces', () => {
    const node = makeNode('mc-body');
    const html = compileBody(node, ctx, EMPTY_HEAD_DATA);
    expect(html).toContain('xmlns="http://www.w3.org/1999/xhtml"');
    expect(html).toContain('xmlns:v="urn:schemas-microsoft-com:vml"');
    expect(html).toContain('xmlns:o="urn:schemas-microsoft-com:office:office"');
  });

  it('uses default lang="en" and dir="ltr"', () => {
    const node = makeNode('mc-body');
    const html = compileBody(node, ctx, EMPTY_HEAD_DATA);
    expect(html).toContain('lang="en"');
    expect(html).toContain('dir="ltr"');
  });

  it('respects lang attribute', () => {
    const node = makeNode('mc-body', { lang: 'fr' });
    const html = compileBody(node, ctx, EMPTY_HEAD_DATA);
    expect(html).toContain('lang="fr"');
  });

  it('respects dir attribute', () => {
    const node = makeNode('mc-body', { dir: 'rtl' });
    const html = compileBody(node, ctx, EMPTY_HEAD_DATA);
    expect(html).toContain('dir="rtl"');
  });

  it('includes charset meta tag', () => {
    const node = makeNode('mc-body');
    const html = compileBody(node, ctx, EMPTY_HEAD_DATA);
    expect(html).toContain('<meta charset="utf-8">');
  });

  it('includes viewport meta tag', () => {
    const node = makeNode('mc-body');
    const html = compileBody(node, ctx, EMPTY_HEAD_DATA);
    expect(html).toContain('name="viewport"');
    expect(html).toContain('width=device-width');
  });

  it('includes X-UA-Compatible meta', () => {
    const node = makeNode('mc-body');
    const html = compileBody(node, ctx, EMPTY_HEAD_DATA);
    expect(html).toContain('X-UA-Compatible');
    expect(html).toContain('IE=edge');
  });

  it('includes apple-disable-message-reformatting', () => {
    const node = makeNode('mc-body');
    const html = compileBody(node, ctx, EMPTY_HEAD_DATA);
    expect(html).toContain('x-apple-disable-message-reformatting');
  });

  it('includes format-detection meta', () => {
    const node = makeNode('mc-body');
    const html = compileBody(node, ctx, EMPTY_HEAD_DATA);
    expect(html).toContain('format-detection');
    expect(html).toContain('telephone=no');
  });

  it('includes Outlook DPI fix', () => {
    const node = makeNode('mc-body');
    const html = compileBody(node, ctx, EMPTY_HEAD_DATA);
    expect(html).toContain('OfficeDocumentSettings');
    expect(html).toContain('AllowPNG');
    expect(html).toContain('PixelsPerInch');
    expect(html).toContain('96');
  });

  it('includes reset CSS', () => {
    const node = makeNode('mc-body');
    const html = compileBody(node, ctx, EMPTY_HEAD_DATA);
    expect(html).toContain('-webkit-text-size-adjust:100%');
    expect(html).toContain('mso-table-lspace:0pt');
    expect(html).toContain('-ms-interpolation-mode:bicubic');
  });

  it('includes responsive media query with mc-responsive class', () => {
    const node = makeNode('mc-body');
    const html = compileBody(node, ctx, EMPTY_HEAD_DATA);
    expect(html).toContain('@media only screen and (max-width:');
    expect(html).toContain('.mc-responsive');
    expect(html).toContain('width:100%!important');
  });

  it('does not include unnecessary class-based image rules in @media', () => {
    const node = makeNode('mc-body');
    const html = compileBody(node, ctx, EMPTY_HEAD_DATA);
    // Images are fluid via width:100% on <img> + parent column stacking.
    // No separate mc-fluid-image class needed (Gmail strips body classes).
    expect(html).not.toContain('mc-fluid-image');
  });

  it('renders body wrapper table with 100% width', () => {
    const node = makeNode('mc-body');
    const html = compileBody(node, ctx, EMPTY_HEAD_DATA);
    expect(html).toContain('<table role="presentation"');
    expect(html).toContain('width="100%"');
  });

  it('renders Outlook conditional inner table with content width', () => {
    const node = makeNode('mc-body');
    const html = compileBody(node, ctx, EMPTY_HEAD_DATA);
    expect(html).toContain('<!--[if mso | IE]>');
    expect(html).toContain('width="600"');
  });

  it('renders max-width div wrapper', () => {
    const node = makeNode('mc-body');
    const html = compileBody(node, ctx, EMPTY_HEAD_DATA);
    expect(html).toContain('max-width:600px');
    expect(html).toContain('margin:0 auto');
  });

  it('closes body and html tags', () => {
    const node = makeNode('mc-body');
    const html = compileBody(node, ctx, EMPTY_HEAD_DATA);
    expect(html).toContain('</body></html>');
  });

  it('applies background-color from Tailwind class', () => {
    const node = makeNode('mc-body', { class: 'bg-gray-100' });
    const html = compileBody(node, makeClassContext(), EMPTY_HEAD_DATA);
    expect(html).toContain('background-color:#f3f4f6');
  });

  it('applies background-color from direct attribute', () => {
    const node = makeNode('mc-body', { 'background-color': '#f0f0f0' });
    const html = compileBody(node, ctx, EMPTY_HEAD_DATA);
    expect(html).toContain('background-color:#f0f0f0');
  });

  it('body has margin:0 and padding:0', () => {
    const node = makeNode('mc-body');
    const html = compileBody(node, ctx, EMPTY_HEAD_DATA);
    expect(html).toMatch(/<body style="margin:0;padding:0;/);
  });

  it('includes user style blocks from mc-head > mc-style', () => {
    const style = makeNodeWithText('mc-style', '.custom { color: red; }');
    const head = makeNode('mc-head', {}, [style]);
    const headData = extractHeadData(head, ctx);
    const node = makeNode('mc-body');
    const html = compileBody(node, ctx, headData);
    expect(html).toContain('.custom { color: red; }');
  });

  it('includes preview HTML from mc-head > mc-preview', () => {
    const preview = makeNodeWithText('mc-preview', 'Order shipped!');
    const head = makeNode('mc-head', {}, [preview]);
    const headData = extractHeadData(head, ctx);
    const node = makeNode('mc-body');
    const html = compileBody(node, ctx, headData);
    expect(html).toContain('Order shipped!');
    expect(html).toContain('display:none');
  });

  it('compiles body children (mc-section)', () => {
    const col = makeNode('mc-column');
    const section = makeNode('mc-section', {}, [col]);
    const node = makeNode('mc-body', {}, [section]);
    const html = compileBody(node, ctx, EMPTY_HEAD_DATA);
    expect(html).toContain('mc-responsive');
  });

  it('produces complete document with head and section', () => {
    const preview = makeNodeWithText('mc-preview', 'Preview');
    const head = makeNode('mc-head', {}, [preview]);
    const headData = extractHeadData(head, ctx);
    const textNode = makeNodeWithText('mc-text', 'Hello');
    const col = makeNode('mc-column', { class: 'w-full' }, [textNode]);
    const section = makeNode('mc-section', { class: 'bg-white' }, [col]);
    const body = makeNode('mc-body', { class: 'bg-gray-100', lang: 'en' }, [section]);
    const html = compileBody(body, ctx, headData);

    // Verify full document structure
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="en"');
    expect(html).toContain('<head>');
    expect(html).toContain('</head>');
    expect(html).toContain('<body');
    expect(html).toContain('Preview');
    expect(html).toContain('Hello');
    expect(html).toContain('</body></html>');
  });

  // Accessibility wrapper
  it('wraps body content in accessibility landmark div', () => {
    const node = makeNode('mc-body');
    const html = compileBody(node, ctx, EMPTY_HEAD_DATA);
    expect(html).toContain('role="article"');
    expect(html).toContain('aria-roledescription="email"');
  });

  it('sets lang and dir on accessibility wrapper', () => {
    const node = makeNode('mc-body', { lang: 'fr', dir: 'rtl' });
    const html = compileBody(node, ctx, EMPTY_HEAD_DATA);
    expect(html).toContain('<div role="article" aria-roledescription="email" lang="fr" dir="rtl">');
  });

  it('places accessibility wrapper between body and content', () => {
    const node = makeNode('mc-body');
    const html = compileBody(node, ctx, EMPTY_HEAD_DATA);
    // <body...><div role="article"...>...content...</div></body>
    const bodyIdx = html.indexOf('<body');
    const wrapperIdx = html.indexOf('<div role="article"');
    const closeWrapperIdx = html.lastIndexOf('</div>');
    const closeBodyIdx = html.indexOf('</body>');
    expect(wrapperIdx).toBeGreaterThan(bodyIdx);
    expect(closeWrapperIdx).toBeLessThan(closeBodyIdx);
  });

  // Bug 2 fix: width attribute overrides config width
  it('uses width attribute to override default content width', () => {
    const node = makeNode('mc-body', { width: '700px' });
    const html = compileBody(node, ctx, EMPTY_HEAD_DATA);
    expect(html).toContain('max-width:700px');
    expect(html).not.toContain('max-width:600px');
  });

  it('supports width attribute without px suffix', () => {
    const node = makeNode('mc-body', { width: '500' });
    const html = compileBody(node, ctx, EMPTY_HEAD_DATA);
    expect(html).toContain('max-width:500px');
  });

  it('falls back to config width when width attribute is not set', () => {
    const node = makeNode('mc-body'); // no width attribute
    const html = compileBody(node, ctx, EMPTY_HEAD_DATA);
    // Default config width is 600px
    expect(html).toContain('max-width:600px');
  });

  // Fix: preview HTML must appear BEFORE the outer wrapper table
  it('places preview HTML before the outer wrapper table', () => {
    const preview = makeNodeWithText('mc-preview', 'Inbox preview text');
    const head = makeNode('mc-head', {}, [preview]);
    const headData = extractHeadData(head, ctx);
    const node = makeNode('mc-body');
    const html = compileBody(node, ctx, headData);

    const previewIdx = html.indexOf('Inbox preview text');
    const outerTableIdx = html.indexOf('<table role="presentation"');

    // preview div must come before the first wrapper table
    expect(previewIdx).toBeGreaterThan(-1);
    expect(outerTableIdx).toBeGreaterThan(-1);
    expect(previewIdx).toBeLessThan(outerTableIdx);
  });

  it('preview HTML is inside the accessibility wrapper', () => {
    const preview = makeNodeWithText('mc-preview', 'Preview inside wrapper');
    const head = makeNode('mc-head', {}, [preview]);
    const headData = extractHeadData(head, ctx);
    const node = makeNode('mc-body');
    const html = compileBody(node, ctx, headData);

    const wrapperOpenIdx = html.indexOf('<div role="article"');
    const previewIdx = html.indexOf('Preview inside wrapper');
    const wrapperCloseIdx = html.lastIndexOf('</div>');

    expect(previewIdx).toBeGreaterThan(wrapperOpenIdx);
    expect(previewIdx).toBeLessThan(wrapperCloseIdx);
  });
});
