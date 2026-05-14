/**
 * Test helpers for compiler tests.
 *
 * Provides factory functions to create AST nodes and compile contexts
 * with minimal boilerplate.
 */
import type { ASTNode, CompileContext } from '../../src/types.js';
import { DEFAULT_CONFIG } from '../../src/config.js';
import { resolveTheme } from '../../src/css/theme-resolver.js';
import { NullSourceMapCollector } from '../../src/compiler/null-source-map-collector.js';
import { SourceMapCollector } from '../../src/compiler/source-map-collector.js';

/** A dummy source location for test nodes. */
const DUMMY_LOC = {
  start: { line: 1, col: 1, offset: 0 },
  end: { line: 1, col: 1, offset: 0 },
};

/**
 * Creates a minimal AST node for testing.
 *
 * @param type       - Component type (e.g. "mc-text").
 * @param attributes - Key-value attributes.
 * @param children   - Child nodes.
 * @param content    - Text/expression content array.
 * @returns An ASTNode.
 */
export function makeNode(
  type: string,
  attributes: Record<string, string> = {},
  children: ASTNode[] = [],
  content: ASTNode['content'] = [],
): ASTNode {
  return { type, attributes, children, content, loc: DUMMY_LOC };
}

/**
 * Creates a text content item for an AST node.
 *
 * @param value - The text value.
 * @returns An ASTTextNode content item.
 */
export function textContent(value: string): ASTNode['content'][0] {
  return { type: 'text', value, loc: DUMMY_LOC };
}

/**
 * Creates a default CompileContext for testing.
 *
 * @param overrides - Partial overrides for the context.
 * @returns A CompileContext.
 */
export function makeContext(overrides: Partial<CompileContext> = {}): CompileContext {
  return {
    config: DEFAULT_CONFIG,
    theme: resolveTheme(),
    warnings: [],
    parentWidth: 600,
    columnCount: 1,
    styleRules: [],
    responsiveClasses: [],
    counters: {
      componentCount: 0,
      cssPropertiesInlined: 0,
      cssPropertiesStripped: 0,
    },
    attributeDefaults: new Map(),
    namedClasses: new Map(),
    inlineStyleRules: [],
    title: '',
    debug: false,
    cleanSourceMap: false,
    templateStyle: 'attribute' as const,
    sourceMap: new NullSourceMapCollector(),
    ...overrides,
  };
}

/**
 * Creates a debug-enabled CompileContext for testing source map features.
 *
 * @param overrides - Partial overrides for the context.
 * @returns A CompileContext with debug:true, cleanSourceMap:true, and a live SourceMapCollector.
 */
export function makeDebugContext(overrides: Partial<CompileContext> = {}): CompileContext {
  return makeContext({ debug: true, cleanSourceMap: true, sourceMap: new SourceMapCollector(), ...overrides });
}

/**
 * Shortcut for a class-mode CompileContext. Use for tests that set
 * `node.attributes['class']` directly, since `templateStyle: 'attribute'`
 * (the library default and what `makeContext()` mirrors) rejects `class=`.
 */
export function makeClassContext(overrides: Partial<CompileContext> = {}): CompileContext {
  return makeContext({ templateStyle: 'class', ...overrides });
}

/**
 * Creates a node with text content shortcut.
 *
 * @param type       - Component type.
 * @param text       - Text content string.
 * @param attributes - Attributes.
 * @param children   - Children.
 * @returns An ASTNode with text content populated.
 */
export function makeNodeWithText(
  type: string,
  text: string,
  attributes: Record<string, string> = {},
  children: ASTNode[] = [],
): ASTNode {
  return makeNode(type, attributes, children, [textContent(text)]);
}
