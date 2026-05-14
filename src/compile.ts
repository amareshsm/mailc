/**
 * Compile orchestrator — the end-to-end pipeline for static templates.
 *
 * Wires together all compiler stages:
 * `tokenize()` → `parse()` → `validate()` → `compileNode()` → `assemble()` → `optimize()`
 *
 * Template resolution (`{{ }}`, `mc-if`, `mc-each`) is NOT included here —
 * that's Phase 11. This handles static markup only.
 *
 * @module compile
 */

import type {
  CompileResult,
  CompileOptions,
  CompileStats,
  CompileContext,
  MCIssue,
} from './types.js';
import type { MCNode } from './json/schema.js';
import { astToMCNode } from './json/markup-to-json.js';
import { mergeConfig, resolveTargetClients } from './config.js';
import { resolveTheme } from './css/theme-resolver.js';
import { buildClassificationMap, buildPassthroughMap, buildProbeCSS } from './css/classifier.js';
import { buildPropertySupportMap } from './css/checker.js';
import { tokenize } from './tokenizer/index.js';
import { parse } from './parser/index.js';
import { validate } from './validator/index.js';
import { compileNode } from './compiler/index.js';
import { assemble } from './post-processor/assembler.js';
import { optimize } from './post-processor/optimizer.js';
import { applyInlineStyleRules } from './post-processor/inline-styles.js';
import { applyA11yPostProcessing } from './post-processor/accessibility.js';
import { applyDarkMode } from './post-processor/dark-mode.js';
import { checkColorContrast } from './post-processor/contrast-checker.js';
import { MCError } from './errors/mc-error.js';
import { ErrorCode } from './errors/codes.js';
import { resolveTemplate } from './template/index.js';
import { SourceMapCollector } from './compiler/source-map-collector.js';
import { NullSourceMapCollector } from './compiler/null-source-map-collector.js';
import { calculateOffsets } from './compiler/source-map-offsets.js';
import { calculateIdOffsets } from './compiler/source-map-id-offsets.js';
import { checkEmailBudget } from './compiler/email-budget.js';
import { markCompileStarted } from './registry/component-registry.js';
// Side-effect import: built-ins must be seeded before the first compile.
import './registry/init.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compiles mailc markup into email-ready HTML.
 *
 * Pipeline:
 * 1. Tokenize the source string.
 * 2. Parse tokens into an AST.
 * 3. Validate the AST structure.
 * 4. Compile the AST into HTML (with CSS inlining).
 * 5. Assemble: inject ENHANCE style rules and responsive media queries.
 * 6. Optimize: remove comments, collapse whitespace, minify.
 * 7. Collect statistics.
 *
 * Errors during tokenization/parsing are fatal — `html` will be `null` and `partial` will be `false`.
 * Validation errors populate `result.errors` but compilation continues —
 * `html` will contain best-effort output and `partial` will be `true`.
 * Check `result.partial` and `result.errors` before sending to production.
 * Use `--strict` mode (CLI) or check `result.errors.length` to gate production sends.
 *
 * @param source  - The mailc markup source string.
 * @param options - Optional compile options. Key fields:
 *   - `templateStyle` — `'attribute'` (default) accepts CSS-property attributes
 *     directly on mc-components (e.g. `color="red"`). `'class'` (limited support)
 *     enforces Tailwind-style class usage and bans CSS-property attributes.
 *     Some attributes have no class equivalent — see docs for the gap list.
 *   - `config` — project-wide config overrides (e.g. theme, target clients).
 *   - `data` — template data for `{{ variable }}` interpolation.
 * @returns The compile result with HTML output, errors, warnings, and stats.
 */
export function compile(
  source: string,
  options: CompileOptions = {},
): CompileResult {
  const startTime = performance.now();
  // Lock the plugin registry so any subsequent defineComponent() call throws
  // a clear error rather than silently changing the registry mid-flight.
  markCompileStarted();
  // Use string length as a fast approximation of byte size for stats.
  // Exact UTF-8 byte counting via TextEncoder is unnecessary for statistics
  // and allocates a full buffer on every compilation.
  const inputSize = source.length;

  const config = mergeConfig(options.config);
  // `targetClients` has three input shapes (undefined | 'default' | string[])
  // — resolve here so the rest of the pipeline operates on a plain string[]
  // or `undefined`.
  const targetClients = resolveTargetClients(
    options.targetClients ?? config.targetClients,
  );
  const theme = resolveTheme(options.theme);
  const errors: MCIssue[] = [];
  const warnings: MCIssue[] = [];
  const info: MCIssue[] = [];
  const debug = options.debug === true;
  const cleanSourceMap = options.sourceMap === true;
  const templateStyle = options.templateStyle ?? config.styling.templateStyle;
  const compatibilityMode = options.compatibilityMode ?? config.compatibilityMode;
  // Either flag activates the source map collector
  const needsSourceMap = debug || cleanSourceMap;

  // Build the CSS classification map. `targetClients === undefined` means
  // the caller opted out of caniemail-driven gating — return a PassthroughMap
  // (ENHANCE → SAFE). Hardcoded ALWAYS_BREAKING / ALWAYS_NO_EFFECT rules
  // still apply in either mode, enforced inside `classifyProperty()`.
  const classificationMap = targetClients === undefined
    ? buildPassthroughMap()
    : buildClassificationMap(targetClients);

  // ── Stage 1: Tokenize ──────────────────────────────────────────────
  let tokens;
  try {
    tokens = tokenize(source);
  } catch (err) {
    const issue = mcErrorToIssue(err, options.filename);
    errors.push(issue);
    return buildResult(null, errors, warnings, info, inputSize, startTime);
  }

  // ── Stage 2: Parse ─────────────────────────────────────────────────
  let ast;
  try {
    ast = parse(tokens);
  } catch (err) {
    const issue = mcErrorToIssue(err, options.filename);
    errors.push(issue);
    return buildResult(null, errors, warnings, info, inputSize, startTime);
  }

  // Snapshot the parsed tree into the public JSON IR for `result.json`.
  // Done HERE — immediately after parse, before validation, template
  // resolution (Stage 3b), or compilation — so the captured tree mirrors
  // exactly what `markupToJSON(source)` would return. `astToMCNode` creates
  // a fresh MCNode tree, so subsequent mutations to `ast` (Stage 3b's
  // template resolver replaces ast.children[0]) don't bleed in.
  const parsedJson: MCNode | undefined = (() => {
    const rootChild = ast.children[0];
    if (!rootChild) return undefined;
    return astToMCNode(rootChild);
  })();

  // STRICT_MODE_MCSTYLE_BYPASS heads-up. Fires once per compile when both
  // (a) the caller opted into strict mode AND (b) any <mc-style> block is
  // present in the source. mc-style content is a deliberate escape hatch —
  // it never goes through the classifier — so strict-mode users running
  // CI gates need to know the gate has this documented hole.
  if (compatibilityMode === 'strict') {
    const mcStyleCount = countNodesOfType(ast, 'mc-style');
    if (mcStyleCount > 0) {
      info.push({
        code: ErrorCode.STRICT_MODE_MCSTYLE_BYPASS,
        message:
          `Compatibility mode 'strict' is active and ${mcStyleCount} <mc-style> ` +
          `block${mcStyleCount === 1 ? '' : 's'} ${mcStyleCount === 1 ? 'was' : 'were'} detected. ` +
          `CSS rules inside mc-style are NOT classified or stripped — they pass through verbatim. ` +
          `If you need full strict enforcement (e.g. for CI), lint mc-style content separately.`,
        severity: 'info',
      });
    }
  }

  // ── Stage 3: Validate ──────────────────────────────────────────────
  const validation = validate(ast);
  errors.push(...validation.errors);
  warnings.push(...validation.warnings);

  // Compilation continues even with validation errors (best-effort output).
  // `partial` is derived from errors.length at Stage 7 — no need to track separately.

  // ── Stage 3b: Template Resolution (when data is provided) ──────────
  if (options.data) {
    const rootNode = ast.children[0];
    if (rootNode) {
      const onMissing = config.templateEngine.strictVariables
        ? (info: { path: string; expression: string; loc?: import('./types.js').SourceLocation }) => {
            errors.push({
              code: ErrorCode.UNDEFINED_VARIABLE,
              message: `Template variable "${info.path}" is not defined in data (strictVariables mode).`,
              severity: 'error',
              loc: info.loc
                ? { line: info.loc.start.line, col: info.loc.start.col }
                : undefined,
            });
          }
        : undefined;
      ast = {
        ...ast,
        children: [resolveTemplate(rootNode, options.data, options.formatters, needsSourceMap, onMissing), ...ast.children.slice(1)],
      };
    }
  }  // ── Stage 4: Compile ───────────────────────────────────────────────
  const counters = {
    componentCount: 0,
    cssPropertiesInlined: 0,
    cssPropertiesStripped: 0,
  };

  const context: CompileContext = {
    config,
    theme,
    warnings: [],
    parentWidth: config.width,
    columnCount: 1,
    responsiveClasses: [],
    counters,
    attributeDefaults: new Map(),
    namedClasses: new Map(),
    inlineStyleRules: [],
    title: '',
    classificationMap,
    debug,
    cleanSourceMap,
    templateStyle,
    compatibilityMode,
    // Source-map enrichment only — needs the per-client support breakdown to
    // annotate each emitted CSS declaration. When the caller opted out of
    // client gating (`targetClients === undefined`), there's no client
    // dataset to consult, so leave the map undefined.
    propertySupportMap: needsSourceMap && targetClients !== undefined
      ? buildPropertySupportMap(targetClients, buildProbeCSS())
      : undefined,
    sourceMap: needsSourceMap ? new SourceMapCollector() : new NullSourceMapCollector(),
  };

  // The parser wraps everything in a synthetic "root" node.
  // Extract the first child (should be <mc>) for compilation.
  const rootNode = ast.children[0];
  if (!rootNode || rootNode.type !== 'mc') {
    errors.push({
      code: 'EMPTY_DOCUMENT',
      message: 'Document must start with <mc>.',
      severity: 'error',
      fix: 'Wrap: <mc><mc-head>...</mc-head><mc-body>...</mc-body></mc>',
    });
    return buildResult(null, errors, warnings, info, inputSize, startTime, false, parsedJson);
  }

  let rawHTML: string;
  try {
    rawHTML = compileNode(rootNode, context);
  } catch (err) {
    const issue = mcErrorToIssue(err, options.filename);
    errors.push(issue);
    for (const w of separateWarnings(context.warnings, info)) {
      if (
        w.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE ||
        w.code === ErrorCode.CLASS_ATTR_IN_ATTRIBUTE_MODE
      ) {
        errors.push(w);
      } else {
        warnings.push(w);
      }
    }
    return buildResult(null, errors, warnings, info, inputSize, startTime, false, parsedJson);
  }

  // Route issues collected during compilation by error code.
  // Styling-mode violations (CSS_ATTR_IN_CLASS_MODE and CLASS_ATTR_IN_ATTRIBUTE_MODE)
  // go to result.errors so partial:true is set and callers can gate on them.
  // All other issues go to result.warnings — including a11y issues that carry
  // severity:'error' but are intentionally non-blocking for the compilation result.
  for (const w of separateWarnings(context.warnings, info)) {
    if (
      w.code === ErrorCode.CSS_ATTR_IN_CLASS_MODE ||
      w.code === ErrorCode.CLASS_ATTR_IN_ATTRIBUTE_MODE
    ) {
      errors.push(w);
    } else {
      warnings.push(w);
    }
  }

  // ── Stage 5: Assemble ──────────────────────────────────────────────
  const assembled = assemble(rawHTML, context);

  // Collect any additional assembler warnings
  // (assembler may add responsive warnings — already pushed to context)

  // ── Stage 5.5: Inline Style Rules ─────────────────────────────────
  // Apply mc-style inline="true" rules to matching HTML elements
  const withInlineStyles = applyInlineStyleRules(assembled, context);

  // ── Stage 5.55: Dark Mode Post-Processing ─────────────────────────
  // Inject color-scheme meta tags + @media(prefers-color-scheme:dark) overrides
  const darkModeResult = applyDarkMode(withInlineStyles, config.darkMode);
  const withDarkMode = darkModeResult.html;

  // ── Stage 5.6: Accessibility Post-Processing ───────────────────────
  const a11yResult = applyA11yPostProcessing(withDarkMode, {
    enabled: config.accessibility.enabled,
    title: context.title,
  });
  warnings.push(...a11yResult.issues.filter((i) => i.severity === 'warning'));
  info.push(...a11yResult.issues.filter((i) => i.severity === 'info'));
  const withA11y = a11yResult.html;

  // ── Stage 5.7: Contrast Check ─────────────────────────────
  if (config.accessibility.checkContrast) {
    const contrastIssues = checkColorContrast(withA11y);
    warnings.push(...contrastIssues.filter((i) => i.severity === 'warning'));
    info.push(...contrastIssues.filter((i) => i.severity === 'info'));
  }

  // ── Stage 6: Optimize ──────────────────────────────────────────────
  const html = optimize(withA11y, config.output, debug);

  // ── Stage 6.5: Gmail clip budget check ────────────────────────────
  // Empty client list → `targetsGmail([])` is false → result is
  // `not-targeted`. Same shape as passing the real list, no branching.
  const outputSize = html.length;
  const budgetResult = checkEmailBudget(outputSize, targetClients ?? []);
  if (budgetResult.issue !== null) {
    warnings.push(budgetResult.issue);
  }

  // ── Stage 7: Build result ──────────────────────────────────────────
  const compileTime = performance.now() - startTime;

  const stats: CompileStats = {
    inputSize,
    outputSize,
    compileTime,
    components: counters.componentCount,
    cssPropertiesInlined: counters.cssPropertiesInlined,
    cssPropertiesStripped: counters.cssPropertiesStripped,
    mediaQueriesGenerated: context.responsiveClasses.length > 0 ? 1 : 0,
    gmailClipRisk: budgetResult.gmailClipRisk,
  };

  const result: CompileResult = {
    html,
    errors,
    warnings,
    info,
    partial: errors.length > 0,
    stats,
    ...(parsedJson !== undefined ? { json: parsedJson } : {}),
  };

  // Attach source map when debug mode or clean source map was enabled
  if (needsSourceMap) {
    const builtMap = context.sourceMap.build({
      sourceFile: options.filename ?? '',
      outputFile: '',
      templateData: options.data ?? null,
      mailcVersion: '0.0.0',
      inputSize,
      outputSize,
    });
    if (builtMap) {
      if (debug) {
        // debug: true — marker-based offset calculation
        result.sourceMapComments = true;
        calculateOffsets(html, builtMap.entries);
      }
      if (cleanSourceMap) {
        // sourceMap: true — `optimize()` (Stage 6) already produced the final
        // HTML in either pretty or minified shape based on `config.output.minify`.
        // We only need to record where each `data-mc-id` ended up. We never
        // reformat here — that would be a second prettify pass on already-
        // formatted output.
        result.sourceMapIds = true;
        calculateIdOffsets(html, builtMap.entries);
        result.html = html;
      }
      result.sourceMap = builtMap;
      result.sourceMapJSON = JSON.stringify(builtMap, null, 2);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converts an MCError (or unknown error) into an MCIssue.
 *
 * @param err      - The caught error.
 * @param filename - Optional source filename for error location.
 * @returns An MCIssue representing the error.
 */
/**
 * Counts every node in an ASTNode tree whose `type` matches. Used by the
 * STRICT_MODE_MCSTYLE_BYPASS info heuristic — walking the AST is the
 * cheapest accurate count (mc-style usage in source, regardless of
 * whether a surrounding mc-if conditional drops it later).
 */
function countNodesOfType(node: import('./types.js').ASTNode, type: string): number {
  let count = node.type === type ? 1 : 0;
  for (const child of node.children) count += countNodesOfType(child, type);
  return count;
}

function mcErrorToIssue(err: unknown, filename?: string): MCIssue {
  if (err instanceof MCError) {
    return {
      code: err.code,
      message: err.message,
      severity: err.severity,
      loc: err.loc
        ? { line: err.loc.start.line, col: err.loc.start.col, file: filename }
        : undefined,
      fix: err.fix,
    };
  }

  return {
    code: 'INTERNAL_ERROR',
    message: err instanceof Error ? err.message : String(err),
    severity: 'error',
    loc: filename ? { line: 1, col: 1, file: filename } : undefined,
  };
}

/**
 * Separates info-severity issues from warnings and pushes info to the info array.
 *
 * @param allWarnings - All warnings from the compile context.
 * @param info        - Info accumulator (mutated).
 * @returns The filtered warnings (severity !== 'info').
 */
function separateWarnings(allWarnings: MCIssue[], info: MCIssue[]): MCIssue[] {
  const warnings: MCIssue[] = [];
  for (const w of allWarnings) {
    if (w.severity === 'info') {
      info.push(w);
    } else {
      warnings.push(w);
    }
  }
  return warnings;
}

/**
 * Builds a CompileResult with empty stats for early-exit error cases.
 *
 * @param html      - The HTML output (null on error).
 * @param errors    - Compilation errors.
 * @param warnings  - Compilation warnings.
 * @param info      - Informational messages.
 * @param inputSize - Input source size in bytes.
 * @param startTime - The `performance.now()` timestamp when compilation started.
 * @param partial   - `true` if output was produced despite validation errors.
 * @returns A complete CompileResult.
 */
function buildResult(
  html: string | null,
  errors: MCIssue[],
  warnings: MCIssue[],
  info: MCIssue[],
  inputSize: number,
  startTime: number,
  partial = false,
  json?: MCNode,
): CompileResult {
  return {
    html,
    partial,
    errors,
    warnings,
    info,
    stats: {
      inputSize,
      outputSize: 0,
      compileTime: performance.now() - startTime,
      components: 0,
      cssPropertiesInlined: 0,
      cssPropertiesStripped: 0,
      mediaQueriesGenerated: 0,
      gmailClipRisk: 'not-targeted',
    },
    ...(json !== undefined ? { json } : {}),
  };
}
