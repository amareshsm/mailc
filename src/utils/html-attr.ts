/**
 * Single-boundary HTML attribute builders. The compiler is the only place
 * attribute escaping happens; AST values are always raw. Pre-escaped input
 * here produces double-escaped output (`&amp;` → `&amp;amp;`).
 *
 * @module utils/html-attr
 */

import { escapeHtml } from './html-escape.js';

export type AttrValue = string | number | undefined | null;

/** Conditional. Returns `""` when value is undefined/null/empty. */
export function attr(name: string, value: AttrValue): string {
  if (value === undefined || value === null || value === '') return '';
  return ` ${name}="${escapeHtml(String(value))}"`;
}

/** Always emits. `alt=""` is intentional for decorative images, so empty is kept. */
export function reqAttr(name: string, value: string | number): string {
  return ` ${name}="${escapeHtml(String(value))}"`;
}

/**
 * CSS values are NOT entity-escaped (`&amp;` is invalid inside CSS).
 * `"` is stripped — invalid in CSS values anyway, and prevents attribute breakout.
 */
export function styleAttr(value: string | undefined): string {
  if (!value) return '';
  return ` style="${value.replace(/"/g, '')}"`;
}
