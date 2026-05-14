/**
 * Token types produced by the mailc tokenizer.
 *
 * Each token carries a `type`, `value`, and source `loc`.
 */
export enum TokenType {
  // ── Tags ─────────────────────────────────────────────────────────────
  /** Opening tag name: `<mc-section` → value = "mc-section" */
  TAG_OPEN = 'TAG_OPEN',
  /** Closing tag: `</mc-section>` → value = "mc-section" */
  TAG_CLOSE = 'TAG_CLOSE',
  /** Self-closing slash: `/>` */
  TAG_SELF_CLOSE = 'TAG_SELF_CLOSE',
  /** End of opening tag: `>` */
  TAG_END = 'TAG_END',

  // ── Attributes ───────────────────────────────────────────────────────
  /** Attribute name: `class` */
  ATTR_NAME = 'ATTR_NAME',
  /** Equals sign between name and value: `=` */
  ATTR_EQUALS = 'ATTR_EQUALS',
  /** Quoted attribute value (quotes stripped): `"bg-white py-4"` */
  ATTR_VALUE = 'ATTR_VALUE',

  // ── Content ──────────────────────────────────────────────────────────
  /** Raw text between tags */
  TEXT = 'TEXT',
  /** Double-brace expression: `{{variable.path}}` → value = "variable.path" */
  EXPRESSION = 'EXPRESSION',
  /** Triple-brace raw expression: `{{{rawHtml}}}` → value = "rawHtml" */
  RAW_EXPRESSION = 'RAW_EXPRESSION',

  // ── Special ──────────────────────────────────────────────────────────
  /** HTML comment: `<!-- ... -->` */
  COMMENT = 'COMMENT',
  /** Outlook conditional: `<!--[if mso]>...<![endif]-->` */
  OUTLOOK_COMMENT = 'OUTLOOK_COMMENT',
  /** End of input */
  EOF = 'EOF',
}

/** Set of inline HTML tags that are passed through as text content. */
export const INLINE_HTML_TAGS = new Set([
  'strong', 'b', 'em', 'i', 'u', 's', 'br', 'a', 'span',
  // Safe text-level inlines that webmail clients render reliably. Keeping
  // these as content (not child nodes) matches author intent and avoids
  // INVALID_NESTING when used inside leaf components like mc-list-item.
  'code', 'mark', 'small', 'sub', 'sup', 'time',
]);

/**
 * Tags that are valid children of `<mc-attributes>`.
 * These define default attributes per component type,
 * NOT component instances.
 */
export const MC_ATTRIBUTES_CHILD_TAGS = new Set([
  'mc-all', 'mc-text', 'mc-button', 'mc-image',
  'mc-section', 'mc-column', 'mc-divider', 'mc-spacer',
  'mc-class',
]);
