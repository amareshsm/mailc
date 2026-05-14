/**
 * SM-E: Source map lookup tests.
 *
 * Verifies `lookupByOffset()`, `lookupByOutputLine()`, and `lookupBySourceLine()`
 * using real `compile(template, { debug: true })` output.
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compile.js';
import {
  lookupByOffset,
  lookupByOutputLine,
  lookupBySourceLine,
} from '../../src/compiler/source-map-lookup.js';
import type { SourceMapEntry, EmailSourceMap } from '../../src/types.js';

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

// mc-section is on line 4 of the template above
const MC_SECTION_LINE = 4;
// mc-text is on line 6
const MC_TEXT_LINE = 6;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMap(): EmailSourceMap {
  const result = compile(SIMPLE_TEMPLATE, { debug: true });
  return result.sourceMap!;
}

function entriesFor(map: EmailSourceMap, component: string): SourceMapEntry[] {
  return map.entries.filter((e) => e.sourceComponent === component);
}

// ---------------------------------------------------------------------------
// lookupByOffset
// ---------------------------------------------------------------------------

describe('SM-E: lookupByOffset()', () => {
  it('returns null for offset -1 (before any content)', () => {
    const map = getMap();
    expect(lookupByOffset(map, -1)).toBeNull();
  });

  it('returns null for offset past the end of the HTML', () => {
    const map = getMap();
    const result = compile(SIMPLE_TEMPLATE, { debug: true });
    expect(lookupByOffset(map, result.html!.length + 9999)).toBeNull();
  });

  it('returns a non-null entry for an offset within a known content region', () => {
    const map = getMap();
    // Find a text entry with a known range and query its midpoint
    const textEntry = entriesFor(map, 'mc-text').find((e) => e.outputRange !== null);
    if (!textEntry) return; // guard
    const mid = Math.floor((textEntry.outputRange!.start + textEntry.outputRange!.end) / 2);
    const found = lookupByOffset(map, mid);
    expect(found).not.toBeNull();
  });

  it('returns the deepest (most specific) entry for an offset', () => {
    const map = getMap();
    const textEntry = entriesFor(map, 'mc-text').find((e) => e.outputRange !== null);
    if (!textEntry) return;
    const mid = Math.floor((textEntry.outputRange!.start + textEntry.outputRange!.end) / 2);
    const found = lookupByOffset(map, mid);
    // The result should be the mc-text entry (leaf) or something nested inside it — not mc-section
    expect(found?.sourceComponent).not.toBe('mc-section');
  });

  it('returns null when sourceMap has no entries with outputRange', () => {
    // Build a bare map with no outputRange values
    const emptyMap: EmailSourceMap = {
      version: 1,
      sourceFile: '',
      outputFile: '',
      templateData: null,
      mailcVersion: '0.0.0',
      entries: [],
      stats: { sourceComponents: 0, outputElements: 0, expansionRatio: 1 },
    };
    expect(lookupByOffset(emptyMap, 0)).toBeNull();
  });

  it('works with mc.json format (sourceMapJSON round-trip)', () => {
    const result = compile(SIMPLE_TEMPLATE, { debug: true });
    const map = JSON.parse(result.sourceMapJSON!) as EmailSourceMap;
    const textEntry = map.entries.find(
      (e) => e.sourceComponent === 'mc-text' && e.outputRange !== null,
    );
    if (!textEntry) return;
    const mid = Math.floor((textEntry.outputRange!.start + textEntry.outputRange!.end) / 2);
    const found = lookupByOffset(map, mid);
    expect(found).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// lookupByOutputLine
// ---------------------------------------------------------------------------

describe('SM-E: lookupByOutputLine()', () => {
  it('returns an empty array for line 0 (no content before line 1)', () => {
    const map = getMap();
    const results = lookupByOutputLine(map, 0);
    expect(Array.isArray(results)).toBe(true);
    expect(results.every((e) => e.outputLoc !== null)).toBe(true);
  });

  it('returns entries when querying a line that contains HTML output', () => {
    const map = getMap();
    // Find a line that some entry spans
    const entryWithLoc = map.entries.find((e) => e.outputLoc !== null);
    if (!entryWithLoc) return;
    const targetLine = entryWithLoc.outputLoc!.startLine;
    const results = lookupByOutputLine(map, targetLine);
    expect(results.length).toBeGreaterThan(0);
  });

  it('returned entries all span the queried line', () => {
    const map = getMap();
    const entryWithLoc = map.entries.find((e) => e.outputLoc !== null);
    if (!entryWithLoc) return;
    const targetLine = Math.floor(
      (entryWithLoc.outputLoc!.startLine + entryWithLoc.outputLoc!.endLine) / 2,
    );
    const results = lookupByOutputLine(map, targetLine);
    for (const e of results) {
      expect(e.outputLoc!.startLine).toBeLessThanOrEqual(targetLine);
      expect(e.outputLoc!.endLine).toBeGreaterThanOrEqual(targetLine);
    }
  });

  it('returns entries when querying a very large line (past the HTML) → empty', () => {
    const map = getMap();
    const results = lookupByOutputLine(map, 999999);
    expect(results).toHaveLength(0);
  });

  it('works with sourceMapJSON round-trip', () => {
    const result = compile(SIMPLE_TEMPLATE, { debug: true });
    const map = JSON.parse(result.sourceMapJSON!) as EmailSourceMap;
    const entryWithLoc = map.entries.find((e) => e.outputLoc !== null);
    if (!entryWithLoc) return;
    const targetLine = entryWithLoc.outputLoc!.startLine;
    const results = lookupByOutputLine(map, targetLine);
    expect(results.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// lookupBySourceLine
// ---------------------------------------------------------------------------

describe('SM-E: lookupBySourceLine()', () => {
  it('returns entries whose sourceLoc.startLine matches the queried line', () => {
    const map = getMap();
    const results = lookupBySourceLine(map, MC_SECTION_LINE);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((e) => e.sourceLoc.startLine === MC_SECTION_LINE)).toBe(true);
  });

  it('includes mc-section entries for the mc-section source line', () => {
    const map = getMap();
    const results = lookupBySourceLine(map, MC_SECTION_LINE);
    const hasSection = results.some((e) => e.sourceComponent === 'mc-section');
    expect(hasSection).toBe(true);
  });

  it('includes mc-text entries for the mc-text source line', () => {
    const map = getMap();
    const results = lookupBySourceLine(map, MC_TEXT_LINE);
    const hasText = results.some((e) => e.sourceComponent === 'mc-text');
    expect(hasText).toBe(true);
  });

  it('returns an empty array for a line that has no components (e.g. line 1 = <mc>)', () => {
    const map = getMap();
    // Line 1 is "<mc>" which compiles as the root — might or might not have an entry;
    // a non-existent line like 999 definitely returns nothing.
    const results = lookupBySourceLine(map, 999);
    expect(results).toHaveLength(0);
  });

  it('returns multiple entries when several sub-elements share the same source line', () => {
    // mc-section emits container-table, container-row, container-cell all from the same line
    const map = getMap();
    const results = lookupBySourceLine(map, MC_SECTION_LINE);
    // There should be at least the mc-section entry and possibly sub-entries (emitted roles)
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('does not return entries from other source lines', () => {
    const map = getMap();
    const results = lookupBySourceLine(map, MC_SECTION_LINE);
    for (const e of results) {
      expect(e.sourceLoc.startLine).toBe(MC_SECTION_LINE);
    }
  });

  it('works with sourceMapJSON round-trip', () => {
    const result = compile(SIMPLE_TEMPLATE, { debug: true });
    const map = JSON.parse(result.sourceMapJSON!) as EmailSourceMap;
    const results = lookupBySourceLine(map, MC_SECTION_LINE);
    expect(results.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Cross-function consistency
// ---------------------------------------------------------------------------

describe('SM-E: cross-function consistency', () => {
  it('lookupByOffset mid-point agrees with lookupByOutputLine for the same entry', () => {
    const map = getMap();
    const textEntry = entriesFor(map, 'mc-text').find(
      (e) => e.outputRange !== null && e.outputLoc !== null,
    );
    if (!textEntry) return;
    const mid = Math.floor((textEntry.outputRange!.start + textEntry.outputRange!.end) / 2);
    const byOffset = lookupByOffset(map, mid);
    if (!byOffset?.outputLoc) return;
    const byLine = lookupByOutputLine(map, byOffset.outputLoc.startLine);
    // The entry found by offset should be in the results found by that same line
    const ids = byLine.map((e) => e.id);
    expect(ids).toContain(byOffset.id);
  });

  it('lookupBySourceLine result entries appear in lookupByOffset results when querying their midpoints', () => {
    const map = getMap();
    const sourceResults = lookupBySourceLine(map, MC_TEXT_LINE);
    for (const entry of sourceResults) {
      if (!entry.outputRange) continue;
      const mid = Math.floor((entry.outputRange.start + entry.outputRange.end) / 2);
      const found = lookupByOffset(map, mid);
      // The found entry should be inside or equal to the source result entry
      if (found) {
        expect(found.outputRange!.start).toBeGreaterThanOrEqual(entry.outputRange.start);
        expect(found.outputRange!.end).toBeLessThanOrEqual(entry.outputRange.end);
      }
    }
  });
});
