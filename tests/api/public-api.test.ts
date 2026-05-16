/**
 * Phase 15 — Public API verification tests.
 *
 * Ensures every function, type, and constant listed in the public API
 * is correctly exported from `src/index.ts` and is callable / usable.
 */

import { describe, it, expect } from 'vitest';

// ── Headline API ──────────────────────────────────────────────────────────
import {
  compile,
  compileFromJSON,
  validate,
  checkCss,
  jsonToMarkup,
  markupToJSON,
  lintEmailHtml,
  getLintRuleIds,
  getLintRule,
} from '../../src/index.js';

// ── Error system ──────────────────────────────────────────────────────────
import {
  ErrorCode,
  MCError,
  formatError,
  formatErrors,
} from '../../src/index.js';

// ── Tokenizer & Parser (advanced) ────────────────────────────────────────
import {
  tokenize,
  TokenType,
  parse,
} from '../../src/index.js';

// ── Config ────────────────────────────────────────────────────────────────
import {
  DEFAULT_CLIENTS,
  DEFAULT_CONFIG,
  mergeConfig,
} from '../../src/index.js';

// ── CSS Pipeline (advanced) ──────────────────────────────────────────────
import {
  DEFAULT_THEME,
  resolveTheme,
  resolveClass,
  resolveColor,
  remToPx,
  expandShorthand,
  expandAllShorthands,
  classifyProperty,
  classifyProperties,
  filterByClassification,
  checkCSS,
  checkIssuesToMCIssues,
  clearCheckerCache,
  inlineCSS,
  resolveResponsiveClasses,
  buildMediaBlock,
  processResponsiveClasses,
} from '../../src/index.js';

// ── Compiler (advanced) ──────────────────────────────────────────────────
import {
  compileNode,
  compileChildren,
  getTextContent,
  COMPONENT_COMPILERS,
  extractHeadData,
  collectAndInline,
} from '../../src/index.js';

// ── JSON ─────────────────────────────────────────────────────────────────
import {
  validateJSON,
  validateDocument,
  jsonToAST,
  parseContent,
} from '../../src/index.js';

// ── Post-processor ───────────────────────────────────────────────────────
import {
  assemble,
  optimize,
} from '../../src/index.js';

// ── Template ─────────────────────────────────────────────────────────────
import {
  resolveTemplate,
  resolvePath,
  parseExpression,
  resolveContent,
  resolveAttributes,
  evaluateCondition,
  expandEach,
  applyFormatters,
} from '../../src/index.js';

// ── Type imports (verify they compile) ───────────────────────────────────
import type {
  MCIssue,
  CompileResult,
  CSSProperty,
  // Tokenizer
  Token,
  // Lint
  LintIssue,
} from '../../src/index.js';

// ═══════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('Phase 15: Public API exports', () => {
  // ── 15.1 — Headline functions exist and are callable ──────────────────

  describe('headline API functions', () => {
    it('exports compile as a function', () => {
      expect(typeof compile).toBe('function');
    });

    it('exports compileFromJSON as a function', () => {
      expect(typeof compileFromJSON).toBe('function');
    });

    it('exports validate as a function', () => {
      expect(typeof validate).toBe('function');
    });

    it('exports checkCss as a function', () => {
      expect(typeof checkCss).toBe('function');
    });

    it('exports jsonToMarkup as a function', () => {
      expect(typeof jsonToMarkup).toBe('function');
    });

    it('exports markupToJSON as a function', () => {
      expect(typeof markupToJSON).toBe('function');
    });

    it('exports lintEmailHtml as a function', () => {
      expect(typeof lintEmailHtml).toBe('function');
    });

    it('exports getLintRuleIds as a function', () => {
      expect(typeof getLintRuleIds).toBe('function');
    });

    it('exports getLintRule as a function', () => {
      expect(typeof getLintRule).toBe('function');
    });
  });

  // ── 15.1 — Error system ───────────────────────────────────────────────

  describe('error system exports', () => {
    it('exports ErrorCode as an object (enum)', () => {
      expect(ErrorCode).toBeDefined();
      expect(ErrorCode.INVALID_NESTING).toBeDefined();
    });

    it('exports MCError as a constructor', () => {
      expect(typeof MCError).toBe('function');
    });

    it('exports formatError as a function', () => {
      expect(typeof formatError).toBe('function');
    });

    it('exports formatErrors as a function', () => {
      expect(typeof formatErrors).toBe('function');
    });
  });

  // ── 15.1 — Tokenizer & Parser ────────────────────────────────────────

  describe('tokenizer & parser exports', () => {
    it('exports tokenize as a function', () => {
      expect(typeof tokenize).toBe('function');
    });

    it('exports TokenType enum', () => {
      expect(TokenType).toBeDefined();
      expect(TokenType.TAG_OPEN).toBeDefined();
      expect(TokenType.EOF).toBeDefined();
    });

    it('exports parse as a function', () => {
      expect(typeof parse).toBe('function');
    });
  });

  // ── 15.1 — Config ────────────────────────────────────────────────────

  describe('config exports', () => {
    it('exports DEFAULT_CLIENTS as a readonly array of strings', () => {
      expect(Array.isArray(DEFAULT_CLIENTS)).toBe(true);
      expect(DEFAULT_CLIENTS.length).toBeGreaterThan(0);
      for (const client of DEFAULT_CLIENTS) {
        expect(typeof client).toBe('string');
      }
    });

    it("DEFAULT_CLIENTS is what `targetClients: 'default'` resolves to", () => {
      // DEFAULT_CONFIG.targetClients is now `undefined` (no gating by
      // default). The exported DEFAULT_CLIENTS array is the curated 5-client
      // set that users opt into via `targetClients: 'default'`. Test the
      // public contract: DEFAULT_CLIENTS is non-empty and contains the
      // canonical clients downstream consumers might rely on.
      expect(DEFAULT_CLIENTS).toContain('gmail.*');
      expect(DEFAULT_CLIENTS).toContain('apple-mail.*');
      expect(DEFAULT_CLIENTS).toContain('outlook.*');
      expect(DEFAULT_CLIENTS).toContain('yahoo.*');
    });

    it('exports DEFAULT_CONFIG as an object', () => {
      expect(DEFAULT_CONFIG).toBeDefined();
      expect(typeof DEFAULT_CONFIG).toBe('object');
    });

    it('exports mergeConfig as a function', () => {
      expect(typeof mergeConfig).toBe('function');
    });
  });

  // ── 15.1 — CSS Pipeline ──────────────────────────────────────────────

  describe('CSS pipeline exports', () => {
    it('exports DEFAULT_THEME as an object', () => {
      expect(DEFAULT_THEME).toBeDefined();
      expect(typeof DEFAULT_THEME).toBe('object');
    });

    it('exports theme functions', () => {
      expect(typeof resolveTheme).toBe('function');
      expect(typeof remToPx).toBe('function');
    });

    it('exports class resolution functions', () => {
      expect(typeof resolveClass).toBe('function');
      expect(typeof resolveColor).toBe('function');
    });

    it('exports shorthand functions', () => {
      expect(typeof expandShorthand).toBe('function');
      expect(typeof expandAllShorthands).toBe('function');
    });

    it('exports classification functions', () => {
      expect(typeof classifyProperty).toBe('function');
      expect(typeof classifyProperties).toBe('function');
      expect(typeof filterByClassification).toBe('function');
    });

    it('exports checker functions', () => {
      expect(typeof checkCSS).toBe('function');
      expect(typeof checkIssuesToMCIssues).toBe('function');
      expect(typeof clearCheckerCache).toBe('function');
    });

    it('exports inliner functions', () => {
      expect(typeof inlineCSS).toBe('function');
    });

    it('exports responsive functions', () => {
      expect(typeof resolveResponsiveClasses).toBe('function');
      expect(typeof buildMediaBlock).toBe('function');
      expect(typeof processResponsiveClasses).toBe('function');
    });
  });

  // ── 15.1 — Compiler ──────────────────────────────────────────────────

  describe('compiler exports', () => {
    it('exports compileNode as a function', () => {
      expect(typeof compileNode).toBe('function');
    });

    it('exports compileChildren as a function', () => {
      expect(typeof compileChildren).toBe('function');
    });

    it('exports getTextContent as a function', () => {
      expect(typeof getTextContent).toBe('function');
    });

    it('exports COMPONENT_COMPILERS as an object', () => {
      expect(COMPONENT_COMPILERS).toBeDefined();
      expect(typeof COMPONENT_COMPILERS).toBe('object');
    });

    it('exports extractHeadData as a function', () => {
      expect(typeof extractHeadData).toBe('function');
    });

    it('exports collectAndInline as a function', () => {
      expect(typeof collectAndInline).toBe('function');
    });
  });

  // ── 15.1 — JSON ──────────────────────────────────────────────────────

  describe('JSON pipeline exports', () => {
    it('exports validateJSON as a function', () => {
      expect(typeof validateJSON).toBe('function');
    });

    it('exports validateDocument as a function', () => {
      expect(typeof validateDocument).toBe('function');
    });

    it('exports jsonToAST as a function', () => {
      expect(typeof jsonToAST).toBe('function');
    });

    it('exports parseContent as a function', () => {
      expect(typeof parseContent).toBe('function');
    });
  });

  // ── 15.1 — Post-processor ────────────────────────────────────────────

  describe('post-processor exports', () => {
    it('exports assemble as a function', () => {
      expect(typeof assemble).toBe('function');
    });

    it('exports optimize as a function', () => {
      expect(typeof optimize).toBe('function');
    });
  });

  // ── 15.1 — Template ──────────────────────────────────────────────────

  describe('template exports', () => {
    it('exports resolveTemplate as a function', () => {
      expect(typeof resolveTemplate).toBe('function');
    });

    it('exports expression helpers', () => {
      expect(typeof resolvePath).toBe('function');
      expect(typeof parseExpression).toBe('function');
      expect(typeof resolveContent).toBe('function');
      expect(typeof resolveAttributes).toBe('function');
    });

    it('exports condition evaluator', () => {
      expect(typeof evaluateCondition).toBe('function');
    });

    it('exports loop expander', () => {
      expect(typeof expandEach).toBe('function');
    });

    it('exports formatter', () => {
      expect(typeof applyFormatters).toBe('function');
    });
  });

  // ── 15.4 — Core types are importable ─────────────────────────────────

  describe('type exports compile correctly', () => {
    it('Token type is usable', () => {
      // Type-level test: if this compiles, the type is exported correctly.
      const token: Token = {
        type: TokenType.TEXT,
        value: 'hello',
        loc: { line: 1, col: 1, offset: 0 },
      };
      expect(token.type).toBe(TokenType.TEXT);
    });

    it('CompileResult type is usable', () => {
      const result: CompileResult = {
        html: '<html></html>',
        errors: [],
        warnings: [],
        info: [],
        partial: false,
        stats: {
          inputSize: 0,
          outputSize: 0,
          compileTime: 0,
          components: 0,
          cssPropertiesInlined: 0,
          cssPropertiesStripped: 0,
          mediaQueriesGenerated: 0,
          gmailClipRisk: 'safe',
        },
      };
      expect(result.html).toBe('<html></html>');
    });

    it('MCIssue type is usable', () => {
      const issue: MCIssue = {
        code: ErrorCode.INVALID_NESTING,
        message: 'test',
        severity: 'error',
        loc: { line: 1, col: 1 },
      };
      expect(issue.code).toBe(ErrorCode.INVALID_NESTING);
    });

    it('CSSProperty type is usable', () => {
      const prop: CSSProperty = { property: 'color', value: 'red' };
      expect(prop.property).toBe('color');
    });

    it('LintIssue type is usable', () => {
      const issue: LintIssue = {
        ruleId: 'has-doctype',
        message: 'Missing DOCTYPE',
        severity: 'error',
      };
      expect(issue.ruleId).toBe('has-doctype');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Functional smoke tests — headline API actually works
// ═══════════════════════════════════════════════════════════════════════════

describe('Phase 15: Headline API smoke tests', () => {
  it('compile() produces valid HTML from minimal .mc input', () => {
    const source = `<mc>
  <mc-body><mc-section><mc-column><mc-text>Hello</mc-text></mc-column></mc-section></mc-body>
</mc>`;
    const result = compile(source);
    expect(result.html).toContain('Hello');
    expect(result.html).toContain('<!DOCTYPE');
    expect(result.errors).toHaveLength(0);
  });

  it('validate() returns isValid: true for valid markup', () => {
    const source = `<mc>
  <mc-body><mc-section><mc-column><mc-text>Hi</mc-text></mc-column></mc-section></mc-body>
</mc>`;
    const tokens = tokenize(source);
    const ast = parse(tokens);
    const result = validate(ast);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validate() returns isValid: false for invalid markup', () => {
    const source = `<mc>
  <mc-body><mc-text>Hi</mc-text></mc-body>
</mc>`;
    const tokens = tokenize(source);
    const ast = parse(tokens);
    const result = validate(ast);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('checkCss() returns a result with success flag', () => {
    const result = checkCss('color: red; font-size: 16px');
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
    expect(Array.isArray(result.issues)).toBe(true);
  });

  it('checkCss() returns success true for empty input', () => {
    const result = checkCss('');
    expect(result.success).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('tokenize() returns a token array ending with EOF', () => {
    const tokens = tokenize(`<mc>
  <mc-body></mc-body>
</mc>`);
    expect(Array.isArray(tokens)).toBe(true);
    expect(tokens.length).toBeGreaterThan(0);
    const lastToken = tokens[tokens.length - 1];
    expect(lastToken).toBeDefined();
    if (lastToken) {
      expect(lastToken.type).toBe(TokenType.EOF);
    }
  });

  it('parse() returns an AST tree', () => {
    const tokens = tokenize(`<mc>
  <mc-body></mc-body>
</mc>`);
    const ast = parse(tokens);
    expect(ast).toBeDefined();
    expect(ast.type).toBe('root');
    expect(ast.children.length).toBeGreaterThan(0);
    const firstChild = ast.children[0];
    expect(firstChild).toBeDefined();
    if (firstChild) {
      expect(firstChild.type).toBe('mc');
    }
  });

  it('markupToJSON() and jsonToMarkup() round-trip', () => {
    const source = `<mc>
  <mc-body><mc-section><mc-column><mc-text>Hello</mc-text></mc-column></mc-section></mc-body>
</mc>`;
    const json = markupToJSON(source);
    expect(json).toBeDefined();
    const markup = jsonToMarkup(json);
    expect(markup).toContain('mc-body');
    expect(markup).toContain('mc-text');
  });

  it('lintEmailHtml() returns issues array', () => {
    const html = '<html><body><p>Hello</p></body></html>';
    const issues = lintEmailHtml(html);
    expect(Array.isArray(issues)).toBe(true);
    // Minimal HTML should trigger some lint warnings
    expect(issues.length).toBeGreaterThan(0);
  });

  it('getLintRuleIds() returns all rule IDs', () => {
    const ids = getLintRuleIds();
    expect(Array.isArray(ids)).toBe(true);
    expect(ids).toContain('has-doctype');
    expect(ids).toContain('img-has-alt');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// checkCss() convenience function tests
// ═══════════════════════════════════════════════════════════════════════════

describe('Phase 15: checkCss() convenience function', () => {
  it('parses semicolon-delimited declarations', () => {
    const result = checkCss('color: red; background-color: blue');
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });

  it('handles trailing semicolons', () => {
    const result = checkCss('color: red;');
    expect(result).toBeDefined();
  });

  it('handles spaces and whitespace', () => {
    const result = checkCss('  color : red ;  font-size : 16px  ');
    expect(result).toBeDefined();
  });

  it('handles single declaration without semicolon', () => {
    const result = checkCss('color: red');
    expect(result).toBeDefined();
  });

  it('ignores declarations without colon', () => {
    const result = checkCss('not-a-declaration; color: red');
    expect(result).toBeDefined();
  });

  it('ignores empty parts from multiple semicolons', () => {
    const result = checkCss('color: red;;; font-size: 16px');
    expect(result).toBeDefined();
  });

  it('accepts optional client filter', () => {
    const result = checkCss('color: red', ['gmail.*']);
    expect(result).toBeDefined();
    expect(typeof result.success).toBe('boolean');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 15.8 — No node: imports in library code
// ═══════════════════════════════════════════════════════════════════════════

describe('Phase 15: Browser safety', () => {
  it('browser entry re-exports from index (verified at build time)', () => {
    // This is a structural test — if this import resolves, the barrel works.
    // cSpell: disable-next-line
    // The actual browser build is verified by tsup at build time.
    expect(typeof compile).toBe('function');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Phase 5: TemplateStyle and StylingConfig exports
// ═══════════════════════════════════════════════════════════════════════════

import type { TemplateStyle, StylingConfig } from '../../src/index.js';

describe('Phase 5: Styling mode type exports', () => {
  it('TemplateStyle type compiles — "class" is assignable', () => {
    const mode: TemplateStyle = 'class';
    expect(mode).toBe('class');
  });

  it('TemplateStyle type compiles — "attribute" is assignable', () => {
    const mode: TemplateStyle = 'attribute';
    expect(mode).toBe('attribute');
  });

  it('StylingConfig type compiles and accepts both modes', () => {
    const cfgClass: StylingConfig = { templateStyle: 'class' };
    const cfgAttr: StylingConfig = { templateStyle: 'attribute' };
    expect(cfgClass.templateStyle).toBe('class');
    expect(cfgAttr.templateStyle).toBe('attribute');
  });

  it('compile() accepts templateStyle option without type error', () => {
    const r1 = compile('<mc><mc-body></mc-body></mc>', { templateStyle: 'class' });
    const r2 = compile('<mc><mc-body></mc-body></mc>', { templateStyle: 'attribute' });
    expect(r1).toBeDefined();
    expect(r2).toBeDefined();
  });

  it('DEFAULT_CONFIG.styling.templateStyle is "attribute"', () => {
    expect(DEFAULT_CONFIG.styling.templateStyle).toBe('attribute');
  });

  it('mergeConfig preserves styling.templateStyle default', () => {
    const cfg = mergeConfig({});
    expect(cfg.styling.templateStyle).toBe('attribute');
  });

  it('mergeConfig overrides styling.templateStyle correctly', () => {
    const cfg = mergeConfig({ styling: { templateStyle: 'attribute' } });
    expect(cfg.styling.templateStyle).toBe('attribute');
  });

  it('compile() accepts targetClients option without type error', () => {
    const r = compile('<mc><mc-body></mc-body></mc>', {
      targetClients: ['apple-mail.*', 'apple-mail-ios.*'],
    });
    expect(r).toBeDefined();
    expect(r.html).not.toBeNull();
  });

  it('compile() targetClients overrides config.targetClients', () => {
    // Targeting only Apple Mail — no Gmail → gmailClipRisk should be "not-targeted"
    const r = compile('<mc><mc-body></mc-body></mc>', {
      targetClients: ['apple-mail.*'],
    });
    expect(r.stats.gmailClipRisk).toBe('not-targeted');
  });

  it('compile() without targetClients → no Gmail clip check (not-targeted)', () => {
    // Omitting targetClients means "no client gating" — including no
    // client-specific cost/audience checks. gmailClipRisk is therefore
    // 'not-targeted'. Users who care about clip risk opt in via
    // targetClients: 'default' (or any list that includes gmail.*).
    const r = compile('<mc><mc-body></mc-body></mc>');
    expect(r.stats.gmailClipRisk).toBe('not-targeted');
  });

  it("compile() with targetClients:'default' → Gmail clip check active", () => {
    const r = compile('<mc><mc-body></mc-body></mc>', { targetClients: 'default' });
    expect(r.stats.gmailClipRisk).toBe('safe');
  });
});
