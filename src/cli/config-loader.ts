/**
 * Config file loader for the CLI.
 *
 * Handles the auto-detection chain:
 * 1. `--config` CLI flag (explicit path)
 * 2. `mailc.config.js` (ESM JS)
 * 3. `mailc.config.mjs` (ESM JS)
 * 4. `mailc.config.json` (JSON)
 * 5. `.mailcrc` (JSON)
 * 6. `package.json` → `"mailc"` key
 *
 * Node-only: uses `node:fs` and `node:path`. Only imported from CLI code.
 *
 * @module cli/config-loader
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { MailcConfig } from '../types.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Config file names in priority order. */
const CONFIG_FILES = [
  'mailc.config.js',
  'mailc.config.mjs',
  'mailc.config.json',
  '.mailcrc',
  'package.json',
] as const;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Result of loading a config file.
 */
export interface ConfigLoadResult {
  /** The loaded partial config (empty object if no config found). */
  config: Partial<MailcConfig>;
  /** The path to the config file that was loaded (undefined if defaults used). */
  configPath: string | undefined;
  /** Any warnings generated during loading. */
  warnings: string[];
}

/**
 * Loads mailc configuration from the filesystem.
 *
 * If `explicitPath` is provided (from `--config` flag), only that file
 * is loaded. Otherwise, the auto-detection chain is followed.
 *
 * @param cwd          - The working directory to search from.
 * @param explicitPath - Explicit config path from `--config` CLI flag.
 * @returns The loaded config, resolved path, and any warnings.
 * @throws Error with a descriptive message if explicit path doesn't exist
 *         or the config file is malformed.
 */
export async function loadConfig(
  cwd: string,
  explicitPath?: string,
): Promise<ConfigLoadResult> {
  const warnings: string[] = [];

  // Explicit --config flag: load only that file
  if (explicitPath) {
    const resolved = path.resolve(cwd, explicitPath);

    if (!fs.existsSync(resolved)) {
      throw new Error(`Config file not found: ${resolved}`);
    }

    const config = await loadSingleConfig(resolved);
    return { config, configPath: resolved, warnings };
  }

  // Auto-detection: first found wins, warn if multiple exist
  const found: string[] = [];

  for (const name of CONFIG_FILES) {
    const candidate = path.resolve(cwd, name);
    if (fs.existsSync(candidate)) {
      found.push(candidate);
    }
  }

  if (found.length === 0) {
    return { config: {}, configPath: undefined, warnings };
  }

  if (found.length > 1) {
    const names = found.map((f) => path.basename(f)).join(', ');
    warnings.push(`Multiple config files found: ${names}. Using ${path.basename(found[0]!)}.`);
  }

  const configPath = found[0]!;
  const config = await loadSingleConfig(configPath);
  return { config, configPath, warnings };
}

// ---------------------------------------------------------------------------
// Internal loaders
// ---------------------------------------------------------------------------

/**
 * Loads a single config file by path.
 *
 * Dispatches to the appropriate loader based on file extension.
 *
 * @param filePath - Absolute path to the config file.
 * @returns The partial mailc config.
 */
async function loadSingleConfig(filePath: string): Promise<Partial<MailcConfig>> {
  const ext = path.extname(filePath);
  const basename = path.basename(filePath);

  if (ext === '.js' || ext === '.mjs') {
    return loadJsConfig(filePath);
  }

  if (ext === '.json' || basename === '.mailcrc') {
    return loadJsonConfig(filePath, basename === 'package.json');
  }

  throw new Error(`Unsupported config file format: ${basename}`);
}

/**
 * Loads a JS config file via dynamic import.
 *
 * Supports ESM default exports: `export default { ... }`.
 *
 * @param filePath - Absolute path to the .js config file.
 * @returns The partial mailc config.
 */
async function loadJsConfig(filePath: string): Promise<Partial<MailcConfig>> {
  const fileUrl = pathToFileURL(filePath).href;
  const mod = await import(fileUrl) as { default?: Partial<MailcConfig> };

  if (!mod.default || typeof mod.default !== 'object') {
    throw new Error(
      `Config file ${path.basename(filePath)} must have a default export. ` +
      `Example: export default { width: 600 }`,
    );
  }

  return mod.default;
}

/**
 * Loads a JSON config file.
 *
 * For `package.json`, extracts the `"mailc"` key.
 * For `.mailcrc` and `mailc.config.json`, uses the entire file.
 *
 * @param filePath     - Absolute path to the JSON config file.
 * @param isPackageJson - Whether this is a package.json file.
 * @returns The partial mailc config.
 */
function loadJsonConfig(
  filePath: string,
  isPackageJson: boolean,
): Partial<MailcConfig> {
  const raw = fs.readFileSync(filePath, 'utf-8');

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error(`Invalid JSON in ${path.basename(filePath)}`);
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error(`Config file ${path.basename(filePath)} must contain a JSON object`);
  }

  if (isPackageJson) {
    const pkg = parsed as Record<string, unknown>;
    const mailcConfig = pkg['mailc'];
    if (!mailcConfig || typeof mailcConfig !== 'object') {
      // package.json exists but has no "mailc" key — treat as no config
      return {};
    }
    return mailcConfig as Partial<MailcConfig>;
  }

  return parsed as Partial<MailcConfig>;
}
