/**
 * CSS pipeline — barrel export.
 *
 * Re-exports the theme resolver, class resolver, shorthand expander,
 * classifier, checker, inliner, and media queries for consumers to
 * import from `../css/index.js`.
 *
 * @module css
 */
export { DEFAULT_THEME } from './theme-defaults.js';
export { resolveTheme, remToPx } from './theme-resolver.js';
export type { UserThemeConfig } from './theme-resolver.js';
export { resolveClass, resolveColor } from './resolver.js';
export type { ResolveClassResult } from './resolver.js';
export { expandShorthand, expandAllShorthands } from './shorthand.js';
export { classifyProperty, classifyProperties, filterByClassification, buildClassificationMap } from './classifier.js';
export { checkCSS, checkIssuesToMCIssues, clearCheckerCache } from './checker.js';
export type { CSSCheckIssue, CSSCheckResult } from './checker.js';
export { checkCss } from './check-css.js';
export { inlineCSS } from './inliner.js';
export type { InlineResult } from './inliner.js';
export {
  resolveResponsiveClasses,
  buildMediaBlock,
  processResponsiveClasses,
} from './media-queries.js';
export type { ResponsiveRule, MediaQueryResult } from './media-queries.js';
