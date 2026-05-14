/**
 * `normalizeJSON()` — returns a canonical form of a JSON tree with all
 * compile-time merge rules applied inline: `mc-attributes` defaults baked in,
 * `mc-class` references resolved (with `extends` cycle detection), `mc-class`
 * attribute stripped. Same render output, no compile-time ambiguity.
 *
 * Mirrors `extractAttributeDefaults` / `extractNamedClasses` in
 * `compiler/components/head.ts` and `getEffectiveAttributes` in
 * `compiler/index.ts`. Mirrored because this runs pre-AST — no compile
 * context exists.
 *
 * @module json/normalize
 */

import type { MCNode, MCDocument } from './schema.js';

/**
 * Returns a canonical form of the input with merge rules applied.
 *
 * Precedence (lowest → highest, same as compiler):
 *   `mc-all` defaults < type defaults < class lookup < explicit attrs.
 *
 * `<mc-head>` is preserved so re-normalizing or compiling the result is
 * idempotent. Unknown `mc-class` names are silently ignored — builders that
 * want warnings should run `compileFromJSON` and inspect `result.warnings`.
 */
export function normalizeJSON(input: MCDocument): MCDocument;
export function normalizeJSON(input: MCNode): MCNode;
export function normalizeJSON(input: MCNode | MCDocument): MCNode | MCDocument {
  if (isDocument(input)) {
    return { ...input, template: normalizeRoot(input.template) };
  }
  return normalizeRoot(input);
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function isDocument(input: MCNode | MCDocument): input is MCDocument {
  return 'template' in input && 'version' in input;
}

function normalizeRoot(root: MCNode): MCNode {
  const attributeDefaults = new Map<string, Record<string, string>>();
  const namedClasses = new Map<string, Record<string, string>>();

  // Find mc-head and extract defaults / named classes from any
  // <mc-attributes> children inside it.
  const head = (root.children ?? []).find((c) => c.type === 'mc-head');
  if (head) {
    for (const child of head.children ?? []) {
      if (child.type === 'mc-attributes') {
        extractAttributeDefaults(child, attributeDefaults);
        extractNamedClasses(child, namedClasses);
      }
    }
  }

  return walkNode(root, attributeDefaults, namedClasses, false);
}

/**
 * Recursively rebuilds a node with effective attributes computed.
 *
 * `<mc-head>` and its descendants are passed through untouched — defaults
 * inside head are configuration, not subject to themselves.
 */
function walkNode(
  node: MCNode,
  attributeDefaults: Map<string, Record<string, string>>,
  namedClasses: Map<string, Record<string, string>>,
  insideHead: boolean,
): MCNode {
  const isHead = node.type === 'mc-head';
  const childInsideHead = insideHead || isHead;

  const attributes = insideHead || isHead
    ? { ...node.attributes }
    : computeEffectiveAttributes(node, attributeDefaults, namedClasses);

  const out: MCNode = {
    ...(node.id !== undefined ? { id: node.id } : {}),
    type: node.type,
    attributes,
  };

  if (node.children !== undefined) {
    out.children = node.children.map((child) =>
      walkNode(child, attributeDefaults, namedClasses, childInsideHead),
    );
  }
  if (node.content !== undefined) {
    out.content = node.content;
  }

  return out;
}

/**
 * Mirrors `getEffectiveAttributes` in `compiler/index.ts` for JSON nodes.
 * Precedence (lowest → highest): mc-all → type → mc-class → explicit.
 * Strips `mc-class` from the result.
 */
function computeEffectiveAttributes(
  node: MCNode,
  attributeDefaults: Map<string, Record<string, string>>,
  namedClasses: Map<string, Record<string, string>>,
): Record<string, string> {
  const allDefaults = attributeDefaults.get('mc-all') ?? {};
  const typeDefaults = attributeDefaults.get(node.type) ?? {};

  const mcClassName = node.attributes['mc-class'];
  let classAttrs: Record<string, string> = {};
  if (typeof mcClassName === 'string' && mcClassName.trim() !== '') {
    const names = mcClassName.trim().split(/\s+/).filter(Boolean);
    for (const name of names) {
      const resolved = namedClasses.get(name);
      if (resolved) {
        // Later names win (matches compiler behavior).
        classAttrs = { ...classAttrs, ...resolved };
      }
      // Unknown names: silent here. Compile-time path emits UNKNOWN_MC_CLASS.
    }
  }

  // Strip mc-class — it is a compile-time directive, not an HTML attribute.
  const { 'mc-class': _stripped, ...explicit } = node.attributes;

  return { ...allDefaults, ...typeDefaults, ...classAttrs, ...explicit };
}

// ---------------------------------------------------------------------------
// Head extraction — mirrors compiler/components/head.ts.
// Duplicated rather than imported because that module operates on ASTNode
// (with `loc`, `content: ASTContent[]`) while normalize works on MCNode
// pre-conversion. The shape used here (`type`, `attributes`, `children`) is
// identical between the two; the algorithm is unchanged.
// ---------------------------------------------------------------------------

function extractAttributeDefaults(
  attrNode: MCNode,
  defaults: Map<string, Record<string, string>>,
): void {
  for (const child of attrNode.children ?? []) {
    if (child.type === 'mc-class') continue;
    const existing = defaults.get(child.type) ?? {};
    defaults.set(child.type, { ...existing, ...child.attributes });
  }
}

function extractNamedClasses(
  attrNode: MCNode,
  namedClasses: Map<string, Record<string, string>>,
): void {
  type RawDef = { own: Record<string, string>; extends?: string };
  const rawDefs = new Map<string, RawDef>();

  for (const child of attrNode.children ?? []) {
    if (child.type !== 'mc-class') continue;
    const name = child.attributes['name'];
    if (!name) continue;

    const { name: _name, extends: extendsFrom, ...ownAttrs } = child.attributes;
    rawDefs.set(name, { own: ownAttrs, extends: extendsFrom });
  }

  const resolved = new Map<string, Record<string, string>>();

  function resolveClass(name: string, resolving: Set<string>): Record<string, string> {
    const cached = resolved.get(name);
    if (cached !== undefined) return cached;
    if (resolving.has(name)) return rawDefs.get(name)?.own ?? {};

    const def = rawDefs.get(name);
    if (!def) return {};

    resolving.add(name);
    const result = def.extends
      ? { ...resolveClass(def.extends, resolving), ...def.own }
      : { ...def.own };
    resolving.delete(name);
    resolved.set(name, result);
    return result;
  }

  for (const name of rawDefs.keys()) {
    namedClasses.set(name, resolveClass(name, new Set()));
  }
}
