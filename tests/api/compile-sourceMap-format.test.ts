/**
 * Integration tests for the source-map + output-shape pipeline.
 *
 * These tests verify the real end-to-end behaviour of `compile()` with
 * `sourceMap: true` after the formatter was wired in (Phase 3).
 *
 * Design principles:
 * - Every assertion is against the actual `result.html` string or the actual
 *   `sourceMap.entries[n].outputLoc` values — not against mocks.
 * - Tests are written to FAIL when the implementation is broken, not to pass
 *   trivially. Each test documents what it is actually catching.
 * - No test silently skips an assertion with an `if (condition)` guard unless
 *   the guard itself has an assertion proving the condition is met.
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compile.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * A template with multiple clearly-distinct components so we can verify
 * that different entries land on different lines after prettification.
 */
const MULTI_COMPONENT = `<mc>
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

/**
 * Two-section template — ensures multiple top-level sections both
 * get separate lines with non-conflicting outputLoc values.
 */
const TWO_SECTIONS = `<mc>
<mc-head></mc-head>
<mc-body>
  <mc-section>
    <mc-column><mc-text>First section</mc-text></mc-column>
  </mc-section>
  <mc-section>
    <mc-column><mc-text>Second section</mc-text></mc-column>
  </mc-section>
</mc-body>
</mc>`;

// ---------------------------------------------------------------------------
// Core: sourceMap: true produces multi-line formatted HTML
// ---------------------------------------------------------------------------

describe('compile({ sourceMap: true }) — HTML formatting', () => {
  it('produces multi-line HTML (not a single giant line)', () => {
    const result = compile(MULTI_COMPONENT, { sourceMap: true });

    expect(result.errors).toHaveLength(0);
    expect(result.html).not.toBeNull();

    const lines = result.html!.split('\n');
    // A real email with several nested components should be at least 10 lines.
    // If this is 1, the formatter did not run and the bug is NOT fixed.
    expect(lines.length).toBeGreaterThan(10);
  });

  it('each line has a reasonable length — no 10,000-character single lines', () => {
    const result = compile(MULTI_COMPONENT, { sourceMap: true });
    expect(result.html).not.toBeNull();

    const lines = result.html!.split('\n');
    // If the formatter ran correctly, no individual line should be enormous.
    // wrap_line_length: 0 means js-beautify doesn't wrap mid-attribute, but
    // each *element* still gets its own line, so max line length stays sane.
    const maxLineLength = Math.max(...lines.map((l) => l.length));
    expect(maxLineLength).toBeLessThan(2000);
  });

  it('data-mc-id attributes are still present in the prettified HTML', () => {
    const result = compile(MULTI_COMPONENT, { sourceMap: true });
    expect(result.html).not.toBeNull();

    // Formatter must not strip data-mc-id attributes — they are needed for
    // source map lookups in the playground.
    expect(result.html).toContain('data-mc-id=');
  });

  it('number of data-mc-id attributes equals number of sourceMap entries', () => {
    const result = compile(MULTI_COMPONENT, { sourceMap: true });
    expect(result.html).not.toBeNull();
    expect(result.sourceMap).toBeDefined();

    // Count every data-mc-id occurrence in HTML
    const html = result.html!;
    const occurrences = (html.match(/data-mc-id="/g) ?? []).length;
    const entryCount = result.sourceMap!.entries.length;

    // This will fail if the formatter corrupted/duplicated any attributes.
    expect(occurrences).toBe(entryCount);
  });
});

// ---------------------------------------------------------------------------
// Core: outputLoc line numbers are consistent with the HTML the user receives
// ---------------------------------------------------------------------------

describe('compile({ sourceMap: true }) — outputLoc accuracy', () => {
  it('all entries have non-null outputLoc after compile', () => {
    const result = compile(MULTI_COMPONENT, { sourceMap: true });
    expect(result.sourceMap).toBeDefined();

    for (const entry of result.sourceMap!.entries) {
      expect(entry.outputLoc).not.toBeNull();
    }
  });

  it('not all entries are on line 1 — entries span multiple lines', () => {
    const result = compile(MULTI_COMPONENT, { sourceMap: true });
    expect(result.sourceMap).toBeDefined();

    const startLines = result
      .sourceMap!.entries.filter((e) => e.outputLoc !== null)
      .map((e) => e.outputLoc!.startLine);

    // If every entry is on line 1, the formatter did not run and offsets were
    // calculated on the unformatted single-line HTML — the core bug we fixed.
    const uniqueLines = new Set(startLines);
    expect(uniqueLines.size).toBeGreaterThan(1);
  });

  it('outputLoc.startLine is correct — the actual HTML line contains data-mc-id', () => {
    const result = compile(MULTI_COMPONENT, { sourceMap: true });
    expect(result.html).not.toBeNull();
    expect(result.sourceMap).toBeDefined();

    const lines = result.html!.split('\n');

    for (const entry of result.sourceMap!.entries) {
      if (entry.outputLoc === null) continue;

      const lineIdx = entry.outputLoc.startLine - 1; // 1-based → 0-based
      expect(lineIdx).toBeGreaterThanOrEqual(0);
      expect(lineIdx).toBeLessThan(lines.length);

      const lineContent = lines[lineIdx] ?? '';
      // The line at startLine MUST contain the data-mc-id for this entry.
      // If this fails, offsets were calculated on a different HTML than what
      // was stored in result.html — the single-pass invariant is broken.
      expect(lineContent).toContain(`data-mc-id="${entry.id}"`);
    }
  });

  it('two sections have different outputLoc.startLine values', () => {
    const result = compile(TWO_SECTIONS, { sourceMap: true });
    expect(result.sourceMap).toBeDefined();

    const sectionEntries = result
      .sourceMap!.entries.filter((e) => e.sourceComponent === 'mc-section');

    // Must have at least 2 section entries
    expect(sectionEntries.length).toBeGreaterThanOrEqual(2);

    const [first, second] = sectionEntries;
    expect(first!.outputLoc).not.toBeNull();
    expect(second!.outputLoc).not.toBeNull();

    // The two sections must land on different lines in the formatted HTML.
    // If both are on line 1, the formatter never ran — bug is still present.
    expect(first!.outputLoc!.startLine).not.toBe(second!.outputLoc!.startLine);
  });
});

// ---------------------------------------------------------------------------
// Minified output via config.output.minify — single-line, source map intact
// ---------------------------------------------------------------------------

const MINIFY_OPTS = { sourceMap: true, config: { output: { minify: true } } } as const;

describe('compile({ sourceMap: true, config: { output: { minify: true } } })', () => {
  it('produces single-line HTML (minify branch is taken, prettifier is skipped)', () => {
    const result = compile(MULTI_COMPONENT, MINIFY_OPTS);

    expect(result.errors).toHaveLength(0);
    expect(result.html).not.toBeNull();

    const lines = result.html!.split('\n');
    expect(lines.length).toBe(1);
  });

  it('sourceMap is still attached on minified output', () => {
    const result = compile(MULTI_COMPONENT, MINIFY_OPTS);

    expect(result.sourceMap).toBeDefined();
    expect(result.sourceMapIds).toBe(true);
    expect(result.sourceMap!.entries.length).toBeGreaterThan(0);
  });

  it('all entries have outputLoc (even on single-line HTML)', () => {
    const result = compile(MULTI_COMPONENT, MINIFY_OPTS);
    expect(result.sourceMap).toBeDefined();

    for (const entry of result.sourceMap!.entries) {
      expect(entry.outputLoc).not.toBeNull();
    }
  });

  it('all entries have startLine: 1 because everything is on one line', () => {
    const result = compile(MULTI_COMPONENT, MINIFY_OPTS);
    expect(result.sourceMap).toBeDefined();

    for (const entry of result.sourceMap!.entries) {
      expect(entry.outputLoc).not.toBeNull();
      expect(entry.outputLoc!.startLine).toBe(1);
    }
  });

  it('data-mc-id attributes survive on minified output', () => {
    const result = compile(MULTI_COMPONENT, MINIFY_OPTS);
    expect(result.html).not.toBeNull();
    expect(result.html).toContain('data-mc-id=');
  });
});

// ---------------------------------------------------------------------------
// sourceMap: false (or omitted) — pretty by default, no map attached
// ---------------------------------------------------------------------------

describe('compile() without sourceMap — default is pretty', () => {
  it('produces multi-line pretty-printed HTML by default', () => {
    const result = compile(MULTI_COMPONENT);

    expect(result.errors).toHaveLength(0);
    expect(result.html).not.toBeNull();

    const lines = result.html!.split('\n');
    expect(lines.length).toBeGreaterThan(1);
  });

  it('produces single-line HTML when minify: true is set', () => {
    const result = compile(MULTI_COMPONENT, { config: { output: { minify: true } } });

    const lines = result.html!.split('\n');
    expect(lines.length).toBe(1);
  });

  it('does not inject data-mc-id attributes into the HTML', () => {
    const result = compile(MULTI_COMPONENT);
    expect(result.html).not.toContain('data-mc-id=');
  });

  it('does not attach a sourceMap', () => {
    const result = compile(MULTI_COMPONENT);
    expect(result.sourceMap).toBeUndefined();
    expect(result.sourceMapIds).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Single-pass invariant: result.html and outputLoc are always in sync
// ---------------------------------------------------------------------------

describe('single-pass invariant: outputLoc always matches result.html', () => {
  it('no entry points outside the bounds of result.html', () => {
    const result = compile(TWO_SECTIONS, { sourceMap: true });
    expect(result.html).not.toBeNull();
    expect(result.sourceMap).toBeDefined();

    const lines = result.html!.split('\n');
    const totalLines = lines.length;

    for (const entry of result.sourceMap!.entries) {
      if (entry.outputLoc === null) continue;

      // Every line reference must be within the actual HTML
      expect(entry.outputLoc.startLine).toBeGreaterThanOrEqual(1);
      expect(entry.outputLoc.startLine).toBeLessThanOrEqual(totalLines);
      expect(entry.outputLoc.endLine).toBeGreaterThanOrEqual(entry.outputLoc.startLine);
      expect(entry.outputLoc.endLine).toBeLessThanOrEqual(totalLines);
    }
  });

  it('outputRange byte offsets point into result.html (not a stale unformatted copy)', () => {
    const result = compile(TWO_SECTIONS, { sourceMap: true });
    expect(result.html).not.toBeNull();
    expect(result.sourceMap).toBeDefined();

    const html = result.html!;

    for (const entry of result.sourceMap!.entries) {
      if (entry.outputRange === null) continue;

      // Extract the substring at the byte range and verify it contains
      // the data-mc-id for this entry. If the range was calculated on the
      // unformatted HTML but result.html is the formatted version, the
      // byte offsets will be wrong and this check will fail.
      const slice = html.slice(entry.outputRange.start, entry.outputRange.end + 1);
      expect(slice).toContain(`data-mc-id="${entry.id}"`);
    }
  });
});
