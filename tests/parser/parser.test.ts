import { describe, it, expect } from 'vitest';
import { tokenize } from '../../src/tokenizer/index.js';
import { parse } from '../../src/parser/index.js';
import type { ASTNode } from '../../src/types.js';

/** Helper: tokenize then parse. */
function p(source: string): ASTNode {
  return parse(tokenize(source));
}

// ---------------------------------------------------------------------------
// Basic structure
// ---------------------------------------------------------------------------

describe('parse — basic structure', () => {
  it('parses empty input into root node', () => {
    const ast = p('');
    expect(ast.type).toBe('root');
    expect(ast.children).toHaveLength(0);
    expect(ast.content).toHaveLength(0);
  });

  it('parses a single self-closing tag', () => {
    const ast = p('<mc-image src="x.png" alt="X" />');
    expect(ast.children).toHaveLength(1);
    const img = ast.children[0];
    expect(img).toBeDefined();
    if (img) {
      expect(img.type).toBe('mc-image');
      expect(img.attributes.src).toBe('x.png');
      expect(img.attributes.alt).toBe('X');
      expect(img.children).toHaveLength(0);
    }
  });

  it('parses open + close tag with text content', () => {
    const ast = p('<mc-text>Hello World</mc-text>');
    expect(ast.children).toHaveLength(1);
    const text = ast.children[0];
    expect(text).toBeDefined();
    if (text) {
      expect(text.type).toBe('mc-text');
      expect(text.content).toHaveLength(1);
      const textContent = text.content[0];
      expect(textContent).toBeDefined();
      if (textContent) {
        expect(textContent.type).toBe('text');
        expect(textContent.value).toBe('Hello World');
      }
    }
  });

  it('parses boolean attributes', () => {
    const ast = p('<mc-section full-width></mc-section>');
    const section = ast.children[0];
    expect(section).toBeDefined();
    if (section) {
      expect(section.attributes['full-width']).toBe('');
    }
  });
});

// ---------------------------------------------------------------------------
// Nested tags
// ---------------------------------------------------------------------------

describe('parse — nesting', () => {
  it('parses nested mc-body > mc-section > mc-column > mc-text', () => {
    const ast = p(`
      <mc>
  <mc-body>
        <mc-section>
          <mc-column>
            <mc-text>Hi</mc-text>
          </mc-column>
        </mc-section>
      </mc-body>
</mc>
    `);

    const mc = ast.children[0];
    expect(mc).toBeDefined();
    if (!mc) return;
    expect(mc.type).toBe('mc');
    const body = mc.children[0];
    expect(body).toBeDefined();
    if (!body) return;
    expect(body.type).toBe('mc-body');
    const section = body.children[0];
    expect(section).toBeDefined();
    if (!section) return;
    expect(section.type).toBe('mc-section');
    const column = section.children[0];
    expect(column).toBeDefined();
    if (!column) return;
    expect(column.type).toBe('mc-column');
    const text = column.children[0];
    expect(text).toBeDefined();
    if (!text) return;
    expect(text.type).toBe('mc-text');
    const textContent = text.content[0];
    expect(textContent).toBeDefined();
    if (textContent) {
      expect(textContent.value).toBe('Hi');
    }
  });

  it('parses sibling nodes at the same level', () => {
    const ast = p(`
      <mc-section>
        <mc-column></mc-column>
        <mc-column></mc-column>
      </mc-section>
    `);
    const section = ast.children[0];
    expect(section).toBeDefined();
    if (!section) return;
    expect(section.children).toHaveLength(2);
    const col0 = section.children[0];
    const col1 = section.children[1];
    expect(col0).toBeDefined();
    expect(col1).toBeDefined();
    if (col0) expect(col0.type).toBe('mc-column');
    if (col1) expect(col1.type).toBe('mc-column');
  });
});

// ---------------------------------------------------------------------------
// Mixed content (text + expressions)
// ---------------------------------------------------------------------------

describe('parse — mixed content', () => {
  it('parses text + expression', () => {
    const ast = p('<mc-text>Hello {{name}}</mc-text>');
    const text = ast.children[0];
    expect(text).toBeDefined();
    if (!text) return;
    expect(text.content).toHaveLength(2);
    const content0 = text.content[0];
    const content1 = text.content[1];
    expect(content0).toBeDefined();
    expect(content1).toBeDefined();
    if (content0) {
      expect(content0.type).toBe('text');
      expect(content0.value).toBe('Hello ');
    }
    if (content1) {
      expect(content1.type).toBe('expression');
      expect(content1.value).toBe('name');
    }
  });

  it('parses raw expression {{{ }}}', () => {
    const ast = p('<mc-text>{{{rawHtml}}}</mc-text>');
    const text = ast.children[0];
    expect(text).toBeDefined();
    if (!text) return;
    expect(text.content).toHaveLength(1);
    const expr = text.content[0];
    expect(expr).toBeDefined();
    if (expr && expr.type === 'expression') {
      expect(expr.type).toBe('expression');
      expect(expr.value).toBe('rawHtml');
      expect(expr.raw).toBe(true);
    }
  });

  it('parses expression with fallback', () => {
    const ast = p('<mc-text>{{name || "there"}}</mc-text>');
    const textNode = ast.children[0];
    expect(textNode).toBeDefined();
    if (!textNode) return;
    const expr = textNode.content[0];
    expect(expr).toBeDefined();
    if (expr && expr.type === 'expression') {
      expect(expr.value).toBe('name');
      expect(expr.fallback).toBe('there');
    }
  });

  it('parses multiple expressions', () => {
    const ast = p('<mc-text>Hi {{first}} {{last}}!</mc-text>');
    const textNode = ast.children[0];
    expect(textNode).toBeDefined();
    if (!textNode) return;
    const content = textNode.content;
    expect(content).toHaveLength(5);
    expect(content[0]).toBeDefined();
    expect(content[1]).toBeDefined();
    expect(content[2]).toBeDefined();
    expect(content[3]).toBeDefined();
    expect(content[4]).toBeDefined();
    if (content[0]) expect(content[0].type).toBe('text');
    if (content[1]) expect(content[1].type).toBe('expression');
    if (content[2]) expect(content[2].type).toBe('text');
    if (content[3]) expect(content[3].type).toBe('expression');
    if (content[4]) expect(content[4].type).toBe('text');
  });
});

// ---------------------------------------------------------------------------
// Inline HTML (passed through as text content)
// ---------------------------------------------------------------------------

describe('parse — inline HTML', () => {
  it('preserves <strong> as text content', () => {
    const ast = p('<mc-text><strong>Bold</strong> text</mc-text>');
    const textNode = ast.children[0];
    expect(textNode).toBeDefined();
    if (!textNode) return;
    const content = textNode.content;
    // Should be all text nodes
    const texts = content.filter(c => c.type === 'text').map(c => c.value);
    expect(texts.join('')).toContain('<strong>');
    expect(texts.join('')).toContain('Bold');
    expect(texts.join('')).toContain('</strong>');
  });

  it('preserves <a href> as text content', () => {
    const ast = p('<mc-text><a href="https://x.com">link</a></mc-text>');
    const textNode = ast.children[0];
    expect(textNode).toBeDefined();
    if (!textNode) return;
    const texts = textNode.content
      .filter(c => c.type === 'text')
      .map(c => c.value);
    expect(texts.join('')).toContain('<a href="https://x.com">');
    expect(texts.join('')).toContain('link');
    expect(texts.join('')).toContain('</a>');
  });
});

// ---------------------------------------------------------------------------
// mc-attributes children
// ---------------------------------------------------------------------------

describe('parse — mc-attributes', () => {
  it('parses mc-attributes with mc-all child', () => {
    const ast = p(`
      <mc-attributes>
        <mc-all font-family="Arial" />
        <mc-text font-size="14px" color="#333" />
      </mc-attributes>
    `);
    const attrs = ast.children[0];
    expect(attrs).toBeDefined();
    if (!attrs) return;
    expect(attrs.type).toBe('mc-attributes');
    expect(attrs.children).toHaveLength(2);
    const child0 = attrs.children[0];
    const child1 = attrs.children[1];
    expect(child0).toBeDefined();
    expect(child1).toBeDefined();
    if (child0) {
      expect(child0.type).toBe('mc-all');
      expect(child0.attributes['font-family']).toBe('Arial');
    }
    if (child1) {
      expect(child1.type).toBe('mc-text');
      expect(child1.attributes['font-size']).toBe('14px');
    }
  });
});

// ---------------------------------------------------------------------------
// Outlook conditionals
// ---------------------------------------------------------------------------

describe('parse — Outlook conditionals', () => {
  it('preserves Outlook conditional as mc-raw node', () => {
    const src = '<!--[if mso]><table><tr><td><![endif]-->';
    const ast = p(src);
    expect(ast.children).toHaveLength(1);
    const raw = ast.children[0];
    expect(raw).toBeDefined();
    if (!raw) return;
    expect(raw.type).toBe('mc-raw');
    const rawContent = raw.content[0];
    expect(rawContent).toBeDefined();
    if (rawContent) {
      expect(rawContent.value).toBe(src);
    }
  });
});

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

describe('parse — comments', () => {
  it('skips HTML comments', () => {
    const ast = p('<!-- comment --><mc-text>Hi</mc-text>');
    expect(ast.children).toHaveLength(1);
    const firstChild = ast.children[0];
    expect(firstChild).toBeDefined();
    if (firstChild) {
      expect(firstChild.type).toBe('mc-text');
    }
  });
});

// ---------------------------------------------------------------------------
// Source locations
// ---------------------------------------------------------------------------

describe('parse — source locations', () => {
  it('sets loc on nodes', () => {
    const ast = p('<mc-text>Hi</mc-text>');
    const text = ast.children[0];
    expect(text).toBeDefined();
    if (text) {
      expect(text.loc.start.line).toBe(1);
      expect(text.loc.start.col).toBe(1);
    }
  });
});

// ---------------------------------------------------------------------------
// Error cases
// ---------------------------------------------------------------------------

describe('parse — errors', () => {
  it('throws on mismatched close tag', () => {
    expect(() => p('<mc-text></mc-body>')).toThrow(/Expected closing tag <\/mc-text>/);
  });

  it('throws on unexpected EOF (unclosed tag)', () => {
    expect(() => p('<mc-text>Hello')).toThrow(/mc-text.*never closed/);
  });

  it('throws on unexpected close tag at root', () => {
    expect(() => p('</mc-text>')).toThrow(/Unexpected closing tag/);
  });

  it('throws with fix suggestion for mismatched tag', () => {
    try {
      p('<mc-section></mc-body>');
      expect.fail('Should have thrown');
    } catch (err) {
      expect((err as Error).message).toContain('mc-section');
    }
  });
});

// ---------------------------------------------------------------------------
// Full template
// ---------------------------------------------------------------------------

describe('parse — full template', () => {
  it('parses a realistic email template', () => {
    const ast = p(`
      <mc>
  <mc-head>
          <mc-attributes>
            <mc-all font-family="Arial" />
          </mc-attributes>
        </mc-head>
  <mc-body>
    <mc-section class="bg-white p-4">
          <mc-column width="50%">
            <mc-text class="text-lg">Hello {{name}}</mc-text>
            <mc-image src="logo.png" alt="Logo" />
          </mc-column>
          <mc-column width="50%">
            <mc-button href="https://example.com" class="bg-brand text-white">
              Click
            </mc-button>
          </mc-column>
        </mc-section>
  </mc-body>
</mc>
    `);

    const mc = ast.children[0];
    expect(mc).toBeDefined();
    if (!mc) return;
    expect(mc.type).toBe('mc');
    expect(mc.children.length).toBeGreaterThanOrEqual(2);

    const head = mc.children[0];
    expect(head).toBeDefined();
    if (!head) return;
    expect(head.type).toBe('mc-head');

    const body = mc.children[1];
    expect(body).toBeDefined();
    if (!body) return;
    expect(body.type).toBe('mc-body');
    const section = body.children[0];
    expect(section).toBeDefined();
    if (section) {
      expect(section.type).toBe('mc-section');
      expect(section.children).toHaveLength(2);
    }
  });
});
