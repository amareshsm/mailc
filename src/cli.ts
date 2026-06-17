#!/usr/bin/env node

/**
 * mailc — CLI entry point
 *
 * Commander.js program with four commands:
 * - `mailc build`    — Compile .mc / .json → email-safe HTML
 * - `mailc validate` — Validate without compiling
 * - `mailc init`     — Scaffold a new project
 * - `mailc convert`  — Convert between .mc and JSON
 *
 * Node-only: this is the only file in the project that uses node:* imports.
 *
 * @module cli
 */

import { Command, Option } from 'commander';
import { mergeConfig } from './config.js';
import {
  loadConfig,
  runBuild,
  runValidate,
  runInit,
  runConvert,
  runWatch,
  runContract,
  EXIT_CONFIG_ERROR,
  warn,
  error,
} from './cli/index.js';
import type { BuildFlags, ValidateFlags, ConvertTarget, ConvertSource, WatchFlags, ContractFlags } from './cli/index.js';

// ---------------------------------------------------------------------------
// Version (read from package.json at build time is not possible in ESM
// without fs, so we hardcode and update on release)
// ---------------------------------------------------------------------------

const VERSION = '0.1.0';

// ---------------------------------------------------------------------------
// Program
// ---------------------------------------------------------------------------

const program = new Command();

program
  .name('mailc')
  .description('The modern email compiler — .mc markup & JSON to email-safe HTML')
  .version(VERSION, '-V, --version', 'Output the current version');

// ---------------------------------------------------------------------------
// mailc build
// ---------------------------------------------------------------------------

program
  .command('build')
  .description('Compile .mc or .json files to email-safe HTML')
  .argument('<input>', 'Input file, directory, or glob pattern (e.g. src/**/*.mc)')
  .option('-o, --output <path>', 'Output file or directory (preserves folder structure for glob/dir)')
  .option('-d, --data <path>', 'JSON data file for template variables')
  .option('-c, --config <path>', 'Config file path')
  .option('-v, --verbose', 'Show INFO-level messages and stats', false)
  .option('--fail-on-warnings', 'Exit with error code when warnings are produced (for CI)', false)
  .option('-m, --minify', 'Minify output HTML', false)
  .option('-t, --target <clients>', "Override target clients. Use 'default' for the curated 5-client set, or a comma-separated glob list (e.g. gmail.web,outlook.web). Omit for no client-specific gating.")
  .addOption(
    new Option('--compatibility-mode <mode>', 'Compatibility mode. Strict strips ENHANCE properties with warnings.')
      .choices(['liberal', 'strict']),
  )
  .addOption(
    new Option('--template-style <mode>', 'Styling mode: CSS-property attributes (default) or Tailwind utility classes.')
      .choices(['attribute', 'class']),
  )
  .option('--debug', 'Inject mc:source debug comments and write .map.json source map', false)
  .option('--source-map', 'Inject data-mc-id attributes and write .map.json source map (clean mode)', false)
  .action(async (input: string, opts: Record<string, unknown>) => {
    const cwd = process.cwd();

    // Load config
    let configResult;
    try {
      configResult = await loadConfig(cwd, opts['config'] as string | undefined);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(error(msg) + '\n');
      process.exit(EXIT_CONFIG_ERROR);
    }

    // Show config warnings
    for (const w of configResult.warnings) {
      process.stderr.write(warn(w) + '\n');
    }

    const mergedConfig = mergeConfig(configResult.config);

    const flags: BuildFlags = {
      output: opts['output'] as string | undefined,
      data: opts['data'] as string | undefined,
      verbose: Boolean(opts['verbose']),
      failOnWarnings: Boolean(opts['failOnWarnings']),
      minify: Boolean(opts['minify']),
      target: opts['target'] as string | undefined,
      compatibilityMode: opts['compatibilityMode'] as 'liberal' | 'strict' | undefined,
      templateStyle: opts['templateStyle'] as 'attribute' | 'class' | undefined,
      debug: Boolean(opts['debug']),
      sourceMap: Boolean(opts['sourceMap']),
    };

    const exitCode = await runBuild(input, flags, mergedConfig);
    process.exit(exitCode);
  });

// ---------------------------------------------------------------------------
// mailc watch
// ---------------------------------------------------------------------------

program
  .command('watch')
  .description('Watch a .mc file and recompile on change')
  .argument('<input>', 'Input .mc file to watch')
  .requiredOption('-o, --output <path>', 'Output HTML file (required)')
  .option('-d, --data <path>', 'JSON data file for template variables')
  .option('-c, --config <path>', 'Config file path')
  .option('--serve', 'Start a live-reload preview server', false)
  .option('--port <number>', 'Preview server port', '3000')
  .option('--open', 'Open browser when server starts', false)
  .option('-v, --verbose', 'Show warnings and compile stats', false)
  .action(async (input: string, opts: Record<string, unknown>) => {
    const cwd = process.cwd();

    let configResult;
    try {
      configResult = await loadConfig(cwd, opts['config'] as string | undefined);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(error(msg) + '\n');
      process.exit(EXIT_CONFIG_ERROR);
    }

    for (const w of configResult.warnings) {
      process.stderr.write(warn(w) + '\n');
    }

    const mergedConfig = mergeConfig(configResult.config);

    const flags: WatchFlags = {
      output: opts['output'] as string,
      data: opts['data'] as string | undefined,
      serve: Boolean(opts['serve']),
      port: parseInt(String(opts['port'] ?? '3000'), 10),
      open: Boolean(opts['open']),
      verbose: Boolean(opts['verbose']),
    };

    const exitCode = await runWatch(input, flags, mergedConfig);
    process.exit(exitCode);
  });

// ---------------------------------------------------------------------------
// mailc validate
// ---------------------------------------------------------------------------

program
  .command('validate')
  .description('Validate .mc or .json files without compiling')
  .argument('<input>', 'Input file (.mc or .json) or directory')
  .option('-c, --config <path>', 'Config file path')
  .addOption(
    new Option('-f, --format <format>', 'Output format').choices(['text', 'json']).default('text'),
  )
  .option('-v, --verbose', 'Show verbose output', false)
  .action(async (input: string, opts: Record<string, unknown>) => {
    const cwd = process.cwd();

    let configResult;
    try {
      configResult = await loadConfig(cwd, opts['config'] as string | undefined);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(error(msg) + '\n');
      process.exit(EXIT_CONFIG_ERROR);
    }

    for (const w of configResult.warnings) {
      process.stderr.write(warn(w) + '\n');
    }

    const mergedConfig = mergeConfig(configResult.config);

    const flags: ValidateFlags = {
      format: (opts['format'] as string) === 'json' ? 'json' : 'text',
      verbose: Boolean(opts['verbose']),
    };

    const exitCode = runValidate(input, flags, mergedConfig);
    process.exit(exitCode);
  });

// ---------------------------------------------------------------------------
// mailc init
// ---------------------------------------------------------------------------

program
  .command('init')
  .description('Initialize a new mailc project with starter templates')
  .argument('[directory]', 'Target directory (defaults to current)')
  .option('-y, --yes', 'Skip prompts and use defaults', false)
  .action((dir: string | undefined, opts: Record<string, unknown>) => {
    const exitCode = runInit(dir, { yes: Boolean(opts['yes']) });
    process.exit(exitCode);
  });

// ---------------------------------------------------------------------------
// mailc convert
// ---------------------------------------------------------------------------

program
  .command('convert')
  .description('Convert between .mc and JSON formats')
  .argument('<input>', 'Input file to convert')
  .addOption(
    new Option('--to <format>', 'Target format').choices(['json', 'mc']).makeOptionMandatory(),
  )
  .addOption(
    new Option('--from <format>', 'Source format override (auto-detected from extension)')
      .choices(['mc', 'json', 'mjml']),
  )
  .option('-o, --output <path>', 'Output file path (defaults to stdout)')
  .action((input: string, opts: Record<string, unknown>) => {
    const exitCode = runConvert(input, {
      to: opts['to'] as ConvertTarget,
      from: opts['from'] as ConvertSource | undefined,
      output: opts['output'] as string | undefined,
    });
    process.exit(exitCode);
  });

// ---------------------------------------------------------------------------
// mailc contract
// ---------------------------------------------------------------------------

program
  .command('contract')
  .description('Extract and display the data contract for a .mc or .json template')
  .argument('<input>', 'Input file (.mc or .json)')
  .addOption(
    new Option('-f, --format <format>', 'Output format').choices(['markdown', 'json']).default('markdown'),
  )
  .option('-o, --output <path>', 'Write output to a file instead of stdout')
  .option('-c, --config <path>', 'Config file path (optional)')
  .action(async (input: string, opts: Record<string, unknown>) => {
    const cwd = process.cwd();

    let configResult;
    try {
      configResult = await loadConfig(cwd, opts['config'] as string | undefined);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(error(msg) + '\n');
      process.exit(EXIT_CONFIG_ERROR);
    }

    for (const w of configResult.warnings) {
      process.stderr.write(warn(w) + '\n');
    }

    const mergedConfig = mergeConfig(configResult.config);

    const rawFormat = opts['format'] as string;
    const flags: ContractFlags = {
      format: rawFormat === 'json' ? 'json' : 'markdown',
      output: opts['output'] as string | undefined,
    };

    const exitCode = runContract(input, flags, mergedConfig);
    process.exit(exitCode);
  });

// ---------------------------------------------------------------------------
// Parse and run
// ---------------------------------------------------------------------------

program.parse();
