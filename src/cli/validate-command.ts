/**
 * `mailc validate` command implementation.
 *
 * Parses and validates `.mc` and `.json` files without compiling.
 * Faster than `build` — useful for CI and pre-commit hooks.
 *
 * **Dual-input support:**
 * - `.mc` files → tokenize + parse + validate (AST validation)
 * - `.json` files → parse JSON + validate MCNode tree
 *
 * @module cli/validate-command
 */

import fs from 'node:fs';
import path from 'node:path';
import type { MCIssue, MailcConfig } from '../types.js';
import { tokenize } from '../tokenizer/index.js';
import { parse } from '../parser/index.js';
import { validate } from '../validator/index.js';
import { validateJSON } from '../json/index.js';
import type { MCNode } from '../json/schema.js';
import {
  success,
  error,
  warn,
  info,
  formatIssues,
  formatBatchSummary,
} from './output.js';
import {
  EXIT_SUCCESS,
  EXIT_COMPILE_ERROR,
  EXIT_IO_ERROR,
} from './exit-codes.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Options parsed from the `mailc validate` CLI flags. */
export interface ValidateFlags {
  /** Output format: "text" (default) or "json". */
  format: 'text' | 'json';
  /** Show verbose output. */
  verbose: boolean;
}

/** Validation result for a single file. */
interface FileValidationResult {
  file: string;
  isValid: boolean;
  errors: MCIssue[];
  warnings: MCIssue[];
}

// ---------------------------------------------------------------------------
// Supported extensions
// ---------------------------------------------------------------------------

const VALIDATABLE_EXTENSIONS = new Set(['.mc', '.json']);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Executes the `mailc validate` command.
 *
 * @param inputPath    - The input file or directory path.
 * @param flags        - Parsed CLI flags.
 * @param _config      - The merged config (reserved for future use).
 * @returns Exit code.
 */
export function runValidate(
  inputPath: string,
  flags: ValidateFlags,
  _config: Partial<MailcConfig>,
): number {
  const resolved = path.resolve(inputPath);

  if (!fs.existsSync(resolved)) {
    process.stderr.write(error(`File not found: ${resolved}`) + '\n');
    return EXIT_IO_ERROR;
  }

  const stat = fs.statSync(resolved);
  const files = stat.isDirectory() ? collectValidatableFiles(resolved) : [resolved];

  if (files.length === 0) {
    process.stderr.write(warn(`No .mc or .json files found in ${resolved}`) + '\n');
    return EXIT_SUCCESS;
  }

  const results: FileValidationResult[] = [];

  if (flags.verbose && files.length > 1) {
    process.stderr.write(info(`Validating ${files.length} files...`) + '\n');
  }

  const startTime = performance.now();

  for (const file of files) {
    results.push(validateFile(file));
  }

  const elapsed = performance.now() - startTime;

  // Output results
  if (flags.format === 'json') {
    outputJson(results);
  } else {
    outputText(results, files.length > 1 ? resolved : undefined, elapsed);
  }

  const hasErrors = results.some((r) => !r.isValid);
  return hasErrors ? EXIT_COMPILE_ERROR : EXIT_SUCCESS;
}

// ---------------------------------------------------------------------------
// Core validation
// ---------------------------------------------------------------------------

/**
 * Validates a single file, auto-detecting the input type.
 *
 * @param filePath - Absolute path to the file.
 * @returns The validation result.
 */
function validateFile(filePath: string): FileValidationResult {
  let source: string;
  try {
    source = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return {
      file: filePath,
      isValid: false,
      errors: [{ code: 'IO_ERROR', message: `Cannot read file: ${filePath}`, severity: 'error' }],
      warnings: [],
    };
  }

  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.json') {
    return validateJsonFile(source, filePath);
  }

  return validateMcFile(source, filePath);
}

/**
 * Validates a `.mc` markup file.
 *
 * Pipeline: tokenize → parse → validate.
 *
 * @param source   - File contents.
 * @param filePath - File path for error reporting.
 * @returns The validation result.
 */
function validateMcFile(source: string, filePath: string): FileValidationResult {
  const errors: MCIssue[] = [];
  const warnings: MCIssue[] = [];

  // Tokenize
  try {
    const tokens = tokenize(source);
    const ast = parse(tokens);
    const result = validate(ast);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push({
      code: 'PARSE_ERROR',
      message: msg,
      severity: 'error',
    });
  }

  return {
    file: filePath,
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates a `.json` template file.
 *
 * Parses JSON and runs MCNode tree validation.
 *
 * @param source   - File contents.
 * @param filePath - File path for error reporting.
 * @returns The validation result.
 */
function validateJsonFile(source: string, filePath: string): FileValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source) as unknown;
  } catch {
    return {
      file: filePath,
      isValid: false,
      errors: [{
        code: 'JSON_PARSE_ERROR',
        message: `Invalid JSON in ${path.basename(filePath)}`,
        severity: 'error',
      }],
      warnings: [],
    };
  }

  // Skip files that are clearly not mailc templates (no "type" or "template" key).
  // Data files, config files, and other JSON in the same directory share the .json
  // extension — silently skip them rather than producing confusing validation errors.
  const obj = parsed as Record<string, unknown>;
  if (!obj['type'] && !obj['template']) {
    return { file: filePath, isValid: true, errors: [], warnings: [] };
  }

  // Extract root node (MCDocument has "template", MCNode has "type")
  const rootNode: MCNode = obj['template']
    ? (obj['template'] as MCNode)
    : (parsed as MCNode);

  const result = validateJSON(rootNode);

  return {
    file: filePath,
    isValid: result.errors.length === 0,
    errors: result.errors,
    warnings: result.warnings,
  };
}

// ---------------------------------------------------------------------------
// Output formatters
// ---------------------------------------------------------------------------

/**
 * Outputs validation results as human-readable text.
 *
 * @param results - Validation results for all files.
 * @param dirPath - Directory path (for batch display), or undefined.
 * @param elapsed - Total elapsed time in milliseconds.
 */
function outputText(
  results: FileValidationResult[],
  dirPath: string | undefined,
  elapsed: number,
): void {
  for (const r of results) {
    const display = dirPath ? path.relative(dirPath, r.file) : path.basename(r.file);

    if (r.isValid && r.warnings.length === 0) {
      process.stderr.write(success(`${display} — valid`) + '\n');
    } else if (r.isValid) {
      process.stderr.write(success(`${display} — valid`) + '\n');
      process.stderr.write(formatIssues(r.warnings) + '\n');
    } else {
      process.stderr.write(error(`${display} — invalid`) + '\n');
      process.stderr.write(formatIssues([...r.errors, ...r.warnings]) + '\n');
    }
  }

  if (results.length > 1) {
    const passed = results.filter((r) => r.isValid).length;
    const failed = results.length - passed;
    const totalWarnings = results.reduce((n, r) => n + r.warnings.length, 0);
    process.stderr.write(formatBatchSummary(results.length, passed, failed, totalWarnings, elapsed) + '\n');
  }
}

/**
 * Outputs validation results as JSON (for CI piping).
 *
 * @param results - Validation results for all files.
 */
function outputJson(results: FileValidationResult[]): void {
  const output = results.map((r) => ({
    file: r.file,
    isValid: r.isValid,
    errors: r.errors,
    warnings: r.warnings,
  }));

  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Recursively collects all validatable files from a directory.
 *
 * @param dirPath - Absolute directory path.
 * @returns Array of absolute file paths.
 */
function collectValidatableFiles(dirPath: string): string[] {
  const results: string[] = [];

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) {
        continue;
      }
      results.push(...collectValidatableFiles(full));
    } else if (VALIDATABLE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      results.push(full);
    }
  }

  return results.sort();
}
