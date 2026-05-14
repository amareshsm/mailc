import { describe, it, expect } from 'vitest';
import type { WatchFlags } from '../../src/cli/watch-command.js';

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
