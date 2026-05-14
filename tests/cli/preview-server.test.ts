import { describe, it, expect, afterEach } from 'vitest';
import http from 'node:http';
import { startPreviewServer } from '../../src/cli/preview-server.js';
import type { PreviewServerHandle } from '../../src/cli/preview-server.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simple HTTP GET helper — resolves { status, body }. */
function get(url: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let body = '';
        res.on('data', (chunk: Buffer) => (body += chunk.toString()));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
      })
      .on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('startPreviewServer()', () => {
  const handles: PreviewServerHandle[] = [];

  afterEach(async () => {
    for (const h of handles) {
      await h.close().catch(() => {});
    }
    handles.length = 0;
  });

  it('starts on the given port and responds to GET /', async () => {
    const h = await startPreviewServer(19_301, 'test.mc');
    handles.push(h);

    const { status, body } = await get('http://127.0.0.1:19301/');
    expect(status).toBe(200);
    expect(body).toContain('<!DOCTYPE html>');
  });

  it('GET /health returns 200 ok', async () => {
    const h = await startPreviewServer(19_302, 'test.mc');
    handles.push(h);

    const { status, body } = await get('http://127.0.0.1:19302/health');
    expect(status).toBe(200);
    expect(body).toBe('ok');
  });

  it('GET /preview returns the loading page before any compile', async () => {
    const h = await startPreviewServer(19_303, 'test.mc');
    handles.push(h);

    const { status, body } = await get('http://127.0.0.1:19303/preview');
    expect(status).toBe(200);
    expect(body).toContain('<html>');
  });

  it('notifyReload() updates /preview content', async () => {
    const h = await startPreviewServer(19_304, 'test.mc');
    handles.push(h);

    const newHtml = '<!DOCTYPE html><html><body>Updated</body></html>';
    h.notifyReload(newHtml, { compileMs: 42, warnings: [] });

    const { body } = await get('http://127.0.0.1:19304/preview');
    expect(body).toBe(newHtml);
  });

  it('GET /preview after notifyReload returns the new HTML', async () => {
    const h = await startPreviewServer(19_305, 'test.mc');
    handles.push(h);

    h.notifyReload('<html><body>hello world</body></html>', {
      compileMs: 10,
      warnings: [],
    });

    const { body } = await get('http://127.0.0.1:19305/preview');
    expect(body).toContain('hello world');
  });

  it('GET unknown path returns 404', async () => {
    const h = await startPreviewServer(19_306, 'test.mc');
    handles.push(h);

    const { status } = await get('http://127.0.0.1:19306/nonexistent');
    expect(status).toBe(404);
  });

  it('close() shuts down the server', async () => {
    const h = await startPreviewServer(19_307, 'test.mc');
    await h.close();

    await expect(get('http://127.0.0.1:19307/health')).rejects.toThrow();
  });

  it('GET / shell contains the srcFile name', async () => {
    const h = await startPreviewServer(19_308, 'emails/welcome.mc');
    handles.push(h);

    const { body } = await get('http://127.0.0.1:19308/');
    expect(body).toContain('emails/welcome.mc');
  });

  it('exposes the port on the handle', async () => {
    const h = await startPreviewServer(19_309, 'test.mc');
    handles.push(h);

    expect(h.port).toBe(19_309);
  });
});
