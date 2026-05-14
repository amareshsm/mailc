/**
 * All error codes used throughout the mailc compiler.
 *
 * Convention: SCREAMING_SNAKE_CASE grouped by pipeline stage.
 */
export enum ErrorCode {
  // ── Tokenizer ──────────────────────────────────────────────────────────
  UNCLOSED_TAG = 'UNCLOSED_TAG',
  UNCLOSED_QUOTE = 'UNCLOSED_QUOTE',
  UNCLOSED_EXPRESSION = 'UNCLOSED_EXPRESSION',
  UNEXPECTED_CHARACTER = 'UNEXPECTED_CHARACTER',

  // ── Parser ─────────────────────────────────────────────────────────────
  MISMATCHED_TAG = 'MISMATCHED_TAG',
  UNEXPECTED_EOF = 'UNEXPECTED_EOF',
  UNEXPECTED_TOKEN = 'UNEXPECTED_TOKEN',
  UNEXPECTED_CLOSE_TAG = 'UNEXPECTED_CLOSE_TAG',

  // ── Validator ──────────────────────────────────────────────────────────
  INVALID_NESTING = 'INVALID_NESTING',
  MISSING_ATTRIBUTE = 'MISSING_ATTRIBUTE',
  UNKNOWN_COMPONENT = 'UNKNOWN_COMPONENT',
  UNKNOWN_ATTRIBUTE = 'UNKNOWN_ATTRIBUTE',
  INVALID_LOGIC_ORDER = 'INVALID_LOGIC_ORDER',
  HEAD_NOT_FIRST_CHILD = 'HEAD_NOT_FIRST_CHILD',
  INVALID_ATTRIBUTES_CHILD = 'INVALID_ATTRIBUTES_CHILD',
  TABLE_INVALID_CHILD = 'TABLE_INVALID_CHILD',
  TABLE_MISSING_HEADERS = 'TABLE_MISSING_HEADERS',
  TABLE_MISSING_SCOPE = 'TABLE_MISSING_SCOPE',
  TABLE_INCONSISTENT_COLUMNS = 'TABLE_INCONSISTENT_COLUMNS',
  TABLE_COLSPAN_EXCEEDS_COLUMNS = 'TABLE_COLSPAN_EXCEEDS_COLUMNS',

  // ── Hero ───────────────────────────────────────────────────────────────
  HERO_INVALID_CHILD = 'HERO_INVALID_CHILD',
  HERO_UNSAFE_URL = 'HERO_UNSAFE_URL',
  HERO_INVALID_HEIGHT = 'HERO_INVALID_HEIGHT',
  HERO_MISSING_FALLBACK_COLOR = 'HERO_MISSING_FALLBACK_COLOR',

  // ── Template Engine ────────────────────────────────────────────────────
  UNDEFINED_VARIABLE = 'UNDEFINED_VARIABLE',
  INVALID_OPERATOR = 'INVALID_OPERATOR',
  INVALID_EXPRESSION = 'INVALID_EXPRESSION',
  LOOP_NOT_ARRAY = 'LOOP_NOT_ARRAY',
  VARIABLE_SHADOWING = 'VARIABLE_SHADOWING',

  // ── CSS Pipeline ───────────────────────────────────────────────────────
  UNKNOWN_CLASS = 'UNKNOWN_CLASS',
  UNSUPPORTED_UTILITY = 'UNSUPPORTED_UTILITY',
  BREAKING_CSS = 'BREAKING_CSS',
  NO_EFFECT_CSS = 'NO_EFFECT_CSS',
  NO_DESKTOP_FALLBACK = 'NO_DESKTOP_FALLBACK',
  INVALID_CSS_VALUE = 'INVALID_CSS_VALUE',
  IMPORTANT_NOT_SUPPORTED = 'IMPORTANT_NOT_SUPPORTED',

  // ── Component Compiler ─────────────────────────────────────────────────
  EMPTY_DOCUMENT = 'EMPTY_DOCUMENT',
  UNKNOWN_COMPONENT_TYPE = 'UNKNOWN_COMPONENT_TYPE',
  INVALID_ATTRIBUTE_VALUE = 'INVALID_ATTRIBUTE_VALUE',
  UNKNOWN_MC_CLASS = 'UNKNOWN_MC_CLASS',
  PLUGIN_COMPILE_ERROR = 'PLUGIN_COMPILE_ERROR',
  PLUGIN_CSS_COMPATIBILITY = 'PLUGIN_CSS_COMPATIBILITY',

  // ── Config ─────────────────────────────────────────────────────────────
  CONFIG_NOT_FOUND = 'CONFIG_NOT_FOUND',
  CONFIG_INVALID = 'CONFIG_INVALID',
  TAILWIND_CONFIG_ERROR = 'TAILWIND_CONFIG_ERROR',

  // ── Styling Mode ─────────────────────────────────────────────────────
  CSS_ATTR_IN_CLASS_MODE = 'CSS_ATTR_IN_CLASS_MODE',
  /**
   * Fires when `templateStyle === 'attribute'` and a `class` attribute is
   * present on a component. Attribute mode is the styling mechanism for
   * attribute-mode projects; `class=` is reserved for `templateStyle: 'class'`.
   * Symmetric to `CSS_ATTR_IN_CLASS_MODE`. Hard error — routed to
   * `result.errors`.
   */
  CLASS_ATTR_IN_ATTRIBUTE_MODE = 'CLASS_ATTR_IN_ATTRIBUTE_MODE',

  // ── Compile Mode ─────────────────────────────────────────────────────
  ENHANCE_PROPERTY_STRIPPED = 'ENHANCE_PROPERTY_STRIPPED',
  /**
   * `info`-severity heads-up. Fires when `compatibilityMode === 'strict'` is
   * active AND the source contains at least one `<mc-style>` block.
   * mc-style content is a deliberate escape hatch — strict mode does NOT
   * classify or strip CSS inside it. Useful for users running strict as a CI
   * gate so they know the gate has a documented hole.
   */
  STRICT_MODE_MCSTYLE_BYPASS = 'STRICT_MODE_MCSTYLE_BYPASS',

  // ── Layout ───────────────────────────────────────────────────────────
  GROUP_COLUMN_PX_WIDTH = 'GROUP_COLUMN_PX_WIDTH',

  // ── Security ─────────────────────────────────────────────────────────
  UNSAFE_URL = 'UNSAFE_URL',

  // ── Accessibility ────────────────────────────────────────────────────
  MISSING_ALT = 'MISSING_ALT',
  MISSING_TITLE = 'MISSING_TITLE',
  LOW_CONTRAST = 'LOW_CONTRAST',
  LINKED_IMAGE_EMPTY_ALT = 'LINKED_IMAGE_EMPTY_ALT',

  // ── Email Budget ─────────────────────────────────────────────────────
  EMAIL_SIZE_LIMIT = 'EMAIL_SIZE_LIMIT',

  // ── I/O ────────────────────────────────────────────────────────────────
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',
  // ── Compiler safety ────────────────────────────────────────────────────
  MAX_RECURSION_DEPTH = 'MAX_RECURSION_DEPTH',
  JSON_PARSE_ERROR = 'JSON_PARSE_ERROR',
}
