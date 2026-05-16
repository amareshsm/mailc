/**
 * Template compiler script.
 * Compiles all *.mc files in templates/ → output/*.html
 * Usage: tsx scripts/compile-templates.ts [--watch]
 */

import fs from 'node:fs';
import path from 'node:path';
import { compile, mergeConfig } from '../src/index.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const TEMPLATES_DIR = path.join(ROOT, 'templates');
const DATA_DIR = path.join(TEMPLATES_DIR, 'data');
const OUTPUT_DIR = path.join(ROOT, 'output');
const WATCH = process.argv.includes('--watch');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

/** Load JSON data file paired with a template, if present. */
function loadData(templateFile: string): Record<string, unknown> {
  const base = path.basename(templateFile, '.mc');
  const dataFile = path.join(DATA_DIR, `${base}.json`);
  if (fs.existsSync(dataFile)) {
    return JSON.parse(fs.readFileSync(dataFile, 'utf8')) as Record<string, unknown>;
  }
  return {};
}

/** Compile a single template file and write HTML to output/. */
function compileTemplate(templateFile: string): boolean {
  const start = performance.now();
  const base = path.basename(templateFile, '.mc');
  const outputFile = path.join(OUTPUT_DIR, `${base}.html`);

  const source = fs.readFileSync(templateFile, 'utf8');
  const data = loadData(templateFile);

  const config = mergeConfig({
    accessibility: { enabled: true, warnMissingAlt: true, enforceAltText: false, checkContrast: true },
    output: { minify: false, comments: false },
  });

  // Auto-detect styling mode. Compile in class mode first; if the template
  // uses CSS-property attributes the compiler emits CSS_ATTR_IN_CLASS_MODE —
  // a precise signal (not a heuristic) that it's an attribute-style template,
  // so transparently recompile in attribute mode. This replaces a hardcoded
  // template-name allowlist that silently broke whenever a new attribute
  // template was added without updating the list.
  let templateStyle: 'class' | 'attribute' = 'class';
  let result = compile(source, { filename: templateFile, data, templateStyle, config });

  const usesAttributeStyling = [...result.errors, ...result.warnings].some(
    (m) => m.code === 'CSS_ATTR_IN_CLASS_MODE',
  );
  if (usesAttributeStyling) {
    templateStyle = 'attribute';
    result = compile(source, { filename: templateFile, data, templateStyle, config });
  }

  if (result.html === null) {
    console.log(`  ${RED}✘${RESET} ${base}.html ${DIM}(compile failed)${RESET}`);
    for (const err of result.errors) {
      console.log(`    ${RED}Error${RESET}: ${err.message}`);
    }
    return false;
  }
  const html = result.html;

  const elapsed = (performance.now() - start).toFixed(1);

  // Fail on fatal parse/compile errors in result.errors
  const fatalErrors = result.errors.filter((e) => e.severity === 'error');
  // Also fail on CSS_ATTR_IN_CLASS_MODE violations — those land in result.warnings
  // because compilation still produces output, but they represent developer errors.
  const classViolations = result.warnings.filter((w) => w.severity === 'error');
  const allFatal = [...fatalErrors, ...classViolations];

  if (allFatal.length > 0) {
    console.log(`  ${RED}✘${RESET} ${base}.html ${DIM}(${elapsed}ms)${RESET}`);
    for (const err of allFatal) {
      console.log(`    ${RED}Error${RESET}: ${err.message}`);
    }
    return false;
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(outputFile, html, 'utf8');

  const sizeKb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
  console.log(`  ${GREEN}✔${RESET} ${base}.html ${DIM}${sizeKb}kb · ${elapsed}ms · ${templateStyle} mode${RESET}`);

  const warnings = result.warnings.filter((e) => e.severity === 'warning');
  for (const w of warnings) {
    console.log(`    ${YELLOW}Warning${RESET}: ${w.message}`);
  }

  return true;
}

/** Compile all templates in the templates/ directory. */
function compileAll(): boolean {
  const files = fs
    .readdirSync(TEMPLATES_DIR)
    .filter((f) => f.endsWith('.mc'))
    .sort()
    .map((f) => path.join(TEMPLATES_DIR, f));

  if (files.length === 0) {
    console.log(`${YELLOW}No *.mc files found in templates/${RESET}`);
    return true;
  }

  console.log(`\n${CYAN}mailc template compiler${RESET} — ${files.length} template(s)\n`);

  let allOk = true;
  for (const file of files) {
    if (!compileTemplate(file)) allOk = false;
  }

  console.log('');
  return allOk;
}

if (WATCH) {
  console.log(`${CYAN}Watching templates/ for changes...${RESET} (Ctrl+C to stop)\n`);
  compileAll();

  fs.watch(TEMPLATES_DIR, { recursive: true }, (_event, filename) => {
    if (!filename) return;
    console.log(`${DIM}Changed: ${filename}${RESET}`);
    compileAll();
  });
} else {
  const ok = compileAll();
  process.exit(ok ? 0 : 1);
}
