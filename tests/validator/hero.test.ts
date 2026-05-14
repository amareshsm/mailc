/**
 * Tests for `mc-hero` validator rules.
 *
 * Covers: valid placements, invalid child types, and invalid nesting.
 */

import { describe, it, expect } from 'vitest';
import { tokenize } from '../../src/tokenizer/index.js';
import { parse } from '../../src/parser/index.js';
import { validate } from '../../src/validator/index.js';
import { ErrorCode } from '../../src/errors/codes.js';
import type { ValidationResult } from '../../src/types.js';

/** Helper: tokenize → parse → validate. */
function v(source: string): ValidationResult {
  return validate(parse(tokenize(source)));
}

// ===========================================================================
// Valid placements
// ===========================================================================

describe('validate mc-hero — valid placements', () => {
  it('accepts mc-hero directly inside mc-body', () => {
    const result = v(`
      <mc>
        <mc-body>
          <mc-hero background-color="#333"></mc-hero>
        </mc-body>
      </mc>
    `);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts mc-text child inside mc-hero', () => {
    const result = v(`
      <mc>
        <mc-body>
          <mc-hero background-color="#333">
            <mc-text>Hello</mc-text>
          </mc-hero>
        </mc-body>
      </mc>
    `);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts mc-button child inside mc-hero', () => {
    const result = v(`
      <mc>
        <mc-body>
          <mc-hero background-color="#333">
            <mc-button href="https://example.com">Click</mc-button>
          </mc-hero>
        </mc-body>
      </mc>
    `);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts mc-image child inside mc-hero', () => {
    const result = v(`
      <mc>
        <mc-body>
          <mc-hero background-color="#333">
            <mc-image src="https://example.com/logo.png" alt="Logo" />
          </mc-hero>
        </mc-body>
      </mc>
    `);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts mc-spacer child inside mc-hero', () => {
    const result = v(`
      <mc>
        <mc-body>
          <mc-hero background-color="#333">
            <mc-spacer height="20px" />
          </mc-hero>
        </mc-body>
      </mc>
    `);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts mc-divider child inside mc-hero', () => {
    const result = v(`
      <mc>
        <mc-body>
          <mc-hero background-color="#333">
            <mc-divider />
          </mc-hero>
        </mc-body>
      </mc>
    `);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts mc-if logic wrapper inside mc-hero', () => {
    const result = v(`
      <mc>
        <mc-body>
          <mc-hero background-color="#333">
            <mc-if condition="show">
              <mc-text>Hello</mc-text>
            </mc-if>
          </mc-hero>
        </mc-body>
      </mc>
    `);
    expect(result.errors).toHaveLength(0);
  });
});

// ===========================================================================
// Invalid children
// ===========================================================================

describe('validate mc-hero — invalid children', () => {
  it('rejects mc-section directly inside mc-hero', () => {
    const result = v(`
      <mc>
        <mc-body>
          <mc-hero background-color="#333">
            <mc-section>
              <mc-column><mc-text>Nested</mc-text></mc-column>
            </mc-section>
          </mc-hero>
        </mc-body>
      </mc>
    `);
    expect(result.errors.some((e) => e.code === ErrorCode.HERO_INVALID_CHILD)).toBe(true);
  });

  it('rejects mc-column directly inside mc-hero', () => {
    const result = v(`
      <mc>
        <mc-body>
          <mc-hero background-color="#333">
            <mc-column><mc-text>Nested</mc-text></mc-column>
          </mc-hero>
        </mc-body>
      </mc>
    `);
    expect(result.errors.some((e) => e.code === ErrorCode.HERO_INVALID_CHILD)).toBe(true);
  });
});

// ===========================================================================
// Invalid nesting of mc-hero itself
// ===========================================================================

describe('validate mc-hero — invalid nesting', () => {
  it('rejects mc-hero inside mc-section', () => {
    const result = v(`
      <mc>
        <mc-body>
          <mc-section>
            <mc-hero background-color="#333"></mc-hero>
          </mc-section>
        </mc-body>
      </mc>
    `);
    expect(result.isValid).toBe(false);
  });

  it('rejects mc-hero inside mc-column', () => {
    const result = v(`
      <mc>
        <mc-body>
          <mc-section>
            <mc-column>
              <mc-hero background-color="#333"></mc-hero>
            </mc-column>
          </mc-section>
        </mc-body>
      </mc>
    `);
    expect(result.isValid).toBe(false);
  });
});
