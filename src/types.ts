/**
 * mailc — Shared type definitions
 *
 * All interfaces and types used across the compiler pipeline.
 * This is the single source of truth for data shapes.
 */

// ---------------------------------------------------------------------------
// Component attribute & category primitives
// ---------------------------------------------------------------------------

/**
 * Semantic value type for a component attribute.
 * Single source of truth — imported by both metadata.ts and introspect/types.ts.
 */
export type AttributeValueType =
  | 'string'
  | 'url'
  | 'color'
  | 'number'
  | 'enum'
  | 'boolean'
  | 'css-value'
  | 'tailwind-classes';

/**
 * Broad category that describes where a component lives in the tree.
 * Single source of truth — imported by both metadata.ts and introspect/types.ts.
 *
 * - `container` — wraps other components (mc-body, mc-section, mc-column)
 * - `content`   — leaf nodes that render visible content (mc-text, mc-image …)
 * - `head`      — metadata / style nodes inside `<mc-head>`
 * - `logic`     — template directives (mc-if, mc-each …)
 */
export type ComponentCategory = 'container' | 'content' | 'head' | 'logic';

/**
 * Broad groupings of CSS properties used by the introspection API to
 * describe which kinds of styles a component meaningfully accepts.
 *
 * - `typography`  — color, font-*, line-height, letter-spacing, text-*, vertical-align
 * - `background`  — background-color, background-image, …
 * - `border`      — border, border-*, border-radius
 * - `spacing`     — margin-*, padding-*
 * - `sizing`      — width, height, min-*, max-*
 * - `display`     — display, overflow, position
 * - `layout`      — flex, grid (BREAKING in email — documented for rejection reasons)
 * - `effects`     — box-shadow, opacity (ENHANCE — partial client support)
 */
export type CSSCategory =
  | 'typography'
  | 'background'
  | 'border'
  | 'spacing'
  | 'sizing'
  | 'display'
  | 'layout'
  | 'effects';

// ---------------------------------------------------------------------------
// Source Location
// ---------------------------------------------------------------------------

/** Tracks a position (line, column, offset) in source code. */
export interface SourcePosition {
  /** 1-based line number. */
  line: number;
  /** 1-based column number. */
  col: number;
  /** 0-based character offset from start of source. */
  offset: number;
}

/** A range in source code from start to end. */
export interface SourceLocation {
  start: SourcePosition;
  end: SourcePosition;
}

// ---------------------------------------------------------------------------
// AST
// ---------------------------------------------------------------------------

/** A node in the mailc Abstract Syntax Tree. */
export interface ASTNode {
  /**
   * Optional caller-provided stable identity for this node.
   *
   * Populated when the input is JSON (`MCNode.id`). When set and the source
   * map collector is active, this id becomes the entry id and is emitted as
   * `data-mc-id` on the root output element of the component — giving builder
   * UIs a stable bridge from compiled HTML back to the source JSON node.
   *
   * Markup-input nodes leave this undefined; collectors fall back to their
   * sequential `entry-N` counter, preserving existing behavior.
   */
  id?: string;
  /** Component type: "mc-body", "mc-text", "mc-if", etc. */
  type: string;
  /** Key-value attribute pairs from the tag. */
  attributes: Record<string, string>;
  /** Child component nodes. */
  children: ASTNode[];
  /** Mixed text and expression content (for leaf nodes like mc-text). */
  content: ASTContent[];
  /** Source location of this node. */
  loc: SourceLocation;
  /**
   * Debug metadata populated during template resolution when `debug: true`.
   * Internal use only — do not set or read outside the template/compiler pipeline.
   */
  _debug?: ASTDebugMeta;
}

/**
 * Debug metadata attached to ASTNode during template resolution.
 * Only populated when `compile()` is called with `{ debug: true }`.
 */
export interface ASTDebugMeta {
  /** Expression resolutions for `{{...}}` expressions in this node's content. */
  expressions?: ExpressionResolution[];
  /** Loop iteration info for synthetic `_mc-loop-iteration` nodes. */
  loopInfo?: LoopInfo;
  /** Conditional branch info for synthetic `_mc-conditional-branch` nodes. */
  conditionalInfo?: ConditionalInfo;
}

/** Content inside a leaf node — either literal text or a template expression. */
export type ASTContent = ASTTextNode | ASTExpressionNode;

/** A literal text segment inside content. */
export interface ASTTextNode {
  type: 'text';
  /** The raw text value. */
  value: string;
  loc: SourceLocation;
}

/** A template expression segment: `{{variable}}` or `{{{raw}}}`. */
export interface ASTExpressionNode {
  type: 'expression';
  /** The expression path, e.g. "customer.firstName". */
  value: string;
  /** `true` for triple-brace `{{{ }}}` (raw, unescaped). */
  raw: boolean;
  /** Fallback value from `{{name || "there"}}`. */
  fallback?: string;
  loc: SourceLocation;
}

// ---------------------------------------------------------------------------
// Compiler Result
// ---------------------------------------------------------------------------

/** Severity level for issues. */
export type Severity = 'error' | 'warning' | 'info';

/** A single issue (error, warning, or info) from any pipeline stage. */
export interface MCIssue {
  /** Machine-readable error code, e.g. "INVALID_NESTING". */
  code: string;
  /** Human-readable message. */
  message: string;
  /** Severity level. */
  severity: Severity;
  /** Source location (if available). */
  loc?: {
    line: number;
    col: number;
    file?: string;
  };
  /** Suggested fix (if available). */
  fix?: string;
}

// ---------------------------------------------------------------------------
// Source Map
// ---------------------------------------------------------------------------

/**
 * The role an output HTML element plays in the compiled result.
 * Used in `SourceMapEntry.role` to describe what the element was produced for.
 */
export type OutputRole =
  | 'root'
  | 'doctype'
  | 'html-wrapper'
  | 'head-block'
  | 'style-block'
  | 'meta'
  | 'body-wrapper'
  | 'container-table'
  | 'container-row'
  | 'container-cell'
  | 'outlook-ghost-table'
  | 'outlook-ghost-row'
  | 'outlook-ghost-cell'
  | 'responsive-wrapper'
  | 'content-wrapper'
  | 'content'
  | 'outlook-vml'
  | 'pass-through'
  | 'loop-iteration'
  | 'conditional-branch';

/**
 * Email client support breakdown for a CSS property.
 * Derived from caniemail data at compile time.
 */
export interface PropertySupport {
  /** Clients with full support (no issues). May be empty when unknown. */
  supported: string[];
  /** Clients with partial support (caniemail warnings). */
  partial: string[];
  /** Clients without support (caniemail errors). */
  unsupported: string[];
}

/** Describes the CSS origin of a single style property in the source map. */
export interface StyleOrigin {
  /** CSS property name, e.g. "padding-top". */
  property: string;
  /** Resolved CSS value, e.g. "16px". */
  value: string;
  /** Where the style came from. */
  origin:
    | 'attribute'
    | 'tailwind-class'
    | 'mc-attributes'
    | 'mc-class'
    | 'component-default'
    | 'post-processor';
  /** The original class name or attribute value before resolution, if any. */
  originalValue?: string;
  /**
   * Email client support for this CSS property.
   * Populated from caniemail when `propertySupportMap` is available in CompileContext.
   * `undefined` when the property is unknown to caniemail.
   */
  support?: PropertySupport;
}

/** Tracks how a template expression was resolved at compile time. */
export interface ExpressionResolution {
  /** The raw expression string, e.g. "customer.name". */
  expression: string;
  /** The resolved string value. */
  resolvedValue: string;
  /** The data path segments, e.g. ["customer", "name"]. */
  dataPath: string[];
  /** True when the fallback was used instead of the data value. */
  usedFallback: boolean;
  /** The fallback value, if any. */
  fallbackValue?: string;
  /** Source location of the expression in the template. */
  sourceLoc?: { line: number; col: number };
  /** Byte offset in the output HTML where this expression appears. */
  outputOffset?: number;
}

/** Records which branch of an mc-if/mc-else-if/mc-else was taken. */
export interface ConditionalInfo {
  /** The directive type. */
  type: 'mc-if' | 'mc-else-if' | 'mc-else';
  /** The condition expression string (empty for mc-else). */
  condition: string;
  /** True when this branch was rendered in the output. */
  branchTaken: boolean;
}

/** Records loop metadata for an mc-each iteration. */
export interface LoopInfo {
  /** The expression that produced the iterable, e.g. "order.items". */
  itemsExpression: string;
  /** The loop variable name, e.g. "item". */
  loopVariable: string;
  /** 0-based iteration index. */
  iterationIndex: number;
  /** Total number of iterations. */
  totalIterations: number;
  /** The data object for this iteration. */
  iterationData: unknown;
}

/**
 * A single entry in the EmailSourceMap.
 *
 * Each entry corresponds to one mc-* component (or a sub-element emitted
 * by a component compiler) and records the mapping from source to output.
 */
export interface SourceMapEntry {
  /** Unique entry ID, e.g. "entry-1". */
  id: string;
  /** ID of the parent entry, or null for root entries. */
  parentId: string | null;
  /** The mc-* component type, e.g. "mc-section". */
  sourceComponent: string;
  /** Source location of the component in the template. */
  sourceLoc: {
    startLine: number;
    startCol: number;
    endLine: number;
    endCol: number;
  };
  /** The role this output element plays. */
  role: OutputRole;
  /** The HTML tag name of the primary output element. */
  outputTag: string;
  /**
   * Byte range in the output HTML for this entry.
   * Populated during SM-E (offset calculation pass). Null until then.
   */
  outputRange: { start: number; end: number } | null;
  /**
   * Line/column range in the output HTML for this entry.
   * Populated during SM-E (offset calculation pass). Null until then.
   */
  outputLoc: {
    startLine: number;
    startCol: number;
    endLine: number;
    endCol: number;
  } | null;
  /** CSS styles applied to this element, with provenance. */
  styles: StyleOrigin[];
  /** Template expressions resolved inside this component. */
  expressions: ExpressionResolution[];
  /** Conditional branch info (mc-if/else), if applicable. */
  conditional: ConditionalInfo | null;
  /** Loop iteration info (mc-each), if applicable. */
  loop: LoopInfo | null;
  /** The raw source attributes on the component tag. */
  sourceAttributes: Record<string, string>;
  /** IDs of direct child entries. */
  children: string[];
}

/** The top-level source map object attached to a CompileResult. */
export interface EmailSourceMap {
  /** Schema version — always 1. */
  version: 1;
  /** Path to the source template file (empty string if unknown). */
  sourceFile: string;
  /** Path to the output HTML file (empty string if unknown). */
  outputFile: string;
  /** The template data used during compilation. */
  templateData: unknown;
  /** The mailc library version. */
  mailcVersion: string;
  /** All source map entries (components + sub-elements). */
  entries: SourceMapEntry[];
  /** Aggregate statistics. */
  stats: {
    /** Number of mc-* components in the source template. */
    sourceComponents: number;
    /** Number of output HTML elements tracked. */
    outputElements: number;
    /** Ratio of output size to input size (always > 1 for email). */
    expansionRatio: number;
  };
}

// ---------------------------------------------------------------------------
// Compile Result
// ---------------------------------------------------------------------------

/** The result of a `compile()` call. */
export interface CompileResult {
  /**
   * The compiled HTML output.
   * `null` only if compilation could not even start — unparseable source
   * (unclosed tags, mismatched tags), missing `<mc>` root, or internal crash.
   * When validation errors are present but the AST was built successfully,
   * this is a best-effort partial output — always check `errors` before
   * sending to production.
   */
  html: string | null;
  /**
   * `true` when `html` was produced despite one or more validation errors.
   * `false` on a clean compile (no errors) or when `html` is `null`
   * (genuinely unrecoverable failure).
   */
  partial: boolean;
  /** Compilation errors (check before sending to production). */
  errors: MCIssue[];
  /** Compilation warnings (non-blocking). */
  warnings: MCIssue[];
  /** Informational messages. */
  info: MCIssue[];
  /** Compilation statistics. */
  stats: CompileStats;
  /**
   * `true` when `<!-- mc:source -->` debug comments were injected.
   * Only set when `options.debug === true`.
   */
  sourceMapComments?: boolean;
  /**
   * `true` when `data-mc-id` attributes were injected on component root elements.
   * Only set when `options.sourceMap === true`.
   */
  sourceMapIds?: boolean;
  /**
   * Structured source map — every compiled component with source → output mapping.
   * Present when `options.debug === true` or `options.sourceMap === true`.
   */
  sourceMap?: EmailSourceMap;
  /**
   * Pre-serialized JSON string of `sourceMap`.
   * Present when `options.debug === true` or `options.sourceMap === true`.
   */
  sourceMapJSON?: string;
  /**
   * The parsed component tree as a JSON IR (`MCNode`).
   *
   * Captured immediately after parsing succeeds and BEFORE template resolution
   * (data substitution, `mc-each` expansion, `mc-if` pruning) and BEFORE
   * compilation. Equivalent to calling `markupToJSON(source)` standalone, but
   * exposed here as a convenience so consumers that need both HTML and the
   * parsed tree avoid a duplicate tokenize+parse pass.
   *
   * Note: this is the public JSON IR shape (`MCNode`), **not** the internal
   * compiler `ASTNode`. The two differ — `MCNode.content` is a plain string,
   * `ASTNode.content` is a structured array of text/expression pieces. If you
   * need the structured form, call `parse()` directly.
   *
   * - Defined whenever parsing produced a tree — even on partial output
   *   (validation errors), missing-root errors, or compiler crashes — useful
   *   for debugging.
   * - Undefined only when tokenisation or parsing threw, in which case `html`
   *   is also `null`.
   * - The returned tree is a fresh structure — mutating it does not affect
   *   future compiles.
   */
  json?: import('./json/schema.js').MCNode;
}

/**
 * Gmail clip risk level based on output HTML size.
 *
 * Gmail silently clips emails whose raw HTML exceeds ~102KB, showing a
 * "Message clipped" link. The risk level is only populated when the
 * compiled config targets a Gmail client (`targetClients` contains a
 * `gmail.*` or `gmail.<variant>` pattern). Otherwise it is `'not-targeted'`.
 *
 * - `'safe'`          — under 85KB; well within the budget
 * - `'approaching'`   — 85–102KB; nearing the clip threshold
 * - `'exceeded'`      — over 102KB; Gmail will clip the email
 * - `'not-targeted'`  — Gmail is not in `targetClients`; no check performed
 */
export type GmailClipRisk = 'safe' | 'approaching' | 'exceeded' | 'not-targeted';

/** Statistics collected during compilation. */
export interface CompileStats {
  /** Input source size in bytes. */
  inputSize: number;
  /** Output HTML size in bytes. */
  outputSize: number;
  /** Total compile time in milliseconds. */
  compileTime: number;
  /** Number of mc-* components processed. */
  components: number;
  /** Number of CSS properties inlined into style="". */
  cssPropertiesInlined: number;
  /** Number of CSS properties stripped (BREAKING/NO_EFFECT). */
  cssPropertiesStripped: number;
  /** Number of @media queries generated from sm: classes. */
  mediaQueriesGenerated: number;
  /**
   * Gmail clip risk based on the compiled output size.
   * Only meaningful when `targetClients` includes a Gmail variant.
   * See {@link GmailClipRisk} for the full range of values.
   */
  gmailClipRisk: GmailClipRisk;
}

/**
 * Options passed to the `compile()` function.
 *
 * **Precedence:** When an option exists in both direct form (e.g. `templateStyle`)
 * and in `config.styling.templateStyle`, the direct form takes precedence silently.
 * Avoid setting the same option in both places — it's easy to miss.
 *
 * **Three-way config merge order (highest to lowest precedence):**
 * 1. Direct options: `compile(source, { templateStyle: 'attribute', ... })`
 * 2. Config object: `compile(source, { config: mergeConfig({ styling: { templateStyle: '...' } }) })`
 * 3. Defaults: `DEFAULT_CONFIG` in `src/config.ts`
 */
export interface CompileOptions {
  /** Template data for variable resolution. */
  data?: Record<string, unknown>;
  /**
   * CSS compatibility mode for this compilation.
   *
   * - `'liberal'` *(default)*: All CSS properties with any email-client support are inlined.
   *   Clients that support a property render it; unsupporting clients silently ignore it.
   *   No warning emitted — graceful degradation is intentional.
   * - `'strict'`: ENHANCE properties are stripped entirely and a warning is emitted per
   *   property. Use this when you need pixel-identical rendering across all `targetClients`
   *   — typically B2B / corporate-Outlook scenarios.
   *
   * **Precedence:** Direct option wins over `config.compatibilityMode`. Do not set in both places.
   *
   * @default 'liberal'
   */
  compatibilityMode?: CompatibilityMode;
  /**
   * Which email clients to compile against.
   *
   * Three modes:
   *
   * - **Omitted** *(default)*: no client-specific gating. ENHANCE properties
   *   inline directly; hardcoded structural safety (ALWAYS_BREAKING /
   *   ALWAYS_NO_EFFECT) still applies, so `display:flex`, `position:absolute`,
   *   `transition`, etc. are still stripped. This is the "I don't care which
   *   clients my users have" mode — output works in modern clients, degrades
   *   gracefully where it doesn't.
   *
   * - **`'default'`**: enable caniemail-driven gating against the curated
   *   default client set (`DEFAULT_CLIENTS` — Gmail, Apple Mail, Outlook,
   *   Yahoo, Samsung Android). Properties that any of these clients don't
   *   support are classified ENHANCE.
   *
   * - **`string[]`**: custom client glob list (e.g. `['gmail.web', 'outlook.web']`).
   *   Gating runs against exactly this set.
   *
   * **Precedence:** Direct option wins over `config.targetClients`.
   *
   * @example
   * compile(source)                                                  // omitted: no gating
   * compile(source, { targetClients: 'default' })                    // standard 5 clients
   * compile(source, { targetClients: ['apple-mail.*', 'gmail.*'] })  // custom
   */
  targetClients?: string[] | 'default';
  /**
   * Named formatter callbacks for template pipe syntax.
   * Each formatter receives the resolved value and optional string args.
   * Example: `{ currency: (v) => '$' + (Number(v) / 100).toFixed(2) }`
   */
  formatters?: Record<string, (value: unknown, ...args: string[]) => string>;
  /** Config overrides (merged with config file). */
  config?: Partial<MailcConfig>;
  /**
   * Theme token overrides — extend any built-in theme scale with custom values.
   *
   * All 12 scales are supported via `extend`:
   * - **`colors`** — custom named colors (flat strings or nested shade objects).
   *   e.g. `{ brand: '#e11d48' }` enables `bg-brand text-brand`.
   *   Nested: `{ brand: { DEFAULT: '#e11d48', dark: '#9f1239' } }` enables `bg-brand` and `bg-brand-dark`.
   * - **`spacing`** — custom spacing tokens (used by `p-*`, `m-*`, `gap-*`, etc.).
   *   e.g. `{ '72': '288px', '84': '336px' }` enables `p-72`, `mt-84`.
   * - **`fontSize`** — custom font sizes for `text-*` utilities.
   *   e.g. `{ 'hero': '48px' }` enables `text-hero`.
   *   Tuple form also supported: `{ 'hero': ['48px', { lineHeight: '56px' }] }`.
   * - **`fontFamily`** — custom font stacks for `font-*` utilities.
   *   e.g. `{ 'brand': ['Roboto', 'sans-serif'] }` enables `font-brand`.
   * - **`fontWeight`** — custom font weights for `font-*` utilities.
   * - **`lineHeight`** — custom line heights for `leading-*` utilities.
   * - **`letterSpacing`** — custom tracking values for `tracking-*` utilities.
   * - **`borderRadius`** — custom radii for `rounded-*` utilities.
   * - **`borderWidth`** — custom widths for `border-*` utilities.
   * - **`maxWidth`** — custom max-widths for `max-w-*` utilities.
   * - **`width`** — custom widths for `w-*` utilities.
   * - **`height`** — custom heights for `h-*` utilities.
   *
   * User values are **merged on top of defaults** — you cannot remove a built-in
   * token, only add or override. Pass `rem` values freely — they are automatically
   * converted to `px` (email clients do not support `rem`).
   */
  theme?: import('./css/theme-resolver.js').UserThemeConfig;
  /** Source file path (for error reporting). */
  filename?: string;
  /**
   * Enable debug mode.
   *
   * When `true`:
   * - Injects `<!-- mc:source -->` HTML comments marking component boundaries.
   * - Attaches `result.sourceMap` (structured JSON) and `result.sourceMapJSON`.
   * - `<!-- mc:source -->` comments are NOT stripped by the optimizer.
   *
   * Has zero effect on performance or output when `false` (default).
   */
  debug?: boolean;
  /**
   * Enable clean source maps.
   *
   * When `true`:
   * - Injects `data-mc-id="entry-N"` on each component's root output element.
   * - Attaches `result.sourceMap` (structured JSON) and `result.sourceMapJSON`.
   * - HTML output is clean — no `<!-- mc:source -->` markers.
   * - Can coexist with `debug: true` (markers + `data-mc-id` both present).
   *
   * This is the public API for source maps.
   * Use `debug: true` only for internal tooling that needs the comment markers.
   */
  sourceMap?: boolean;
  /**
   * Enables or disables mailc's built-in templating engine (`{{ var }}`,
   * `{{{ raw }}}`, `mc-if`, `mc-each`) for this compilation.
   *
   * **Currently respected only by `compileFromJSON()`.** When set to `false`:
   * - JSON `content` strings pass through verbatim — no scanning for `{{` or
   *   `{{{`. Builders that accept arbitrary user-typed text (which may contain
   *   curly braces) avoid the ambiguity entirely.
   * - The template resolution stage is skipped — `options.data` and any
   *   `mc-if` / `mc-each` nodes are not interpreted. Builders that do their
   *   own data binding (typical for drag-and-drop UIs) opt out cleanly.
   *
   * Has no effect on the markup pipeline (`compile()`) — templating syntax
   * is recognized at the parser level there. Use a different input format
   * if you need to opt out of templating in markup.
   *
   * @default true
   */
  templating?: boolean;
  /**
   * Override the styling mode for this compilation.
   *
   * - `'attribute'` *(default)*: CSS-property attributes on mc-components are
   *   accepted directly — `color="#ff0000"`, `padding="16px"`, etc. The
   *   familiar HTML-style API. No violations are produced.
   * - `'class'` *(limited support)*: bans CSS-property attributes and expects
   *   `class=""` Tailwind-style utilities instead. Violations surface as
   *   `CSS_ATTR_IN_CLASS_MODE` errors with `severity: 'error'` and
   *   `result.partial: true`. Some attributes (e.g. `inner-background-color`,
   *   border shorthands) have no class equivalent today — these will need the
   *   attribute escape hatch even in class mode.
   *
   * When provided, this option overrides `config.styling.templateStyle` for this call only.
   * To set the project-wide default, use `mergeConfig({ styling: { templateStyle: '...' } })`.
   *
   * **Precedence:** Direct option wins over `config.styling.templateStyle`. Do not set in both places.
   *
   * @example
   * // Default: attribute mode — CSS-property attrs are first-class
   * compile(source)
   * compile(source, { templateStyle: 'attribute' })
   *
   * // Opt into class mode (limited support — Tailwind-style utilities)
   * compile(source, { templateStyle: 'class' })
   *
   * // Project-wide class mode via config
   * const cfg = mergeConfig({ styling: { templateStyle: 'class' } })
   * compile(source, { config: cfg })
   */
  templateStyle?: TemplateStyle;
}

/** Options passed to the `validate()` function. */
export interface ValidateOptions {
  /** Config overrides. */
  config?: Partial<MailcConfig>;
  /** Source file path (for error reporting). */
  filename?: string;
}

/** The result of a `validate()` call. */
export interface ValidationResult {
  /** Whether the source is valid (zero errors). */
  isValid: boolean;
  /** Validation errors. */
  errors: MCIssue[];
  /** Validation warnings. */
  warnings: MCIssue[];
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Responsive design configuration. */
export interface ResponsiveConfig {
  /** Mobile breakpoint in pixels. */
  breakpoint: number;
}

/** Dark mode configuration. */
export interface DarkModeConfig {
  /** Enable dark mode style generation. */
  enabled: boolean;
  /** Strategy: `"media-query"` or `"class"`. */
  strategy: 'media-query' | 'class';
  /**
   * Explicit light→dark color mapping.
   *
   * Keys are light-mode hex colors (as used in inline styles),
   * values are their dark-mode replacements.
   *
   * Example: `{ "#ffffff": "#1a1a1a", "#1a1a1a": "#e4e4e7" }`
   *
   * Only colors present in this map are overridden in dark mode.
   * No automatic inversion — the developer controls every mapping.
   */
  colorMapping: Record<string, string>;
}

/** Accessibility configuration. */
export interface AccessibilityConfig {
  /** Add accessibility attributes to output. */
  enabled: boolean;
  /** Warn when `alt` attribute is missing on images. */
  warnMissingAlt: boolean;
  /** Treat missing `alt` as an error (not just a warning). */
  enforceAltText: boolean;
  /** Check color contrast between text and background (WCAG AA 4.5:1). */
  checkContrast: boolean;
}

/** Output formatting configuration. */
export interface OutputConfig {
  /**
   * Output shape.
   * - `false` (default) — pretty-printed, multi-line, indented HTML.
   * - `true`            — minified, single-line HTML.
   */
  minify: boolean;
  /** Remove non-Outlook comments from output. */
  comments: boolean;
}

/** Template engine configuration. */
export interface TemplateEngineConfig {
  /**
   * When true, emit an `UNDEFINED_VARIABLE` error for `{{var}}` expressions
   * whose path does not resolve and have no fallback. Useful in CI to catch
   * typos like `{{usre.name}}`. Default: `false` (passthrough).
   */
  strictVariables: boolean;
}

/**
 * Styling paradigm enforced at compile time.
 *
 * - `'class'`: Tailwind-style `class=""` utilities are the expected styling
 *   mechanism. CSS-property attributes on mc-components produce warnings.
 * - `'attribute'`: CSS-property attributes (`color=`, `padding=`, etc.) are
 *   accepted directly on mc-components without warnings.
 */
export type TemplateStyle = 'class' | 'attribute';

/**
 * CSS compatibility mode for the compile pipeline.
 *
 * - `'liberal'` *(default)*: All CSS properties that have any email-client support
 *   are inlined. Clients that support a property render it; clients that don't
 *   silently ignore the inline declaration — graceful degradation with no warnings.
 *   This is the correct default for consumer email (Gmail, Apple Mail, etc.).
 *
 * - `'strict'`: ENHANCE properties (box-shadow, border-radius, opacity, background-image,
 *   etc.) are stripped entirely and a warning is emitted per property. Use strict mode
 *   when you need guaranteed identical rendering across all declared `targetClients`
 *   — typically B2B / corporate-Outlook scenarios.
 *
 * The classification of SAFE / ENHANCE / BREAKING is always dynamic — derived from
 * `buildClassificationMap(targetClients)` using caniemail data. Changing
 * `targetClients` changes which properties are ENHANCE vs SAFE.
 *
 * @example
 * compile(source)                                        // liberal (default)
 * compile(source, { compatibilityMode: 'strict' })       // strict — strip ENHANCE
 */
export type CompatibilityMode = 'liberal' | 'strict';

/** Styling mode configuration. */
export interface StylingConfig {
  /**
   * Controls which styling paradigm is the default for compilation.
   *
   * - `'attribute'` *(default)*: CSS-property attributes on mc-components
   *   (`color`, `font-size`, `padding`, etc.) are accepted and applied
   *   directly. The familiar HTML-style API. No violations are emitted.
   * - `'class'` *(limited support)*: bans CSS-property attributes and expects
   *   `class=""` Tailwind-style utilities instead. Violations surface as
   *   `CSS_ATTR_IN_CLASS_MODE` errors (`severity: 'error'`, `result.partial: true`).
   *   Some attributes have no class equivalent today (e.g. `inner-background-color`,
   *   border shorthands) — those still need the attribute escape hatch even in
   *   class mode. Opt in only if your project standardises on Tailwind utilities.
   *
   * `<mc-attributes>` defaults are always exempt from class-mode enforcement.
   */
  templateStyle: TemplateStyle;
}

/** The full mailc configuration object. */
export interface MailcConfig {
  /** Email container width in pixels. */
  width: number;
  /**
   * Resolved caniemail target client globs.
   *
   * - `undefined` → no client-specific gating (PassthroughMap). Hardcoded
   *   structural safety rules still apply (ALWAYS_BREAKING /
   *   ALWAYS_NO_EFFECT).
   * - `string[]` → run caniemail classification against these clients.
   *
   * `'default'` shorthand from `CompileOptions` is normalised to the
   * `DEFAULT_CLIENTS` array by `mergeConfig()` before reaching this field.
   */
  targetClients: string[] | undefined;
  /**
   * Project-wide compile mode default. Overridden per-call by `CompileOptions.compatibilityMode`.
   *
   * - `'liberal'` (default): All CSS with any email-client support is inlined (best-effort).
   * - `'strict'`: ENHANCE properties are stripped with an `ENHANCE_PROPERTY_STRIPPED` warning.
   */
  compatibilityMode: CompatibilityMode;
  /** Responsive design settings. */
  responsive: ResponsiveConfig;
  /** Dark mode settings. */
  darkMode: DarkModeConfig;
  /** Accessibility settings. */
  accessibility: AccessibilityConfig;
  /** Output formatting settings. */
  output: OutputConfig;
  /** Template engine settings. */
  templateEngine: TemplateEngineConfig;
  /** Styling mode settings. */
  styling: StylingConfig;
}

// ---------------------------------------------------------------------------
// CSS Pipeline
// ---------------------------------------------------------------------------

/** A resolved CSS property with its value. */
export interface CSSProperty {
  /** CSS property name, e.g. "padding-top". */
  property: string;
  /** CSS property value, e.g. "16px". */
  value: string;
  /**
   * Specificity hint for deduplication.
   *
   * Higher values win when the same property is set by multiple classes.
   * - `1` — single-side utility (e.g. `mt-6` → `margin-top`)
   * - `0` — all-sides / shorthand utility (e.g. `m-3` → `margin-top/right/bottom/left`)
   *
   * Defaults to `0` when omitted.
   */
  specificity?: number;
}

/** Classification of a CSS property for email compatibility. */
export type CSSClassification = 'SAFE' | 'ENHANCE' | 'BREAKING' | 'NO_EFFECT';

/**
 * Pre-built map from CSS property name to classification.
 *
 * Built once per compilation via `buildClassificationMap()` using caniemail
 * data for the configured `targetClients`. Passed through `CompileContext`
 * so every classification call uses dynamic, client-aware data.
 */
export type ClassificationMap = Map<string, CSSClassification>;

/** A classified CSS property after caniemail checking. */
export interface ClassifiedCSS {
  /** The CSS property. */
  property: CSSProperty;
  /** Email compatibility classification. */
  classification: CSSClassification;
}

// ---------------------------------------------------------------------------
// Component Compiler
// ---------------------------------------------------------------------------

/** A function that compiles an AST node into an HTML string. */
export type ComponentCompiler = (node: ASTNode, context: CompileContext) => string;

/** Context passed through the component compilation tree. */
export interface CompileContext {
  /** Resolved mailc configuration. */
  config: MailcConfig;
  /** Resolved Tailwind theme values. */
  theme: ResolvedTheme;
  /** Collected warnings during compilation. */
  warnings: MCIssue[];
  /** Parent element width in pixels (for column width calculation). */
  parentWidth: number;
  /**
   * Number of column siblings in the current section.
   *
   * Set by the section compiler so columns without explicit widths
   * can auto-divide the parent width equally (e.g. 2 columns → 50% each).
   * Defaults to 1 when not inside a section.
   */
  columnCount: number;
  /** Collected `sm:` responsive class names for media query generation. */
  responsiveClasses: string[];
  /**
   * The current `mc-list`'s `item-spacing` value, propagated to children via
   * `compileChildren()`. Set by `compileList` and read by `compileListItem`.
   * Undefined when not inside a list.
   */
  listItemSpacing?: string;
  /**
   * True when the current node is being compiled inside an `mc-group`.
   * Read by `compileColumn` to omit the `mc-responsive` class so children of
   * a group keep their declared width on mobile (the whole point of mc-group).
   */
  insideGroup?: boolean;
  /** Shared mutable compilation counters. */
  counters: CompileCounters;
  /**
   * Default attributes from `mc-attributes` in `mc-head`.
   *
   * Key = component type ("mc-all", "mc-text", "mc-button", etc.).
   * Value = attribute name → value map.
   *
   * These are merged with lower precedence than explicit attributes or class-derived styles.
   */
  attributeDefaults: Map<string, Record<string, string>>;
  /**
   * Named attribute bundles from `mc-class` definitions in `mc-head`.
   *
   * Key = class name (from `mc-class name="X"`).
   * Value = resolved attributes (with `extends` chains fully merged).
   *
   * Applied by `getEffectiveAttributes` when a component has `mc-class="X"`.
   * Precedence: mc-all → mc-{type} → mc-class → explicit (highest).
   */
  namedClasses: Map<string, Record<string, string>>;
  /**
   * Parsed CSS rules from `mc-style inline="true"` for inline injection.
   *
   * Each rule has a selector string and declarations record.
   * Applied to matching HTML elements during post-processing.
   */
  inlineStyleRules: { selector: string; declarations: Record<string, string> }[];
  /** The email title extracted from `mc-title` (for accessibility). */
  title: string;
  /**
   * Pre-built CSS classification map from `buildClassificationMap()`.
   *
   * When present, `classifyProperty()` uses this instead of hardcoded lists.
   * Built once per compilation based on `config.targetClients`.
   */
  classificationMap?: ClassificationMap;
  /**
   * Debug mode flag — propagated from `CompileOptions.debug`.
   *
   * When `true`, `compileNode()` wraps each component's output with
   * `<!-- mc:source -->` HTML comments and the source map collector
   * records structured entries.
   */
  debug: boolean;
  /**
   * Clean source map flag — propagated from `CompileOptions.sourceMap`.
   *
   * When `true`, `compileNode()` injects `data-mc-id="entry-N"` on each
   * component's root output element and the source map collector records
   * structured entries. HTML output stays clean — no comment markers.
   */
  cleanSourceMap: boolean;
  /**
   * Active styling mode — resolved from `CompileOptions.templateStyle` with
   * fallback to `config.styling.templateStyle`.
   *
   * Component compilers read this to decide whether CSS-property attributes
   * are allowed (`'attribute'`) or should produce errors (`'class'`).
   */
  templateStyle: TemplateStyle;
  /**
   * Active compile mode — resolved from `CompileOptions.compatibilityMode`, default `'liberal'`.
   *
   * Controls how ENHANCE CSS properties are handled:
   * - `'liberal'`: inlined alongside SAFE properties, no warning (graceful degradation).
   * - `'strict'`: stripped entirely with an `ENHANCE_PROPERTY_STRIPPED` warning.
   */
  compatibilityMode: CompatibilityMode;
  /**
   * CSS property support map, built from caniemail for target clients.
   * Only populated when `debug: true`. Used by `collectAndInline()` to
   * attach caniemail compatibility data to source map style entries.
   * Key = CSS property name, value = per-client support breakdown.
   */
  propertySupportMap?: Map<string, PropertySupport>;
  /**
   * Source map collector — accumulates structured entries for every compiled
   * component. The minimal interface below is declared here to avoid a circular
   * import (source-map-collector.ts imports from types.ts). The full
   * `ISourceMapCollector` interface in `src/compiler/source-map-collector.ts`
   * must satisfy this shape.
   */
  sourceMap: {
    enter(node: ASTNode, component: string): string;
    leave(id: string): void;
    emit(parentId: string, role: OutputRole, tag: string): string;
    addStyle(id: string, style: StyleOrigin): void;
    addExpression(id: string, expr: ExpressionResolution): void;
    setConditional(id: string, info: ConditionalInfo): void;
    setLoop(id: string, info: LoopInfo): void;
    build(meta: {
      sourceFile: string;
      outputFile: string;
      templateData: unknown;
      mailcVersion: string;
      inputSize: number;
      outputSize: number;
    }): EmailSourceMap | null;
    readonly activeEntryId: string;
  };
}

/**
 * Mutable counters shared across all compile contexts.
 *
 * Passed by reference so child contexts (with overridden `parentWidth`)
 * still increment the same counters.
 */
export interface CompileCounters {
  /** Number of mc-* components compiled. */
  componentCount: number;
  /** Number of CSS properties inlined into style="". */
  cssPropertiesInlined: number;
  /** Number of CSS properties stripped (BREAKING/NO_EFFECT). */
  cssPropertiesStripped: number;
}

// ---------------------------------------------------------------------------
// Validator — shared component rule shape
// ---------------------------------------------------------------------------

/**
 * Validation rules derived from component metadata.
 *
 * Defined here (not in `src/validator/rules.ts`) to break the circular
 * dependency between `src/components/metadata.ts` and `src/validator/rules.ts`.
 * Both modules import from `src/types.ts`, which has no downstream deps.
 */
export interface ComponentRule {
  /** Required parent type. `null` = must be root-level (or inside mc-body). */
  parent: string | null;
  /** Alternate valid parents (e.g. logic nodes can wrap anything). */
  alternateParents?: string[];
  /** Maximum number of **element** children. `Infinity` = unlimited. */
  maxChildren: number;
  /** Attribute names that MUST be present. */
  required: string[];
  /** All known attribute names (for "did you mean?" warnings). */
  knownAttributes: string[];
  /** If set, this tag must directly follow one of these sibling types. */
  mustFollow?: string[];
}

/** Resolved Tailwind theme object (colors, spacing, fonts, etc.). */
export interface ResolvedTheme {
  colors: Record<string, string | Record<string, string>>;
  spacing: Record<string, string>;
  fontSize: Record<string, string | [string, Record<string, string>]>;
  fontFamily: Record<string, string[]>;
  fontWeight: Record<string, string>;
  lineHeight: Record<string, string>;
  letterSpacing: Record<string, string>;
  borderRadius: Record<string, string>;
  borderWidth: Record<string, string>;
  maxWidth: Record<string, string>;
  width: Record<string, string>;
  height: Record<string, string>;
}
