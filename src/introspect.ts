/**
 * mailc — Introspection API (focused sub-path entry).
 *
 * Re-exports only `introspect` and its types. Use this when you want a
 * smaller import surface than the main `mailc` package — e.g. IDE
 * extensions, visual builders, playground tooling.
 *
 * ```ts
 * import { introspect } from 'mailc/introspect';
 * const spec = introspect.component('mc-button');
 * ```
 *
 * `introspect` is also available from the main `mailc` entry; this
 * sub-path just lets bundlers tree-shake more aggressively for tools
 * that never call `compile()`.
 */
export { introspect } from './introspect/index.js';

export type {
  // Core component types
  ComponentSpec,
  AttributeSpec,
  ComponentCategory,
  AttributeValueType,
  CSSCategory,

  // Nesting
  NestingMatrix,
  NestingPath,

  // CSS classes
  ValidClassesResult,
  ClassEntry,
  RejectedClassEntry,

  // Compiles-to
  CompilesToSpec,

  // Examples
  ExampleSpec,

  // Validation
  IntrospectValidationResult,
  IntrospectError,
  IntrospectWarning,
  FixInstruction,
  FixAction,

  // validateNode input/options
  ValidateNodeInput,
  ValidateNodeOptions,
} from './introspect/index.js';
