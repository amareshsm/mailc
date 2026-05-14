/**
 * mailc tokenizer — converts raw `.mc` source into a `Token[]` stream.
 *
 * State machine with modes: CONTENT, TAG, ATTRIBUTE.
 * Handles mc-* tags, inline HTML, expressions, comments, and Outlook conditionals.
 *
 * @module tokenizer
 */
import type { SourcePosition } from '../types.js';
import { ErrorCode } from '../errors/codes.js';
import { MCError } from '../errors/mc-error.js';
import { TokenType, INLINE_HTML_TAGS } from './tokens.js';
import { Scanner, isNameChar } from './scanner.js';
import { decodeEntities } from '../utils/html-entities.js';

/**
 * Element names whose text content is treated as RAW (no entity decode).
 *
 * Inside `<mc-style>`, the content is CSS — HTML entity references like
 * `&copy;` have a different meaning in CSS than in HTML, and decoding them
 * would corrupt valid stylesheets. The HTML5 spec treats `<style>` and
 * `<script>` the same way (raw text elements).
 *
 * If we ever add `<mc-script>` it should be added here too.
 */
const RAW_TEXT_ELEMENTS: ReadonlySet<string> = new Set(['mc-style']);

/** A single token produced by the tokenizer. */
export interface Token {
  type: TokenType;
  value: string;
  loc: SourcePosition;
}

/**
 * Tokenizes a raw `.mc` source string into a token stream.
 *
 * Text content (`TEXT` tokens) and attribute values (`ATTR_VALUE` tokens)
 * have HTML entity references decoded to raw UTF-8 before being stored.
 * This is the parse-side half of single-boundary escape: AST holds raw
 * values, the compiler escapes once at output. See `utils/html-entities.ts`.
 *
 * Exception: content inside raw-text elements (`<mc-style>`) is NOT decoded
 * because that content is CSS, not HTML.
 *
 * @param source - The raw `.mc` markup string.
 * @returns An array of tokens ending with `EOF`.
 */
export function tokenize(source: string): Token[] {
  const scanner = new Scanner(source);
  const tokens: Token[] = [];

  // Stack of currently-open raw-text element names (e.g. mc-style). When
  // non-empty, the next TEXT token is emitted verbatim without entity
  // decoding. The tokenize-open/close-tag helpers push/pop here.
  const rawTextStack: string[] = [];

  while (!scanner.isEof()) {
    tokenizeContent(scanner, tokens, rawTextStack);
  }

  tokens.push({ type: TokenType.EOF, value: '', loc: scanner.pos() });
  return tokens;
}

// ---------------------------------------------------------------------------
// Content mode — text, expressions, tags
// ---------------------------------------------------------------------------

/**
 * Reads content (text / expressions / tags) until the next mc-* or close tag.
 *
 * The `rawTextStack` tracks raw-text elements (e.g. `mc-style`) we are
 * currently inside. When the stack is non-empty, text content is emitted
 * verbatim (no entity decode) and only the matching close tag is recognised
 * — this mirrors HTML5's parsing of `<style>` and `<script>`.
 */
function tokenizeContent(scanner: Scanner, tokens: Token[], rawTextStack: string[]): void {
  if (scanner.isEof()) return;

  const inRawText = rawTextStack.length > 0;

  // Inside a raw-text element, only the matching close tag breaks out.
  // Comments, expressions, and other tags are all part of the raw payload.
  if (inRawText) {
    const closer = `</${rawTextStack[rawTextStack.length - 1]}`;
    if (scanner.lookAhead(closer)) {
      tokenizeCloseTag(scanner, tokens, rawTextStack);
      return;
    }
    tokenizeText(scanner, tokens, /* rawText */ true);
    return;
  }

  // Outlook conditional: <!--[if
  if (scanner.lookAhead('<!--[if')) {
    tokenizeOutlookComment(scanner, tokens);
    return;
  }

  // HTML comment: <!--
  if (scanner.lookAhead('<!--')) {
    tokenizeComment(scanner, tokens);
    return;
  }

  // Raw expression: {{{
  if (scanner.lookAhead('{{{')) {
    tokenizeRawExpression(scanner, tokens);
    return;
  }

  // Expression: {{
  if (scanner.lookAhead('{{')) {
    tokenizeExpression(scanner, tokens);
    return;
  }

  // Closing tag: </
  if (scanner.lookAhead('</')) {
    tokenizeCloseTag(scanner, tokens, rawTextStack);
    return;
  }

  // Opening tag: <tagname
  if (scanner.peek() === '<' && isNameChar(scanner.peekAt(1))) {
    tokenizeOpenTag(scanner, tokens, rawTextStack);
    return;
  }

  // Stray '<' not followed by a name char, '/', or '!' (already handled above).
  // Emit it as raw text to prevent an infinite loop — the outer while loop in
  // `tokenize()` would spin forever if nothing is consumed.
  if (scanner.peek() === '<') {
    const loc = scanner.pos();
    tokens.push({ type: TokenType.TEXT, value: scanner.advance(), loc });
    return;
  }

  // Everything else is text
  tokenizeText(scanner, tokens, /* rawText */ false);
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

/** Tokenizes `<tagname` and its attributes through `>` or `/>`. */
function tokenizeOpenTag(scanner: Scanner, tokens: Token[], rawTextStack: string[]): void {
  const loc = scanner.pos();
  scanner.advance(); // consume '<'

  const name = scanner.consumeWhile(isNameChar);
  if (name.length === 0) {
    throw new MCError({
      code: ErrorCode.UNEXPECTED_CHARACTER,
      message: `Expected tag name after '<'`,
      loc: { start: loc, end: scanner.pos() },
      severity: 'error',
    });
  }

  // Inline HTML tags inside content → emit as TEXT
  if (isInlineHtmlTag(name)) {
    emitInlineHtmlTag(scanner, tokens, loc, name);
    return;
  }

  tokens.push({ type: TokenType.TAG_OPEN, value: name, loc });
  // `tokenizeAttributes` returns true when the tag was self-closing (`/>`).
  // Only non-self-closing raw-text elements should push onto the stack —
  // a `<mc-style />` (degenerate but legal) has no body to protect.
  const selfClosed = tokenizeAttributes(scanner, tokens);
  if (!selfClosed && RAW_TEXT_ELEMENTS.has(name)) {
    rawTextStack.push(name);
  }
}

/** Tokenizes `</tagname>`. */
function tokenizeCloseTag(scanner: Scanner, tokens: Token[], rawTextStack: string[]): void {
  const loc = scanner.pos();
  scanner.advance(); // <
  scanner.advance(); // /

  const name = scanner.consumeWhile(isNameChar);
  if (name.length === 0) {
    throw new MCError({
      code: ErrorCode.UNEXPECTED_CHARACTER,
      message: `Expected tag name after '</'`,
      loc: { start: loc, end: scanner.pos() },
      severity: 'error',
    });
  }

  scanner.skipWhitespace();

  if (scanner.peek() !== '>') {
    throw new MCError({
      code: ErrorCode.UNCLOSED_TAG,
      message: `Expected '>' after '</${name}'`,
      loc: { start: loc, end: scanner.pos() },
      severity: 'error',
    });
  }

  // Inline HTML closing tags → emit as TEXT
  if (isInlineHtmlTag(name)) {
    scanner.advance(); // consume '>'
    tokens.push({ type: TokenType.TEXT, value: `</${name}>`, loc });
    return;
  }

  // If this closes the topmost raw-text element, pop the stack so the
  // following content goes back to normal entity-decoded tokenizing.
  if (rawTextStack.length > 0 && rawTextStack[rawTextStack.length - 1] === name) {
    rawTextStack.pop();
  }

  scanner.advance(); // consume '>'
  tokens.push({ type: TokenType.TAG_CLOSE, value: name, loc });
}

/** Returns `true` for inline HTML tags that should be treated as text. */
function isInlineHtmlTag(name: string): boolean {
  return INLINE_HTML_TAGS.has(name.toLowerCase());
}

/**
 * Emits a full inline HTML open/self-close tag as a single TEXT token.
 * Scanner is positioned after the tag name.
 */
function emitInlineHtmlTag(
  scanner: Scanner,
  tokens: Token[],
  loc: SourcePosition,
  name: string,
): void {
  let raw = `<${name}`;
  // Consume everything until '>' or '/>'
  while (!scanner.isEof()) {
    if (scanner.peek() === '>') {
      raw += scanner.advance();
      break;
    }
    if (scanner.peek() === '/' && scanner.peekAt(1) === '>') {
      raw += scanner.advance(); // /
      raw += scanner.advance(); // >
      break;
    }
    raw += scanner.advance();
  }
  tokens.push({ type: TokenType.TEXT, value: raw, loc });
}

// ---------------------------------------------------------------------------
// Attributes
// ---------------------------------------------------------------------------

/**
 * Tokenizes attributes inside an open tag until `>` or `/>`.
 * Emits `ATTR_NAME`, `ATTR_EQUALS`, `ATTR_VALUE`, then `TAG_END` or `TAG_SELF_CLOSE`.
 *
 * @returns `true` if the tag was self-closing (`/>`), `false` if normally
 *          closed (`>`). The caller uses this to decide whether to track
 *          the tag in the raw-text-element stack.
 */
function tokenizeAttributes(scanner: Scanner, tokens: Token[]): boolean {
  while (!scanner.isEof()) {
    scanner.skipWhitespace();

    // Self-closing />
    if (scanner.peek() === '/' && scanner.peekAt(1) === '>') {
      const loc = scanner.pos();
      scanner.advance(); // /
      scanner.advance(); // >
      tokens.push({ type: TokenType.TAG_SELF_CLOSE, value: '/>', loc });
      return true;
    }

    // End of opening tag >
    if (scanner.peek() === '>') {
      const loc = scanner.pos();
      scanner.advance();
      tokens.push({ type: TokenType.TAG_END, value: '>', loc });
      return false;
    }

    // Attribute name
    const attrLoc = scanner.pos();
    const attrName = scanner.consumeWhile(isNameChar);
    if (attrName.length === 0) {
      throw new MCError({
        code: ErrorCode.UNEXPECTED_CHARACTER,
        message: `Unexpected character '${scanner.peek()}' in tag attributes`,
        loc: { start: attrLoc, end: scanner.pos() },
        severity: 'error',
      });
    }
    tokens.push({ type: TokenType.ATTR_NAME, value: attrName, loc: attrLoc });

    scanner.skipWhitespace();

    // Boolean attribute (no =)
    if (scanner.peek() !== '=') continue;

    // Equals sign
    const eqLoc = scanner.pos();
    scanner.advance();
    tokens.push({ type: TokenType.ATTR_EQUALS, value: '=', loc: eqLoc });

    scanner.skipWhitespace();

    // Attribute value
    tokenizeAttributeValue(scanner, tokens);
  }

  // Reached EOF inside a tag — unclosed
  throw new MCError({
    code: ErrorCode.UNCLOSED_TAG,
    message: 'Unexpected end of input inside a tag',
    loc: { start: scanner.pos(), end: scanner.pos() },
    severity: 'error',
  });
}

/** Tokenizes a quoted attribute value. */
function tokenizeAttributeValue(scanner: Scanner, tokens: Token[]): void {
  const quote = scanner.peek();
  if (quote !== '"' && quote !== "'") {
    throw new MCError({
      code: ErrorCode.UNCLOSED_QUOTE,
      message: `Expected '"' or "'" to start attribute value, got '${scanner.peek()}'`,
      loc: { start: scanner.pos(), end: scanner.pos() },
      severity: 'error',
    });
  }

  const loc = scanner.pos();
  scanner.advance(); // consume opening quote

  let value = '';
  while (!scanner.isEof() && scanner.peek() !== quote) {
    value += scanner.advance();
  }

  if (scanner.isEof()) {
    throw new MCError({
      code: ErrorCode.UNCLOSED_QUOTE,
      message: `Unclosed attribute value — expected closing ${quote}`,
      loc: { start: loc, end: scanner.pos() },
      severity: 'error',
    });
  }

  scanner.advance(); // consume closing quote
  // Decode HTML entity references so the AST holds raw UTF-8 attribute
  // values. The compiler will re-escape at output via `attr()` / `reqAttr()`.
  // See `utils/html-entities.ts` and the single-boundary contract.
  tokens.push({ type: TokenType.ATTR_VALUE, value: decodeEntities(value), loc });
}

// ---------------------------------------------------------------------------
// Text content
// ---------------------------------------------------------------------------

/**
 * Consumes text content until the next tag, expression, or EOF.
 *
 * When `rawText` is `true` (inside `<mc-style>` etc.), the content is passed
 * through verbatim — no entity decode, and `{{ ... }}` expressions are NOT
 * recognised either (CSS that happens to contain `{{` would otherwise break
 * tokenization). The text run terminates only at the matching closing tag.
 *
 * When `rawText` is `false`, this is normal HTML-ish text content:
 *   - Entity references (`&amp;`, `&copy;`, `&#39;`) are decoded.
 *   - `{{` and `<` break the text run for the outer dispatcher to handle.
 */
function tokenizeText(scanner: Scanner, tokens: Token[], rawText: boolean): void {
  const loc = scanner.pos();
  let value = '';

  while (!scanner.isEof()) {
    // Inside raw-text elements (e.g. <mc-style>), only `<` (start of the
    // closing tag) terminates the run. CSS may contain `{{` legitimately,
    // so we don't honour expression syntax here.
    if (rawText) {
      if (scanner.peek() === '<') break;
      value += scanner.advance();
      continue;
    }

    // Normal text: stop before expressions or tags
    if (scanner.lookAhead('{{')) break;
    if (scanner.peek() === '<') break;
    value += scanner.advance();
  }

  if (value.length === 0) return;

  // Normal text content gets entity-decoded so the AST holds raw UTF-8.
  // Raw-text content is left verbatim (CSS is not HTML).
  const final = rawText ? value : decodeEntities(value);
  tokens.push({ type: TokenType.TEXT, value: final, loc });
}

// ---------------------------------------------------------------------------
// Expressions
// ---------------------------------------------------------------------------

/** Tokenizes `{{expression}}`. */
function tokenizeExpression(scanner: Scanner, tokens: Token[]): void {
  const loc = scanner.pos();
  scanner.match('{{'); // consume {{

  let value = '';
  while (!scanner.isEof() && !scanner.lookAhead('}}')) {
    value += scanner.advance();
  }

  if (scanner.isEof()) {
    throw new MCError({
      code: ErrorCode.UNCLOSED_EXPRESSION,
      message: `Unclosed expression '{{' — expected '}}'`,
      loc: { start: loc, end: scanner.pos() },
      severity: 'error',
    });
  }

  scanner.match('}}'); // consume }}
  tokens.push({ type: TokenType.EXPRESSION, value: value.trim(), loc });
}

/** Tokenizes `{{{rawExpression}}}`. */
function tokenizeRawExpression(scanner: Scanner, tokens: Token[]): void {
  const loc = scanner.pos();
  scanner.match('{{{'); // consume {{{

  let value = '';
  while (!scanner.isEof() && !scanner.lookAhead('}}}')) {
    value += scanner.advance();
  }

  if (scanner.isEof()) {
    throw new MCError({
      code: ErrorCode.UNCLOSED_EXPRESSION,
      message: `Unclosed raw expression '{{{' — expected '}}}'`,
      loc: { start: loc, end: scanner.pos() },
      severity: 'error',
    });
  }

  scanner.match('}}}'); // consume }}}
  tokens.push({ type: TokenType.RAW_EXPRESSION, value: value.trim(), loc });
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

/** Tokenizes `<!-- ... -->`. */
function tokenizeComment(scanner: Scanner, tokens: Token[]): void {
  const loc = scanner.pos();
  scanner.match('<!--');

  let value = '';
  while (!scanner.isEof() && !scanner.lookAhead('-->')) {
    value += scanner.advance();
  }

  if (scanner.isEof()) {
    throw new MCError({
      code: ErrorCode.UNCLOSED_TAG,
      message: `Unclosed comment '<!--' — expected '-->'`,
      loc: { start: loc, end: scanner.pos() },
      severity: 'error',
    });
  }

  scanner.match('-->');
  tokens.push({ type: TokenType.COMMENT, value: value.trim(), loc });
}

/** Tokenizes `<!--[if mso]>...<![endif]-->`. */
function tokenizeOutlookComment(scanner: Scanner, tokens: Token[]): void {
  const loc = scanner.pos();
  const startOffset = scanner.pos().offset;

  // Consume everything until <![endif]-->
  while (!scanner.isEof() && !scanner.lookAhead('<![endif]-->')) {
    scanner.advance();
  }

  if (scanner.isEof()) {
    throw new MCError({
      code: ErrorCode.UNCLOSED_TAG,
      message: `Unclosed Outlook conditional — expected '<![endif]-->'`,
      loc: { start: loc, end: scanner.pos() },
      severity: 'error',
    });
  }

  // Consume the ending
  scanner.match('<![endif]-->');
  const value = scanner.sliceFrom(startOffset);
  tokens.push({ type: TokenType.OUTLOOK_COMMENT, value, loc });
}
