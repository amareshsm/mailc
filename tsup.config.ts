import { defineConfig } from 'tsup';

export default defineConfig([
  // Node builds (ESM + CJS + declarations)
  // Includes the introspect sub-path as a separate entry so consumers can
  // `import { introspect } from 'mailc/introspect'` without paying for it
  // in the main bundle. Browser/IIFE builds intentionally omit introspect —
  // it is a dev-time tooling API, not runtime email-compilation code.
  {
    entry: ['src/index.ts', 'src/cli.ts', 'src/introspect.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    splitting: true,
    clean: true,
    sourcemap: true,
    target: 'node20',
    outDir: 'dist',
    treeshake: true,
  },
  // Browser ESM — js-beautify is kept external so bundlers (Vite, webpack,
  // Rollup) resolve it from the consumer's node_modules. The static import in
  // formatter.ts produces a real `import { html } from 'js-beautify'` in the
  // output — no CJS shim, works correctly in browser ESM context. Consumers
  // who need prettification must have js-beautify in their dependencies.
  {
    entry: { browser: 'src/browser.ts' },
    format: ['esm'],
    dts: false,
    globalName: 'mailc',
    splitting: false,
    clean: false,
    sourcemap: true,
    target: 'esnext',
    outDir: 'dist',
    treeshake: true,
    minify: true,
    platform: 'browser',
    external: ['js-beautify'],
  },
  // Browser IIFE — CDN build with js-beautify bundled inline.
  // compile() always returns prettified HTML.
  // Use: <script src="https://unpkg.com/mailc/dist/browser.global.js"></script>
  {
    entry: { browser: 'src/browser.ts' },
    format: ['iife'],
    dts: false,
    globalName: 'mailc',
    splitting: false,
    clean: false,
    sourcemap: true,
    target: 'esnext',
    outDir: 'dist',
    treeshake: true,
    minify: true,
    platform: 'browser',
    noExternal: ['js-beautify'],
  },
]);
