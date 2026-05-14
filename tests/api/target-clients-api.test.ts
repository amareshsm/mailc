/**
 * Public-API coverage for the three-way `targetClients` shape.
 *
 *   1. omitted        → no caniemail-driven gating (PassthroughMap)
 *                       BUT ALWAYS_BREAKING / ALWAYS_NO_EFFECT still strip.
 *   2. 'default'      → curated 5-client preset (DEFAULT_CLIENTS)
 *   3. string[]       → exact custom client list
 *
 * Each mode is verified end-to-end through `compile()` for both an ENHANCE
 * property (border-radius → behavior differs across modes) and an
 * ALWAYS_BREAKING property (display:flex → stripped in EVERY mode).
 *
 * The CLI's `--target` flag has its own dispatch-layer test in
 * `tests/cli/compile-dispatch.test.ts`; this file exercises the
 * programmatic API only.
 */
import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compile.js';
import { DEFAULT_CLIENTS } from '../../src/config.js';
import { resolveTargetClients } from '../../src/config.js';
import { ErrorCode } from '../../src/errors/codes.js';

const RADIUS_SRC = `<mc>
  <mc-head><mc-title>X</mc-title></mc-head>
  <mc-body>
    <mc-section>
      <mc-column>
        <mc-button href="#" border-radius="8" background-color="purple" color="white">Click</mc-button>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`;

const FLEX_SRC = `<mc>
  <mc-head><mc-title>X</mc-title></mc-head>
  <mc-body>
    <mc-section>
      <mc-column class="flex">
        <mc-text>hi</mc-text>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`;

describe('targetClients — three-way API', () => {
  describe('omitted (no client gating)', () => {
    it('border-radius is inlined directly — no <style> routing, no warnings', () => {
      const r = compile(RADIUS_SRC);
      expect(r.warnings.find((w) => w.code === ErrorCode.ENHANCE_PROPERTY_STRIPPED)).toBeUndefined();
      // border-radius should appear in the inline style on the button anchor.
      expect(r.html ?? '').toMatch(/style="[^"]*border-radius:8[^"]*"/);
    });

    it('strict mode is a no-op for ENHANCE properties — no client list to gate on', () => {
      const r = compile(RADIUS_SRC, { compatibilityMode: 'strict' });
      expect(r.warnings.find((w) => w.code === ErrorCode.ENHANCE_PROPERTY_STRIPPED)).toBeUndefined();
      expect(r.html ?? '').toMatch(/border-radius:8/);
    });

    it('ALWAYS_BREAKING (display:flex) is STILL stripped even with no client gating', () => {
      // The safety guarantee: passthrough disables caniemail-driven gating
      // only. Hardcoded structural rules always apply because they protect
      // Outlook's table layout regardless of which clients you target.
      const r = compile(FLEX_SRC);
      expect(r.html ?? '').not.toMatch(/display\s*:\s*flex/);
    });

    it('Gmail clip-risk check is skipped (no clients = no audience)', () => {
      const r = compile(RADIUS_SRC);
      expect(r.stats.gmailClipRisk).toBe('not-targeted');
    });
  });

  describe("'default' (curated 5-client preset)", () => {
    it('border-radius is still inlined in liberal mode (graceful degradation)', () => {
      const r = compile(RADIUS_SRC, { targetClients: 'default' });
      expect(r.warnings.find((w) => w.code === ErrorCode.ENHANCE_PROPERTY_STRIPPED)).toBeUndefined();
      expect(r.html ?? '').toMatch(/border-radius:8/);
    });

    it('strict mode now DOES strip border-radius + emit ENHANCE_PROPERTY_STRIPPED', () => {
      const r = compile(RADIUS_SRC, { targetClients: 'default', compatibilityMode: 'strict' });
      expect(r.warnings.some((w) => w.code === ErrorCode.ENHANCE_PROPERTY_STRIPPED)).toBe(true);
    });

    it('Gmail clip-risk check is active (gmail.* in the preset)', () => {
      const r = compile(RADIUS_SRC, { targetClients: 'default' });
      expect(['safe', 'approaching', 'exceeded']).toContain(r.stats.gmailClipRisk);
    });
  });

  describe('string[] (custom client list)', () => {
    it('only the supplied clients are considered — webmail-only keeps border-radius SAFE', () => {
      // No Outlook in the target list → border-radius is SAFE not ENHANCE.
      // Confirmed by strict mode NOT stripping it (no ENHANCE classification).
      const r = compile(RADIUS_SRC, {
        targetClients: ['gmail.web', 'apple-mail.macos', 'apple-mail.ios'],
        compatibilityMode: 'strict',
      });
      expect(r.html ?? '').toMatch(/border-radius:8/);
      expect(r.warnings.find((w) => w.code === ErrorCode.ENHANCE_PROPERTY_STRIPPED)).toBeUndefined();
    });

    it('adding Outlook to a custom list flips border-radius to ENHANCE', () => {
      const r = compile(RADIUS_SRC, {
        targetClients: ['gmail.web', 'outlook.windows'],
        compatibilityMode: 'strict',
      });
      expect(r.warnings.some((w) => w.code === ErrorCode.ENHANCE_PROPERTY_STRIPPED)).toBe(true);
    });
  });
});

describe('resolveTargetClients()', () => {
  it("returns undefined for undefined input (no gating)", () => {
    expect(resolveTargetClients(undefined)).toBeUndefined();
  });

  it("expands 'default' to a copy of DEFAULT_CLIENTS", () => {
    const resolved = resolveTargetClients('default');
    expect(resolved).toEqual([...DEFAULT_CLIENTS]);
    // Should be a fresh array — mutating mustn't leak into DEFAULT_CLIENTS.
    expect(resolved).not.toBe(DEFAULT_CLIENTS);
  });

  it('passes string[] through unchanged (by reference is fine — caller owns it)', () => {
    const input = ['gmail.web', 'outlook.web'];
    expect(resolveTargetClients(input)).toBe(input);
  });
});
