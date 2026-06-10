/**
 * JSON tree validator for the mailc JSON → Email API.
 *
 * Validates MCNode trees against the same nesting rules, required attributes,
 * and structural constraints as the `.mc` markup validator.
 *
 * @module json/validator
 */

import type { ComponentRule, MCIssue, Plugin } from '../types.js';
import type { MCNode, MCDocument, MCDataSchema, SchemaField } from './schema.js';
import { ErrorCode } from '../errors/codes.js';
import {
  COMPONENT_RULES,
  KNOWN_COMPONENTS,
  LOGIC_TAGS,
  VALID_ATTRIBUTES_CHILDREN,
} from '../validator/rules.js';
import { suggestComponent } from '../validator/suggestions.js';
import { BUILTIN_METADATA } from '../registry/builtin-registry.js';
import type { ComponentMetadata } from '../components/metadata.js';
import { deriveComponentRuleFromMetadata } from '../components/metadata.js';

const getComponentMetadata = (
  type: string,
  plugins?: ReadonlyMap<string, ComponentMetadata>,
): ComponentMetadata | undefined =>
  BUILTIN_METADATA[type] ?? plugins?.get(type);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Options accepted by the JSON validator. */
export interface ValidateJsonOptions {
  /**
   * Per-call plugin set — same shape passed to `compileFromJSON()`. Each
   * plugin's metadata is converted into a `ComponentRule` so plugin nodes
   * receive the same nesting / required-attribute / unknown-attribute
   * enforcement as built-ins. Without this, plugin types are flagged as
   * unknown.
   */
  plugins?: readonly Plugin[];
}

/**
 * Validates an MCNode tree and returns all issues.
 *
 * @param node    - The root MCNode to validate. Should be of type "mc".
 * @param options - Optional per-call plugin context — see `ValidateJsonOptions`.
 * @returns An object with `isValid`, `errors`, and `warnings`.
 */
export function validateJSON(
  node: MCNode,
  options?: ValidateJsonOptions,
): {
  isValid: boolean;
  errors: MCIssue[];
  warnings: MCIssue[];
} {
  const errors: MCIssue[] = [];
  const warnings: MCIssue[] = [];
  const seenIds = new Set<string>();
  const ctx = buildPluginContext(options?.plugins);

  walkNode(node, null, 0, errors, warnings, seenIds, ctx);

  return { isValid: errors.length === 0, errors, warnings };
}

/** Per-call plugin lookup tables shared by the walker. */
interface PluginCtx {
  rules: ReadonlyMap<string, ComponentRule>;
  metadata: ReadonlyMap<string, ComponentMetadata>;
  /** Plugin types valid as `<mc-attributes>` children (mirrors built-in eligibility). */
  attrChildren: ReadonlySet<string>;
}

const EMPTY_CTX: PluginCtx = {
  rules: new Map(),
  metadata: new Map(),
  attrChildren: new Set(),
};

function buildPluginContext(plugins: readonly Plugin[] | undefined): PluginCtx {
  if (!plugins || plugins.length === 0) return EMPTY_CTX;
  const rules = new Map<string, ComponentRule>();
  const metadata = new Map<string, ComponentMetadata>();
  const attrChildren = new Set<string>();
  for (const plugin of plugins) {
    if (plugin.type.startsWith('_')) continue;
    rules.set(plugin.type, deriveComponentRuleFromMetadata(plugin.metadata));
    metadata.set(plugin.type, plugin.metadata);
    // Same eligibility rule as rules.ts: head/logic and the structural roots
    // (mc, mc-body) are excluded; everything else can sit inside <mc-attributes>
    // to declare type-wide defaults.
    const cat = plugin.metadata.category;
    if (cat !== 'head' && cat !== 'logic' && plugin.type !== 'mc' && plugin.type !== 'mc-body') {
      attrChildren.add(plugin.type);
    }
  }
  return { rules, metadata, attrChildren };
}

/**
 * Validates a full MCDocument (checks metadata + template).
 *
 * @param doc - The MCDocument to validate.
 * @returns An object with `isValid`, `errors`, and `warnings`.
 */
export function validateDocument(doc: MCDocument): {
  isValid: boolean;
  errors: MCIssue[];
  warnings: MCIssue[];
} {
  const errors: MCIssue[] = [];
  const warnings: MCIssue[] = [];

  // Validate version
  if (!doc.version) {
    errors.push({
      code: ErrorCode.MISSING_ATTRIBUTE,
      message: 'MCDocument requires a "version" field',
      severity: 'error',
    });
  }

  // Validate metadata
  if (!doc.metadata) {
    errors.push({
      code: ErrorCode.MISSING_ATTRIBUTE,
      message: 'MCDocument requires a "metadata" field',
      severity: 'error',
    });
  } else {
    if (!doc.metadata.id) {
      errors.push({
        code: ErrorCode.MISSING_ATTRIBUTE,
        message: 'MCDocument metadata requires an "id" field',
        severity: 'error',
      });
    }
    if (!doc.metadata.name) {
      errors.push({
        code: ErrorCode.MISSING_ATTRIBUTE,
        message: 'MCDocument metadata requires a "name" field',
        severity: 'error',
      });
    }
  }

  // Validate template
  if (!doc.template) {
    errors.push({
      code: ErrorCode.MISSING_ATTRIBUTE,
      message: 'MCDocument requires a "template" field with the root MCNode',
      severity: 'error',
    });
  } else {
    const templateResult = validateJSON(doc.template);
    errors.push(...templateResult.errors);
    warnings.push(...templateResult.warnings);
  }

  // Validate sampleData against dataSchema if both are present.
  // Mismatches surface as warnings (not errors) — sample data is a developer
  // affordance, not a runtime contract. The actual data passed at compile
  // time may differ.
  if (doc.dataSchema && doc.sampleData) {
    const sampleIssues = validateDataAgainstSchema(
      doc.sampleData,
      doc.dataSchema,
      'sampleData',
    );
    warnings.push(...sampleIssues);
  }

  return { isValid: errors.length === 0, errors, warnings };
}

// ---------------------------------------------------------------------------
// Data schema validation
// ---------------------------------------------------------------------------

/**
 * Validates a data object against an MCDataSchema. Returns a list of
 * type-mismatch and missing-required-field issues.
 *
 * Walks nested `object` and `array` fields recursively. Optional fields
 * (`optional: true`) may be missing or `null`/`undefined`. Required fields
 * must be present and match the declared `type`.
 *
 * @param data    - The object to validate.
 * @param schema  - The schema describing expected shape.
 * @param path    - Current dotted path for error messages (e.g. `"sampleData.user"`).
 * @returns Array of MCIssue describing mismatches. Empty if data conforms.
 */
export function validateDataAgainstSchema(
  data: unknown,
  schema: MCDataSchema,
  path = 'data',
): MCIssue[] {
  const issues: MCIssue[] = [];

  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    issues.push({
      code: ErrorCode.INVALID_NESTING,
      message: `${path} must be a plain object to match dataSchema, got ${typeOf(data)}`,
      severity: 'warning',
    });
    return issues;
  }

  const obj = data as Record<string, unknown>;
  for (const [key, field] of Object.entries(schema)) {
    const fieldPath = `${path}.${key}`;
    const value = obj[key];
    const present = key in obj && value !== undefined && value !== null;

    if (!present) {
      if (!field.optional) {
        issues.push({
          code: ErrorCode.MISSING_ATTRIBUTE,
          message: `${fieldPath} is required by dataSchema but missing`,
          severity: 'warning',
          fix: `Add "${key}" to ${path} or mark the field as optional in dataSchema`,
        });
      }
      continue;
    }

    issues.push(...checkFieldType(value, field, fieldPath));
  }

  return issues;
}

function checkFieldType(
  value: unknown,
  field: SchemaField,
  path: string,
): MCIssue[] {
  const issues: MCIssue[] = [];
  const actual = typeOf(value);

  switch (field.type) {
    case 'string':
    case 'number':
    case 'boolean':
      if (actual !== field.type) {
        issues.push({
          code: ErrorCode.INVALID_NESTING,
          message: `${path} expected ${field.type} per dataSchema, got ${actual}`,
          severity: 'warning',
        });
      }
      break;
    case 'object':
      if (actual !== 'object') {
        issues.push({
          code: ErrorCode.INVALID_NESTING,
          message: `${path} expected object per dataSchema, got ${actual}`,
          severity: 'warning',
        });
      } else if (field.properties) {
        issues.push(
          ...validateDataAgainstSchema(value, field.properties, path),
        );
      }
      break;
    case 'array':
      if (!Array.isArray(value)) {
        issues.push({
          code: ErrorCode.INVALID_NESTING,
          message: `${path} expected array per dataSchema, got ${actual}`,
          severity: 'warning',
        });
      } else if (field.itemSchema) {
        value.forEach((item, i) => {
          issues.push(
            ...validateDataAgainstSchema(item, field.itemSchema!, `${path}[${i}]`),
          );
        });
      }
      break;
  }

  return issues;
}

function typeOf(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

// ---------------------------------------------------------------------------
// Tree walker
// ---------------------------------------------------------------------------

/**
 * Recursively validates an MCNode and its children.
 *
 * @param node         - Current node to validate.
 * @param parent       - Parent node (null for root).
 * @param siblingIndex - Index of this node within parent's children array.
 * @param errors       - Error accumulator.
 * @param warnings     - Warning accumulator.
 * @param seenIds      - Set of seen IDs for uniqueness checking.
 */
function walkNode(
  node: MCNode,
  parent: MCNode | null,
  siblingIndex: number,
  errors: MCIssue[],
  warnings: MCIssue[],
  seenIds: Set<string>,
  ctx: PluginCtx,
): void {
  // 0. Defensive: malformed JSON may produce nodes without a `type` string.
  //    Bail with a clear error instead of crashing downstream (e.g. fuzzy
  //    suggestion lookups call .toLowerCase on the type string).
  if (typeof node.type !== 'string' || node.type.length === 0) {
    errors.push({
      code: ErrorCode.UNKNOWN_COMPONENT,
      message:
        `JSON node is missing a "type" string` +
        (node.id ? ` (id: ${node.id})` : '') +
        '. Every MCNode must have a non-empty `type` field.',
      severity: 'error',
    });
    // Continue traversing children so callers see all malformed nodes in one pass.
    walkChildren(node, errors, warnings, seenIds, ctx);
    return;
  }

  // ID uniqueness check
  if (node.id) {
    if (seenIds.has(node.id)) {
      errors.push({
        code: ErrorCode.INVALID_NESTING,
        message: `Duplicate node ID "${node.id}" in JSON tree`,
        severity: 'error',
      });
    } else {
      seenIds.add(node.id);
    }
  }

  // 1. Unknown component check.
  // Surfaced as an error (not a warning): the compiler has no rule for
  // unknown types and would either throw or silently drop the subtree.
  // Errors are honest about that — warnings would let validation pass for
  // input the compiler is guaranteed to reject.
  if (!KNOWN_COMPONENTS.has(node.type) && !ctx.rules.has(node.type)) {
    const suggestion = suggestComponent(node.type);
    errors.push({
      code: ErrorCode.UNKNOWN_COMPONENT,
      message: `Unknown component "${node.type}".${suggestion ? ' ' + suggestion : ''}`,
      severity: 'error',
    });
    walkChildren(node, errors, warnings, seenIds, ctx);
    return;
  }

  // 1b. Children of mc-attributes are attribute specifiers — skip normal validation.
  //     Step 6 (mc-attributes node handler) manages their specific checks.
  if (
    parent?.type === 'mc-attributes' &&
    (VALID_ATTRIBUTES_CHILDREN.has(node.type) || ctx.attrChildren.has(node.type))
  ) {
    return;
  }

  // Rule lookup: built-in first (fast static read), per-call plugin second.
  // Both flow through `deriveComponentRuleFromMetadata` so plugin nodes
  // receive the same nesting / required-attr enforcement as built-ins.
  const rule = COMPONENT_RULES[node.type] ?? ctx.rules.get(node.type);
  if (!rule) {
    errors.push({
      code: ErrorCode.UNKNOWN_COMPONENT,
      message: `Unknown component <${node.type}>.`,
      severity: 'error',
    });
    walkChildren(node, errors, warnings, seenIds, ctx);
    return;
  }

  // 2. content / children mutual exclusivity
  const meta = getComponentMetadata(node.type, ctx.metadata);
  if (meta) {
    const hasContent = typeof node.content === 'string' && node.content.length > 0;
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;

    if (hasContent && !meta.allowsTextContent) {
      errors.push({
        code: ErrorCode.INVALID_NESTING,
        message: `<${node.type}> does not accept text content — remove the "content" field`,
        severity: 'error',
        fix: `Delete the "content" field from the <${node.type}> node`,
      });
    }

    if (hasChildren && meta.maxChildren === 0) {
      errors.push({
        code: ErrorCode.INVALID_NESTING,
        message: `<${node.type}> is a leaf component and cannot have children`,
        severity: 'error',
        fix: `Remove the "children" array from the <${node.type}> node`,
      });
    }

    if (hasContent && hasChildren) {
      errors.push({
        code: ErrorCode.INVALID_NESTING,
        message: `<${node.type}> has both "content" and "children" — only one is allowed`,
        severity: 'error',
        fix: `Remove either "content" or "children" from the <${node.type}> node`,
      });
    }
  }

  // 3. Parent constraint (skip for logic tags)
  if (!LOGIC_TAGS.has(node.type) && rule.parent !== null && parent) {
    const validParents = [rule.parent, ...(rule.alternateParents ?? [])];
    const parentType = parent.type;
    const isInsideLogicTag = LOGIC_TAGS.has(parentType);
    if (!validParents.includes(parentType) && !isInsideLogicTag) {
      errors.push({
        code: ErrorCode.INVALID_NESTING,
        message: `<${node.type}> must be inside <${rule.parent}>, found inside <${parentType}>`,
        severity: 'error',
        fix: `Move <${node.type}> inside a <${rule.parent}> element`,
      });
    }
  }

  // 4. Required attributes
  for (const attr of rule.required) {
    if (!(attr in node.attributes)) {
      errors.push({
        code: ErrorCode.MISSING_ATTRIBUTE,
        message: `<${node.type}> requires "${attr}" attribute`,
        severity: 'error',
        fix: `Add "${attr}" to the attributes object of <${node.type}>`,
      });
    }
  }

  // 5. Logic ordering (mc-else-if / mc-else must follow mc-if)
  if (rule.mustFollow && parent?.children) {
    const siblings = parent.children;
    if (siblingIndex === 0) {
      errors.push({
        code: ErrorCode.INVALID_LOGIC_ORDER,
        message: `<${node.type}> must follow <mc-if> or <mc-else-if>, but is the first child`,
        severity: 'error',
        fix: `Add an <mc-if> before <${node.type}>`,
      });
    } else {
      const prevSibling = siblings[siblingIndex - 1];
      if (prevSibling && !rule.mustFollow.includes(prevSibling.type)) {
        errors.push({
          code: ErrorCode.INVALID_LOGIC_ORDER,
          message: `<${node.type}> must follow <mc-if> or <mc-else-if>, found after <${prevSibling.type}>`,
          severity: 'error',
          fix: `Move <${node.type}> immediately after an <mc-if> or <mc-else-if>`,
        });
      }
    }
  }

  // 7. mc-attributes children must be valid targets
  if (node.type === 'mc-attributes' && node.children) {
    for (const child of node.children) {
      const isValidChild =
        VALID_ATTRIBUTES_CHILDREN.has(child.type) || ctx.attrChildren.has(child.type);
      if (!isValidChild) {
        errors.push({
          code: ErrorCode.INVALID_NESTING,
          message: `<mc-attributes> child <${child.type}> is not a valid attribute target`,
          severity: 'error',
          fix: `Use mc-all, mc-class, or any registered component type (e.g. mc-text, mc-button)`,
        });
      } else if (child.type === 'mc-class' && !child.attributes?.['name']) {
        errors.push({
          code: ErrorCode.MISSING_ATTRIBUTE,
          message: `<mc-class> requires "name" attribute`,
          severity: 'error',
          fix: `Add name: "..." to the mc-class node`,
        });
      }
    }
  }

  // Recurse children
  walkChildren(node, errors, warnings, seenIds, ctx);
}

/**
 * Walks all children of a node, passing sibling index for ordering checks.
 *
 * @param node     - Parent node.
 * @param errors   - Error accumulator.
 * @param warnings - Warning accumulator.
 * @param seenIds  - Set of seen IDs.
 * @param ctx      - Per-call plugin lookup tables (empty when no plugins).
 */
function walkChildren(
  node: MCNode,
  errors: MCIssue[],
  warnings: MCIssue[],
  seenIds: Set<string>,
  ctx: PluginCtx,
): void {
  if (!node.children) {
    return;
  }
  node.children.forEach((child, i) => {
    walkNode(child, node, i, errors, warnings, seenIds, ctx);
  });
}
