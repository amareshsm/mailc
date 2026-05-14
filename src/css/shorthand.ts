/**
 * CSS shorthand expander — expands CSS shorthands to longhand properties.
 *
 * Email clients handle shorthand properties inconsistently, so we expand
 * them to individual longhands before classification. This allows each
 * longhand to be classified independently (e.g. `background-color` is SAFE
 * while `background-image` is ENHANCE).
 *
 * Supported shorthands: border, margin, padding, background, font.
 *
 * @module css/shorthand
 */
import type { CSSProperty } from '../types.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Expands a CSS property to longhand form if it is a recognised shorthand.
 *
 * If the property is not a shorthand, returns a single-element array with
 * the original property unchanged.
 *
 * @param prop - The CSS property to potentially expand.
 * @returns An array of longhand properties.
 */
export function expandShorthand(prop: CSSProperty): CSSProperty[] {
  const expander = SHORTHAND_EXPANDERS[prop.property];
  if (!expander) {
    return [prop];
  }
  return expander(prop.value);
}

/**
 * Expands all CSS properties in an array, flattening shorthands.
 *
 * @param props - Array of CSS properties.
 * @returns Flattened array with shorthands replaced by longhands.
 */
export function expandAllShorthands(props: CSSProperty[]): CSSProperty[] {
  const result: CSSProperty[] = [];
  for (const prop of props) {
    const expanded = expandShorthand(prop);
    for (const p of expanded) {
      result.push(p);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Shorthand Expanders
// ---------------------------------------------------------------------------

type ShorthandExpander = (value: string) => CSSProperty[];

const SHORTHAND_EXPANDERS: Record<string, ShorthandExpander> = {
  margin: expandBoxModel('margin'),
  padding: expandBoxModel('padding'),
  border: expandBorder,
  'border-top': expandBorderSide('border-top'),
  'border-right': expandBorderSide('border-right'),
  'border-bottom': expandBorderSide('border-bottom'),
  'border-left': expandBorderSide('border-left'),
  background: expandBackground,
  font: expandFont,
};

// ---------------------------------------------------------------------------
// Box Model (margin, padding) — 1-to-4 value expansion
// ---------------------------------------------------------------------------

/**
 * Creates an expander for a box-model shorthand (margin or padding).
 *
 * @param prefix - `"margin"` or `"padding"`.
 * @returns An expander function.
 */
function expandBoxModel(prefix: string): ShorthandExpander {
  return (value: string): CSSProperty[] => {
    const parts = splitValues(value);
    const [top, right, bottom, left] = parseFourValues(parts);
    return [
      { property: `${prefix}-top`, value: top },
      { property: `${prefix}-right`, value: right },
      { property: `${prefix}-bottom`, value: bottom },
      { property: `${prefix}-left`, value: left },
    ];
  };
}

/**
 * Parses 1–4 values into top/right/bottom/left per CSS spec.
 *
 * @param parts - Tokenised value parts.
 * @returns A tuple of `[top, right, bottom, left]`.
 */
function parseFourValues(parts: string[]): [string, string, string, string] {
  const a = parts[0] ?? '';
  const b = parts[1] ?? a;
  const c = parts[2] ?? a;
  const d = parts[3] ?? b;

  const count = parts.length;
  if (count === 1) {
    return [a, a, a, a];
  }
  if (count === 2) {
    return [a, b, a, b];
  }
  if (count === 3) {
    return [a, b, c, b];
  }
  return [a, b, c, d];
}

// ---------------------------------------------------------------------------
// Border shorthand — border: <width> <style> <color>
// ---------------------------------------------------------------------------

const BORDER_STYLES = new Set([
  'none', 'hidden', 'dotted', 'dashed', 'solid',
  'double', 'groove', 'ridge', 'inset', 'outset',
]);

/**
 * Expands `border: <width> <style> <color>` into three longhands.
 *
 * @param value - The shorthand value, e.g. `"1px solid #ccc"`.
 * @returns Array of `border-width`, `border-style`, `border-color`.
 */
function expandBorder(value: string): CSSProperty[] {
  const { width, style, color } = parseBorderValue(value);
  return [
    { property: 'border-width', value: width },
    { property: 'border-style', value: style },
    { property: 'border-color', value: color },
  ];
}

/**
 * Creates an expander for a single-side border shorthand.
 *
 * @param side - E.g. `"border-top"`.
 * @returns An expander function.
 */
function expandBorderSide(side: string): ShorthandExpander {
  return (value: string): CSSProperty[] => {
    const { width, style, color } = parseBorderValue(value);
    return [
      { property: `${side}-width`, value: width },
      { property: `${side}-style`, value: style },
      { property: `${side}-color`, value: color },
    ];
  };
}

/** Parsed border components. */
interface BorderParts {
  width: string;
  style: string;
  color: string;
}

/**
 * Parses a border shorthand value into width, style, and color.
 *
 * @param value - E.g. `"1px solid #ccc"`.
 * @returns Parsed components with defaults.
 */
function parseBorderValue(value: string): BorderParts {
  const parts = splitValues(value);
  let width = 'medium';
  let style = 'none';
  let color = 'currentcolor';

  for (const part of parts) {
    if (BORDER_STYLES.has(part)) {
      style = part;
    } else if (isLengthOrZero(part)) {
      width = part;
    } else {
      color = part;
    }
  }

  return { width, style, color };
}

// ---------------------------------------------------------------------------
// Background shorthand
// ---------------------------------------------------------------------------

const BG_REPEAT_VALUES = new Set([
  'repeat', 'repeat-x', 'repeat-y', 'no-repeat', 'space', 'round',
]);

const BG_ATTACHMENT_VALUES = new Set([
  'scroll', 'fixed', 'local',
]);

const BG_POSITION_VALUES = new Set([
  'top', 'right', 'bottom', 'left', 'center',
]);

/**
 * Expands `background` shorthand to individual longhands.
 *
 * Handles: `background: <color> url(...) <position>/<size> <repeat>`.
 * Unrecognised parts default to spec initial values.
 *
 * @param value - The shorthand value.
 * @returns Array of background longhand properties.
 */
function expandBackground(value: string): CSSProperty[] {
  const parts = splitValues(value);

  let bgColor = '';
  let bgImage = '';
  let bgPosition = '';
  let bgSize = '';
  let bgRepeat = '';
  let bgAttachment = '';

  for (const part of parts) {
    if (part.startsWith('url(')) {
      bgImage = part;
    } else if (BG_REPEAT_VALUES.has(part)) {
      bgRepeat = part;
    } else if (BG_ATTACHMENT_VALUES.has(part)) {
      bgAttachment = part;
    } else if (part.includes('/')) {
      // position/size syntax
      const slashParts = part.split('/');
      const pos = slashParts[0] ?? '';
      const size = slashParts[1] ?? '';
      bgPosition = bgPosition ? `${bgPosition} ${pos}` : pos;
      bgSize = size;
    } else if (BG_POSITION_VALUES.has(part) || isLengthOrPercentage(part)) {
      bgPosition = bgPosition ? `${bgPosition} ${part}` : part;
    } else if (!bgColor) {
      bgColor = part;
    }
  }

  const result: CSSProperty[] = [];
  if (bgColor) {
    result.push({ property: 'background-color', value: bgColor });
  }
  if (bgImage) {
    result.push({ property: 'background-image', value: bgImage });
  }
  if (bgPosition) {
    result.push({ property: 'background-position', value: bgPosition });
  }
  if (bgSize) {
    result.push({ property: 'background-size', value: bgSize });
  }
  if (bgRepeat) {
    result.push({ property: 'background-repeat', value: bgRepeat });
  }
  if (bgAttachment) {
    result.push({ property: 'background-attachment', value: bgAttachment });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Font shorthand — font: <style> <weight> <size>/<line-height> <family>
// ---------------------------------------------------------------------------

const FONT_STYLES = new Set(['italic', 'oblique', 'normal']);

const FONT_WEIGHT_KEYWORDS = new Set([
  'normal', 'bold', 'bolder', 'lighter',
  '100', '200', '300', '400', '500', '600', '700', '800', '900',
]);

/**
 * Expands `font` shorthand to individual longhands.
 *
 * @param value - The shorthand value, e.g. `"italic bold 16px/1.5 Arial, sans-serif"`.
 * @returns Array of font longhand properties.
 */
function expandFont(value: string): CSSProperty[] {
  const result: CSSProperty[] = [];
  const parts = splitValues(value);

  let fontStyle = '';
  let fontWeight = '';
  let fontSize = '';
  let lineHeight = '';
  let familyStartIndex = -1;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i] as string;

    if (!fontSize && FONT_STYLES.has(part)) {
      fontStyle = part;
    } else if (!fontSize && FONT_WEIGHT_KEYWORDS.has(part)) {
      fontWeight = part;
    } else if (!fontSize && (isLengthOrPercentage(part) || part.includes('/'))) {
      // size or size/line-height
      if (part.includes('/')) {
        const slashParts = part.split('/');
        fontSize = slashParts[0] ?? '';
        lineHeight = slashParts[1] ?? '';
      } else {
        fontSize = part;
      }
      familyStartIndex = i + 1;
    }
  }

  if (fontStyle) {
    result.push({ property: 'font-style', value: fontStyle });
  }
  if (fontWeight) {
    result.push({ property: 'font-weight', value: fontWeight });
  }
  if (fontSize) {
    result.push({ property: 'font-size', value: fontSize });
  }
  if (lineHeight) {
    result.push({ property: 'line-height', value: lineHeight });
  }
  if (familyStartIndex > 0 && familyStartIndex < parts.length) {
    const family = parts.slice(familyStartIndex).join(' ');
    result.push({ property: 'font-family', value: family });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Value helpers
// ---------------------------------------------------------------------------

const LENGTH_REGEX = /^-?(\d+\.?\d*|\.\d+)(px|em|rem|pt|%|cm|mm|in|ex|ch|vw|vh|vmin|vmax)$/;
const LENGTH_OR_ZERO_REGEX = /^(-?(\d+\.?\d*|\.\d+)(px|em|rem|pt|cm|mm|in|ex|ch|vw|vh|vmin|vmax)?|0)$/;

/**
 * Checks if a value is a CSS length with a unit or `0`.
 *
 * @param value - The string to test.
 * @returns `true` if it looks like a length value.
 */
function isLengthOrZero(value: string): boolean {
  return LENGTH_OR_ZERO_REGEX.test(value);
}

/**
 * Checks if a value is a CSS length or percentage.
 *
 * @param value - The string to test.
 * @returns `true` if it looks like a length or percentage.
 */
function isLengthOrPercentage(value: string): boolean {
  return LENGTH_REGEX.test(value);
}

/**
 * Splits a CSS value string by whitespace, respecting parenthesised groups.
 *
 * @param value - The CSS value string.
 * @returns Array of value tokens.
 */
function splitValues(value: string): string[] {
  const result: string[] = [];
  let current = '';
  let depth = 0;

  for (const ch of value.trim()) {
    if (ch === '(') {
      depth++;
      current += ch;
    } else if (ch === ')') {
      depth--;
      current += ch;
    } else if (ch === ' ' && depth === 0) {
      if (current) {
        result.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }

  if (current) {
    result.push(current);
  }
  return result;
}
