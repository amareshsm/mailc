/**
 * mailc AST validator — walks the parsed AST and collects semantic errors/warnings.
 *
 * Catches: invalid nesting, missing required attributes, unknown components,
 * unknown attributes, logic ordering, column limits, mc-head placement,
 * mc-attributes child validity.
 *
 * @module validator
 */
import type { ASTNode, MCIssue, ValidationResult } from '../types.js';
import { ErrorCode } from '../errors/codes.js';
import {
  COMPONENT_RULES,
  KNOWN_COMPONENTS,
  LOGIC_TAGS,
  VALID_ATTRIBUTES_CHILDREN,
  GLOBAL_ATTRIBUTES,
} from './rules.js';
import { suggestComponent, suggestAttribute } from './suggestions.js';

/**
 * Validates a parsed AST and returns all errors/warnings at once.
 *
 * @param ast - The root ASTNode (type = "root") from `parse()`.
 * @returns A `ValidationResult` with `isValid`, `errors`, and `warnings`.
 */
export function validate(ast: ASTNode): ValidationResult {
  const errors: MCIssue[] = [];
  const warnings: MCIssue[] = [];

  walkNode(ast, null, 0, errors, warnings);

  return { isValid: errors.length === 0, errors, warnings };
}

// ---------------------------------------------------------------------------
// Tree walker
// ---------------------------------------------------------------------------

/** Recursively validates a node and its children. */
function walkNode(
  node: ASTNode,
  parent: ASTNode | null,
  siblingIndex: number,
  errors: MCIssue[],
  warnings: MCIssue[],
): void {
  // Skip the synthetic "root" wrapper
  if (node.type === 'root') {
    node.children.forEach((child, i) => walkNode(child, node, i, errors, warnings));
    return;
  }

  // 1. Unknown component check
  if (!KNOWN_COMPONENTS.has(node.type)) {
    const suggestion = suggestComponent(node.type);
    warnings.push({
      code: ErrorCode.UNKNOWN_COMPONENT,
      message: `Unknown component <${node.type}>.${suggestion ? ' ' + suggestion : ''}`,
      severity: 'warning',
      loc: locOf(node),
    });
    // Still recurse children even for unknown components
    node.children.forEach((child, i) => walkNode(child, node, i, errors, warnings));
    return;
  }

  // 1b. Children of mc-attributes are attribute specifiers, not real components.
  //     Skip normal nesting/required checks — mc-attributes validation (step 7) handles these.
  if (parent?.type === 'mc-attributes' && VALID_ATTRIBUTES_CHILDREN.has(node.type)) {
    return;
  }

  const rule = COMPONENT_RULES[node.type];
  if (!rule) {
    // Should not happen — unknown component should have been caught earlier
    return;
  }

  // 2. Parent constraint (skip for logic tags — they can appear anywhere)
  if (!LOGIC_TAGS.has(node.type) && rule.parent !== null && parent) {
    const validParents = [rule.parent, ...(rule.alternateParents ?? [])];
    const parentType = parent.type;
    // Allow logic wrappers as parent (mc-if, mc-each, etc.)
    // "root" is a synthetic wrapper — if a component requires a specific parent and
    // is at root level, that IS a nesting error (e.g. mc-section without mc-body).
    const isInsideLogicTag = LOGIC_TAGS.has(parentType);
    if (!validParents.includes(parentType) && !isInsideLogicTag) {
      const context = parentType === 'root' ? 'at root level' : `inside <${parentType}>`;
      errors.push({
        code: ErrorCode.INVALID_NESTING,
        message: `<${node.type}> must be inside <${rule.parent}>, found ${context}`,
        severity: 'error',
        loc: locOf(node),
        fix: `Move <${node.type}> inside a <${rule.parent}> element`,
      });
    }
  }

  // 3. Required attributes
  for (const attr of rule.required) {
    if (!(attr in node.attributes)) {
      errors.push({
        code: ErrorCode.MISSING_ATTRIBUTE,
        message: `<${node.type}> requires "${attr}" attribute`,
        severity: 'error',
        loc: locOf(node),
        fix: `Add ${attr}="..." to <${node.type}>`,
      });
    }
  }

  // 4. Logic ordering (mustFollow)
  if (rule.mustFollow && parent) {
    const prevSibling = parent.children[siblingIndex - 1];
    if (!prevSibling || !rule.mustFollow.includes(prevSibling.type)) {
      errors.push({
        code: ErrorCode.INVALID_LOGIC_ORDER,
        message: `<${node.type}> must directly follow <${rule.mustFollow.join('> or <')}>`,
        severity: 'error',
        loc: locOf(node),
      });
    }
  }

  // 6. mc-attributes children must be valid types
  if (node.type === 'mc-attributes') {
    for (const child of node.children) {
      if (!VALID_ATTRIBUTES_CHILDREN.has(child.type)) {
        errors.push({
          code: ErrorCode.INVALID_ATTRIBUTES_CHILD,
          message: `<${child.type}> is not a valid child of <mc-attributes>. Allowed: ${Array.from(VALID_ATTRIBUTES_CHILDREN).join(', ')}`,
          severity: 'error',
          loc: locOf(child),
        });
      } else if (child.type === 'mc-class' && !child.attributes['name']) {
        // mc-class skips step 3 (required attrs) via step 1b early-return — check name explicitly
        errors.push({
          code: ErrorCode.MISSING_ATTRIBUTE,
          message: `<mc-class> requires "name" attribute`,
          severity: 'error',
          loc: locOf(child),
          fix: `Add name="..." to <mc-class>`,
        });
      }
    }
  }

  // 7. Unknown attribute warnings
  checkUnknownAttributes(node, rule.knownAttributes, warnings);

  // 8. mc-raw: do NOT recurse into raw HTML content.
  //    The children of mc-raw are arbitrary HTML elements (table, tr, td, p, img, etc.)
  //    that are intentionally passed through unprocessed. Validating them would produce
  //    spurious UNKNOWN_COMPONENT warnings for every native HTML tag.
  if (node.type === 'mc-raw') {
    return;
  }

  // 9. mc-table gets a dedicated sub-validator.
  //    Standard child recursion would fire "unknown component" warnings for
  //    every <tr>, <td>, <th>, <thead>, <tbody>, <tfoot> inside the table.
  if (node.type === 'mc-table') {
    validateMcTable(node, errors, warnings);
    return;
  }

  // 10. mc-hero: mc-section and mc-column are forbidden direct children.
  //    Emit HERO_INVALID_CHILD for each offending node and skip recursing
  //    into it (to avoid a redundant INVALID_NESTING error for the same node).
  if (node.type === 'mc-hero') {
    const invalidChildren = new Set<ASTNode>();
    for (const child of node.children) {
      if (LOGIC_TAGS.has(child.type)) continue;
      if (child.type === 'mc-section' || child.type === 'mc-column') {
        errors.push({
          code: ErrorCode.HERO_INVALID_CHILD,
          message:
            `<${child.type}> cannot be a direct child of <mc-hero>. ` +
            `Place content components (mc-text, mc-button, mc-image, mc-spacer, mc-divider) directly inside mc-hero.`,
          severity: 'error',
          loc: locOf(child),
          fix: `Remove <${child.type}> from inside <mc-hero> and place mc-text, mc-button, or mc-image directly.`,
        });
        invalidChildren.add(child);
      }
    }
    // Recurse only valid children — skip the already-errored ones
    node.children.forEach((child, i) => {
      if (!invalidChildren.has(child)) {
        walkNode(child, node, i, errors, warnings);
      }
    });
    return;
  }

  // Recurse children
  node.children.forEach((child, i) => walkNode(child, node, i, errors, warnings));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Checks for unknown attributes on a node and emits warnings. */
function checkUnknownAttributes(
  node: ASTNode,
  knownAttrs: string[],
  warnings: MCIssue[],
): void {
  const known = new Set([...knownAttrs, ...GLOBAL_ATTRIBUTES]);

  for (const attr of Object.keys(node.attributes)) {
    if (!known.has(attr)) {
      const suggestion = suggestAttribute(attr, node.type);
      warnings.push({
        code: ErrorCode.UNKNOWN_ATTRIBUTE,
        message: `Unknown attribute "${attr}" on <${node.type}>.${suggestion ? ' ' + suggestion : ''}`,
        severity: 'warning',
        loc: locOf(node),
      });
    }
  }
}

/** Extracts a simple loc object from an ASTNode for issue reporting. */
function locOf(node: ASTNode): { line: number; col: number } {
  return { line: node.loc.start.line, col: node.loc.start.col };
}

// ---------------------------------------------------------------------------
// mc-table validation (Phase 4 + 5)
// ---------------------------------------------------------------------------

/** HTML elements that are structurally valid inside mc-table. */
const TABLE_HTML_ELEMENTS = new Set([
  'thead', 'tbody', 'tfoot', 'tr', 'td', 'th',
]);

/** Block-level HTML elements that are invalid directly inside <tr>. */
const INVALID_TR_CHILDREN = new Set(['div', 'p', 'section', 'article']);

/**
 * Validates the full content tree of an `mc-table` node.
 *
 * Runs 4 errors + 4 warnings without triggering "unknown component" noise
 * for standard HTML table elements.
 *
 * @param tableNode - The `mc-table` AST node.
 * @param errors    - Accumulated errors array (mutated).
 * @param warnings  - Accumulated warnings array (mutated).
 */
function validateMcTable(
  tableNode: ASTNode,
  errors: MCIssue[],
  warnings: MCIssue[],
): void {
  const allThs: ASTNode[] = [];
  const allRows: ASTNode[] = [];

  walkTableContent(tableNode.children, 'mc-table', errors, warnings, allThs, allRows);

  // ── a11y warning: no <th> anywhere in the table ──────────────────────
  if (allThs.length === 0) {
    warnings.push({
      code: ErrorCode.TABLE_MISSING_HEADERS,
      message: 'Table has no header cells (<th>). Add headers for accessibility.',
      severity: 'warning',
      loc: locOf(tableNode),
      fix: 'Add <th scope="col">Column name</th> in a header row.',
    });
  }

  // ── a11y warning: <th> missing scope ─────────────────────────────────
  for (const th of allThs) {
    if (!th.attributes['scope']) {
      warnings.push({
        code: ErrorCode.TABLE_MISSING_SCOPE,
        message: 'Header cell <th> is missing a scope attribute. Add scope="col" or scope="row".',
        severity: 'warning',
        loc: locOf(th),
        fix: 'Add scope="col" to column headers or scope="row" to row headers.',
      });
    }
  }

  // ── structural warnings: column counts ───────────────────────────────
  analyzeTableColumns(allRows, warnings);
}

/**
 * Recursively walks the HTML children of an mc-table, collecting rows and
 * th elements while checking for structural errors.
 *
 * Logic nodes (mc-each, mc-if, …) are transparent — their children are
 * walked as if they were inline.
 *
 * @param children   - The child nodes to walk.
 * @param parentType - The type string of the immediate parent node.
 * @param errors     - Accumulated errors (mutated).
 * @param warnings   - Accumulated warnings (mutated).
 * @param allThs     - Collected th nodes (mutated).
 * @param allRows    - Collected tr nodes (mutated).
 */
function walkTableContent(
  children: ASTNode[],
  parentType: string,
  errors: MCIssue[],
  warnings: MCIssue[],
  allThs: ASTNode[],
  allRows: ASTNode[],
): void {
  for (const child of children) {
    // Logic wrappers are transparent — recurse into their children
    if (LOGIC_TAGS.has(child.type)) {
      walkTableContent(child.children, parentType, errors, warnings, allThs, allRows);
      continue;
    }

    // Nested mc-table → error
    if (child.type === 'mc-table') {
      errors.push({
        code: ErrorCode.INVALID_NESTING,
        message: 'Nested <mc-table> is not supported.',
        severity: 'error',
        loc: locOf(child),
        fix: 'Flatten the table structure — use a single <mc-table>.',
      });
      continue;
    }

    // mc-* component directly inside a cell → error
    if (child.type.startsWith('mc-') && (parentType === 'td' || parentType === 'th')) {
      errors.push({
        code: ErrorCode.TABLE_INVALID_CHILD,
        message: `<${child.type}> cannot be used inside <mc-table>. Use plain text or <b>, <a> HTML.`,
        severity: 'error',
        loc: locOf(child),
        fix: `Replace <${child.type}> with plain HTML inside the table cell.`,
      });
      continue;
    }

    // Block HTML elements directly inside a <tr> → error
    if (INVALID_TR_CHILDREN.has(child.type) && parentType === 'tr') {
      errors.push({
        code: ErrorCode.TABLE_INVALID_CHILD,
        message: `<${child.type}> is not valid inside a table row. Use <td> or <th>.`,
        severity: 'error',
        loc: locOf(child),
        fix: 'Wrap content in <td> or <th> inside the table row.',
      });
      continue;
    }

    // Collect for a11y analysis
    if (child.type === 'th') {
      allThs.push(child);
    }
    if (child.type === 'tr') {
      allRows.push(child);
    }

    // Recurse into known table HTML elements
    if (TABLE_HTML_ELEMENTS.has(child.type)) {
      walkTableContent(child.children, child.type, errors, warnings, allThs, allRows);
    }
  }
}

/**
 * Checks row column counts and colspan values for consistency warnings.
 *
 * @param rows     - All collected `<tr>` nodes.
 * @param warnings - Accumulated warnings (mutated).
 */
function analyzeTableColumns(rows: ASTNode[], warnings: MCIssue[]): void {
  if (rows.length === 0) return;

  const cellCounts = rows.map(
    (row) => row.children.filter((c) => c.type === 'td' || c.type === 'th').length,
  );
  const baseCount = cellCounts[0] ?? 0;

  for (let i = 1; i < rows.length; i++) {
    if (cellCounts[i] !== baseCount) {
      const row = rows[i];
      warnings.push({
        code: ErrorCode.TABLE_INCONSISTENT_COLUMNS,
        message:
          `Row ${i + 1} has ${cellCounts[i]} cells but row 1 has ${baseCount}. ` +
          'This may cause misaligned rendering.',
        severity: 'warning',
        loc: row ? locOf(row) : undefined,
      });
    }
  }

  for (const row of rows) {
    for (const cell of row.children) {
      if (cell.type !== 'td' && cell.type !== 'th') continue;
      const colspan = parseInt(cell.attributes['colspan'] ?? '1', 10);
      if (!isNaN(colspan) && colspan > baseCount) {
        warnings.push({
          code: ErrorCode.TABLE_COLSPAN_EXCEEDS_COLUMNS,
          message:
            `colspan=${colspan} exceeds the table's column count (${baseCount}). ` +
            'Verify this is intentional.',
          severity: 'warning',
          loc: locOf(cell),
        });
      }
    }
  }
}
