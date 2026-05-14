/**
 * Character-by-character scanner for the tokenizer.
 *
 * Provides `peek()`, `advance()`, `match()` and tracks
 * line/col/offset for every character consumed.
 */
import type { SourcePosition } from '../types.js';

/** A low-level character scanner with position tracking. */
export class Scanner {
  /** Full source string. */
  private readonly source: string;
  /** Current 0-based offset into `source`. */
  private offset = 0;
  /** Current 1-based line number. */
  private line = 1;
  /** Current 1-based column number. */
  private col = 1;

  constructor(source: string) {
    this.source = source;
  }

  // ── Positional ──────────────────────────────────────────────────────

  /** Returns the current source position. */
  pos(): SourcePosition {
    return { line: this.line, col: this.col, offset: this.offset };
  }

  /** Returns `true` when all input has been consumed. */
  isEof(): boolean {
    return this.offset >= this.source.length;
  }

  // ── Lookahead ───────────────────────────────────────────────────────

  /** Returns the current character without consuming it, or `'\0'` at EOF. */
  peek(): string {
    if (this.isEof()) return '\0';
    return this.source[this.offset] as string;
  }

  /** Returns the character at `offset + n` without consuming, or `'\0'`. */
  peekAt(n: number): string {
    const idx = this.offset + n;
    if (idx >= this.source.length) return '\0';
    return this.source[idx] as string;
  }

  /** Returns `true` if the upcoming characters match `expected` exactly. */
  lookAhead(expected: string): boolean {
    return this.source.startsWith(expected, this.offset);
  }

  // ── Consumption ─────────────────────────────────────────────────────

  /** Consumes and returns the current character, advancing line/col. */
  advance(): string {
    const ch = this.source[this.offset] as string;
    this.offset++;
    if (ch === '\n') {
      this.line++;
      this.col = 1;
    } else {
      this.col++;
    }
    return ch;
  }

  /**
   * If the upcoming characters match `expected`, consume them and return `true`.
   * Otherwise return `false` without advancing.
   */
  match(expected: string): boolean {
    if (this.lookAhead(expected)) {
      for (const _ of expected) {
        this.advance();
      }
      return true;
    }
    return false;
  }

  /** Consumes characters while `predicate` returns `true`. */
  consumeWhile(predicate: (ch: string) => boolean): string {
    let result = '';
    while (!this.isEof() && predicate(this.peek())) {
      result += this.advance();
    }
    return result;
  }

  /** Skips whitespace characters. */
  skipWhitespace(): void {
    this.consumeWhile(isWhitespace);
  }

  /**
   * Extracts a substring from `start` offset to the current offset.
   * Does NOT consume — positions must have been tracked externally.
   */
  sliceFrom(startOffset: number): string {
    return this.source.slice(startOffset, this.offset);
  }
}

/** Returns `true` for ASCII whitespace. */
function isWhitespace(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';
}

/** Returns `true` for characters valid in a tag or attribute name. */
export function isNameChar(ch: string): boolean {
  return (
    (ch >= 'a' && ch <= 'z') ||
    (ch >= 'A' && ch <= 'Z') ||
    (ch >= '0' && ch <= '9') ||
    ch === '-' ||
    ch === '_' ||
    ch === ':'
  );
}
