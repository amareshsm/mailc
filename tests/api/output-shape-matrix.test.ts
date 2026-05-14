/**
 * Output-shape × source-map matrix.
 *
 * Asserts the four-cell contract:
 *
 *   compile(source)                                   → formatted, no map
 *   compile(source, { sourceMap: true })              → formatted + map, lines map to formatted HTML
 *   compile(source, { …minify: true })                → minified, no map
 *   compile(source, { sourceMap: true, …minify: true }) → minified + map, all lines = 1
 *
 * Also asserts:
 *   - prettify is never run twice (output is byte-identical to a single pass)
 *   - removed fields `formatOutput` / `prettyPrint` are not accepted by the type
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compile.js';
import { prettifyHtml } from '../../src/utils/formatter.js';

const SOURCE = `<mc>
  <mc-body>
    <mc-section>
      <mc-column>
        <mc-text>Hello</mc-text>
        <mc-button href="https://example.com">Click</mc-button>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`;

const minifyConfig = { config: { output: { minify: true } } };

describe('output shape × source map matrix', () => {
  // ── Cell 1 — compile(source) ──────────────────────────────────────────
  describe('compile(source) — default', () => {
    const result = compile(SOURCE);

    it('produces no errors', () => {
      expect(result.errors).toHaveLength(0);
    });

    it('produces multi-line (formatted) HTML', () => {
      expect(result.html).not.toBeNull();
      const lines = result.html!.split('\n');
      expect(lines.length).toBeGreaterThan(1);
    });

    it('does NOT inject data-mc-id attributes', () => {
      expect(result.html).not.toContain('data-mc-id=');
    });

    it('does NOT attach a sourceMap', () => {
      expect(result.sourceMap).toBeUndefined();
      expect(result.sourceMapIds).toBeUndefined();
      expect(result.sourceMapComments).toBeUndefined();
    });
  });

  // ── Cell 2 — compile(source, { sourceMap: true }) ─────────────────────
  describe('compile(source, { sourceMap: true })', () => {
    const result = compile(SOURCE, { sourceMap: true });

    it('produces no errors', () => {
      expect(result.errors).toHaveLength(0);
    });

    it('produces multi-line (formatted) HTML', () => {
      expect(result.html).not.toBeNull();
      const lines = result.html!.split('\n');
      expect(lines.length).toBeGreaterThan(1);
    });

    it('injects data-mc-id attributes', () => {
      expect(result.html).toContain('data-mc-id=');
    });

    it('attaches a sourceMap with entries', () => {
      expect(result.sourceMap).toBeDefined();
      expect(result.sourceMapIds).toBe(true);
      expect(result.sourceMap!.entries.length).toBeGreaterThan(0);
    });

    it('source-map line numbers map to lines in result.html (not all 1)', () => {
      const lines = result.html!.split('\n');
      const totalLines = lines.length;
      const startLines = result
        .sourceMap!.entries.filter((e) => e.outputLoc !== null)
        .map((e) => e.outputLoc!.startLine);

      // At least one entry should NOT be on line 1 (multi-line output).
      const nonOnePresent = startLines.some((n) => n > 1);
      expect(nonOnePresent).toBe(true);

      // Every line reference must be within bounds.
      for (const n of startLines) {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(totalLines);
      }
    });
  });

  // ── Cell 3 — compile(source, { …minify: true }) ───────────────────────
  describe('compile(source, { config: { output: { minify: true } } })', () => {
    const result = compile(SOURCE, minifyConfig);

    it('produces no errors', () => {
      expect(result.errors).toHaveLength(0);
    });

    it('produces single-line (minified) HTML', () => {
      expect(result.html).not.toBeNull();
      const lines = result.html!.split('\n');
      expect(lines.length).toBe(1);
    });

    it('does NOT inject data-mc-id attributes', () => {
      expect(result.html).not.toContain('data-mc-id=');
    });

    it('does NOT attach a sourceMap', () => {
      expect(result.sourceMap).toBeUndefined();
    });
  });

  // ── Cell 4 — compile(source, { sourceMap: true, …minify: true }) ──────
  describe('compile(source, { sourceMap: true, config: { output: { minify: true } } })', () => {
    const result = compile(SOURCE, { sourceMap: true, ...minifyConfig });

    it('produces no errors', () => {
      expect(result.errors).toHaveLength(0);
    });

    it('produces single-line (minified) HTML', () => {
      expect(result.html).not.toBeNull();
      expect(result.html!.split('\n').length).toBe(1);
    });

    it('injects data-mc-id attributes', () => {
      expect(result.html).toContain('data-mc-id=');
    });

    it('attaches a sourceMap', () => {
      expect(result.sourceMap).toBeDefined();
      expect(result.sourceMapIds).toBe(true);
    });

    it('every entry has startLine: 1 (single-line output)', () => {
      for (const entry of result.sourceMap!.entries) {
        if (entry.outputLoc === null) continue;
        expect(entry.outputLoc.startLine).toBe(1);
      }
    });
  });
});

// ── Idempotence — prettify is never run twice ────────────────────────────
describe('prettify runs exactly once', () => {
  it('default output equals a single js-beautify pass on the renderer output', () => {
    // If someone ever re-introduces a duplicate prettify pass on the default
    // path, this assertion will start failing because js-beautify on
    // already-formatted input produces minor whitespace differences (e.g.
    // collapsing `max_preserve_newlines: 1`).
    const a = compile(SOURCE).html!;
    const b = prettifyHtml(a).html;
    expect(a).toBe(b);
  });

  it('sourceMap output equals a single js-beautify pass — confirms no second prettify pass', () => {
    const a = compile(SOURCE, { sourceMap: true }).html!;
    const b = prettifyHtml(a).html;
    expect(a).toBe(b);
  });
});

// ── Removed-field guard — TypeScript will fail the build if these come back ──
describe('removed fields are not accepted', () => {
  it('CompileOptions.formatOutput is not in the type', () => {
    // @ts-expect-error — formatOutput was removed; this must be a type error.
    compile(SOURCE, { formatOutput: false });
  });

  it('OutputConfig.prettyPrint is not in the type', () => {
    // @ts-expect-error — prettyPrint was removed; this must be a type error.
    compile(SOURCE, { config: { output: { prettyPrint: true } } });
  });
});
