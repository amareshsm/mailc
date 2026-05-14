/**
 * Post-processor — barrel export.
 *
 * Re-exports the assembler, optimizer, inline-styles injector,
 * accessibility post-processor, and contrast checker.
 *
 * @module post-processor
 */
export { assemble } from './assembler.js';
export { optimize } from './optimizer.js';
export { applyInlineStyleRules } from './inline-styles.js';
export { applyA11yPostProcessing } from './accessibility.js';
export type { A11yPostProcessOptions, A11yPostProcessResult } from './accessibility.js';
export { applyDarkMode } from './dark-mode.js';
export type { DarkModeResult } from './dark-mode.js';
export { checkColorContrast } from './contrast-checker.js';
