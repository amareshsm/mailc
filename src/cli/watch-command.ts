/**
 * `mailc watch` command implementation.
 *
 * Uses chokidar to watch a `.mc` source file for changes, recompiles on every
 * save, writes the result to the output file, and optionally starts the
 * preview HTTP server for in-browser live reload.
 *
 * Responsibilities:
 * - Resolve input to an absolute `.mc` file path.
 * - Perform an initial compile immediately on start.
 * - Watch the file with chokidar; re-compile on every `change` event.
 * - Print coloured compile-time stats to stdout.
 * - If `--serve` is set: start {@link PreviewServer}, update HTML on each
 *   compile, and broadcast an SSE `reload` event.
 * - If `--open` is set: open the browser once the server is ready.
 *
 * Node-only: uses `node:fs`, `node:path`, `node:child_process` (open),
 * and `chokidar`. Only imported from `src/cli.ts`.
 *
 * @module cli/watch-command
 */

import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import chokidar from 'chokidar';
import type { MailcConfig } from '../types.js';
import { compile } from '../compile.js';
import { success, warn, error, info } from './output.js';
import { EXIT_SUCCESS, EXIT_IO_ERROR } from './exit-codes.js';
import { startPreviewServer } from './preview-server.js';
import type { PreviewServerHandle } from './preview-server.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Options parsed from the `mailc watch` CLI flags. */
export interface WatchFlags {
  /** Output file path. Required — watch mode always writes to a file. */
  output: string;
  /** Start the in-browser preview server. */
  serve: boolean;
  /** TCP port for the preview server. */
  port: number;
  /** Open the browser automatically when the server is ready. */
  open: boolean;
  /** Show verbose compile stats. */
  verbose: boolean;
  /** Path to a JSON data file for template variables. */
  data?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default preview server port. */
const DEFAULT_PORT = 3000;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Executes the `mailc watch` command.
 *
 * Compiles on start, then watches the source file for changes.
 * Returns a cleanup function that shuts down the watcher and server (used in
 * tests / programmatic usage). In normal CLI usage the process keeps running
 * until SIGINT.
 *
 * @param inputPath    - The `.mc` source file to watch.
 * @param flags        - Parsed CLI flags.
 * @param mergedConfig - The merged MailcConfig.
 * @returns Promise that resolves with an exit code when a fatal error occurs,
 *          or keeps running. In normal operation it never resolves.
 */
export async function runWatch(
  inputPath: string,
  flags: WatchFlags,
  mergedConfig: Partial<MailcConfig>,
): Promise<number> {
  const resolved = path.resolve(inputPath);

  // ── Validate input ──────────────────────────────────────────────────────
  if (!fs.existsSync(resolved)) {
    process.stderr.write(error(`File not found: ${resolved}`) + '\n');
    return EXIT_IO_ERROR;
  }

  const ext = path.extname(resolved).toLowerCase();
  if (ext !== '.mc') {
    process.stderr.write(error(`Watch only supports .mc files, got: ${ext}`) + '\n');
    return EXIT_IO_ERROR;
  }

  const outputPath = path.resolve(flags.output);

  // ── Start preview server (optional) ────────────────────────────────────
  let previewHandle: PreviewServerHandle | null = null;

  if (flags.serve) {
    const port = flags.port || DEFAULT_PORT;
    try {
      previewHandle = await startPreviewServer(port, resolved);
      process.stdout.write(
        info(`Preview server started → http://localhost:${port}`) + '\n',
      );

      if (flags.open) {
        openBrowser(`http://localhost:${port}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(error(`Could not start preview server: ${msg}`) + '\n');
      return EXIT_IO_ERROR;
    }
  }

  // ── Initial compile ─────────────────────────────────────────────────────
  _compileAndWrite(resolved, outputPath, flags, mergedConfig, previewHandle);

  // ── Watcher ─────────────────────────────────────────────────────────────
  const watcher = chokidar.watch(resolved, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 80, pollInterval: 20 },
  });

  watcher.on('change', () => {
    _compileAndWrite(resolved, outputPath, flags, mergedConfig, previewHandle);
  });

  watcher.on('error', (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(error(`Watcher error: ${msg}`) + '\n');
  });

  process.stdout.write(
    info(`Watching ${path.relative(process.cwd(), resolved)} …  (Ctrl+C to stop)`) + '\n',
  );

  // ── Graceful shutdown ────────────────────────────────────────────────────
  const shutdown = async (): Promise<void> => {
    await watcher.close();
    if (previewHandle) await previewHandle.close();
    process.stdout.write('\n' + info('Watch stopped.') + '\n');
    process.exit(EXIT_SUCCESS);
  };

  process.once('SIGINT', () => void shutdown());
  process.once('SIGTERM', () => void shutdown());

  // Keep alive — never resolves in normal operation.
  return new Promise<number>(() => {
    /* intentionally empty */
  });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Compiles a single `.mc` file, writes the HTML to disk, and optionally
 * notifies the preview server.
 *
 * Exported for tests (underscore prefix = not public CLI API).
 *
 * @param srcPath      - Absolute path to the `.mc` source file.
 * @param outPath      - Absolute path to write the compiled HTML.
 * @param flags        - Watch flags (verbose, serve, etc.).
 * @param config       - Merged MailcConfig.
 * @param preview      - Optional preview server handle to notify.
 */
export function _compileAndWrite(
  srcPath: string,
  outPath: string,
  flags: WatchFlags,
  config: Partial<MailcConfig>,
  preview: PreviewServerHandle | null,
): void {
  const label = path.relative(process.cwd(), srcPath);
  const start = Date.now();

  let source: string;
  try {
    source = fs.readFileSync(srcPath, 'utf-8');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(error(`Cannot read ${label}: ${msg}`) + '\n');
    preview?.notifyError({ message: `Cannot read file: ${msg}` });
    return;
  }

  let data: Record<string, unknown> | undefined;
  if (flags.data) {
    try {
      const raw = fs.readFileSync(path.resolve(flags.data), 'utf-8');
      data = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      process.stderr.write(error(`Cannot read data file: ${flags.data}`) + '\n');
    }
  }

  const result = compile(source, { config, data });
  const compileMs = Date.now() - start;

  // ── Compile errors / warnings ────────────────────────────────────────────
  // Errors live in result.errors; warnings live in result.warnings — they are
  // separate arrays on CompileResult, not one array split by severity.
  const errors = result.errors;
  const warnings = result.warnings;

  // Genuinely unrecoverable (tokenizer/parser crash) — cannot preview anything.
  if (result.html === null) {
    const messages = errors.map((e) => e.message);
    process.stderr.write(error(`✖  ${label} — ${errors.length} error(s)\n`) + '\n');
    for (const e of errors) {
      process.stderr.write(`   ${e.message}\n`);
    }
    preview?.notifyError({ message: messages[0] ?? 'Compilation failed' });
    return;
  }

  // ── Write output (best-effort even when errors present in watch mode) ─────
  // Watch mode always writes so the preview stays live. The error banner in
  // the preview communicates that the output may be incomplete.
  try {
    const dir = path.dirname(outPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outPath, result.html, 'utf-8');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(error(`Cannot write ${outPath}: ${msg}`) + '\n');
    preview?.notifyError({ message: `Cannot write output: ${msg}` });
    return;
  }

  // ── Console output ───────────────────────────────────────────────────────
  if (errors.length > 0) {
    process.stderr.write(error(`✖  ${label} — ${errors.length} error(s) (partial preview)\n`) + '\n');
    for (const e of errors) {
      process.stderr.write(`   ${e.message}\n`);
    }
  } else {
    const warningNote =
      warnings.length > 0 ? ` (${warnings.length} warning${warnings.length > 1 ? 's' : ''})` : '';
    process.stdout.write(
      success(`✔  ${label} → ${path.relative(process.cwd(), outPath)}`) +
        `  ${compileMs}ms${warningNote}\n`,
    );
  }

  if (flags.verbose) {
    for (const w of warnings) {
      process.stdout.write(warn(`   ${w.message}`) + '\n');
    }
  }

  // ── Notify preview server ────────────────────────────────────────────────
  if (preview) {
    preview.notifyReload(result.html, {
      compileMs,
      warnings: [...errors, ...warnings].map((w) => w.message),
    });
  }
}

/**
 * Opens a URL in the default system browser (best-effort, no crash on failure).
 *
 * @param url - The URL to open.
 */
function openBrowser(url: string): void {
  const cmd =
    process.platform === 'darwin'
      ? `open "${url}"`
      : process.platform === 'win32'
        ? `start "" "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) {
      process.stderr.write(warn(`Could not open browser: ${err.message}`) + '\n');
    }
  });
}
