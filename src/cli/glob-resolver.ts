/**
 * Glob resolver for the CLI.
 *
 * Detects glob patterns in input strings, walks the file system,
 * and matches files against glob patterns using picomatch — a battle-tested,
 * zero-dependency glob matcher that handles all standard glob syntax:
 * `**`, `*`, `?`, `{a,b}`, `[abc]`, `[!abc]`, and more.
 *
 * We own the file-walking logic (node:fs) and the path splitting.
 * picomatch handles only the pattern matching, which is the hard part.
 *
 * Inspired by MJML issue #2502: "Output multiple files, preserving folder structure."
 * @see https://github.com/mjmlio/mjml/issues/2502
 *
 * Node-only: uses `node:fs` and `node:path`.
 *
 * @module cli/glob-resolver
 */

import fs from 'node:fs';
import path from 'node:path';
import picomatch from 'picomatch';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Characters that indicate a glob pattern (not a literal path). */
const GLOB_CHARS = new Set(['*', '?', '{', '[']);

/** Directories to skip during recursive walks. */
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git']);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Checks whether a string contains glob metacharacters.
 *
 * @param input - The input path or pattern.
 * @returns `true` if the string looks like a glob pattern.
 */
export function isGlobPattern(input: string): boolean {
  for (const ch of input) {
    if (GLOB_CHARS.has(ch)) return true;
  }
  return false;
}

/**
 * Result of resolving a glob pattern.
 *
 * @property files   - Matched absolute file paths (sorted).
 * @property baseDir - The non-glob prefix directory (used for relative path computation).
 */
export interface GlobResult {
  /** Matched absolute file paths, sorted alphabetically. */
  files: string[];
  /** The non-glob prefix directory (used for relative path computation). */
  baseDir: string;
}

/**
 * Resolves a glob pattern to matching files on disk.
 *
 * Extracts the non-glob prefix as the base directory, walks that
 * directory recursively, and tests each file against the pattern
 * using picomatch.
 *
 * @param pattern - The glob pattern (e.g. `src/**\/*.mc`).
 * @returns A `GlobResult` with matched files and the base directory.
 */
export function resolveGlob(pattern: string): GlobResult {
  const { baseDir, globPart } = splitGlobBase(pattern);
  const resolvedBase = path.resolve(baseDir);

  if (!fs.existsSync(resolvedBase) || !fs.statSync(resolvedBase).isDirectory()) {
    return { files: [], baseDir: resolvedBase };
  }

  // picomatch matcher — forward-slash normalized relative paths
  const isMatch = picomatch(globPart);
  const allFiles = walkDirectory(resolvedBase);

  const matched = allFiles.filter((absPath) => {
    const relative = path.relative(resolvedBase, absPath);
    // Normalize to forward slashes for picomatch
    const normalized = relative.split(path.sep).join('/');
    return isMatch(normalized);
  });

  return { files: matched.sort(), baseDir: resolvedBase };
}

/**
 * Splits a glob pattern into a non-glob base directory and the glob remainder.
 *
 * Examples:
 * - `src/**\/*.mc`           → `{ baseDir: 'src', globPart: '**\/*.mc' }`
 * - `emails/{news,promo}/*.mc` → `{ baseDir: 'emails', globPart: '{news,promo}/*.mc' }`
 * - `*.mc`                   → `{ baseDir: '.', globPart: '*.mc' }`
 *
 * @param pattern - The full glob pattern.
 * @returns Object with `baseDir` and `globPart`.
 */
export function splitGlobBase(pattern: string): { baseDir: string; globPart: string } {
  // Normalize separators to /
  const normalized = pattern.split(path.sep).join('/');
  const segments = normalized.split('/');

  const baseSegments: string[] = [];
  let globStart = 0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i] as string;
    if (isGlobPattern(seg)) {
      globStart = i;
      break;
    }
    baseSegments.push(seg);
    globStart = i + 1;
  }

  const baseDir = baseSegments.length > 0 ? baseSegments.join('/') : '.';
  const globPart = segments.slice(globStart).join('/');

  return { baseDir, globPart };
}

// ---------------------------------------------------------------------------
// File walking
// ---------------------------------------------------------------------------

/**
 * Recursively collects all files from a directory.
 *
 * Skips `node_modules`, `dist`, and dotfiles/dotdirs.
 *
 * @param dirPath - Absolute directory path to walk.
 * @returns Array of absolute file paths.
 */
function walkDirectory(dirPath: string): string[] {
  const results: string[] = [];

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) {
      continue;
    }

    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDirectory(full));
    } else if (entry.isFile()) {
      results.push(full);
    }
  }

  return results;
}
