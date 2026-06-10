/**
 * Compiler entry point — tree walker and barrel exports.
 *
 * `compileNode()` is the main recursive function that walks the AST
 * and dispatches each node to its registered component compiler.
 *
 * @module compiler
 */

import type { ASTNode, CompileContext } from '../types.js';
import { MCError } from '../errors/mc-error.js';
import { ErrorCode } from '../errors/codes.js';
import { injectDataId } from './data-id-injector.js';

// ---------------------------------------------------------------------------
// Recursion safety
// ---------------------------------------------------------------------------

/**
 * Maximum allowed depth for compileNode recursion.
 *
 * Built-in components nest at most ~10 levels deep in any realistic email.
 * 100 leaves a generous safety margin for legitimate deep templates while
 * catching infinite recursion (e.g. a buggy plugin whose `compile()` calls
 * `compileNode()` on a node that includes another instance of its own type).
 *
 * Surfaced as an MCError so callers see a clear "max recursion depth"
 * message instead of a stack overflow.
 */
const MAX_COMPILE_DEPTH = 100;

/**
 * Component types that the template resolution stage is responsible for —
 * they should never reach `compileNode()` directly. If they do, it means
 * the resolution stage was skipped (e.g. `compileFromJSON` called with
 * `templating: false`, or markup compiled without `options.data`).
 *
 * Used to produce a targeted "templating was disabled" error instead of
 * the generic "unknown component" one, which sends users hunting for a
 * missing plugin.
 */
const TEMPLATE_DIRECTIVE_TYPES = new Set([
  'mc-if',
  'mc-else-if',
  'mc-else',
  'mc-each',
]);

// Per-call depth counter on the context object (initialised lazily).
type DepthAwareContext = CompileContext & { _compileDepth?: number };

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compiles an AST node into an HTML string by dispatching to the
 * appropriate component compiler.
 *
 * When `context.debug === true`, wraps the output with `<!-- mc:source -->`
 * HTML comments marking the component boundaries, and records a structured
 * entry in `context.sourceMap`.
 *
 * Recursion happens inside each component compiler — they call
 * `compileNode()` on their children as needed. A depth guard
 * (`MAX_COMPILE_DEPTH = 100`) prevents stack overflows from buggy plugins
 * that recurse on their own type.
 *
 * @param node    - The AST node to compile.
 * @param context - Shared compilation context (config, theme, warnings, parentWidth).
 * @returns The compiled HTML string for this node (and its subtree).
 * @throws MCError if the node type has no registered compiler, or if
 *         recursion exceeds `MAX_COMPILE_DEPTH`.
 */
export function compileNode(node: ASTNode, context: CompileContext): string {
  // Recursion safety: bail before the JS engine overflows the call stack.
  const depthCtx = context as DepthAwareContext;
  const depth = (depthCtx._compileDepth ?? 0) + 1;
  if (depth > MAX_COMPILE_DEPTH) {
    throw new MCError({
      code: ErrorCode.MAX_RECURSION_DEPTH,
      message:
        `compileNode recursion exceeded ${MAX_COMPILE_DEPTH} levels at <${node.type}>. ` +
        `This usually indicates a plugin whose compile() recurses on its own type. ` +
        `If your template legitimately needs deeper nesting, please file an issue.`,
      loc: node.loc,
      severity: 'error',
    });
  }
  depthCtx._compileDepth = depth;

  // `context.registry` knows about built-ins and the per-call plugin set.
  const compiler = context.registry.getCompiler(node.type);

  if (!compiler) {
    depthCtx._compileDepth = depth - 1;
    // Targeted hint: a templating directive reached the compiler, which means
    // the template resolution stage was skipped. Send the user to the real
    // cause rather than a generic "missing plugin" rabbit hole.
    if (TEMPLATE_DIRECTIVE_TYPES.has(node.type)) {
      throw new MCError({
        code: ErrorCode.UNKNOWN_COMPONENT_TYPE,
        message:
          `<${node.type}> is a templating directive and requires the template resolution stage to run. ` +
          `It reached the compiler unresolved, which usually means: ` +
          `(a) compileFromJSON() was called with templating: false, or ` +
          `(b) compile() was called without options.data so resolveTemplate() never ran. ` +
          `Either re-enable templating (and provide options.data), or remove <${node.type}> from your input.`,
        loc: node.loc,
        severity: 'error',
      });
    }
    throw new MCError({
      code: ErrorCode.UNKNOWN_COMPONENT_TYPE,
      message: `Unknown component <${node.type}>. No compiler registered.`,
      loc: node.loc,
      severity: 'error',
    });
  }

  try {
    // SM-A + SM-B: register entry with the source map collector
    const entryId = context.sourceMap.enter(node, node.type);

    // SM-D: attach expression resolutions collected during template resolution
    if ((context.debug || context.cleanSourceMap) && node._debug?.expressions?.length) {
      for (const expr of node._debug.expressions) {
        context.sourceMap.addExpression(entryId, expr);
      }
    }

    // Plugin compilers (types that don't start with "mc-") receive the raw
    // ASTNode. Unlike built-in compilers, they don't call getEffectiveAttributes
    // themselves, so mc-attributes defaults would be silently ignored. Pre-merge
    // effective attributes into a shallow node copy for plugin dispatch only.
    const isPlugin = !node.type.startsWith('mc-');
    const dispatchNode = isPlugin
      ? { ...node, attributes: getEffectiveAttributes(node, context) }
      : node;

    let output: string;
    if (isPlugin) {
      // Safety net: plugin code is third-party. A thrown TypeError or
      // ReferenceError must not crash the entire compile — surface it as a
      // structured PLUGIN_COMPILE_ERROR warning, emit an empty placeholder,
      // and let the rest of the email compile. MCError is re-thrown unchanged:
      // those are intentional framework signals (e.g. MAX_RECURSION_DEPTH)
      // that callers up the stack already know how to surface.
      // Built-in compilers (mc-* prefix) deliberately do NOT get this wrapper:
      // if they throw, that's a framework bug we want to surface loudly.
      try {
        output = compiler(dispatchNode, context);
      } catch (err: unknown) {
        if (err instanceof MCError) {
          throw err;
        }
        const message = err instanceof Error ? err.message : String(err);
        const stackTail =
          err instanceof Error && err.stack
            ? err.stack.split('\n').slice(0, 3).join(' • ')
            : undefined;
        context.warnings.push({
          code: ErrorCode.PLUGIN_COMPILE_ERROR,
          message:
            `Plugin compiler for <${node.type}> threw an exception: ${message}. ` +
            `The component was replaced with an empty placeholder so the rest of the email could compile. ` +
            `This is a bug in the plugin, not in mailc.`,
          severity: 'error',
          loc: node.loc
            ? { line: node.loc.start.line, col: node.loc.start.col }
            : undefined,
          ...(stackTail ? { fix: stackTail } : {}),
        });
        output = '';
      }
    } else {
      output = compiler(dispatchNode, context);
    }

    context.sourceMap.leave(entryId);

    // SM-G1: inject data-mc-id on the root output element (clean source map mode)
    if (context.cleanSourceMap && entryId) {
      output = injectDataId(output, entryId);
    }

    // SM-A: wrap with debug comments when debug mode is active
    if (context.debug) {
      const line = node.loc.start.line;
      const col = node.loc.start.col;
      const open = `<!-- mc:source component="${node.type}" line="${line}" col="${col}" id="${entryId}" -->`;
      const close = `<!-- mc:/${node.type} id="${entryId}" -->`;
      return `${open}\n${output}\n${close}`;
    }

    return output;
  } finally {
    // Always decrement depth on the way out — even if the compiler throws —
    // so subsequent siblings start at the correct depth instead of inheriting
    // a leaked counter.
    depthCtx._compileDepth = depth - 1;
  }
}

/**
 * Compiles an array of child AST nodes, concatenating the results.
 *
 * Convenience helper used by component compilers to compile their children.
 *
 * @param children - The child nodes to compile.
 * @param context  - Shared compilation context.
 * @returns The concatenated HTML of all compiled children.
 */
export function compileChildren(
  children: ASTNode[],
  context: CompileContext,
): string {
  return children.map((child) => compileNode(child, context)).join('');
}

/**
 * Extracts the text content from an AST node's content array.
 *
 * Joins all text nodes and expression nodes (as raw placeholders for now —
 * template resolution happens in a prior stage).
 *
 * @param node - The AST node to extract content from.
 * @returns The concatenated text content string.
 */
export function getTextContent(node: ASTNode): string {
  return node.content
    .map((c) => {
      if (c.type === 'text') {
        return c.value;
      }
      // Expression nodes — template stage should have resolved these.
      // If still present, output the raw expression syntax as placeholder.
      if (c.raw) {
        return `{{{${c.value}}}}`;
      }
      return `{{${c.value}}}`;
    })
    .join('');
}

/**
 * Merges mc-attributes defaults and mc-class bundles with a node's explicit attributes.
 *
 * Precedence (lowest → highest):
 * 1. `mc-all` defaults    — apply to every component type
 * 2. `mc-{type}` defaults — apply to a specific component type
 * 3. `mc-class="name"`   — named attribute bundle from `<mc-class name="...">` in head
 * 4. Explicit attributes  — set directly on the node
 *
 * The `mc-class` attribute itself is always stripped from the result — it is a
 * compile-time directive and must never appear as an HTML attribute in output.
 * Space-separated values are supported: `mc-class="base primary"` applies base
 * first, then primary (later classes override earlier ones).
 *
 * @param node    - The AST node to get effective attributes for.
 * @param context - Compile context with `attributeDefaults` and `namedClasses`.
 * @returns Merged attributes record (without `mc-class`).
 */
export function getEffectiveAttributes(
  node: ASTNode,
  context: CompileContext,
): Record<string, string> {
  const hasMcClassKey = 'mc-class' in node.attributes;
  const mcClassName = node.attributes['mc-class'];
  // Non-empty value → resolve class attrs; present-but-empty → strip only
  const hasMcClassValue = hasMcClassKey && mcClassName != null && mcClassName.trim() !== '';

  const allDefaults = context.attributeDefaults.get('mc-all') ?? {};
  const typeDefaults = context.attributeDefaults.get(node.type) ?? {};
  const hasAnyDefaults =
    Object.keys(allDefaults).length > 0 || Object.keys(typeDefaults).length > 0;

  // Fast path: nothing to merge, nothing to strip
  if (!hasMcClassKey && !hasAnyDefaults) {
    return node.attributes;
  }

  // Resolve named class attrs from mc-class="name [name2 ...]"
  let classAttrs: Record<string, string> = {};
  if (hasMcClassValue) {
    const classNames = (mcClassName as string).trim().split(/\s+/).filter(Boolean);
    for (const className of classNames) {
      const resolved = context.namedClasses.get(className);
      if (resolved) {
        classAttrs = { ...classAttrs, ...resolved }; // later class names win
      } else {
        context.warnings.push({
          code: ErrorCode.UNKNOWN_MC_CLASS,
          message: `mc-class="${className}" is not defined. Add <mc-class name="${className}" ... /> inside <mc-head><mc-attributes>.`,
          severity: 'warning',
          loc: node.loc
            ? { line: node.loc.start.line, col: node.loc.start.col }
            : undefined,
          fix: `Define <mc-class name="${className}" ... /> inside <mc-head><mc-attributes>`,
        });
      }
    }
  }

  // Strip mc-class from explicit attrs — it is a compile-time directive, not HTML
  const { 'mc-class': _stripped, ...explicitAttrs } = node.attributes;

  // Merge: mc-all → mc-{type} → mc-class → explicit (highest)
  return { ...allDefaults, ...typeDefaults, ...classAttrs, ...explicitAttrs };
}

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export { COMPONENT_COMPILERS } from './registry.js';
