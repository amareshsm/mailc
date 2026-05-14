/**
 * Markup → JSON converter.
 *
 * Parses `.mc` markup source into an MCNode tree.
 * This is the reverse of `jsonToMarkup()` — useful for importing
 * existing `.mc` templates into visual builders.
 *
 * Pipeline: source → tokenize → parse → ASTNode → MCNode
 *
 * @module json/markup-to-json
 */

import type { ASTNode, ASTContent } from '../types.js';
import type { MCNode } from './schema.js';
import { tokenize } from '../tokenizer/index.js';
import { parse } from '../parser/index.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Converts `.mc` markup source into an MCNode tree.
 *
 * Parses the markup through the standard tokenizer + parser pipeline,
 * then converts the resulting ASTNode tree into the MCNode format
 * used by the JSON API.
 *
 * @param source - The `.mc` markup source string.
 * @returns The root MCNode tree (typically an mc-body).
 */
export function markupToJSON(source: string): MCNode {
  const tokens = tokenize(source);
  const ast = parse(tokens);

  // Parser wraps everything in a synthetic "root" node.
  // If it has a single child (expected: mc-body), return that child.
  // Otherwise, convert the root itself.
  if (ast.type === 'root' && ast.children.length === 1) {
    const child = ast.children[0];
    if (child) {
      return astToMCNode(child);
    }
  }

  // Multiple top-level nodes or unexpected structure — wrap in synthetic <mc> root
  if (ast.type === 'root' && ast.children.length > 1) {
    return {
      type: 'mc',
      attributes: {},
      children: ast.children.map(astToMCNode),
    };
  }

  return astToMCNode(ast);
}

// ---------------------------------------------------------------------------
// Internal conversion
// ---------------------------------------------------------------------------

/**
 * Recursively converts an ASTNode into an MCNode.
 *
 * Exposed so that `compile()` can capture the parsed tree as `result.json`
 * without re-tokenising and re-parsing the source string. Standalone callers
 * who already hold an ASTNode (e.g. mid-pipeline tooling) can also use this
 * to downconvert to the public JSON IR.
 *
 * Note: returns the public `MCNode` shape — `content` is a plain string,
 * not the internal structured `ASTContent[]`. If you need the structured
 * form, work with the `ASTNode` directly.
 *
 * @param node - The ASTNode to convert.
 * @returns The equivalent MCNode.
 */
export function astToMCNode(node: ASTNode): MCNode {
  const mcNode: MCNode = {
    type: node.type,
    attributes: { ...node.attributes },
  };

  // Convert children
  if (node.children.length > 0) {
    mcNode.children = node.children.map(astToMCNode);
  }

  // Convert content back to string. When the node has children, drop
  // whitespace-only content — that's just inter-tag formatting in the source
  // and emitting it would trigger INVALID_NESTING ("has both content and
  // children") when the JSON re-enters the validator.
  if (node.content.length > 0) {
    const text = contentToString(node.content);
    const isWhitespaceOnly = text.trim().length === 0;
    if (!(node.children.length > 0 && isWhitespaceOnly)) {
      mcNode.content = text;
    }
  }

  return mcNode;
}

/**
 * Serializes ASTContent[] back into a content string.
 *
 * Reconstructs the original content by turning text nodes into plain text
 * and expression nodes back into `{{expr}}` or `{{{expr}}}` syntax.
 *
 * @param content - The ASTContent array to serialize.
 * @returns The reconstructed content string.
 */
function contentToString(content: ASTContent[]): string {
  return content
    .map((node) => {
      if (node.type === 'text') {
        return node.value;
      }
      // Expression node
      const braces = node.raw ? ['{{{', '}}}'] : ['{{', '}}'];
      let expr = node.value;
      if (node.fallback !== undefined) {
        expr = `${expr} || "${node.fallback}"`;
      }
      return `${braces[0]}${expr}${braces[1]}`;
    })
    .join('');
}
