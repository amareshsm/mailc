/**
 * Tests for the `mailc convert` command.
 *
 * @module tests/cli/convert-command
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runConvert } from '../../src/cli/convert-command.js';
import type { ConvertFlags } from '../../src/cli/convert-command.js';
import { EXIT_SUCCESS, EXIT_IO_ERROR, EXIT_COMPILE_ERROR } from '../../src/cli/exit-codes.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tmpDir: string;
let stdoutChunks: string[];
let stderrChunks: string[];

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mailc-convert-test-'));
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

// ---------------------------------------------------------------------------
// mc → json
// ---------------------------------------------------------------------------

describe('runConvert() — mc → json', () => {
  it('converts .mc markup to JSON and outputs to stdout', () => {
    const mcPath = path.join(tmpDir, 'test.mc');
    fs.writeFileSync(mcPath, '<mc><mc-body><mc-section><mc-column><mc-text>Hello</mc-text></mc-column></mc-section></mc-body></mc>');

    const flags: ConvertFlags = { to: 'json' };
    const code = runConvert(mcPath, flags);
    expect(code).toBe(EXIT_SUCCESS);

    const output = stdoutChunks.join('');
    const parsed = JSON.parse(output);
    expect(parsed.type).toBe('mc');
    expect(parsed.children[0].type).toBe('mc-body');
  });

  it('writes to output file when --output is specified', () => {
    const mcPath = path.join(tmpDir, 'test.mc');
    const outPath = path.join(tmpDir, 'output.json');
    fs.writeFileSync(mcPath, '<mc><mc-body><mc-section><mc-column><mc-text>Hello</mc-text></mc-column></mc-section></mc-body></mc>');

    const flags: ConvertFlags = { to: 'json', output: outPath };
    const code = runConvert(mcPath, flags);
    expect(code).toBe(EXIT_SUCCESS);
    expect(fs.existsSync(outPath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
    expect(content.type).toBe('mc');
  });
});

// ---------------------------------------------------------------------------
// json → mc
// ---------------------------------------------------------------------------

describe('runConvert() — json → mc', () => {
  it('converts a bare MCNode JSON to .mc markup', () => {
    const jsonPath = path.join(tmpDir, 'test.json');
    const node = {
      type: 'mc-body',
      attributes: {},
      children: [{
        type: 'mc-section',
        attributes: { padding: '20px 0' },
        children: [{
          type: 'mc-column',
          attributes: {},
          children: [{
            type: 'mc-text',
            attributes: {},
            content: 'Hello World',
          }],
        }],
      }],
    };
    fs.writeFileSync(jsonPath, JSON.stringify(node));

    const flags: ConvertFlags = { to: 'mc' };
    const code = runConvert(jsonPath, flags);
    expect(code).toBe(EXIT_SUCCESS);

    const output = stdoutChunks.join('');
    expect(output).toContain('<mc-body>');
    expect(output).toContain('<mc-text>Hello World</mc-text>');
    expect(output).toContain('padding="20px 0"');
  });

  it('extracts template from MCDocument format', () => {
    const jsonPath = path.join(tmpDir, 'doc.json');
    const doc = {
      sampleData: { name: 'Test' },
      template: {
        type: 'mc-body',
        children: [{
          type: 'mc-section',
          children: [{
            type: 'mc-column',
            children: [{
              type: 'mc-text',
              content: 'From document',
            }],
          }],
        }],
      },
    };
    fs.writeFileSync(jsonPath, JSON.stringify(doc));

    const flags: ConvertFlags = { to: 'mc' };
    const code = runConvert(jsonPath, flags);
    expect(code).toBe(EXIT_SUCCESS);
    expect(stdoutChunks.join('')).toContain('From document');
  });

  it('handles MCNode without attributes gracefully', () => {
    const jsonPath = path.join(tmpDir, 'minimal.json');
    const node = {
      type: 'mc-body',
      children: [{
        type: 'mc-section',
        children: [{
          type: 'mc-column',
          children: [{
            type: 'mc-text',
            content: 'No attrs',
          }],
        }],
      }],
    };
    fs.writeFileSync(jsonPath, JSON.stringify(node));

    const flags: ConvertFlags = { to: 'mc' };
    const code = runConvert(jsonPath, flags);
    expect(code).toBe(EXIT_SUCCESS);
    expect(stdoutChunks.join('')).toContain('<mc-text>No attrs</mc-text>');
  });
});

// ---------------------------------------------------------------------------
// mjml → mc
// ---------------------------------------------------------------------------

describe('runConvert() — mjml → mc', () => {
  it('converts basic MJML tags to mc equivalents', () => {
    const mjmlPath = path.join(tmpDir, 'test.mjml');
    fs.writeFileSync(mjmlPath, `
<mjml>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text>Hello</mj-text>
        <mj-button href="https://x.com">Click</mj-button>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`);

    const flags: ConvertFlags = { to: 'mc' };
    const code = runConvert(mjmlPath, flags);
    expect(code).toBe(EXIT_SUCCESS);

    const output = stdoutChunks.join('');
    expect(output).toContain('<mc>');
    expect(output).toContain('<mc-body>');
    expect(output).toContain('<mc-section>');
    expect(output).toContain('<mc-column>');
    expect(output).toContain('<mc-text>Hello</mc-text>');
    expect(output).toContain('<mc-button');
    // Should NOT have nested mc-body
    const matches = output.match(/<mc-body/g);
    expect(matches).toHaveLength(1);
  });

  it('maps mj-wrapper and mj-hero to mc-section', () => {
    const mjmlPath = path.join(tmpDir, 'test.mjml');
    fs.writeFileSync(mjmlPath, `
<mjml>
  <mj-body>
    <mj-wrapper>
      <mj-column><mj-text>Wrapped</mj-text></mj-column>
    </mj-wrapper>
    <mj-hero>
      <mj-column><mj-text>Hero</mj-text></mj-column>
    </mj-hero>
  </mj-body>
</mjml>`);

    const flags: ConvertFlags = { to: 'mc' };
    const code = runConvert(mjmlPath, flags);
    expect(code).toBe(EXIT_SUCCESS);

    const output = stdoutChunks.join('');
    expect(output).toContain('<mc-section>');
    expect(output).not.toContain('mj-wrapper');
    expect(output).not.toContain('mj-hero');
  });
});

// ---------------------------------------------------------------------------
// mjml → json
// ---------------------------------------------------------------------------

describe('runConvert() — mjml → json', () => {
  it('converts MJML to JSON via the mc intermediate', () => {
    const mjmlPath = path.join(tmpDir, 'test.mjml');
    fs.writeFileSync(mjmlPath, `
<mjml>
  <mj-body>
    <mj-section>
      <mj-column>
        <mj-text>Hello</mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`);

    const flags: ConvertFlags = { to: 'json' };
    const code = runConvert(mjmlPath, flags);
    expect(code).toBe(EXIT_SUCCESS);

    const output = stdoutChunks.join('');
    const parsed = JSON.parse(output);
    expect(parsed.type).toBe('mc');
  });
});

// ---------------------------------------------------------------------------
// Error cases
// ---------------------------------------------------------------------------

describe('runConvert() — errors', () => {
  it('returns IO error for missing file', () => {
    const code = runConvert(path.join(tmpDir, 'missing.mc'), { to: 'json' });
    expect(code).toBe(EXIT_IO_ERROR);
  });

  it('returns compile error for unsupported conversion', () => {
    const mcPath = path.join(tmpDir, 'test.mc');
    fs.writeFileSync(mcPath, '<mc><mc-body></mc-body></mc>');

    // mc → mc is not supported
    const flags: ConvertFlags = { to: 'mc' };
    const code = runConvert(mcPath, flags);
    expect(code).toBe(EXIT_COMPILE_ERROR);
  });

  it('auto-detects format from extension', () => {
    const jsonPath = path.join(tmpDir, 'test.json');
    const node = { type: 'mc-body', attributes: {}, children: [] };
    fs.writeFileSync(jsonPath, JSON.stringify(node));

    // No --from flag, should detect json from extension
    const flags: ConvertFlags = { to: 'mc' };
    const code = runConvert(jsonPath, flags);
    expect(code).toBe(EXIT_SUCCESS);
  });

  it('respects --from flag override', () => {
    // Create a .txt file containing mc markup
    const txtPath = path.join(tmpDir, 'test.txt');
    fs.writeFileSync(txtPath, '<mc><mc-body><mc-section><mc-column><mc-text>Hello</mc-text></mc-column></mc-section></mc-body></mc>');

    const flags: ConvertFlags = { to: 'json', from: 'mc' };
    const code = runConvert(txtPath, flags);
    expect(code).toBe(EXIT_SUCCESS);

    const parsed = JSON.parse(stdoutChunks.join(''));
    expect(parsed.type).toBe('mc');
  });
});
