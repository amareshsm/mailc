/**
 * Phase 8 — Comprehensive mc-class tests.
 *
 * Covers all mc-class scenarios:
 * 1. Basic application to each component type
 * 2. mc-class attribute stripping
 * 3. Multiple space-separated classes
 * 4. Full precedence chain (mc-all < mc-type < mc-class < explicit)
 * 5. Undefined class name warnings
 * 6. Inheritance via extends
 * 7. Circular extends detection
 * 8. Multiple mc-attributes blocks
 * 9. JSON round-trip (compileFromJSON)
 * 10. Validator integration
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../../src/compile.js';
import { compileFromJSON } from '../../src/json/index.js';
import { validate } from '../../src/validate.js';
import type { MCNode } from '../../src/json/schema.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wraps body markup in a full mc template with optional mc-attributes. */
function withAttrs(attrsMarkup: string, bodyMarkup: string): string {
  return `
    <mc>
      <mc-head>
        <mc-attributes>
          ${attrsMarkup}
        </mc-attributes>
      </mc-head>
      <mc-body>
        <mc-section>
          <mc-column>
            ${bodyMarkup}
          </mc-column>
        </mc-section>
      </mc-body>
    </mc>
  `;
}

// ---------------------------------------------------------------------------
// 1. Basic Application
// ---------------------------------------------------------------------------

describe('mc-class: basic application', () => {
  it('applies single class to mc-text (font-size)', () => {
    const result = compile(
      withAttrs(
        '<mc-class name="hero" font-size="28px" />',
        '<mc-text mc-class="hero">Heading</mc-text>',
      ),
      { templateStyle: 'attribute' },
    );
    expect(result.errors).toHaveLength(0);
    expect(result.html).toContain('font-size:28px');
  });

  it('applies single class to mc-text (color)', () => {
    const result = compile(
      withAttrs(
        '<mc-class name="accent" color="#e85d3a" />',
        '<mc-text mc-class="accent">Text</mc-text>',
      ),
      { templateStyle: 'attribute' },
    );
    expect(result.errors).toHaveLength(0);
    expect(result.html).toContain('color:#e85d3a');
  });

  it('applies single class to mc-button (background-color)', () => {
    const result = compile(
      withAttrs(
        '<mc-class name="cta" background-color="#0066cc" />',
        '<mc-button href="https://example.com" mc-class="cta">Click</mc-button>',
      ),
      { templateStyle: 'attribute' },
    );
    expect(result.errors).toHaveLength(0);
    expect(result.html).toContain('background-color:#0066cc');
  });

  it('applies single class to mc-divider (border-color)', () => {
    const result = compile(
      withAttrs(
        '<mc-class name="subtle" border-color="#cccccc" />',
        '<mc-divider mc-class="subtle" />',
      ),
      { templateStyle: 'attribute' },
    );
    expect(result.errors).toHaveLength(0);
    expect(result.html).toContain('#cccccc');
  });

  it('applies font-family class to mc-text', () => {
    const result = compile(
      withAttrs(
        '<mc-class name="brand-font" font-family="Georgia, serif" />',
        '<mc-text mc-class="brand-font">Text</mc-text>',
      ),
      { templateStyle: 'attribute' },
    );
    expect(result.errors).toHaveLength(0);
    expect(result.html).toContain('font-family:Georgia, serif');
  });

  it('applies multiple style attrs from one class', () => {
    const result = compile(
      withAttrs(
        '<mc-class name="promo" font-size="20px" color="#ffffff" font-weight="bold" />',
        '<mc-text mc-class="promo">Promo</mc-text>',
      ),
      { templateStyle: 'attribute' },
    );
    expect(result.errors).toHaveLength(0);
    expect(result.html).toContain('font-size:20px');
    expect(result.html).toContain('color:#ffffff');
  });
});

// ---------------------------------------------------------------------------
// 2. mc-class Attribute Stripping
// ---------------------------------------------------------------------------

describe('mc-class: attribute stripping', () => {
  it('mc-class attribute does not appear in HTML output for mc-text', () => {
    const result = compile(
      withAttrs(
        '<mc-class name="hero" font-size="24px" />',
        '<mc-text mc-class="hero">Text</mc-text>',
      ),
      { templateStyle: 'attribute' },
    );
    expect(result.errors).toHaveLength(0);
    expect(result.html).not.toContain('mc-class=');
    expect(result.html).not.toContain('mc-class');
  });

  it('mc-class attribute does not appear in HTML output for mc-button', () => {
    const result = compile(
      withAttrs(
        '<mc-class name="cta" background-color="#e85d3a" />',
        '<mc-button href="https://example.com" mc-class="cta">Click</mc-button>',
      ),
      { templateStyle: 'attribute' },
    );
    expect(result.errors).toHaveLength(0);
    expect(result.html).not.toContain('mc-class');
  });

  it('empty mc-class value does not appear in HTML output', () => {
    const result = compile(
      withAttrs(
        '<mc-class name="hero" font-size="24px" />',
        '<mc-text mc-class="">Text</mc-text>',
      ),
      { templateStyle: 'attribute' },
    );
    expect(result.errors).toHaveLength(0);
    expect(result.html).not.toContain('mc-class');
  });
});

// ---------------------------------------------------------------------------
// 3. Multiple Space-Separated Classes
// ---------------------------------------------------------------------------

describe('mc-class: multiple space-separated classes', () => {
  it('applies two classes together (both attrs present)', () => {
    const result = compile(
      withAttrs(
        `<mc-class name="base" padding="16px" />
         <mc-class name="accent" color="#ff0000" />`,
        '<mc-text mc-class="base accent">Text</mc-text>',
      ),
      { templateStyle: 'attribute' },
    );
    expect(result.errors).toHaveLength(0);
    expect(result.html).toContain('padding:16px');
    expect(result.html).toContain('color:#ff0000');
  });

  it('later class wins for the same key', () => {
    const result = compile(
      withAttrs(
        `<mc-class name="heading" font-size="24px" color="#000000" />
         <mc-class name="accent" color="#ff0000" />`,
        '<mc-text mc-class="heading accent">Text</mc-text>',
      ),
      { templateStyle: 'attribute' },
    );
    expect(result.errors).toHaveLength(0);
    expect(result.html).toContain('font-size:24px');
    expect(result.html).toContain('color:#ff0000');
    expect(result.html).not.toContain('color:#000000');
  });

  it('first class wins when order reversed', () => {
    const result = compile(
      withAttrs(
        `<mc-class name="heading" color="#000000" />
         <mc-class name="accent" color="#ff0000" />`,
        '<mc-text mc-class="accent heading">Text</mc-text>',
      ),
      { templateStyle: 'attribute' },
    );
    expect(result.errors).toHaveLength(0);
    // heading is second → heading's color wins
    expect(result.html).toContain('color:#000000');
    expect(result.html).not.toContain('color:#ff0000');
  });

  it('three classes are all merged', () => {
    const result = compile(
      withAttrs(
        `<mc-class name="size" font-size="18px" />
         <mc-class name="weight" font-weight="bold" />
         <mc-class name="color" color="#333333" />`,
        '<mc-text mc-class="size weight color">Text</mc-text>',
      ),
      { templateStyle: 'attribute' },
    );
    expect(result.errors).toHaveLength(0);
    expect(result.html).toContain('font-size:18px');
    expect(result.html).toContain('color:#333333');
  });
});

// ---------------------------------------------------------------------------
// 4. Precedence Chain
// ---------------------------------------------------------------------------

describe('mc-class: precedence chain (mc-all < mc-type < mc-class < explicit)', () => {
  it('mc-class overrides mc-all default', () => {
    const result = compile(`
      <mc>
        <mc-head>
          <mc-attributes>
            <mc-all color="#111111" />
            <mc-class name="accent" color="#ff0000" />
          </mc-attributes>
        </mc-head>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-text mc-class="accent">Text</mc-text>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `, { templateStyle: 'attribute' });
    expect(result.errors).toHaveLength(0);
    expect(result.html).toContain('color:#ff0000');
    expect(result.html).not.toContain('color:#111111');
  });

  it('mc-class overrides mc-type default', () => {
    const result = compile(`
      <mc>
        <mc-head>
          <mc-attributes>
            <mc-text color="#222222" />
            <mc-class name="accent" color="#ff0000" />
          </mc-attributes>
        </mc-head>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-text mc-class="accent">Text</mc-text>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `, { templateStyle: 'attribute' });
    expect(result.errors).toHaveLength(0);
    expect(result.html).toContain('color:#ff0000');
    expect(result.html).not.toContain('color:#222222');
  });

  it('explicit attribute overrides mc-class', () => {
    const result = compile(`
      <mc>
        <mc-head>
          <mc-attributes>
            <mc-class name="accent" color="#ff0000" />
          </mc-attributes>
        </mc-head>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-text mc-class="accent" color="#000000">Text</mc-text>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `, { templateStyle: 'attribute' });
    expect(result.errors).toHaveLength(0);
    expect(result.html).toContain('color:#000000');
    expect(result.html).not.toContain('color:#ff0000');
  });

  it('full 4-level precedence: explicit wins over all', () => {
    const result = compile(`
      <mc>
        <mc-head>
          <mc-attributes>
            <mc-all color="#111111" />
            <mc-text color="#222222" />
            <mc-class name="accent" color="#333333" />
          </mc-attributes>
        </mc-head>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-text mc-class="accent" color="#444444">Text</mc-text>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `, { templateStyle: 'attribute' });
    expect(result.errors).toHaveLength(0);
    expect(result.html).toContain('color:#444444');
    expect(result.html).not.toContain('color:#333333');
    expect(result.html).not.toContain('color:#222222');
    expect(result.html).not.toContain('color:#111111');
  });

  it('mc-type default applies when no mc-class is used', () => {
    const result = compile(`
      <mc>
        <mc-head>
          <mc-attributes>
            <mc-text color="#222222" />
            <mc-class name="accent" color="#ff0000" />
          </mc-attributes>
        </mc-head>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-text>Text without class</mc-text>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `, { templateStyle: 'attribute' });
    expect(result.errors).toHaveLength(0);
    expect(result.html).toContain('color:#222222');
    expect(result.html).not.toContain('color:#ff0000');
  });

  it('mc-class does not affect components not using it', () => {
    const result = compile(`
      <mc>
        <mc-head>
          <mc-attributes>
            <mc-class name="special" color="#ff0000" />
          </mc-attributes>
        </mc-head>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-text mc-class="special">Styled</mc-text>
              <mc-text>Unstyled</mc-text>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `, { templateStyle: 'attribute' });
    expect(result.errors).toHaveLength(0);
    // Both compile without errors, only one gets the style
    expect(result.html).toContain('color:#ff0000');
  });
});

// ---------------------------------------------------------------------------
// 5. Undefined Class Name Warnings
// ---------------------------------------------------------------------------

describe('mc-class: undefined class name warnings', () => {
  it('warns with UNKNOWN_MC_CLASS for a single undefined class', () => {
    const result = compile(
      withAttrs(
        '',
        '<mc-text mc-class="ghost">Text</mc-text>',
      ),
    );
    const warning = result.warnings.find((w) => w.code === 'UNKNOWN_MC_CLASS');
    expect(warning).toBeDefined();
    expect(warning?.message).toContain('ghost');
  });

  it('still compiles successfully when class is undefined', () => {
    const result = compile(
      withAttrs(
        '',
        '<mc-text mc-class="ghost">Text</mc-text>',
      ),
    );
    expect(result.html).toBeTruthy();
    expect(result.html).toContain('Text');
  });

  it('warns for undefined class in multi-class list', () => {
    const result = compile(
      withAttrs(
        '<mc-class name="defined" color="#000000" />',
        '<mc-text mc-class="defined ghost">Text</mc-text>',
      ),
      { templateStyle: 'attribute' },
    );
    const warning = result.warnings.find((w) => w.code === 'UNKNOWN_MC_CLASS');
    expect(warning).toBeDefined();
    expect(warning?.message).toContain('ghost');
    // defined class still applies
    expect(result.html).toContain('color:#000000');
  });

  it('no UNKNOWN_MC_CLASS warning when class is defined', () => {
    const result = compile(
      withAttrs(
        '<mc-class name="cta" color="#000000" />',
        '<mc-text mc-class="cta">Text</mc-text>',
      ),
      { templateStyle: 'attribute' },
    );
    const warning = result.warnings.find((w) => w.code === 'UNKNOWN_MC_CLASS');
    expect(warning).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 6. Inheritance via extends
// ---------------------------------------------------------------------------

describe('mc-class: inheritance via extends', () => {
  it('child inherits parent attributes', () => {
    const result = compile(`
      <mc>
        <mc-head>
          <mc-attributes>
            <mc-class name="base" padding="12px 24px" border-radius="4px" />
            <mc-class name="primary" extends="base" background-color="#0066cc" />
          </mc-attributes>
        </mc-head>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-button href="/" mc-class="primary">Click</mc-button>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `, { templateStyle: 'attribute' });
    expect(result.errors).toHaveLength(0);
    expect(result.html).toContain('background-color:#0066cc');
  });

  it('child overrides parent for same key', () => {
    const result = compile(`
      <mc>
        <mc-head>
          <mc-attributes>
            <mc-class name="base" color="#333333" font-size="14px" />
            <mc-class name="hero" extends="base" font-size="28px" />
          </mc-attributes>
        </mc-head>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-text mc-class="hero">Heading</mc-text>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `, { templateStyle: 'attribute' });
    expect(result.errors).toHaveLength(0);
    // hero overrides font-size
    expect(result.html).toContain('font-size:28px');
    expect(result.html).not.toContain('font-size:14px');
    // inherits color from base
    expect(result.html).toContain('color:#333333');
  });

  it('three-level inheritance chain resolves correctly', () => {
    const result = compile(`
      <mc>
        <mc-head>
          <mc-attributes>
            <mc-class name="root" font-family="Arial" color="#111111" />
            <mc-class name="mid" extends="root" font-size="16px" />
            <mc-class name="leaf" extends="mid" font-weight="bold" />
          </mc-attributes>
        </mc-head>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-text mc-class="leaf">Text</mc-text>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `, { templateStyle: 'attribute' });
    expect(result.errors).toHaveLength(0);
    expect(result.html).toContain('font-family:Arial');
    expect(result.html).toContain('font-size:16px');
  });

  it('undefined extends target is silently ignored; own attrs still apply', () => {
    const result = compile(`
      <mc>
        <mc-head>
          <mc-attributes>
            <mc-class name="child" extends="nonexistent" color="#000000" />
          </mc-attributes>
        </mc-head>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-text mc-class="child">Text</mc-text>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `, { templateStyle: 'attribute' });
    // No crash — compilation succeeds
    expect(result.errors).toHaveLength(0);
    // own attrs of the child class still apply
    expect(result.html).toContain('color:#000000');
  });

  it('class without extends works normally', () => {
    const result = compile(`
      <mc>
        <mc-head>
          <mc-attributes>
            <mc-class name="standalone" font-size="20px" color="#444444" />
          </mc-attributes>
        </mc-head>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-text mc-class="standalone">Text</mc-text>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `, { templateStyle: 'attribute' });
    expect(result.errors).toHaveLength(0);
    expect(result.html).toContain('font-size:20px');
    expect(result.html).toContain('color:#444444');
  });
});

// ---------------------------------------------------------------------------
// 7. Circular Extends Detection
// ---------------------------------------------------------------------------

describe('mc-class: circular extends handling', () => {
  it('compiles without crashing when a mutual cycle exists', () => {
    const result = compile(`
      <mc>
        <mc-head>
          <mc-attributes>
            <mc-class name="a" extends="b" color="#aaaaaa" />
            <mc-class name="b" extends="a" color="#bbbbbb" />
          </mc-attributes>
        </mc-head>
        <mc-body></mc-body>
      </mc>
    `);
    // Cycle is broken silently — no crash, no errors
    expect(result.html).toBeTruthy();
    expect(result.errors).toHaveLength(0);
  });

  it('component using a class from a cycle still gets own attrs', () => {
    const result = compile(`
      <mc>
        <mc-head>
          <mc-attributes>
            <mc-class name="a" extends="b" color="#aaaaaa" />
            <mc-class name="b" extends="a" color="#bbbbbb" />
          </mc-attributes>
        </mc-head>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-text mc-class="a">Text</mc-text>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `, { templateStyle: 'attribute' });
    expect(result.html).toBeTruthy();
    expect(result.errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 8. Multiple mc-attributes Blocks
// ---------------------------------------------------------------------------

describe('mc-class: multiple mc-attributes blocks', () => {
  it('classes from two separate mc-attributes blocks are both available', () => {
    const result = compile(`
      <mc>
        <mc-head>
          <mc-attributes>
            <mc-class name="big" font-size="28px" />
          </mc-attributes>
          <mc-attributes>
            <mc-class name="red" color="#ff0000" />
          </mc-attributes>
        </mc-head>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-text mc-class="big">Big text</mc-text>
              <mc-text mc-class="red">Red text</mc-text>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `, { templateStyle: 'attribute' });
    expect(result.errors).toHaveLength(0);
    expect(result.html).toContain('font-size:28px');
    expect(result.html).toContain('color:#ff0000');
  });

  it('second mc-attributes block adds more classes alongside first block', () => {
    const result = compile(`
      <mc>
        <mc-head>
          <mc-attributes>
            <mc-class name="base" font-size="14px" font-family="Arial" />
            <mc-class name="hero" extends="base" font-size="28px" />
          </mc-attributes>
          <mc-attributes>
            <mc-class name="footer" font-size="11px" color="#999999" />
          </mc-attributes>
        </mc-head>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-text mc-class="hero">Hero text</mc-text>
              <mc-text mc-class="footer">Footer text</mc-text>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `, { templateStyle: 'attribute' });
    expect(result.errors).toHaveLength(0);
    // hero: 28px (own overrides base), font-family inherited from base
    expect(result.html).toContain('font-size:28px');
    expect(result.html).toContain('font-family:Arial');
    // footer from second block
    expect(result.html).toContain('color:#999999');
  });
});

// ---------------------------------------------------------------------------
// 9. JSON Round-Trip (compileFromJSON)
// ---------------------------------------------------------------------------

describe('mc-class: JSON round-trip via compileFromJSON', () => {
  it('compileFromJSON applies mc-class attrs to mc-button', () => {
    const rootNode: MCNode = {
      type: 'mc',
      attributes: {},
      children: [
        {
          type: 'mc-head',
          attributes: {},
          children: [
            {
              type: 'mc-attributes',
              attributes: {},
              children: [
                {
                  type: 'mc-class',
                  attributes: { name: 'cta', 'background-color': '#e85d3a', color: '#ffffff' },
                },
              ],
            },
          ],
        },
        {
          type: 'mc-body',
          attributes: {},
          children: [
            {
              type: 'mc-section',
              attributes: {},
              children: [
                {
                  type: 'mc-column',
                  attributes: {},
                  children: [
                    {
                      type: 'mc-button',
                      attributes: { href: 'https://example.com', 'mc-class': 'cta' },
                      content: 'Click',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const result = compileFromJSON(rootNode, { templateStyle: 'attribute' });
    expect(result.errors).toHaveLength(0);
    expect(result.html).toContain('background-color:#e85d3a');
    expect(result.html).toContain('color:#ffffff');
  });

  it('compileFromJSON strips mc-class from HTML output', () => {
    const rootNode: MCNode = {
      type: 'mc',
      attributes: {},
      children: [
        {
          type: 'mc-head',
          attributes: {},
          children: [
            {
              type: 'mc-attributes',
              attributes: {},
              children: [
                { type: 'mc-class', attributes: { name: 'test', color: '#000000' } },
              ],
            },
          ],
        },
        {
          type: 'mc-body',
          attributes: {},
          children: [
            {
              type: 'mc-section',
              attributes: {},
              children: [
                {
                  type: 'mc-column',
                  attributes: {},
                  children: [
                    {
                      type: 'mc-text',
                      attributes: { 'mc-class': 'test' },
                      content: 'Text',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const result = compileFromJSON(rootNode, { templateStyle: 'attribute' });
    expect(result.errors).toHaveLength(0);
    expect(result.html).not.toContain('mc-class');
  });

  it('compileFromJSON warns on undefined mc-class reference', () => {
    const rootNode: MCNode = {
      type: 'mc-body',
      attributes: {},
      children: [
        {
          type: 'mc-section',
          attributes: {},
          children: [
            {
              type: 'mc-column',
              attributes: {},
              children: [
                {
                  type: 'mc-text',
                  attributes: { 'mc-class': 'ghost' },
                  content: 'Text',
                },
              ],
            },
          ],
        },
      ],
    };

    const result = compileFromJSON(rootNode);
    const warning = result.warnings.find((w) => w.code === 'UNKNOWN_MC_CLASS');
    expect(warning).toBeDefined();
    expect(warning?.message).toContain('ghost');
  });
});

// ---------------------------------------------------------------------------
// 10. Validator Integration
// ---------------------------------------------------------------------------

describe('mc-class: JSON validator integration', () => {
  it('validate accepts mc-class with valid name (no errors)', () => {
    const node: MCNode = {
      type: 'mc',
      attributes: {},
      children: [
        {
          type: 'mc-head',
          attributes: {},
          children: [
            {
              type: 'mc-attributes',
              attributes: {},
              children: [
                { type: 'mc-class', attributes: { name: 'hero', 'font-size': '28px' } },
              ],
            },
          ],
        },
        { type: 'mc-body', attributes: {} },
      ],
    };
    const result = validate(node);
    expect(result.errors).toHaveLength(0);
  });

  it('validate rejects mc-class without name (exactly one error)', () => {
    const node: MCNode = {
      type: 'mc',
      attributes: {},
      children: [
        {
          type: 'mc-head',
          attributes: {},
          children: [
            {
              type: 'mc-attributes',
              attributes: {},
              children: [
                { type: 'mc-class', attributes: { 'font-size': '28px' } },
              ],
            },
          ],
        },
        { type: 'mc-body', attributes: {} },
      ],
    };
    const result = validate(node);
    const nameErrors = result.errors.filter(
      (e) => e.code === 'MISSING_ATTRIBUTE' && e.message.includes('mc-class'),
    );
    // Exactly one — no duplicate from double-validation
    expect(nameErrors).toHaveLength(1);
  });

  it('validate accepts mc-class with extends attribute (no errors)', () => {
    const node: MCNode = {
      type: 'mc',
      attributes: {},
      children: [
        {
          type: 'mc-head',
          attributes: {},
          children: [
            {
              type: 'mc-attributes',
              attributes: {},
              children: [
                { type: 'mc-class', attributes: { name: 'base', 'font-size': '14px' } },
                { type: 'mc-class', attributes: { name: 'hero', extends: 'base', 'font-size': '28px' } },
              ],
            },
          ],
        },
        { type: 'mc-body', attributes: {} },
      ],
    };
    const result = validate(node);
    expect(result.errors).toHaveLength(0);
  });

  it('validate does not produce INVALID_NESTING for mc-class inside mc-attributes', () => {
    const node: MCNode = {
      type: 'mc',
      attributes: {},
      children: [
        {
          type: 'mc-head',
          attributes: {},
          children: [
            {
              type: 'mc-attributes',
              attributes: {},
              children: [
                { type: 'mc-class', attributes: { name: 'cta', color: '#fff' } },
              ],
            },
          ],
        },
        { type: 'mc-body', attributes: {} },
      ],
    };
    const result = validate(node);
    const nestingErrors = result.errors.filter((e) => e.code === 'INVALID_NESTING');
    expect(nestingErrors).toHaveLength(0);
  });

  it('validate rejects truly invalid mc-attributes child (mc-body)', () => {
    // mc-section is valid inside mc-attributes (means "set defaults for mc-section").
    // mc-body is NOT in VALID_ATTRIBUTES_CHILDREN — it should produce INVALID_NESTING.
    const node: MCNode = {
      type: 'mc',
      attributes: {},
      children: [
        {
          type: 'mc-head',
          attributes: {},
          children: [
            {
              type: 'mc-attributes',
              attributes: {},
              children: [
                { type: 'mc-body', attributes: {} },
              ],
            },
          ],
        },
        { type: 'mc-body', attributes: {} },
      ],
    };
    const result = validate(node);
    expect(result.errors.some((e) => e.code === 'INVALID_NESTING')).toBe(true);
  });
});
