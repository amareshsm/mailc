/**
 * Tests for the compile dispatch module.
 *
 * Tests the core compile routing logic that dispatches
 * .mc files to compile() and .json files to compileFromJSON().
 *
 * @module tests/cli/compile-dispatch
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { compileFile, buildCompileOptions } from '../../src/cli/compile-dispatch.js';
import type { BuildFlags } from '../../src/cli/build-command.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tmpDir: string;

const DEFAULT_FLAGS: BuildFlags = {
  verbose: false,
  failOnWarnings: false,
  minify: false,
};

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mailc-compile-test-'));
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// .mc compilation
// ---------------------------------------------------------------------------

describe('compileFile() — .mc files', () => {
  it('compiles a valid .mc file to HTML', () => {
    const mcPath = path.join(tmpDir, 'test.mc');
    fs.writeFileSync(mcPath, `<mc>
  <mc-body><mc-section><mc-column><mc-text>Hello</mc-text></mc-column></mc-section></mc-body>
</mc>`);

    const compiled = compileFile(mcPath, DEFAULT_FLAGS, {});
    expect(compiled).not.toBeNull();
    expect(compiled).toBeDefined();
    const { result, source } = compiled ?? { result: { html: null }, source: '' };
    expect(result.html).toContain('<!DOCTYPE html>');
    expect(result.html).toContain('Hello');
    expect(result.errors).toEqual([]);
    expect(source).toContain('mc-text');
  });

  it('returns null when file does not exist', () => {
    const result = compileFile(path.join(tmpDir, 'nonexistent.mc'), DEFAULT_FLAGS, {});
    expect(result).toBeNull();
  });

  it('compiles with template data from --data flag', () => {
    const mcPath = path.join(tmpDir, 'test.mc');
    const dataPath = path.join(tmpDir, 'data.json');
    fs.writeFileSync(mcPath, `<mc>
  <mc-body><mc-section><mc-column><mc-text>Hi {{name}}</mc-text></mc-column></mc-section></mc-body>
</mc>`);
    fs.writeFileSync(dataPath, JSON.stringify({ name: 'World' }));

    const flags: BuildFlags = { ...DEFAULT_FLAGS, data: dataPath };
    const compiled = compileFile(mcPath, flags, {});
    expect(compiled).not.toBeNull();
    expect(compiled?.result.html).toContain('Hi World');
  });
});

// ---------------------------------------------------------------------------
// .json compilation — MCDocument format
// ---------------------------------------------------------------------------

describe('compileFile() — .json MCDocument', () => {
  it('compiles an MCDocument JSON with template key', () => {
    const jsonPath = path.join(tmpDir, 'test.json');
    const doc = {
      sampleData: { name: 'Test' },
      template: {
        type: 'mc',
        attributes: {},
        children: [{
          type: 'mc-body',
          attributes: {},
          children: [{
            type: 'mc-section',
            attributes: {},
            children: [{
              type: 'mc-column',
              attributes: {},
              children: [{
                type: 'mc-text',
                attributes: {},
                content: 'Hello {{name}}',
              }],
            }],
          }],
        }],
      },
    };
    fs.writeFileSync(jsonPath, JSON.stringify(doc));

    const compiled = compileFile(jsonPath, DEFAULT_FLAGS, {});
    expect(compiled).not.toBeNull();
    expect(compiled?.result.html).toContain('<!DOCTYPE html>');
    // sampleData should be used since no --data flag
    expect(compiled?.result.html).toContain('Hello Test');
  });

  it('prefers CLI --data over sampleData', () => {
    const jsonPath = path.join(tmpDir, 'test.json');
    const dataPath = path.join(tmpDir, 'data.json');
    const doc = {
      sampleData: { name: 'Sample' },
      template: {
        type: 'mc',
        attributes: {},
        children: [{
          type: 'mc-body',
          attributes: {},
          children: [{
            type: 'mc-section',
            attributes: {},
            children: [{
              type: 'mc-column',
              attributes: {},
              children: [{
                type: 'mc-text',
                attributes: {},
                content: 'Hello {{name}}',
              }],
            }],
          }],
        }],
      },
    };
    fs.writeFileSync(jsonPath, JSON.stringify(doc));
    fs.writeFileSync(dataPath, JSON.stringify({ name: 'Override' }));

    const flags: BuildFlags = { ...DEFAULT_FLAGS, data: dataPath };
    const compiled = compileFile(jsonPath, flags, {});
    expect(compiled).not.toBeNull();
    expect(compiled?.result.html).toContain('Hello Override');
  });
});

// ---------------------------------------------------------------------------
// .json compilation — bare MCNode format
// ---------------------------------------------------------------------------

describe('compileFile() — .json bare MCNode', () => {
  it('compiles a bare MCNode JSON', () => {
    const jsonPath = path.join(tmpDir, 'test.json');
    const node = {
      type: 'mc',
      attributes: {},
      children: [{
        type: 'mc-body',
        attributes: {},
        children: [{
          type: 'mc-section',
          attributes: {},
          children: [{
            type: 'mc-column',
            attributes: {},
            children: [{
              type: 'mc-text',
              attributes: {},
              content: 'Bare node',
            }],
          }],
        }],
      }],
    };
    fs.writeFileSync(jsonPath, JSON.stringify(node));

    const compiled = compileFile(jsonPath, DEFAULT_FLAGS, {});
    expect(compiled).not.toBeNull();
    expect(compiled?.result.html).toContain('Bare node');
  });
});

// ---------------------------------------------------------------------------
// .json error handling
// ---------------------------------------------------------------------------

describe('compileFile() — JSON errors', () => {
  it('returns error for invalid JSON', () => {
    const jsonPath = path.join(tmpDir, 'bad.json');
    fs.writeFileSync(jsonPath, '{ broken json ');

    const compiled = compileFile(jsonPath, DEFAULT_FLAGS, {});
    expect(compiled).not.toBeNull();
    expect(compiled?.result.html).toBeNull();
    expect(compiled?.result.errors).toHaveLength(1);
    expect(compiled?.result.errors[0]?.code).toBe('JSON_PARSE_ERROR');
  });

  it('returns error when JSON has neither "template" nor "type" key', () => {
    const jsonPath = path.join(tmpDir, 'empty.json');
    fs.writeFileSync(jsonPath, JSON.stringify({ foo: 'bar' }));

    const compiled = compileFile(jsonPath, DEFAULT_FLAGS, {});
    expect(compiled).not.toBeNull();
    expect(compiled?.result.html).toBeNull();
    expect(compiled?.result.errors).toHaveLength(1);
    expect(compiled?.result.errors[0]?.code).toBe('JSON_FORMAT_ERROR');
  });

  // Regression: `null` is valid JSON but not an object — property access on
  // it crashed the CLI with an uncaught TypeError instead of a structured
  // error. Same class: arrays, numbers, strings, booleans.
  it('returns structured JSON_FORMAT_ERROR (no crash) for non-object JSON roots', () => {
    for (const [name, content] of [
      ['null.json', 'null'],
      ['arr.json', '[1,2]'],
      ['num.json', '42'],
      ['str.json', '"hello"'],
    ] as const) {
      const jsonPath = path.join(tmpDir, name);
      fs.writeFileSync(jsonPath, content);

      const compiled = compileFile(jsonPath, DEFAULT_FLAGS, {});
      expect(compiled, name).not.toBeNull();
      expect(compiled?.result.html, name).toBeNull();
      expect(compiled?.result.errors[0]?.code, name).toBe('JSON_FORMAT_ERROR');
    }
  });
});

// ---------------------------------------------------------------------------
// --data failures are hard errors
// ---------------------------------------------------------------------------

describe('compileFile() — --data failures', () => {
  // Regression: a typo'd --data path used to print an error but continue
  // compiling WITHOUT the data and exit 0 — CI would ship emails with
  // unresolved {{variables}}. It must be a hard failure (null → IO error).
  it('returns null when the data file does not exist', () => {
    const mcPath = path.join(tmpDir, 'tpl.mc');
    fs.writeFileSync(mcPath, '<mc><mc-body><mc-section><mc-column><mc-text>{{name}}</mc-text></mc-column></mc-section></mc-body></mc>');

    const flags: BuildFlags = { ...DEFAULT_FLAGS, data: path.join(tmpDir, 'missing.json') };
    expect(compileFile(mcPath, flags, {})).toBeNull();
  });

  it('returns null when the data file contains invalid JSON', () => {
    const mcPath = path.join(tmpDir, 'tpl.mc');
    fs.writeFileSync(mcPath, '<mc><mc-body><mc-section><mc-column><mc-text>hi</mc-text></mc-column></mc-section></mc-body></mc>');
    const dataPath = path.join(tmpDir, 'bad-data.json');
    fs.writeFileSync(dataPath, '{ nope ');

    const flags: BuildFlags = { ...DEFAULT_FLAGS, data: dataPath };
    expect(compileFile(mcPath, flags, {})).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildCompileOptions()
// ---------------------------------------------------------------------------

describe('buildCompileOptions()', () => {
  it('sets filename from input path', () => {
    const opts = buildCompileOptions('/foo/bar.mc', DEFAULT_FLAGS, {});
    expect(opts.filename).toBe('/foo/bar.mc');
  });

  it('applies minify flag', () => {
    const flags: BuildFlags = { ...DEFAULT_FLAGS, minify: true };
    const opts = buildCompileOptions('/test.mc', flags, {});
    expect((opts.config as Record<string, unknown>)?.output).toEqual(
      expect.objectContaining({ minify: true }),
    );
  });

  it("resolves --target 'default' to the curated DEFAULT_CLIENTS list", () => {
    const flags: BuildFlags = { ...DEFAULT_FLAGS, target: 'default' };
    const opts = buildCompileOptions('/test.mc', flags, {});
    const tc = (opts.config as Record<string, unknown>)?.targetClients;
    expect(Array.isArray(tc)).toBe(true);
    expect(tc).toContain('gmail.*');
    expect(tc).toContain('outlook.*');
  });

  it('parses comma-separated target clients', () => {
    const flags: BuildFlags = { ...DEFAULT_FLAGS, target: 'gmail.*,outlook.*' };
    const opts = buildCompileOptions('/test.mc', flags, {});
    expect((opts.config as Record<string, unknown>)?.targetClients).toEqual([
      'gmail.*',
      'outlook.*',
    ]);
  });

  it('loads data from a JSON file', () => {
    const dataPath = path.join(tmpDir, 'data.json');
    fs.writeFileSync(dataPath, JSON.stringify({ key: 'value' }));

    const flags: BuildFlags = { ...DEFAULT_FLAGS, data: dataPath };
    const opts = buildCompileOptions('/test.mc', flags, {});
    expect(opts.data).toEqual({ key: 'value' });
  });

  it('merges config from file with flag overrides', () => {
    const config = { width: 700 };
    const flags: BuildFlags = { ...DEFAULT_FLAGS, minify: true };
    const opts = buildCompileOptions('/test.mc', flags, config);
    expect((opts.config as Record<string, unknown>)?.width).toBe(700);
    expect((opts.config as Record<string, unknown>)?.output).toEqual(
      expect.objectContaining({ minify: true }),
    );
  });
});
