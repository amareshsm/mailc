/**
 * Tests for the `--debug` flag in the `mailc build` command.
 *
 * Verifies that:
 * - `--debug` produces both the `.html` output and a `.html.map.json` source map.
 * - The source map file is valid JSON with the expected top-level shape.
 * - Without `--debug`, no `.map.json` file is created.
 * - Debug HTML contains `mc:source` comments; non-debug HTML does not.
 * - Source map entries have `outputRange` and `outputLoc` populated (SM-E).
 * - Both `.mc` markup input and `.json` template input are covered.
 *
 * @module tests/cli/debug-flag
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
        <mc-text>Hello Debug</mc-text>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`;

const MINIMAL_JSON = JSON.stringify({
  type: 'mc',
  attributes: {},
  children: [
    {
      type: 'mc-body',
      attributes: {},
      children: [
        {
          type: 'mc-section',
          attributes: {},
          children: [
            {
              type: 'mc-column',
              attributes: {},
              children: [
                {
                  type: 'mc-text',
                  attributes: {},
                  content: 'Hello JSON Debug',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

const DEBUG_FLAGS: BuildFlags = {
  verbose: false,
  failOnWarnings: false,
  minify: false,
  debug: true,
};

const NO_DEBUG_FLAGS: BuildFlags = {
  verbose: false,
  failOnWarnings: false,
  minify: false,
};

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mailc-debug-flag-test-'));
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Writes content to a file inside tmpDir, creating parent dirs as needed.
 */
function writeFile(relativePath: string, content: string): string {
  const full = path.join(tmpDir, relativePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf-8');
  return full;
}

/**
 * Returns true if the file at `relativePath` (inside tmpDir) exists.
 */
function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(tmpDir, relativePath));
}

/**
 * Reads file at `relativePath` inside tmpDir and returns its content.
 */
function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(tmpDir, relativePath), 'utf-8');
}

// ---------------------------------------------------------------------------
// --debug flag: .mc markup input
// ---------------------------------------------------------------------------

describe('--debug flag with .mc markup input', () => {
  it('creates both the .html output and the .html.map.json source map', async () => {
    const inputPath = writeFile('email.mc', MINIMAL_MC);
    const outputPath = path.join(tmpDir, 'email.html');

    await runBuild(inputPath, { ...DEBUG_FLAGS, output: outputPath }, {});

    expect(fileExists('email.html')).toBe(true);
    expect(fileExists('email.html.map.json')).toBe(true);
  });

  it('does NOT create a .map.json without --debug', async () => {
    const inputPath = writeFile('email.mc', MINIMAL_MC);
    const outputPath = path.join(tmpDir, 'email.html');

    await runBuild(inputPath, { ...NO_DEBUG_FLAGS, output: outputPath }, {});

    expect(fileExists('email.html')).toBe(true);
    expect(fileExists('email.html.map.json')).toBe(false);
  });

  it('.map.json is valid JSON', async () => {
    const inputPath = writeFile('email.mc', MINIMAL_MC);
    const outputPath = path.join(tmpDir, 'email.html');

    await runBuild(inputPath, { ...DEBUG_FLAGS, output: outputPath }, {});

    const raw = readFile('email.html.map.json');
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('.map.json has version: 1 at the top level', async () => {
    const inputPath = writeFile('email.mc', MINIMAL_MC);
    const outputPath = path.join(tmpDir, 'email.html');

    await runBuild(inputPath, { ...DEBUG_FLAGS, output: outputPath }, {});

    const map = JSON.parse(readFile('email.html.map.json')) as EmailSourceMap;
    expect(map.version).toBe(1);
  });

  it('.map.json has a non-empty entries array', async () => {
    const inputPath = writeFile('email.mc', MINIMAL_MC);
    const outputPath = path.join(tmpDir, 'email.html');

    await runBuild(inputPath, { ...DEBUG_FLAGS, output: outputPath }, {});

    const map = JSON.parse(readFile('email.html.map.json')) as EmailSourceMap;
    expect(Array.isArray(map.entries)).toBe(true);
    expect(map.entries.length).toBeGreaterThan(0);
  });

  it('.map.json entries have outputRange populated (SM-E)', async () => {
    const inputPath = writeFile('email.mc', MINIMAL_MC);
    const outputPath = path.join(tmpDir, 'email.html');

    await runBuild(inputPath, { ...DEBUG_FLAGS, output: outputPath }, {});

    const map = JSON.parse(readFile('email.html.map.json')) as EmailSourceMap;
    const withRange = map.entries.filter((e) => e.outputRange !== null);
    expect(withRange.length).toBeGreaterThan(0);

    for (const entry of withRange) {
      expect(entry.outputRange).toBeDefined();
      expect(entry.outputRange?.start).toBeGreaterThanOrEqual(0);
      expect(entry.outputRange?.end).toBeGreaterThan(entry.outputRange?.start ?? 0);
    }
  });

  it('.map.json entries have outputLoc populated (SM-E)', async () => {
    const inputPath = writeFile('email.mc', MINIMAL_MC);
    const outputPath = path.join(tmpDir, 'email.html');

    await runBuild(inputPath, { ...DEBUG_FLAGS, output: outputPath }, {});

    const map = JSON.parse(readFile('email.html.map.json')) as EmailSourceMap;
    const withLoc = map.entries.filter((e) => e.outputLoc !== null);
    expect(withLoc.length).toBeGreaterThan(0);

    for (const entry of withLoc) {
      expect(entry.outputLoc).toBeDefined();
      expect(entry.outputLoc?.startLine).toBeGreaterThanOrEqual(1);
      expect(entry.outputLoc?.startCol).toBeGreaterThanOrEqual(1);
      expect(entry.outputLoc?.endLine).toBeGreaterThanOrEqual(entry.outputLoc?.startLine ?? 0);
    }
  });

  it('debug HTML contains mc:source comments', async () => {
    const inputPath = writeFile('email.mc', MINIMAL_MC);
    const outputPath = path.join(tmpDir, 'email.html');

    await runBuild(inputPath, { ...DEBUG_FLAGS, output: outputPath }, {});

    const html = readFile('email.html');
    expect(html).toContain('mc:source');
  });

  it('non-debug HTML does NOT contain mc:source comments', async () => {
    const inputPath = writeFile('email.mc', MINIMAL_MC);
    const outputPath = path.join(tmpDir, 'email.html');

    await runBuild(inputPath, { ...NO_DEBUG_FLAGS, output: outputPath }, {});

    const html = readFile('email.html');
    expect(html).not.toContain('mc:source');
  });

  it('source info message is written to stderr when debug map is written', async () => {
    const inputPath = writeFile('email.mc', MINIMAL_MC);
    const outputPath = path.join(tmpDir, 'email.html');

    await runBuild(inputPath, { ...DEBUG_FLAGS, output: outputPath }, {});

    const stderrCalls = (process.stderr.write as ReturnType<typeof vi.fn>).mock.calls;
    const output = stderrCalls.map((c: unknown[]) => String(c[0])).join('');
    expect(output).toContain('.map.json');
  });

  it('.map.json outputRange offsets point inside the HTML string', async () => {
    const inputPath = writeFile('email.mc', MINIMAL_MC);
    const outputPath = path.join(tmpDir, 'email.html');

    await runBuild(inputPath, { ...DEBUG_FLAGS, output: outputPath }, {});

    const html = readFile('email.html');
    const map = JSON.parse(readFile('email.html.map.json')) as EmailSourceMap;

    for (const entry of map.entries) {
      if (entry.outputRange !== null) {
        expect(entry.outputRange.start).toBeLessThan(html.length);
        expect(entry.outputRange.end).toBeLessThanOrEqual(html.length);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// --debug flag: .json template input
// ---------------------------------------------------------------------------

describe('--debug flag with .json template input', () => {
  it('creates both the .html output and the .html.map.json source map', async () => {
    const inputPath = writeFile('email.json', MINIMAL_JSON);
    const outputPath = path.join(tmpDir, 'email.html');

    await runBuild(inputPath, { ...DEBUG_FLAGS, output: outputPath }, {});

    expect(fileExists('email.html')).toBe(true);
    expect(fileExists('email.html.map.json')).toBe(true);
  });

  it('.map.json is valid JSON', async () => {
    const inputPath = writeFile('email.json', MINIMAL_JSON);
    const outputPath = path.join(tmpDir, 'email.html');

    await runBuild(inputPath, { ...DEBUG_FLAGS, output: outputPath }, {});

    const raw = readFile('email.html.map.json');
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('.map.json has version: 1 at the top level', async () => {
    const inputPath = writeFile('email.json', MINIMAL_JSON);
    const outputPath = path.join(tmpDir, 'email.html');

    await runBuild(inputPath, { ...DEBUG_FLAGS, output: outputPath }, {});

    const map = JSON.parse(readFile('email.html.map.json')) as EmailSourceMap;
    expect(map.version).toBe(1);
  });

  it('.map.json has a non-empty entries array', async () => {
    const inputPath = writeFile('email.json', MINIMAL_JSON);
    const outputPath = path.join(tmpDir, 'email.html');

    await runBuild(inputPath, { ...DEBUG_FLAGS, output: outputPath }, {});

    const map = JSON.parse(readFile('email.html.map.json')) as EmailSourceMap;
    expect(Array.isArray(map.entries)).toBe(true);
    expect(map.entries.length).toBeGreaterThan(0);
  });

  it('.map.json entries have outputRange populated (SM-E)', async () => {
    const inputPath = writeFile('email.json', MINIMAL_JSON);
    const outputPath = path.join(tmpDir, 'email.html');

    await runBuild(inputPath, { ...DEBUG_FLAGS, output: outputPath }, {});

    const map = JSON.parse(readFile('email.html.map.json')) as EmailSourceMap;
    const withRange = map.entries.filter((e) => e.outputRange !== null);
    expect(withRange.length).toBeGreaterThan(0);

    for (const entry of withRange) {
      expect(entry.outputRange).toBeDefined();
      expect(entry.outputRange?.start).toBeGreaterThanOrEqual(0);
      expect(entry.outputRange?.end).toBeGreaterThan(entry.outputRange?.start ?? 0);
    }
  });

  it('does NOT create a .map.json without --debug', async () => {
    const inputPath = writeFile('email.json', MINIMAL_JSON);
    const outputPath = path.join(tmpDir, 'email.html');

    await runBuild(inputPath, { ...NO_DEBUG_FLAGS, output: outputPath }, {});

    expect(fileExists('email.html')).toBe(true);
    expect(fileExists('email.html.map.json')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Output path placement
// ---------------------------------------------------------------------------

describe('--debug flag: .map.json placement', () => {
  it('writes .map.json next to the --output file', async () => {
    const inputPath = writeFile('src/email.mc', MINIMAL_MC);
    const outputPath = path.join(tmpDir, 'dist', 'email.html');

    await runBuild(inputPath, { ...DEBUG_FLAGS, output: outputPath }, {});

    expect(fs.existsSync(outputPath)).toBe(true);
    expect(fs.existsSync(outputPath + '.map.json')).toBe(true);
  });

  it('.map.json sits alongside .html, not in the source directory', async () => {
    const inputPath = writeFile('src/email.mc', MINIMAL_MC);
    const outputPath = path.join(tmpDir, 'dist', 'email.html');

    await runBuild(inputPath, { ...DEBUG_FLAGS, output: outputPath }, {});

    // Must exist in dist/, not in src/
    expect(fs.existsSync(path.join(tmpDir, 'dist', 'email.html.map.json'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'src', 'email.mc.map.json'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// JSON round-trip integrity
// ---------------------------------------------------------------------------

describe('--debug flag: source map JSON round-trip', () => {
  it('round-tripped map has same entry count and component names as in-memory map', async () => {
    const inputPath = writeFile('email.mc', MINIMAL_MC);
    const outputPath = path.join(tmpDir, 'email.html');

    const { compile } = await import('../../src/compile.js');
    const source = fs.readFileSync(inputPath, 'utf-8');
    const result = await compile(source, { debug: true });

    await runBuild(inputPath, { ...DEBUG_FLAGS, output: outputPath }, {});

    const mapFromFile = JSON.parse(readFile('email.html.map.json')) as EmailSourceMap;

    // Same entry count
    expect(result.sourceMap).toBeDefined();
    expect(mapFromFile.entries.length).toBe(result.sourceMap?.entries.length);

    // Same component names in same order
    const fileComponents = mapFromFile.entries.map((e) => e.sourceComponent);
    const memComponents = result.sourceMap?.entries.map((e) => e.sourceComponent) ?? [];
    expect(fileComponents).toEqual(memComponents);
  });

  it('all entries in the round-tripped map have sourceLoc populated', async () => {
    const inputPath = writeFile('email.mc', MINIMAL_MC);
    const outputPath = path.join(tmpDir, 'email.html');

    await runBuild(inputPath, { ...DEBUG_FLAGS, output: outputPath }, {});

    const map = JSON.parse(readFile('email.html.map.json')) as EmailSourceMap;
    for (const entry of map.entries) {
      expect(entry.sourceLoc).not.toBeNull();
      expect(entry.sourceLoc.startLine).toBeGreaterThanOrEqual(1);
    }
  });

  it('all entries have a non-empty component string', async () => {
    const inputPath = writeFile('email.mc', MINIMAL_MC);
    const outputPath = path.join(tmpDir, 'email.html');

    await runBuild(inputPath, { ...DEBUG_FLAGS, output: outputPath }, {});

    const map = JSON.parse(readFile('email.html.map.json')) as EmailSourceMap;
    for (const entry of map.entries) {
      expect(typeof entry.sourceComponent).toBe('string');
      expect(entry.sourceComponent.length).toBeGreaterThan(0);
    }
  });
});
