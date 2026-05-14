/**
 * SM-G1: `sourceMap: true` clean API — basic injection tests.
 *
 * Verifies that `compile(source, { sourceMap: true })` produces:
 * - Clean HTML with `data-mc-id` attributes on component root elements.
 * - No `<!-- mc:source -->` markers in the HTML.
 * - A fully populated `result.sourceMap` (EmailSourceMap).
 * - A valid `result.sourceMapJSON` string.
 *
 * Also verifies the 1:1 mapping invariant:
 *   every entry ID in sourceMap.entries has exactly one `data-mc-id` in the HTML.
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compile.js';
import { injectDataId } from '../../src/compiler/data-id-injector.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SIMPLE = `<mc>
<mc-head>
  <mc-title>Test</mc-title>
</mc-head>
<mc-body>
  <mc-section>
    <mc-column>
      <mc-text>Hello world</mc-text>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;

const TWO_SECTIONS = `<mc>
<mc-head></mc-head>
<mc-body>
  <mc-section>
    <mc-column><mc-text>First</mc-text></mc-column>
  </mc-section>
  <mc-section>
    <mc-column><mc-text>Second</mc-text></mc-column>
  </mc-section>
</mc-body>
</mc>`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Count all occurrences of a substring in a string. */
function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let pos = 0;
  while ((pos = haystack.indexOf(needle, pos)) !== -1) {
    count++;
    pos += needle.length;
  }
  return count;
}

// ---------------------------------------------------------------------------
// injectDataId unit tests
// ---------------------------------------------------------------------------

describe('injectDataId()', () => {
  it('inserts data-mc-id before the closing > of the first opening tag', () => {
    const result = injectDataId('<table width="100%"><tr></tr></table>', 'entry-1');
    expect(result).toBe('<table width="100%" data-mc-id="entry-1"><tr></tr></table>');
  });

  it('inserts before /> for self-closing elements', () => {
    const result = injectDataId('<img src="x.png" />', 'entry-2');
    expect(result).toBe('<img src="x.png" data-mc-id="entry-2" />');
  });

  it('handles > inside an attribute value without false-positive insertion', () => {
    const result = injectDataId('<a href="x?a=1&b=2>3">link</a>', 'entry-3');
    // Should insert after the attribute value closes, before the real >
    expect(result).toContain('data-mc-id="entry-3"');
    expect(result.indexOf('data-mc-id')).toBeGreaterThan(result.indexOf('href'));
  });

  it("handles single-quoted attribute values with > inside", () => {
    const result = injectDataId("<div title='a>b'>content</div>", 'entry-4');
    expect(result).toContain('data-mc-id="entry-4"');
    // The attribute should come right before the actual closing >
    const idIdx = result.indexOf('data-mc-id="entry-4"');
    expect(result[idIdx + 'data-mc-id="entry-4"'.length]).toBe('>');
  });

  it('is a no-op when the tag already has that data-mc-id', () => {
    const html = '<table data-mc-id="entry-5"><tr></tr></table>';
    expect(injectDataId(html, 'entry-5')).toBe(html);
  });

  it('returns unchanged when html is empty', () => {
    expect(injectDataId('', 'entry-6')).toBe('');
  });

  it('returns unchanged when id is empty', () => {
    const html = '<p>hello</p>';
    expect(injectDataId(html, '')).toBe(html);
  });

  it('skips HTML comments at the start and targets the first real element', () => {
    const result = injectDataId('<!-- comment --><p>hello</p>', 'entry-7');
    expect(result).toBe('<!-- comment --><p data-mc-id="entry-7">hello</p>');
  });

  it('skips <!DOCTYPE and targets the first real element', () => {
    const result = injectDataId('<!DOCTYPE html><html lang="en">', 'entry-8');
    expect(result).toBe('<!DOCTYPE html><html lang="en" data-mc-id="entry-8">');
  });

  it('skips MSO conditional comment containing real tags and targets the first DOM element', () => {
    // This is the exact column compiler output pattern.
    // The <td> inside <!--[if mso | IE]>...<![endif]--> is NOT in the browser DOM —
    // data-mc-id must land on the <div> that follows, which IS in the DOM.
    const html =
      '<!--[if mso | IE]><td style="vertical-align:top;width:300px;"></td><![endif]-->' +
      '<div class="mc-responsive" style="display:inline-block;">' +
      '<table><tr><td>content</td></tr></table></div>';
    const result = injectDataId(html, 'entry-9');
    expect(result).toContain('<div class="mc-responsive" style="display:inline-block;" data-mc-id="entry-9">');
    expect(result).not.toContain('<td style="vertical-align:top;width:300px;" data-mc-id="entry-9">');
  });

  it('handles nested MSO conditionals with multiple tags inside', () => {
    const html =
      '<!--[if mso | IE]><table><tr><td><![endif]-->' +
      '<div class="section">content</div>' +
      '<!--[if mso | IE]></td></tr></table><![endif]-->';
    const result = injectDataId(html, 'entry-10');
    expect(result).toBe(
      '<!--[if mso | IE]><table><tr><td><![endif]-->' +
      '<div class="section" data-mc-id="entry-10">content</div>' +
      '<!--[if mso | IE]></td></tr></table><![endif]-->'
    );
  });
});

// ---------------------------------------------------------------------------
// compile() with sourceMap: true
// ---------------------------------------------------------------------------

describe('compile() with sourceMap: true', () => {
  describe('HTML output', () => {
    it('produces non-null HTML', () => {
      const { html } = compile(SIMPLE, { sourceMap: true });
      expect(html).not.toBeNull();
    });

    it('HTML contains data-mc-id attributes', () => {
      const { html } = compile(SIMPLE, { sourceMap: true });
      expect(html).toContain('data-mc-id=');
    });

    it('mc-column data-mc-id is on the <div> (browser DOM element), not inside MSO comment', () => {
      // The column compiler emits:
      //   <!--[if mso | IE]><td ...><![endif]--><div class="mc-responsive" ...>
      // data-mc-id must land on <div>, not the <td> inside the MSO comment,
      // because the browser never renders MSO-conditional content in the DOM.
      const { html, sourceMap } = compile(SIMPLE, { sourceMap: true });
      const columnEntry = sourceMap?.entries.find(e => e.sourceComponent === 'mc-column');
      expect(columnEntry).toBeDefined();
      const id = columnEntry!.id;
      // The attribute must appear outside any <!-- --> comment
      const attrPattern = new RegExp(`data-mc-id="${id}"`);
      const match = attrPattern.exec(html!);
      expect(match).not.toBeNull();
      const pos = match!.index;
      // Verify the injection point is NOT inside an HTML comment:
      // find the last '<!--' before pos and check there is a '-->' between it and pos.
      const beforeAttr = html!.slice(0, pos);
      const lastCommentOpen = beforeAttr.lastIndexOf('<!--');
      if (lastCommentOpen !== -1) {
        const commentClose = beforeAttr.indexOf('-->', lastCommentOpen);
        // If no '-->' was found after the last '<!--', we're inside a comment — that's the bug.
        expect(commentClose).toBeGreaterThan(lastCommentOpen);
      }
      // The tag carrying data-mc-id must be <div (the mc-responsive column div)
      const tagStart = html!.lastIndexOf('<', pos);
      expect(html!.slice(tagStart, tagStart + 4)).toBe('<div');
    });

    it('HTML does NOT contain mc:source comment markers', () => {
      const { html } = compile(SIMPLE, { sourceMap: true });
      expect(html).not.toContain('mc:source');
      expect(html).not.toContain('<!-- mc:');
    });
  });

  describe('result flags', () => {
    it('result.sourceMapIds is true', () => {
      const result = compile(SIMPLE, { sourceMap: true });
      expect(result.sourceMapIds).toBe(true);
    });

    it('result.sourceMap is populated', () => {
      const result = compile(SIMPLE, { sourceMap: true });
      expect(result.sourceMap).toBeDefined();
      expect(result.sourceMap?.version).toBe(1);
    });

    it('result.sourceMapJSON is a valid JSON string', () => {
      const result = compile(SIMPLE, { sourceMap: true });
      expect(result.sourceMapJSON).toBeDefined();
      const parsed = JSON.parse(result.sourceMapJSON!);
      expect(parsed.version).toBe(1);
      expect(Array.isArray(parsed.entries)).toBe(true);
    });

    it('result.sourceMapComments is NOT set (no comment markers)', () => {
      const result = compile(SIMPLE, { sourceMap: true });
      expect(result.sourceMapComments).toBeUndefined();
    });
  });

  describe('sourceMap: false (default)', () => {
    it('result.sourceMap is undefined when sourceMap not set', () => {
      const result = compile(SIMPLE);
      expect(result.sourceMap).toBeUndefined();
    });

    it('result.sourceMapIds is undefined when sourceMap not set', () => {
      const result = compile(SIMPLE);
      expect(result.sourceMapIds).toBeUndefined();
    });

    it('HTML has no data-mc-id attributes in production mode', () => {
      const { html } = compile(SIMPLE);
      expect(html).not.toContain('data-mc-id');
    });
  });

  describe('source map entries', () => {
    it('entries array is non-empty', () => {
      const result = compile(SIMPLE, { sourceMap: true });
      expect(result.sourceMap!.entries.length).toBeGreaterThan(0);
    });

    it('each entry has a unique id', () => {
      const result = compile(SIMPLE, { sourceMap: true });
      const ids = result.sourceMap!.entries.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('mc-section entry is present', () => {
      const result = compile(SIMPLE, { sourceMap: true });
      const section = result.sourceMap!.entries.find(
        (e) => e.sourceComponent === 'mc-section',
      );
      expect(section).toBeDefined();
    });

    it('mc-text entry has correct sourceComponent', () => {
      const result = compile(SIMPLE, { sourceMap: true });
      const text = result.sourceMap!.entries.find(
        (e) => e.sourceComponent === 'mc-text',
      );
      expect(text).toBeDefined();
    });

    it('child entries have a parentId that matches a parent entry id', () => {
      const result = compile(SIMPLE, { sourceMap: true });
      const entries = result.sourceMap!.entries;
      const withParent = entries.filter((e) => e.parentId !== null);
      for (const entry of withParent) {
        const parent = entries.find((e) => e.id === entry.parentId);
        expect(parent).toBeDefined();
      }
    });

    it('sourceLoc line numbers are positive integers', () => {
      const result = compile(SIMPLE, { sourceMap: true });
      for (const entry of result.sourceMap!.entries) {
        expect(entry.sourceLoc.startLine).toBeGreaterThan(0);
      }
    });
  });

  describe('1:1 mapping invariant', () => {
    it('every entry id appears exactly once as data-mc-id in the HTML', () => {
      const result = compile(SIMPLE, { sourceMap: true });
      const html = result.html!;
      const entries = result.sourceMap!.entries;

      for (const entry of entries) {
        const occurrences = countOccurrences(html, `data-mc-id="${entry.id}"`);
        expect(occurrences).toBe(1);
      }
    });

    it('data-mc-id count in HTML equals number of entries', () => {
      const result = compile(SIMPLE, { sourceMap: true });
      const html = result.html!;
      const total = countOccurrences(html, 'data-mc-id=');
      expect(total).toBe(result.sourceMap!.entries.length);
    });

    it('invariant holds for template with two sections', () => {
      const result = compile(TWO_SECTIONS, { sourceMap: true });
      const html = result.html!;
      const entries = result.sourceMap!.entries;
      const total = countOccurrences(html, 'data-mc-id=');
      expect(total).toBe(entries.length);
    });
  });

  describe('coexistence: debug: true AND sourceMap: true', () => {
    it('HTML has both mc:source markers AND data-mc-id attributes', () => {
      const result = compile(SIMPLE, { debug: true, sourceMap: true });
      expect(result.html).toContain('mc:source');
      expect(result.html).toContain('data-mc-id=');
    });

    it('result.sourceMapComments and result.sourceMapIds are both true', () => {
      const result = compile(SIMPLE, { debug: true, sourceMap: true });
      expect(result.sourceMapComments).toBe(true);
      expect(result.sourceMapIds).toBe(true);
    });

    it('result.sourceMap is populated in both modes', () => {
      const result = compile(SIMPLE, { debug: true, sourceMap: true });
      expect(result.sourceMap).toBeDefined();
    });
  });
});
