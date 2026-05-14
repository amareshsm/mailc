/**
 * Glob-based batch build — compiles files matching a glob pattern.
 *
 * Preserves the relative folder structure from the glob base directory
 * inside the output directory. Inspired by MJML issue #2502:
 * "Output multiple files, preserving folder structure."
 *
 * @see https://github.com/mjmlio/mjml/issues/2502
 *
 * Node-only: uses `node:fs` and `node:path`.
 *
 * @module cli/glob-build
 */

import fs from 'node:fs';
import path from 'node:path';
import type { MailcConfig } from '../types.js';
import {
  formatCompileResult,
  formatStats,
  formatBatchSummary,
  warn,
  info,
} from './output.js';
import {
  EXIT_SUCCESS,
  EXIT_COMPILE_ERROR,
} from './exit-codes.js';
import { compileFile } from './compile-dispatch.js';
import type { BuildFlags } from './build-command.js';
import { resolveGlob } from './glob-resolver.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** File extensions we compile. */
const COMPILABLE_EXTENSIONS = new Set(['.mc', '.json']);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compiles files matched by a glob pattern, preserving folder structure.
 *
 * Resolves the pattern, computes relative paths from the glob base
 * directory, and mirrors that structure inside the output directory.
 *
 * @param pattern      - The glob pattern (e.g. `src/emails/*.mc`).
 * @param flags        - Parsed CLI flags.
 * @param mergedConfig - The merged config.
 * @returns Exit code.
 */
export function buildGlob(
  pattern: string,
  flags: BuildFlags,
  mergedConfig: Partial<MailcConfig>,
): number {
  const { files, baseDir } = resolveGlob(pattern);

  // Filter to only compilable extensions
  const compilable = files.filter((f) =>
    COMPILABLE_EXTENSIONS.has(path.extname(f).toLowerCase()),
  );

  if (compilable.length === 0) {
    process.stderr.write(
      warn(`No .mc or .json files matched pattern: ${pattern}`) + '\n',
    );
    return EXIT_SUCCESS;
  }

  if (flags.verbose) {
    process.stderr.write(
      info(
        `Glob matched ${compilable.length} file${compilable.length === 1 ? '' : 's'} from ${baseDir}`,
      ) + '\n',
    );
  }

  const startTime = performance.now();
  let passed = 0;
  let failed = 0;
  let totalWarnings = 0;

  for (const file of compilable) {
    const compiled = compileFile(file, flags, mergedConfig);
    if (!compiled) {
      failed++;
      continue;
    }

    const { result, source } = compiled;
    // Compute output path preserving folder structure relative to glob base
    const outputPath = resolveGlobOutputPath(file, baseDir, flags.output);
    // Only write to file when there are zero errors — partial output is not written
    // to prevent silently broken production emails.
    if (outputPath && result.html !== null && result.errors.length === 0) {
      ensureDir(path.dirname(outputPath));
      fs.writeFileSync(outputPath, result.html, 'utf-8');
    }

    const displayOutput = outputPath ?? 'stdout';
    const displayInput = path.relative(baseDir, file);
    process.stderr.write(
      formatCompileResult(displayInput, displayOutput, result, source) + '\n',
    );

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
  process.stderr.write(
    formatBatchSummary(compilable.length, passed, failed, totalWarnings, elapsed) + '\n',
  );

  if (failed > 0) return EXIT_COMPILE_ERROR;
  if (flags.failOnWarnings && totalWarnings > 0) return EXIT_COMPILE_ERROR;
  return EXIT_SUCCESS;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolves the output path for a file matched by a glob pattern.
 *
 * Mirrors the relative path from the glob base directory inside
 * the output directory, replacing the extension with `.html`.
 *
 * @param filePath  - Absolute path to the source file.
 * @param baseDir   - The glob pattern's base directory.
 * @param outputDir - The --output flag value (directory).
 * @returns Resolved output path, or undefined for stdout.
 */
function resolveGlobOutputPath(
  filePath: string,
  baseDir: string,
  outputDir: string | undefined,
): string | undefined {
  if (!outputDir) return undefined;

  const relative = path.relative(baseDir, filePath);
  const base = relative.replace(path.extname(relative), '.html');
  return path.resolve(outputDir, base);
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
