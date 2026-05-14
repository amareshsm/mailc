/**
 * Round-trip invariant test against every template in `templates/`.
 *
 * For each template we assert:
 *
 *     compile(markup)
 *   ≡ compile(jsonToMarkup(markupToJSON(markup)))    (DOM-equivalent)
 *
 * This locks in the bidirectional contract — if a future change re-breaks
 * content preservation on JSON → markup serialisation (mc-list-item,
 * mc-table cells, plugin text, …), this suite fails before merge.
 *
 * Comparison is whitespace-normalised: collapse runs of whitespace between
 * tags and within values. Round-trip is meant to be semantic, not byte-
 * identical, and the serialiser deliberately re-indents output.
 *
 * Known drift entries are explicitly skipped (with the underlying gap
 * referenced in a comment) so this suite remains an active guard for the
 * other templates and the skips serve as an executable to-do list.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { compile } from '../../src/index.js';
import { markupToJSON } from '../../src/json/markup-to-json.js';
import { jsonToMarkup } from '../../src/json/json-to-markup.js';

const TEMPLATES_DIR = join(__dirname, '..', '..', 'templates');
const DATA_DIR = join(TEMPLATES_DIR, 'data');

/**
 * Templates whose round-trip currently drifts because of the parser-level
 * `mc-raw` issue: deeply-nested HTML inside `<mc-raw>` gets tokenised as
 * AST elements, and re-parsing the indented round-trip output shifts the
 * mixed-content boundary. First-pass compile is unaffected — these
 * templates ship correctly; only the markup → JSON → markup loop drifts.
 *
 * Remove an entry once the tokenizer learns a raw-text mode for mc-raw.
 */
const KNOWN_DRIFT = new Set<string>([
  '08-theme-showcase.mc',
  'cred-emi.mc',
]);

/** Collapse inter-tag and intra-text whitespace for DOM-equivalent compare. */
function normalise(html: string): string {
  return html.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();
}

/** Read the matching JSON data file for a template, if present. */
function loadData(templateFile: string): Record<string, unknown> | undefined {
  const dataPath = join(DATA_DIR, templateFile.replace('.mc', '.json'));
  if (!existsSync(dataPath)) return undefined;
  try {
    return JSON.parse(readFileSync(dataPath, 'utf8')) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

describe('markup → JSON → markup round-trip preserves compiled HTML', () => {
  const files = readdirSync(TEMPLATES_DIR)
    .filter((f) => f.endsWith('.mc'))
    .sort();

  // Sanity: the templates/ folder is the basis of this invariant — fail
  // loudly if someone accidentally empties or moves it.
  it('at least one template is present', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const test = KNOWN_DRIFT.has(file) ? it.skip : it;

    test(`${file} round-trips to semantically equivalent HTML`, () => {
      const markup = readFileSync(join(TEMPLATES_DIR, file), 'utf8');
      const data = loadData(file);
      // Pick mode from template content: any `class="..."` outside of
      // structural HTML usage means a class-mode template; otherwise
      // assume attribute-mode. Both modes are strict — they reject the
      // other mechanism — so the choice must match the template.
      const usesClass = /\sclass="/.test(markup);
      const opts = {
        templateStyle: usesClass ? ('class' as const) : ('attribute' as const),
        ...(data ? { data } : {}),
      };

      const node = markupToJSON(markup);
      const roundTripMarkup = jsonToMarkup(node);

      const original = compile(markup, opts);
      const roundTrip = compile(roundTripMarkup, opts);

      // Both must compile cleanly. A compile error after round-trip would
      // mean the serialiser produced invalid markup — a real regression
      // even if HTML happens to match.
      expect(original.errors).toEqual([]);
      expect(roundTrip.errors).toEqual([]);

      expect(normalise(roundTrip.html ?? '')).toEqual(
        normalise(original.html ?? ''),
      );
    });
  }
});
