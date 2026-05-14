/**
 * Tests for `validateDataAgainstSchema` and the `validateDocument`
 * sampleData↔dataSchema check.
 */
import { describe, it, expect } from 'vitest';
import {
  validateDataAgainstSchema,
  validateDocument,
} from '../../src/json/validator.js';
import type { MCDataSchema, MCDocument } from '../../src/json/schema.js';

// ---------------------------------------------------------------------------
// validateDataAgainstSchema — direct
// ---------------------------------------------------------------------------

describe('validateDataAgainstSchema', () => {
  it('returns no issues when data matches a flat schema', () => {
    const schema: MCDataSchema = {
      name: { type: 'string' },
      age: { type: 'number' },
      active: { type: 'boolean' },
    };
    const data = { name: 'Ada', age: 36, active: true };
    expect(validateDataAgainstSchema(data, schema)).toEqual([]);
  });

  it('flags missing required fields', () => {
    const schema: MCDataSchema = {
      name: { type: 'string' },
      email: { type: 'string' },
    };
    const issues = validateDataAgainstSchema({ name: 'Ada' }, schema);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.message).toContain('email');
    expect(issues[0]!.message).toContain('required');
  });

  it('allows missing optional fields', () => {
    const schema: MCDataSchema = {
      name: { type: 'string' },
      bio: { type: 'string', optional: true },
    };
    expect(validateDataAgainstSchema({ name: 'Ada' }, schema)).toEqual([]);
  });

  it('flags type mismatches', () => {
    const schema: MCDataSchema = {
      age: { type: 'number' },
    };
    const issues = validateDataAgainstSchema({ age: '36' }, schema);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.message).toContain('expected number');
    expect(issues[0]!.message).toContain('got string');
  });

  it('walks into nested object schemas', () => {
    const schema: MCDataSchema = {
      user: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
        },
      },
    };
    const issues = validateDataAgainstSchema(
      { user: { name: 'Ada' } }, // missing email
      schema,
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]!.message).toContain('user.email');
  });

  it('walks into array item schemas', () => {
    const schema: MCDataSchema = {
      items: {
        type: 'array',
        itemSchema: {
          name: { type: 'string' },
          price: { type: 'number' },
        },
      },
    };
    const issues = validateDataAgainstSchema(
      {
        items: [
          { name: 'A', price: 10 },
          { name: 'B', price: 'twenty' }, // wrong type
        ],
      },
      schema,
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]!.message).toContain('items[1].price');
    expect(issues[0]!.message).toContain('expected number');
  });

  it('flags non-object inputs as a type mismatch', () => {
    const schema: MCDataSchema = { name: { type: 'string' } };
    const issues = validateDataAgainstSchema('not an object', schema);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.message).toContain('plain object');
  });

  it('flags expected-array but got object', () => {
    const schema: MCDataSchema = {
      items: { type: 'array', itemSchema: { name: { type: 'string' } } },
    };
    const issues = validateDataAgainstSchema(
      { items: { name: 'A' } },
      schema,
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]!.message).toContain('expected array');
  });

  it('treats null as missing for optional fields', () => {
    const schema: MCDataSchema = {
      bio: { type: 'string', optional: true },
    };
    expect(validateDataAgainstSchema({ bio: null }, schema)).toEqual([]);
  });

  it('treats null as missing-required for required fields', () => {
    const schema: MCDataSchema = {
      name: { type: 'string' },
    };
    const issues = validateDataAgainstSchema({ name: null }, schema);
    expect(issues).toHaveLength(1);
    expect(issues[0]!.message).toContain('required');
  });
});

// ---------------------------------------------------------------------------
// validateDocument — sampleData / dataSchema integration
// ---------------------------------------------------------------------------

describe('validateDocument — sampleData against dataSchema', () => {
  function makeDoc(
    dataSchema: MCDataSchema | undefined,
    sampleData: Record<string, unknown> | undefined,
  ): MCDocument {
    return {
      version: '1.0',
      metadata: {
        id: 'tmpl-1',
        name: 'Test',
        created: '2026-01-01',
        updated: '2026-01-01',
      },
      ...(dataSchema ? { dataSchema } : {}),
      ...(sampleData ? { sampleData } : {}),
      template: {
        type: 'mc',
        attributes: {},
        children: [
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
                      { type: 'mc-text', attributes: {}, content: 'Hi' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    };
  }

  it('passes when sampleData matches dataSchema', () => {
    const doc = makeDoc(
      { name: { type: 'string' } },
      { name: 'Ada' },
    );
    const result = validateDocument(doc);
    expect(result.warnings.filter((w) => w.message.includes('sampleData'))).toEqual([]);
  });

  it('warns (not errors) when sampleData is missing a required field', () => {
    const doc = makeDoc(
      { name: { type: 'string' }, email: { type: 'string' } },
      { name: 'Ada' },
    );
    const result = validateDocument(doc);
    const sampleWarnings = result.warnings.filter((w) =>
      w.message.includes('sampleData'),
    );
    expect(sampleWarnings.length).toBeGreaterThan(0);
    // Sample data mismatches are warnings, not errors — sample data is a
    // developer affordance, not a runtime contract.
    expect(result.isValid).toBe(true);
  });

  it('skips schema check when only sampleData is present (no schema)', () => {
    const doc = makeDoc(undefined, { foo: 'bar' });
    const result = validateDocument(doc);
    expect(result.warnings.filter((w) => w.message.includes('sampleData'))).toEqual([]);
  });

  it('skips schema check when only dataSchema is present (no sampleData)', () => {
    const doc = makeDoc({ name: { type: 'string' } }, undefined);
    const result = validateDocument(doc);
    expect(result.warnings.filter((w) => w.message.includes('sampleData'))).toEqual([]);
  });
});
