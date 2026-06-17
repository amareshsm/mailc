/**
 * Tests for the `--fail-on-warnings` CLI flag (the CI gate).
 *
 * Verifies the actual exit-code contract:
 *   - Without the flag: warnings do NOT fail the build (exit 0).
 *   - With the flag:    warnings fail the build (exit 1).
 *   - Errors always fail regardless of the flag.
 *
 * Both `buildSingleFile` and `buildDirectory` (and the glob path) gate on
 * `flags.failOnWarnings`. All three call sites are covered.
 *
 * The warning is produced by compiling a `shadow-2xl` class under
 * `compatibilityMode: 'strict'` — that emits `ENHANCE_PROPERTY_STRIPPED`,
 * a single deterministic warning with no errors.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runBuild } from '../../src/cli/build-command.js';
import type { BuildFlags } from '../../src/cli/build-command.js';
import { EXIT_SUCCESS, EXIT_COMPILE_ERROR } from '../../src/cli/exit-codes.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Template that produces an ENHANCE_PROPERTY_STRIPPED warning under strict mode. */
const WARN_MC = `<mc>
  <mc-head><mc-title>T</mc-title></mc-head>
  <mc-body>
    <mc-section>
      <mc-column class="shadow-2xl">
        <mc-text>Hi</mc-text>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`;

/** Template that compiles cleanly with zero warnings. */
const CLEAN_MC = `<mc>
  <mc-head><mc-title>T</mc-title></mc-head>
  <mc-body>
    <mc-section>
      <mc-column class="bg-white p-4">
        <mc-text>Hi</mc-text>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`;

/** Template with a structural error (errors must fail regardless of flag). */
const ERR_MC = `<mc></mc>`;

const BASE_FLAGS: Omit<BuildFlags, 'failOnWarnings'> = {
  verbose: false,
  minify: false,
  // strict + the curated 5-client preset → ENHANCE properties get stripped
  // with a warning, which is what these --fail-on-warnings tests rely on.
  compatibilityMode: 'strict',
  target: 'default',
  // The test fixtures use Tailwind class= utilities, so they need class mode.
  templateStyle: 'class',
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mailc-fail-on-warnings-test-'));
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

function writeFile(rel: string, content: string): string {
  const full = path.join(tmpDir, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf-8');
  return full;
}

// ---------------------------------------------------------------------------
// Single-file build
// ---------------------------------------------------------------------------

describe('--fail-on-warnings: single file', () => {
  it('without the flag, a template that produces a warning exits 0', async () => {
    const input = writeFile('warn.mc', WARN_MC);
    const output = path.join(tmpDir, 'warn.html');
    const code = await runBuild(input, { ...BASE_FLAGS, failOnWarnings: false, output }, {});
    expect(code).toBe(EXIT_SUCCESS);
  });

  it('with the flag, a template that produces a warning exits 1', async () => {
    const input = writeFile('warn.mc', WARN_MC);
    const output = path.join(tmpDir, 'warn.html');
    const code = await runBuild(input, { ...BASE_FLAGS, failOnWarnings: true, output }, {});
    expect(code).toBe(EXIT_COMPILE_ERROR);
  });

  it('with the flag, a clean template still exits 0', async () => {
    const input = writeFile('clean.mc', CLEAN_MC);
    const output = path.join(tmpDir, 'clean.html');
    const code = await runBuild(input, { ...BASE_FLAGS, failOnWarnings: true, output }, {});
    expect(code).toBe(EXIT_SUCCESS);
  });

  it('without the flag, errors still cause exit 1 (errors are unconditional)', async () => {
    const input = writeFile('err.mc', ERR_MC);
    const output = path.join(tmpDir, 'err.html');
    const code = await runBuild(input, { ...BASE_FLAGS, failOnWarnings: false, output }, {});
    expect(code).toBe(EXIT_COMPILE_ERROR);
  });

  // Regression: the CI gate must not depend on whether --output was passed.
  // The stdout path used to early-return before the failOnWarnings check,
  // so `mailc build x.mc --fail-on-warnings` (no -o) exited 0 on warnings
  // while the same template with -o exited 1.
  it('with the flag and NO --output (stdout mode), a warning template still exits 1', async () => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const input = writeFile('warn.mc', WARN_MC);
    const code = await runBuild(input, { ...BASE_FLAGS, failOnWarnings: true, output: undefined }, {});
    expect(code).toBe(EXIT_COMPILE_ERROR);
  });

  it('without the flag and NO --output, the same warning template exits 0', async () => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const input = writeFile('warn.mc', WARN_MC);
    const code = await runBuild(input, { ...BASE_FLAGS, failOnWarnings: false, output: undefined }, {});
    expect(code).toBe(EXIT_SUCCESS);
  });
});

// ---------------------------------------------------------------------------
// Directory build
// ---------------------------------------------------------------------------

describe('directory build requires --output', () => {
  // Regression: a directory build without --output used to compile every
  // file, print "→ stdout" per file, and write the HTML NOWHERE — silently
  // discarding all output while exiting 0.
  it('directory input without --output exits with IO error instead of discarding output', async () => {
    const dir = path.join(tmpDir, 'src');
    writeFile('src/warn.mc', WARN_MC);
    const code = await runBuild(dir, { ...BASE_FLAGS, failOnWarnings: false, output: undefined }, {});
    expect(code).not.toBe(EXIT_SUCCESS);
  });
});

describe('--fail-on-warnings: directory build', () => {
  it('without the flag, a directory containing a warning template exits 0', async () => {
    const dir = path.join(tmpDir, 'src');
    writeFile('src/warn.mc', WARN_MC);
    writeFile('src/clean.mc', CLEAN_MC);
    const out = path.join(tmpDir, 'dist');
    const code = await runBuild(dir, { ...BASE_FLAGS, failOnWarnings: false, output: out }, {});
    expect(code).toBe(EXIT_SUCCESS);
  });

  it('with the flag, a directory containing a warning template exits 1', async () => {
    const dir = path.join(tmpDir, 'src');
    writeFile('src/warn.mc', WARN_MC);
    writeFile('src/clean.mc', CLEAN_MC);
    const out = path.join(tmpDir, 'dist');
    const code = await runBuild(dir, { ...BASE_FLAGS, failOnWarnings: true, output: out }, {});
    expect(code).toBe(EXIT_COMPILE_ERROR);
  });

  it('with the flag, an all-clean directory still exits 0', async () => {
    const dir = path.join(tmpDir, 'src');
    writeFile('src/a.mc', CLEAN_MC);
    writeFile('src/b.mc', CLEAN_MC);
    const out = path.join(tmpDir, 'dist');
    const code = await runBuild(dir, { ...BASE_FLAGS, failOnWarnings: true, output: out }, {});
    expect(code).toBe(EXIT_SUCCESS);
  });
});

// ---------------------------------------------------------------------------
// Glob build
// ---------------------------------------------------------------------------

describe('--fail-on-warnings: glob build', () => {
  it('without the flag, a glob that matches warning templates exits 0', async () => {
    writeFile('src/a/warn.mc', WARN_MC);
    writeFile('src/b/clean.mc', CLEAN_MC);
    const pattern = path.join(tmpDir, 'src/**/*.mc');
    const out = path.join(tmpDir, 'dist');
    const code = await runBuild(pattern, { ...BASE_FLAGS, failOnWarnings: false, output: out }, {});
    expect(code).toBe(EXIT_SUCCESS);
  });

  it('with the flag, a glob that matches warning templates exits 1', async () => {
    writeFile('src/a/warn.mc', WARN_MC);
    writeFile('src/b/clean.mc', CLEAN_MC);
    const pattern = path.join(tmpDir, 'src/**/*.mc');
    const out = path.join(tmpDir, 'dist');
    const code = await runBuild(pattern, { ...BASE_FLAGS, failOnWarnings: true, output: out }, {});
    expect(code).toBe(EXIT_COMPILE_ERROR);
  });
});
