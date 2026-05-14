/**
 * SM-G1: `data-mc-id` attribute injector.
 *
 * Injects a `data-mc-id` attribute onto the root output element of a
 * component compiler's HTML string at the moment of emission — no
 * post-processing scan required.
 *
 * Browser-safe: zero `node:*` imports — pure string manipulation.
 *
 * @module compiler/data-id-injector
 */

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Injects a `data-mc-id` attribute onto the first opening HTML element tag
 * in the given string.
 *
 * Finds the first `<tagName` sequence (skipping `<!--` comments, `<!DOCTYPE`,
 * and `<?` processing instructions), then scans for the tag's closing `>`
 * while respecting double- and single-quoted attribute values to avoid false
 * positives. Inserts ` data-mc-id="<id>"` immediately before `>` or `/>`.
 *
 * Edge cases handled:
 * - Self-closing void elements: `<img ... />` → inserts before `/ >`
 * - Multi-line opening tags
 * - Already has `data-mc-id` — returns the string unchanged (no duplicate)
 * - No opening tag found — returns unchanged
 * - Empty string or empty id — returns unchanged
 *
 * @param html - The HTML string returned by a component compiler.
 * @param id   - The source map entry ID, e.g. `"entry-3"`.
 * @returns The HTML string with `data-mc-id` injected on the first element.
 */
export function injectDataId(html: string, id: string): string {
  if (!html || !id) return html;

  // Already tagged — no-op to prevent duplicates
  if (html.includes(`data-mc-id="${id}"`)) return html;

  // Find the first `<` that opens a real element tag.
  // Skip: `<!--...-->` comments (including MSO conditionals like
  // `<!--[if mso | IE]><td ...><![endif]-->` which contain real tags
  // that are not in the browser DOM), `<!` declarations, `<?` instructions.
  let tagStart = -1;
  for (let i = 0; i < html.length; i++) {
    if (html[i] !== '<') continue;

    // Skip entire HTML/MSO comments: <!-- ... -->
    // Must check for '--' to distinguish from <!DOCTYPE and other <!.
    if (html[i + 1] === '!' && html[i + 2] === '-' && html[i + 3] === '-') {
      const end = html.indexOf('-->', i + 4);
      if (end !== -1) {
        i = end + 2; // advance past '-->'
      }
      continue;
    }

    const next = html[i + 1];
    if (next !== undefined && next !== '!' && next !== '?') {
      tagStart = i;
      break;
    }
  }

  if (tagStart === -1) return html;

  // Scan forward from after `<tagName` to find the closing `>`,
  // skipping over quoted attribute values.
  let inQuote: '"' | "'" | null = null;
  for (let i = tagStart + 1; i < html.length; i++) {
    const ch = html[i] as string;

    if (inQuote) {
      if (ch === inQuote) inQuote = null;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inQuote = ch as '"' | "'";
      continue;
    }

    if (ch === '>') {
      if (html[i - 1] === '/') {
        // Self-closing element (e.g. `<img ... />`).
        // Walk back past the `/` and any preceding whitespace to find the
        // clean insertion point. Then rebuild as `... data-mc-id="id" />`.
        let insertAt = i - 1; // position of the `/`
        while (insertAt > tagStart && html[insertAt - 1] === ' ') {
          insertAt--;
        }
        return (
          html.slice(0, insertAt) +
          ` data-mc-id="${id}" />` +
          html.slice(i + 1)
        );
      }
      // Regular closing `>` — insert the attribute immediately before it.
      return html.slice(0, i) + ` data-mc-id="${id}"` + html.slice(i);
    }
  }

  // No closing `>` found — return unchanged
  return html;
}
