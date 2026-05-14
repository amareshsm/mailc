/**
 * Compile dispatch — auto-detects input type and routes to the right pipeline.
 *
 * Handles both `.mc` markup files and `.json` template files.
 * Extracted from build-command.ts to keep file sizes under 400 lines.
 *
 * Node-only: uses `node:fs` and `node:path`.
 *
 * @module cli/compile-dispatch
 */

import fs from 'node:fs';
import path from 'node:path';
import type { CompileOptions, CompileResult, MailcConfig } from '../types.js';
import { compile } from '../compile.js';
import { DEFAULT_CLIENTS } from '../config.js';
import { compileFromJSON } from '../json/index.js';
import type { MCNode } from '../json/schema.js';
import type { BuildFlags } from './build-command.js';
import { error } from './output.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Return value of {@link compileFile}.
 *
 * Bundles the compile result with the raw source string so callers can
 * pass it to the rich error formatter without re-reading the file.
 */
export interface CompileFileResult {
  /** The compile result (html, errors, warnings, stats). */
  result: CompileResult;
  /**
   * The raw source string that was compiled.
   * For .mc files this is the template text; for .json files it's the JSON string.
   */
  source: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compiles a single file, auto-detecting the input type (.mc or .json).
 *
 * @param filePath     - Absolute path to the input file.
 * @param flags        - Parsed CLI flags.
 * @param mergedConfig - The merged config.
 * @returns The compile file result (result + source), or null if the file couldn't be read.
 */
export function compileFile(
  filePath: string,
  flags: BuildFlags,
  mergedConfig: Partial<MailcConfig>,
): CompileFileResult | null {
  let source: string;
  try {
    source = fs.readFileSync(filePath, 'utf-8');
  } catch {
    process.stderr.write(error(`Cannot read file: ${filePath}`) + '\n');
    return null;
  }

  const options = buildCompileOptions(filePath, flags, mergedConfig);
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.json') {
    return { result: compileJsonFile(source, filePath, options), source };
  }

  // Default: treat as .mc markup
  return { result: compile(source, options), source };
}

// ---------------------------------------------------------------------------
// JSON compile
// ---------------------------------------------------------------------------

/**
 * Compiles a JSON input file using the JSON pipeline.
 *
 * Supports both MCDocument (full document with metadata/sampleData)
 * and bare MCNode (just the template tree).
 *
 * Detection logic:
 * - Has "template" key → MCDocument (extract .template as root node)
 * - Has "type" key → bare MCNode (use directly)
 *
 * @param source   - Raw JSON string.
 * @param filePath - Path for error reporting.
 * @param options  - Compile options.
 * @returns The compile result.
 */
function compileJsonFile(
  source: string,
  filePath: string,
  options: CompileOptions,
): CompileResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source) as unknown;
  } catch {
    return makeErrorResult(`Invalid JSON in ${path.basename(filePath)}`, 'JSON_PARSE_ERROR');
  }

  const obj = parsed as Record<string, unknown>;

  // MCDocument: has "template" key (may also have sampleData, metadata)
  if (obj['template'] && typeof obj['template'] === 'object') {
    // If no data was provided via CLI --data, use sampleData from document
    if (!options.data && obj['sampleData'] && typeof obj['sampleData'] === 'object') {
      options = { ...options, data: obj['sampleData'] as Record<string, unknown> };
    }
    return compileFromJSON(obj['template'] as MCNode, options);
  }

  // Bare MCNode: has "type" key
  if (typeof obj['type'] === 'string') {
    return compileFromJSON(parsed as MCNode, options);
  }

  return makeErrorResult(
    `JSON file must have a "template" key (MCDocument) or a "type" key (MCNode). ` +
    `Found neither in ${path.basename(filePath)}.`,
    'JSON_FORMAT_ERROR',
  );
}

// ---------------------------------------------------------------------------
// Options builder
// ---------------------------------------------------------------------------

/**
 * Builds CompileOptions from CLI flags and merged config.
 *
 * @param filePath     - Input file path.
 * @param flags        - CLI flags.
 * @param mergedConfig - Merged config.
 * @returns CompileOptions for the compile call.
 */
export function buildCompileOptions(
  filePath: string,
  flags: BuildFlags,
  mergedConfig: Partial<MailcConfig>,
): CompileOptions {
  const config: Partial<MailcConfig> = { ...mergedConfig };

  // CLI flag overrides
  if (flags.minify) {
    config.output = { ...config.output, minify: true } as MailcConfig['output'];
  }
  if (flags.target !== undefined) {
    // `--target default` selects the curated 5-client preset. Anything else
    // is parsed as a comma-separated caniemail glob list. Resolved here so
    // the resulting config has only the runtime `string[]` shape.
    config.targetClients = flags.target === 'default'
      ? [...DEFAULT_CLIENTS]
      : flags.target.split(',').map((s) => s.trim());
  }

  const options: CompileOptions = {
    config,
    filename: filePath,
    debug: flags.debug === true,
    sourceMap: flags.sourceMap === true,
  };

  if (flags.compatibilityMode) {
    options.compatibilityMode = flags.compatibilityMode;
  }

  if (flags.templateStyle) {
    options.templateStyle = flags.templateStyle;
  }

  // Load data file if provided
  if (flags.data) {
    const dataPath = path.resolve(flags.data);
    try {
      const raw = fs.readFileSync(dataPath, 'utf-8');
      options.data = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      process.stderr.write(error(`Cannot read or parse data file: ${dataPath}`) + '\n');
    }
  }

  return options;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates an error-only CompileResult. */
function makeErrorResult(message: string, code: string): CompileResult {
  return {
    html: null,
    errors: [{ code, message, severity: 'error' }],
    warnings: [],
    info: [],
    partial: false,
    stats: {
      inputSize: 0,
      outputSize: 0,
      compileTime: 0,
      components: 0,
      cssPropertiesInlined: 0,
      cssPropertiesStripped: 0,
      mediaQueriesGenerated: 0,
      gmailClipRisk: 'not-targeted',
    },
  };
}
