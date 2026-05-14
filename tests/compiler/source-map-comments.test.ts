/**
 * SM-A: Debug comment injection tests.
 *
 * Verifies that `compile(source, { debug: true })` injects
 * `<!-- mc:source -->` comments into the HTML output, and that
 * `debug: false` (the default) produces no such comments.
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compile.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SIMPLE_TEMPLATE = `<mc>
<mc-head>
  <mc-title>Test</mc-title>
</mc-head>
<mc-body>
  <mc-section>
    <mc-column>
      <mc-text>Hello</mc-text>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SM-A: Debug comment injection', () => {
  describe('debug: true', () => {
    it('sets result.sourceMapComments = true', () => {
      const result = compile(SIMPLE_TEMPLATE, { debug: true });
      expect(result.sourceMapComments).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('injects mc:source open comment for mc-section', () => {
      const result = compile(SIMPLE_TEMPLATE, { debug: true });
      expect(result.html).toContain('<!-- mc:source component="mc-section"');
    });

    it('injects mc:source open comment for mc-column', () => {
      const result = compile(SIMPLE_TEMPLATE, { debug: true });
      expect(result.html).toContain('<!-- mc:source component="mc-column"');
    });

    it('injects mc:source open comment for mc-text', () => {
      const result = compile(SIMPLE_TEMPLATE, { debug: true });
      expect(result.html).toContain('<!-- mc:source component="mc-text"');
    });

    it('injects mc:/component close comment for mc-section', () => {
      const result = compile(SIMPLE_TEMPLATE, { debug: true });
      expect(result.html).toContain('<!-- mc:/mc-section');
    });

    it('injects mc:/component close comment for mc-text', () => {
      const result = compile(SIMPLE_TEMPLATE, { debug: true });
      expect(result.html).toContain('<!-- mc:/mc-text');
    });

    it('includes line number in mc:source comment', () => {
      const result = compile(SIMPLE_TEMPLATE, { debug: true });
      // mc-section is on line 6
      expect(result.html).toMatch(/mc:source component="mc-section" line="\d+"/);
    });

    it('includes col number in mc:source comment', () => {
      const result = compile(SIMPLE_TEMPLATE, { debug: true });
      expect(result.html).toMatch(/mc:source component="mc-section"[^>]*col="\d+"/);
    });

    it('includes entry id in mc:source comment', () => {
      const result = compile(SIMPLE_TEMPLATE, { debug: true });
      expect(result.html).toMatch(/mc:source component="mc-section"[^>]*id="entry-\d+"/);
    });

    it('open and close comment IDs match for mc-text', () => {
      const result = compile(SIMPLE_TEMPLATE, { debug: true });
      const html = result.html!;
      const openMatch = html.match(/mc:source component="mc-text"[^>]*id="(entry-\d+)"/);
      const closeMatch = html.match(/mc:\/mc-text id="(entry-\d+)"/);
      expect(openMatch).toBeTruthy();
      expect(closeMatch).toBeTruthy();
      expect(openMatch![1]).toBe(closeMatch![1]);
    });

    it('mc:source comments are preserved (not stripped) by optimizer', () => {
      // Even with comments stripping on (default), mc:source comments survive
      const result = compile(SIMPLE_TEMPLATE, { debug: true });
      expect(result.html).toContain('mc:source');
    });
  });

  describe('debug: false (default)', () => {
    it('does NOT set result.sourceMapComments', () => {
      const result = compile(SIMPLE_TEMPLATE);
      expect(result.sourceMapComments).toBeUndefined();
    });

    it('HTML contains NO mc:source comments by default', () => {
      const result = compile(SIMPLE_TEMPLATE);
      expect(result.html).not.toContain('mc:source');
    });

    it('HTML contains NO mc:source comments with explicit debug:false', () => {
      const result = compile(SIMPLE_TEMPLATE, { debug: false });
      expect(result.html).not.toContain('mc:source');
    });

    it('result.sourceMap is undefined', () => {
      const result = compile(SIMPLE_TEMPLATE);
      expect(result.sourceMap).toBeUndefined();
    });

    it('result.sourceMapJSON is undefined', () => {
      const result = compile(SIMPLE_TEMPLATE);
      expect(result.sourceMapJSON).toBeUndefined();
    });
  });
});
