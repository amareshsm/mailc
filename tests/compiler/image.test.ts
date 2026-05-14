/**
 * Tests for mc-image compiler.
 */
import { describe, it, expect } from 'vitest';
import { compileImage } from '../../src/compiler/components/image.js';
import { makeNode, makeContext } from './helpers.js';

describe('compileImage', () => {
  const ctx = makeContext();

  it('renders <img> with src and alt', () => {
    const node = makeNode('mc-image', {
      src: 'https://example.com/img.jpg',
      alt: 'Hero',
      width: '600px',
    });
    const html = compileImage(node, ctx);
    expect(html).toContain('src="https://example.com/img.jpg"');
    expect(html).toContain('alt="Hero"');
  });

  it('includes display:block', () => {
    const node = makeNode('mc-image', {
      src: 'test.jpg',
      alt: 'test',
      width: '200px',
    });
    const html = compileImage(node, ctx);
    expect(html).toContain('display:block');
  });

  it('includes border:0', () => {
    const node = makeNode('mc-image', {
      src: 'test.jpg',
      alt: 'test',
      width: '200px',
    });
    const html = compileImage(node, ctx);
    expect(html).toContain('border:0');
  });

  it('sets width as HTML attribute and fluid CSS (not fixed px)', () => {
    const node = makeNode('mc-image', {
      src: 'test.jpg',
      alt: 'test',
      width: '300px',
    });
    const html = compileImage(node, ctx);
    // HTML attribute for Outlook fallback
    expect(html).toContain('width="300"');
    // Fluid CSS: width:100% allows shrinking, max-width caps at design size
    expect(html).toContain('width:100%');
    expect(html).toContain('max-width:300px');
    // Extract the <img> tag's style attribute specifically
    const imgStyleMatch = html.match(/<img[^>]*style="([^"]*)"/) as RegExpMatchArray;
    const imgStyle = imgStyleMatch[1] as string;
    // The img style should have width:100%, NOT width:300px
    expect(imgStyle).toContain('width:100%');
    expect(imgStyle).not.toMatch(/(?<![a-z-])width:\d+px/);
  });

  it('wraps in <a> when href is present', () => {
    const node = makeNode('mc-image', {
      src: 'product.jpg',
      alt: 'Product',
      width: '200px',
      href: 'https://example.com/product',
    });
    const html = compileImage(node, ctx);
    expect(html).toContain('<a href="https://example.com/product"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('</a>');
    expect(html).toContain('<img');
  });

  it('does not wrap in <a> when no href', () => {
    const node = makeNode('mc-image', {
      src: 'test.jpg',
      alt: 'test',
      width: '200px',
    });
    const html = compileImage(node, ctx);
    expect(html).not.toContain('<a');
    expect(html).toContain('<img');
  });

  it('applies padding to the <td> wrapper when padding attribute is set', () => {
    const node = makeNode('mc-image', {
      src: 'test.jpg',
      alt: 'test',
      width: '600px',
      padding: '10px 25px',
    });
    const html = compileImage(node, ctx);
    // Padding must be on the <td>, not on the <img> style
    expect(html).toContain('padding:10px 25px');
    const tdMatch = html.match(/<td[^>]*style="([^"]*)"/) as RegExpMatchArray;
    expect(tdMatch[1]).toContain('padding:10px 25px');
    // Image itself should not carry the padding
    const imgStyleMatch = html.match(/<img[^>]*style="([^"]*)"/) as RegExpMatchArray;
    expect(imgStyleMatch[1]).not.toContain('padding');
  });

  it('renders no padding style on <td> when padding attribute is omitted', () => {
    const node = makeNode('mc-image', {
      src: 'test.jpg',
      alt: 'test',
      width: '200px',
    });
    const html = compileImage(node, ctx);
    const tdMatch = html.match(/<td([^>]*)>/);
    const tdAttrs = tdMatch ? tdMatch[1] : '';
    expect(tdAttrs).not.toContain('padding');
  });

  it('includes title attribute when present', () => {
    const node = makeNode('mc-image', {
      src: 'test.jpg',
      alt: 'test',
      width: '200px',
      title: 'My Image',
    });
    const html = compileImage(node, ctx);
    expect(html).toContain('title="My Image"');
  });

  it('defaults alt to empty string', () => {
    const node = makeNode('mc-image', {
      src: 'test.jpg',
      width: '200px',
    });
    const html = compileImage(node, ctx);
    expect(html).toContain('alt=""');
  });

  it('defaults height to auto', () => {
    const node = makeNode('mc-image', {
      src: 'test.jpg',
      alt: 'test',
      width: '200px',
    });
    const html = compileImage(node, ctx);
    expect(html).toContain('height:auto');
  });

  it('self-closes the img tag', () => {
    const node = makeNode('mc-image', {
      src: 'test.jpg',
      alt: 'test',
      width: '200px',
    });
    const html = compileImage(node, ctx);
    expect(html).toContain('/>');
  });

  it('includes outline:none', () => {
    const node = makeNode('mc-image', {
      src: 'test.jpg',
      alt: 'test',
      width: '200px',
    });
    const html = compileImage(node, ctx);
    expect(html).toContain('outline:none');
  });

  // Table wrapper for Outlook width constraint
  it('wraps img in table for Outlook width constraint', () => {
    const node = makeNode('mc-image', {
      src: 'test.jpg',
      alt: 'test',
      width: '300px',
    });
    const html = compileImage(node, ctx);
    expect(html).toMatch(/^<table role="presentation"/);
    expect(html).toContain('border-collapse:collapse');
    expect(html).toContain('border-spacing:0px');
    // Fixed width on <td> for Outlook (Outlook needs this to constrain)
    expect(html).toContain('<td style="width:300px;">');
    // No class names on table/td — Gmail strips classes from body elements
    expect(html).not.toContain('class="mc-fluid-image"');
    expect(html).toContain('</td></tr></table>');
  });

  it('img uses fluid width:100% inside fixed-width td (MJML pattern)', () => {
    const node = makeNode('mc-image', {
      src: 'test.jpg',
      alt: 'test',
      width: '600px',
    });
    const html = compileImage(node, ctx);
    // td has fixed width for Outlook
    expect(html).toContain('<td style="width:600px;">');
    // img has fluid width for modern clients
    const imgStyleMatch = html.match(/<img[^>]*style="([^"]*)"/) as RegExpMatchArray;
    const imgStyle = imgStyleMatch[1] as string;
    expect(imgStyle).toContain('width:100%');
    expect(imgStyle).toContain('max-width:600px');
    // On mobile, parent column stacks to 100% via mc-responsive,
    // td stretches with it, and img fills the td via width:100%
  });

  it('places <a> inside td when href is present', () => {
    const node = makeNode('mc-image', {
      src: 'test.jpg',
      alt: 'test',
      width: '200px',
      href: 'https://example.com',
    });
    const html = compileImage(node, ctx);
    // Structure: table > tr > td > a > img
    expect(html).toMatch(/<td[^>]*><a href/);
    expect(html).toMatch(/<\/a><\/td>/);
  });
});

// ---------------------------------------------------------------------------
// Accessibility: alt text warnings
// ---------------------------------------------------------------------------

describe('compileImage — alt text a11y warnings', () => {
  it('warns when alt attribute is missing (warnMissingAlt: true)', () => {
    const warnCtx = makeContext();
    const node = makeNode('mc-image', { src: 'test.jpg', width: '200px' });
    compileImage(node, warnCtx);
    const altWarning = warnCtx.warnings.find((w) => w.code === 'MISSING_ALT');
    expect(altWarning).toBeDefined();
    expect(altWarning!.severity).toBe('warning');
    expect(altWarning!.message).toContain('missing "alt"');
  });

  it('escalates to error when enforceAltText is true', () => {
    const enforceCtx = makeContext({
      config: {
        ...makeContext().config,
        accessibility: {
          ...makeContext().config.accessibility,
          enforceAltText: true,
        },
      },
    });
    const node = makeNode('mc-image', { src: 'test.jpg', width: '200px' });
    compileImage(node, enforceCtx);
    const altIssue = enforceCtx.warnings.find((w) => w.code === 'MISSING_ALT');
    expect(altIssue).toBeDefined();
    expect(altIssue!.severity).toBe('error');
  });

  it('does not warn when alt is explicitly empty (decorative)', () => {
    const noWarnCtx = makeContext();
    const node = makeNode('mc-image', { src: 'test.jpg', alt: '', width: '200px' });
    compileImage(node, noWarnCtx);
    const altWarning = noWarnCtx.warnings.find((w) => w.code === 'MISSING_ALT');
    expect(altWarning).toBeUndefined();
  });

  it('does not warn when alt has content', () => {
    const noWarnCtx = makeContext();
    const node = makeNode('mc-image', { src: 'test.jpg', alt: 'Product', width: '200px' });
    compileImage(node, noWarnCtx);
    const altWarning = noWarnCtx.warnings.find((w) => w.code === 'MISSING_ALT');
    expect(altWarning).toBeUndefined();
  });

  it('does not warn when warnMissingAlt is false', () => {
    const silentCtx = makeContext({
      config: {
        ...makeContext().config,
        accessibility: {
          ...makeContext().config.accessibility,
          warnMissingAlt: false,
        },
      },
    });
    const node = makeNode('mc-image', { src: 'test.jpg', width: '200px' });
    compileImage(node, silentCtx);
    const altWarning = silentCtx.warnings.find((w) => w.code === 'MISSING_ALT');
    expect(altWarning).toBeUndefined();
  });

  it('emits info for linked image with empty alt', () => {
    const linkedCtx = makeContext();
    const node = makeNode('mc-image', {
      src: 'product.jpg',
      alt: '',
      href: 'https://example.com/buy',
      width: '200px',
    });
    compileImage(node, linkedCtx);
    const linkedInfo = linkedCtx.warnings.find((w) => w.code === 'LINKED_IMAGE_EMPTY_ALT');
    expect(linkedInfo).toBeDefined();
    expect(linkedInfo!.severity).toBe('info');
    expect(linkedInfo!.message).toContain('functional');
  });

  it('does not emit linked image info when alt has content', () => {
    const linkedCtx = makeContext();
    const node = makeNode('mc-image', {
      src: 'product.jpg',
      alt: 'Buy this product',
      href: 'https://example.com/buy',
      width: '200px',
    });
    compileImage(node, linkedCtx);
    const linkedInfo = linkedCtx.warnings.find((w) => w.code === 'LINKED_IMAGE_EMPTY_ALT');
    expect(linkedInfo).toBeUndefined();
  });

  it('does not emit linked image info when no href', () => {
    const linkedCtx = makeContext();
    const node = makeNode('mc-image', {
      src: 'decorative.jpg',
      alt: '',
      width: '200px',
    });
    compileImage(node, linkedCtx);
    const linkedInfo = linkedCtx.warnings.find((w) => w.code === 'LINKED_IMAGE_EMPTY_ALT');
    expect(linkedInfo).toBeUndefined();
  });

  it('emits MISSING_ALT but not LINKED_IMAGE_EMPTY_ALT when alt missing and href set', () => {
    const bothCtx = makeContext();
    const node = makeNode('mc-image', {
      src: 'product.jpg',
      href: 'https://example.com/buy',
      width: '200px',
    });
    compileImage(node, bothCtx);
    // Missing alt triggers MISSING_ALT (more severe), returns early
    const altWarning = bothCtx.warnings.find((w) => w.code === 'MISSING_ALT');
    expect(altWarning).toBeDefined();
    // LINKED_IMAGE_EMPTY_ALT should NOT fire (early return)
    const linkedInfo = bothCtx.warnings.find((w) => w.code === 'LINKED_IMAGE_EMPTY_ALT');
    expect(linkedInfo).toBeUndefined();
  });

  // Bug 4 fix: border-radius on <img>, align on wrapper <table>
  it('applies border-radius to img style', () => {
    const localCtx = makeContext();
    const node = makeNode('mc-image', {
      src: 'avatar.jpg',
      alt: 'Avatar',
      width: '100px',
      'border-radius': '50%',
    });
    const html = compileImage(node, localCtx);
    const imgStyleMatch = html.match(/<img[^>]*style="([^"]*)"/);
    expect(imgStyleMatch).not.toBeNull();
    expect(imgStyleMatch![1]).toContain('border-radius:50%');
  });

  it('does not add border-radius style when attribute is not set', () => {
    const localCtx = makeContext();
    const node = makeNode('mc-image', {
      src: 'photo.jpg',
      alt: 'Photo',
      width: '200px',
    });
    const html = compileImage(node, localCtx);
    expect(html).not.toContain('border-radius');
  });

  it('applies align attribute to wrapper table', () => {
    const localCtx = makeContext();
    const node = makeNode('mc-image', {
      src: 'logo.jpg',
      alt: 'Logo',
      width: '200px',
      align: 'left',
    });
    const html = compileImage(node, localCtx);
    expect(html).toContain('align="left"');
  });

  it('defaults wrapper table align to center when not set', () => {
    const localCtx = makeContext();
    const node = makeNode('mc-image', {
      src: 'hero.jpg',
      alt: 'Hero',
      width: '600px',
    });
    const html = compileImage(node, localCtx);
    expect(html).toContain('align="center"');
  });
});

// ---------------------------------------------------------------------------
// Security: rel, target, URL sanitisation
// ---------------------------------------------------------------------------

describe('compileImage — security', () => {
  const ctx = makeContext();

  it('adds rel="noopener noreferrer" by default on linked images', () => {
    const node = makeNode('mc-image', {
      src: 'product.jpg',
      alt: 'Product',
      width: '200px',
      href: 'https://example.com',
    });
    const html = compileImage(node, ctx);
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it('defaults target to _blank on linked images', () => {
    const node = makeNode('mc-image', {
      src: 'product.jpg',
      alt: 'Product',
      width: '200px',
      href: 'https://example.com',
    });
    const html = compileImage(node, ctx);
    expect(html).toContain('target="_blank"');
  });

  it('respects custom target attribute', () => {
    const node = makeNode('mc-image', {
      src: 'product.jpg',
      alt: 'Product',
      width: '200px',
      href: 'https://example.com',
      target: '_self',
    });
    const html = compileImage(node, ctx);
    expect(html).toContain('target="_self"');
    expect(html).not.toContain('target="_blank"');
  });

  it('respects custom rel attribute', () => {
    const node = makeNode('mc-image', {
      src: 'product.jpg',
      alt: 'Product',
      width: '200px',
      href: 'https://example.com',
      rel: 'noopener',
    });
    const html = compileImage(node, ctx);
    expect(html).toContain('rel="noopener"');
  });

  it('does not add rel/target when no href', () => {
    const node = makeNode('mc-image', {
      src: 'decorative.jpg',
      alt: 'Photo',
      width: '200px',
    });
    const html = compileImage(node, ctx);
    expect(html).not.toContain('rel=');
    expect(html).not.toContain('target=');
  });

  it('blocks javascript: href and emits UNSAFE_URL error', () => {
    const secCtx = makeContext();
    const node = makeNode('mc-image', {
      src: 'product.jpg',
      alt: 'Product',
      width: '200px',
      href: 'javascript:alert(1)',
    });
    const html = compileImage(node, secCtx);
    // Unsafe href replaced with '#'
    expect(html).toContain('href="#"');
    expect(html).not.toContain('javascript:');
    // Error emitted
    const err = secCtx.warnings.find((w) => w.code === 'UNSAFE_URL');
    expect(err).toBeDefined();
    expect(err!.severity).toBe('error');
    expect(err!.message).toContain('"href"');
  });

  it('blocks data: href and emits UNSAFE_URL error', () => {
    const secCtx = makeContext();
    const node = makeNode('mc-image', {
      src: 'product.jpg',
      alt: 'Product',
      width: '200px',
      href: 'data:text/html,<script>alert(1)</script>',
    });
    const html = compileImage(node, secCtx);
    expect(html).toContain('href="#"');
    const err = secCtx.warnings.find((w) => w.code === 'UNSAFE_URL');
    expect(err).toBeDefined();
  });

  it('blocks javascript: src and emits UNSAFE_URL error', () => {
    const secCtx = makeContext();
    const node = makeNode('mc-image', {
      src: 'javascript:alert(1)',
      alt: 'Product',
      width: '200px',
    });
    const html = compileImage(node, secCtx);
    expect(html).toContain('src="#"');
    expect(html).not.toContain('javascript:');
    const err = secCtx.warnings.find((w) => w.code === 'UNSAFE_URL');
    expect(err).toBeDefined();
    expect(err!.message).toContain('"src"');
  });

  it('blocks vbscript: href', () => {
    const secCtx = makeContext();
    const node = makeNode('mc-image', {
      src: 'product.jpg',
      alt: 'Product',
      width: '200px',
      href: 'vbscript:msgbox(1)',
    });
    const html = compileImage(node, secCtx);
    expect(html).toContain('href="#"');
    const err = secCtx.warnings.find((w) => w.code === 'UNSAFE_URL');
    expect(err).toBeDefined();
  });

  it('allows https: URLs without warning', () => {
    const secCtx = makeContext();
    const node = makeNode('mc-image', {
      src: 'https://cdn.example.com/img.jpg',
      alt: 'Product',
      width: '200px',
      href: 'https://example.com/product',
    });
    compileImage(node, secCtx);
    const err = secCtx.warnings.find((w) => w.code === 'UNSAFE_URL');
    expect(err).toBeUndefined();
  });

  it('allows relative URLs without warning', () => {
    const secCtx = makeContext();
    const node = makeNode('mc-image', {
      src: '/images/logo.png',
      alt: 'Logo',
      width: '200px',
      href: '/products/123',
    });
    compileImage(node, secCtx);
    const err = secCtx.warnings.find((w) => w.code === 'UNSAFE_URL');
    expect(err).toBeUndefined();
  });

  it('blocks javascript: with leading whitespace (bypass attempt)', () => {
    const secCtx = makeContext();
    const node = makeNode('mc-image', {
      src: 'product.jpg',
      alt: 'Product',
      width: '200px',
      href: '  javascript:alert(1)',
    });
    const html = compileImage(node, secCtx);
    expect(html).toContain('href="#"');
    const err = secCtx.warnings.find((w) => w.code === 'UNSAFE_URL');
    expect(err).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Styling mode enforcement
// ---------------------------------------------------------------------------

import { ErrorCode } from '../../src/errors/codes.js';

describe('compileImage — styling mode enforcement', () => {
  it('class mode warns on border-radius attr', () => {
    const classCtx = makeContext({ templateStyle: 'class' });
    const node = makeNode('mc-image', {
      src: 'https://example.com/img.jpg',
      alt: 'Test',
      width: '600',
      'border-radius': '8px',
    });
    compileImage(node, classCtx);
    const v = classCtx.warnings.find((w) => w.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE);
    expect(v).toBeDefined();
    expect(v?.severity).toBe('error');
    expect(v?.message).toContain('"border-radius"');
    expect(v?.message).toContain('<mc-image>');
  });

  it('src, alt, width are structural — never flagged in class mode', () => {
    const classCtx = makeContext({ templateStyle: 'class' });
    const node = makeNode('mc-image', {
      src: 'https://example.com/img.jpg',
      alt: 'Test',
      width: '600',
    });
    compileImage(node, classCtx);
    const v = classCtx.warnings.find((w) => w.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE);
    expect(v).toBeUndefined();
  });

  it('attribute mode produces no enforcement warning', () => {
    const attrCtx = makeContext({ templateStyle: 'attribute' });
    const node = makeNode('mc-image', {
      src: 'img.jpg',
      alt: 'test',
      width: '600',
      'border-radius': '8px',
    });
    compileImage(node, attrCtx);
    const v = attrCtx.warnings.find((w) => w.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE);
    expect(v).toBeUndefined();
  });
});
