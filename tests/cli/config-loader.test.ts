/**
 * Tests for CLI config file loader.
 *
 * @module tests/cli/config-loader
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadConfig } from '../../src/cli/config-loader.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mailc-config-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('loadConfig()', () => {
  it('returns empty config when no config file exists', async () => {
    const result = await loadConfig(tmpDir);
    expect(result.config).toEqual({});
    expect(result.configPath).toBeUndefined();
    expect(result.warnings).toEqual([]);
  });

  it('loads mailc.config.json', async () => {
    const configPath = path.join(tmpDir, 'mailc.config.json');
    fs.writeFileSync(configPath, JSON.stringify({ width: 700 }));

    const result = await loadConfig(tmpDir);
    expect(result.config).toEqual({ width: 700 });
    expect(result.configPath).toBe(configPath);
  });

  it('loads .mailcrc as JSON', async () => {
    const configPath = path.join(tmpDir, '.mailcrc');
    fs.writeFileSync(configPath, JSON.stringify({ width: 650 }));

    const result = await loadConfig(tmpDir);
    expect(result.config).toEqual({ width: 650 });
    expect(result.configPath).toBe(configPath);
  });

  it('extracts "mailc" key from package.json', async () => {
    const pkgPath = path.join(tmpDir, 'package.json');
    fs.writeFileSync(pkgPath, JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      mailc: { width: 550 },
    }));

    const result = await loadConfig(tmpDir);
    expect(result.config).toEqual({ width: 550 });
    expect(result.configPath).toBe(pkgPath);
  });

  it('returns empty config if package.json has no "mailc" key', async () => {
    const pkgPath = path.join(tmpDir, 'package.json');
    fs.writeFileSync(pkgPath, JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
    }));

    const result = await loadConfig(tmpDir);
    expect(result.config).toEqual({});
    // Still loads the file but extracts nothing
  });

  it('loads explicit config path with --config', async () => {
    const configPath = path.join(tmpDir, 'custom.json');
    fs.writeFileSync(configPath, JSON.stringify({ width: 800 }));

    const result = await loadConfig(tmpDir, configPath);
    expect(result.config).toEqual({ width: 800 });
    expect(result.configPath).toBe(configPath);
  });

  it('throws when explicit config path does not exist', async () => {
    const badPath = path.join(tmpDir, 'nonexistent.json');
    await expect(loadConfig(tmpDir, badPath)).rejects.toThrow('Config file not found');
  });

  it('warns when multiple config files exist', async () => {
    fs.writeFileSync(path.join(tmpDir, 'mailc.config.json'), JSON.stringify({ width: 600 }));
    fs.writeFileSync(path.join(tmpDir, '.mailcrc'), JSON.stringify({ width: 700 }));

    const result = await loadConfig(tmpDir);
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0]).toContain('Multiple config files');
    // First file wins (mailc.config.json)
    expect(result.config).toEqual({ width: 600 });
  });

  it('throws on malformed JSON config', async () => {
    const configPath = path.join(tmpDir, 'mailc.config.json');
    fs.writeFileSync(configPath, '{ broken json }}}');

    await expect(loadConfig(tmpDir)).rejects.toThrow('Invalid JSON');
  });

  it('loads mailc.config.js via dynamic import', async () => {
    const configPath = path.join(tmpDir, 'mailc.config.js');
    fs.writeFileSync(configPath, 'export default { width: 640 };\n');

    const result = await loadConfig(tmpDir);
    expect(result.config).toEqual({ width: 640 });
    expect(result.configPath).toBe(configPath);
  });

  it('throws when .js config has no default export', async () => {
    const configPath = path.join(tmpDir, 'mailc.config.js');
    fs.writeFileSync(configPath, 'export const width = 640;\n');

    await expect(loadConfig(tmpDir)).rejects.toThrow('must have a default export');
  });

  it('prioritizes mailc.config.js over mailc.config.json', async () => {
    fs.writeFileSync(path.join(tmpDir, 'mailc.config.js'), 'export default { width: 500 };\n');
    fs.writeFileSync(path.join(tmpDir, 'mailc.config.json'), JSON.stringify({ width: 700 }));

    const result = await loadConfig(tmpDir);
    // .js is first in detection order
    expect(result.config).toEqual({ width: 500 });
    expect(result.warnings.length).toBe(1);
  });
});
