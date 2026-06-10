/**
 * JSON → Markup serializer.
 *
 * Converts an MCNode tree back to `.mc` markup string.
 * Used for developer export from visual builders — "show me the code."
 *
 * @module json/json-to-markup
 */

import type { MCNode } from './schema.js';
import { BUILTIN_METADATA } from '../registry/builtin-registry.js';

// Built-in metadata is a static constant — known at build time, no seeding
// step required. Per-call plugin metadata is not consulted here: this
// serialiser uses metadata only to decide self-closing / container shape,
// which is a built-in concept. Unknown plugin types fall through to the
// generic "open tag with children if present" path.
function getComponentMetadata(
  type: string,
): import('../components/metadata.js').ComponentMetadata | undefined {
  return BUILTIN_METADATA[type];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Serializes an MCNode tree into `.mc` markup string.
 *
 * Produces indented, human-readable markup that can be pasted into
 * a `.mc` file and compiled with `compile()`.
 *
 * @param node   - The root MCNode to serialize.
 * @param indent - Current indentation level (internal, defaults to 0).
 * @returns The `.mc` markup string.
 */
export function jsonToMarkup(node: MCNode, indent = 0): string {
  // When serializing an mc-body (or mc-head) as the root node,
  // wrap it in <mc>...</mc> to produce valid .mc markup.
  if (indent === 0 && (node.type === 'mc-body' || node.type === 'mc-head')) {
    const inner = jsonToMarkup(node, 1);
    return `<mc>\n${inner}\n</mc>`;
  }

  const pad = '  '.repeat(indent);
  const tag = node.type;
  const attrs = serializeAttributes(node.attributes ?? {});
  const attrStr = attrs.length > 0 ? ` ${attrs}` : '';

  // Self-closing tags: <mc-image src="..." alt="..." />
  if (isSelfClosing(node)) {
    return `${pad}<${tag}${attrStr} />`;
  }

  // Content-only nodes: <mc-text>Hello {{name}}</mc-text>
  if (isContentNode(node)) {
    const content = node.content ?? '';
    return `${pad}<${tag}${attrStr}>${content}</${tag}>`;
  }

  // Container nodes with children
  const children = node.children ?? [];
  if (children.length === 0) {
    return `${pad}<${tag}${attrStr}></${tag}>`;
  }

  const childMarkup = children
    .map((child) => jsonToMarkup(child, indent + 1))
    .join('\n');

  return `${pad}<${tag}${attrStr}>\n${childMarkup}\n${pad}</${tag}>`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Serializes an attributes record into a string of `key="value"` pairs.
 *
 * @param attributes - The attributes to serialize.
 * @returns Space-separated key="value" string, or empty string.
 */
function serializeAttributes(attributes: Record<string, string>): string {
  const entries = Object.entries(attributes);
  if (entries.length === 0) {
    return '';
  }
  return entries
    .map(([key, value]) => `${key}="${escapeAttr(value)}"`)
    .join(' ');
}

/**
 * Escapes double quotes in attribute values.
 *
 * @param value - The attribute value.
 * @returns The escaped value.
 */
function escapeAttr(value: string): string {
  return value.replace(/"/g, '&quot;');
}

/**
 * Determines if a node should be rendered as self-closing.
 *
 * Structurally void components — declared with `maxChildren: 0` AND
 * `allowsTextContent: false` in metadata — are always self-closing
 * (mc-image, mc-divider, mc-spacer, and any plugin that mirrors that shape).
 * Otherwise we fall back to the node's shape: emit self-closing only when
 * it has nothing to render AND isn't semantically a container.
 *
 * @param node - The MCNode to check.
 * @returns `true` if the node should be self-closing.
 */
function isSelfClosing(node: MCNode): boolean {
  const meta = getComponentMetadata(node.type);
  if (meta && meta.maxChildren === 0 && !meta.allowsTextContent) {
    return true;
  }
  const hasChildren = node.children !== undefined && node.children.length > 0;
  const hasContent = node.content !== undefined && node.content !== '';
  return !hasChildren && !hasContent && !isContainerByDefault(node.type);
}

/**
 * Determines if a node should be serialised as a content-only leaf.
 *
 * Returns true for any node that carries a non-empty `content` field and has
 * no element children. Trusting the node shape (rather than a hand-maintained
 * type whitelist) means `mc-list-item`, `mc-table` sub-elements (`tr`, `th`,
 * `td`), and plugin components with text content all round-trip correctly.
 *
 * When both `content` and `children` are present (mixed-content), children
 * take precedence — preserves prior behaviour and keeps the door open for
 * a future mixed-content serialisation strategy if one ever lands.
 *
 * @param node - The MCNode to check.
 * @returns `true` if the node should be serialised as `<tag>content</tag>`.
 */
function isContentNode(node: MCNode): boolean {
  const hasChildren = node.children !== undefined && node.children.length > 0;
  return !hasChildren && node.content !== undefined && node.content !== '';
}

/**
 * Determines if a type semantically wraps other components.
 *
 * Any registered component with `maxChildren > 0` qualifies. Empty containers
 * still emit open + close tags so structural intent isn't lost when
 * round-tripping (`<mc-section></mc-section>`, not `<mc-section />`).
 * Unknown types — HTML elements passing through inside mc-raw, for example —
 * fall back to the shape-driven rule in `isSelfClosing`.
 *
 * @param type - The node type.
 * @returns `true` if the type is a container.
 */
function isContainerByDefault(type: string): boolean {
  const meta = getComponentMetadata(type);
  return meta !== undefined && meta.maxChildren > 0;
}
