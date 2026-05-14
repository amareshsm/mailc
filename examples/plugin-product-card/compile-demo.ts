/**
 * Demo runner — registers the product-card plugin, compiles the example
 * template, and prints the result.
 *
 * Run from the mailc repo root:
 *   pnpm tsx examples/plugin-product-card/compile-demo.ts
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { compile, introspect, getRegisteredComponents } from '../../src/index.js';
import { registerProductCard } from './product-card-plugin.js';

// Register the plugin BEFORE any compile() call.
registerProductCard();

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, 'template.mc'), 'utf8');

console.log('=== Registered components ===');
console.log(getRegisteredComponents().filter((t) => t.startsWith('acme-')));

console.log('\n=== Plugin spec (via introspect.component) ===');
const spec = introspect.component('acme-product-card');
console.log({
  type: spec?.type,
  description: spec?.description,
  required: spec?.requiredAttributes.map((a) => a.name),
  optional: spec?.optionalAttributes.map((a) => a.name),
  cssPropertyAttributes: spec?.cssPropertyAttributes.map((a) => a.name),
});

console.log('\n=== Compile result ===');
const result = compile(source);
if (result.errors.length > 0) {
  console.error('Errors:', result.errors);
  process.exit(1);
}
console.log(result.html);

console.log('\n=== Stats ===');
console.log({
  outputBytes: (result.html ?? '').length,
  warnings: result.warnings.length,
  partial: result.partial,
});
