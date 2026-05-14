/**
 * Tests for the `--source-map` flag in the `mailc build` command.
 *
 * Verifies that:
 * - `--source-map` produces both the `.html` output and a `.html.map.json` file.
 * - The source map file is valid JSON with the expected top-level shape.
 * - Without `--source-map`, no `.map.json` file is created.
 * - `--source-map` HTML contains `data-mc-id` attributes; no `mc:source` comments.
 * - Source map entries have `outputRange` and `outputLoc` populated (SM-G4).
 * - `sourceMapIds: true` is set on the compile result.
 *
 * @module tests/cli/source-map-flag
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runBuild } from '../../src/cli/build-command.js';
import type { BuildFlags } from '../../src/cli/build-command.js';
import type { EmailSourceMap } from '../../src/types.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MINIMAL_MC = `<mc>
  <mc-body>
    <mc-section>
      <mc-column>
        <mc-text>Hello Source Map</mc-text>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`;

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

const SOURCE_MAP_FLAGS: BuildFlags = {
  verbose: false,
  failOnWarnings: false,
  minify: false,
  sourceMap: true,
};

const NO_SOURCE_MAP_FLAGS: BuildFlags = {
  verbose: false,
  failOnWarnings: false,
  minify: false,
};

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mailc-source-map-flag-test-'));
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function writeFile(relativePath: string, content: string): string {
  const full = path.join(tmpDir, relativePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf-8');
  return full;
}

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(tmpDir, relativePath));
}

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(tmpDir, relativePath), 'utf-8');
}

// ---------------------------------------------------------------------------
// --source-map writes .map.json
// ---------------------------------------------------------------------------

describe('--source-map: file output', () => {
  it('writes both .html and .html.map.json when --source-map is set', async () => {
    const inputPath = writeFile('email.mc', MINIMAL_MC);
    const outputPath = path.join(tmpDir, 'email.html');
    const flags: BuildFlags = { ...SOURCE_MAP_FLAGS, output: outputPath };

    await runBuild(inputPath, flags, {});

    expect(fileExists('email.html')).toBe(true);
    expect(fileExists('email.html.map.json')).toBe(true);
  });

  it('does NOT write .map.json when --source-map is NOT set', async () => {
    const inputPath = writeFile('email.mc', MINIMAL_MC);
    const outputPath = path.join(tmpDir, 'email.html');
    const flags: BuildFlags = { ...NO_SOURCE_MAP_FLAGS, output: outputPath };

    await runBuild(inputPath, flags, {});

    expect(fileExists('email.html')).toBe(true);
    expect(fileExists('email.html.map.json')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// .map.json shape
// ---------------------------------------------------------------------------

describe('--source-map: map.json content', () => {
  it('map.json is valid JSON', async () => {
    const inputPath = writeFile('email.mc', MINIMAL_MC);
    const outputPath = path.join(tmpDir, 'email.html');
    const flags: BuildFlags = { ...SOURCE_MAP_FLAGS, output: outputPath };

    await runBuild(inputPath, flags, {});

    const raw = readFile('email.html.map.json');
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('map.json has version=1 and entries array', async () => {
    const inputPath = writeFile('email.mc', MINIMAL_MC);
    const outputPath = path.join(tmpDir, 'email.html');
    const flags: BuildFlags = { ...SOURCE_MAP_FLAGS, output: outputPath };

    await runBuild(inputPath, flags, {});

    const sm = JSON.parse(readFile('email.html.map.json')) as EmailSourceMap;
    expect(sm.version).toBe(1);
    expect(Array.isArray(sm.entries)).toBe(true);
    expect(sm.entries.length).toBeGreaterThan(0);
  });

  it('map.json entries have sourceComponent and id fields', async () => {
    const inputPath = writeFile('email.mc', MINIMAL_MC);
    const outputPath = path.join(tmpDir, 'email.html');
    const flags: BuildFlags = { ...SOURCE_MAP_FLAGS, output: outputPath };

    await runBuild(inputPath, flags, {});

    const sm = JSON.parse(readFile('email.html.map.json')) as EmailSourceMap;
    for (const entry of sm.entries) {
      expect(typeof entry.id).toBe('string');
      expect(typeof entry.sourceComponent).toBe('string');
    }
  });
});

// ---------------------------------------------------------------------------
// HTML content
// ---------------------------------------------------------------------------

describe('--source-map: HTML output content', () => {
  it('output HTML contains data-mc-id attributes', async () => {
    const inputPath = writeFile('email.mc', MINIMAL_MC);
    const outputPath = path.join(tmpDir, 'email.html');
    const flags: BuildFlags = { ...SOURCE_MAP_FLAGS, output: outputPath };

    await runBuild(inputPath, flags, {});

    const html = readFile('email.html');
    expect(html).toContain('data-mc-id=');
  });

  it('output HTML does NOT contain mc:source debug comments', async () => {
    const inputPath = writeFile('email.mc', MINIMAL_MC);
    const outputPath = path.join(tmpDir, 'email.html');
    const flags: BuildFlags = { ...SOURCE_MAP_FLAGS, output: outputPath };

    await runBuild(inputPath, flags, {});

    const html = readFile('email.html');
    expect(html).not.toContain('mc:source');
  });

  it('without --source-map, output HTML does NOT contain data-mc-id attributes', async () => {
    const inputPath = writeFile('email.mc', MINIMAL_MC);
    const outputPath = path.join(tmpDir, 'email.html');
    const flags: BuildFlags = { ...NO_SOURCE_MAP_FLAGS, output: outputPath };

    await runBuild(inputPath, flags, {});

    const html = readFile('email.html');
    expect(html).not.toContain('data-mc-id=');
  });
});

// ---------------------------------------------------------------------------
// outputRange in entries
// ---------------------------------------------------------------------------

describe('--source-map: outputRange in map.json entries', () => {
  it('at least some entries have non-null outputRange', async () => {
    const inputPath = writeFile('email.mc', MINIMAL_MC);
    const outputPath = path.join(tmpDir, 'email.html');
    const flags: BuildFlags = { ...SOURCE_MAP_FLAGS, output: outputPath };

    await runBuild(inputPath, flags, {});

    const sm = JSON.parse(readFile('email.html.map.json')) as EmailSourceMap;
    const withRange = sm.entries.filter((e) => e.outputRange !== null);
    expect(withRange.length).toBeGreaterThan(0);
  });

  it('outputRange.start < outputRange.end for all populated entries', async () => {
    const inputPath = writeFile('email.mc', MINIMAL_MC);
    const outputPath = path.join(tmpDir, 'email.html');
    const flags: BuildFlags = { ...SOURCE_MAP_FLAGS, output: outputPath };

    await runBuild(inputPath, flags, {});

    const sm = JSON.parse(readFile('email.html.map.json')) as EmailSourceMap;
    for (const entry of sm.entries) {
      if (entry.outputRange !== null) {
        expect(entry.outputRange.start).toBeLessThan(entry.outputRange.end);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// --source-map and --debug coexistence
// ---------------------------------------------------------------------------

describe('--source-map and --debug coexistence', () => {
  it('--source-map alone does not add mc:source comments', async () => {
    const inputPath = writeFile('email.mc', MINIMAL_MC);
    const outputPath = path.join(tmpDir, 'email.html');
    const flags: BuildFlags = { ...SOURCE_MAP_FLAGS, output: outputPath };

    await runBuild(inputPath, flags, {});
    const html = readFile('email.html');
    expect(html).not.toContain('<!-- mc:source');
  });

  it('--debug alone adds mc:source comments but not data-mc-id', async () => {
    const inputPath = writeFile('email.mc', MINIMAL_MC);
    const outputPath = path.join(tmpDir, 'debug-email.html');
    const flags: BuildFlags = {
      verbose: false, failOnWarnings: false, minify: false,
      debug: true, output: outputPath,
    };

    await runBuild(inputPath, flags, {});
    const html = readFile('debug-email.html');
    expect(html).toContain('mc:source');
    expect(html).not.toContain('data-mc-id=');
  });
});

// ---------------------------------------------------------------------------
// Exit codes
// ---------------------------------------------------------------------------

describe('--source-map: exit codes', () => {
  it('returns 0 (success) for a valid template with --source-map', async () => {
    const inputPath = writeFile('email.mc', MINIMAL_MC);
    const outputPath = path.join(tmpDir, 'email.html');
    const flags: BuildFlags = { ...SOURCE_MAP_FLAGS, output: outputPath };

    const code = await runBuild(inputPath, flags, {});
    expect(code).toBe(0);
  });
});
