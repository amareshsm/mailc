import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG, mergeConfig } from '../../src/config.js';

describe('DEFAULT_CONFIG', () => {
  it('has sensible defaults', () => {
    expect(DEFAULT_CONFIG.width).toBe(600);
    // Omitted targetClients = no caniemail-driven gating by default.
    // Users opt into the curated 5-client set explicitly via
    // `targetClients: 'default'` or pass a custom string[].
    expect(DEFAULT_CONFIG.targetClients).toBeUndefined();
    expect(DEFAULT_CONFIG.responsive.breakpoint).toBe(480);
    expect(DEFAULT_CONFIG.darkMode.enabled).toBe(false);
    expect(DEFAULT_CONFIG.output.minify).toBe(false);
    expect(DEFAULT_CONFIG.templateEngine.strictVariables).toBe(false);
  });
});

describe('mergeConfig', () => {
  it('returns a copy of defaults when no overrides', () => {
    const result = mergeConfig();
    expect(result).toEqual(DEFAULT_CONFIG);
    expect(result).not.toBe(DEFAULT_CONFIG); // new object
  });

  it('returns defaults when empty object passed', () => {
    const result = mergeConfig({});
    expect(result.width).toBe(600);
  });

  it('overrides top-level scalars', () => {
    const result = mergeConfig({ width: 640 });
    expect(result.width).toBe(640);
  });

  it('overrides targetClients', () => {
    const result = mergeConfig({ targetClients: ['gmail.*'] });
    expect(result.targetClients).toEqual(['gmail.*']);
  });

  it('shallow-merges responsive', () => {
    const result = mergeConfig({ responsive: { breakpoint: 640 } });
    expect(result.responsive.breakpoint).toBe(640);
  });

  it('shallow-merges output', () => {
    const result = mergeConfig({ output: { minify: true } as never });
    expect(result.output.minify).toBe(true);
    expect(result.output.comments).toBe(false); // preserved from defaults
  });
});
