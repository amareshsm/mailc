/**
 * Snapshot test helpers — file I/O, HTML normalization, and re-exports.
 *
 * Uses htmlparser2 for proper DOM-based HTML normalization instead of
 * fragile regex patterns. htmlparser2 is a devDependency (~30KB,
 * well-maintained, browser-safe) — far cheaper to maintain than custom
 * regex-based HTML parsing.
 *
 * @module tests/snapshot/helpers
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseDocument, DomUtils } from 'htmlparser2';
import type { ChildNode, Element } from 'domhandler';

// Re-export structural comparison utilities
export {
  extractStructure,
  structuralDiff,
} from './structure.js';
export type {
  StructuralData,
  Difference,
} from './structure.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Root directory for snapshot fixtures. */
export const FIXTURES_DIR = resolve(__dirname, 'fixtures');

// ---------------------------------------------------------------------------
// File I/O
// ---------------------------------------------------------------------------

/**
 * Reads a fixture file as a UTF-8 string.
 *
 * @param fixture  - Fixture directory name (e.g. "basic-layout").
 * @param filename - File within the fixture (e.g. "input.mc").
 * @returns The file contents.
 */
export function readFixture(fixture: string, filename: string): string {
  const filePath = join(FIXTURES_DIR, fixture, filename);
  return readFileSync(filePath, 'utf-8');
}

/**
 * Auto-discovers all fixture directories.
 *
 * A valid fixture has at least `input.mc` and `input.mjml`.
 *
 * @returns Array of fixture directory names.
 */
export function getFixtures(): string[] {
  if (!existsSync(FIXTURES_DIR)) return [];
  return readdirSync(FIXTURES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .filter((d) => {
      const dir = join(FIXTURES_DIR, d.name);
      return existsSync(join(dir, 'input.mc')) && existsSync(join(dir, 'input.mjml'));
    })
    .map((d) => d.name);
}

/** A documented deviation between mailc and MJML output. */
export interface Deviation {
  /** Human-readable description of the difference. */
  description: string;
  /** Why we deviate — must be a specific technical reason, not a vague guess. */
  reason: string;
  /** What MJML does differently and the technical rationale behind it. */
  mjmlApproach: string;
  /** What mailc does instead and why. */
  mailcApproach: string;
  /**
   * Classification of this deviation:
   * - `"green"` — mailc's approach is **better** than MJML (less HTML, more semantic, etc.)
   * - `"neutral"` — extraction artifact or equivalent approach, not a rendering difference
   *
   * There is no `"red"`. If mailc is worse than MJML, **fix the compiler**, don't document it.
   */
  status: 'green' | 'neutral';
}

/**
 * Reads the deviations.json for a fixture (if it exists).
 *
 * @param fixture - Fixture directory name.
 * @returns Array of documented deviations, or empty array.
 */
export function readDeviations(fixture: string): Deviation[] {
  const filePath = join(FIXTURES_DIR, fixture, 'deviations.json');
  if (!existsSync(filePath)) return [];
  return JSON.parse(readFileSync(filePath, 'utf-8')) as Deviation[];
}

// ---------------------------------------------------------------------------
// HTML Normalization (htmlparser2-based)
// ---------------------------------------------------------------------------

/**
 * Normalizes email HTML for structural comparison using htmlparser2.
 *
 * 1. Parses into DOM.
 * 2. Removes non-Outlook HTML comments.
 * 3. Sorts attributes alphabetically on every element.
 * 4. Sorts CSS properties alphabetically in every style="" attribute.
 * 5. Serializes back and collapses inter-tag whitespace.
 *
 * @param html - Raw HTML string.
 * @returns Normalized HTML string.
 */
export function normalizeHtml(html: string): string {
  const dom = parseDocument(html, { decodeEntities: false });

  // Walk the DOM and normalize
  walkNodes(dom.children);

  // Serialize back
  let result = DomUtils.getOuterHTML(dom, { decodeEntities: false });

  // Collapse whitespace between tags
  result = result.replace(/>\s+</g, '><');

  // Collapse remaining whitespace runs
  result = result.replace(/\s{2,}/g, ' ');

  return result.trim();
}

/**
 * Recursively walks DOM nodes, removing non-Outlook comments
 * and sorting attributes on elements.
 *
 * @param nodes - Array of child nodes to process.
 */
function walkNodes(nodes: ChildNode[]): void {
  // Collect nodes to remove (can't mutate while iterating)
  const toRemove: ChildNode[] = [];

  for (const node of nodes) {
    if (node.type === 'comment') {
      const data = (node as unknown as { data: string }).data;
      // Keep Outlook conditionals: [if mso], [if !mso], [if lte mso 11], etc.
      if (!isOutlookComment(data)) {
        toRemove.push(node);
      }
    }

    if (node.type === 'tag' || node.type === 'script' || node.type === 'style') {
      const el = node as Element;
      // Sort attributes alphabetically
      sortElementAttributes(el);
      // Sort inline style properties
      sortElementStyle(el);
      // Recurse into children
      if (el.children) {
        walkNodes(el.children);
      }
    }
  }

  for (const node of toRemove) {
    DomUtils.removeElement(node);
  }
}

/**
 * Checks if a comment is an Outlook conditional that should be preserved.
 *
 * @param data - The comment content (between <!-- and -->).
 * @returns True if it's an Outlook conditional comment.
 */
function isOutlookComment(data: string): boolean {
  // [if mso], [if !mso], [if mso | IE], [if lte mso 11], etc.
  return /^\[if\s/.test(data.trim()) ||
    /^<!\[endif\]/.test(data.trim()) ||
    /\[endif\]$/.test(data.trim());
}

/**
 * Sorts an element's attributes alphabetically by name.
 *
 * @param el - The DOM element.
 */
function sortElementAttributes(el: Element): void {
  const attribs = el.attribs;
  if (!attribs) return;

  const keys = Object.keys(attribs).sort();
  const sorted: Record<string, string> = {};
  for (const key of keys) {
    sorted[key] = attribs[key] as string;
  }
  el.attribs = sorted;
}

/**
 * Sorts CSS properties within a style="" attribute alphabetically.
 *
 * @param el - The DOM element.
 */
function sortElementStyle(el: Element): void {
  const style = el.attribs?.['style'];
  if (!style) return;

  const props = style
    .split(';')
    .map((p: string) => p.trim())
    .filter(Boolean)
    .sort();

  el.attribs['style'] = props.join(';');
}
