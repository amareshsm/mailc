/**
 * Preview shell HTML generator.
 *
 * Produces the browser-side HTML page that wraps the compiled email output.
 * Supports three preview modes: Desktop (600 px), Mobile (375 px scaled),
 * and Custom (user-specified width). Listens for Server-Sent Events on
 * `/events` to auto-reload when the source file changes.
 *
 * Node-only: used only inside `preview-server.ts` which is CLI-only.
 *
 * @module cli/preview-html
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Width of the desktop email preview iframe (pixels). */
const DESKTOP_WIDTH_PX = 600;

/** Width of the mobile email preview iframe (pixels). */
const MOBILE_WIDTH_PX = 375;

/** Scale factor applied to the mobile iframe so it fits visually. */
const MOBILE_SCALE = 0.85;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generates the HTML shell page served at `http://localhost:<port>`.
 *
 * @param port    - The port the preview server is running on.
 * @param srcFile - The source file being watched, shown in the header.
 * @returns Full HTML document string.
 */
export function buildPreviewShell(port: number, srcFile: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>mailc preview — ${escapeHtml(srcFile)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0f0f0f;
      color: #e4e4e7;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* ── Header ─────────────────────────────────────────────────────────── */
    header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 20px;
      background: #18181b;
      border-bottom: 1px solid #27272a;
      position: sticky;
      top: 0;
      z-index: 10;
      flex-wrap: wrap;
    }

    .logo {
      font-weight: 700;
      font-size: 15px;
      color: #a78bfa;
      letter-spacing: -0.3px;
    }

    .file-name {
      font-size: 13px;
      color: #71717a;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }

    /* ── Mode toggle ─────────────────────────────────────────────────────── */
    .mode-toggle {
      display: flex;
      align-items: center;
      gap: 2px;
      background: #09090b;
      border: 1px solid #27272a;
      border-radius: 7px;
      padding: 3px;
    }

    .mode-btn {
      background: transparent;
      border: none;
      border-radius: 5px;
      color: #71717a;
      cursor: pointer;
      font-size: 12px;
      font-family: inherit;
      font-weight: 500;
      padding: 5px 12px;
      transition: background 0.15s, color 0.15s;
      white-space: nowrap;
    }

    .mode-btn:hover { color: #e4e4e7; }

    .mode-btn.active {
      background: #27272a;
      color: #e4e4e7;
    }

    /* ── Custom width input ──────────────────────────────────────────────── */
    .custom-width-row {
      display: none;
      align-items: center;
      gap: 8px;
      background: #09090b;
      border: 1px solid #27272a;
      border-radius: 7px;
      padding: 4px 10px;
    }

    .custom-width-row.visible { display: flex; }

    .custom-width-row label {
      font-size: 12px;
      color: #71717a;
      white-space: nowrap;
    }

    .custom-width-row input {
      background: transparent;
      border: none;
      color: #e4e4e7;
      font-family: monospace;
      font-size: 13px;
      width: 52px;
      text-align: right;
      outline: none;
    }

    .custom-width-row input::-webkit-inner-spin-button,
    .custom-width-row input::-webkit-outer-spin-button { opacity: 1; }

    .custom-width-row span {
      font-size: 12px;
      color: #52525b;
    }

    /* ── Status indicators ───────────────────────────────────────────────── */
    #status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e;
      flex-shrink: 0;
      transition: background 0.2s;
    }

    #status-dot.reloading { background: #f59e0b; }
    #status-dot.error     { background: #ef4444; }

    #status-text {
      font-size: 12px;
      color: #71717a;
      white-space: nowrap;
    }

    /* ── Warning banner ──────────────────────────────────────────────────── */
    #warnings-bar {
      display: none;
      background: #451a03;
      border-bottom: 1px solid #92400e;
      padding: 8px 20px;
      font-size: 12px;
      color: #fbbf24;
    }

    #warnings-bar.visible { display: block; }

    /* ── Preview layout ──────────────────────────────────────────────────── */
    main {
      flex: 1;
      display: flex;
      padding: 32px 24px;
      justify-content: center;
      align-items: flex-start;
    }

    .preview-panel {
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: center;
    }

    .panel-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: #52525b;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .panel-label .dim { color: #3f3f46; font-weight: 400; letter-spacing: 0; }

    .iframe-wrapper {
      background: #ffffff;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 4px 32px rgba(0,0,0,0.6);
      flex-shrink: 0;
      transition: width 0.2s;
    }

    iframe {
      border: none;
      display: block;
      transition: width 0.2s;
    }

    /* ── Footer ─────────────────────────────────────────────────────────── */
    footer {
      padding: 10px 20px;
      background: #18181b;
      border-top: 1px solid #27272a;
      font-size: 11px;
      color: #52525b;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>

  <header>
    <span class="logo">mailc</span>
    <span class="file-name">${escapeHtml(srcFile)}</span>

    <div class="mode-toggle">
      <button class="mode-btn active" data-mode="desktop" title="Desktop view (${DESKTOP_WIDTH_PX}px)">
        ▭ Desktop
      </button>
      <button class="mode-btn" data-mode="mobile" title="Mobile view (${MOBILE_WIDTH_PX}px)">
        ☐ Mobile
      </button>
      <button class="mode-btn" data-mode="custom" title="Custom width">
        ◈ Custom
      </button>
    </div>

    <div class="custom-width-row" id="custom-width-row">
      <label for="custom-width-input">Width</label>
      <input
        id="custom-width-input"
        type="number"
        min="240"
        max="1600"
        value="480"
        step="10"
      />
      <span>px</span>
    </div>

    <div id="status-dot"></div>
    <span id="status-text">Watching…</span>
  </header>

  <div id="warnings-bar"></div>

  <main>
    <div class="preview-panel" id="preview-panel">
      <div class="panel-label" id="panel-label">
        Desktop <span class="dim">${DESKTOP_WIDTH_PX}px</span>
      </div>
      <div class="iframe-wrapper" id="iframe-wrapper" style="width:${DESKTOP_WIDTH_PX}px;">
        <iframe
          id="preview-frame"
          src="/preview"
          width="${DESKTOP_WIDTH_PX}"
          height="700"
          title="Email preview"
          scrolling="yes">
        </iframe>
      </div>
    </div>
  </main>

  <footer>
    <span>mailc preview server — port ${port}</span>
    <span id="compile-stats"></span>
  </footer>

  <script>
    const DESKTOP_WIDTH  = ${DESKTOP_WIDTH_PX};
    const MOBILE_WIDTH   = ${MOBILE_WIDTH_PX};
    const MOBILE_SCALE   = ${MOBILE_SCALE};

    const dot            = document.getElementById('status-dot');
    const statusText     = document.getElementById('status-text');
    const warningsBar    = document.getElementById('warnings-bar');
    const statsEl        = document.getElementById('compile-stats');
    const iframeEl       = document.getElementById('preview-frame');
    const wrapperEl      = document.getElementById('iframe-wrapper');
    const panelLabelEl   = document.getElementById('panel-label');
    const customWidthRow = document.getElementById('custom-width-row');
    const customWidthIn  = document.getElementById('custom-width-input');

    let currentMode = 'desktop';

    // ── Mode switching ──────────────────────────────────────────────────────
    function applyMode(mode) {
      currentMode = mode;

      // Update button states
      document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
      });

      // Show/hide custom width input
      customWidthRow.classList.toggle('visible', mode === 'custom');

      if (mode === 'desktop') {
        setPreviewWidth(DESKTOP_WIDTH, 1);
        setPanelLabel('Desktop', DESKTOP_WIDTH + 'px');
      } else if (mode === 'mobile') {
        setPreviewWidth(MOBILE_WIDTH, MOBILE_SCALE);
        setPanelLabel('Mobile', MOBILE_WIDTH + 'px');
      } else {
        const w = parseInt(customWidthIn.value, 10) || 480;
        setPreviewWidth(w, 1);
        setPanelLabel('Custom', w + 'px');
      }
    }

    function setPreviewWidth(iframeWidth, scale) {
      const displayWidth = Math.round(iframeWidth * scale);

      iframeEl.width  = iframeWidth;
      iframeEl.style.transform       = scale < 1 ? 'scale(' + scale + ')' : '';
      iframeEl.style.transformOrigin = scale < 1 ? '0 0' : '';

      wrapperEl.style.width  = displayWidth + 'px';
      // Adjust wrapper height to account for scale so it doesn't clip content
      if (scale < 1) {
        wrapperEl.style.height = Math.round(700 * scale) + 'px';
        iframeEl.height = 700;
      } else {
        wrapperEl.style.height = '';
        iframeEl.height = 700;
      }
    }

    function setPanelLabel(modeName, widthStr) {
      panelLabelEl.innerHTML =
        modeName + ' <span class="dim">' + escHtml(widthStr) + '</span>';
    }

    // ── Button clicks ───────────────────────────────────────────────────────
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => applyMode(btn.dataset.mode));
    });

    // ── Custom width input ──────────────────────────────────────────────────
    customWidthIn.addEventListener('input', () => {
      if (currentMode === 'custom') applyMode('custom');
    });

    customWidthIn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') applyMode('custom');
    });

    // ── Status helpers ──────────────────────────────────────────────────────
    function setStatus(state, text) {
      dot.className = state;
      statusText.textContent = text;
    }

    // ── SSE connection ──────────────────────────────────────────────────────
    const es = new EventSource('/events');

    es.addEventListener('reload', (e) => {
      const data = JSON.parse(e.data);
      setStatus('reloading', 'Reloading…');

      if (data.warnings && data.warnings.length > 0) {
        warningsBar.className = 'visible';
        warningsBar.innerHTML =
          '<strong>⚠ Warnings:</strong> ' +
          data.warnings.map(w => escHtml(w)).join(' &nbsp;·&nbsp; ');
        dot.className = 'error';
      } else {
        warningsBar.className = '';
        dot.className = '';
      }

      iframeEl.src = '/preview?t=' + Date.now();

      if (data.compileMs !== undefined) {
        statsEl.textContent = 'compiled in ' + data.compileMs + 'ms';
      }

      setTimeout(() => setStatus('', 'Watching…'), 600);
    });

    es.addEventListener('error-event', (e) => {
      const data = JSON.parse(e.data);
      setStatus('error', 'Error');
      warningsBar.className = 'visible';
      warningsBar.innerHTML = '<strong>✖ Error:</strong> ' + escHtml(data.message);
    });

    es.onerror = () => setStatus('error', 'Disconnected');

    function escHtml(s) {
      return String(s)
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;');
    }
  </script>

</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Minimal HTML-escape for values rendered into the preview shell.
 *
 * @param s - Raw string.
 * @returns HTML-escaped string.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
