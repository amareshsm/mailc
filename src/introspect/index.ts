/**
 * @file src/introspect/index.ts
 *
 * Public `introspect` namespace — the single import point for all
 * Introspection API consumers (playground, CLI, IDE tooling, AI agents).
 *
 * All functions are synchronous, pure, and side-effect-free.
 * Safe to call in any environment: browser, Node, edge.
 *
 * Phase 8 of the Introspection API build plan.
 *
 * @example
 * import { introspect } from 'mailc';
 *
 * const spec   = introspect.component('mc-button');
 * const matrix = introspect.nesting();
 * const check  = introspect.validate({ type: 'mc-button', attributes: {} }, 'mc-column');
 *
 * @module introspect
 */

import { getComponentSpec, getAllComponentSpecs } from './registry.js';
import { getNestingMatrix } from './nesting.js';
import { canNest } from './can-nest.js';
import { validClasses } from './classes.js';
import { getCompilesToSpec } from './compiles-to.js';
import { validateNode } from './validate.js';
import { extractDataContract } from './data-contract.js';
import {
  getPropertiesForCategory,
  getCategoryForProperty,
  getAllCategories,
} from './css-categories.js';

// Re-export all public types so consumers never need to reach into sub-modules.
export type {
  AttributeSpec,
  AttributeValueType,
  ComponentCategory,
  ComponentSpec,
  CSSCategory,
  NestingMatrix,
  NestingPath,
  ValidClassesResult,
  ClassEntry,
  RejectedClassEntry,
  CompilesToSpec,
  ExampleSpec,
  IntrospectValidationResult,
  IntrospectError,
  IntrospectWarning,
  FixInstruction,
  FixAction,
  DataContract,
  DataContractField,
  DataContractLoop,
  DataContractLocation,
} from './types.js';
export type { ValidateNodeInput, ValidateNodeOptions } from './validate.js';

/**
 * mailc Component Introspection API.
 *
 * Functions:
 * - `component(type)`   — Full spec for one component (attributes, parents, children, …)
 * - `all()`             — Specs for every component
 * - `nesting()`         — Parent↔child matrix + required nesting paths
 * - `validClasses()`    — Safe / ENHANCE / rejected Tailwind-style classes per component
 * - `compilesTo(type)`  — HTML elements a component emits and why
 * - `validate(node)`    — Pre-flight single-node check with machine-readable fix instructions
 *
 * ## Styling-mode awareness
 *
 * Pass `templateStyle: 'class'` (or `'attribute'`) to `validate()` to match
 * the mode used in `compile()`. In class mode, CSS-property attributes such as
 * `color`, `background-color`, `padding`, etc. produce `CSS_ATTR_IN_CLASS_MODE`
 * warnings — each carrying a `replace-with-class` fix instruction with a
 * Tailwind-style `classHint` string.
 *
 * The `cssPropertyAttributes` field on each {@link ComponentSpec} lists every
 * attribute that is restricted in class mode, pre-populated with `classHint`
 * values. IDE code action providers can read this to offer "replace with class"
 * quick fixes without re-running compilation.
 */
export const introspect = {
  /** Returns the full spec for a single component, or `undefined` if unknown. */
  component: getComponentSpec,

  /** Returns specs for every known `mc-*` component. */
  all: getAllComponentSpecs,

  /** Returns the complete parent↔child nesting matrix (cached). */
  nesting: getNestingMatrix,

  /**
   * Returns `true` iff `childType` is structurally allowed directly inside
   * `parentType`. Drag-and-drop UIs use this for drop-target validity.
   *
   * Returns `false` for unknown types and for logic components (mc-if,
   * mc-each…) — see `canNest()` jsdoc for the full contract.
   */
  canNest,

  /**
   * Returns all valid Tailwind-style class names for a component,
   * split into SAFE, ENHANCE, and rejected buckets.
   */
  validClasses,

  /** Returns what HTML elements a component compiles to, or `undefined` if unknown. */
  compilesTo: getCompilesToSpec,

  /**
   * Validates a single MCNode against component rules — no markup parsing,
   * no HTML generation. Returns errors with machine-readable fix instructions.
   *
   * Pass `options.templateStyle: 'class'` to also receive `CSS_ATTR_IN_CLASS_MODE`
   * warnings for CSS-property attributes that should be expressed as Tailwind
   * classes instead. Each warning carries a `replace-with-class` fix instruction
   * with a `classHint` field showing the recommended class pattern.
   *
   * @example
   * // Structural validation only
   * introspect.validate({ type: 'mc-button', attributes: { href: '...' } }, 'mc-column')
   *
   * @example
   * // Class-mode: also catches CSS-prop attrs that should be classes
   * introspect.validate(
   *   { type: 'mc-text', attributes: { color: '#ff0000' } },
   *   'mc-column',
   *   { templateStyle: 'class' },
   * )
   * // → warnings: [{ code: 'CSS_ATTR_IN_CLASS_MODE', fix: { action: 'replace-with-class', classHint: 'text-[#value]' } }]
   */
  validate: validateNode,

  /**
   * Returns every CSS property name that belongs to a given category
   * (e.g. `'typography'` → `['color', 'font-family', 'font-size', …]`).
   *
   * Useful for IDE tooling that wants to suggest "what can I style under
   * the typography bucket on this component?".
   *
   * @example
   * introspect.propertiesForCategory('typography'); // ['color', 'font-family', …]
   * introspect.propertiesForCategory('effects');    // ['border-radius', 'box-shadow', …]
   */
  propertiesForCategory: getPropertiesForCategory,

  /**
   * Reverse lookup — returns the category a CSS property belongs to, or
   * `undefined` for properties not in any introspect category.
   *
   * @example
   * introspect.categoryForProperty('font-size');     // 'typography'
   * introspect.categoryForProperty('border-radius'); // 'effects'
   * introspect.categoryForProperty('flex');          // 'layout'
   */
  categoryForProperty: getCategoryForProperty,

  /** Returns every defined CSS category. */
  categories: getAllCategories,

  /**
   * Extracts the data contract from a parsed AST — which fields the template
   * requires, which are optional (inside `mc-if` branches), and what each
   * `mc-each` loop iterates over.
   *
   * This is a **pure static analysis** — no data is evaluated. Call it on
   * the raw output of `parse()` before any template resolution.
   *
   * @param ast - The root ASTNode (output of `parse()`).
   * @returns A {@link DataContract} with required, optional, and loop fields.
   *
   * @example
   * import { parse, introspect } from 'mailc';
   *
   * const ast = parse(templateSource);
   * const contract = introspect.dataContract(ast);
   * // contract.required → always-needed fields
   * // contract.optional → fields guarded by mc-if
   * // contract.loops    → mc-each sources with per-item field usage
   */
  dataContract: extractDataContract,
} as const;
