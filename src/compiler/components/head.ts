/**
 * `mc-head` compiler — processes head children.
 *
 * `mc-head` itself produces no standalone HTML. It processes its children
 * (`mc-attributes`, `mc-style`, `mc-preview`, `mc-title`) and returns their
 * combined output for injection into the `<head>` and `<body>`.
 *
 * In the current compilation model, `mc-body` calls `compileHead()`
 * directly to collect head-level data. The head compiler simply
 * compiles its children and returns the concatenated result.
 *
 * @module compiler/components/head
 */

import type { ASTNode, CompileContext } from '../../types.js';
import { compileChildren, getTextContent } from '../index.js';
import { parseCSSRules } from '../../css/style-parser.js';
import type { ParsedCSSRule } from '../../css/style-parser.js';
import { ErrorCode } from '../../errors/codes.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Data extracted from `mc-head` children for injection into the email. */
export interface HeadData {
  /** Preview text HTML (from mc-preview). */
  previewHtml: string;
  /** Raw CSS blocks to inject into `<style>` (from mc-style). */
  styleBlocks: string[];
  /** Default attribute overrides (from mc-attributes). */
  attributeDefaults: Map<string, Record<string, string>>;
  /**
   * Named attribute bundles from `mc-class` definitions (from mc-attributes).
   *
   * Key = class name (from `name` attribute).
   * Value = resolved attributes (with `extends` chains fully merged).
   */
  namedClasses: Map<string, Record<string, string>>;
  /** Parsed CSS rules from `mc-style inline="true"` for inline injection. */
  inlineStyleRules: ParsedCSSRule[];
  /** Email title text (from mc-title). */
  title: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compiles an `mc-head` node by processing its children.
 *
 * When called from `compileBody`, the result is typically ignored
 * because `extractHeadData()` is used instead. This function exists
 * for the registry contract.
 *
 * @param node    - The `mc-head` AST node.
 * @param context - Compile context.
 * @returns Empty string (head has no standalone HTML output).
 */
export function compileHead(
  node: ASTNode,
  context: CompileContext,
): string {
  // Head itself produces no HTML — its children inject into body's <head>
  // via extractHeadData(). But we still compile children to collect warnings.
  compileChildren(node.children, context);
  context.counters.componentCount++;
  return '';
}

/**
 * Extracts structured data from `mc-head` children for use by `mc-body`.
 *
 * @param headNode - The `mc-head` AST node.
 * @param context  - Compile context.
 * @returns The extracted head data.
 */
export function extractHeadData(
  headNode: ASTNode,
  context: CompileContext,
): HeadData {
  const data: HeadData = {
    previewHtml: '',
    styleBlocks: [],
    attributeDefaults: new Map(),
    namedClasses: new Map(),
    inlineStyleRules: [],
    title: '',
  };

  for (const child of headNode.children) {
    switch (child.type) {
      case 'mc-preview':
        data.previewHtml = compileChildren([child], context);
        break;

      case 'mc-style': {
        const cssText = getTextContent(child).trim();
        if (child.attributes['inline'] === 'true') {
          // Parse and store rules for inline injection onto matching elements
          const rules = parseCSSRules(cssText);
          data.inlineStyleRules.push(...rules);
        } else {
          // Regular style block — inject into <style> in <head>
          data.styleBlocks.push(cssText);
        }
        break;
      }

      case 'mc-attributes':
        extractAttributeDefaults(child, data.attributeDefaults, context);
        extractNamedClasses(child, data.namedClasses);
        break;

      case 'mc-title':
        data.title = getTextContent(child).trim();
        break;

      default:
        // Unknown head children — ignore (validator should have caught this)
        break;
    }
  }

  return data;
}

// ---------------------------------------------------------------------------
// Attribute defaults extraction
// ---------------------------------------------------------------------------

/**
 * Extracts default attribute mappings from `mc-attributes` children.
 *
 * Children like `<mc-all font-family="Arial" />` or `<mc-text color="#333" />`
 * define defaults. `mc-all` applies to all component types.
 * `mc-class` children are handled separately by `extractNamedClasses`.
 *
 * @param attrNode - The `mc-attributes` AST node.
 * @param defaults - Map to populate: key = component type (or "mc-all"), value = attributes.
 */
function extractAttributeDefaults(
  attrNode: ASTNode,
  defaults: Map<string, Record<string, string>>,
  context: CompileContext,
): void {
  for (const child of attrNode.children) {
    if (child.type === 'mc-class') continue; // handled by extractNamedClasses
    const { type, attributes } = child;

    // Attribute-mode enforcement: reject `class=` even when set as an
    // mc-attributes default. Mirrors assertAttributeModeClass at the
    // per-element layer. Without this, defaults would silently inject
    // class= on every element of `type`, bypassing the rule.
    if (
      context.templateStyle === 'attribute' &&
      Object.prototype.hasOwnProperty.call(attributes, 'class')
    ) {
      context.warnings.push({
        code: ErrorCode.CLASS_ATTR_IN_ATTRIBUTE_MODE,
        message:
          `<mc-attributes> default for <${type}> sets "class", which is ` +
          `not allowed in attribute mode. Express styling via attributes ` +
          `or switch to templateStyle: 'class'.`,
        severity: 'error',
        loc: child.loc
          ? { line: child.loc.start.line, col: child.loc.start.col }
          : undefined,
        fix:
          `Remove "class" from the <${type}> default, or set ` +
          `templateStyle: 'class' in compile options.`,
      });
      // Strip class from the merged default so it doesn't get injected onto
      // child elements (which would then ALSO trigger the per-element check).
      const { class: _omit, ...rest } = attributes;
      void _omit;
      const existing = defaults.get(type) ?? {};
      defaults.set(type, { ...existing, ...rest });
      continue;
    }

    const existing = defaults.get(type) ?? {};
    defaults.set(type, { ...existing, ...attributes });
  }
}

/**
 * Extracts named attribute bundles from `mc-class` children of `mc-attributes`.
 *
 * Each `mc-class name="X" ...attrs />` defines a named bundle that components
 * can reference via `mc-class="X"`. The `extends` attribute allows a class to
 * inherit all attributes from another named class (base wins, own overrides).
 *
 * Resolves `extends` chains with cycle detection — circular references fall
 * back to the class's own attributes only (no infinite loop).
 *
 * @param attrNode     - The `mc-attributes` AST node.
 * @param namedClasses - Map to populate: key = name, value = resolved attributes.
 */
function extractNamedClasses(
  attrNode: ASTNode,
  namedClasses: Map<string, Record<string, string>>,
): void {
  // First pass: collect raw definitions, stripping "name" and "extends"
  type RawDef = { own: Record<string, string>; extends?: string };
  const rawDefs = new Map<string, RawDef>();

  for (const child of attrNode.children) {
    if (child.type !== 'mc-class') continue;
    const name = child.attributes['name'];
    if (!name) continue; // validator enforces this; skip defensively

    const { name: _name, extends: extendsFrom, ...ownAttrs } = child.attributes;
    rawDefs.set(name, { own: ownAttrs, extends: extendsFrom });
  }

  // Second pass: resolve extends chains with cycle detection
  const resolved = new Map<string, Record<string, string>>();

  function resolveClass(name: string, resolving: Set<string>): Record<string, string> {
    const cached = resolved.get(name);
    if (cached !== undefined) return cached;
    if (resolving.has(name)) return rawDefs.get(name)?.own ?? {}; // cycle — own only

    const def = rawDefs.get(name);
    if (!def) return {};

    resolving.add(name);
    let result: Record<string, string>;

    if (def.extends) {
      const baseAttrs = resolveClass(def.extends, resolving);
      result = { ...baseAttrs, ...def.own }; // own overrides base
    } else {
      result = { ...def.own };
    }

    resolving.delete(name);
    resolved.set(name, result);
    return result;
  }

  for (const name of rawDefs.keys()) {
    namedClasses.set(name, resolveClass(name, new Set()));
  }
}
