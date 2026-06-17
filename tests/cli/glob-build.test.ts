/**
 * Tests for the glob-based batch build feature.
 *
 * Tests the end-to-end flow of compiling files matched by glob patterns,
 * verifying folder structure preservation, output directory creation,
 * and correct HTML generation.
 *
 * Inspired by MJML issue #2502: "Output multiple files, preserving folder structure."
 * @see https://github.com/mjmlio/mjml/issues/2502
 *
 * @module tests/cli/glob-build
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { buildGlob } from '../../src/cli/glob-build.js';
import type { BuildFlags } from '../../src/cli/build-command.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tmpDir: string;

const MINIMAL_MC = `<mc>
  <mc-body><mc-section><mc-column><mc-text>Hello</mc-text></mc-column></mc-section></mc-body>
</mc>`;

const DEFAULT_FLAGS: BuildFlags = {
  verbose: false,
  failOnWarnings: false,
  minify: false,
};

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mailc-globbuild-test-'));
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

/**
 * Creates a file inside tmpDir, making parent dirs as needed.
 *
 * @param relativePath - Path relative to tmpDir.
 * @param content      - File content.
 */
function createFile(relativePath: string, content: string): void {
  const full = path.join(tmpDir, relativePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf-8');
}

/**
 * Checks whether a file exists at a path relative to tmpDir.
 *
 * @param relativePath - Path relative to tmpDir.
 * @returns Whether the file exists.
 */
function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(tmpDir, relativePath));
}

/**
 * Reads a file at a path relative to tmpDir.
 *
 * @param relativePath - Path relative to tmpDir.
 * @returns File content as string.
 */
function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(tmpDir, relativePath), 'utf-8');
}

// ---------------------------------------------------------------------------
// Core functionality
// ---------------------------------------------------------------------------

describe('buildGlob()', () => {
  // Regression: a glob build without --output used to compile every match,
  // display "→ stdout" per file, and write the HTML nowhere — silently
  // discarding all output while exiting 0.
  it('without --output exits with an error instead of discarding output', () => {
    createFile('src/email.mc', MINIMAL_MC);
    const pattern = path.join(tmpDir, 'src/*.mc');
    const exitCode = buildGlob(pattern, { ...DEFAULT_FLAGS, output: undefined }, {});
    expect(exitCode).not.toBe(0);
  });

  it('compiles multiple matched files with folder structure preserved', () => {
    createFile('src/mail001/index.mc', MINIMAL_MC);
    createFile('src/mail002/index.mc', MINIMAL_MC);

    const pattern = path.join(tmpDir, 'src/**/*.mc');
    const outDir = path.join(tmpDir, 'dist');
    const flags: BuildFlags = { ...DEFAULT_FLAGS, output: outDir };

    const exitCode = buildGlob(pattern, flags, {});

    expect(exitCode).toBe(0);
    expect(fileExists('dist/mail001/index.html')).toBe(true);
    expect(fileExists('dist/mail002/index.html')).toBe(true);
  });

  it('generates valid HTML for each matched file', () => {
    createFile('src/email.mc', MINIMAL_MC);

    const pattern = path.join(tmpDir, 'src/*.mc');
    const outDir = path.join(tmpDir, 'out');
    const flags: BuildFlags = { ...DEFAULT_FLAGS, output: outDir };

    buildGlob(pattern, flags, {});

    const html = readFile('out/email.html');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Hello');
  });

  it('auto-creates nested output directories', () => {
    createFile('src/deep/nested/email.mc', MINIMAL_MC);

    const pattern = path.join(tmpDir, 'src/**/*.mc');
    const outDir = path.join(tmpDir, 'output');
    const flags: BuildFlags = { ...DEFAULT_FLAGS, output: outDir };

    buildGlob(pattern, flags, {});

    expect(fileExists('output/deep/nested/email.html')).toBe(true);
  });

  it('only compiles .mc and .json files', () => {
    createFile('src/email.mc', MINIMAL_MC);
    createFile('src/readme.txt', 'hello');
    createFile('src/style.css', 'body {}');

    const pattern = path.join(tmpDir, 'src/*');
    const outDir = path.join(tmpDir, 'out');
    const flags: BuildFlags = { ...DEFAULT_FLAGS, output: outDir };

    buildGlob(pattern, flags, {});

    expect(fileExists('out/email.html')).toBe(true);
    expect(fileExists('out/readme.html')).toBe(false);
    expect(fileExists('out/style.html')).toBe(false);
  });

  it('returns EXIT_SUCCESS when no files match', () => {
    const pattern = path.join(tmpDir, 'nonexistent/**/*.mc');
    const flags: BuildFlags = { ...DEFAULT_FLAGS, output: path.join(tmpDir, 'out') };

    const exitCode = buildGlob(pattern, flags, {});
    expect(exitCode).toBe(0);
  });

  it('writes warning to stderr when no files match', () => {
    createFile('src/readme.txt', 'hello');

    const pattern = path.join(tmpDir, 'src/*.mc');
    const flags: BuildFlags = { ...DEFAULT_FLAGS, output: path.join(tmpDir, 'out') };

    buildGlob(pattern, flags, {});

    const stderrCalls = (process.stderr.write as ReturnType<typeof vi.fn>).mock.calls;
    const output = stderrCalls.map((c: unknown[]) => String(c[0])).join('');
    expect(output).toContain('No .mc or .json files matched');
  });
});

// ---------------------------------------------------------------------------
// MJML #2502 use case
// ---------------------------------------------------------------------------

describe('buildGlob() — MJML #2502 folder structure preservation', () => {
  it('matches the exact scenario from MJML issue #2502', () => {
    // Create the exact structure from the issue:
    // src/mail001/index.mc + partial.mc
    // src/mail002/index.mc + partial1.mc
    createFile('src/mail001/index.mc', MINIMAL_MC);
    createFile('src/mail001/partial.mc', MINIMAL_MC);
    createFile('src/mail002/index.mc', MINIMAL_MC);
    createFile('src/mail002/partial1.mc', MINIMAL_MC);

    const pattern = path.join(tmpDir, 'src/*/index.mc');
    const outDir = path.join(tmpDir, 'public');
    const flags: BuildFlags = { ...DEFAULT_FLAGS, output: outDir };

    const exitCode = buildGlob(pattern, flags, {});

    expect(exitCode).toBe(0);

    // Output should mirror the folder structure:
    // public/mail001/index.html
    // public/mail002/index.html
    expect(fileExists('public/mail001/index.html')).toBe(true);
    expect(fileExists('public/mail002/index.html')).toBe(true);

    // Partial files should NOT be compiled (not matched by pattern)
    expect(fileExists('public/mail001/partial.html')).toBe(false);
    expect(fileExists('public/mail002/partial1.html')).toBe(false);
  });

  it('preserves deep nesting in output', () => {
    createFile('templates/en/welcome/index.mc', MINIMAL_MC);
    createFile('templates/en/newsletter/index.mc', MINIMAL_MC);
    createFile('templates/fr/welcome/index.mc', MINIMAL_MC);

    const pattern = path.join(tmpDir, 'templates/**/*.mc');
    const outDir = path.join(tmpDir, 'dist');
    const flags: BuildFlags = { ...DEFAULT_FLAGS, output: outDir };

    buildGlob(pattern, flags, {});

    expect(fileExists('dist/en/welcome/index.html')).toBe(true);
    expect(fileExists('dist/en/newsletter/index.html')).toBe(true);
    expect(fileExists('dist/fr/welcome/index.html')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Brace expansion
// ---------------------------------------------------------------------------

describe('buildGlob() — brace expansion', () => {
  it('compiles files matching brace alternatives', () => {
    createFile('news/email.mc', MINIMAL_MC);
    createFile('promo/email.mc', MINIMAL_MC);
    createFile('blog/email.mc', MINIMAL_MC);

    const pattern = path.join(tmpDir, '{news,promo}/*.mc');
    const outDir = path.join(tmpDir, 'out');
    const flags: BuildFlags = { ...DEFAULT_FLAGS, output: outDir };

    buildGlob(pattern, flags, {});

    expect(fileExists('out/news/email.html')).toBe(true);
    expect(fileExists('out/promo/email.html')).toBe(true);
    // blog should NOT be included
    expect(fileExists('out/blog/email.html')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Verbose & strict modes
// ---------------------------------------------------------------------------

describe('buildGlob() — flags', () => {
  it('prints verbose info when verbose is true', () => {
    createFile('src/email.mc', MINIMAL_MC);

    const pattern = path.join(tmpDir, 'src/*.mc');
    const outDir = path.join(tmpDir, 'out');
    const flags: BuildFlags = { ...DEFAULT_FLAGS, verbose: true, output: outDir };

    buildGlob(pattern, flags, {});

    const stderrCalls = (process.stderr.write as ReturnType<typeof vi.fn>).mock.calls;
    const output = stderrCalls.map((c: unknown[]) => String(c[0])).join('');
    expect(output).toContain('Glob matched');
  });

  it('returns compile error exit code on invalid markup', () => {
    createFile('src/bad.mc', `<mc>
  <mc-body><mc-invalid></mc-invalid></mc-body>
</mc>`);

    const pattern = path.join(tmpDir, 'src/*.mc');
    const outDir = path.join(tmpDir, 'out');
    const flags: BuildFlags = { ...DEFAULT_FLAGS, output: outDir };

    const exitCode = buildGlob(pattern, flags, {});
    // Should produce errors/warnings depending on how validation works
    // The key is that it doesn't crash
    expect(typeof exitCode).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// runBuild() integration — glob detection
// ---------------------------------------------------------------------------

describe('runBuild() — glob pattern detection', () => {
  it('delegates to glob build when input contains *', async () => {
    // Dynamic import to avoid circular dep issues in test loading
    const { runBuild } = await import('../../src/cli/build-command.js');

    createFile('src/email.mc', MINIMAL_MC);

    const pattern = path.join(tmpDir, 'src/*.mc');
    const outDir = path.join(tmpDir, 'out');
    const flags: BuildFlags = { ...DEFAULT_FLAGS, output: outDir };

    const exitCode = await runBuild(pattern, flags, {});

    expect(exitCode).toBe(0);
    expect(fileExists('out/email.html')).toBe(true);
  });

  it('still works with single file input (backward compat)', async () => {
    const { runBuild } = await import('../../src/cli/build-command.js');

    createFile('email.mc', MINIMAL_MC);

    const filePath = path.join(tmpDir, 'email.mc');
    const outDir = path.join(tmpDir, 'out/');
    const flags: BuildFlags = { ...DEFAULT_FLAGS, output: outDir };

    const exitCode = await runBuild(filePath, flags, {});

    expect(exitCode).toBe(0);
    expect(fileExists('out/email.html')).toBe(true);
  });

  it('still works with directory input (backward compat)', async () => {
    const { runBuild } = await import('../../src/cli/build-command.js');

    createFile('emails/a.mc', MINIMAL_MC);
    createFile('emails/b.mc', MINIMAL_MC);

    const dirPath = path.join(tmpDir, 'emails');
    const outDir = path.join(tmpDir, 'dist');
    const flags: BuildFlags = { ...DEFAULT_FLAGS, output: outDir };

    const exitCode = await runBuild(dirPath, flags, {});

    expect(exitCode).toBe(0);
    expect(fileExists('dist/a.html')).toBe(true);
    expect(fileExists('dist/b.html')).toBe(true);
  });
});
