/**
 * CLI module barrel export.
 *
 * Re-exports all CLI submodules for the main `src/cli.ts` entry point.
 *
 * @module cli
 */

export { EXIT_SUCCESS, EXIT_COMPILE_ERROR, EXIT_CONFIG_ERROR, EXIT_IO_ERROR } from './exit-codes.js';
export { loadConfig } from './config-loader.js';
export type { ConfigLoadResult } from './config-loader.js';
export { runBuild } from './build-command.js';
export type { BuildFlags } from './build-command.js';
export { buildGlob } from './glob-build.js';
export { isGlobPattern, resolveGlob, splitGlobBase } from './glob-resolver.js';
export type { GlobResult } from './glob-resolver.js';
export { runValidate } from './validate-command.js';
export type { ValidateFlags } from './validate-command.js';
export { runInit } from './init-command.js';
export type { InitFlags } from './init-command.js';
export { runConvert } from './convert-command.js';
export type { ConvertFlags, ConvertTarget, ConvertSource } from './convert-command.js';
export { compileFile, buildCompileOptions } from './compile-dispatch.js';
export type { CompileFileResult } from './compile-dispatch.js';
export { runWatch } from './watch-command.js';
export type { WatchFlags } from './watch-command.js';
export { runContract } from './contract-command.js';
export type { ContractFlags } from './contract-command.js';
export {
  success,
  warn,
  error,
  info,
  formatIssue,
  formatIssues,
  formatIssueWithSource,
  formatCompileResult,
  formatStats,
  formatBatchSummary,
} from './output.js';
