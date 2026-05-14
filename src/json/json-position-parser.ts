/**
 * Position-tracking JSON parser.
 *
 * Parses a JSON string into the same value `JSON.parse()` would produce, BUT
 * attaches a `loc` field (line/col/offset) to every object that has a `type`
 * property. The library uses this when `compileFromJSON()` is called with a
 * JSON string instead of an MCNode object — so source map entries can carry
 * real line/col positions back to the input string.
 *
 * Strict JSON only — no comments, no trailing commas (same grammar as
 * `JSON.parse`). On any deviation, returns `{ value: null, errors: [...] }`
 * with a precise line/col on the offending character.
 *
 * Performance: single linear scan, O(n). Roughly 1.5–2× the cost of
 * `JSON.parse` (no native shortcuts), but sub-ms for typical 1–50 KB JSON.
 *
 * @module json/json-position-parser
 */

import type { MCIssue } from '../types.js';
import { ErrorCode } from '../errors/codes.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** A position in the input source. 1-based line/col, 0-based offset. */
export interface Position {
  line: number;
  col: number;
  offset: number;
}

/** Range from start to end. */
export interface PositionRange {
  start: Position;
  end: Position;
}

/** Parser result. `value` is null on a fatal parse error. */
export interface ParseResult {
  value: unknown;
  errors: MCIssue[];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parses a JSON string into a JS value, attaching `loc` to every object that
 * has a `"type"` property.
 *
 * The returned tree is structurally identical to `JSON.parse(source)`. The
 * only difference: each `{ type: ..., ... }` object also has a `loc` property
 * (start/end position covering the `{...}` block).
 *
 * @param source - The JSON string to parse.
 * @returns Parsed value (or null on fatal error) + any errors.
 */
export function parseJSONWithPositions(source: string): ParseResult {
  const parser = new Parser(source);
  try {
    const value = parser.parseValue();
    parser.skipWhitespace();
    if (!parser.atEnd()) {
      parser.error(`Unexpected trailing content`);
    }
    return { value, errors: parser.errors };
  } catch (err) {
    // Fatal parse error — `parser.error()` throws after recording the issue.
    if (err instanceof ParseAbort) {
      return { value: null, errors: parser.errors };
    }
    // Unexpected internal error — surface as a generic JSON_PARSE_ERROR.
    parser.errors.push({
      code: ErrorCode.JSON_PARSE_ERROR,
      message: err instanceof Error ? err.message : String(err),
      severity: 'error',
    });
    return { value: null, errors: parser.errors };
  }
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/** Sentinel thrown to abort parsing after `parser.error()` records an issue. */
class ParseAbort extends Error {}

class Parser {
  readonly errors: MCIssue[] = [];
  private readonly src: string;
  private readonly len: number;
  private pos = 0;
  private line = 1;
  private col = 1;

  constructor(source: string) {
    this.src = source;
    this.len = source.length;
  }

  // ── Position helpers ──────────────────────────────────────────────────

  atEnd(): boolean {
    return this.pos >= this.len;
  }

  private peek(): number {
    return this.pos < this.len ? this.src.charCodeAt(this.pos) : -1;
  }

  private advance(): number {
    const c = this.src.charCodeAt(this.pos);
    this.pos++;
    if (c === 10 /* \n */) {
      this.line++;
      this.col = 1;
    } else {
      this.col++;
    }
    return c;
  }

  private snapshot(): Position {
    return { line: this.line, col: this.col, offset: this.pos };
  }

  // ── Error reporting ────────────────────────────────────────────────────

  error(message: string): never {
    this.errors.push({
      code: ErrorCode.JSON_PARSE_ERROR,
      message,
      severity: 'error',
      loc: { line: this.line, col: this.col },
    });
    throw new ParseAbort(message);
  }

  // ── Whitespace ─────────────────────────────────────────────────────────

  skipWhitespace(): void {
    while (this.pos < this.len) {
      const c = this.src.charCodeAt(this.pos);
      if (c === 32 /* space */ || c === 9 /* tab */ || c === 10 /* \n */ || c === 13 /* \r */) {
        this.advance();
      } else {
        break;
      }
    }
  }

  // ── Value dispatch ─────────────────────────────────────────────────────

  parseValue(): unknown {
    this.skipWhitespace();
    if (this.atEnd()) this.error('Unexpected end of input');
    const c = this.peek();
    if (c === 123 /* { */) return this.parseObject();
    if (c === 91 /* [ */) return this.parseArray();
    if (c === 34 /* " */) return this.parseString();
    if (c === 116 /* t */ || c === 102 /* f */) return this.parseBoolean();
    if (c === 110 /* n */) return this.parseNull();
    if (c === 45 /* - */ || (c >= 48 && c <= 57) /* 0-9 */) return this.parseNumber();
    this.error(`Unexpected character '${this.src[this.pos]}'`);
  }

  // ── Object ─────────────────────────────────────────────────────────────

  private parseObject(): Record<string, unknown> {
    const start = this.snapshot();
    this.advance(); // consume {
    const obj: Record<string, unknown> = {};
    this.skipWhitespace();

    if (this.peek() === 125 /* } */) {
      this.advance();
      return this.maybeAttachLoc(obj, start);
    }

    while (true) {
      this.skipWhitespace();
      if (this.peek() !== 34 /* " */) {
        this.error('Expected string key in object');
      }
      const key = this.parseString();
      this.skipWhitespace();
      if (this.peek() !== 58 /* : */) {
        this.error("Expected ':' after object key");
      }
      this.advance(); // consume :
      const value = this.parseValue();
      obj[key] = value;
      this.skipWhitespace();
      const next = this.peek();
      if (next === 44 /* , */) {
        this.advance();
        continue;
      }
      if (next === 125 /* } */) {
        this.advance();
        break;
      }
      this.error("Expected ',' or '}' in object");
    }

    return this.maybeAttachLoc(obj, start);
  }

  /**
   * Attaches `loc` to objects that have a `"type"` property. Objects without
   * `type` (theme.extend.colors maps, attribute objects, etc.) are returned
   * unmodified — no point bloating non-MCNode objects with locs.
   */
  private maybeAttachLoc(obj: Record<string, unknown>, start: Position): Record<string, unknown> {
    if (typeof obj.type !== 'string') return obj;
    const end = this.snapshot();
    Object.defineProperty(obj, 'loc', {
      value: { start, end },
      enumerable: true,
      configurable: true,
      writable: true,
    });
    return obj;
  }

  // ── Array ──────────────────────────────────────────────────────────────

  private parseArray(): unknown[] {
    this.advance(); // consume [
    const arr: unknown[] = [];
    this.skipWhitespace();
    if (this.peek() === 93 /* ] */) {
      this.advance();
      return arr;
    }
    while (true) {
      const value = this.parseValue();
      arr.push(value);
      this.skipWhitespace();
      const next = this.peek();
      if (next === 44 /* , */) {
        this.advance();
        continue;
      }
      if (next === 93 /* ] */) {
        this.advance();
        break;
      }
      this.error("Expected ',' or ']' in array");
    }
    return arr;
  }

  // ── String ─────────────────────────────────────────────────────────────

  private parseString(): string {
    this.advance(); // consume opening "
    let result = '';
    while (this.pos < this.len) {
      const c = this.src.charCodeAt(this.pos);
      if (c === 34 /* " */) {
        this.advance();
        return result;
      }
      if (c === 92 /* \ */) {
        this.advance();
        const esc = this.peek();
        switch (esc) {
          case 34 /* " */:
            result += '"';
            this.advance();
            break;
          case 92 /* \ */:
            result += '\\';
            this.advance();
            break;
          case 47 /* / */:
            result += '/';
            this.advance();
            break;
          case 98 /* b */:
            result += '\b';
            this.advance();
            break;
          case 102 /* f */:
            result += '\f';
            this.advance();
            break;
          case 110 /* n */:
            result += '\n';
            this.advance();
            break;
          case 114 /* r */:
            result += '\r';
            this.advance();
            break;
          case 116 /* t */:
            result += '\t';
            this.advance();
            break;
          case 117 /* u */: {
            this.advance();
            if (this.pos + 4 > this.len) this.error('Invalid unicode escape');
            const hex = this.src.substring(this.pos, this.pos + 4);
            if (!/^[0-9a-fA-F]{4}$/.test(hex)) this.error(`Invalid unicode escape '\\u${hex}'`);
            const codeUnit = parseInt(hex, 16);
            for (let i = 0; i < 4; i++) this.advance();
            result += String.fromCharCode(codeUnit);
            break;
          }
          default:
            this.error(`Invalid escape '\\${this.src[this.pos]}'`);
        }
        continue;
      }
      if (c < 0x20) {
        this.error(`Unescaped control character in string`);
      }
      result += this.src[this.pos];
      this.advance();
    }
    this.error('Unterminated string');
  }

  // ── Number ─────────────────────────────────────────────────────────────

  private parseNumber(): number {
    const startPos = this.pos;
    if (this.peek() === 45 /* - */) this.advance();
    if (this.peek() === 48 /* 0 */) {
      this.advance();
    } else if (this.peek() >= 49 && this.peek() <= 57) {
      while (this.peek() >= 48 && this.peek() <= 57) this.advance();
    } else {
      this.error('Invalid number');
    }
    if (this.peek() === 46 /* . */) {
      this.advance();
      if (!(this.peek() >= 48 && this.peek() <= 57)) this.error('Invalid number — expected digit after decimal');
      while (this.peek() >= 48 && this.peek() <= 57) this.advance();
    }
    const c = this.peek();
    if (c === 101 /* e */ || c === 69 /* E */) {
      this.advance();
      const sign = this.peek();
      if (sign === 43 /* + */ || sign === 45 /* - */) this.advance();
      if (!(this.peek() >= 48 && this.peek() <= 57)) this.error('Invalid number — expected digit in exponent');
      while (this.peek() >= 48 && this.peek() <= 57) this.advance();
    }
    return Number(this.src.substring(startPos, this.pos));
  }

  // ── Literals ───────────────────────────────────────────────────────────

  private parseBoolean(): boolean {
    if (this.src.startsWith('true', this.pos)) {
      for (let i = 0; i < 4; i++) this.advance();
      return true;
    }
    if (this.src.startsWith('false', this.pos)) {
      for (let i = 0; i < 5; i++) this.advance();
      return false;
    }
    this.error('Invalid boolean literal');
  }

  private parseNull(): null {
    if (this.src.startsWith('null', this.pos)) {
      for (let i = 0; i < 4; i++) this.advance();
      return null;
    }
    this.error('Invalid null literal');
  }
}
