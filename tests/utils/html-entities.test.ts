/**
 * Unit tests for the `decodeEntities` HTML entity decoder.
 *
 * The decoder is the parse-side half of single-boundary escape. Bugs here
 * silently corrupt AST values that flow through the entire pipeline, so the
 * test surface deliberately covers: every numeric form, named entities of
 * every category, unknown / malformed references that must pass through,
 * round-trip invariants with the escape helper, and edge cases on string
 * boundaries.
 */

import { describe, it, expect } from 'vitest';
import { decodeEntities } from '../../src/utils/html-entities.js';
import { escapeHtml } from '../../src/utils/html-escape.js';

describe('decodeEntities — the five XML/HTML core entities', () => {
  it('&amp; → &', () => {
    expect(decodeEntities('&amp;')).toBe('&');
  });

  it('&lt; → <', () => {
    expect(decodeEntities('&lt;')).toBe('<');
  });

  it('&gt; → >', () => {
    expect(decodeEntities('&gt;')).toBe('>');
  });

  it('&quot; → "', () => {
    expect(decodeEntities('&quot;')).toBe('"');
  });

  it("&apos; → '", () => {
    expect(decodeEntities('&apos;')).toBe("'");
  });

  it('case-sensitive uppercase form: &AMP; → &', () => {
    // HTML5 recognises a small uppercase set for legacy compatibility.
    expect(decodeEntities('&AMP;')).toBe('&');
    expect(decodeEntities('&LT;')).toBe('<');
    expect(decodeEntities('&GT;')).toBe('>');
    expect(decodeEntities('&QUOT;')).toBe('"');
  });

  it('case-sensitive: &Amp; (mixed case) is NOT recognised', () => {
    // Mixed-case forms aren't in the table — they pass through verbatim.
    expect(decodeEntities('&Amp;')).toBe('&Amp;');
  });
});

describe('decodeEntities — numeric entities', () => {
  it('decimal: &#39; → \'', () => {
    expect(decodeEntities('&#39;')).toBe("'");
  });

  it('decimal: &#38; → &', () => {
    expect(decodeEntities('&#38;')).toBe('&');
  });

  it('hex lowercase: &#x27; → \'', () => {
    expect(decodeEntities('&#x27;')).toBe("'");
  });

  it('hex uppercase prefix: &#X27; → \'', () => {
    expect(decodeEntities('&#X27;')).toBe("'");
  });

  it('hex with uppercase digits: &#xA9; → ©', () => {
    expect(decodeEntities('&#xA9;')).toBe('©');
  });

  it('decimal copyright: &#169; → ©', () => {
    expect(decodeEntities('&#169;')).toBe('©');
  });

  it('decodes codepoints above BMP (emoji): &#x1F600; → 😀', () => {
    expect(decodeEntities('&#x1F600;')).toBe('😀');
  });

  it('decodes high codepoints decimal: &#128512; → 😀', () => {
    expect(decodeEntities('&#128512;')).toBe('😀');
  });

  it('leaves NULL entity verbatim: &#0; → &#0;', () => {
    // NULL is not meaningful in HTML content; preserve the reference.
    expect(decodeEntities('&#0;')).toBe('&#0;');
  });

  it('leaves out-of-range codepoint verbatim: &#x110000; → &#x110000;', () => {
    expect(decodeEntities('&#x110000;')).toBe('&#x110000;');
  });
});

describe('decodeEntities — common named entities', () => {
  it('&copy; → ©', () => {
    expect(decodeEntities('&copy;')).toBe('©');
  });

  it('&nbsp; → non-breaking space', () => {
    expect(decodeEntities('&nbsp;')).toBe(' ');
  });

  it('&hellip; → …', () => {
    expect(decodeEntities('&hellip;')).toBe('…');
  });

  it('&mdash; → —', () => {
    expect(decodeEntities('&mdash;')).toBe('—');
  });

  it('&euro; → €', () => {
    expect(decodeEntities('&euro;')).toBe('€');
  });

  it('&pound; → £', () => {
    expect(decodeEntities('&pound;')).toBe('£');
  });

  it('&times; → ×', () => {
    expect(decodeEntities('&times;')).toBe('×');
  });
});

describe('decodeEntities — unknown / malformed references pass through', () => {
  it('unknown named entity: &bogus; → &bogus;', () => {
    expect(decodeEntities('&bogus;')).toBe('&bogus;');
  });

  it('missing semicolon (strict): &amp → &amp', () => {
    expect(decodeEntities('&amp')).toBe('&amp');
  });

  it('bare ampersand: & → &', () => {
    expect(decodeEntities('&')).toBe('&');
  });

  it('trailing bare ampersand at end of string: foo & → foo &', () => {
    expect(decodeEntities('foo &')).toBe('foo &');
  });

  it('& followed by space (no entity): foo & bar → foo & bar', () => {
    expect(decodeEntities('foo & bar')).toBe('foo & bar');
  });

  it('&# alone (incomplete numeric): &#; → &#;', () => {
    expect(decodeEntities('&#;')).toBe('&#;');
  });

  it('&#x alone (incomplete hex): &#x; → &#x;', () => {
    expect(decodeEntities('&#x;')).toBe('&#x;');
  });
});

describe('decodeEntities — strings without any &', () => {
  it('plain ASCII passes through identical', () => {
    const input = 'Welcome to our newsletter, today is sunny.';
    expect(decodeEntities(input)).toBe(input);
  });

  it('UTF-8 content passes through identical', () => {
    const input = 'Café — 日本語 — 😀';
    expect(decodeEntities(input)).toBe(input);
  });

  it('empty string passes through', () => {
    expect(decodeEntities('')).toBe('');
  });
});

describe('decodeEntities — mixed and multiple entities', () => {
  it('multiple entities in one string', () => {
    expect(decodeEntities('A &amp; B &copy; C &lt; D')).toBe('A & B © C < D');
  });

  it('adjacent entities', () => {
    expect(decodeEntities('&lt;&gt;')).toBe('<>');
  });

  it('entity + raw chars mixed', () => {
    expect(decodeEntities('A & B &amp; C')).toBe('A & B & C');
  });

  it('entity inside surrounding text', () => {
    expect(decodeEntities('Hello, World — &copy; 2026')).toBe('Hello, World — © 2026');
  });

  it('numeric and named in the same string', () => {
    expect(decodeEntities('it&#39;s &copy;')).toBe("it's ©");
  });
});

describe('decodeEntities — single-pass (no recursive expansion)', () => {
  it('&amp;amp; decodes ONCE to &amp; (does NOT recursively decode)', () => {
    // This is critical for round-trip correctness: a user who types the
    // 5-char string `&amp;` literally in a CMS field, sees that string
    // arrive as 5 chars in the AST (after one decode pass), and gets
    // `&amp;amp;` on the wire (escape adds another &amp;). Browser
    // renders it as `&amp;` — the literal text the user typed.
    expect(decodeEntities('&amp;amp;')).toBe('&amp;');
  });

  it('&amp;lt; decodes ONCE to &lt;', () => {
    expect(decodeEntities('&amp;lt;')).toBe('&lt;');
  });
});

describe('decodeEntities — round-trip with escapeHtml', () => {
  // The two helpers form a stable pair: decodeEntities(input) followed by
  // escapeHtml(...) is the parser→compiler journey. These tests pin the
  // invariants we rely on for "no double-escape under any source form."

  it('decoded then escaped: &amp; → & → &amp; (lossless wire round-trip)', () => {
    expect(escapeHtml(decodeEntities('&amp;'))).toBe('&amp;');
  });

  it('decoded then escaped: literal & → & → &amp;', () => {
    expect(escapeHtml(decodeEntities('&'))).toBe('&amp;');
  });

  it('decoded then escaped: &quot; → " → &quot;', () => {
    expect(escapeHtml(decodeEntities('&quot;'))).toBe('&quot;');
  });

  it('decoded then escaped: &copy; → © → © (no escape needed for non-ASCII)', () => {
    expect(escapeHtml(decodeEntities('&copy;'))).toBe('©');
  });

  it('decoded then escaped: mixed entities normalise to single-escape form', () => {
    const wire = escapeHtml(decodeEntities('A &amp; B &copy; C &lt; D'));
    expect(wire).toBe('A &amp; B © C &lt; D');
  });
});
