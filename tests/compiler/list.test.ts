/**
 * Tests for mc-list / mc-list-item compilers.
 */
import { describe, it, expect } from 'vitest';
import { compile } from '../../src/index.js';

const wrap = (inner: string): string =>
  `<mc><mc-body><mc-section><mc-column>${inner}</mc-column></mc-section></mc-body></mc>`;

describe('mc-list', () => {
  it('emits a <ul> with disc style by default', () => {
    const r = compile(
      wrap(
        `<mc-list><mc-list-item>One</mc-list-item><mc-list-item>Two</mc-list-item></mc-list>`,
      ),
      { templateStyle: 'attribute' },
    );
    expect(r.html).toContain('<ul');
    expect(r.html).toContain('list-style-type:disc');
    expect(r.html).toContain('<li');
    expect(r.html).toContain('One');
    expect(r.html).toContain('Two');
  });

  it('emits an <ol> when type="ol" with decimal default', () => {
    const r = compile(
      wrap(`<mc-list type="ol"><mc-list-item>A</mc-list-item></mc-list>`),
      { templateStyle: 'attribute' },
    );
    expect(r.html).toContain('<ol');
    expect(r.html).toContain('list-style-type:decimal');
  });

  it('honors list-style-type attribute', () => {
    const r = compile(
      wrap(`<mc-list list-style-type="square"><mc-list-item>X</mc-list-item></mc-list>`),
      { templateStyle: 'attribute' },
    );
    expect(r.html).toContain('list-style-type:square');
  });

  it('class mode resolves list-disc utility', () => {
    const r = compile(
      wrap(`<mc-list class="list-disc text-gray-700"><mc-list-item>X</mc-list-item></mc-list>`),
    );
    expect(r.errors.filter((e) => e.code === 'CSS_ATTR_IN_CLASS_MODE')).toHaveLength(0);
    expect(r.html).toContain('list-style-type:disc');
  });

  it('class mode rejects css attrs on mc-list (e.g. color)', () => {
    const r = compile(
      wrap(`<mc-list color="#ff0000"><mc-list-item>X</mc-list-item></mc-list>`),
      { templateStyle: 'class' },
    );
    expect(r.errors.some((e) => e.code === 'CSS_ATTR_IN_CLASS_MODE')).toBe(true);
  });

  it('allows inline HTML inside mc-list-item content', () => {
    const r = compile(
      wrap(`<mc-list><mc-list-item>Hi <strong>bold</strong> <a href="/x">link</a></mc-list-item></mc-list>`),
      { templateStyle: 'attribute' },
    );
    expect(r.html).toContain('<strong>bold</strong>');
    expect(r.html).toContain('<a href="/x">link</a>');
  });

  it('item-spacing controls per-item padding-bottom', () => {
    const r = compile(
      wrap(`<mc-list item-spacing="12px"><mc-list-item>X</mc-list-item></mc-list>`),
      { templateStyle: 'attribute' },
    );
    expect(r.html).toContain('padding-bottom:12px');
  });

  it('wraps the list in a presentation table for client compatibility', () => {
    const r = compile(
      wrap(`<mc-list><mc-list-item>X</mc-list-item></mc-list>`),
      { templateStyle: 'attribute' },
    );
    expect(r.html).toMatch(/<table[^>]*role="presentation"[^>]*>[\s\S]*<ul/);
  });
});

describe('mc-list-item — direct CSS-prop attributes', () => {
  it('applies font-size attribute to the <li> style', () => {
    const r = compile(
      wrap(`<mc-list><mc-list-item font-size="14px">Hello</mc-list-item></mc-list>`),
      { templateStyle: 'attribute' },
    );
    expect(r.html).toMatch(/<li[^>]*style="[^"]*font-size:14px/);
  });

  it('applies line-height attribute to the <li> style', () => {
    const r = compile(
      wrap(`<mc-list><mc-list-item line-height="22px">Hello</mc-list-item></mc-list>`),
      { templateStyle: 'attribute' },
    );
    expect(r.html).toMatch(/<li[^>]*style="[^"]*line-height:22px/);
  });

  it('applies font-size + line-height + color together (the fixture-19 pattern)', () => {
    const r = compile(
      wrap(
        `<mc-list><mc-list-item color="#334155" font-size="14px" line-height="22px">Hello</mc-list-item></mc-list>`,
      ),
      { templateStyle: 'attribute' },
    );
    expect(r.html).toMatch(/<li[^>]*style="[^"]*color:#334155/);
    expect(r.html).toMatch(/<li[^>]*style="[^"]*font-size:14px/);
    expect(r.html).toMatch(/<li[^>]*style="[^"]*line-height:22px/);
  });

  it('font-size and line-height are NOT flagged as UNKNOWN_ATTRIBUTE', () => {
    const r = compile(
      wrap(`<mc-list><mc-list-item font-size="14px" line-height="22px">X</mc-list-item></mc-list>`),
      { templateStyle: 'attribute' },
    );
    const unknown = r.warnings.filter(
      (w) =>
        w.code === 'UNKNOWN_ATTRIBUTE' &&
        (w.message.includes('font-size') || w.message.includes('line-height')),
    );
    expect(unknown).toHaveLength(0);
  });

  it('per-item font-size overrides the parent mc-list font-size (precedence check)', () => {
    const r = compile(
      wrap(
        `<mc-list font-size="12px"><mc-list-item font-size="20px">Big</mc-list-item><mc-list-item>Default</mc-list-item></mc-list>`,
      ),
      { templateStyle: 'attribute' },
    );
    // The first <li> should carry the per-item override.
    expect(r.html).toMatch(/<li[^>]*style="[^"]*font-size:20px[^"]*">[\s\S]*Big/);
  });

  it('class mode rejects font-size / line-height attrs on mc-list-item (symmetry with other CSS-prop attrs)', () => {
    const r = compile(
      wrap(`<mc-list class="text-gray-700"><mc-list-item font-size="14px">X</mc-list-item></mc-list>`),
      { templateStyle: 'class' },
    );
    expect(
      r.errors.some(
        (e) =>
          e.code === 'CSS_ATTR_IN_CLASS_MODE' && e.message.includes('font-size'),
      ),
    ).toBe(true);
  });
});
