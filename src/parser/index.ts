/**
 * mailc parser — converts a `Token[]` stream into an AST tree.
 *
 * Recursive descent parser that enforces matching open/close tags
 * and produces a root `ASTNode` wrapping all top-level nodes.
 *
 * @module parser
 */
import type { ASTNode, ASTContent, SourceLocation } from '../types.js';
import { ErrorCode } from '../errors/codes.js';
import { MCError } from '../errors/mc-error.js';
import type { Token } from '../tokenizer/index.js';
import { TokenType } from '../tokenizer/tokens.js';
import { createNode, createTextNode, createExpressionNode, locFromPos } from './ast.js';

/**
 * Parses a token stream into an AST.
 *
 * @param tokens - The token array produced by `tokenize()`.
 * @returns The root ASTNode (type = "root") containing all top-level children.
 */
export function parse(tokens: Token[]): ASTNode {
  const parser = new Parser(tokens);
  return parser.parseRoot();
}

// ---------------------------------------------------------------------------
// Parser implementation
// ---------------------------------------------------------------------------

class Parser {
  private readonly tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  /** Parses all top-level nodes into a synthetic "root" wrapper. */
  parseRoot(): ASTNode {
    const children: ASTNode[] = [];
    const content: ASTContent[] = [];

    while (!this.isAtEnd()) {
      this.parseChildrenInto(children, content, null);
    }

    const loc = this.makeRootLoc();
    return { type: 'root', attributes: {}, children, content, loc };
  }

  // ── Node parsing ──────────────────────────────────────────────────

  /** Parses a single element: open tag → attributes → children → close tag. */
  private parseElement(): ASTNode {
    const openToken = this.expect(TokenType.TAG_OPEN);
    const tagName = openToken.value;
    const openLoc = openToken.loc;

    const attributes = this.parseAttributes();

    // Self-closing?
    if (this.check(TokenType.TAG_SELF_CLOSE)) {
      const endToken = this.advance();
      const loc: SourceLocation = { start: openLoc, end: endToken.loc };
      return createNode(tagName, loc, attributes);
    }

    // Must be >
    this.expect(TokenType.TAG_END);

    // Parse children + content
    const children: ASTNode[] = [];
    const content: ASTContent[] = [];
    this.parseChildrenInto(children, content, tagName);

    // Expect matching close tag
    const closeToken = this.expect(TokenType.TAG_CLOSE);
    if (closeToken.value !== tagName) {
      throw new MCError({
        code: ErrorCode.MISMATCHED_TAG,
        message: `Expected closing tag </${tagName}>, but found </${closeToken.value}>`,
        loc: { start: openLoc, end: closeToken.loc },
        severity: 'error',
        fix: `Change </${closeToken.value}> to </${tagName}>`,
      });
    }

    const loc: SourceLocation = { start: openLoc, end: closeToken.loc };
    const node = createNode(tagName, loc, attributes);
    node.children = children;
    node.content = content;
    return node;
  }

  // ── Attributes ────────────────────────────────────────────────────

  /** Parses attribute tokens until TAG_END or TAG_SELF_CLOSE. */
  private parseAttributes(): Record<string, string> {
    const attrs: Record<string, string> = {};

    while (
      !this.isAtEnd() &&
      !this.check(TokenType.TAG_END) &&
      !this.check(TokenType.TAG_SELF_CLOSE)
    ) {
      if (!this.check(TokenType.ATTR_NAME)) break;

      const nameToken = this.advance();
      const name = nameToken.value;

      // Boolean attribute (no = follows)
      if (!this.check(TokenType.ATTR_EQUALS)) {
        attrs[name] = '';
        continue;
      }

      this.advance(); // consume =

      const valueToken = this.expect(TokenType.ATTR_VALUE);
      attrs[name] = valueToken.value;
    }

    return attrs;
  }

  // ── Children / content ────────────────────────────────────────────

  /**
   * Parses child nodes and content until a matching close tag (or EOF for root).
   * Mutates the passed `children` and `content` arrays.
   */
  private parseChildrenInto(
    children: ASTNode[],
    content: ASTContent[],
    parentTag: string | null,
  ): void {
    while (!this.isAtEnd()) {
      const cur = this.current();

      // Close tag → stop (the caller will consume it)
      if (cur.type === TokenType.TAG_CLOSE) {
        if (parentTag === null) {
          // Root level: unexpected close tag
          throw new MCError({
            code: ErrorCode.UNEXPECTED_CLOSE_TAG,
            message: `Unexpected closing tag </${cur.value}> with no matching open tag`,
            loc: locFromPos(cur.loc),
            severity: 'error',
          });
        }
        return; // Let the caller match it
      }

      // Open tag → recurse
      if (cur.type === TokenType.TAG_OPEN) {
        children.push(this.parseElement());
        continue;
      }

      // Text
      if (cur.type === TokenType.TEXT) {
        const t = this.advance();
        content.push(createTextNode(t.value, locFromPos(t.loc)));
        continue;
      }

      // Expression
      if (cur.type === TokenType.EXPRESSION) {
        const t = this.advance();
        content.push(createExpressionNode(t.value, false, locFromPos(t.loc)));
        continue;
      }

      // Raw expression
      if (cur.type === TokenType.RAW_EXPRESSION) {
        const t = this.advance();
        content.push(createExpressionNode(t.value, true, locFromPos(t.loc)));
        continue;
      }

      // Comment → skip (could be preserved as a special node later)
      if (cur.type === TokenType.COMMENT) {
        this.advance();
        continue;
      }

      // Outlook conditional → preserve as a special node
      if (cur.type === TokenType.OUTLOOK_COMMENT) {
        const t = this.advance();
        const node = createNode('mc-raw', locFromPos(t.loc));
        node.content = [createTextNode(t.value, locFromPos(t.loc))];
        children.push(node);
        continue;
      }

      // EOF
      if (cur.type === TokenType.EOF) {
        if (parentTag !== null) {
          throw new MCError({
            code: ErrorCode.UNEXPECTED_EOF,
            message: `Unexpected end of input — <${parentTag}> was never closed`,
            loc: locFromPos(cur.loc),
            severity: 'error',
            fix: `Add </${parentTag}> before the end of the file`,
          });
        }
        return;
      }

      // Anything else is unexpected
      throw new MCError({
        code: ErrorCode.UNEXPECTED_TOKEN,
        message: `Unexpected token ${cur.type} ("${cur.value}")`,
        loc: locFromPos(cur.loc),
        severity: 'error',
      });
    }

    // Ran out of tokens with an open parent
    if (parentTag !== null) {
      throw new MCError({
        code: ErrorCode.UNEXPECTED_EOF,
        message: `Unexpected end of input — <${parentTag}> was never closed`,
        loc: locFromPos(this.tokens[this.tokens.length - 1]!.loc),
        severity: 'error',
        fix: `Add </${parentTag}> before the end of the file`,
      });
    }
  }

  // ── Token helpers ─────────────────────────────────────────────────

  /** Returns the current token without consuming it. */
  private current(): Token {
    return this.tokens[this.pos]!;
  }

  /** Returns `true` if the current token matches `type`. */
  private check(type: TokenType): boolean {
    return !this.isAtEnd() && this.current().type === type;
  }

  /** Consumes and returns the current token. */
  private advance(): Token {
    const token = this.current();
    this.pos++;
    return token;
  }

  /** Consumes the current token if it matches `type`, otherwise throws. */
  private expect(type: TokenType): Token {
    if (!this.check(type)) {
      const cur = this.current();
      throw new MCError({
        code: ErrorCode.UNEXPECTED_TOKEN,
        message: `Expected ${type}, got ${cur.type} ("${cur.value}")`,
        loc: locFromPos(cur.loc),
        severity: 'error',
      });
    }
    return this.advance();
  }

  /** Returns `true` when past the last token. */
  private isAtEnd(): boolean {
    return this.pos >= this.tokens.length || this.current().type === TokenType.EOF;
  }

  /** Creates a root-level source location spanning the full input. */
  private makeRootLoc(): SourceLocation {
    const first = this.tokens[0]!;
    const last = this.tokens[this.tokens.length - 1]!;
    return { start: first.loc, end: last.loc };
  }
}
