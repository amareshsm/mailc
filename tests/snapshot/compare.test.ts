/**
 * MJML snapshot comparison tests.
 *
 * For each fixture, compiles with both mailc and MJML, normalizes output,
 * and structurally compares them. Differences must be documented in
 * the fixture's `deviations.json`.
 *
 * @module tests/snapshot/compare.test
 */
import { describe, it, expect } from 'vitest';
import mjml from 'mjml';
import { compile } from '../../src/compile.js';
import {
  getFixtures,
  readFixture,
  readDeviations,
  normalizeHtml,
  extractStructure,
  structuralDiff,
} from './helpers.js';
import type { Deviation } from './helpers.js';

// ---------------------------------------------------------------------------
// Auto-discover fixtures
// ---------------------------------------------------------------------------

const fixtures = getFixtures();

describe('MJML snapshot comparison', () => {
  it('discovers at least 6 fixtures', () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(6);
  });

  describe.each(fixtures)('fixture: %s', (fixture) => {
    const mcSource = readFixture(fixture, 'input.mc');
    const mjmlSource = readFixture(fixture, 'input.mjml');
    const deviations = readDeviations(fixture);

    /** Compile mailc and assert no errors. Returns the HTML string. */
    function compileMailc(): string {
      const result = compile(mcSource, { templateStyle: 'attribute' });
      expect(result.errors).toHaveLength(0);
      expect(result.html).not.toBeNull();
      return result.html as string;
    }

    /** Compile MJML and assert no errors. Returns the HTML string. */
    function compileMjml(): string {
      const result = mjml(mjmlSource, { validationLevel: 'soft' });
      expect(result.errors).toHaveLength(0);
      return result.html;
    }

    // -----------------------------------------------------------------------
    // Compile both
    // -----------------------------------------------------------------------

    it('compiles with mailc without errors', () => {
      const html = compileMailc();
      expect(html.length).toBeGreaterThan(0);
    });

    it('compiles with MJML without errors', () => {
      const html = compileMjml();
      expect(html.length).toBeGreaterThan(0);
    });

    // -----------------------------------------------------------------------
    // Structural equivalence checks
    // -----------------------------------------------------------------------

    it('both produce valid HTML documents', () => {
      const mailcHtml = compileMailc();
      const mjmlHtml = compileMjml();

      // Both should have DOCTYPE
      expect(mailcHtml).toMatch(/<!DOCTYPE/i);
      expect(mjmlHtml).toMatch(/<!DOCTYPE/i);

      // Both should have <html>, <head>, <body>
      expect(mailcHtml).toMatch(/<html/i);
      expect(mailcHtml).toMatch(/<head/i);
      expect(mailcHtml).toMatch(/<body/i);

      expect(mjmlHtml).toMatch(/<html/i);
      expect(mjmlHtml).toMatch(/<head/i);
      expect(mjmlHtml).toMatch(/<body/i);
    });

    it('preserves all visible text content', () => {
      const mailcHtml = compileMailc();
      const mjmlHtml = compileMjml();

      const mailcStructure = extractStructure(normalizeHtml(mailcHtml));
      const mjmlStructure = extractStructure(normalizeHtml(mjmlHtml));

      // Extract meaningful words (skip filler, metadata)
      const mailcWords = mailcStructure.textContent.filter(
        (w) => w.length > 2,
      );
      const mjmlWords = mjmlStructure.textContent.filter(
        (w) => w.length > 2,
      );

      // All significant text from the source should appear in both
      // (we check MJML words appear in mailc, since mailc is our target)
      for (const word of mjmlWords) {
        if (isSignificantWord(word)) {
          expect(mailcWords).toContain(word);
        }
      }
    });

    it('preserves all image sources', () => {
      const mailcHtml = compileMailc();
      const mjmlHtml = compileMjml();

      const mailcStructure = extractStructure(normalizeHtml(mailcHtml));
      const mjmlStructure = extractStructure(normalizeHtml(mjmlHtml));

      // Same images should appear (order may differ)
      expect(mailcStructure.imageSrcs.sort()).toEqual(
        mjmlStructure.imageSrcs.sort(),
      );
    });

    it('preserves all link hrefs', () => {
      const mailcHtml = compileMailc();
      const mjmlHtml = compileMjml();

      const mailcStructure = extractStructure(normalizeHtml(mailcHtml));
      const mjmlStructure = extractStructure(normalizeHtml(mjmlHtml));

      // Same links should appear (mailc may have extras from VML)
      for (const href of mjmlStructure.linkHrefs) {
        expect(mailcStructure.linkHrefs).toContain(href);
      }
    });

    it('both have responsive @media support', () => {
      const mailcHtml = compileMailc();
      const mjmlHtml = compileMjml();

      const mailcStructure = extractStructure(normalizeHtml(mailcHtml));
      const mjmlStructure = extractStructure(normalizeHtml(mjmlHtml));

      expect(mailcStructure.hasMediaQuery).toBe(true);
      expect(mjmlStructure.hasMediaQuery).toBe(true);
    });

    it('both have responsive rules inside @media', () => {
      const mailcHtml = compileMailc();
      const mjmlHtml = compileMjml();

      const mailcStructure = extractStructure(mailcHtml);
      const mjmlStructure = extractStructure(mjmlHtml);

      // Both should have at least 1 responsive rule in @media
      expect(mailcStructure.mediaQueryRuleCount).toBeGreaterThanOrEqual(1);
      expect(mjmlStructure.mediaQueryRuleCount).toBeGreaterThanOrEqual(1);
    });

    it('both use font-size:0 for whitespace collapse', () => {
      const mailcHtml = compileMailc();
      const mjmlHtml = compileMjml();

      const mailcStructure = extractStructure(mailcHtml);
      const mjmlStructure = extractStructure(mjmlHtml);

      expect(mailcStructure.hasFontSizeZero).toBe(true);
      expect(mjmlStructure.hasFontSizeZero).toBe(true);
    });

    it('both have Outlook conditional comments', () => {
      const mailcHtml = compileMailc();
      const mjmlHtml = compileMjml();

      // Don't normalize — we need comments intact
      const mailcStructure = extractStructure(mailcHtml);
      const mjmlStructure = extractStructure(mjmlHtml);

      expect(mailcStructure.hasOutlookConditionals).toBe(true);
      expect(mjmlStructure.hasOutlookConditionals).toBe(true);
    });

    it('both use fluid image CSS when images are present', () => {
      const mailcHtml = compileMailc();
      const mjmlHtml = compileMjml();
      const mailcStructure = extractStructure(mailcHtml);
      const mjmlStructure = extractStructure(mjmlHtml);

      // If there are images, both should use width:100% + max-width (fluid pattern)
      if (mailcStructure.imageSrcs.length > 0) {
        expect(mailcStructure.hasFluidImages).toBe(true);
      }
      if (mjmlStructure.imageSrcs.length > 0) {
        expect(mjmlStructure.hasFluidImages).toBe(true);
      }
    });

    it('columns have matching widths', () => {
      const mailcHtml = compileMailc();
      const mjmlHtml = compileMjml();

      const mailcStructure = extractStructure(mailcHtml);
      const mjmlStructure = extractStructure(mjmlHtml);

      // Column widths are the core layout signal — they MUST match.
      // If this fails, columns are rendering at wrong sizes.
      expect(mailcStructure.columnWidths).toEqual(mjmlStructure.columnWidths);
    });

    it('has documented deviations', () => {
      expect(deviations.length).toBeGreaterThan(0);
      // Each deviation must have required fields + status classification
      for (const dev of deviations) {
        expect(dev.description).toBeTruthy();
        expect(dev.reason).toBeTruthy();
        expect(dev.mjmlApproach).toBeTruthy();
        expect(dev.mailcApproach).toBeTruthy();
        // Status must be 'green' or 'neutral' — there is no 'red'.
        // If mailc is worse than MJML, fix the compiler, don't document it.
        expect(
          ['green', 'neutral'],
          `Deviation "${dev.description}" has invalid status "${dev.status}". ` +
          `Must be 'green' (mailc is better) or 'neutral' (extraction artifact).`,
        ).toContain(dev.status);
      }
    });

    it('mailc output is smaller than MJML output', () => {
      const mailcHtml = compileMailc();
      const mjmlHtml = compileMjml();

      // mailc should produce smaller output (one of our goals)
      expect(mailcHtml.length).toBeLessThan(mjmlHtml.length);
    });

    it('structural differences are within expected bounds', () => {
      const mailcHtml = compileMailc();
      const mjmlHtml = compileMjml();

      const mailcNorm = normalizeHtml(mailcHtml);
      const mjmlNorm = normalizeHtml(mjmlHtml);

      const mailcStructure = extractStructure(mailcNorm);
      const mjmlStructure = extractStructure(mjmlNorm);

      const diffs = structuralDiff(mailcStructure, mjmlStructure);

      // Every structural difference must be explained by at least one deviation.
      // This ensures we never silently accumulate unexplained diffs.
      for (const diff of diffs) {
        const diffPath = diff.path.toLowerCase();
        const diffDesc = diff.description.toLowerCase();

        const covered = deviations.some((dev: Deviation) => {
          const devDesc = dev.description.toLowerCase();
          // Match if the deviation mentions the diff path or key terms from it
          return devDesc.includes(diffPath) ||
            diffPath.split(/\s+/).every((word) => devDesc.includes(word)) ||
            diffDesc.includes(devDesc.slice(0, 30));
        });

        expect(
          covered,
          `Unexplained structural difference: "${diff.description}" (path: ${diff.path}). ` +
          `mailc=${diff.mailcValue}, mjml=${diff.mjmlValue}. ` +
          `Add a deviation to deviations.json that covers this.`,
        ).toBe(true);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Checks if a word is significant for text comparison.
 * Skips short articles, prepositions, etc.
 *
 * @param word - A single word.
 * @returns True if the word is meaningful for comparison.
 */
function isSignificantWord(word: string): boolean {
  const SKIP_WORDS = new Set([
    'the', 'and', 'for', 'are', 'was', 'you', 'has', 'have',
    'this', 'that', 'with', 'not', 'can', 'but', 'all',
  ]);
  return !SKIP_WORDS.has(word.toLowerCase());
}
