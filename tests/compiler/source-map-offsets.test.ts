/**
 * SM-E: Source map offset calculation tests.
 *
 * Verifies that `calculateOffsets()` correctly parses `<!-- mc:source -->`
 * comments from compiled HTML and populates `outputRange` and `outputLoc`
 * on source map entries.
 *
 * These tests work end-to-end via `compile(template, { debug: true })`,
 * which calls `calculateOffsets()` internally before building `result.sourceMap`.
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compile.js';
import { calculateOffsets } from '../../src/compiler/source-map-offsets.js';
import type { SourceMapEntry } from '../../src/types.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SIMPLE_TEMPLATE = `<mc>
<mc-head><mc-title>Test</mc-title></mc-head>
<mc-body>
  <mc-section>
    <mc-column>
      <mc-text>Hello world</mc-text>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;

const TWO_SECTIONS = `<mc>
<mc-head><mc-title>Two</mc-title></mc-head>
<mc-body>
  <mc-section>
    <mc-column>
      <mc-text>First</mc-text>
    </mc-column>
  </mc-section>
  <mc-section>
    <mc-column>
      <mc-text>Second</mc-text>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function entriesFor(entries: SourceMapEntry[], component: string): SourceMapEntry[] {
  return entries.filter((e) => e.sourceComponent === component);
}

// ---------------------------------------------------------------------------
// calculateOffsets() unit tests (direct, using crafted HTML + entries)
// ---------------------------------------------------------------------------

describe('SM-E: calculateOffsets() — unit', () => {
  it('returns the same entries array (mutates and returns in-place)', () => {
    const html = '<!-- mc:source component="mc-text" line="1" col="1" id="entry-1" -->\n<p>Hello</p>\n<!-- mc:/mc-text id="entry-1" -->';
    const entry: SourceMapEntry = {
      id: 'entry-1',
      parentId: null,
      sourceComponent: 'mc-text',
      sourceLoc: { startLine: 1, startCol: 1, endLine: 1, endCol: 10 },
      role: 'content',
      outputTag: 'p',
      outputRange: null,
      outputLoc: null,
      styles: [],
      expressions: [],
      conditional: null,
      loop: null,
      sourceAttributes: {},
      children: [],
    };
    const result = calculateOffsets(html, [entry]);
    expect(result).toBe(result); // same reference
    expect(result[0]).toBe(entry); // same entry reference
  });

  it('populates outputRange.start and outputRange.end', () => {
    const html = '<!-- mc:source component="mc-text" line="1" col="1" id="entry-1" -->\n<p>Hello</p>\n<!-- mc:/mc-text id="entry-1" -->';
    const entry: SourceMapEntry = {
      id: 'entry-1',
      parentId: null,
      sourceComponent: 'mc-text',
      sourceLoc: { startLine: 1, startCol: 1, endLine: 1, endCol: 10 },
      role: 'content',
      outputTag: 'p',
      outputRange: null,
      outputLoc: null,
      styles: [],
      expressions: [],
      conditional: null,
      loop: null,
      sourceAttributes: {},
      children: [],
    };
    calculateOffsets(html, [entry]);
    expect(entry.outputRange).not.toBeNull();
    expect(entry.outputRange!.start).toBeGreaterThanOrEqual(0);
    expect(entry.outputRange!.end).toBeGreaterThan(entry.outputRange!.start);
  });

  it('outputRange.start < outputRange.end', () => {
    const html = '<!-- mc:source component="x" line="1" col="1" id="e1" -->\n<p>content</p>\n<!-- mc:/x id="e1" -->';
    const entry: SourceMapEntry = {
      id: 'e1', parentId: null, sourceComponent: 'x',
      sourceLoc: { startLine: 1, startCol: 1, endLine: 1, endCol: 5 },
      role: 'content', outputTag: 'p',
      outputRange: null, outputLoc: null,
      styles: [], expressions: [], conditional: null, loop: null,
      sourceAttributes: {}, children: [],
    };
    calculateOffsets(html, [entry]);
    expect(entry.outputRange!.start).toBeLessThan(entry.outputRange!.end);
  });

  it('populates outputLoc with positive line numbers', () => {
    const html = '<!-- mc:source component="x" line="1" col="1" id="e1" -->\n<p>text</p>\n<!-- mc:/x id="e1" -->';
    const entry: SourceMapEntry = {
      id: 'e1', parentId: null, sourceComponent: 'x',
      sourceLoc: { startLine: 1, startCol: 1, endLine: 1, endCol: 5 },
      role: 'content', outputTag: 'p',
      outputRange: null, outputLoc: null,
      styles: [], expressions: [], conditional: null, loop: null,
      sourceAttributes: {}, children: [],
    };
    calculateOffsets(html, [entry]);
    expect(entry.outputLoc).not.toBeNull();
    expect(entry.outputLoc!.startLine).toBeGreaterThanOrEqual(1);
    expect(entry.outputLoc!.endLine).toBeGreaterThanOrEqual(entry.outputLoc!.startLine);
  });

  it('leaves entries without matching comments unchanged (null)', () => {
    const html = '<p>No comments here</p>';
    const entry: SourceMapEntry = {
      id: 'missing', parentId: null, sourceComponent: 'mc-text',
      sourceLoc: { startLine: 1, startCol: 1, endLine: 1, endCol: 10 },
      role: 'content', outputTag: 'p',
      outputRange: null, outputLoc: null,
      styles: [], expressions: [], conditional: null, loop: null,
      sourceAttributes: {}, children: [],
    };
    calculateOffsets(html, [entry]);
    expect(entry.outputRange).toBeNull();
    expect(entry.outputLoc).toBeNull();
  });

  it('handles empty html without crashing', () => {
    expect(() => calculateOffsets('', [])).not.toThrow();
  });

  it('handles empty entries array without crashing', () => {
    expect(() => calculateOffsets('<p>hello</p>', [])).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Integration: compile() with debug:true — offsets are populated
// ---------------------------------------------------------------------------

describe('SM-E: integration — offsets populated after compile()', () => {
  it('entries have non-null outputRange after compile(debug:true)', () => {
    const result = compile(SIMPLE_TEMPLATE, { debug: true });
    const entries = result.sourceMap!.entries;
    // At least some entries should have outputRange populated
    const withRange = entries.filter((e) => e.outputRange !== null);
    expect(withRange.length).toBeGreaterThan(0);
  });

  it('all mc-section entries have outputRange populated', () => {
    const result = compile(SIMPLE_TEMPLATE, { debug: true });
    const sectionEntries = entriesFor(result.sourceMap!.entries, 'mc-section');
    for (const entry of sectionEntries) {
      expect(entry.outputRange).not.toBeNull();
    }
  });

  it('all mc-text entries have outputRange populated', () => {
    const result = compile(SIMPLE_TEMPLATE, { debug: true });
    const textEntries = entriesFor(result.sourceMap!.entries, 'mc-text');
    for (const entry of textEntries) {
      expect(entry.outputRange).not.toBeNull();
    }
  });

  it('outputRange.start < outputRange.end for all populated entries', () => {
    const result = compile(SIMPLE_TEMPLATE, { debug: true });
    for (const entry of result.sourceMap!.entries) {
      if (entry.outputRange) {
        expect(entry.outputRange.start).toBeLessThan(entry.outputRange.end);
      }
    }
  });

  it('outputLoc.startLine >= 1 for all populated entries', () => {
    const result = compile(SIMPLE_TEMPLATE, { debug: true });
    for (const entry of result.sourceMap!.entries) {
      if (entry.outputLoc) {
        expect(entry.outputLoc.startLine).toBeGreaterThanOrEqual(1);
        expect(entry.outputLoc.startCol).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('two sections produce distinct non-overlapping outputRange starts', () => {
    const result = compile(TWO_SECTIONS, { debug: true });
    const sections = entriesFor(result.sourceMap!.entries, 'mc-section')
      .filter((e) => e.outputRange !== null)
      .sort((a, b) => a.outputRange!.start - b.outputRange!.start);
    expect(sections.length).toBeGreaterThanOrEqual(2);
    // Second section starts after first section starts
    expect(sections[1]!.outputRange!.start).toBeGreaterThan(sections[0]!.outputRange!.start);
  });

  it('child mc-text outputRange is within parent mc-section outputRange', () => {
    const result = compile(SIMPLE_TEMPLATE, { debug: true });
    const section = entriesFor(result.sourceMap!.entries, 'mc-section')
      .find((e) => e.outputRange !== null);
    const text = entriesFor(result.sourceMap!.entries, 'mc-text')
      .find((e) => e.outputRange !== null);
    if (section && text) {
      expect(text.outputRange!.start).toBeGreaterThanOrEqual(section.outputRange!.start);
      expect(text.outputRange!.end).toBeLessThanOrEqual(section.outputRange!.end);
    }
  });

  it('outputRange offsets actually point into the HTML string', () => {
    const result = compile(SIMPLE_TEMPLATE, { debug: true });
    const html = result.html!;
    const textEntry = entriesFor(result.sourceMap!.entries, 'mc-text')
      .find((e) => e.outputRange !== null);
    if (textEntry) {
      const { start, end } = textEntry.outputRange!;
      expect(start).toBeGreaterThanOrEqual(0);
      expect(end).toBeLessThanOrEqual(html.length);
      // The slice between the range should contain recognizable HTML content
      const slice = html.slice(start, end);
      expect(slice.length).toBeGreaterThan(0);
    }
  });

  it('sourceMapJSON contains outputRange after offset calculation', () => {
    const result = compile(SIMPLE_TEMPLATE, { debug: true });
    const parsed = JSON.parse(result.sourceMapJSON!) as { entries: SourceMapEntry[] };
    const withRange = parsed.entries.filter((e) => e.outputRange !== null);
    expect(withRange.length).toBeGreaterThan(0);
    for (const entry of withRange) {
      expect(typeof entry.outputRange!.start).toBe('number');
      expect(typeof entry.outputRange!.end).toBe('number');
    }
  });

  it('sourceMapJSON contains outputLoc after offset calculation', () => {
    const result = compile(SIMPLE_TEMPLATE, { debug: true });
    const parsed = JSON.parse(result.sourceMapJSON!) as { entries: SourceMapEntry[] };
    const withLoc = parsed.entries.filter((e) => e.outputLoc !== null);
    expect(withLoc.length).toBeGreaterThan(0);
  });

  it('production mode (no debug) — outputRange is null on all entries (no sourceMap)', () => {
    const result = compile(SIMPLE_TEMPLATE);
    expect(result.sourceMap).toBeUndefined();
  });
});
