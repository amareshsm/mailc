/**
 * html-lines — utilities for working with compiled email HTML that may contain
 * `mc:source` debug marker comments injected by the mailc compiler.
 *
 * Marker format (injected when `debug: true` / `sourceMap: true`):
 *   <!-- mc:source component="mc-section" line="7" col="1" id="entry-2" -->
 *   <!-- mc:/mc-section id="entry-2" -->
 *
 * IMPORTANT: Markers are NOT always on their own dedicated lines. The compiler
 * emits them inline with real HTML content. For example, a single line may look
 * like:
 *   "<!-- mc:/mc-text id="entry-4" --></td></tr></table></div>"
 *
 * Therefore `stripMarkers` must replace marker text in-place (not filter lines),
 * and `isMarkerLine` must check whether a line is PURELY a marker (after
 * stripping marker comment text, nothing real remains).
 *
 * @module lib/html-lines
 */

/** In-place replacement regex — removes mc:source/mc:/ comment text only. */
const MC_STRIP_RE = /<!-- mc:[^]*?-->/g

/**
 * Returns true if the line is ONLY a compiler-injected marker comment — i.e.
 * after removing the marker text, there is no remaining real HTML content.
 * Lines that have both a marker AND real HTML (e.g. `<!-- mc:/... --></td>`)
 * return false so the real content is preserved.
 *
 * @param line - A single line of compiled HTML.
 */
export function isMarkerLine(line: string): boolean {
  return line.replace(MC_STRIP_RE, '').trim() === ''
}

/**
 * Strips all mc:source and mc:/ comment text from an HTML string in-place,
 * returning clean HTML suitable for copying or iframe rendering.
 *
 * This does NOT remove entire lines — only the comment tokens themselves —
 * because markers can share a line with real structural HTML.
 *
 * @param html - Compiled HTML that may contain marker comments.
 * @returns HTML with all marker comment tokens removed (but lines preserved).
 */
export function stripMarkers(html: string): string {
  return html.replace(MC_STRIP_RE, '')
}

/**
 * Counts non-pure-marker lines in a compiled HTML string.
 * Useful for reporting "N lines" in the HTML panel header.
 *
 * @param html - Compiled HTML that may contain marker comments.
 */
export function countVisibleLines(html: string): number {
  return html.split('\n').filter((l) => !isMarkerLine(l)).length
}

/**
 * Splits HTML into lines and returns a typed array that tracks whether each
 * line is a pure marker or real content. The `lineNum` is always the 1-based
 * index in the original string — markers don't shift real line numbers.
 */
export interface HtmlLine {
  /** 1-based line number in the original compiled HTML string. */
  lineNum: number
  /** Raw text of the line. */
  text: string
  /**
   * True only if this line is ENTIRELY a mc:source/mc:/ debug marker comment
   * with no other real HTML content. Lines that mix a marker with real HTML
   * (e.g. `<!-- mc:/... --></td>`) have isMarker=false.
   */
  isMarker: boolean
}

/**
 * Parses compiled HTML into typed line objects.
 *
 * @param html - Compiled HTML (with or without markers).
 * @returns Array of HtmlLine objects, one per line.
 */
export function parseHtmlLines(html: string): HtmlLine[] {
  return html.split('\n').map((text, i) => ({
    lineNum: i + 1,
    text,
    isMarker: isMarkerLine(text),
  }))
}
