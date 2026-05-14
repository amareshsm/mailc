/**
 * Preview HTTP server.
 *
 * Serves the preview shell and compiled email HTML. Broadcasts Server-Sent
 * Events (SSE) to connected browser clients so the page auto-reloads after
 * every successful recompile.
 *
 * Endpoints:
 *   GET /          → HTML shell (desktop + mobile side-by-side)
 *   GET /preview   → The latest compiled email HTML (inside an iframe)
 *   GET /events    → SSE stream — sends `reload` and `error-event` events
 *   GET /health    → 200 OK plain-text (used by tests)
 *
 * Node-only: uses `node:http`. Only imported from watch-command.ts (CLI).
 *
 * @module cli/preview-server
 */

import http from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { buildPreviewShell } from './preview-html.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Payload sent with a `reload` SSE event. */
export interface ReloadPayload {
  /** Compile duration in milliseconds. */
  compileMs: number;
  /** Warning messages from the last compile (may be empty). */
  warnings: string[];
}

/** Payload sent with an `error-event` SSE event. */
export interface ErrorPayload {
  /** Human-readable error message. */
  message: string;
}

/** Handle returned by {@link startPreviewServer}. */
export interface PreviewServerHandle {
  /** The underlying Node http.Server instance. */
  server: http.Server;
  /** Port the server is listening on. */
  port: number;
  /**
   * Updates the in-memory compiled HTML and broadcasts a `reload` event to
   * all connected SSE clients.
   */
  notifyReload: (html: string, payload: ReloadPayload) => void;
  /**
   * Broadcasts an `error-event` to all connected SSE clients without
   * changing the cached HTML.
   */
  notifyError: (payload: ErrorPayload) => void;
  /** Gracefully closes the server. */
  close: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

/** SSE client response objects currently connected. */
type SseClient = ServerResponse;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Starts the preview HTTP server on the given port.
 *
 * @param port    - TCP port to listen on.
 * @param srcFile - Source file path displayed in the preview shell header.
 * @returns A {@link PreviewServerHandle} for controlling the server.
 */
export function startPreviewServer(
  port: number,
  srcFile: string,
): Promise<PreviewServerHandle> {
  return new Promise((resolve, reject) => {
    let latestHtml = buildLoadingPage();
    const clients = new Set<SseClient>();

    const shell = buildPreviewShell(port, srcFile);

    const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
      const url = req.url ?? '/';
      const path = url.split('?')[0];

      if (path === '/') {
        serveHtml(res, shell);
        return;
      }

      if (path === '/preview') {
        serveHtml(res, latestHtml);
        return;
      }

      if (path === '/events') {
        registerSseClient(res, clients);
        return;
      }

      if (path === '/health') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('ok');
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    });

    server.once('error', reject);

    server.listen(port, '127.0.0.1', () => {
      const handle: PreviewServerHandle = {
        server,
        port,
        notifyReload(html: string, payload: ReloadPayload): void {
          latestHtml = html;
          broadcast(clients, 'reload', payload);
        },
        notifyError(payload: ErrorPayload): void {
          broadcast(clients, 'error-event', payload);
        },
        close(): Promise<void> {
          return new Promise((res, rej) => {
            // Drain all SSE connections first
            for (const c of clients) {
              c.end();
            }
            clients.clear();
            server.close((err) => (err ? rej(err) : res()));
          });
        },
      };
      resolve(handle);
    });
  });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Sets SSE headers and registers the client in the active set.
 * Removes the client when the connection closes.
 *
 * @param res     - The ServerResponse to upgrade to SSE.
 * @param clients - The shared set of active SSE clients.
 */
function registerSseClient(res: SseClient, clients: Set<SseClient>): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });
  // Keep the connection alive with a comment every 25 s
  res.write(': connected\n\n');

  const heartbeat = setInterval(() => {
    res.write(': ping\n\n');
  }, 25_000);

  clients.add(res);

  res.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
}

/**
 * Broadcasts an SSE event to all currently connected clients.
 *
 * @param clients   - Set of active SSE client responses.
 * @param eventName - SSE event name.
 * @param data      - JSON-serialisable payload.
 */
function broadcast(
  clients: Set<SseClient>,
  eventName: string,
  data: ReloadPayload | ErrorPayload,
): void {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    client.write(payload);
  }
}

/**
 * Writes an HTML response with correct headers.
 *
 * @param res  - ServerResponse to write to.
 * @param html - Full HTML document string.
 */
function serveHtml(res: ServerResponse, html: string): void {
  const buf = Buffer.from(html, 'utf-8');
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': String(buf.byteLength),
    'Cache-Control': 'no-store',
  });
  res.end(buf);
}

/**
 * Returns a minimal loading page shown while the first compile runs.
 *
 * @returns HTML string.
 */
function buildLoadingPage(): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;
height:100vh;margin:0;background:#f4f4f5;color:#52525b;}</style></head>
<body><p>Compiling…</p></body></html>`;
}
