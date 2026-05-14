/**
 * SM-B: Source map integration tests.
 *
 * Verifies that `compile(source, { debug: true })` attaches a valid
 * EmailSourceMap to `result.sourceMap` and a valid JSON string to
 * `result.sourceMapJSON`.
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
      <mc-text>Hello world</mc-text>
    </mc-column>
  </mc-section>
</mc-body>
</mc>`;

const TWO_SECTIONS = `<mc>
<mc-head>
  <mc-title>Two sections</mc-title>
</mc-head>
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
// Tests
// ---------------------------------------------------------------------------

describe('SM-B: Source map integration', () => {
  describe('result.sourceMap', () => {
    it('is present when debug: true', () => {
      const result = compile(SIMPLE_TEMPLATE, { debug: true });
      expect(result.sourceMap).toBeDefined();
    });

    it('is undefined when debug: false (default)', () => {
      const result = compile(SIMPLE_TEMPLATE);
      expect(result.sourceMap).toBeUndefined();
    });

    it('has version: 1', () => {
      const result = compile(SIMPLE_TEMPLATE, { debug: true });
      expect(result.sourceMap!.version).toBe(1);
    });

    it('contains entries array', () => {
      const result = compile(SIMPLE_TEMPLATE, { debug: true });
      expect(Array.isArray(result.sourceMap!.entries)).toBe(true);
    });

    it('entries is non-empty for a template with components', () => {
      const result = compile(SIMPLE_TEMPLATE, { debug: true });
      expect(result.sourceMap!.entries.length).toBeGreaterThan(0);
    });

    it('has an entry for mc-section', () => {
      const result = compile(SIMPLE_TEMPLATE, { debug: true });
      const entry = result.sourceMap!.entries.find(
        (e) => e.sourceComponent === 'mc-section',
      );
      expect(entry).toBeDefined();
    });

    it('has an entry for mc-column', () => {
      const result = compile(SIMPLE_TEMPLATE, { debug: true });
      const entry = result.sourceMap!.entries.find(
        (e) => e.sourceComponent === 'mc-column',
      );
      expect(entry).toBeDefined();
    });

    it('has an entry for mc-text', () => {
      const result = compile(SIMPLE_TEMPLATE, { debug: true });
      const entry = result.sourceMap!.entries.find(
        (e) => e.sourceComponent === 'mc-text',
      );
      expect(entry).toBeDefined();
    });

    it('mc-section entry has correct startLine', () => {
      const result = compile(SIMPLE_TEMPLATE, { debug: true });
      const entry = result.sourceMap!.entries.find(
        (e) => e.sourceComponent === 'mc-section',
      );
      // mc-section is on line 6 in SIMPLE_TEMPLATE
      expect(entry?.sourceLoc.startLine).toBe(6);
    });

    it('stats.sourceComponents > 0', () => {
      const result = compile(SIMPLE_TEMPLATE, { debug: true });
      expect(result.sourceMap!.stats.sourceComponents).toBeGreaterThan(0);
    });

    it('stats.expansionRatio > 1 (output is always larger than source)', () => {
      const result = compile(SIMPLE_TEMPLATE, { debug: true });
      expect(result.sourceMap!.stats.expansionRatio).toBeGreaterThan(1);
    });

    it('two sections → two mc-section entries', () => {
      const result = compile(TWO_SECTIONS, { debug: true });
      const sections = result.sourceMap!.entries.filter(
        (e) => e.sourceComponent === 'mc-section',
      );
      expect(sections).toHaveLength(2);
    });

    it('entry IDs are unique across the map', () => {
      const result = compile(TWO_SECTIONS, { debug: true });
      const ids = result.sourceMap!.entries.map((e) => e.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it('each entry has a non-empty id', () => {
      const result = compile(SIMPLE_TEMPLATE, { debug: true });
      for (const entry of result.sourceMap!.entries) {
        expect(entry.id).toBeTruthy();
      }
    });
  });

  describe('result.sourceMapJSON', () => {
    it('is a string when debug: true', () => {
      const result = compile(SIMPLE_TEMPLATE, { debug: true });
      expect(typeof result.sourceMapJSON).toBe('string');
    });

    it('is valid JSON that round-trips', () => {
      const result = compile(SIMPLE_TEMPLATE, { debug: true });
      expect(() => JSON.parse(result.sourceMapJSON!)).not.toThrow();
      const parsed = JSON.parse(result.sourceMapJSON!) as { version: number };
      expect(parsed.version).toBe(1);
    });

    it('is undefined when debug: false', () => {
      const result = compile(SIMPLE_TEMPLATE);
      expect(result.sourceMapJSON).toBeUndefined();
    });
  });

  describe('no regressions', () => {
    it('compile without debug still produces valid HTML', () => {
      const result = compile(SIMPLE_TEMPLATE);
      expect(result.html).toBeTruthy();
      expect(result.errors).toHaveLength(0);
    });

    it('compile with debug still produces valid HTML', () => {
      const result = compile(SIMPLE_TEMPLATE, { debug: true });
      expect(result.html).toBeTruthy();
      expect(result.errors).toHaveLength(0);
    });

    it('debug mode HTML contains expected email structure', () => {
      const result = compile(SIMPLE_TEMPLATE, { debug: true });
      expect(result.html).toContain('<table');
      expect(result.html).toContain('Hello world');
    });
  });
});
