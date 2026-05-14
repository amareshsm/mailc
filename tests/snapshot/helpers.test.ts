/**
 * Tests for snapshot comparison helpers.
 *
 * Validates normalizeHtml, extractStructure, and structuralDiff
 * work correctly on email HTML samples.
 *
 * @module tests/snapshot/helpers.test
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeHtml,
  extractStructure,
  structuralDiff,
  getFixtures,
  readFixture,
  readDeviations,
} from './helpers.js';

// ---------------------------------------------------------------------------
// normalizeHtml
// ---------------------------------------------------------------------------

describe('normalizeHtml', () => {
  it('collapses whitespace between tags', () => {
    const result = normalizeHtml('<div>  \n  <p>Hi</p>  \n  </div>');
    expect(result).toBe('<div><p>Hi</p></div>');
  });

  it('removes standard HTML comments', () => {
    const result = normalizeHtml('<div><!-- comment --><p>Hi</p></div>');
    expect(result).toBe('<div><p>Hi</p></div>');
  });

  it('preserves Outlook conditional comments', () => {
    const input = '<div><!--[if mso | IE]><table><![endif]--><p>Hi</p></div>';
    const result = normalizeHtml(input);
    expect(result).toContain('<!--[if mso | IE]>');
    expect(result).toContain('<![endif]-->');
  });

  it('sorts inline style properties alphabetically', () => {
    const input = '<div style="color:red;background:blue;align:center">Hi</div>';
    const result = normalizeHtml(input);
    expect(result).toContain('style="align:center;background:blue;color:red"');
  });

  it('sorts HTML attributes alphabetically', () => {
    const input = '<div class="foo" align="center" border="0">Hi</div>';
    const result = normalizeHtml(input);
    expect(result).toContain('align="center"');
    expect(result).toContain('border="0"');
    expect(result).toContain('class="foo"');
    // Verify order: align before border before class
    const alignIdx = result.indexOf('align=');
    const borderIdx = result.indexOf('border=');
    const classIdx = result.indexOf('class=');
    expect(alignIdx).toBeLessThan(borderIdx);
    expect(borderIdx).toBeLessThan(classIdx);
  });

  it('normalizes self-closing tags', () => {
    const input = '<br />';
    const result = normalizeHtml(input);
    // htmlparser2 serializes void elements in HTML5 style (no trailing slash)
    expect(result).toBe('<br>');
  });

  it('handles empty input', () => {
    expect(normalizeHtml('')).toBe('');
  });

  it('preserves <!--[if !mso]><!--> content', () => {
    const input = '<!--[if !mso]><!--><div>Modern</div><!--<![endif]-->';
    const result = normalizeHtml(input);
    expect(result).toContain('<div>Modern</div>');
  });
});

// ---------------------------------------------------------------------------
// extractStructure
// ---------------------------------------------------------------------------

describe('extractStructure', () => {
  const SAMPLE_HTML = `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body>
<table><tr><td>
<!--[if mso]><table><![endif]-->
<img src="logo.png" alt="Logo">
<a href="https://example.com">Click</a>
<p style="color:red;font-size:16px">Hello World</p>
<style>@media (max-width: 600px) { .mc-responsive { width: 100% !important; } }</style>
</td></tr></table>
</body></html>`;

  it('detects DOCTYPE', () => {
    const s = extractStructure(SAMPLE_HTML);
    expect(s.hasDoctype).toBe(true);
  });

  it('detects xmlns', () => {
    const s = extractStructure(SAMPLE_HTML);
    expect(s.hasXmlns).toBe(true);
  });

  it('detects charset meta', () => {
    const s = extractStructure(SAMPLE_HTML);
    expect(s.hasCharsetMeta).toBe(true);
  });

  it('detects viewport meta', () => {
    const s = extractStructure(SAMPLE_HTML);
    expect(s.hasViewportMeta).toBe(true);
  });

  it('detects Outlook namespace', () => {
    const s = extractStructure(SAMPLE_HTML);
    expect(s.hasOutlookNS).toBe(true);
  });

  it('detects Outlook conditionals', () => {
    const s = extractStructure(SAMPLE_HTML);
    expect(s.hasOutlookConditionals).toBe(true);
  });

  it('detects media queries', () => {
    const s = extractStructure(SAMPLE_HTML);
    expect(s.hasMediaQuery).toBe(true);
  });

  it('extracts text content', () => {
    const s = extractStructure(SAMPLE_HTML);
    expect(s.textContent).toContain('Hello');
    expect(s.textContent).toContain('World');
    expect(s.textContent).toContain('Click');
  });

  it('extracts image sources', () => {
    const s = extractStructure(SAMPLE_HTML);
    expect(s.imageSrcs).toEqual(['logo.png']);
  });

  it('extracts image alts', () => {
    const s = extractStructure(SAMPLE_HTML);
    expect(s.imageAlts).toEqual(['Logo']);
  });

  it('extracts link hrefs', () => {
    const s = extractStructure(SAMPLE_HTML);
    expect(s.linkHrefs).toEqual(['https://example.com']);
  });

  it('counts tables', () => {
    const s = extractStructure(SAMPLE_HTML);
    expect(s.tableCount).toBeGreaterThanOrEqual(1);
  });

  it('extracts inline styles', () => {
    const s = extractStructure(SAMPLE_HTML);
    expect(s.inlineStyles).toContain('color:red');
    expect(s.inlineStyles).toContain('font-size:16px');
  });
});

// ---------------------------------------------------------------------------
// structuralDiff
// ---------------------------------------------------------------------------

describe('structuralDiff', () => {
  it('returns empty array for identical structures', () => {
    const s = extractStructure('<html><body>Hello</body></html>');
    const diffs = structuralDiff(s, s);
    expect(diffs).toHaveLength(0);
  });

  it('detects text content differences', () => {
    const a = extractStructure('<p>Hello</p>');
    const b = extractStructure('<p>Goodbye</p>');
    const diffs = structuralDiff(a, b);
    const contentDiff = diffs.find((d) => d.type === 'content-diff');
    expect(contentDiff).toBeDefined();
  });

  it('detects image source differences', () => {
    const a = extractStructure('<img src="a.png" alt="">');
    const b = extractStructure('<img src="b.png" alt="">');
    const diffs = structuralDiff(a, b);
    const imgDiff = diffs.find((d) => d.path === 'img src');
    expect(imgDiff).toBeDefined();
  });

  it('detects DOCTYPE presence difference', () => {
    const a = extractStructure('<!DOCTYPE html><html></html>');
    const b = extractStructure('<html></html>');
    const diffs = structuralDiff(a, b);
    const dtDiff = diffs.find((d) => d.path === 'doctype');
    expect(dtDiff).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Fixture discovery
// ---------------------------------------------------------------------------

describe('getFixtures', () => {
  it('discovers fixture directories', () => {
    const fixtures = getFixtures();
    expect(fixtures.length).toBeGreaterThanOrEqual(5);
    expect(fixtures).toContain('basic-layout');
    expect(fixtures).toContain('two-column');
    expect(fixtures).toContain('button-variants');
    expect(fixtures).toContain('image-layout');
    expect(fixtures).toContain('reset-password');
  });
});

describe('readFixture', () => {
  it('reads an mc fixture', () => {
    const content = readFixture('basic-layout', 'input.mc');
    expect(content).toContain('mc-body');
  });

  it('reads an mjml fixture', () => {
    const content = readFixture('basic-layout', 'input.mjml');
    expect(content).toContain('mjml');
  });
});

describe('readDeviations', () => {
  it('reads deviations for a fixture', () => {
    const devs = readDeviations('basic-layout');
    expect(devs.length).toBeGreaterThan(0);
    expect(devs[0]).toHaveProperty('description');
    expect(devs[0]).toHaveProperty('reason');
    expect(devs[0]).toHaveProperty('mjmlApproach');
    expect(devs[0]).toHaveProperty('mailcApproach');
  });

  it('returns empty array when no deviations file exists', () => {
    const devs = readDeviations('nonexistent-fixture');
    expect(devs).toEqual([]);
  });
});
