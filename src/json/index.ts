/**
 * JSON → Email entry point.
 *
 * `compileFromJSON()` is the star feature — visual builders produce JSON,
 * and we compile directly to email-safe HTML. No markup intermediary needed.
 *
 * Pipeline: MCNode → validate → convert to AST → compile → assemble → optimize → CompileResult
 *
 * @module json
 */

import type {
  CompileResult,
  CompileOptions,
  CompileStats,
  CompileContext,
  MCIssue,
} from '../types.js';
import type { MCNode, MCDocument } from './schema.js';
import { mergeConfig, resolveTargetClients } from '../config.js';
import { resolveTheme } from '../css/theme-resolver.js';
import { compileNode } from '../compiler/index.js';
import { buildClassificationMap, buildPassthroughMap, buildProbeCSS } from '../css/classifier.js';
import { buildPropertySupportMap } from '../css/checker.js';
import { assemble } from '../post-processor/assembler.js';
import { optimize } from '../post-processor/optimizer.js';
import { applyInlineStyleRules } from '../post-processor/inline-styles.js';
import { applyDarkMode } from '../post-processor/dark-mode.js';
import { applyA11yPostProcessing } from '../post-processor/accessibility.js';
import { checkColorContrast } from '../post-processor/contrast-checker.js';
import { validateJSON } from './validator.js';
import { jsonToAST } from './json-to-ast.js';
import { parseJSONWithPositions } from './json-position-parser.js';
import { resolveTemplate } from '../template/index.js';
import { NullSourceMapCollector } from '../compiler/null-source-map-collector.js';
import { SourceMapCollector } from '../compiler/source-map-collector.js';
import { calculateOffsets } from '../compiler/source-map-offsets.js';
import { calculateIdOffsets } from '../compiler/source-map-id-offsets.js';
import { checkEmailBudget } from '../compiler/email-budget.js';
import { ErrorCode } from '../errors/codes.js';

// Re-export sub-modules for barrel
// Note: `validateJSON` is intentionally NOT re-exported from the public surface —
// the universal `validate()` (in src/validate.ts) covers JSON IR input.
// `validateJSON` remains an internal helper used by `validateDocument` and
// `compileFromJSON` (see imports above and below).
export { validateDocument, validateDataAgainstSchema } from './validator.js';
export { jsonToAST, parseContent } from './json-to-ast.js';
export { jsonToMarkup } from './json-to-markup.js';
export { markupToJSON, astToMCNode } from './markup-to-json.js';
export { normalizeJSON } from './normalize.js';
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
} from './schema.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compiles a JSON email template directly into email-safe HTML.
 *
 * Three input forms supported:
 * 1. **MCNode object** — the canonical builder input. Zero-overhead path.
 * 2. **MCDocument object** — full document wrapper with metadata.
 * 3. **JSON string** — when passed a string, the library parses it with a
 *    position-tracking JSON parser and threads real source positions through
 *    to source map entries. Use this when you want JSON-line click-to-source
 *    in playgrounds, IDE plugins, or error reporters. Parse errors surface
 *    as `JSON_PARSE_ERROR` issues with real line/col, no crash.
 *
 * Errors during validation are non-fatal — compilation continues and `html`
 * contains best-effort output. `result.partial` will be `true`.
 * Check `result.errors` and `result.partial` before sending to production.
 * Errors during compile/internal crash are fatal — `html` will be `null`.
 *
 * @param input   - MCNode/MCDocument object, or a JSON string.
 * @param options - Optional compile options (config overrides, etc.).
 * @returns A CompileResult with HTML output, errors, warnings, and stats.
 */
export function compileFromJSON(
  input: MCDocument | MCNode | string,
  options: CompileOptions = {},
): CompileResult {
  const startTime = performance.now();
  const errors: MCIssue[] = [];
  const warnings: MCIssue[] = [];
  const info: MCIssue[] = [];

  // ── Stage 0: Normalize input ──────────────────────────────────────
  // String input → position-tracking parse. Errors are surfaced and we
  // bail early with a null html (same shape as a crash inside compile()).
  // Object inputs skip this entirely — the existing fast path is unchanged.
  let parsedInput: MCDocument | MCNode;
  if (typeof input === 'string') {
    const inputSize = new TextEncoder().encode(input).length;
    const parseResult = parseJSONWithPositions(input);
    if (parseResult.value === null || typeof parseResult.value !== 'object') {
      errors.push(...parseResult.errors);
      return buildResult(null, errors, warnings, info, inputSize, startTime);
    }
    // Non-fatal warnings (none today, but the parser may grow them later).
    errors.push(...parseResult.errors);
    parsedInput = parseResult.value as MCDocument | MCNode;
  } else {
    parsedInput = input;
  }

  // Extract the root node
  const rootNode = isDocument(parsedInput) ? parsedInput.template : parsedInput;

  // Snapshot for `result.json`. Deep-clone via JSON round-trip so callers
  // mutating result.json afterward can't reach back into the input they
  // passed us (or into ast nodes we later build). MCNode is plain data —
  // no functions, no Map/Set — so JSON.parse(JSON.stringify(...)) is safe
  // and cheap relative to the compile cost.
  const capturedJson: MCNode = JSON.parse(JSON.stringify(rootNode)) as MCNode;

  // Estimate input size from JSON
  const inputJSON = JSON.stringify(rootNode);
  const inputSize = new TextEncoder().encode(inputJSON).length;

  const config = mergeConfig(options.config);
  const theme = resolveTheme(options.theme);

  // STRICT_MODE_MCSTYLE_BYPASS heads-up — same logic as compile.ts. Fires
  // once when (a) strict mode AND (b) any <mc-style> block is present.
  // mc-style content sidesteps classification by design; this info lets
  // strict-mode CI users know the gate has a documented hole.
  const compatModeForCheck = options.compatibilityMode ?? config.compatibilityMode;
  if (compatModeForCheck === 'strict') {
    const mcStyleCount = countMCNodesOfType(rootNode, 'mc-style');
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

  // ── Stage 1: Validate JSON tree ────────────────────────────────────
  const validation = validateJSON(rootNode);
  errors.push(...validation.errors);
  warnings.push(...validation.warnings);

  // Compilation continues even with validation errors (best-effort output).
  // `partial` is derived from errors.length at the end — no need to track separately.

  // ── Stage 2: Convert JSON → AST ───────────────────────────────────
  // `templating: false` opts out of mailc's built-in templating engine —
  // content strings pass through verbatim (no `{{ }}` scanning) and the
  // template resolution stage is skipped. Builders that own data binding
  // themselves use this to avoid surprising users whose text contains
  // curly braces.
  const templating = options.templating !== false;
  let ast = jsonToAST(rootNode, { templating });

  // Compute before Stage 2b so resolveTemplate receives the correct debugMode flag.
  // debugMode enables wrapper nodes (_mc-loop-iteration, _mc-conditional-branch) that
  // are required for accurate source map entries on template expressions.
  const debug = options.debug === true;
  // `sourceMap: true` opts the JSON pipeline into clean-source-map mode —
  // the compiler injects `data-mc-id="<MCNode.id>"` on the root output element
  // of each component, giving builder UIs a stable bridge from compiled HTML
  // back to the source JSON node. Default stays opt-in to avoid silently
  // changing output bytes for existing JSON consumers.
  const cleanSourceMap = options.sourceMap === true;
  const needsSourceMap = debug || cleanSourceMap;

  // ── Stage 2b: Template Resolution (when data is provided) ─────────
  const templateData = options.data ?? (isDocument(parsedInput) ? parsedInput.sampleData : undefined);
  if (templating && templateData) {
    const onMissing = config.templateEngine.strictVariables
      ? (info: { path: string; expression: string; loc?: import('../types.js').SourceLocation }) => {
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
    ast = resolveTemplate(ast, templateData, options.formatters, needsSourceMap, onMissing);
  }

  // ── Stage 3: Compile AST → HTML ───────────────────────────────────
  const counters = {
    componentCount: 0,
    cssPropertiesInlined: 0,
    cssPropertiesStripped: 0,
  };
  // Same precedence as compile(): direct option > config > DEFAULT_CONFIG ('class').
  // Visual builders authoring class-based JSON get themable output by default;
  // legacy attribute-style JSON authors must opt in explicitly via
  // templateStyle:'attribute' or config.styling.templateStyle:'attribute'.
  const templateStyle = options.templateStyle ?? config.styling.templateStyle;

  // See compile.ts for the rationale on the three-way targetClients API.
  const targetClients = resolveTargetClients(
    options.targetClients ?? config.targetClients,
  );
  const classificationMap = targetClients === undefined
    ? buildPassthroughMap()
    : buildClassificationMap(targetClients);

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
    debug,
    cleanSourceMap,
    templateStyle,
    compatibilityMode: options.compatibilityMode ?? config.compatibilityMode,
    classificationMap,
    propertySupportMap: needsSourceMap && targetClients !== undefined
      ? buildPropertySupportMap(targetClients, buildProbeCSS())
      : undefined,
    sourceMap: needsSourceMap ? new SourceMapCollector() : new NullSourceMapCollector(),
  };

  let rawHTML: string;
  try {
    rawHTML = compileNode(ast, context);
  } catch (err) {
    const issue = errorToIssue(err);
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
    return buildResult(null, errors, warnings, info, inputSize, startTime, false, capturedJson);
  }

  // Route issues by error code: styling-mode violations (CSS_ATTR_IN_CLASS_MODE
  // and CLASS_ATTR_IN_ATTRIBUTE_MODE) go to result.errors; everything else
  // (including a11y severity:'error' items) stays in result.warnings.
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

  // ── Stage 4: Assemble ──────────────────────────────────────────────
  const assembled = assemble(rawHTML, context);

  // ── Stage 4.5: Inline Style Rules ─────────────────────────────────
  const withInlineStyles = applyInlineStyleRules(assembled, context);

  // ── Stage 4.55: Dark Mode Post-Processing ─────────────────────────
  // Inject color-scheme meta tags + @media(prefers-color-scheme:dark) overrides.
  // Same step as the markup pipeline at compile.ts Stage 5.55.
  const darkModeResult = applyDarkMode(withInlineStyles, config.darkMode);
  const withDarkMode = darkModeResult.html;

  // ── Stage 4.6: Accessibility Post-Processing ───────────────────────
  // Title / lang / dir injection + a11y warnings. Same step as the markup
  // pipeline at compile.ts Stage 5.6.
  const a11yResult = applyA11yPostProcessing(withDarkMode, {
    enabled: config.accessibility.enabled,
    title: context.title,
  });
  warnings.push(...a11yResult.issues.filter((i) => i.severity === 'warning'));
  info.push(...a11yResult.issues.filter((i) => i.severity === 'info'));
  const withA11y = a11yResult.html;

  // ── Stage 4.7: Contrast Check ─────────────────────────────────────
  // Same step as the markup pipeline at compile.ts Stage 5.7.
  if (config.accessibility.checkContrast) {
    const contrastIssues = checkColorContrast(withA11y);
    warnings.push(...contrastIssues.filter((i) => i.severity === 'warning'));
    info.push(...contrastIssues.filter((i) => i.severity === 'info'));
  }

  // ── Stage 5: Optimize ──────────────────────────────────────────────
  const html = optimize(withA11y, config.output, debug);

  // ── Stage 5.5: Gmail clip budget check ────────────────────────────
  const outputSize = new TextEncoder().encode(html).length;
  const budgetResult = checkEmailBudget(outputSize, targetClients ?? []);
  if (budgetResult.issue !== null) {
    warnings.push(budgetResult.issue);
  }

  // ── Stage 6: Build result ──────────────────────────────────────────
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

  const result: CompileResult = { html, errors, warnings, info, partial: errors.length > 0, stats, json: capturedJson };

  // Attach source map when debug mode or clean source map was enabled.
  // Mirrors the markup pipeline at compile.ts: debug uses HTML comment
  // markers for offset calculation, cleanSourceMap uses data-mc-id offsets
  // on the (optionally prettified) final HTML.
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
        result.sourceMapComments = true;
        calculateOffsets(html, builtMap.entries);
      }
      if (cleanSourceMap) {
        // `optimize()` (Stage 6) already produced the final HTML in pretty or
        // minified shape based on `config.output.minify`. Calculate id offsets
        // on it without reformatting — single source of truth for shape.
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
 * Type guard: is the input an MCDocument (vs a bare MCNode)?
 *
 * @param input - The input to check.
 * @returns `true` if the input has a `template` property (MCDocument shape).
 */
/**
 * Counts every node in an MCNode tree whose `type` matches. Mirrors the
 * AST-walking helper in compile.ts; used by the STRICT_MODE_MCSTYLE_BYPASS
 * info signal.
 */
function countMCNodesOfType(node: MCNode, type: string): number {
  let count = node.type === type ? 1 : 0;
  for (const child of node.children ?? []) count += countMCNodesOfType(child, type);
  return count;
}

function isDocument(input: MCDocument | MCNode): input is MCDocument {
  return 'template' in input && 'version' in input;
}

/**
 * Converts an unknown error into an MCIssue.
 *
 * @param err - The caught error.
 * @returns An MCIssue.
 */
function errorToIssue(err: unknown): MCIssue {
  if (err instanceof Error) {
    return {
      code: 'INTERNAL_ERROR',
      message: err.message,
      severity: 'error',
    };
  }
  return {
    code: 'INTERNAL_ERROR',
    message: String(err),
    severity: 'error',
  };
}

/**
 * Separates info-severity issues from warnings.
 *
 * @param allWarnings - All warnings from the compile context.
 * @param info        - Info accumulator (mutated).
 * @returns Filtered warnings (severity !== 'info').
 */
function separateWarnings(allWarnings: MCIssue[], info: MCIssue[]): MCIssue[] {
  const filtered: MCIssue[] = [];
  for (const w of allWarnings) {
    if (w.severity === 'info') {
      info.push(w);
    } else {
      filtered.push(w);
    }
  }
  return filtered;
}

/**
 * Builds a CompileResult with empty stats for early-exit error cases.
 *
 * @param html      - The HTML output (null on error).
 * @param errors    - Compilation errors.
 * @param warnings  - Compilation warnings.
 * @param info      - Informational messages.
 * @param inputSize - Input JSON size in bytes.
 * @param startTime - Performance timestamp when compilation started.
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
