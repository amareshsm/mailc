/**
 * Tests for the `mailc validate` command.
 *
 * @module tests/cli/validate-command
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runValidate } from '../../src/cli/validate-command.js';
import type { ValidateFlags } from '../../src/cli/validate-command.js';
import { EXIT_SUCCESS, EXIT_IO_ERROR, EXIT_COMPILE_ERROR } from '../../src/cli/exit-codes.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tmpDir: string;
let stdoutChunks: string[];
let stderrChunks: string[];

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mailc-validate-test-'));
  stdoutChunks = [];
  stderrChunks = [];
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
    stdoutChunks.push(String(chunk));
    return true;
  });
  vi.spyOn(process.stderr, 'write').mockImplementation((chunk: string | Uint8Array) => {
    stderrChunks.push(String(chunk));
    return true;
  });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

const TEXT_FLAGS: ValidateFlags = { format: 'text', verbose: false };
const JSON_FLAGS: ValidateFlags = { format: 'json', verbose: false };

// ---------------------------------------------------------------------------
// .mc validation
// ---------------------------------------------------------------------------

describe('runValidate() — .mc files', () => {
  it('validates a correct .mc file', () => {
    const mcPath = path.join(tmpDir, 'valid.mc');
    fs.writeFileSync(mcPath, `<mc>
  <mc-body><mc-section><mc-column><mc-text>OK</mc-text></mc-column></mc-section></mc-body>
</mc>`);

    const code = runValidate(mcPath, TEXT_FLAGS, {});
    expect(code).toBe(EXIT_SUCCESS);
    expect(stderrChunks.join('')).toContain('valid');
  });

  it('reports errors for invalid nesting', () => {
    const mcPath = path.join(tmpDir, 'invalid.mc');
    // mc-text directly under mc-body is invalid (needs section + column)
    fs.writeFileSync(mcPath, `<mc>
  <mc-body><mc-text>Bad</mc-text></mc-body>
</mc>`);

    const code = runValidate(mcPath, TEXT_FLAGS, {});
    expect(code).toBe(EXIT_COMPILE_ERROR);
    expect(stderrChunks.join('')).toContain('invalid');
  });
});

// ---------------------------------------------------------------------------
// .json validation
// ---------------------------------------------------------------------------

describe('runValidate() — .json files', () => {
  it('validates a correct MCNode JSON', () => {
    const jsonPath = path.join(tmpDir, 'valid.json');
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
              content: 'Valid',
            }],
          }],
        }],
      }],
    };
    fs.writeFileSync(jsonPath, JSON.stringify(node));

    const code = runValidate(jsonPath, TEXT_FLAGS, {});
    expect(code).toBe(EXIT_SUCCESS);
  });

  it('validates an MCDocument JSON (extracts template)', () => {
    const jsonPath = path.join(tmpDir, 'doc.json');
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
                content: 'Valid doc',
              }],
            }],
          }],
        }],
      },
    };
    fs.writeFileSync(jsonPath, JSON.stringify(doc));

    const code = runValidate(jsonPath, TEXT_FLAGS, {});
    expect(code).toBe(EXIT_SUCCESS);
  });

  it('reports error for malformed JSON', () => {
    const jsonPath = path.join(tmpDir, 'bad.json');
    fs.writeFileSync(jsonPath, '{ invalid json }}}');

    const code = runValidate(jsonPath, TEXT_FLAGS, {});
    expect(code).toBe(EXIT_COMPILE_ERROR);
  });
});

// ---------------------------------------------------------------------------
// JSON output format
// ---------------------------------------------------------------------------

describe('runValidate() — JSON output', () => {
  it('outputs JSON array for --format json', () => {
    const mcPath = path.join(tmpDir, 'test.mc');
    fs.writeFileSync(mcPath, `<mc>
  <mc-body><mc-section><mc-column><mc-text>OK</mc-text></mc-column></mc-section></mc-body>
</mc>`);

    const code = runValidate(mcPath, JSON_FLAGS, {});
    expect(code).toBe(EXIT_SUCCESS);

    const output = JSON.parse(stdoutChunks.join(''));
    expect(Array.isArray(output)).toBe(true);
    expect(output[0].isValid).toBe(true);
    expect(output[0].errors).toEqual([]);
  });

  it('includes errors in JSON output for invalid file', () => {
    const mcPath = path.join(tmpDir, 'bad.mc');
    fs.writeFileSync(mcPath, `<mc>
  <mc-body><mc-text>Bad</mc-text></mc-body>
</mc>`);

    const code = runValidate(mcPath, JSON_FLAGS, {});
    expect(code).toBe(EXIT_COMPILE_ERROR);

    const output = JSON.parse(stdoutChunks.join(''));
    expect(output[0].isValid).toBe(false);
    expect(output[0].errors.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Directory validation
// ---------------------------------------------------------------------------

describe('runValidate() — directory', () => {
  it('validates all .mc and .json files in a directory', () => {
    const mcPath = path.join(tmpDir, 'a.mc');
    const jsonPath = path.join(tmpDir, 'b.json');
    fs.writeFileSync(mcPath, `<mc>
  <mc-body><mc-section><mc-column><mc-text>A</mc-text></mc-column></mc-section></mc-body>
</mc>`);
    fs.writeFileSync(jsonPath, JSON.stringify({
      type: 'mc',
      attributes: {},
      children: [{
        type: 'mc-body',
        attributes: {},
        children: [{
          type: 'mc-section', attributes: {}, children: [{
            type: 'mc-column', attributes: {}, children: [{
              type: 'mc-text', attributes: {}, content: 'B',
            }],
          }],
        }],
      }],
    }));

    const code = runValidate(tmpDir, TEXT_FLAGS, {});
    expect(code).toBe(EXIT_SUCCESS);
  });
});

// ---------------------------------------------------------------------------
// Error cases
// ---------------------------------------------------------------------------

describe('runValidate() — errors', () => {
  it('returns IO error for missing path', () => {
    const code = runValidate(path.join(tmpDir, 'nonexistent.mc'), TEXT_FLAGS, {});
    expect(code).toBe(EXIT_IO_ERROR);
  });
});
