export { escapeHtml, unescapeHtml } from './html-escape.js';
export { deepClone } from './deep-clone.js';
export { levenshtein, fuzzyMatch, suggest } from './fuzzy-match.js';
export type { FuzzyMatch } from './fuzzy-match.js';
export {
  parseColor,
  isOpaqueColor,
  relativeLuminance,
  contrastRatio,
  checkContrast,
} from './color.js';
export type { RGB, ContrastResult } from './color.js';
export { isSafeUrl, sanitizeUrl, SAFE_URL_FALLBACK } from './url-sanitizer.js';
export { deduplicateBySpecificity, serializeToInlineStyle } from './specificity-dedup.js';
export { prettifyHtml, loadFormatter } from './formatter.js';
export type { PrettifyResult } from './formatter.js';
