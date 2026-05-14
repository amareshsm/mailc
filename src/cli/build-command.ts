/**
 * `mailc build` command implementation.
 *
 * Compiles `.mc` markup files and `.json` template files to email-safe HTML.
 * Supports both single file and directory input.
 *
 * **Dual-input support:**
 * - `.mc` files → `compile()` (markup pipeline)
 * - `.json` files → `compileFromJSON()` (JSON pipeline)
 *
 * Both paths support `--data` for dynamic template resolution.
 *
 * Node-only: uses `node:fs` and `node:path`.
 *
 * @module cli/build-command
 */

import fs from 'node:fs';
import path from 'node:path';
import type { MailcConfig, CompatibilityMode } from '../types.js';
import {
  formatCompileResult,
  formatStats,
  formatBatchSummary,
  warn,
  error,
  info,
} from './output.js';
import {
  EXIT_SUCCESS,
  EXIT_COMPILE_ERROR,
  EXIT_IO_ERROR,
} from './exit-codes.js';
import { compileFile } from './compile-dispatch.js';
import { isGlobPattern } from './glob-resolver.js';
import { buildGlob } from './glob-build.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Options parsed from the `mailc build` CLI flags. */
export interface BuildFlags {
  /** Output file or directory path. Undefined = stdout. */
  output?: string;
  /** Path to a JSON data file for template variables. */
  data?: string;
  /** Show verbose output (INFO messages + stats). */
  verbose: boolean;
  /** Exit with error code when warnings are produced (for CI). */
  failOnWarnings: boolean;
  /** Minify output HTML. */
  minify: boolean;
  /**
   * Target email clients. `'default'` selects the curated 5-client preset;
   * otherwise a comma-separated caniemail glob list. Omit for no client
   * gating (ALWAYS_BREAKING / ALWAYS_NO_EFFECT still apply).
   */
  target?: string;
  /**
   * Compatibility mode: `'liberal'` (default) or `'strict'`.
   *
   * - `liberal`: ENHANCE properties are inlined into `style=""` attributes (graceful degradation).
   * - `strict`: ENHANCE properties are stripped with an `ENHANCE_PROPERTY_STRIPPED` warning.
   */
  compatibilityMode?: CompatibilityMode;
  /**
   * Enable debug mode.
   *
   * When true:
   * - Injects `<!-- mc:source -->` comments into the output HTML.
   * - Writes a `<output>.map.json` source map file alongside the HTML.
   */
  debug?: boolean;
  /**
   * Enable clean source-map mode.
   *
   * When true:
   * - Injects `data-mc-id` attributes into the output HTML (no comments).
   * - Writes a `<output>.map.json` source map file alongside the HTML.
   */
  sourceMap?: boolean;
  /**
   * Override `templateStyle` for this build, ignoring the config-file value.
   *
   * - `attribute` (the library default): CSS-property attributes are the
   *   styling mechanism. `class=` is rejected.
   * - `class`: Tailwind-style utility classes are the styling mechanism.
   *   CSS-property attributes are rejected.
   */
  templateStyle?: 'attribute' | 'class';
}

// ---------------------------------------------------------------------------
// Supported extensions
// ---------------------------------------------------------------------------

/** File extensions we compile. */
const COMPILABLE_EXTENSIONS = new Set(['.mc', '.json']);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Executes the `mailc build` command.
 *
 * Supports three input modes:
 * 1. Single file — compiles one .mc or .json file.
 * 2. Directory — compiles all compilable files in a directory.
 * 3. Glob pattern — resolves a glob, compiles all matches, and
 *    preserves the relative folder structure in the output directory.
 *    Inspired by MJML issue #2502.
 *
 * @see https://github.com/mjmlio/mjml/issues/2502
 *
 * @param inputPath    - The input file, directory, or glob pattern.
 * @param flags        - Parsed CLI flags.
 * @param mergedConfig - The merged config (defaults + config file).
 * @returns Exit code.
 */
export async function runBuild(
  inputPath: string,
  flags: BuildFlags,
  mergedConfig: Partial<MailcConfig>,
): Promise<number> {
  // --- Glob pattern mode ---
  if (isGlobPattern(inputPath)) {
    return buildGlob(inputPath, flags, mergedConfig);
  }

  // --- Literal file / directory mode ---
  const resolved = path.resolve(inputPath);

  if (!fs.existsSync(resolved)) {
    process.stderr.write(error(`File not found: ${resolved}`) + '\n');
    return EXIT_IO_ERROR;
  }

  const stat = fs.statSync(resolved);

  if (stat.isDirectory()) {
    return buildDirectory(resolved, flags, mergedConfig);
  }

  return buildSingleFile(resolved, flags, mergedConfig);
}

// ---------------------------------------------------------------------------
// Single file
// ---------------------------------------------------------------------------

/**
 * Compiles a single file and outputs the result.
 *
 * @param filePath     - Absolute path to the input file.
 * @param flags        - Parsed CLI flags.
 * @param mergedConfig - The merged config.
 * @returns Exit code.
 */
function buildSingleFile(
  filePath: string,
  flags: BuildFlags,
  mergedConfig: Partial<MailcConfig>,
): number {
  const compiled = compileFile(filePath, flags, mergedConfig);

  if (!compiled) {
    return EXIT_IO_ERROR;
  }

  const { result, source } = compiled;
  const outputPath = resolveOutputPath(filePath, flags.output);

  // Write output
  if (outputPath) {
    ensureDir(path.dirname(outputPath));
    // Only write to file when there are zero errors — partial (best-effort) output
    // is intentionally NOT written to prevent silently broken production emails.
    if (result.html !== null && result.errors.length === 0) {
      fs.writeFileSync(outputPath, result.html, 'utf-8');
      // Write source map file when --debug or --source-map is active
      if ((flags.debug || flags.sourceMap) && result.sourceMapJSON) {
        const mapPath = outputPath + '.map.json';
        fs.writeFileSync(mapPath, result.sourceMapJSON, 'utf-8');
        process.stderr.write(info(`📍 Source map: ${path.basename(mapPath)}`) + '\n');
      }
    }
  } else if (result.html !== null) {
    process.stdout.write(result.html);
    // When writing to stdout, errors/warnings go to stderr
    if (result.errors.length > 0 || result.warnings.length > 0) {
      process.stderr.write(
        formatCompileResult(path.basename(filePath), 'stdout', result, source) + '\n',
      );
    }
    return result.errors.length > 0 ? EXIT_COMPILE_ERROR : EXIT_SUCCESS;
  }

  // Print result summary (when outputting to a file)
  const displayOutput = outputPath ?? 'stdout';
  process.stderr.write(formatCompileResult(path.basename(filePath), displayOutput, result, source) + '\n');

  if (flags.verbose && result.html !== null) {
    process.stderr.write(formatStats(result) + '\n');
  }

  // --fail-on-warnings: treat any warning as a CI failure
  if (flags.failOnWarnings && result.warnings.length > 0) {
    return EXIT_COMPILE_ERROR;
  }

  return result.errors.length > 0 ? EXIT_COMPILE_ERROR : EXIT_SUCCESS;
}

// ---------------------------------------------------------------------------
// Directory
// ---------------------------------------------------------------------------

/**
 * Compiles all `.mc` and `.json` files in a directory.
 *
 * @param dirPath      - Absolute path to the input directory.
 * @param flags        - Parsed CLI flags.
 * @param mergedConfig - The merged config.
 * @returns Exit code.
 */
function buildDirectory(
  dirPath: string,
  flags: BuildFlags,
  mergedConfig: Partial<MailcConfig>,
): number {
  const files = collectFiles(dirPath);

  if (files.length === 0) {
    process.stderr.write(warn(`No .mc or .json files found in ${dirPath}`) + '\n');
    return EXIT_SUCCESS;
  }

  if (flags.verbose) {
    process.stderr.write(info(`Processing ${files.length} file${files.length === 1 ? '' : 's'}...`) + '\n');
  }

  const startTime = performance.now();
  let passed = 0;
  let failed = 0;
  let totalWarnings = 0;

  for (const file of files) {
    const compiled = compileFile(file, flags, mergedConfig);
    if (!compiled) {
      failed++;
      continue;
    }

    const { result, source } = compiled;
    const outputPath = resolveDirectoryOutputPath(file, dirPath, flags.output);
    if (outputPath && result.html !== null && result.errors.length === 0) {
      ensureDir(path.dirname(outputPath));
      fs.writeFileSync(outputPath, result.html, 'utf-8');
    }

    const displayOutput = outputPath ?? 'stdout';
    process.stderr.write(formatCompileResult(path.relative(dirPath, file), displayOutput, result, source) + '\n');

    if (flags.verbose && result.html !== null) {
      process.stderr.write(formatStats(result) + '\n');
    }

    if (result.errors.length > 0) {
      failed++;
    } else {
      passed++;
    }
    totalWarnings += result.warnings.length;
  }

  const elapsed = performance.now() - startTime;
  process.stderr.write(formatBatchSummary(files.length, passed, failed, totalWarnings, elapsed) + '\n');

  if (failed > 0) return EXIT_COMPILE_ERROR;
  if (flags.failOnWarnings && totalWarnings > 0) return EXIT_COMPILE_ERROR;
  return EXIT_SUCCESS;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolves the output path for a single file build.
 *
 * @param inputPath  - Input file path.
 * @param outputFlag - The --output flag value.
 * @returns Resolved output path, or undefined for stdout.
 */
function resolveOutputPath(
  inputPath: string,
  outputFlag: string | undefined,
): string | undefined {
  if (!outputFlag) return undefined;

  const resolved = path.resolve(outputFlag);

  // If output looks like a directory (ends with / or already exists as dir), generate filename
  if (outputFlag.endsWith('/') || outputFlag.endsWith(path.sep) ||
      (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory())) {
    const base = path.basename(inputPath, path.extname(inputPath));
    return path.join(resolved, `${base}.html`);
  }

  return resolved;
}

/**
 * Resolves the output path for a file within a directory build.
 *
 * Mirrors the source directory structure inside the output directory.
 *
 * @param filePath  - Absolute path to the source file.
 * @param dirPath   - Absolute path to the source directory.
 * @param outputDir - The --output flag value (directory).
 * @returns Resolved output path, or undefined for stdout.
 */
function resolveDirectoryOutputPath(
  filePath: string,
  dirPath: string,
  outputDir: string | undefined,
): string | undefined {
  if (!outputDir) return undefined;

  const relative = path.relative(dirPath, filePath);
  const base = relative.replace(path.extname(relative), '.html');
  return path.resolve(outputDir, base);
}

/**
 * Recursively collects all compilable files from a directory.
 *
 * @param dirPath - Absolute directory path.
 * @returns Array of absolute file paths.
 */
function collectFiles(dirPath: string): string[] {
  const results: string[] = [];

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules, dist, .git
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) {
        continue;
      }
      results.push(...collectFiles(full));
    } else if (COMPILABLE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      results.push(full);
    }
  }

  return results.sort();
}

/**
 * Creates directories recursively if they don't exist.
 *
 * @param dirPath - Directory path to create.
 */
function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
