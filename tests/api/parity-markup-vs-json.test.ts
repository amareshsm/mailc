/**
 * Cross-validation: for every supported `targetClients` shape, `compile()`
 * (markup) and `compileFromJSON()` produce equivalent classification
 * outcomes — same warnings emitted, same gmailClipRisk, same notion of
 * "is this property in the output".
 *
 * Catches drift between the two pipelines after the three-way targetClients
 * refactor — both have their own copy of the `resolveTargetClients()` →
 * PassthroughMap | buildClassificationMap() branch, plus their own
 * checkEmailBudget call.
 */
import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compile.js';
import { compileFromJSON } from '../../src/json/index.js';
import { markupToJSON } from '../../src/json/index.js';
import type { CompileOptions } from '../../src/types.js';
import { ErrorCode } from '../../src/errors/codes.js';

const SRC = `<mc>
  <mc-head><mc-title>Parity</mc-title></mc-head>
  <mc-body>
    <mc-section>
      <mc-column>
        <mc-button href="#" border-radius="12" box-shadow="0 2px 4px red" opacity="0.9" background-color="purple" color="white">Hi</mc-button>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`;

const JSON_INPUT = markupToJSON(SRC);

interface ParityCheck {
  label: string;
  options?: CompileOptions;
  // What we expect across BOTH paths
  expectedStripped: boolean;       // Should ENHANCE_PROPERTY_STRIPPED appear?
  expectedClipRisk: 'safe' | 'not-targeted';
  expectBorderRadius: boolean;     // Should `border-radius:12` survive into html?
}

const CASES: ParityCheck[] = [
  {
    label: 'omitted targetClients (no gating) + liberal',
    options: {},
    expectedStripped: false,
    expectedClipRisk: 'not-targeted',
    expectBorderRadius: true,
  },
  {
    label: 'omitted targetClients (no gating) + strict — strict is a no-op here',
    options: { compatibilityMode: 'strict' },
    expectedStripped: false,
    expectedClipRisk: 'not-targeted',
    expectBorderRadius: true,
  },
  {
    label: "targetClients: 'default' + liberal — ENHANCE inlined, gmail in scope",
    options: { targetClients: 'default' },
    expectedStripped: false,
    expectedClipRisk: 'safe',
    expectBorderRadius: true,
  },
  {
    label: "targetClients: 'default' + strict — ENHANCE stripped + warned",
    options: { targetClients: 'default', compatibilityMode: 'strict' },
    expectedStripped: true,
    expectedClipRisk: 'safe',
    expectBorderRadius: false,
  },
  {
    label: "custom ['gmail.web','outlook.web'] + strict — webmail keeps ENHANCE",
    options: { targetClients: ['gmail.web', 'outlook.web'], compatibilityMode: 'strict' },
    expectedStripped: false,
    expectedClipRisk: 'safe',
    expectBorderRadius: true,
  },
  {
    label: "custom ['outlook.windows'] + strict — Outlook → ENHANCE stripped",
    options: { targetClients: ['outlook.windows'], compatibilityMode: 'strict' },
    expectedStripped: true,
    expectedClipRisk: 'not-targeted',
    expectBorderRadius: false,
  },
];

describe('markup vs JSON parity — targetClients three-way API', () => {
  it.each(CASES)('$label', (c) => {
    const markupResult = compile(SRC, c.options);
    const jsonResult = compileFromJSON(JSON_INPUT, c.options);

    // Both pipelines must produce HTML
    expect(markupResult.html).not.toBeNull();
    expect(jsonResult.html).not.toBeNull();

    // Stripped-warning emission parity
    const markupStripped = markupResult.warnings.some(
      (w) => w.code === ErrorCode.ENHANCE_PROPERTY_STRIPPED,
    );
    const jsonStripped = jsonResult.warnings.some(
      (w) => w.code === ErrorCode.ENHANCE_PROPERTY_STRIPPED,
    );
    expect(markupStripped).toBe(c.expectedStripped);
    expect(jsonStripped).toBe(c.expectedStripped);

    // Gmail clip risk parity
    expect(markupResult.stats.gmailClipRisk).toBe(c.expectedClipRisk);
    expect(jsonResult.stats.gmailClipRisk).toBe(c.expectedClipRisk);

    // Visible-property parity
    const markupHasRadius = /border-radius:12/.test(markupResult.html ?? '');
    const jsonHasRadius = /border-radius:12/.test(jsonResult.html ?? '');
    expect(markupHasRadius).toBe(c.expectBorderRadius);
    expect(jsonHasRadius).toBe(c.expectBorderRadius);
    // And both pipelines agree with each other
    expect(markupHasRadius).toBe(jsonHasRadius);
  });
});
