/**
 * Public `validate()` entry point — universal dispatcher.
 *
 * Accepts a markup string, JSON IR (MCNode), or AST, and dispatches to the
 * appropriate underlying walker:
 *
 *   - `string`   → tokenize + parse, then run the AST validator.
 *                  Parse errors are returned as structured `errors`, not thrown.
 *   - `ASTNode`  → AST validator (identified by the presence of `loc`).
 *   - `MCNode`   → JSON-IR validator (different walker — it does extra checks
 *                  the AST walker does not, e.g. `id` uniqueness).
 *
 * Anything else (number, null, MCDocument, etc.) returns a structured
 * `INVALID_INPUT` error rather than throwing — public APIs must never crash
 * the caller on a bad input type.
 *
 * @module validate
 */
import type { ASTNode, Plugin, ValidationResult } from './types.js';
import type { MCNode } from './json/schema.js';
import { tokenize } from './tokenizer/index.js';
import { parse } from './parser/index.js';
import { validate as validateAST } from './validator/index.js';
import { validateJSON as validateMCNode } from './json/validator.js';
import { MCError } from './errors/mc-error.js';
import { ErrorCode } from './errors/codes.js';

/** Accepted shapes for `validate()`. */
export type ValidateInput = string | ASTNode | MCNode;

/** Options accepted by the universal `validate()`. */
export interface ValidateOptions {
  /**
   * Per-call plugin set — same shape passed to `compile()`. When
   * supplied, plugin nodes are recognised as known AND their
   * metadata-derived rules (parent constraint, required attributes,
   * known attributes, mustFollow…) are enforced. Without this, plugin
   * types validate as `UNKNOWN_COMPONENT`.
   */
  plugins?: readonly Plugin[];
}

/**
 * Validates markup, JSON IR, or AST and returns all errors/warnings.
 *
 * Mirrors `compile()`'s input flexibility and per-call plugin awareness.
 *
 * @param input   - Markup string, JSON IR (`MCNode`), or parsed `ASTNode`.
 * @param options - Optional per-call plugin context.
 * @returns A `ValidationResult` with `isValid`, `errors`, and `warnings`.
 */
export function validate(
  input: ValidateInput,
  options?: ValidateOptions,
): ValidationResult {
  // ── (1) Markup string → tokenize + parse + AST walk ─────────────────
  if (typeof input === 'string') {
    try {
      const tokens = tokenize(input);
      const ast = parse(tokens);
      return validateAST(ast, options);
    } catch (e) {
      // Parse/tokenize errors arrive as MCError. Anything else is unexpected
      // (defensive — should not happen with valid string input). Either way,
      // surface as a structured validation error instead of throwing.
      if (e instanceof MCError) {
        return {
          isValid: false,
          errors: [{
            code: e.code,
            message: e.message,
            severity: 'error',
            ...(e.loc ? { loc: { line: e.loc.start.line, col: e.loc.start.col } } : {}),
            ...(e.fix ? { fix: e.fix } : {}),
          }],
          warnings: [],
        };
      }
      return {
        isValid: false,
        errors: [{
          code: ErrorCode.INVALID_INPUT,
          message: e instanceof Error ? e.message : String(e),
          severity: 'error',
        }],
        warnings: [],
      };
    }
  }

  // ── (2) Reject non-object inputs cleanly ─────────────────────────────
  if (input === null || typeof input !== 'object') {
    return {
      isValid: false,
      errors: [{
        code: ErrorCode.INVALID_INPUT,
        message:
          `validate() expects a markup string, JSON IR (MCNode), or ASTNode. Received: ${input === null ? 'null' : typeof input}.`,
        severity: 'error',
      }],
      warnings: [],
    };
  }

  // ── (3) Reject objects that lack `type` — likely an MCDocument or junk ─
  //        Catching this here keeps the JSON walker simple and gives users
  //        a clear pointer rather than a cryptic crash inside fuzzyMatch.
  const obj = input as { type?: unknown; template?: unknown };
  if (typeof obj.type !== 'string' || obj.type === '') {
    const looksLikeDocument =
      'template' in obj && typeof obj.template === 'object' && obj.template !== null;
    const hint = looksLikeDocument
      ? ' This looks like an MCDocument — use validateDocument(doc) instead.'
      : '';
    return {
      isValid: false,
      errors: [{
        code: ErrorCode.INVALID_INPUT,
        message: `validate() input is missing a "type" field.${hint}`,
        severity: 'error',
      }],
      warnings: [],
    };
  }

  // ── (4) Discriminate AST vs JSON IR by presence of `loc` ─────────────
  //        AST nodes always carry a SourceLocation; JSON IR nodes never do.
  if ('loc' in obj) {
    return validateAST(input as ASTNode, options);
  }
  return validateMCNode(input as MCNode, options);
}
