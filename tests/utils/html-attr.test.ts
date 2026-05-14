/**
 * Unit tests for the html-attr helpers (`attr`, `reqAttr`, `styleAttr`).
 *
 * The helpers are the single-boundary escape point for all attribute output
 * across the compiler. Bugs here propagate everywhere, so the test surface
 * is deliberately thorough: every escape character, every empty-ish input
 * shape, and the contract differences between the three helpers.
 */

import { describe, it, expect } from 'vitest';
import { attr, reqAttr, styleAttr } from '../../src/utils/html-attr.js';

// ---------------------------------------------------------------------------
// attr() — conditional
// ---------------------------------------------------------------------------

describe('attr() — conditional attribute builder', () => {
  it('returns empty string for undefined', () => {
    expect(attr('id', undefined)).toBe('');
  });

  it('returns empty string for null', () => {
    expect(attr('id', null)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(attr('id', '')).toBe('');
  });

  it('emits the attribute when value is a non-empty string', () => {
    expect(attr('id', 'abc')).toBe(' id="abc"');
  });

  it('emits the attribute when value is a number (incl. zero)', () => {
    expect(attr('width', 600)).toBe(' width="600"');
    expect(attr('width', 0)).toBe(' width="0"');
  });

  it('escapes & < > " \' in the value', () => {
    expect(attr('alt', `& < > " '`)).toBe(' alt="&amp; &lt; &gt; &quot; &#39;"');
  });

  it('escapes a value that would close the attribute', () => {
    expect(attr('alt', `x" onclick="alert(1)`))
      .toBe(' alt="x&quot; onclick=&quot;alert(1)"');
  });

  it('preserves UTF-8 and non-ASCII content unchanged', () => {
    expect(attr('alt', 'café — 日本語')).toBe(' alt="café — 日本語"');
  });
});

// ---------------------------------------------------------------------------
// reqAttr() — always-emit
// ---------------------------------------------------------------------------

describe('reqAttr() — required attribute builder', () => {
  it('emits the attribute even when the value is an empty string', () => {
    // alt="" is meaningful for decorative images — must NOT collapse to "".
    expect(reqAttr('alt', '')).toBe(' alt=""');
  });

  it('emits and escapes a normal string', () => {
    expect(reqAttr('role', 'presentation')).toBe(' role="presentation"');
  });

  it('emits and escapes dangerous characters', () => {
    expect(reqAttr('alt', `He said "hi"`)).toBe(' alt="He said &quot;hi&quot;"');
  });

  it('emits when value is a number', () => {
    expect(reqAttr('width', 600)).toBe(' width="600"');
  });
});

// ---------------------------------------------------------------------------
// styleAttr() — CSS values, no entity escape
// ---------------------------------------------------------------------------

describe('styleAttr() — style attribute (CSS, no entity escape)', () => {
  it('returns empty string for undefined', () => {
    expect(styleAttr(undefined)).toBe('');
  });

  it('returns empty string for empty input', () => {
    expect(styleAttr('')).toBe('');
  });

  it('passes CSS through without entity-escaping', () => {
    // Critically: `&` must stay as `&`, not become `&amp;`, because
    // `&amp;` is invalid CSS.
    expect(styleAttr('color:red;padding:10px;background:url(foo.png)')).toBe(
      ' style="color:red;padding:10px;background:url(foo.png)"',
    );
  });

  it('strips " from the input to prevent attribute breakout', () => {
    expect(styleAttr(`color:red;font-family:"Arial"`)).toBe(' style="color:red;font-family:Arial"');
  });

  it('does NOT escape < > & inside CSS values (they are valid CSS bytes)', () => {
    // CSS values can legitimately contain these characters; entity-escaping
    // would corrupt them.
    expect(styleAttr('content:"a < b & c > d"')).toBe(' style="content:a < b & c > d"');
  });
});

// ---------------------------------------------------------------------------
// Single-boundary contract — values are RAW, helpers escape once
// ---------------------------------------------------------------------------

describe('single-boundary escape contract', () => {
  it('a value that contains the literal text "&amp;" is treated as RAW and re-escaped', () => {
    // If a caller passes the string "&amp;" (e.g. because something
    // upstream pre-escaped), we DO escape the & again → "&amp;amp;".
    // This is correct behaviour: AST values are raw; pre-escaped values
    // are a contract violation, not a special case to paper over.
    expect(attr('alt', '&amp;')).toBe(' alt="&amp;amp;"');
  });
});
