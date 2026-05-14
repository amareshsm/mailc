/**
 * Optimizer tests — verifies comment removal, whitespace collapse, and minification.
 */
import { describe, it, expect } from 'vitest';
import { optimize } from '../../src/post-processor/optimizer.js';
import type { OutputConfig } from '../../src/types.js';

/**
 * Default output config for these tests.
 *
 * `minify: true` is used so tests assert the behaviour of comment removal +
 * minification on single-line output. The default mailc behaviour is to
 * prettify, which adds whitespace these tests aren't designed to verify.
 * Pretty-print behaviour is covered separately in formatter tests.
 */
const DEFAULT_OUTPUT: OutputConfig = {
  minify: true,
  comments: false,
};

describe('optimize', () => {
  describe('comment removal', () => {
    it('removes standard HTML comments', () => {
      const html = '<div><!-- This is a comment -->Hello</div>';
      const result = optimize(html, DEFAULT_OUTPUT);
      expect(result).toBe('<div>Hello</div>');
    });

    it('removes multiple comments', () => {
      const html = '<!-- A --><div><!-- B -->text<!-- C --></div>';
      const result = optimize(html, DEFAULT_OUTPUT);
      expect(result).toBe('<div>text</div>');
    });

    it('preserves Outlook conditional comments', () => {
      const html =
        '<!--[if mso]><table><tr><td><![endif]-->' +
        '<div>Content</div>' +
        '<!--[if mso]></td></tr></table><![endif]-->';
      const result = optimize(html, DEFAULT_OUTPUT);
      expect(result).toBe(html);
    });

    it('preserves Outlook conditionals while removing standard comments', () => {
      const html =
        '<!-- remove me -->' +
        '<!--[if mso | IE]><table><![endif]-->' +
        '<!-- also remove -->' +
        '<!--[if mso | IE]></table><![endif]-->';
      const result = optimize(html, DEFAULT_OUTPUT);
      expect(result).not.toContain('remove me');
      expect(result).not.toContain('also remove');
      expect(result).toContain('<!--[if mso | IE]><table><![endif]-->');
      expect(result).toContain('<!--[if mso | IE]></table><![endif]-->');
    });

    it('keeps comments when config.comments is true', () => {
      const html = '<div><!-- keep me -->Hello</div>';
      const result = optimize(html, { ...DEFAULT_OUTPUT, comments: true });
      expect(result).toContain('<!-- keep me -->');
    });
  });

  describe('minification', () => {
    it('collapses whitespace between tags', () => {
      const html = '<div>  <p>  Text  </p>  </div>';
      const result = optimize(html, { ...DEFAULT_OUTPUT, minify: true });
      expect(result).toBe('<div><p> Text </p></div>');
    });

    it('removes leading and trailing whitespace', () => {
      const html = '  <div>Hello</div>  ';
      const result = optimize(html, { ...DEFAULT_OUTPUT, minify: true });
      expect(result).toBe('<div>Hello</div>');
    });

    it('preserves content within <style> blocks', () => {
      const html = '<head><style>  .mc-el-1 { border-radius: 8px; }  </style></head>';
      const result = optimize(html, { ...DEFAULT_OUTPUT, minify: true });
      expect(result).toContain('.mc-el-1 { border-radius: 8px; }');
    });

    it('handles multiple <style> blocks', () => {
      const html =
        '<head>' +
        '<style>  body { margin: 0; }  </style>' +
        '   ' +
        '<style>  .cls { color: red; }  </style>' +
        '</head>';
      const result = optimize(html, { ...DEFAULT_OUTPUT, minify: true });
      expect(result).toContain('body { margin: 0; }');
      expect(result).toContain('.cls { color: red; }');
    });

    it('prettifies (multi-line) when config.minify is false', () => {
      // Default output config — minify: false → prettify branch via js-beautify.
      const html = '<div><p>Text</p><p>More</p></div>';
      const result = optimize(html, { minify: false, comments: false });

      // js-beautify breaks block elements onto their own lines.
      const lines = result.split('\n');
      expect(lines.length).toBeGreaterThan(1);
      expect(result).toContain('<div>');
      expect(result).toContain('Text');
    });

    // Issue 2 fix: minifier must NOT eat spaces between inline elements
    it('preserves space between inline elements inside a paragraph', () => {
      const html = '<p>Hello <strong>world</strong></p>';
      const result = optimize(html, { ...DEFAULT_OUTPUT, minify: true });
      expect(result).toBe('<p>Hello <strong>world</strong></p>');
    });

    it('preserves space before inline element after text', () => {
      const html = '<p>Click <a href="#">here</a> to continue</p>';
      const result = optimize(html, { ...DEFAULT_OUTPUT, minify: true });
      expect(result).toBe('<p>Click <a href="#">here</a> to continue</p>');
    });

    it('collapses whitespace between block elements', () => {
      const html = '<table>  <tr>  <td>cell</td>  </tr>  </table>';
      const result = optimize(html, { ...DEFAULT_OUTPUT, minify: true });
      expect(result).toBe('<table><tr><td>cell</td></tr></table>');
    });

    // VML tag handling: v:roundrect and w:anchorlock must be treated as block
    it('collapses whitespace around VML v:roundrect tags', () => {
      const html = '<div>  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml">  </v:roundrect>  </div>';
      const result = optimize(html, { ...DEFAULT_OUTPUT, minify: true });
      expect(result).not.toContain('  ');
    });

    // Attribute value safety: multi-space inside alt/style must NOT be collapsed
    it('does not collapse whitespace inside attribute values', () => {
      const html = '<img alt="hello   world" src="x.jpg">';
      const result = optimize(html, { ...DEFAULT_OUTPUT, minify: true });
      expect(result).toContain('alt="hello   world"');
    });

    it('does not collapse whitespace inside style attribute values', () => {
      const html = '<td style="font-family:Arial,   sans-serif">text</td>';
      const result = optimize(html, { ...DEFAULT_OUTPUT, minify: true });
      expect(result).toContain('font-family:Arial,   sans-serif');
    });

    // <pre> content must be preserved
    it('preserves whitespace inside <pre> blocks', () => {
      const html = '<div><pre>  indented\n    code  </pre></div>';
      const result = optimize(html, { ...DEFAULT_OUTPUT, minify: true });
      expect(result).toContain('<pre>  indented\n    code  </pre>');
    });
  });

  describe('combined', () => {
    it('removes comments and minifies together', () => {
      const html =
        '<!-- header -->\n' +
        '<div>  \n' +
        '  <!-- inner -->  \n' +
        '  <p>Hello</p>  \n' +
        '</div>';
      const result = optimize(html, {
        ...DEFAULT_OUTPUT,
        minify: true,
        comments: false,
      });
      expect(result).not.toContain('header');
      expect(result).not.toContain('inner');
      expect(result).toBe('<div><p>Hello</p></div>');
    });

    it('handles empty input', () => {
      const result = optimize('', DEFAULT_OUTPUT);
      expect(result).toBe('');
    });
  });
});
