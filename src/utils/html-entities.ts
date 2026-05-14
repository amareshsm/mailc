/**
 * HTML entity decoder.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * WHY THIS MODULE EXISTS
 * ──────────────────────────────────────────────────────────────────────────
 *
 * The tokenizer calls `decodeEntities()` on attribute values and text content
 * so the AST holds raw UTF-8 throughout the pipeline. This is the parse-side
 * half of the "single-boundary" escape contract:
 *
 *   Source bytes ──[parser decodes entities]──▶ raw AST ──[compiler escapes]──▶ HTML
 *
 * Without this pass, the AST would hold mixed semantics: some inputs would
 * carry literal entity references (e.g. `&amp;`) while others would carry
 * raw chars (e.g. `&` from template data or JSON). The compiler can't
 * uniformly escape both, and either leaks or double-escapes one path.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * WHAT IT HANDLES
 * ──────────────────────────────────────────────────────────────────────────
 *
 * - Numeric decimal: `&#39;`           → `'`     (U+0027)
 * - Numeric hex:     `&#x27;` `&#X27;` → `'`     (U+0027)
 * - Named:           `&amp;` `&copy;`  → `&` `©`
 *
 * Named entities follow the HTML5 spec. Multi-codepoint entities (`&NotEqualTilde;`
 * → ≂̸ as two codepoints) are NOT in the table — they don't show up in real-
 * world email markup, and skipping them keeps the table to single-codepoint
 * mappings which are easy to reason about.
 *
 * Invalid or unknown entity references pass through verbatim, matching what
 * a forgiving HTML5 parser does. e.g. `&unknown;` stays as `&unknown;`.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * WHAT IT DOES NOT DO
 * ──────────────────────────────────────────────────────────────────────────
 *
 * - Decode references inside `<mc-style>` content. CSS is not HTML;
 *   entities have a different meaning there. The tokenizer skips the call
 *   for style content (see `tokenizer/index.ts`).
 *
 * - Encode raw chars back to entities. That's the compiler's job, done by
 *   `escapeHtml()` and `attr()` in `utils/html-attr.ts`.
 *
 * @module utils/html-entities
 */

// ---------------------------------------------------------------------------
// Named entity table
// ---------------------------------------------------------------------------

/**
 * HTML5 named entities mapped to their single Unicode codepoint.
 *
 * This list covers the named entities defined in the HTML5 spec. Entries
 * are grouped by category for review readability — the runtime treats them
 * all the same.
 *
 * Note: HTML5 named entities are case-sensitive in form (`&AMP;` is distinct
 * from `&amp;`). The spec recognises a small set of legacy entities that
 * may omit the trailing semicolon (`&amp` without `;`), but our decoder
 * requires the semicolon — that's the standard form and what users actually
 * type. Strict form keeps the matcher simple and avoids ambiguity.
 */
const NAMED_ENTITIES: Record<string, string> = {
  // The five XML/HTML core entities — these are the only ones that affect
  // HTML *parsing* (the others are just shortcuts for UTF-8 codepoints).
  amp: '&',
  AMP: '&',
  lt: '<',
  LT: '<',
  gt: '>',
  GT: '>',
  quot: '"',
  QUOT: '"',
  apos: "'",

  // Whitespace
  nbsp: ' ',
  ensp: ' ',
  emsp: ' ',
  thinsp: ' ',
  zwnj: '‌',
  zwj: '‍',
  lrm: '‎',
  rlm: '‏',

  // Punctuation & dashes
  hellip: '…',
  mdash: '—',
  ndash: '–',
  lsquo: '‘',
  rsquo: '’',
  sbquo: '‚',
  ldquo: '“',
  rdquo: '”',
  bdquo: '„',
  dagger: '†',
  Dagger: '‡',
  bull: '•',
  prime: '′',
  Prime: '″',
  oline: '‾',

  // Quotation marks (guillemets)
  laquo: '«',
  raquo: '»',
  lsaquo: '‹',
  rsaquo: '›',

  // Common symbols (the high-traffic ones for email)
  copy: '©',
  COPY: '©',
  reg: '®',
  REG: '®',
  trade: '™',
  TRADE: '™',
  sect: '§',
  para: '¶',
  middot: '·',
  brvbar: '¦',
  not: '¬',
  shy: '­',
  macr: '¯',
  acute: '´',
  cedil: '¸',
  iexcl: '¡',
  iquest: '¿',
  ordf: 'ª',
  ordm: 'º',
  curren: '¤',
  uml: '¨',

  // Currency
  cent: '¢',
  pound: '£',
  yen: '¥',
  euro: '€',

  // Math
  times: '×',
  divide: '÷',
  plusmn: '±',
  minus: '−',
  frac12: '½',
  frac14: '¼',
  frac34: '¾',
  sup1: '¹',
  sup2: '²',
  sup3: '³',
  deg: '°',
  micro: 'µ',
  permil: '‰',
  infin: '∞',
  asymp: '≈',
  ne: '≠',
  le: '≤',
  ge: '≥',
  sum: '∑',
  prod: '∏',
  radic: '√',
  int: '∫',
  part: '∂',
  nabla: '∇',
  exist: '∃',
  empty: '∅',
  isin: '∈',
  notin: '∉',
  ni: '∋',
  cap: '∩',
  cup: '∪',
  sub: '⊂',
  sup: '⊃',
  nsub: '⊄',
  sube: '⊆',
  supe: '⊇',
  oplus: '⊕',
  otimes: '⊗',
  perp: '⊥',
  sdot: '⋅',
  lceil: '⌈',
  rceil: '⌉',
  lfloor: '⌊',
  rfloor: '⌋',
  lang: '⟨',
  rang: '⟩',

  // Arrows
  larr: '←',
  uarr: '↑',
  rarr: '→',
  darr: '↓',
  harr: '↔',
  crarr: '↵',
  lArr: '⇐',
  uArr: '⇑',
  rArr: '⇒',
  dArr: '⇓',
  hArr: '⇔',

  // Card suits & misc
  spades: '♠',
  clubs: '♣',
  hearts: '♥',
  diams: '♦',
  loz: '◊',

  // Greek letters — full set, lowercase
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  epsilon: 'ε',
  zeta: 'ζ',
  eta: 'η',
  theta: 'θ',
  iota: 'ι',
  kappa: 'κ',
  lambda: 'λ',
  mu: 'μ',
  nu: 'ν',
  xi: 'ξ',
  omicron: 'ο',
  pi: 'π',
  rho: 'ρ',
  sigmaf: 'ς',
  sigma: 'σ',
  tau: 'τ',
  upsilon: 'υ',
  phi: 'φ',
  chi: 'χ',
  psi: 'ψ',
  omega: 'ω',
  thetasym: 'ϑ',
  upsih: 'ϒ',
  piv: 'ϖ',

  // Greek letters — uppercase
  Alpha: 'Α',
  Beta: 'Β',
  Gamma: 'Γ',
  Delta: 'Δ',
  Epsilon: 'Ε',
  Zeta: 'Ζ',
  Eta: 'Η',
  Theta: 'Θ',
  Iota: 'Ι',
  Kappa: 'Κ',
  Lambda: 'Λ',
  Mu: 'Μ',
  Nu: 'Ν',
  Xi: 'Ξ',
  Omicron: 'Ο',
  Pi: 'Π',
  Rho: 'Ρ',
  Sigma: 'Σ',
  Tau: 'Τ',
  Upsilon: 'Υ',
  Phi: 'Φ',
  Chi: 'Χ',
  Psi: 'Ψ',
  Omega: 'Ω',

  // Latin-1 supplement — accented letters (common in European languages)
  Agrave: 'À', Aacute: 'Á', Acirc: 'Â', Atilde: 'Ã', Auml: 'Ä', Aring: 'Å', AElig: 'Æ',
  Ccedil: 'Ç',
  Egrave: 'È', Eacute: 'É', Ecirc: 'Ê', Euml: 'Ë',
  Igrave: 'Ì', Iacute: 'Í', Icirc: 'Î', Iuml: 'Ï',
  ETH: 'Ð',
  Ntilde: 'Ñ',
  Ograve: 'Ò', Oacute: 'Ó', Ocirc: 'Ô', Otilde: 'Õ', Ouml: 'Ö', Oslash: 'Ø',
  Ugrave: 'Ù', Uacute: 'Ú', Ucirc: 'Û', Uuml: 'Ü',
  Yacute: 'Ý',
  THORN: 'Þ',
  szlig: 'ß',
  agrave: 'à', aacute: 'á', acirc: 'â', atilde: 'ã', auml: 'ä', aring: 'å', aelig: 'æ',
  ccedil: 'ç',
  egrave: 'è', eacute: 'é', ecirc: 'ê', euml: 'ë',
  igrave: 'ì', iacute: 'í', icirc: 'î', iuml: 'ï',
  eth: 'ð',
  ntilde: 'ñ',
  ograve: 'ò', oacute: 'ó', ocirc: 'ô', otilde: 'õ', ouml: 'ö', oslash: 'ø',
  ugrave: 'ù', uacute: 'ú', ucirc: 'û', uuml: 'ü',
  yacute: 'ý',
  thorn: 'þ',
  yuml: 'ÿ',
  Yuml: 'Ÿ',
  OElig: 'Œ', oelig: 'œ',
  Scaron: 'Š', scaron: 'š',
  fnof: 'ƒ',
  circ: 'ˆ', tilde: '˜',
};

// ---------------------------------------------------------------------------
// Decoder
// ---------------------------------------------------------------------------

/**
 * Matches a single entity reference. Captures one of:
 *   - group 1: decimal codepoint (`#39`, `#10`)
 *   - group 2: hex codepoint (`#x27`, `#X1F600`)
 *   - group 3: named entity (`amp`, `copy`)
 *
 * The trailing `;` is required (strict form). The `?` on the group says
 * "any one of these three" — exactly one will be defined per match.
 */
const ENTITY_RE = /&(?:#(\d+)|#[xX]([0-9a-fA-F]+)|([a-zA-Z][a-zA-Z0-9]*));/g;

/**
 * Decodes HTML entity references in a string.
 *
 * Numeric entities (`&#NN;` decimal, `&#xNN;` hex) decode to their codepoint.
 * Named entities decode if present in the table; otherwise the reference is
 * left verbatim (matching forgiving HTML5 parser behaviour).
 *
 * Codepoints outside the Basic Multilingual Plane (e.g. emoji like &#x1F600;)
 * are encoded as surrogate pairs by `String.fromCodePoint`. The decoder
 * handles them transparently.
 *
 * Out-of-range codepoints (negative, above 0x10FFFF) are left as the original
 * entity reference, again matching parser leniency. NULL (`&#0;`) is also
 * preserved verbatim — not a meaningful character in HTML content.
 *
 * @param input - The source string containing zero or more entity references.
 * @returns The string with recognised entities decoded to their UTF-8 form.
 */
export function decodeEntities(input: string): string {
  // Fast path: no `&` means nothing to decode. Saves the regex scan on the
  // overwhelmingly common case of plain ASCII attribute values.
  if (input.indexOf('&') === -1) return input;

  return input.replace(ENTITY_RE, (match, dec: string | undefined, hex: string | undefined, name: string | undefined) => {
    // Decimal numeric: &#39;
    if (dec !== undefined) {
      const cp = parseInt(dec, 10);
      return isValidCodepoint(cp) ? String.fromCodePoint(cp) : match;
    }
    // Hex numeric: &#x27;
    if (hex !== undefined) {
      const cp = parseInt(hex, 16);
      return isValidCodepoint(cp) ? String.fromCodePoint(cp) : match;
    }
    // Named entity
    const decoded = NAMED_ENTITIES[name as string];
    return decoded ?? match;
  });
}

/**
 * Returns true if `cp` is a valid Unicode codepoint suitable for decoding.
 *
 * Excludes:
 *   - NaN (parseInt failure — won't happen given the regex, but defensive)
 *   - 0 (NULL) — not meaningful in HTML content; leaving the entity ref
 *     verbatim avoids surprising downstream consumers
 *   - Negative values
 *   - Above 0x10FFFF (top of Unicode space)
 *
 * Note: this intentionally allows surrogate codepoints (U+D800–U+DFFF). The
 * HTML5 parser replaces those with U+FFFD; we preserve them as-is because
 * lone surrogates in JS strings are well-defined and `String.fromCodePoint`
 * handles them without throwing. In email markup this case is theoretical.
 */
function isValidCodepoint(cp: number): boolean {
  return Number.isFinite(cp) && cp > 0 && cp <= 0x10FFFF;
}
