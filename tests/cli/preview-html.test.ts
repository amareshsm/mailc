import { describe, it, expect } from 'vitest';
import { buildPreviewShell } from '../../src/cli/preview-html.js';

describe('buildPreviewShell()', () => {
  const html = buildPreviewShell(3000, 'templates/welcome.mc');

  it('returns a complete HTML document', () => {
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
  });

  it('includes the source file name in the header', () => {
    expect(html).toContain('templates/welcome.mc');
  });

  it('includes the preview iframe at 600px default width', () => {
    expect(html).toContain('id="preview-frame"');
    expect(html).toContain('width="600"');
  });

  it('includes the mobile mode button', () => {
    expect(html).toContain('data-mode="mobile"');
    expect(html).toContain('MOBILE_WIDTH');
  });

  it('has a single iframe pointing at /preview', () => {
    const matches = html.match(/src="\/preview"/g);
    expect(matches).toHaveLength(1);
  });

  it('includes SSE EventSource connection to /events', () => {
    expect(html).toContain("new EventSource('/events')");
  });

  it('includes a reload event listener', () => {
    expect(html).toContain("es.addEventListener('reload'");
  });

  it('includes an error-event listener', () => {
    expect(html).toContain("es.addEventListener('error-event'");
  });

  it('includes the preview server port in the footer', () => {
    expect(html).toContain('port 3000');
  });

  it('HTML-escapes the srcFile name (XSS safety)', () => {
    const xssHtml = buildPreviewShell(3000, '<script>alert(1)</script>.mc');
    expect(xssHtml).not.toContain('<script>alert(1)</script>');
    expect(xssHtml).toContain('&lt;script&gt;');
  });

  it('applies mobile scale via JS (not static CSS)', () => {
    expect(html).toContain("'scale('");
    expect(html).toContain('MOBILE_SCALE');
  });

  it('has a status dot element', () => {
    expect(html).toContain('id="status-dot"');
  });

  it('has a compile-stats element', () => {
    expect(html).toContain('id="compile-stats"');
  });
});
