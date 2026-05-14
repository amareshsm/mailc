/**
 * `mc` compiler — document root component.
 *
 * `<mc>` is a transparent structural wrapper that holds `<mc-head>` and
 * `<mc-body>` as siblings. It produces no HTML output of its own.
 *
 * Responsibilities:
 * - Locate `mc-head` sibling → extract head data (styles, defaults, title, preview)
 * - Apply extracted head data onto the compile context
 * - Locate `mc-body` sibling → delegate to `compileBody()`
 *
 * @module compiler/components/mc
 */

import type { ASTNode, CompileContext } from '../../types.js';
import { ErrorCode } from '../../errors/codes.js';
import { MCError } from '../../errors/index.js';
import { extractHeadData } from './head.js';
import { compileBody } from './body.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compiles an `<mc>` root node into a complete email HTML document.
 *
 * Finds the `mc-head` and `mc-body` siblings, extracts head data,
 * applies it to context, then delegates full HTML generation to `compileBody`.
 *
 * @param node    - The `mc` AST node (document root).
 * @param context - Compile context with config, theme, and warnings.
 * @returns The full email HTML document string.
 */
export function compileMc(node: ASTNode, context: CompileContext): string {
  // Extract head data from mc-head sibling (if present)
  const headNode = node.children.find((c) => c.type === 'mc-head');
  const headData = headNode
    ? extractHeadData(headNode, context)
    : {
        previewHtml: '',
        styleBlocks: [],
        attributeDefaults: new Map<string, Record<string, string>>(),
        namedClasses: new Map<string, Record<string, string>>(),
        inlineStyleRules: [],
        title: '',
      };

  // Apply head data onto the compile context so all child compilers can read it
  context.attributeDefaults = headData.attributeDefaults;
  context.namedClasses = headData.namedClasses;
  context.inlineStyleRules = headData.inlineStyleRules;
  context.title = headData.title;

  // Find mc-body — required
  const bodyNode = node.children.find((c) => c.type === 'mc-body');
  if (!bodyNode) {
    throw new MCError({
      code: ErrorCode.EMPTY_DOCUMENT,
      message: 'Document must have an <mc-body> inside <mc>.',
      severity: 'error',
      fix: 'Add <mc-body> inside <mc>: <mc><mc-head>...</mc-head><mc-body>...</mc-body></mc>',
    });
  }

  return compileBody(bodyNode, context, headData);
}
