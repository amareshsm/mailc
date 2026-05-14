/**
 * `mailc contract` command implementation.
 *
 * Reads a `.mc` or `.json` template file, parses it into an AST,
 * then uses `introspect.dataContract()` to extract the data contract —
 * which fields the template requires, which are optional, and what
 * each loop iterates over.
 *
 * **Supported output formats:**
 * - `markdown` (default) — human-readable Markdown document
 * - `json`               — machine-readable JSON (DataContract object)
 *
 * @module cli/contract-command
 */

import fs from 'node:fs';
import path from 'node:path';
import { tokenize } from '../tokenizer/index.js';
import { parse } from '../parser/index.js';
import { jsonToAST } from '../json/index.js';
import { introspect } from '../introspect/index.js';
import type { DataContract, DataContractField, DataContractLoop } from '../introspect/index.js';
import type { MailcConfig } from '../types.js';
import type { MCNode } from '../json/schema.js';
import { error, warn } from './output.js';
import { EXIT_SUCCESS, EXIT_COMPILE_ERROR, EXIT_IO_ERROR } from './exit-codes.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Options parsed from `mailc contract` CLI flags. */
export interface ContractFlags {
  /** Output format: "markdown" (default) or "json". */
  format: 'markdown' | 'json';
  /** Optional path to write the output file (defaults to stdout). */
  output?: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Executes the `mailc contract` command.
 *
 * @param inputPath - Path to the `.mc` or `.json` template file.
 * @param flags     - Parsed CLI flags.
 * @param _config   - The merged MailcConfig (reserved for future use).
 * @returns Exit code.
 */
export function runContract(
  inputPath: string,
  flags: ContractFlags,
  _config: Partial<MailcConfig>,
): number {
  const resolved = path.resolve(inputPath);

  if (!fs.existsSync(resolved)) {
    process.stderr.write(error(`File not found: ${resolved}`) + '\n');
    return EXIT_IO_ERROR;
  }

  let source: string;
  try {
    source = fs.readFileSync(resolved, 'utf-8');
  } catch {
    process.stderr.write(error(`Cannot read file: ${resolved}`) + '\n');
    return EXIT_IO_ERROR;
  }

  const ext = path.extname(resolved).toLowerCase();

  let contract: DataContract;
  try {
    if (ext === '.json') {
      contract = extractContractFromJson(source, resolved);
    } else {
      contract = extractContractFromMc(source, resolved);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(error(`Failed to extract contract from ${resolved}: ${msg}`) + '\n');
    return EXIT_COMPILE_ERROR;
  }

  const formatted =
    flags.format === 'json'
      ? formatJson(contract)
      : formatMarkdown(contract, path.basename(resolved));

  if (flags.output) {
    const outPath = path.resolve(flags.output);
    try {
      fs.writeFileSync(outPath, formatted, 'utf-8');
      process.stdout.write(warn(`Contract written to ${outPath}`) + '\n');
    } catch {
      process.stderr.write(error(`Cannot write output to: ${outPath}`) + '\n');
      return EXIT_IO_ERROR;
    }
  } else {
    process.stdout.write(formatted + '\n');
  }

  return EXIT_SUCCESS;
}

// ---------------------------------------------------------------------------
// Contract extraction
// ---------------------------------------------------------------------------

/**
 * Parses a `.mc` template source and extracts its data contract.
 *
 * @param source   - Raw `.mc` source string.
 * @param filePath - Path used for error messages.
 * @returns The extracted DataContract.
 */
function extractContractFromMc(source: string, filePath: string): DataContract {
  try {
    const tokens = tokenize(source);
    const ast = parse(tokens);
    return introspect.dataContract(ast);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Parse error in ${filePath}: ${msg}`);
  }
}

/**
 * Parses a `.json` template file (MCDocument or MCNode) and extracts its
 * data contract by converting it to an AST first.
 *
 * @param source   - Raw JSON string.
 * @param filePath - Path used for error messages.
 * @returns The extracted DataContract.
 */
function extractContractFromJson(source: string, filePath: string): DataContract {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error(`Invalid JSON in ${filePath}`);
  }

  const ast = jsonToAST(parsed as MCNode);
  return introspect.dataContract(ast);
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

/**
 * Formats a DataContract as JSON.
 *
 * @param contract - The data contract to format.
 * @returns Pretty-printed JSON string.
 */
function formatJson(contract: DataContract): string {
  return JSON.stringify(contract, null, 2);
}

/**
 * Formats a DataContract as a Markdown document.
 *
 * Produces a structured, human-readable summary suitable for:
 * - Team documentation
 * - PR descriptions
 * - Handoff to marketing/CMS teams
 *
 * @param contract - The data contract.
 * @param fileName - Template file name (used as the doc title).
 * @returns Markdown string.
 */
function formatMarkdown(contract: DataContract, fileName: string): string {
  const lines: string[] = [];

  lines.push(`# Data Contract — \`${fileName}\``);
  lines.push('');
  lines.push('> Auto-generated by `mailc contract`. Do not edit manually.');
  lines.push('');

  // ── Required fields ────────────────────────────────────────────────────
  lines.push('## Required Fields');
  lines.push('');
  lines.push('These fields must always be present in the template data.');
  lines.push('Missing them will result in empty or broken output.');
  lines.push('');

  if (contract.required.length === 0) {
    lines.push('_No unconditionally required fields._');
  } else {
    lines.push('| Field | Used As | Source Location |');
    lines.push('|-------|---------|-----------------|');
    for (const field of contract.required) {
      lines.push(fieldRow(field));
    }
  }
  lines.push('');

  // ── Optional fields ────────────────────────────────────────────────────
  lines.push('## Optional Fields');
  lines.push('');
  lines.push('These fields are only accessed inside `mc-if` branches.');
  lines.push('The template renders safely without them, but the conditional content will be absent.');
  lines.push('');

  if (contract.optional.length === 0) {
    lines.push('_No optional fields._');
  } else {
    lines.push('| Field | Condition | Used As | Source Location |');
    lines.push('|-------|-----------|---------|-----------------|');
    for (const field of contract.optional) {
      const condition = field.condition ? `\`${field.condition}\`` : '_(mc-else branch)_';
      const loc = locationString(field);
      lines.push(`| \`${field.path}\` | ${condition} | ${field.usedIn} | ${loc} |`);
    }
  }
  lines.push('');

  // ── Loops ───────────────────────────────────────────────────────────────
  lines.push('## Loops');
  lines.push('');
  lines.push('Each `mc-each` / `mc-for-each` loop and the fields it accesses on each item.');
  lines.push('');

  if (contract.loops.length === 0) {
    lines.push('_No loops._');
  } else {
    for (const loop of contract.loops) {
      lines.push(loopSection(loop));
    }
  }
  lines.push('');

  // ── Shape summary ──────────────────────────────────────────────────────
  lines.push('## Shape Summary');
  lines.push('');
  lines.push('Rough object structure the template expects:');
  lines.push('');
  lines.push('```');
  lines.push(buildShapeSummary(contract));
  lines.push('```');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Markdown helpers
// ---------------------------------------------------------------------------

/**
 * Builds a table row for a required DataContractField.
 *
 * @param field - The field entry.
 * @returns Markdown table row string.
 */
function fieldRow(field: DataContractField): string {
  const loc = locationString(field);
  return `| \`${field.path}\` | ${field.usedIn} | ${loc} |`;
}

/**
 * Builds a Markdown sub-section for a single loop.
 *
 * @param loop - The loop entry.
 * @returns Markdown string for this loop.
 */
function loopSection(loop: DataContractLoop): string {
  const lines: string[] = [];
  lines.push(`### \`${loop.variable}\` in \`${loop.source}\` _(line ${loop.location.line})_`);
  lines.push('');
  if (loop.usedPaths.length === 0) {
    lines.push(`_No fields accessed on \`${loop.variable}\` inside the loop body._`);
  } else {
    lines.push('Fields accessed per iteration:');
    lines.push('');
    for (const p of loop.usedPaths) {
      lines.push(`- \`${p}\``);
    }
  }
  lines.push('');
  return lines.join('\n');
}

/**
 * Formats the first source location of a field as a compact string.
 *
 * @param field - The DataContractField.
 * @returns Location string e.g. `"line 12, col 8"`.
 */
function locationString(field: DataContractField): string {
  const first = field.locations[0];
  if (!first) {
    return '—';
  }
  return `line ${first.line}, col ${first.col}`;
}

/**
 * Builds a plain-text pseudo-type shape for the template data object.
 *
 * Groups fields by their top-level key and shows nested structure.
 * Loops are shown as `Array<{ ... }>`.
 *
 * @param contract - The full DataContract.
 * @returns Multi-line shape summary string.
 */
function buildShapeSummary(contract: DataContract): string {
  // Collect all top-level keys and their nested paths
  const shape = new Map<string, Set<string>>();

  const addPath = (dotPath: string): void => {
    const segments = dotPath.split('.');
    const root = segments[0];
    if (!root) {
      return;
    }
    if (!shape.has(root)) {
      shape.set(root, new Set<string>());
    }
    if (segments.length > 1) {
      shape.get(root)?.add(segments.slice(1).join('.'));
    }
  };

  for (const f of [...contract.required, ...contract.optional]) {
    addPath(f.path);
  }
  // Add loop sources
  for (const l of contract.loops) {
    addPath(l.source);
  }

  const lines: string[] = ['{'];

  for (const [root, children] of shape) {
    // Check if this root itself is a direct loop source (e.g. source="items" with root="items")
    const directLoop = contract.loops.find((l) => l.source === root);
    const isRequired = contract.required.some((f) => f.path === root || f.path.startsWith(`${root}.`));
    const optMark = isRequired ? '' : '?';

    if (directLoop) {
      // Top-level array: items: Array<{ name, price }>
      lines.push(`  ${root}${optMark}: Array<{`);
      for (const p of directLoop.usedPaths) {
        const itemField = p.replace(`${directLoop.variable}.`, '');
        lines.push(`    ${itemField},`);
      }
      lines.push('  }>,');
    } else if (children.size > 0) {
      lines.push(`  ${root}${optMark}: {`);
      for (const child of children) {
        // Check if this child is itself a loop source (e.g. root="order", child="items" -> "order.items")
        const nestedLoop = contract.loops.find((l) => l.source === `${root}.${child}`);
        if (nestedLoop) {
          const childIsRequired = contract.required.some((f) => f.path === `${root}.${child}`);
          const childOptMark = childIsRequired ? '' : '?';
          lines.push(`    ${child}${childOptMark}: Array<{`);
          for (const p of nestedLoop.usedPaths) {
            const itemField = p.replace(`${nestedLoop.variable}.`, '');
            lines.push(`      ${itemField},`);
          }
          lines.push('    }>,');
        } else {
          lines.push(`    ${child},`);
        }
      }
      lines.push('  },');
    } else {
      lines.push(`  ${root}${optMark},`);
    }
  }

  lines.push('}');
  return lines.join('\n');
}
