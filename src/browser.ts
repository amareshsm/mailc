/**
 * mailc — Browser entry point
 *
 * Same API as the Node entry. This file exists as a separate
 * build target so bundlers and CDNs get a browser-optimized build.
 *
 * Usage (CDN):
 *   <script src="https://cdn.jsdelivr.net/npm/mailc"></script>
 *   <script>
 *     const { html } = mailc.compile('<mc><mc-body>...</mc-body></mc>');
 *   </script>
 *
 * Usage (ES module):
 *   import { compile } from 'https://esm.sh/mailc';
 */
export * from './index.js';
