import { describe, it, expect } from 'vitest';
import { escapeHtml, unescapeHtml } from '../../src/utils/html-escape.js';

describe('escapeHtml', () => {
  it('escapes ampersand', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B');
  });

  it('escapes less-than', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
  });

  it('escapes greater-than', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('class="foo"')).toBe('class=&quot;foo&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  it('escapes all special characters in one string', () => {
    expect(escapeHtml('<a href="x" title=\'y\'>&</a>')).toBe(
      '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;',
    );
  });

  it('returns empty string for empty input', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('returns plain text unchanged', () => {
    expect(escapeHtml('Hello World 123')).toBe('Hello World 123');
  });

  it('handles unicode characters', () => {
    expect(escapeHtml('Héllo © Wörld')).toBe('Héllo © Wörld');
  });
});

describe('unescapeHtml', () => {
  it('unescapes &amp;', () => {
    expect(unescapeHtml('A &amp; B')).toBe('A & B');
  });

  it('unescapes &lt; and &gt;', () => {
    expect(unescapeHtml('&lt;div&gt;')).toBe('<div>');
  });

  it('unescapes &quot;', () => {
    expect(unescapeHtml('class=&quot;foo&quot;')).toBe('class="foo"');
  });

  it('unescapes &#39;', () => {
    expect(unescapeHtml('it&#39;s')).toBe("it's");
  });

  it('returns empty string for empty input', () => {
    expect(unescapeHtml('')).toBe('');
  });

  it('round-trips with escapeHtml', () => {
    const original = '<a href="test" title=\'x\'>&copy;</a>';
    expect(unescapeHtml(escapeHtml(original))).toBe(original);
  });
});
