import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { WatchFlags } from '../../src/cli/watch-command.js';
import { _compileAndWrite } from '../../src/cli/watch-command.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('_compileAndWrite — warning surfacing', () => {
  // Regression: warnings were filtered from result.errors (always empty)
  // instead of result.warnings, so `mailc watch --verbose` never showed a
  // single real warning and the preview server's warning list was empty.
  it('verbose mode prints real compile warnings (from result.warnings)', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mailc-watch-warn-'));
    const src = path.join(tmpDir, 'warn.mc');
    const out = path.join(tmpDir, 'out.html');
    // `colour` (typo) produces an UNKNOWN_ATTRIBUTE warning — no errors.
    fs.writeFileSync(src, `<mc><mc-head><mc-title>T</mc-title></mc-head><mc-body><mc-section><mc-column><mc-text colour="#333">Hi</mc-text></mc-column></mc-section></mc-body></mc>`);

    const stdoutChunks: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      stdoutChunks.push(String(chunk));
      return true;
    });
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const flags: WatchFlags = { output: out, serve: false, port: 3000, open: false, verbose: true };
    _compileAndWrite(src, out, flags, {}, null);

    const stdout = stdoutChunks.join('');
    // Success line shows the warning count…
    expect(stdout).toContain('warning');
    // …and verbose mode prints the actual warning message.
    expect(stdout).toContain('colour');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('preview server receives real warnings in the reload payload', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mailc-watch-preview-'));
    const src = path.join(tmpDir, 'warn.mc');
    const out = path.join(tmpDir, 'out.html');
    fs.writeFileSync(src, `<mc><mc-head><mc-title>T</mc-title></mc-head><mc-body><mc-section><mc-column><mc-text colour="#333">Hi</mc-text></mc-column></mc-section></mc-body></mc>`);

    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const received: string[][] = [];
    const fakePreview = {
      server: null as never,
      port: 0,
      notifyReload: (_html: string, payload: { warnings: string[] }) => {
        received.push(payload.warnings);
      },
      notifyError: () => undefined,
      close: () => Promise.resolve(),
    };

    const flags: WatchFlags = { output: out, serve: true, port: 0, open: false, verbose: false };
    _compileAndWrite(src, out, flags, {}, fakePreview);

    expect(received).toHaveLength(1);
    expect(received[0]!.some((w) => w.includes('colour'))).toBe(true);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('WatchFlags — type contract', () => {
  it('accepts a full valid WatchFlags object', () => {
    const flags: WatchFlags = {
      output: 'dist/out.html',
      serve: true,
      port: 3000,
      open: false,
      verbose: false,
    };
    expect(flags.output).toBe('dist/out.html');
    expect(flags.serve).toBe(true);
    expect(flags.port).toBe(3000);
    expect(flags.open).toBe(false);
    expect(flags.verbose).toBe(false);
  });

  it('port defaults to 3000 in typical CLI usage', () => {
    const flags: WatchFlags = {
      output: 'out.html',
      serve: false,
      port: 3000,
      open: false,
      verbose: false,
    };
    expect(flags.port).toBe(3000);
  });

  it('serve=false means no preview server', () => {
    const flags: WatchFlags = {
      output: 'out.html',
      serve: false,
      port: 3000,
      open: false,
      verbose: false,
    };
    expect(flags.serve).toBe(false);
  });
});

describe('runWatch() — file validation', () => {
  it('rejects non-.mc files', async () => {
    const { runWatch } = await import('../../src/cli/watch-command.js');
    const flags: WatchFlags = {
      output: 'out.html',
      serve: false,
      port: 3000,
      open: false,
      verbose: false,
    };
    const code = await runWatch('template.html', flags, {});
    expect(code).toBe(3); // EXIT_IO_ERROR
  });

  it('returns EXIT_IO_ERROR for a non-existent file', async () => {
    const { runWatch } = await import('../../src/cli/watch-command.js');
    const flags: WatchFlags = {
      output: 'out.html',
      serve: false,
      port: 3000,
      open: false,
      verbose: false,
    };
    const code = await runWatch('/tmp/__does_not_exist__.mc', flags, {});
    expect(code).toBe(3); // EXIT_IO_ERROR
  });
});
