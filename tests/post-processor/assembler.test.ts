/**
 * Assembler tests — verifies responsive media query injection.
 * Note: ENHANCE properties are now inlined directly (liberal mode) or stripped (strict mode),
 * so the assembler only injects responsive media query blocks — no more ENHANCE style blocks.
 */
import { describe, it, expect } from 'vitest';
import { assemble } from '../../src/post-processor/assembler.js';
import type { CompileContext } from '../../src/types.js';
import { DEFAULT_CONFIG } from '../../src/config.js';
import { resolveTheme } from '../../src/css/theme-resolver.js';

/** Creates a minimal CompileContext for assembler tests. */
function makeAssemblerContext(
  overrides: Partial<CompileContext> = {},
): CompileContext {
  return {
    config: DEFAULT_CONFIG,
    theme: resolveTheme(),
    warnings: [],
    parentWidth: 600,
    responsiveClasses: [],
    counters: {
      componentCount: 0,
      cssPropertiesInlined: 0,
      cssPropertiesStripped: 0,
    },
    attributeDefaults: new Map(),
    inlineStyleRules: [],
    ...overrides,
  };
}

const MINIMAL_HTML =
  '<!DOCTYPE html><html><head><style>body{margin:0;}</style></head><body>Hello</body></html>';

describe('assemble', () => {
  it('returns html unchanged when no responsive classes', () => {
    const ctx = makeAssemblerContext();
    const result = assemble(MINIMAL_HTML, ctx);
    expect(result).toBe(MINIMAL_HTML);
  });

  it('injects responsive media block from sm: classes', () => {
    const ctx = makeAssemblerContext({
      responsiveClasses: ['sm:text-base', 'sm:px-4'],
    });
    const result = assemble(MINIMAL_HTML, ctx);
    expect(result).toContain('@media only screen and (max-width: 480px)');
    expect(result).toContain('</style></head>');
  });

  it('deduplicates responsive classes', () => {
    const ctx = makeAssemblerContext({
      responsiveClasses: ['sm:text-base', 'sm:text-base', 'sm:px-4'],
    });
    const result = assemble(MINIMAL_HTML, ctx);
    const matches = result.match(/sm-text-base/g);
    expect(matches?.length).toBe(1);
  });

  it('handles html without </head> gracefully (responsive)', () => {
    const noHead = '<html><body>Hello</body></html>';
    const ctx = makeAssemblerContext({
      responsiveClasses: ['sm:text-base'],
    });
    const result = assemble(noHead, ctx);
    expect(result).toContain('@media only screen');
  });

  it('collects responsive processing warnings', () => {
    const ctx = makeAssemblerContext({
      responsiveClasses: ['sm:unknown-class-xyz'],
    });
    assemble(MINIMAL_HTML, ctx);
    expect(ctx.warnings.length).toBeGreaterThan(0);
  });
});
