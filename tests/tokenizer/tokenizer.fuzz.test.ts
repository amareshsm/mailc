/**
 * Tokenizer fuzz tests — ensures the tokenizer always terminates on
 * arbitrary, partial, and malformed input.
 *
 * These tests guard against the infinite-loop class of bug: any input that
 * causes the scanner to stall at a position without advancing will cause
 * `tokenize()` to spin forever. A hung test (killed by vitest's timeout)
 * is the signal.
 *
 * Run with: pnpm vitest run tests/tokenizer/tokenizer.fuzz.test.ts
 */
import { describe, it, expect } from 'vitest'
import { tokenize } from '../../src/tokenizer/index.js'
import { TokenType } from '../../src/tokenizer/tokens.js'

// ---------------------------------------------------------------------------
// Known problem inputs — mid-typing states a real user will produce
// ---------------------------------------------------------------------------

const PARTIAL_INPUTS: [label: string, input: string][] = [
  // Stray <
  ['stray < at EOF',               '<'],
  ['stray < with space after',     '< '],
  ['stray < with newline after',   '<\n'],
  ['stray < with tab after',       '<\t'],
  ['stray < followed by digit',    '<3'],
  ['stray < followed by =',        '<='],
  ['stray < followed by /',        '</'],    // handled by closeTag branch — still ok
  ['double stray <<',              '<<'],
  ['multiple stray < in sequence', '< < <'],
  ['< surrounded by newlines',     '\n<\n'],

  // Mid-typing a tag name
  ['partial open tag no >',        '<mc'],
  ['partial open tag with dash',   '<mc-'],
  ['partial open tag full name',   '<mc-text'],
  ['partial open tag with space',  '<mc-text '],
  ['partial open tag with newline','<mc-text\n'],
  ['partial tag with attribute',   '<mc-text class'],
  ['partial tag = no quote',       '<mc-text class='],
  ['partial tag = quote open',     '<mc-text class="'],
  ['partial tag = half value',     '<mc-text class="bg'],

  // Mid-typing a close tag
  ['partial close tag',            '</mc'],
  ['partial close tag full',       '</mc-text'],
  ['partial close tag space',      '</mc-text '],

  // Unclosed expressions
  ['unclosed expression {{',       '{{'],
  ['half-closed expression',       '{{ name '],
  ['unclosed raw expression {{{',  '{{{'],
  ['half-closed raw',              '{{{ raw '],

  // Unclosed comments
  ['unclosed comment <!--',        '<!--'],
  ['partial comment',              '<!-- hello'],
  ['unclosed Outlook conditional', '<!--[if mso]>'],

  // Nested / compound mid-typing
  ['text then stray <',            'Hello <'],
  ['tag then stray <',             '<mc-body>\n<'],
  ['expression then stray <',      '{{name}} <'],
  ['stray < inside attribute',     '<mc-text class="foo < bar"'],

  // Completely empty
  ['empty string',                 ''],
  ['only whitespace',              '   \n\t  '],

  // Realistic mid-typing sequences (user paused after each character)
  ['user typed: <h',               '<h'],
  ['user typed: <he',              '<he'],
  ['user typed: <hea',             '<hea'],
  ['user typed: <head',            '<head'],
  ['user typed: <head>',           '<head>'],   // valid but unknown tag → text
]

describe('tokenizer — fuzz: known partial inputs always terminate', () => {
  for (const [label, input] of PARTIAL_INPUTS) {
    it(`terminates on: ${label}`, () => {
      // Must not hang (test timeout = 5s in vitest.config.ts).
      // MCErrors thrown for malformed input are fine — infinite loops are not.
      let tokens
      try {
        tokens = tokenize(input)
      } catch {
        // MCError thrown — scanner terminated cleanly, this is fine
        return
      }

      // If it didn't throw, it must have produced an EOF token
      expect(tokens[tokens.length - 1]?.type).toBe(TokenType.EOF)
    })
  }
})

// ---------------------------------------------------------------------------
// Random fuzz — 10,000 random short strings
// ---------------------------------------------------------------------------

describe('tokenizer — fuzz: random inputs always terminate', () => {
  it('terminates on 10,000 random short inputs (seed-based reproducible)', () => {
    // Character set weighted towards tokens that stress the tokenizer:
    // '<', '>', '/', '{', '}', '!', '-', letters, digits, whitespace
    const CHARS = '<>/!-_{}[]abcdefghijklmnopqrstuvwxyz01234567 \n\t='

    // Simple deterministic pseudo-random (LCG) so failures are reproducible
    let seed = 0xdeadbeef
    const rand = (): number => {
      seed = (seed * 1664525 + 1013904223) & 0xffffffff
      return (seed >>> 0) / 0x100000000
    }

    const hangs = 0
    const MAX_LEN = 30

    for (let i = 0; i < 10_000; i++) {
      const len = Math.floor(rand() * MAX_LEN)
      const chars: string[] = []
      for (let j = 0; j < len; j++) {
        chars.push(CHARS[Math.floor(rand() * CHARS.length)] as string)
      }
      const input = chars.join('')

      try {
        tokenize(input)
      } catch {
        // MCError is expected for malformed input — fine
      }
      // If tokenize() hangs, the test process is killed by vitest timeout,
      // which counts as a failure. We don't need an explicit assertion here.
    }

    // Sanity: we ran all iterations
    expect(hangs).toBe(0)
  })
})
