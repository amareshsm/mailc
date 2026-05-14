/**
 * @file src/introspect/types.ts
 *
 * Type contracts for the entire Introspection API surface.
 *
 * Every public function in `src/introspect/` returns one of these shapes.
 * Consumers (playground, CLI `--introspect`, IDE tooling) depend exclusively
 * on these interfaces — never on internal metadata structures.
 *
 * Single-source-of-truth strategy:
 *   - AttributeValueType, ComponentCategory → re-exported from src/types.ts
 *   - AttributeSpec                         → extends AttributeMetadata (adds name)
 *
 * Phase 1 of the Introspection API build plan.
 */

import type { AttributeMetadata } from '../components/metadata.js';
import type { AttributeValueType, ComponentCategory, CSSCategory } from '../types.js';

// Re-export primitives — consumers import from here, not from internals.
export type { AttributeValueType, ComponentCategory, CSSCategory };

// ---------------------------------------------------------------------------
// Attribute specification
// ---------------------------------------------------------------------------

/**
 * Full specification for a single attribute on a component.
 * Extends {@link AttributeMetadata} with `name` so consumers get a
 * self-contained object without needing the map key separately.
 *
 * Returned inside {@link ComponentSpec.requiredAttributes} and
 * {@link ComponentSpec.optionalAttributes}.
 */
export interface AttributeSpec extends AttributeMetadata {
  /** Attribute name as written in markup, e.g. `"href"`, `"background-color"`. */
  name: string;
}

// ---------------------------------------------------------------------------
// Component specification
// ---------------------------------------------------------------------------

/**
 * Full specification for a single `mc-*` component.
 *
 * Returned by `getComponentSpec(type)` in Phase 2 of the Introspection API.
 */
export interface ComponentSpec {
  /** Component tag name, e.g. `"mc-button"`. */
  type: string;
  /** Human-readable description of the component's purpose. */
  description: string;
  /** Broad category used for grouping and validation. */
  category: ComponentCategory;
  /**
   * Valid parent component types.
   * Derived from `parent` + `alternateParents` in ComponentMetadata.
   * Empty array means the component is a root (only `mc-body`).
   */
  allowedParents: string[];
  /**
   * Component types that may be direct children of this component.
   * Derived from other components' `parent` / `alternateParents` references.
   * Empty array means the component is a leaf.
   */
  allowedChildren: string[];
  /** Whether this component accepts raw text nodes as children. */
  allowsTextContent: boolean;
  /** Whether a `class` attribute is meaningful on this component. */
  acceptsClassAttribute: boolean;
  /**
   * CSS categories from which Tailwind-style class names may be applied.
   * Empty when `acceptsClassAttribute` is `false`.
   */
  validClassCategories: CSSCategory[];
  /** Attributes that MUST be provided. */
  requiredAttributes: AttributeSpec[];
  /** Attributes that are optional (may have defaults). */
  optionalAttributes: AttributeSpec[];
  /**
   * Subset of optionalAttributes where `isCssPropAttr` is true — i.e. attributes
   * that express a CSS property and are restricted in `templateStyle: 'class'`.
   *
   * Each entry carries the `classHint` field with the recommended Tailwind
   * class replacement. Consumers (IDE code actions, playground property panel)
   * use this list to drive "replace with class" quick-fixes.
   *
   * Empty for components with no CSS-property attributes (e.g. logic components).
   */
  cssPropertyAttributes: AttributeSpec[];
  /** Describes what HTML elements this component compiles to and why. */
  compilesTo: CompilesToSpec;
  /** A minimal ready-to-use example of the component. */
  example: ExampleSpec;
  /** Common mistakes developers make when using this component. */
  commonMistakes: string[];
}

// ---------------------------------------------------------------------------
// Compiler output specification
// ---------------------------------------------------------------------------

/**
 * Describes the HTML output that a component produces at compile time.
 *
 * Part of {@link ComponentSpec.compilesTo}.
 */
export interface CompilesToSpec {
  /**
   * List of HTML elements in the compiler's output.
   * e.g. `['table', 'tr', 'td', 'a']` for `mc-button`.
   */
  outputElements: string[];
  /** Why the compiler emits this structure (email-client compat rationale). */
  reason: string;
  /** Side-by-side input/output markup showing what the compiler does. */
  annotatedExample: {
    /** The `.mc` source snippet. */
    input: string;
    /** The compiled HTML output. */
    output: string;
  };
}

// ---------------------------------------------------------------------------
// Usage example
// ---------------------------------------------------------------------------

/**
 * A minimal runnable usage example for a component.
 *
 * Part of {@link ComponentSpec.example}.
 */
export interface ExampleSpec {
  /** JSON representation of the component node. */
  node: ExampleNode;
  /** `.mc` markup string for the example. */
  markup: string;
}

/**
 * Recursive AST-like structure used inside {@link ExampleSpec.node}.
 */
export interface ExampleNode {
  /** Component tag name. */
  type: string;
  /** Attribute key-value pairs as they would appear in markup. */
  attributes: Record<string, string>;
  /** Child component nodes (optional; omitted for leaf components). */
  children?: ExampleNode[];
  /** Raw text content (optional; used when `allowsTextContent` is true). */
  content?: string;
}

// ---------------------------------------------------------------------------
// Nesting matrix
// ---------------------------------------------------------------------------

/**
 * A valid path through the component tree from root to a target component.
 *
 * Used in {@link NestingMatrix.requiredPaths} to show developers how to
 * reach a component from the document root.
 */
export interface NestingPath {
  /** The target component type. */
  target: string;
  /** Ordered list of component types from root to the target. */
  path: string[];
  /** Human-readable description of the path. */
  description: string;
}

/**
 * Complete parent↔child relationship map for all components.
 *
 * Returned by `getNestingMatrix()` in Phase 3 of the Introspection API.
 */
export interface NestingMatrix {
  /**
   * Maps each component type to the array of component types it may contain.
   * e.g. `{ 'mc-section': ['mc-column', 'mc-raw'] }`.
   */
  parentToChildren: Record<string, string[]>;
  /**
   * Maps each component type to the array of component types it may live inside.
   * e.g. `{ 'mc-column': ['mc-section'] }`.
   */
  childToParents: Record<string, string[]>;
  /**
   * Pre-computed paths from root to every non-root component type.
   * Useful for "how do I use this component?" documentation.
   */
  requiredPaths: NestingPath[];
}

// ---------------------------------------------------------------------------
// Valid CSS classes result
// ---------------------------------------------------------------------------

/**
 * A single Tailwind-style class that is valid on a component and its resolved
 * CSS property/value pairs.
 */
export interface ClassEntry {
  /** The Tailwind-style class name, e.g. `"text-blue-600"`. */
  className: string;
  /**
   * CSS property/value pairs this class expands to.
   * e.g. `[{ property: 'color', value: '#2563eb' }]`.
   */
  resolvedTo: { property: string; value: string }[];
  /**
   * Email-client safety classification.
   * - `SAFE`    — works in all major email clients.
   * - `ENHANCE` — works in modern clients; silently ignored in others.
   */
  classification: 'SAFE' | 'ENHANCE';
  /** Short human-readable description of what the class does. */
  description: string;
}

/**
 * A Tailwind-style class pattern that is NOT valid on a component and why.
 */
export interface RejectedClassEntry {
  /**
   * The class pattern that was rejected.
   * May be a concrete class name or a glob-style pattern, e.g. `"rem-*"`.
   */
  pattern: string;
  /** Reason the class or pattern is not allowed in email contexts. */
  reason: string;
  /**
   * Email clients that flag this property as unsupported.
   * Populated when `targetClients` is passed to `validClasses()`.
   * Empty array means the rejection is structural (applies to all clients).
   */
  affectedClients?: string[];
  /** A recommended alternative where one exists. */
  alternative?: string;
}

/**
 * Options accepted by `validClasses()`.
 *
 * Mirrors the options a compile() call would use so that the introspection
 * API and the compiler always agree on what is SAFE / ENHANCE / rejected.
 */
export interface ValidClassesOptions {
  /**
   * Resolved theme to enumerate classes from.
   * Defaults to `DEFAULT_THEME` when omitted.
   */
  theme?: import('../types.js').ResolvedTheme;
  /**
   * Which email clients to gate the classification against — same three
   * modes as `CompileOptions.targetClients`:
   *
   * - **Omitted**: static fallback in `classifier.ts` (no caniemail query).
   * - **`'default'`**: curated 5-client preset (`DEFAULT_CLIENTS`).
   * - **`string[]`**: custom client glob list.
   *
   * Symmetrical with `compile(markup, { targetClients })` so
   * `validClasses()` and `compile()` always agree on what classes are
   * SAFE / ENHANCE / rejected.
   *
   * @example
   * validClasses('mc-button', { targetClients: 'default' })
   * validClasses('mc-button', { targetClients: ['gmail.*', 'outlook.*'] })
   */
  targetClients?: string[] | 'default';
}

/**
 * Full result of `getValidClasses(type)` in Phase 4 of the Introspection API.
 */
export interface ValidClassesResult {
  /** Classes that are safe to use in all major email clients. */
  safe: ClassEntry[];
  /** Classes that work in modern clients but degrade gracefully. */
  enhance: ClassEntry[];
  /** Classes that are NOT recommended and why. */
  rejected: RejectedClassEntry[];
}

// ---------------------------------------------------------------------------
// Validation result
// ---------------------------------------------------------------------------

/**
 * The type of fix action an automated tool or the user should perform.
 *
 * Part of {@link FixInstruction.action}.
 */
export type FixAction =
  | 'wrap-in'            // Wrap the node in a parent component
  | 'move-to'            // Move the node to a different parent
  | 'add-attribute'      // Add a missing required attribute
  | 'remove-attribute'   // Remove an unrecognised / conflicting attribute
  | 'replace-value'      // Change an attribute's value to a valid one
  | 'remove-class'       // Remove a disallowed class from the class attribute
  | 'replace-with-class'; // Replace a CSS-prop attr with a class="" equivalent

/**
 * Structured instruction describing how to resolve a validation error.
 *
 * Part of {@link IntrospectError.fix}.
 */
export interface FixInstruction {
  /** The category of change needed. */
  action: FixAction;
  /** Human-readable description of the fix. */
  description: string;
  /**
   * How confident the system is that this fix is correct.
   * - `high` — deterministic; this will always solve the issue.
   * - `low`  — heuristic; the developer should verify.
   */
  confidence: 'high' | 'low';
  /** For `wrap-in` / `move-to` — the component type to use. */
  wrapWith?: string;
  /** For `add-attribute` / `remove-attribute` / `replace-value` — the attribute name. */
  attribute?: string;
  /** For `replace-value` — the recommended new value. */
  value?: string;
  /** For `replace-value` — the current invalid value being replaced. */
  oldValue?: string;
  /** For `remove-class` — the exact class name to remove. */
  removeClass?: string;
  /**
   * For `replace-with-class` — the resolved Tailwind class that replaces
   * the CSS-property attribute. Already substituted with the user's value
   * (e.g. `'text-[#0066cc]'` for `color="#0066cc"`).
   *
   * Omitted when the attribute has no Tailwind-class equivalent
   * (e.g. CSS `border` shorthands — use inline `style=""` instead).
   */
  classHint?: string;
  /**
   * For `replace-with-class` — alternative resolved Tailwind classes when more
   * than one form is valid. The first valid choice is in `classHint`; everything
   * else is here. Empty/omitted when only one form applies.
   *
   * Example: for `text-decoration="none"` the alternatives are `['no-underline']`.
   */
  classHintAlternatives?: string[];
}

/**
 * A single validation error with a structured fix instruction.
 *
 * Part of {@link IntrospectValidationResult.errors}.
 */
export interface IntrospectError {
  /** Error code matching the `ErrorCode` enum in `src/errors/codes.ts`. */
  code: string;
  /** Human-readable description of the problem. */
  message: string;
  /** Actionable instruction for resolving the error. */
  fix: FixInstruction;
}

/**
 * A non-fatal validation warning. Does not set `valid: false`.
 *
 * Current warning cases:
 * - UNKNOWN_ATTRIBUTE — unrecognised attribute name (likely a typo).
 *   The template will still compile; the attribute is silently dropped.
 *
 * Part of {@link IntrospectValidationResult.warnings}.
 */
export interface IntrospectWarning {
  /** Warning code. */
  code: string;
  /** Human-readable description. */
  message: string;
  /** Suggested fix (best-effort). */
  fix: FixInstruction;
}

/**
 * Full result of `validate(markup)` in Phase 5 of the Introspection API.
 */
export interface IntrospectValidationResult {

  /** `true` only when there are zero errors. Warnings do not affect this. */
  valid: boolean;
  /** List of validation errors; empty when `valid` is `true`. */
  errors: IntrospectError[];
  /**
   * Non-fatal warnings (e.g. unknown attribute names / likely typos).
   * The template will compile despite warnings — they are quality hints only.
   */
  warnings: IntrospectWarning[];
}

// ---------------------------------------------------------------------------
// Data Contract
// ---------------------------------------------------------------------------

/**
 * A source location reference used in DataContractField.
 * Line and column are 1-based, matching the AST SourcePosition convention.
 */
export interface DataContractLocation {
  /** 1-based line number in the source template. */
  line: number;
  /** 1-based column number in the source template. */
  col: number;
}

/**
 * A single data field referenced by the template.
 *
 * `required` fields appear unconditionally in the template body.
 * `optional` fields appear only inside `mc-if` / `mc-else-if` conditions
 * or branches, meaning the template will still render without them.
 */
export interface DataContractField {
  /**
   * Dot-separated path as written in the template.
   * e.g. `"user.name"`, `"order.items"`, `"item.price"` (loop-scoped).
   */
  path: string;
  /**
   * Where this path was first encountered — content expression,
   * attribute value, loop-source, or condition expression.
   */
  usedIn: 'expression' | 'attribute' | 'condition' | 'loop-source';
  /** All source locations where this path appears. */
  locations: DataContractLocation[];
  /**
   * Name of the loop variable if this path is accessed inside an mc-each
   * body. `undefined` for root-scope paths.
   *
   * e.g. `"item"` when `order.items` is iterated with `as="item"`.
   */
  loopScope?: string;
  /**
   * For `optional` fields: the condition expression that gates this field.
   * e.g. `"user.isPro"` when the field appears inside
   * `<mc-if condition="user.isPro">`.
   */
  condition?: string;
}

/**
 * Describes one `mc-each` / `mc-for-each` loop in the template.
 */
export interface DataContractLoop {
  /**
   * The loop variable name, as declared in the `as` attribute.
   * e.g. `"item"`.
   */
  variable: string;
  /**
   * The data path that provides the iterable array.
   * e.g. `"order.items"`.
   */
  source: string;
  /**
   * All dot-paths accessed on the loop variable inside the loop body.
   * e.g. `["item.name", "item.price", "item.imageUrl"]`.
   */
  usedPaths: string[];
  /** Source location of the mc-each opening tag. */
  location: DataContractLocation;
}

/**
 * The complete data contract for a template.
 *
 * Returned by `introspect.dataContract(ast)`.
 *
 * @example
 * ```typescript
 * const contract = introspect.dataContract(ast);
 * // contract.required → fields the template always needs
 * // contract.optional → fields only needed when their condition is truthy
 * // contract.loops    → array iteration requirements with per-item field access
 * ```
 */
export interface DataContract {
  /**
   * Fields that are always accessed regardless of conditions.
   * Sending a data object without these will cause empty / broken output.
   */
  required: DataContractField[];
  /**
   * Fields accessed inside `mc-if` / `mc-else-if` branches.
   * The template renders safely without them (the branch simply won't fire),
   * but the intended conditional output will be missing.
   */
  optional: DataContractField[];
  /**
   * All `mc-each` / `mc-for-each` loops, with per-iteration field access.
   * The loop's `source` path also appears in `required` or `optional`
   * depending on whether the loop itself is inside an `mc-if` branch.
   */
  loops: DataContractLoop[];
}

