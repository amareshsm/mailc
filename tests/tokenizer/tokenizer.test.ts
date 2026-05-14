import { describe, it, expect } from 'vitest';
import { tokenize, type Token } from '../../src/tokenizer/index.js';
import { TokenType } from '../../src/tokenizer/tokens.js';

/** Helper: extract just type+value for easier assertions. */
function tv(tokens: Token[]): { type: TokenType; value: string }[] {
  return tokens.map(({ type, value }) => ({ type, value }));
}

// ---------------------------------------------------------------------------
// Basic tags
// ---------------------------------------------------------------------------

describe('tokenize — tags', () => {
  it('tokenizes a simple open + close tag', () => {
    const tokens = tv(tokenize('<mc-text></mc-text>'));
    expect(tokens).toEqual([
      { type: TokenType.TAG_OPEN, value: 'mc-text' },
      { type: TokenType.TAG_END, value: '>' },
      { type: TokenType.TAG_CLOSE, value: 'mc-text' },
      { type: TokenType.EOF, value: '' },
    ]);
  });

  it('tokenizes a self-closing tag', () => {
    const tokens = tv(tokenize('<mc-image />'));
    expect(tokens).toEqual([
      { type: TokenType.TAG_OPEN, value: 'mc-image' },
      { type: TokenType.TAG_SELF_CLOSE, value: '/>' },
      { type: TokenType.EOF, value: '' },
    ]);
  });

  it('tokenizes self-closing without space', () => {
    const tokens = tv(tokenize('<mc-divider/>'));
    expect(tokens).toEqual([
      { type: TokenType.TAG_OPEN, value: 'mc-divider' },
      { type: TokenType.TAG_SELF_CLOSE, value: '/>' },
      { type: TokenType.EOF, value: '' },
    ]);
  });

  it('tokenizes nested tags', () => {
    const tokens = tv(tokenize(`<mc>
  <mc-body><mc-section></mc-section></mc-body>
</mc>`));
    expect(tokens).toEqual([
      { type: TokenType.TAG_OPEN, value: 'mc' },
      { type: TokenType.TAG_END, value: '>' },
      { type: TokenType.TEXT, value: '\n  ' },
      { type: TokenType.TAG_OPEN, value: 'mc-body' },
      { type: TokenType.TAG_END, value: '>' },
      { type: TokenType.TAG_OPEN, value: 'mc-section' },
      { type: TokenType.TAG_END, value: '>' },
      { type: TokenType.TAG_CLOSE, value: 'mc-section' },
      { type: TokenType.TAG_CLOSE, value: 'mc-body' },
      { type: TokenType.TEXT, value: '\n' },
      { type: TokenType.TAG_CLOSE, value: 'mc' },
      { type: TokenType.EOF, value: '' },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Attributes
// ---------------------------------------------------------------------------

describe('tokenize — attributes', () => {
  it('tokenizes a single attribute', () => {
    const tokens = tv(tokenize('<mc-text class="text-lg"></mc-text>'));
    expect(tokens).toEqual([
      { type: TokenType.TAG_OPEN, value: 'mc-text' },
      { type: TokenType.ATTR_NAME, value: 'class' },
      { type: TokenType.ATTR_EQUALS, value: '=' },
      { type: TokenType.ATTR_VALUE, value: 'text-lg' },
      { type: TokenType.TAG_END, value: '>' },
      { type: TokenType.TAG_CLOSE, value: 'mc-text' },
      { type: TokenType.EOF, value: '' },
    ]);
  });

  it('tokenizes multiple attributes', () => {
    const tokens = tv(tokenize('<mc-image src="img.png" alt="Logo" />'));
    expect(tokens).toContainEqual({ type: TokenType.ATTR_NAME, value: 'src' });
    expect(tokens).toContainEqual({ type: TokenType.ATTR_VALUE, value: 'img.png' });
    expect(tokens).toContainEqual({ type: TokenType.ATTR_NAME, value: 'alt' });
    expect(tokens).toContainEqual({ type: TokenType.ATTR_VALUE, value: 'Logo' });
  });

  it('handles single-quoted attribute values', () => {
    const tokens = tv(tokenize("<mc-text class='bold'></mc-text>"));
    expect(tokens).toContainEqual({ type: TokenType.ATTR_VALUE, value: 'bold' });
  });

  it('handles boolean attributes (no value)', () => {
    const tokens = tv(tokenize('<mc-section full-width></mc-section>'));
    expect(tokens).toContainEqual({ type: TokenType.ATTR_NAME, value: 'full-width' });
    // No ATTR_EQUALS or ATTR_VALUE after it
    const idx = tokens.findIndex(t => t.value === 'full-width');
    expect(tokens[idx + 1]?.type).toBe(TokenType.TAG_END);
  });

  it('handles attributes with special chars in values', () => {
    const tokens = tv(tokenize('<mc-button href="https://x.com?a=1&b=2"></mc-button>'));
    expect(tokens).toContainEqual({
      type: TokenType.ATTR_VALUE,
      value: 'https://x.com?a=1&b=2',
    });
  });
});

// ---------------------------------------------------------------------------
// Text content
// ---------------------------------------------------------------------------

describe('tokenize — text content', () => {
  it('tokenizes text between tags', () => {
    const tokens = tv(tokenize('<mc-text>Hello World</mc-text>'));
    expect(tokens).toContainEqual({ type: TokenType.TEXT, value: 'Hello World' });
  });

  it('tokenizes text with whitespace and newlines', () => {
    const tokens = tv(tokenize('<mc-text>\n  Hello\n  World\n</mc-text>'));
    const text = tokens.find(t => t.type === TokenType.TEXT);
    expect(text?.value).toBe('\n  Hello\n  World\n');
  });

  it('returns empty token list for empty input', () => {
    const tokens = tv(tokenize(''));
    expect(tokens).toEqual([{ type: TokenType.EOF, value: '' }]);
  });

  it('tokenizes plain text without tags', () => {
    const tokens = tv(tokenize('just text'));
    expect(tokens).toEqual([
      { type: TokenType.TEXT, value: 'just text' },
      { type: TokenType.EOF, value: '' },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Expressions
// ---------------------------------------------------------------------------

describe('tokenize — expressions', () => {
  it('tokenizes {{expression}}', () => {
    const tokens = tv(tokenize('<mc-text>Hello {{name}}</mc-text>'));
    expect(tokens).toContainEqual({ type: TokenType.TEXT, value: 'Hello ' });
    expect(tokens).toContainEqual({ type: TokenType.EXPRESSION, value: 'name' });
  });

  it('tokenizes nested path expression', () => {
    const tokens = tv(tokenize('{{customer.address.city}}'));
    expect(tokens).toContainEqual({
      type: TokenType.EXPRESSION,
      value: 'customer.address.city',
    });
  });

  it('tokenizes expression with fallback', () => {
    const tokens = tv(tokenize('{{name || "there"}}'));
    expect(tokens).toContainEqual({
      type: TokenType.EXPRESSION,
      value: 'name || "there"',
    });
  });

  it('tokenizes {{{rawExpression}}}', () => {
    const tokens = tv(tokenize('{{{rawHtml}}}'));
    expect(tokens).toContainEqual({
      type: TokenType.RAW_EXPRESSION,
      value: 'rawHtml',
    });
  });

  it('tokenizes mixed text + expressions', () => {
    const tokens = tv(tokenize('Hi {{first}} {{last}}!'));
    expect(tokens).toEqual([
      { type: TokenType.TEXT, value: 'Hi ' },
      { type: TokenType.EXPRESSION, value: 'first' },
      { type: TokenType.TEXT, value: ' ' },
      { type: TokenType.EXPRESSION, value: 'last' },
      { type: TokenType.TEXT, value: '!' },
      { type: TokenType.EOF, value: '' },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

describe('tokenize — comments', () => {
  it('tokenizes HTML comment', () => {
    const tokens = tv(tokenize('<!-- hello -->'));
    expect(tokens).toContainEqual({ type: TokenType.COMMENT, value: 'hello' });
  });

  it('tokenizes Outlook conditional comment', () => {
    const src = '<!--[if mso]><table><tr><td><![endif]-->';
    const tokens = tv(tokenize(src));
    expect(tokens).toContainEqual({ type: TokenType.OUTLOOK_COMMENT, value: src });
  });

  it('preserves comment content', () => {
    const tokens = tv(tokenize('<!-- multi\nline\ncomment -->'));
    expect(tokens).toContainEqual({
      type: TokenType.COMMENT,
      value: 'multi\nline\ncomment',
    });
  });
});

// ---------------------------------------------------------------------------
// Inline HTML tags (passed through as text)
// ---------------------------------------------------------------------------

describe('tokenize — inline HTML tags', () => {
  it('treats <strong> as TEXT', () => {
    const tokens = tv(tokenize('<mc-text><strong>Bold</strong></mc-text>'));
    const textTokens = tokens.filter(t => t.type === TokenType.TEXT);
    expect(textTokens).toContainEqual({ type: TokenType.TEXT, value: '<strong>' });
    expect(textTokens).toContainEqual({ type: TokenType.TEXT, value: 'Bold' });
    expect(textTokens).toContainEqual({ type: TokenType.TEXT, value: '</strong>' });
  });

  it('treats <a href="..."> as TEXT', () => {
    const tokens = tv(tokenize('<mc-text><a href="https://x.com">link</a></mc-text>'));
    const textTokens = tokens.filter(t => t.type === TokenType.TEXT);
    expect(textTokens).toContainEqual({
      type: TokenType.TEXT,
      value: '<a href="https://x.com">',
    });
  });

  it('treats <br> and <br/> as TEXT', () => {
    const tokens1 = tv(tokenize('<mc-text>line1<br>line2</mc-text>'));
    expect(tokens1).toContainEqual({ type: TokenType.TEXT, value: '<br>' });

    const tokens2 = tv(tokenize('<mc-text>line1<br/>line2</mc-text>'));
    expect(tokens2).toContainEqual({ type: TokenType.TEXT, value: '<br/>' });
  });

  it('treats <span>, <em>, <i>, <u>, <s>, <b> as TEXT', () => {
    for (const tag of ['span', 'em', 'i', 'u', 's', 'b']) {
      const tokens = tv(tokenize(`<mc-text><${tag}>x</${tag}></mc-text>`));
      const textTokens = tokens.filter(t => t.type === TokenType.TEXT);
      expect(textTokens.some(t => t.value === `<${tag}>`)).toBe(true);
      expect(textTokens.some(t => t.value === `</${tag}>`)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// mc-attributes child tags (still tokenized as mc-* tags)
// ---------------------------------------------------------------------------

describe('tokenize — mc-attributes children', () => {
  it('tokenizes mc-all inside mc-attributes as a normal tag', () => {
    const tokens = tv(tokenize('<mc-attributes><mc-all font-family="Arial" /></mc-attributes>'));
    expect(tokens).toContainEqual({ type: TokenType.TAG_OPEN, value: 'mc-attributes' });
    expect(tokens).toContainEqual({ type: TokenType.TAG_OPEN, value: 'mc-all' });
    expect(tokens).toContainEqual({ type: TokenType.ATTR_NAME, value: 'font-family' });
    expect(tokens).toContainEqual({ type: TokenType.ATTR_VALUE, value: 'Arial' });
  });

  it('tokenizes mc-text inside mc-attributes as a normal tag (not content)', () => {
    const tokens = tv(
      tokenize('<mc-attributes><mc-text font-size="14px" /></mc-attributes>'),
    );
    expect(tokens).toContainEqual({ type: TokenType.TAG_OPEN, value: 'mc-text' });
    expect(tokens).toContainEqual({ type: TokenType.ATTR_NAME, value: 'font-size' });
  });

  // Phase 2: mc-class tokenizes correctly
  it('Phase 2: tokenizes mc-class with name and style attributes', () => {
    const tokens = tv(
      tokenize('<mc-attributes><mc-class name="hero" font-size="28px" color="#000" /></mc-attributes>'),
    );
    // Tag itself is recognized
    expect(tokens).toContainEqual({ type: TokenType.TAG_OPEN, value: 'mc-class' });
    // Required name attribute tokenized
    expect(tokens).toContainEqual({ type: TokenType.ATTR_NAME, value: 'name' });
    expect(tokens).toContainEqual({ type: TokenType.ATTR_VALUE, value: 'hero' });
    // Style attributes tokenized
    expect(tokens).toContainEqual({ type: TokenType.ATTR_NAME, value: 'font-size' });
    expect(tokens).toContainEqual({ type: TokenType.ATTR_VALUE, value: '28px' });
    expect(tokens).toContainEqual({ type: TokenType.ATTR_NAME, value: 'color' });
    expect(tokens).toContainEqual({ type: TokenType.ATTR_VALUE, value: '#000' });
    // Self-closing
    expect(tokens).toContainEqual({ type: TokenType.TAG_SELF_CLOSE, value: '/>' });
  });

  it('Phase 2: tokenizes mc-class with extends attribute', () => {
    const tokens = tv(
      tokenize('<mc-attributes><mc-class name="primary-button" extends="base-button" /></mc-attributes>'),
    );
    expect(tokens).toContainEqual({ type: TokenType.TAG_OPEN, value: 'mc-class' });
    expect(tokens).toContainEqual({ type: TokenType.ATTR_NAME, value: 'name' });
    expect(tokens).toContainEqual({ type: TokenType.ATTR_VALUE, value: 'primary-button' });
    expect(tokens).toContainEqual({ type: TokenType.ATTR_NAME, value: 'extends' });
    expect(tokens).toContainEqual({ type: TokenType.ATTR_VALUE, value: 'base-button' });
  });

  it('Phase 2: multiple mc-class definitions all tokenize', () => {
    const tokens = tv(tokenize(
      '<mc-attributes>' +
      '<mc-class name="a" color="#111" />' +
      '<mc-class name="b" color="#222" />' +
      '</mc-attributes>',
    ));
    // Both mc-class tags appear
    const classOpens = tokens.filter(t => t.type === TokenType.TAG_OPEN && t.value === 'mc-class');
    expect(classOpens).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Source locations
// ---------------------------------------------------------------------------

describe('tokenize — source locations', () => {
  it('tracks line and column for tokens', () => {
    const tokens = tokenize('<mc-text>\nHello\n</mc-text>');
    const openTag = tokens.find(t => t.type === TokenType.TAG_OPEN);
    expect(openTag).toBeDefined();
    if (openTag) {
      expect(openTag.loc.line).toBe(1);
      expect(openTag.loc.col).toBe(1);
    }

    const text = tokens.find(t => t.type === TokenType.TEXT);
    expect(text).toBeDefined();
    if (text) {
      expect(text.loc.line).toBe(1);
      expect(text.loc.col).toBe(10);
    }

    const closeTag = tokens.find(t => t.type === TokenType.TAG_CLOSE);
    expect(closeTag).toBeDefined();
    if (closeTag) {
      expect(closeTag.loc.line).toBe(3);
      expect(closeTag.loc.col).toBe(1);
    }
  });
});

// ---------------------------------------------------------------------------
// Error cases
// ---------------------------------------------------------------------------

describe('tokenize — errors', () => {
  it('throws on unclosed tag', () => {
    expect(() => tokenize('<mc-text')).toThrow(/Unexpected end of input inside a tag/);
  });

  it('throws on unclosed attribute quote', () => {
    expect(() => tokenize('<mc-text class="no-close')).toThrow(/Unclosed attribute value/);
  });

  it('throws on unclosed expression', () => {
    expect(() => tokenize('{{name')).toThrow(/Unclosed expression/);
  });

  it('throws on unclosed raw expression', () => {
    expect(() => tokenize('{{{raw')).toThrow(/Unclosed raw expression/);
  });

  it('throws on unclosed comment', () => {
    expect(() => tokenize('<!-- oops')).toThrow(/Unclosed comment/);
  });

  it('throws on unclosed Outlook conditional', () => {
    expect(() => tokenize('<!--[if mso]>stuff')).toThrow(/Unclosed Outlook conditional/);
  });

  it('throws on missing close tag >', () => {
    expect(() => tokenize('</mc-text')).toThrow(/Expected '>' after/);
  });
});

// ---------------------------------------------------------------------------
// Full template
// ---------------------------------------------------------------------------

describe('tokenize — stray characters (infinite loop guard)', () => {
  it('emits a stray < at end of input as TEXT without hanging', () => {
    // This previously caused an infinite loop: < at EOF is not followed by a name
    // char, so no tag branch matched; tokenizeText broke immediately on <; the
    // outer while loop called tokenizeContent again → spin forever.
    const tokens = tv(tokenize('<'));
    expect(tokens).toEqual([
      { type: TokenType.TEXT, value: '<' },
      { type: TokenType.EOF, value: '' },
    ]);
  });

  it('emits a stray < followed by a space as TEXT without hanging', () => {
    const tokens = tv(tokenize('a < b'));
    // '<' and ' b' become text tokens
    const text = tokens.filter(t => t.type === TokenType.TEXT).map(t => t.value).join('');
    expect(text).toBe('a < b');
  });

  it('handles < immediately followed by a digit as TEXT', () => {
    // isNameChar('1') === false — was also an infinite loop candidate
    const tokens = tv(tokenize('price < 100'));
    const text = tokens.filter(t => t.type === TokenType.TEXT).map(t => t.value).join('');
    expect(text).toBe('price < 100');
  });

  it('handles partial tag mid-input without hanging', () => {
    // Simulates user mid-typing "<head>" — pauses after just "<"
    const tokens = tv(tokenize('<mc-body>\n<'));
    expect(tokens[tokens.length - 1]?.type).toBe(TokenType.EOF);
  });
});

describe('tokenize — full template', () => {
  it('tokenizes a realistic email structure', () => {
    const src = `<mc>
  <mc-body>
  <mc-section class="bg-white p-4">
    <mc-column width="50%">
      <mc-text class="text-lg font-bold">Hello {{name}}</mc-text>
      <mc-image src="logo.png" alt="Logo" />
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;

    const tokens = tokenize(src);

    // Should not throw
    expect(tokens.length).toBeGreaterThan(10);

    // Last token is EOF
    expect(tokens[tokens.length - 1]?.type).toBe(TokenType.EOF);

    // Verify key tokens exist
    const types = tokens.map(t => t.type);
    expect(types).toContain(TokenType.TAG_OPEN);
    expect(types).toContain(TokenType.TAG_CLOSE);
    expect(types).toContain(TokenType.ATTR_NAME);
    expect(types).toContain(TokenType.ATTR_VALUE);
    expect(types).toContain(TokenType.EXPRESSION);
    expect(types).toContain(TokenType.TAG_SELF_CLOSE);
  });
});
