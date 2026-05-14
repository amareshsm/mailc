/**
 * @file tests/introspect/types.test.ts
 *
 * Compile-time shape verification for `src/introspect/types.ts`.
 *
 * Every `satisfies` expression is a TypeScript compile-time assertion:
 * if the shape in types.ts ever changes incompatibly, tsc will fail here
 * before any runtime test runs.
 *
 * A handful of runtime assertions double-check that imported types are
 * structurally sound when used with real values.
 *
 * Phase 1 of the Introspection API build plan.
 */
import { describe, it, expect } from 'vitest';
import type {
  AttributeSpec,
  AttributeValueType,
  CSSCategory,
  ClassEntry,
  CompilesToSpec,
  ComponentCategory,
  ComponentSpec,
  ExampleNode,
  ExampleSpec,
  FixAction,
  FixInstruction,
  IntrospectError,
  IntrospectValidationResult,
  NestingMatrix,
  NestingPath,
  RejectedClassEntry,
  ValidClassesResult,
} from '../../src/introspect/types.js';

// ---------------------------------------------------------------------------
// AttributeSpec
// ---------------------------------------------------------------------------

describe('AttributeSpec shape', () => {
  it('accepts a minimal required attribute', () => {
    const spec = {
      name: 'href',
      required: true,
      type: 'url' as AttributeValueType,
      description: 'Destination URL for the button link.',
      example: 'https://example.com',
      hasEmailCompatibilityNotes: false,
    } satisfies AttributeSpec;

    expect(spec.name).toBe('href');
    expect(spec.required).toBe(true);
    expect(spec.type).toBe('url');
  });

  it('accepts an optional enum attribute with values and default', () => {
    const spec = {
      name: 'align',
      required: false,
      type: 'enum' as AttributeValueType,
      values: ['left', 'center', 'right'],
      default: 'center',
      description: 'Horizontal alignment of the button.',
      example: 'align="center"',
      hasEmailCompatibilityNotes: false,
    } satisfies AttributeSpec;

    expect(spec.values).toEqual(['left', 'center', 'right']);
    expect(spec.default).toBe('center');
  });

  it('accepts all valid AttributeValueType literals', () => {
    const types: AttributeValueType[] = [
      'string',
      'url',
      'color',
      'number',
      'enum',
      'boolean',
      'css-value',
      'tailwind-classes',
    ];
    expect(types).toHaveLength(8);
  });
});

// ---------------------------------------------------------------------------
// CSSCategory
// ---------------------------------------------------------------------------

describe('CSSCategory shape', () => {
  it('accepts all valid CSS category literals', () => {
    const cats: CSSCategory[] = [
      'typography',
      'background',
      'border',
      'spacing',
      'sizing',
      'display',
      'layout',
      'effects',
    ];
    expect(cats).toHaveLength(8);
  });
});

// ---------------------------------------------------------------------------
// ComponentCategory
// ---------------------------------------------------------------------------

describe('ComponentCategory shape', () => {
  it('accepts all valid component category literals', () => {
    const cats: ComponentCategory[] = ['container', 'content', 'head', 'logic'];
    expect(cats).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// CompilesToSpec
// ---------------------------------------------------------------------------

describe('CompilesToSpec shape', () => {
  it('accepts a well-formed compilesTo spec', () => {
    const spec = {
      outputElements: ['table', 'tr', 'td', 'a'],
      reason: 'Table-based layout required for Outlook compatibility.',
      annotatedExample: {
        input: '<mc-button href="https://example.com">Click</mc-button>',
        output:
          '<table><tr><td><a href="https://example.com">Click</a></td></tr></table>',
      },
    } satisfies CompilesToSpec;

    expect(spec.outputElements).toContain('table');
    expect(spec.annotatedExample.input).toMatch(/mc-button/);
  });
});

// ---------------------------------------------------------------------------
// ExampleNode + ExampleSpec
// ---------------------------------------------------------------------------

describe('ExampleSpec shape', () => {
  it('accepts a leaf example node', () => {
    const node = {
      type: 'mc-button',
      attributes: { href: 'https://example.com', 'background-color': '#0066cc' },
      content: 'Get started',
    } satisfies ExampleNode;

    expect(node.type).toBe('mc-button');
    expect(node.content).toBe('Get started');
  });

  it('accepts a container example node with children', () => {
    const node = {
      type: 'mc-section',
      attributes: { 'background-color': '#f4f4f4' },
      children: [
        {
          type: 'mc-column',
          attributes: {},
          children: [
            {
              type: 'mc-text',
              attributes: {},
              content: 'Hello',
            },
          ],
        },
      ],
    } satisfies ExampleNode;

    expect(node.children).toHaveLength(1);
    expect(node.children?.[0]?.type).toBe('mc-column');
  });

  it('accepts a full ExampleSpec', () => {
    const spec = {
      node: {
        type: 'mc-divider',
        attributes: { 'border-color': '#cccccc' },
      },
      markup: '<mc-divider border-color="#cccccc" />',
    } satisfies ExampleSpec;

    expect(spec.markup).toMatch(/mc-divider/);
  });
});

// ---------------------------------------------------------------------------
// ComponentSpec
// ---------------------------------------------------------------------------

describe('ComponentSpec shape', () => {
  it('accepts a complete component spec object', () => {
    const attrHref: AttributeSpec = {
      name: 'href',
      required: true,
      type: 'url',
      description: 'Destination URL.',
      example: 'https://example.com',
      hasEmailCompatibilityNotes: false,
    };

    const spec = {
      type: 'mc-button',
      description: 'A CTA button that compiles to a table-based anchor.',
      category: 'content' as ComponentCategory,
      allowedParents: ['mc-column'],
      allowedChildren: [],
      allowsTextContent: true,
      acceptsClassAttribute: true,
      validClassCategories: ['background', 'typography', 'border'] as CSSCategory[],
      requiredAttributes: [attrHref],
      optionalAttributes: [],
      cssPropertyAttributes: [],
      compilesTo: {
        outputElements: ['table', 'tr', 'td', 'a'],
        reason: 'Outlook requires table-based buttons.',
        annotatedExample: {
          input: '<mc-button href="…">Buy</mc-button>',
          output: '<table>…<a href="…">Buy</a>…</table>',
        },
      },
      example: {
        node: { type: 'mc-button', attributes: { href: 'https://example.com' }, content: 'Buy now' },
        markup: '<mc-button href="https://example.com">Buy now</mc-button>',
      },
      commonMistakes: ['Forgetting href', 'Using <a> directly'],
    } satisfies ComponentSpec;

    expect(spec.type).toBe('mc-button');
    expect(spec.requiredAttributes).toHaveLength(1);
    expect(spec.requiredAttributes[0]?.name).toBe('href');
    expect(spec.validClassCategories).toContain('background');
  });
});

// ---------------------------------------------------------------------------
// NestingMatrix
// ---------------------------------------------------------------------------

describe('NestingMatrix shape', () => {
  it('accepts a nesting matrix with bidirectional maps and required paths', () => {
    const path: NestingPath = {
      target: 'mc-column',
      path: ['mc-body', 'mc-section', 'mc-column'],
      description: 'mc-column must be inside mc-section, which must be inside mc-body.',
    };

    const matrix = {
      parentToChildren: {
        'mc-body': ['mc-section'],
        'mc-section': ['mc-column'],
        'mc-column': ['mc-text', 'mc-button', 'mc-image'],
      },
      childToParents: {
        'mc-section': ['mc-body'],
        'mc-column': ['mc-section'],
        'mc-text': ['mc-column'],
      },
      requiredPaths: [path],
    } satisfies NestingMatrix;

    expect(matrix.parentToChildren['mc-section']).toContain('mc-column');
    expect(matrix.requiredPaths).toHaveLength(1);
    expect(matrix.requiredPaths[0]?.path).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// ValidClassesResult
// ---------------------------------------------------------------------------

describe('ValidClassesResult shape', () => {
  it('accepts a result with safe, enhance and rejected entries', () => {
    const safe: ClassEntry = {
      className: 'text-blue-600',
      resolvedTo: [{ property: 'color', value: '#2563eb' }],
      classification: 'SAFE',
      description: 'Sets text color to blue-600.',
    };

    const rejected: RejectedClassEntry = {
      pattern: 'rem-*',
      reason: 'rem units are not supported in email clients.',
      alternative: 'Use px-based classes instead.',
    };

    const result = {
      safe: [safe],
      enhance: [],
      rejected: [rejected],
    } satisfies ValidClassesResult;

    expect(result.safe).toHaveLength(1);
    expect(result.safe[0]?.className).toBe('text-blue-600');
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]?.pattern).toBe('rem-*');
  });
});

// ---------------------------------------------------------------------------
// IntrospectValidationResult
// ---------------------------------------------------------------------------

describe('IntrospectValidationResult shape', () => {
  it('accepts a valid result with no errors', () => {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
    } satisfies IntrospectValidationResult;

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts a result with a structured error and fix instruction', () => {
    const fix: FixInstruction = {
      action: 'wrap-in' as FixAction,
      description: 'Wrap mc-column in an mc-section.',
      confidence: 'high',
      wrapWith: 'mc-section',
    };

    const error: IntrospectError = {
      code: 'INVALID_NESTING',
      message: '<mc-column> cannot be a direct child of <mc-body>.',
      fix,
    };

    const result = {
      valid: false,
      errors: [error],
      warnings: [],
    } satisfies IntrospectValidationResult;

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.fix.action).toBe('wrap-in');
    expect(result.errors[0]?.fix.wrapWith).toBe('mc-section');
  });

  it('accepts all valid FixAction literals', () => {
    const actions: FixAction[] = [
      'wrap-in',
      'move-to',
      'add-attribute',
      'remove-attribute',
      'replace-value',
      'remove-class',
    ];
    expect(actions).toHaveLength(6);
  });
});
