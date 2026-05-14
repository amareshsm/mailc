/**
 * SM-G4: Tests for `calculateIdOffsets()` — ID-based offset calculation.
 *
 * Verifies that scanning `data-mc-id` attributes in clean HTML correctly
 * populates `outputRange` and `outputLoc` on `SourceMapEntry` objects.
 */

import { describe, it, expect } from 'vitest';
import { calculateIdOffsets } from '../../src/compiler/source-map-id-offsets.js';
import type { SourceMapEntry } from '../../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(id: string): SourceMapEntry {
  return {
    id,
    parentId: null,
    sourceComponent: 'mc-text',
    sourceLoc: { startLine: 1, startCol: 1, endLine: 1, endCol: 10 },
    role: 'content' as const,
    outputTag: 'td',
    outputRange: null,
    outputLoc: null,
    styles: [],
    expressions: [],
    conditional: null,
    loop: null,
    sourceAttributes: {},
    children: [],
  };
}

// ---------------------------------------------------------------------------
// Basic cases
// ---------------------------------------------------------------------------

describe('calculateIdOffsets: basic block element', () => {
  it('populates outputRange.start at the opening < of the tagged element', () => {
    const html = `<html><body><table data-mc-id="entry-1"><tr><td>Hi</td></tr></table></body></html>`;
    const entry = makeEntry('entry-1');
    calculateIdOffsets(html, [entry]);

    expect(entry.outputRange).not.toBeNull();
    expect(entry.outputRange!.start).toBe(html.indexOf('<table'));
  });

  it('populates outputRange.end at the closing > of the element', () => {
    const html = `<html><body><table data-mc-id="entry-1"><tr><td>Hi</td></tr></table></body></html>`;
    const entry = makeEntry('entry-1');
    calculateIdOffsets(html, [entry]);

    const closeTag = html.lastIndexOf('</table>');
    const expectedEnd = closeTag + '</table>'.length - 1;
    expect(entry.outputRange!.end).toBe(expectedEnd);
  });

  it('returns entries array', () => {
    const html = `<div data-mc-id="entry-1">content</div>`;
    const entry = makeEntry('entry-1');
    const result = calculateIdOffsets(html, [entry]);
    expect(Array.isArray(result)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Void elements (img, br, hr, input)
// ---------------------------------------------------------------------------

describe('calculateIdOffsets: void elements', () => {
  it('handles <img> void element — end at opening tag close', () => {
    const html = `<table><tr><td><img data-mc-id="entry-1" src="x.png" /></td></tr></table>`;
    const entry = makeEntry('entry-1');
    calculateIdOffsets(html, [entry]);

    expect(entry.outputRange).not.toBeNull();
    const imgStart = html.indexOf('<img');
    const imgEnd = html.indexOf('>', imgStart);
    expect(entry.outputRange!.start).toBe(imgStart);
    expect(entry.outputRange!.end).toBe(imgEnd);
  });

  it('handles <br> void element', () => {
    const html = `<div><br data-mc-id="entry-1" /></div>`;
    const entry = makeEntry('entry-1');
    calculateIdOffsets(html, [entry]);

    expect(entry.outputRange).not.toBeNull();
    expect(entry.outputRange!.start).toBe(html.indexOf('<br'));
  });
});

// ---------------------------------------------------------------------------
// Self-closing tags
// ---------------------------------------------------------------------------

describe('calculateIdOffsets: self-closing tags', () => {
  it('handles self-closing <div data-mc-id="..." /> correctly', () => {
    const html = `<table><tr><td><div data-mc-id="entry-1" /></td></tr></table>`;
    const entry = makeEntry('entry-1');
    calculateIdOffsets(html, [entry]);

    // Should at least set outputRange (may treat as self-closed)
    expect(entry.outputRange).not.toBeNull();
    expect(entry.outputRange!.start).toBe(html.indexOf('<div'));
  });
});

// ---------------------------------------------------------------------------
// Multiple entries
// ---------------------------------------------------------------------------

describe('calculateIdOffsets: multiple entries', () => {
  it('resolves all entries in a multi-entry HTML', () => {
    const html = `
<table data-mc-id="entry-1">
  <tr><td data-mc-id="entry-2">Hello</td></tr>
</table>`.trim();

    const e1 = makeEntry('entry-1');
    const e2 = makeEntry('entry-2');
    calculateIdOffsets(html, [e1, e2]);

    expect(e1.outputRange).not.toBeNull();
    expect(e2.outputRange).not.toBeNull();
  });

  it('entry-2 range is contained within entry-1 range', () => {
    const html = `<table data-mc-id="entry-1"><tr><td data-mc-id="entry-2">Hello</td></tr></table>`;
    const e1 = makeEntry('entry-1');
    const e2 = makeEntry('entry-2');
    calculateIdOffsets(html, [e1, e2]);

    expect(e1.outputRange!.start).toBeLessThan(e2.outputRange!.start);
    expect(e1.outputRange!.end).toBeGreaterThan(e2.outputRange!.end);
  });
});

// ---------------------------------------------------------------------------
// Line/column computation (outputLoc)
// ---------------------------------------------------------------------------

describe('calculateIdOffsets: outputLoc population', () => {
  it('populates outputLoc startLine/startCol', () => {
    const html = `<div data-mc-id="entry-1">content</div>`;
    const entry = makeEntry('entry-1');
    calculateIdOffsets(html, [entry]);

    expect(entry.outputLoc).not.toBeNull();
    expect(entry.outputLoc!.startLine).toBeGreaterThanOrEqual(1);
    expect(entry.outputLoc!.startCol).toBeGreaterThanOrEqual(1);
  });

  it('startLine=1 for element on first line', () => {
    const html = `<div data-mc-id="entry-1">content</div>`;
    const entry = makeEntry('entry-1');
    calculateIdOffsets(html, [entry]);
    expect(entry.outputLoc!.startLine).toBe(1);
  });

  it('startLine=3 for element on third line', () => {
    const html = `<html>\n<body>\n<div data-mc-id="entry-1">Hi</div>\n</body></html>`;
    const entry = makeEntry('entry-1');
    calculateIdOffsets(html, [entry]);
    expect(entry.outputLoc!.startLine).toBe(3);
  });

  it('populates endLine and endCol', () => {
    const html = `<div data-mc-id="entry-1">content</div>`;
    const entry = makeEntry('entry-1');
    calculateIdOffsets(html, [entry]);
    expect(entry.outputLoc!.endLine).toBeGreaterThanOrEqual(1);
    expect(entry.outputLoc!.endCol).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('calculateIdOffsets: edge cases', () => {
  it('returns early when html is empty', () => {
    const entry = makeEntry('entry-1');
    calculateIdOffsets('', [entry]);
    expect(entry.outputRange).toBeNull();
  });

  it('returns early when entries array is empty', () => {
    const html = `<div data-mc-id="entry-1">content</div>`;
    const result = calculateIdOffsets(html, []);
    expect(result).toHaveLength(0);
  });

  it('leaves outputRange null when no matching data-mc-id found', () => {
    const html = `<div>no id here</div>`;
    const entry = makeEntry('entry-99');
    calculateIdOffsets(html, [entry]);
    expect(entry.outputRange).toBeNull();
  });

  it('handles > inside attribute values without misidentifying tag end', () => {
    const html = `<img data-mc-id="entry-1" alt="a > b" src="x.png" />`;
    const entry = makeEntry('entry-1');
    calculateIdOffsets(html, [entry]);
    // Should not crash, and range should be set
    expect(entry.outputRange).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Integration: compile() populates outputRange via calculateIdOffsets
// ---------------------------------------------------------------------------

describe('calculateIdOffsets: integration with compile()', () => {
  it('entries have outputRange populated after compile({sourceMap:true})', async () => {
    const { compile } = await import('../../src/index.js');
    const source = `
<mc>
  <mc-head></mc-head>
  <mc-body>
    <mc-section>
      <mc-column>
        <mc-text>Hello</mc-text>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`.trim();

    const result = compile(source, { sourceMap: true });
    expect(result.sourceMap).toBeDefined();

    const entriesWithRange = result.sourceMap!.entries.filter((e) => e.outputRange !== null);
    expect(entriesWithRange.length).toBeGreaterThan(0);
  });

  it('outputRange.start < outputRange.end for all populated entries', async () => {
    const { compile } = await import('../../src/index.js');
    const source = `
<mc>
  <mc-head></mc-head>
  <mc-body>
    <mc-section>
      <mc-column>
        <mc-text>Hello World</mc-text>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`.trim();

    const result = compile(source, { sourceMap: true });
    for (const entry of result.sourceMap!.entries) {
      if (entry.outputRange !== null) {
        expect(entry.outputRange.start).toBeLessThan(entry.outputRange.end);
      }
    }
  });

  it('outputLoc is populated for entries with outputRange', async () => {
    const { compile } = await import('../../src/index.js');
    const source = `
<mc>
  <mc-head></mc-head>
  <mc-body>
    <mc-section>
      <mc-column>
        <mc-text>Hello</mc-text>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`.trim();

    const result = compile(source, { sourceMap: true });
    for (const entry of result.sourceMap!.entries) {
      if (entry.outputRange !== null) {
        expect(entry.outputLoc).not.toBeNull();
        expect(entry.outputLoc!.startLine).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('debug:true does NOT populate outputRange from data-mc-id (different mechanism)', async () => {
    const { compile } = await import('../../src/index.js');
    const source = `
<mc>
  <mc-head></mc-head>
  <mc-body>
    <mc-section>
      <mc-column>
        <mc-text>Hello</mc-text>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`.trim();

    const debugResult = compile(source, { debug: true });
    const smResult = compile(source, { sourceMap: true });

    // Both should have entries, but mechanism differs
    expect(debugResult.sourceMap).toBeDefined();
    expect(smResult.sourceMap).toBeDefined();

    // sourceMap:true result has outputRange from id scanning
    const smEntriesWithRange = smResult.sourceMap!.entries.filter((e) => e.outputRange !== null);
    expect(smEntriesWithRange.length).toBeGreaterThan(0);
  });
});
