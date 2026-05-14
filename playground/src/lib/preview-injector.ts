/**
 * preview-injector — builds the srcdoc for the preview iframe.
 *
 * SM-G5: With `sourceMap: true`, the compiler bakes `data-mc-id` attributes
 * directly into the clean HTML output. No `<!-- mc:source -->` markers are
 * emitted, so no scanning or stripping is needed here.
 *
 * Highlighting is applied via DIRECT DOM ACCESS on `iframe.contentDocument`
 * (not postMessage) — see PreviewPanel.tsx `applyHighlight()`.
 *
 * @module lib/preview-injector
 */

export interface PreviewSrcdocOptions {
  /**
   * When true, injects dark-mode CSS into the srcdoc so the preview
   * simulates how modern email clients (Apple Mail, iOS Mail) render
   * emails when the OS is in dark mode.
   *
   * Sets `color-scheme: dark` on `:root` which:
   *   1. Activates `@media (prefers-color-scheme: dark)` rules in mc-style blocks.
   *   2. Applies the browser's native dark-mode defaults (scrollbars, form controls).
   *   3. Forces a dark frame background to match the dark-client UI.
   */
  darkMode?: boolean
}

/**
 * Builds a complete `srcdoc` string for the preview iframe.
 *
 * The `html` argument is already clean (no markers) with `data-mc-id`
 * attributes baked in by the compiler. This function injects the
 * auto-resize script and optionally a dark-mode stylesheet.
 *
 * @param html    - Clean compiled email HTML with `data-mc-id` already present.
 * @param options - Optional preview options (e.g. darkMode).
 * @returns Ready-to-use `srcdoc` string for an `<iframe>`.
 */
export function buildPreviewSrcdoc(html: string, options?: PreviewSrcdocOptions): string {
  const darkMode = options?.darkMode ?? false

  // Injected when darkMode is true — activates prefers-color-scheme: dark
  // inside the iframe, matching what Apple Mail / iOS Mail do.
  const darkModeBlock = darkMode
    ? `<meta name="color-scheme" content="dark">
<style>
  :root { color-scheme: dark; }
  html  { background-color: #1c1c1e !important; }
</style>`
    : ''

  // Inline script: ONLY auto-resize. Highlighting is handled by the parent
  // via direct contentDocument manipulation (see PreviewPanel applyHighlight).
  const resizeScript = `<script>
(function () {
  function reportHeight() {
    var h = Math.max(
      document.body ? document.body.scrollHeight : 0,
      document.documentElement.scrollHeight
    );
    window.parent.postMessage({ type: 'mc-resize', height: h }, '*');
  }
  window.addEventListener('load', reportHeight);
  document.addEventListener('DOMContentLoaded', reportHeight);
  if (window.ResizeObserver) {
    new ResizeObserver(reportHeight).observe(document.documentElement);
  }
})();
</` + `script>`

  const injection = darkModeBlock + resizeScript

  if (html.includes('</head>')) {
    return html.replace('</head>', injection + '\n</head>')
  }
  return injection + '\n' + html
}
