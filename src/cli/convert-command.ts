/**
 * `mailc convert` command implementation.
 *
 * Converts between .mc markup, JSON, and MJML formats.
 *
 * Supported conversions:
 * - `.mc` → JSON (`markupToJSON()`)
 * - JSON → `.mc` (`jsonToMarkup()`)
 * - MJML → `.mc` (best-effort tag mapping)
 *
 * Node-only: uses `node:fs` and `node:path`.
 *
 * @module cli/convert-command
 */

import fs from 'node:fs';
import path from 'node:path';
import { jsonToMarkup, markupToJSON } from '../json/index.js';
import type { MCNode } from '../json/schema.js';
import { success, error, warn } from './output.js';
import { EXIT_SUCCESS, EXIT_COMPILE_ERROR, EXIT_IO_ERROR } from './exit-codes.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Target format for conversion. */
export type ConvertTarget = 'json' | 'mc';

/** Source format override. */
export type ConvertSource = 'mc' | 'json' | 'mjml';

/** Options parsed from the `mailc convert` CLI flags. */
export interface ConvertFlags {
  /** Target format. */
  to: ConvertTarget;
  /** Source format override (auto-detected from extension if omitted). */
  from?: ConvertSource;
  /** Output file path. Undefined = stdout. */
  output?: string;
}

// ---------------------------------------------------------------------------
// MJML → mc tag mapping
// ---------------------------------------------------------------------------

/** Maps MJML tag names to mailc equivalents. */
const MJML_TAG_MAP: Record<string, string> = {
  'mj-body': 'mc-body',
  'mj-head': 'mc-head',
  'mj-section': 'mc-section',
  'mj-column': 'mc-column',
  'mj-group': 'mc-group',
  'mj-text': 'mc-text',
  'mj-image': 'mc-image',
  'mj-button': 'mc-button',
  'mj-divider': 'mc-divider',
  'mj-spacer': 'mc-spacer',
  'mj-raw': 'mc-raw',
  'mj-preview': 'mc-preview',
  'mj-title': 'mc-title',
  'mj-table': 'mc-table',
  'mj-attributes': 'mc-attributes',
  'mj-style': 'mc-style',
  'mj-wrapper': 'mc-section',
  'mj-hero': 'mc-hero',
  'mjml': 'mc',
};

/** MJML tags that don't have a mailc equivalent. */
const MJML_UNSUPPORTED = new Set([
  'mj-include',
  'mj-font',
  'mj-breakpoint',
  'mj-social',
  'mj-social-element',
  'mj-navbar',
  'mj-navbar-link',
  'mj-accordion',
  'mj-accordion-element',
  'mj-accordion-title',
  'mj-accordion-text',
  'mj-carousel',
  'mj-carousel-image',
]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Executes the `mailc convert` command.
 *
 * @param inputPath - The input file path.
 * @param flags     - Parsed CLI flags.
 * @returns Exit code.
 */
export function runConvert(
  inputPath: string,
  flags: ConvertFlags,
): number {
  const resolved = path.resolve(inputPath);

  if (!fs.existsSync(resolved)) {
    process.stderr.write(error(`File not found: ${resolved}`) + '\n');
    return EXIT_IO_ERROR;
  }

  let source: string;
  try {
    source = fs.readFileSync(resolved, 'utf-8');
  } catch {
    process.stderr.write(error(`Cannot read file: ${resolved}`) + '\n');
    return EXIT_IO_ERROR;
  }

  const sourceFormat = flags.from ?? detectFormat(resolved);
  const result = convert(source, sourceFormat, flags.to, resolved);

  if (!result.success) {
    process.stderr.write(error(result.error ?? 'Unknown error') + '\n');
    return EXIT_COMPILE_ERROR;
  }

  // Output warnings
  for (const w of result.warnings) {
    process.stderr.write(warn(w) + '\n');
  }

  // Write output
  if (flags.output) {
    const outPath = path.resolve(flags.output);
    const dir = path.dirname(outPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outPath, result.output ?? '', 'utf-8');
    process.stderr.write(
      success(`Converted ${path.basename(resolved)} → ${path.basename(outPath)}`) + '\n',
    );
  } else {
    process.stdout.write(result.output ?? '');
  }

  return EXIT_SUCCESS;
}

// ---------------------------------------------------------------------------
// Core conversion logic
// ---------------------------------------------------------------------------

/** Internal conversion result. */
interface ConvertResult {
  success: boolean;
  output?: string;
  error?: string;
  warnings: string[];
}

/**
 * Performs the actual conversion between formats.
 *
 * @param source       - Source file content.
 * @param sourceFormat - Detected or overridden source format.
 * @param targetFormat - Target format.
 * @param _filePath    - File path for error messages.
 * @returns Conversion result.
 */
function convert(
  source: string,
  sourceFormat: ConvertSource,
  targetFormat: ConvertTarget,
  _filePath: string,
): ConvertResult {
  // mc → json
  if (sourceFormat === 'mc' && targetFormat === 'json') {
    try {
      const mcNode = markupToJSON(source);
      const output = JSON.stringify(mcNode, null, 2) + '\n';
      return { success: true, output, warnings: [] };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Failed to parse .mc file: ${msg}`, warnings: [] };
    }
  }

  // json → mc
  if (sourceFormat === 'json' && targetFormat === 'mc') {
    try {
      let parsed = JSON.parse(source) as unknown;
      const obj = parsed as Record<string, unknown>;
      // Support MCDocument (has "template" key)
      if (obj['template']) {
        parsed = obj['template'];
      }
      const output = jsonToMarkup(parsed as MCNode) + '\n';
      return { success: true, output, warnings: [] };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Failed to convert JSON: ${msg}`, warnings: [] };
    }
  }

  // mjml → mc (best-effort)
  if (sourceFormat === 'mjml' && targetFormat === 'mc') {
    return convertMjmlToMc(source);
  }

  // mjml → json
  if (sourceFormat === 'mjml' && targetFormat === 'json') {
    const mcResult = convertMjmlToMc(source);
    if (!mcResult.success) return mcResult;
    try {
      const output = mcResult.output ?? '';
      const mcNode = markupToJSON(output);
      const jsonOutput = JSON.stringify(mcNode, null, 2) + '\n';
      return { success: true, output: jsonOutput, warnings: mcResult.warnings };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Failed to convert MJML→JSON: ${msg}`, warnings: mcResult.warnings };
    }
  }

  return {
    success: false,
    error: `Unsupported conversion: ${sourceFormat} → ${targetFormat}. ` +
      `Supported: mc→json, json→mc, mjml→mc, mjml→json`,
    warnings: [],
  };
}

/**
 * Best-effort MJML → .mc conversion.
 *
 * Uses regex-based tag replacement. Not a full parser — handles
 * the common cases and warns about constructs that don't map.
 *
 * @param source - MJML source string.
 * @returns Conversion result.
 */
function convertMjmlToMc(source: string): ConvertResult {
  const warnings: string[] = [];
  let output = source;

  // Step 1: Strip the outer <mjml> wrapper BEFORE tag replacement.
  //         MJML wraps everything in <mjml>...</mjml>, with the real
  //         content being <mj-head> and <mj-body> inside. We unwrap
  //         the <mjml> tag to avoid a duplicate <mc-body>.
  output = output.replace(/^\s*<mjml[^>]*>\s*/i, '');
  output = output.replace(/\s*<\/mjml>\s*$/i, '');

  // Step 2: Replace known MJML tags → mailc equivalents.
  //         Skip 'mjml' since we already stripped it above.
  for (const [mjTag, mcTag] of Object.entries(MJML_TAG_MAP)) {
    if (mjTag === 'mjml') continue;
    const openRegex = new RegExp(`<${mjTag}(\\s|>|/>)`, 'gi');
    const closeRegex = new RegExp(`</${mjTag}\\s*>`, 'gi');

    if (openRegex.test(output)) {
      output = output.replace(openRegex, `<${mcTag}$1`);
      output = output.replace(closeRegex, `</${mcTag}>`);
    }
  }

  // Step 3: Warn about unsupported tags. They are left in place (not
  // removed) so nothing is silently lost — compiling the result will flag
  // them as unknown components until manually converted.
  for (const tag of MJML_UNSUPPORTED) {
    const regex = new RegExp(`<${tag}[\\s>]`, 'gi');
    if (regex.test(output)) {
      warnings.push(`Unsupported MJML tag <${tag}> — no mailc equivalent yet. Left as-is; needs manual conversion.`);
    }
  }

  // Step 4: Wrap <mc-head> and <mc-body> as siblings inside <mc>.
  //         After stripping <mjml>, we have <mc-head>...</mc-head><mc-body>...
  //         The canonical mailc structure is <mc><mc-head>...</mc-head><mc-body>...</mc-body></mc>.
  const headMatch = output.match(/(<mc-head[\s\S]*?<\/mc-head>)\s*/);
  const bodyOpenMatch = output.match(/<mc-body[^>]*>/);
  if (headMatch && bodyOpenMatch) {
    const headBlock = headMatch[0];
    const headIdx = output.indexOf(headBlock);
    const bodyIdx = output.indexOf(bodyOpenMatch[0]);
    // If head is BEFORE body (sibling), wrap both in <mc>
    if (headIdx < bodyIdx) {
      const bodyCloseIdx = output.lastIndexOf('</mc-body>');
      const beforeHead = output.slice(0, headIdx).trimEnd();
      const afterBodyClose = output.slice(bodyCloseIdx + '</mc-body>'.length);
      const bodyContent = output.slice(headIdx + headBlock.length, bodyCloseIdx + '</mc-body>'.length);
      output = `${beforeHead}\n<mc>\n  ${headBlock.trim()}\n  ${bodyContent.trim()}\n</mc>${afterBodyClose}`;
    }
  } else if (bodyOpenMatch && !headMatch) {
    // No head — just wrap mc-body in <mc>
    output = output.replace(/(<mc-body[\s\S]*<\/mc-body>)/, '<mc>\n  $1\n</mc>');
  }

  return { success: true, output, warnings };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Detects the source format from the file extension.
 *
 * @param filePath - File path.
 * @returns Detected format.
 */
function detectFormat(filePath: string): ConvertSource {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.json') return 'json';
  if (ext === '.mjml') return 'mjml';
  return 'mc';
}
