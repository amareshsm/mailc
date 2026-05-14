/**
 * @file src/introspect/validate.ts
 *
 * Single-node validation for the Introspection API.
 *
 * `validateNode()` checks one MCNode against component rules and returns
 * machine-readable fix instructions. It is the lightweight pre-flight check
 * that agents / builders use *before* calling `compile()`.
 *
 * Dependency rule (strict):
 *   - Reads from `src/introspect/registry.ts` (ComponentSpec, allowedParents)
 *   - Reads from `src/validator/rules.ts` (COMPONENT_RULES, KNOWN_COMPONENTS,
 *     GLOBAL_ATTRIBUTES, LOGIC_TAGS)
 *   - Returns types from `src/introspect/types.ts`
 *   - NEVER imports from `src/compiler/*` or calls `compile()`
 *
 * Phase 7 of the Introspection API build plan.
 *
 * @module introspect/validate
 */

import {
  COMPONENT_RULES,
  GLOBAL_ATTRIBUTES,
  KNOWN_COMPONENTS,
  LOGIC_TAGS,
} from '../validator/rules.js';
import { getComponentSpec } from './registry.js';
import { CSS_PROP_ATTRS_BY_COMPONENT } from '../components/css-prop-attrs.js';
import { COMPONENT_METADATA } from '../components/metadata.js';
import { resolveClassHint } from '../components/class-hint.js';
import type {
  FixInstruction,
  IntrospectError,
  IntrospectWarning,
  IntrospectValidationResult,
} from './types.js';
import type { TemplateStyle } from '../types.js';

// ---------------------------------------------------------------------------
// Error-code constants
// These mirror the string values in src/errors/codes.ts so that consumers
// can compare without importing the enum.
// ---------------------------------------------------------------------------

const CODE_UNKNOWN_COMPONENT    = 'UNKNOWN_COMPONENT';
const CODE_INVALID_NESTING      = 'INVALID_NESTING';
const CODE_MISSING_ATTRIBUTE    = 'MISSING_ATTRIBUTE';
const CODE_UNKNOWN_ATTRIBUTE    = 'UNKNOWN_ATTRIBUTE';
const CODE_CSS_ATTR_IN_CLASS_MODE = 'CSS_ATTR_IN_CLASS_MODE';
const CODE_CLASS_ATTR_IN_ATTRIBUTE_MODE = 'CLASS_ATTR_IN_ATTRIBUTE_MODE';

// ---------------------------------------------------------------------------
// Input type
// ---------------------------------------------------------------------------

/**
 * A minimal node shape that `validateNode` accepts.
 *
 * Mirrors the MCNode shape but requires only the fields needed for
 * structural validation — no children, no id, no nested tree.
 */
export interface ValidateNodeInput {
  /** Component tag name, e.g. `"mc-button"`. */
  type: string;
  /** Attribute key-value pairs as they would appear in markup. */
  attributes: Record<string, string>;
  /** Optional text content (only relevant for `allowsTextContent` check). */
  content?: string;
}

/**
 * Options accepted by `validateNode()`.
 */
export interface ValidateNodeOptions {
  /**
   * The styling mode to validate against.
   *
   * When `'attribute'` (default), CSS-property attributes such as `color`,
   * `background-color`, `padding`, etc. are valid. The `class` attribute is
   * flagged as a warning (`CLASS_ATTR_IN_ATTRIBUTE_MODE`) because it belongs
   * to `templateStyle: 'class'`.
   *
   * When `'class'`, the CSS-property attributes are flagged as warnings
   * (`CSS_ATTR_IN_CLASS_MODE`), each carrying a `replace-with-class` fix
   * instruction with a Tailwind-style `classHint`. The `class` attribute is
   * the primary styling mechanism and accepted freely.
   *
   * Pass the same `templateStyle` you use in `compile()` to get warnings that
   * match what the compiler would produce.
   */
  templateStyle?: TemplateStyle;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Builds an UNKNOWN_COMPONENT error with a low-confidence no-op fix.
 *
 * @param type - The unknown component type string.
 * @returns A single IntrospectError.
 */
function unknownComponentError(type: string): IntrospectError {
  const fix: FixInstruction = {
    action: 'remove-attribute',
    description: `"${type}" is not a known mc-* component. Check the component reference.`,
    confidence: 'low',
  };
  return {
    code: CODE_UNKNOWN_COMPONENT,
    message: `Unknown component type: "${type}". Not found in the component registry.`,
    fix,
  };
}

/**
 * Builds an INVALID_NESTING error when `type` is placed inside `parentType`
 * but `parentType` is not in the component's `allowedParents`.
 *
 * The fix is `wrap-in` using the first (canonical) allowed parent.
 *
 * @param type       - The misplaced component type.
 * @param parentType - The actual (wrong) parent type.
 * @returns A single IntrospectError.
 */
function invalidNestingError(type: string, parentType: string): IntrospectError {
  const spec = getComponentSpec(type);
  // allowedParents is already filtered for virtual sentinel types in registry
  const firstValidParent = spec?.allowedParents[0] ?? null;

  const fix: FixInstruction = firstValidParent !== null
    ? {
        action: 'wrap-in',
        description: `Move <${type}> inside <${firstValidParent}>.`,
        confidence: 'high',
        wrapWith: firstValidParent,
      }
    : {
        action: 'move-to',
        description: `<${type}> cannot be placed inside <${parentType}>. Check the nesting rules.`,
        confidence: 'low',
      };

  return {
    code: CODE_INVALID_NESTING,
    message: `<${type}> cannot be placed inside <${parentType}>. ` +
             (firstValidParent
               ? `Expected parent: <${firstValidParent}>.`
               : `See the component reference for valid parent types.`),
    fix,
  };
}

/**
 * Builds a MISSING_ATTRIBUTE error for a single missing required attribute.
 *
 * The fix includes the example value from metadata so the agent can
 * immediately produce a valid node without a second lookup.
 *
 * @param componentType - The component type being validated.
 * @param attrName      - The name of the missing required attribute.
 * @returns A single IntrospectError.
 */
function missingAttributeError(componentType: string, attrName: string): IntrospectError {
  const spec = getComponentSpec(componentType);
  // Find the attribute spec to extract its example value
  const attrSpec = [
    ...(spec?.requiredAttributes ?? []),
    ...(spec?.optionalAttributes ?? []),
  ].find(a => a.name === attrName);

  const exampleValue = attrSpec?.example ?? '';

  const fix: FixInstruction = {
    action: 'add-attribute',
    description: `Add the required "${attrName}" attribute to <${componentType}>.`,
    confidence: 'high',
    attribute: attrName,
    ...(exampleValue ? { value: exampleValue } : {}),
  };

  return {
    code: CODE_MISSING_ATTRIBUTE,
    message: `<${componentType}> is missing required attribute: "${attrName}".`,
    fix,
  };
}

/**
 * Builds an UNKNOWN_ATTRIBUTE error for a single unrecognised attribute.
 *
 * The fix is `remove-attribute` with high confidence — unknown attributes
 * have no effect and may confuse email clients.
 *
 * @param componentType - The component type being validated.
 * @param attrName      - The unrecognised attribute name.
 * @returns A single IntrospectError.
 */
function unknownAttributeError(componentType: string, attrName: string): IntrospectError {
  const fix: FixInstruction = {
    action: 'remove-attribute',
    description: `Remove the unrecognised attribute "${attrName}" from <${componentType}>.`,
    confidence: 'high',
    attribute: attrName,
  };

  return {
    code: CODE_UNKNOWN_ATTRIBUTE,
    message: `<${componentType}> does not accept attribute "${attrName}".`,
    fix,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validates a single node against component rules. Collects all errors and
 * warnings before returning; `valid` is false only when at least one error
 * is collected (warnings keep `valid: true`).
 *
 * Checks, in order:
 *   1. UNKNOWN_COMPONENT       — error; stops further checks.
 *   2. INVALID_NESTING         — error; logic tags (mc-if/mc-each) exempt.
 *   3. MISSING_ATTRIBUTE       — error per required attr not present.
 *   4. UNKNOWN_ATTRIBUTE       — warning per unrecognised attr.
 *   5. CSS_ATTR_IN_CLASS_MODE  — warning (when `templateStyle: 'class'`).
 *   6. CLASS_ATTR_IN_ATTRIBUTE_MODE — warning (when `templateStyle: 'attribute'`).
 *
 * Every error/warning carries a structured {@link FixInstruction}.
 *
 * @example
 * validateNode({ type: 'mc-button', attributes: {} }, 'mc-section')
 * // → { valid: false, errors: [INVALID_NESTING, MISSING_ATTRIBUTE(href)] }
 */
export function validateNode(
  node: ValidateNodeInput,
  parentType?: string,
  options?: ValidateNodeOptions,
): IntrospectValidationResult {
  const errors: IntrospectError[] = [];
  const warnings: IntrospectWarning[] = [];

  // ── Check 1: unknown component ──────────────────────────────────────────
  if (!KNOWN_COMPONENTS.has(node.type)) {
    return {
      valid: false,
      errors: [unknownComponentError(node.type)],
      warnings: [],
    };
  }

  const rule = COMPONENT_RULES[node.type]!;

  // ── Check 2: invalid nesting ─────────────────────────────────────────────
  // Two sub-cases:
  //
  // A) Structural components: check that parentType is in allowedParents.
  //    allowedParents is non-empty for structural components (e.g. mc-button
  //    requires mc-column or mc-hero). If it IS empty the component is the
  //    document root (mc-body / mc-head) and has no parent constraint.
  //
  // B) Logic components (mc-if, mc-each, …): parent: null in metadata means
  //    "no single fixed parent" — they wrap content anywhere. HOWEVER, they
  //    are transparent to the compiler: the template engine expands them
  //    before compile() runs. That means a structural parent (mc-section,
  //    mc-column, …) can contain them — the children of the logic tag are
  //    what the compiler ultimately sees. So the check for logic tags is:
  //    is the parent a known component at all? (Unknown parent = hard error
  //    caught by Check 1 on the parent node; known structural parent = valid.)
  //    Only reject if the parent is itself a logic tag nesting another logic
  //    tag in a way that makes no sense (e.g. mc-if inside mc-each is fine;
  //    we don't restrict that here — the template engine handles it).
  if (parentType !== undefined) {
    if (!LOGIC_TAGS.has(node.type)) {
      // Structural component — enforce allowedParents
      const spec = getComponentSpec(node.type);
      const allowedParents = spec?.allowedParents ?? [];

      // allowedParents is built from parent + alternateParents in registry.ts.
      // Virtual sentinels ('root') are filtered there, so we compare cleanly.
      // Empty allowedParents = document root component (no parent constraint).
      if (allowedParents.length > 0 && !allowedParents.includes(parentType)) {
        errors.push(invalidNestingError(node.type, parentType));
      }
    } else {
      // Logic component (mc-if, mc-each, mc-else-if, mc-else, mc-for-each).
      // These are template directives — the template engine processes them
      // before compile(). After expansion, the compiler sees their *children*
      // in the parent's context, not the logic tag itself.
      //
      // The one invalid case: logic tag inside a component that allows NO
      // children at all (maxChildren: 0 — leaf nodes like mc-button, mc-text,
      // mc-image, mc-spacer, mc-divider). Wrapping their content in mc-each
      // makes no sense because these components have no children.
      const parentSpec = getComponentSpec(parentType);
      if (parentSpec !== undefined) {
        // We check the compiled-children list: if the parent allows zero
        // children (it's a leaf), a logic tag inside it is always wrong.
        const parentRule = COMPONENT_RULES[parentType];
        if (parentRule !== undefined && parentRule.maxChildren === 0) {
          errors.push({
            code: CODE_INVALID_NESTING,
            message: `<${node.type}> cannot be placed inside <${parentType}>: ` +
                     `<${parentType}> is a leaf component (no children allowed).`,
            fix: {
              action: 'move-to',
              description: `Move <${node.type}> to a container component (mc-section, mc-column, mc-body).`,
              confidence: 'high',
            },
          });
        }
      }
    }
  }

  // ── Check 3: missing required attributes ─────────────────────────────────
  // An attribute is considered missing when it is absent OR empty-string —
  // both cases produce an unusable node (e.g. href="" is as broken as no href).
  for (const requiredAttr of rule.required) {
    const val = node.attributes[requiredAttr];
    if (val === undefined || val === '') {
      errors.push(missingAttributeError(node.type, requiredAttr));
    }
  }

  // ── Check 4: unknown attributes → WARNING (not error) ────────────────────
  // An unrecognised attribute name is likely a typo — the compiler will
  // silently drop it. This does NOT break compilation, so it is a warning,
  // not an error. `valid` remains true even when warnings are present.
  const globalAttrsSet = new Set(GLOBAL_ATTRIBUTES);
  const knownAttrsSet  = new Set(rule.knownAttributes);

  for (const attrName of Object.keys(node.attributes)) {
    if (!globalAttrsSet.has(attrName) && !knownAttrsSet.has(attrName)) {
      const fix = unknownAttributeError(node.type, attrName);
      warnings.push({ code: fix.code, message: fix.message, fix: fix.fix });
    }
  }

  // ── Check 5: CSS-property attributes in class mode → WARNING ─────────────
  // When templateStyle is 'class', CSS-property attributes (color, padding, …)
  // must be expressed via Tailwind classes instead. This matches the warning
  // the compiler emits (CSS_ATTR_IN_CLASS_MODE) so introspect and compile()
  // agree on what is flagged.
  //
  // Both this path and src/compiler/styling-mode.ts import
  // CSS_PROP_ATTRS_BY_COMPONENT from the same neutral module
  // (src/components/css-prop-attrs.ts) so the set of flagged attributes
  // can never diverge — they share one derivation from COMPONENT_METADATA.
  if (options?.templateStyle === 'class') {
    const banned = CSS_PROP_ATTRS_BY_COMPONENT[node.type];
    if (banned) {
      for (const attrName of Object.keys(node.attributes)) {
        if (banned.has(attrName)) {
          const rawHint = COMPONENT_METADATA[node.type]?.attributes[attrName]?.classHint;
          const attrValue = node.attributes[attrName] ?? '';
          const { canonical, alternatives } = resolveClassHint(rawHint, attrValue);
          const hintMsg = canonical ? ` Use class="${canonical}" instead.` : '';
          const fix: FixInstruction = {
            action: 'replace-with-class',
            description: `Replace ${attrName}="${attrValue || '...'}" with a Tailwind class on <${node.type}>.${hintMsg}`,
            confidence: 'high',
            attribute: attrName,
            ...(canonical ? { classHint: canonical } : {}),
            ...(alternatives.length > 0 ? { classHintAlternatives: alternatives } : {}),
          };
          warnings.push({
            code: CODE_CSS_ATTR_IN_CLASS_MODE,
            message: `<${node.type}> attribute "${attrName}" is not allowed in class mode.${hintMsg} ` +
                     `To opt out project-wide, set templateStyle: 'attribute' in compile options.`,
            fix,
          });
        }
      }
    }
  }

  // ── Check 6: class attribute in attribute mode → WARNING ────────────────
  // When templateStyle is 'attribute', the `class` attribute is rejected on
  // every component. Attribute mode is the styling mechanism; `class=` is
  // reserved for templateStyle: 'class'. Mirrors the compiler check in
  // src/compiler/styling-mode.ts (assertAttributeModeClass).
  if (options?.templateStyle === 'attribute' && 'class' in node.attributes) {
    const fix: FixInstruction = {
      action: 'remove-attribute',
      description:
        `Remove the "class" attribute from <${node.type}>, or switch to ` +
        `templateStyle: 'class' if you want Tailwind utilities.`,
      confidence: 'high',
      attribute: 'class',
    };
    warnings.push({
      code: CODE_CLASS_ATTR_IN_ATTRIBUTE_MODE,
      message:
        `<${node.type}> attribute "class" is not allowed in attribute mode. ` +
        `Express styling via attributes (e.g. color="#333" padding="20px"), ` +
        `or switch to templateStyle: 'class' if you want Tailwind utilities.`,
      fix,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
