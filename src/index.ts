/**
 * mailc — Public API
 *
 * This is the main entry point for the mailc library.
 * All public types and functions are exported from here.
 *
 * **Headline API** (the 7 functions most users need):
 * - `compile()`         — Compile `.mc` markup → email-safe HTML
 * - `compileFromJSON()` — Compile JSON template → email-safe HTML
 * - `validate()`        — Validate `.mc` markup without compiling
 * - `checkCss()`        — Check CSS declarations against email client compatibility
 * - `jsonToMarkup()`    — Convert JSON template → `.mc` markup
 * - `markupToJSON()`    — Convert `.mc` markup → JSON template
 * - `lintEmailHtml()`   — Lint compiled email HTML for best practices
 *
 * @module mailc
 */

// Types
export type {
  ASTNode,
  ASTContent,
  ASTTextNode,
  ASTExpressionNode,
  SourceLocation,
  SourcePosition,
  Severity,
  MCIssue,
  CompileResult,
  CompileStats,
  CompileOptions,
  ValidationResult,
  MailcConfig,
  ResponsiveConfig,
  DarkModeConfig,
  AccessibilityConfig,
  OutputConfig,
  TemplateEngineConfig,
  CSSProperty,
  CSSClassification,
  ClassifiedCSS,
  ComponentCompiler,
  CompileContext,
  ResolvedTheme,
  TemplateStyle,
  StylingConfig,
  CompatibilityMode,
  GmailClipRisk,
  Plugin,
  RegistryView,
} from './types.js';

// Error system
export { ErrorCode } from './errors/index.js';
export { MCError } from './errors/index.js';
export { formatError, formatErrors } from './errors/index.js';

// Tokenizer (Phase 1)
export { tokenize } from './tokenizer/index.js';
export { TokenType } from './tokenizer/tokens.js';
export type { Token } from './tokenizer/index.js';

// Parser (Phase 2)
export { parse } from './parser/index.js';

// Validator (Phase 3)
export { validate } from './validate.js';
export type { ValidateInput, ValidateOptions } from './validate.js';

// CSS Checking — top-level convenience API (Phase 15)
export { checkCss } from './css/index.js';

// Config (Phase 4)
export { DEFAULT_CLIENTS, DEFAULT_CONFIG, mergeConfig, resolveTargetClients, defineConfig } from './config.js';

// CSS — Theme & Class Resolver (Phase 4)
export { DEFAULT_THEME, resolveTheme, resolveClass, resolveColor, remToPx } from './css/index.js';
export type { UserThemeConfig, ResolveClassResult } from './css/index.js';

// CSS — Shorthand, Classifier, Checker (Phase 5)
export { expandShorthand, expandAllShorthands } from './css/index.js';
export { classifyProperty, classifyProperties, filterByClassification, buildClassificationMap } from './css/index.js';
export { checkCSS, checkIssuesToMCIssues, clearCheckerCache } from './css/index.js';
export type { CSSCheckIssue, CSSCheckResult } from './css/index.js';

// CSS — Inliner, Media Queries (Phase 6)
export { inlineCSS } from './css/index.js';
export type { InlineResult } from './css/index.js';
export { resolveResponsiveClasses, buildMediaBlock, processResponsiveClasses } from './css/index.js';
export type { ResponsiveRule, MediaQueryResult } from './css/index.js';

// Compiler (Phase 7)
export { compileNode, compileChildren, getTextContent, COMPONENT_COMPILERS } from './compiler/index.js';
export { extractHeadData } from './compiler/components/head.js';
export type { HeadData } from './compiler/components/head.js';
export { collectAndInline } from './compiler/style-collector.js';
export type { CollectedInlineResult } from './compiler/style-collector.js';

// Compile Orchestrator (Phase 8)
export { compile } from './compile.js';

// Bound-compiler factory — multi-instance, stateless plugin usage.
export { createCompiler } from './create-compiler.js';
export type { CreateCompilerOptions, MailcCompiler } from './create-compiler.js';

// Source Map utilities (SM-E)
export { calculateOffsets } from './compiler/source-map-offsets.js';
export { lookupByOffset, lookupByOutputLine, lookupBySourceLine } from './compiler/source-map-lookup.js';
export type {
  EmailSourceMap,
  SourceMapEntry,
  OutputRole,
  StyleOrigin,
  ExpressionResolution,
  ConditionalInfo,
  LoopInfo,
  PropertySupport,
} from './types.js';

// JSON → Email (Phase 10)
export { compileFromJSON, validateDocument, jsonToAST, parseContent, jsonToMarkup, markupToJSON, astToMCNode, normalizeJSON } from './json/index.js';
export type {
  MCNode,
  MCDocument,
  MCMetadata,
  MCComponentType,
  MCLogicType,
  MCNodeType,
  MCDataSchema,
  SchemaField,
  MCAttributeTargetType,
} from './json/index.js';

// Post-Processor (Phase 8)
export { assemble } from './post-processor/index.js';
export { optimize } from './post-processor/index.js';

// Template Resolution (Phase 10.5)
export {
  resolveTemplate,
  resolvePath,
  parseExpression,
  resolveContent,
  resolveAttributes,
  evaluateCondition,
  expandEach,
  applyFormatters,
} from './template/index.js';
export type {
  TemplateData,
  Formatter,
  FormatterMap,
  ParsedExpression,
  FormatterCall,
} from './template/index.js';

// Lint (Phase 11)
export { lintEmailHtml, getLintRuleIds, getLintRule } from './lint/index.js';
export type {
  LintIssue,
  LintOptions,
  LintRuleId,
  LintRule,
  LintSeverity,
  LintCategory,
} from './lint/index.js';

// Introspection API (Phase 8 + data contract)
export { introspect } from './introspect/index.js';
export type {
  DataContract,
  DataContractField,
  DataContractLoop,
  DataContractLocation,
} from './introspect/index.js';

// Plugin API — author custom components as values, pass per call.
export {
  defineComponent,
  getRegisteredComponents,
  isComponentRegistered,
} from './define-component.js';
export type { DefineComponentSpec } from './define-component.js';
// Re-export the types plugin authors need to write valid metadata + compilers.
export type {
  ComponentMetadata,
  AttributeMetadata,
} from './components/metadata.js';
// (ComponentCompiler is already exported above as part of the core types block.)
export type { MCAnyComponentType } from './json/schema.js';

// ─── Plugin author utilities ────────────────────────────────────────────────
// HTML escape + theme/CSS-classification helpers for plugin compile functions.
export { escapeHtml, unescapeHtml } from './utils/html-escape.js';
export { themeColor, warnCss } from './plugin-utils.js';
// Class-mode enforcement — opt-in for plugin compilers that want the same
// CSS-attribute checks built-ins perform when `templateStyle: 'class'`.
export {
  assertClassModeAttributes,
  assertAttributeModeClass,
} from './compiler/styling-mode.js';
