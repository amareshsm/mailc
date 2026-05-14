/**
 * Conditional evaluation for template resolution.
 *
 * Evaluates `mc-if` / `mc-else-if` conditions using a safe recursive-descent
 * parser. Supports comparison operators, logical operators, and parentheses.
 * No `eval()`, no `Function()`, no dynamic code execution.
 *
 * Grammar:
 * ```
 * expr       → or
 * or         → and ( '||' and )*
 * and        → not ( '&&' not )*
 * not        → '!' not | comparison
 * comparison → atom ( op atom )?
 * op         → '===' | '!==' | '==' | '!=' | '>=' | '<=' | '>' | '<'
 * atom       → '(' expr ')' | string | number | keyword | path
 * keyword    → 'true' | 'false' | 'null' | 'undefined'
 * path       → identifier ( '.' identifier )*
 * ```
 *
 * @module template/conditions
 */

import type { TemplateData } from './types.js';
import { resolvePath } from './expressions.js';

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

type OperatorTokenType =
  | '==' | '!=' | '===' | '!==' | '>' | '<' | '>=' | '<='
  | '&&' | '||' | '!' | '(' | ')' | 'eof';

type Token =
  | { type: 'string';    value: string }
  | { type: 'number';    value: number }
  | { type: 'boolean';   value: boolean }
  | { type: 'null';      value: null }
  | { type: 'undefined'; value: undefined }
  | { type: 'path';      value: string }
  | { type: OperatorTokenType; value: string | undefined };

const EOF_TOKEN: Token = { type: 'eof', value: undefined };

function tokenizeCondition(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = input.length;

  while (i < len) {
    const ch = input.charAt(i);

    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++;
      continue;
    }

    // String literals
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let str = '';
      i++;
      while (i < len && input.charAt(i) !== quote) {
        if (input.charAt(i) === '\\' && i + 1 < len) i++;
        str += input.charAt(i++);
      }
      i++; // closing quote
      tokens.push({ type: 'string', value: str });
      continue;
    }

    // Number literals (including negative: -10, -3.14)
    const nextCh = input.charAt(i + 1);
    if (
      ch >= '0' && ch <= '9' ||
      (ch === '-' && nextCh !== '' && nextCh >= '0' && nextCh <= '9' &&
        (tokens.length === 0 || ['==', '!=', '===', '!==', '>', '<', '>=', '<=', '&&', '||', '('].includes(String(tokens[tokens.length - 1]?.value))))
    ) {
      let num = '';
      if (ch === '-') num += input.charAt(i++);
      while (i < len) {
        const c = input.charAt(i);
        if ((c >= '0' && c <= '9') || c === '.') {
          num += c;
          i++;
        } else {
          break;
        }
      }
      tokens.push({ type: 'number', value: Number(num) });
      continue;
    }

    // 3-char operators must come before 2-char
    if (i + 2 < len) {
      const three = input.slice(i, i + 3);
      if (three === '===') { tokens.push({ type: '===', value: '===' }); i += 3; continue; }
      if (three === '!==') { tokens.push({ type: '!==', value: '!==' }); i += 3; continue; }
    }

    // 2-char operators
    if (i + 1 < len) {
      const two = input.slice(i, i + 2);
      if (two === '==') { tokens.push({ type: '==', value: '==' }); i += 2; continue; }
      if (two === '!=') { tokens.push({ type: '!=', value: '!=' }); i += 2; continue; }
      if (two === '>=') { tokens.push({ type: '>=', value: '>=' }); i += 2; continue; }
      if (two === '<=') { tokens.push({ type: '<=', value: '<=' }); i += 2; continue; }
      if (two === '&&') { tokens.push({ type: '&&', value: '&&' }); i += 2; continue; }
      if (two === '||') { tokens.push({ type: '||', value: '||' }); i += 2; continue; }
    }

    // 1-char operators
    if (ch === '>') { tokens.push({ type: '>', value: '>' }); i++; continue; }
    if (ch === '<') { tokens.push({ type: '<', value: '<' }); i++; continue; }
    if (ch === '!') { tokens.push({ type: '!', value: '!' }); i++; continue; }
    if (ch === '(') { tokens.push({ type: '(', value: '(' }); i++; continue; }
    if (ch === ')') { tokens.push({ type: ')', value: ')' }); i++; continue; }

    // Identifiers, keywords, and dot-paths
    if (
      (ch >= 'a' && ch <= 'z') ||
      (ch >= 'A' && ch <= 'Z') ||
      ch === '_'
    ) {
      let word = '';
      while (i < len) {
        const c = input.charAt(i);
        if (
          (c >= 'a' && c <= 'z') ||
          (c >= 'A' && c <= 'Z') ||
          (c >= '0' && c <= '9') ||
          c === '_' ||
          c === '.'
        ) {
          word += c;
          i++;
        } else {
          break;
        }
      }

      if (word === 'true')  tokens.push({ type: 'boolean',   value: true });
      else if (word === 'false') tokens.push({ type: 'boolean', value: false });
      else if (word === 'null')  tokens.push({ type: 'null',    value: null });
      else if (word === 'undefined') tokens.push({ type: 'undefined', value: undefined });
      else tokens.push({ type: 'path', value: word });
      continue;
    }

    // Skip unrecognized character (e.g. stray punctuation)
    i++;
  }

  tokens.push(EOF_TOKEN);
  return tokens;
}

// ---------------------------------------------------------------------------
// Recursive-descent parser — evaluates while parsing (no separate AST)
// ---------------------------------------------------------------------------

class ConditionParser {
  private readonly tokens: Token[];
  private pos = 0;
  private readonly data: TemplateData;

  constructor(tokens: Token[], data: TemplateData) {
    this.tokens = tokens;
    this.data = data;
  }

  parse(): boolean {
    return this.parseOr();
  }

  private peek(): Token {
    return this.tokens[this.pos] ?? EOF_TOKEN;
  }

  private consume(): Token {
    const tok = this.tokens[this.pos] ?? EOF_TOKEN;
    this.pos++;
    return tok;
  }

  private parseOr(): boolean {
    let left = this.parseAnd();
    while (this.peek().type === '||') {
      this.consume();
      const right = this.parseAnd();
      left = left || right;
    }
    return left;
  }

  private parseAnd(): boolean {
    let left = this.parseNot();
    while (this.peek().type === '&&') {
      this.consume();
      const right = this.parseNot();
      left = left && right;
    }
    return left;
  }

  private parseNot(): boolean {
    if (this.peek().type === '!') {
      this.consume();
      return !this.parseNot();
    }
    return this.parseComparison();
  }

  private parseComparison(): boolean {
    const left = this.parseAtom();
    const opTok = this.peek();

    if (
      opTok.type === '==' || opTok.type === '!=' ||
      opTok.type === '===' || opTok.type === '!==' ||
      opTok.type === '>' || opTok.type === '<' ||
      opTok.type === '>=' || opTok.type === '<='
    ) {
      this.consume();
      const right = this.parseAtom();
      return applyComparison(left, opTok.type, right);
    }

    return isTruthy(left);
  }

  private parseAtom(): unknown {
    const tok = this.peek();

    if (tok.type === '(') {
      this.consume();
      const result = this.parseOr();
      if (this.peek().type === ')') this.consume();
      return result;
    }

    this.consume();

    if (tok.type === 'path') {
      return resolvePath(this.data, tok.value);
    }

    return tok.value;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function applyComparison(left: unknown, op: string, right: unknown): boolean {
  switch (op) {
    case '===': return left === right;
    case '!==': return left !== right;
    case '==':  return left == right;   // intentional loose equality
    case '!=':  return left != right;   // intentional loose equality
    case '>':   return typeof left === 'number' && typeof right === 'number' && left > right;
    case '<':   return typeof left === 'number' && typeof right === 'number' && left < right;
    case '>=':  return typeof left === 'number' && typeof right === 'number' && left >= right;
    case '<=':  return typeof left === 'number' && typeof right === 'number' && left <= right;
    default:    return false;
  }
}

/**
 * Truthiness with one email-template addition:
 * empty arrays are falsy (common "has items?" guard pattern).
 */
function isTruthy(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return Boolean(value);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Evaluates a condition expression against template data.
 *
 * Supports dot-path truthiness, comparison operators (`==`, `!=`, `===`,
 * `!==`, `>`, `<`, `>=`, `<=`), logical operators (`&&`, `||`, `!`),
 * string/number/keyword literals, and parentheses for grouping.
 *
 * @param data      - Template data object.
 * @param condition - Condition expression string from an `mc-if` attribute.
 * @returns `true` if the condition evaluates to truthy.
 */
export function evaluateCondition(data: TemplateData, condition: string): boolean {
  const trimmed = condition.trim();
  if (!trimmed) return false;

  try {
    const tokens = tokenizeCondition(trimmed);
    const parser = new ConditionParser(tokens, data);
    return parser.parse();
  } catch {
    return false;
  }
}
