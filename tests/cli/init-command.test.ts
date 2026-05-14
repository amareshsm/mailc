/**
 * Tests for the `mailc init` command.
 *
 * @module tests/cli/init-command
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runInit } from '../../src/cli/init-command.js';
import type { InitFlags } from '../../src/cli/init-command.js';
import { EXIT_SUCCESS } from '../../src/cli/exit-codes.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mailc-init-test-'));
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

const FLAGS: InitFlags = { yes: true };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('runInit()', () => {
  it('creates all scaffold files and directories', () => {
    const code = runInit(tmpDir, FLAGS);
    expect(code).toBe(EXIT_SUCCESS);

    // Directories
    expect(fs.existsSync(path.join(tmpDir, 'templates'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'data'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'dist'))).toBe(true);

    // Files
    expect(fs.existsSync(path.join(tmpDir, 'mailc.config.js'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'templates', 'welcome.mc'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'templates', 'welcome.json'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'data', 'welcome.json'))).toBe(true);
  });

  it('creates valid .mc template with dual-input mention', () => {
    runInit(tmpDir, FLAGS);
    const mc = fs.readFileSync(path.join(tmpDir, 'templates', 'welcome.mc'), 'utf-8');
    expect(mc).toContain('<mc>');
    expect(mc).toContain('<mc-body>');
    expect(mc).toContain('{{name}}');
    expect(mc).toContain('mailc');
  });

  it('creates valid .json template', () => {
    runInit(tmpDir, FLAGS);
    const raw = fs.readFileSync(path.join(tmpDir, 'templates', 'welcome.json'), 'utf-8');
    const doc = JSON.parse(raw);
    expect(doc.template).toBeDefined();
    expect(doc.template.type).toBe('mc');
    expect(doc.sampleData).toBeDefined();
  });

  it('creates valid data file', () => {
    runInit(tmpDir, FLAGS);
    const raw = fs.readFileSync(path.join(tmpDir, 'data', 'welcome.json'), 'utf-8');
    const data = JSON.parse(raw);
    expect(data.name).toBe('World');
  });

  it('creates valid JS config', () => {
    runInit(tmpDir, FLAGS);
    const config = fs.readFileSync(path.join(tmpDir, 'mailc.config.js'), 'utf-8');
    expect(config).toContain('export default');
    expect(config).toContain('width');
  });

  it('skips existing files without overwriting', () => {
    // Create one file first
    fs.mkdirSync(path.join(tmpDir, 'templates'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'templates', 'welcome.mc'), 'ORIGINAL CONTENT');

    runInit(tmpDir, FLAGS);

    // Should not overwrite
    const mc = fs.readFileSync(path.join(tmpDir, 'templates', 'welcome.mc'), 'utf-8');
    expect(mc).toBe('ORIGINAL CONTENT');

    // But other files should still be created
    expect(fs.existsSync(path.join(tmpDir, 'templates', 'welcome.json'))).toBe(true);
  });

  it('running init twice is idempotent', () => {
    runInit(tmpDir, FLAGS);
    const code = runInit(tmpDir, FLAGS);
    expect(code).toBe(EXIT_SUCCESS);
    // All files should still exist
    expect(fs.existsSync(path.join(tmpDir, 'mailc.config.js'))).toBe(true);
  });

  it('defaults to cwd when no targetDir provided', () => {
    // We can't easily test cwd, so just verify the function accepts undefined
    const origCwd = process.cwd();
    process.chdir(tmpDir);
    try {
      const code = runInit(undefined, FLAGS);
      expect(code).toBe(EXIT_SUCCESS);
      expect(fs.existsSync(path.join(tmpDir, 'mailc.config.js'))).toBe(true);
    } finally {
      process.chdir(origCwd);
    }
  });
});
