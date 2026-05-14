/**
 * Email HTML lint rules — Structure rules.
 *
 * Checks for DOCTYPE, html xmlns, charset, viewport, title,
 * no `<script>`, and no external CSS.
 *
 * @module lint/rules/structure
 */

import type { LintRule, LintIssue } from '../types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Finds the 1-based line number of the first occurrence of a pattern.
 *
 * @param html    - The HTML to search.
 * @param pattern - Regex or string to find.
 * @returns Line number, or `undefined` if not found.
 */
function findLine(html: string, pattern: RegExp | string): number | undefined {
  const idx = typeof pattern === 'string'
    ? html.indexOf(pattern)
    : html.search(pattern);
  if (idx === -1) return undefined;
  return html.slice(0, idx).split('\n').length;
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

/** HTML must start with `<!DOCTYPE html>`. */
export const hasDoctype: LintRule = {
  id: 'has-doctype',
  description: 'HTML must start with <!DOCTYPE html>',
  severity: 'error',
  category: 'structure',
  check(html: string): LintIssue[] {
    if (/<!doctype\s+html>/i.test(html)) return [];
    return [{
      ruleId: 'has-doctype',
      message: 'Missing <!DOCTYPE html> declaration.',
      severity: 'error',
      line: 1,
    }];
  },
};

/** `<html>` must have xmlns for XHTML compatibility. */
export const hasXmlns: LintRule = {
  id: 'has-xmlns',
  description: '<html> must have xmlns for XHTML compatibility',
  severity: 'error',
  category: 'structure',
  check(html: string): LintIssue[] {
    if (/xmlns\s*=\s*"http:\/\/www\.w3\.org\/1999\/xhtml"/i.test(html)) return [];
    const line = findLine(html, /<html/i);
    return [{
      ruleId: 'has-xmlns',
      message: '<html> is missing xmlns="http://www.w3.org/1999/xhtml" attribute.',
      severity: 'error',
      line,
    }];
  },
};

/** Must have `<meta charset="utf-8">`. */
export const hasMetaCharset: LintRule = {
  id: 'has-meta-charset',
  description: 'Must have <meta charset="utf-8">',
  severity: 'error',
  category: 'structure',
  check(html: string): LintIssue[] {
    if (/meta\s+charset\s*=\s*"utf-8"/i.test(html)) return [];
    return [{
      ruleId: 'has-meta-charset',
      message: 'Missing <meta charset="utf-8"> tag.',
      severity: 'error',
      line: findLine(html, /<head/i),
    }];
  },
};

/** Must have viewport meta for mobile. */
export const hasMetaViewport: LintRule = {
  id: 'has-meta-viewport',
  description: 'Must have viewport meta for mobile rendering',
  severity: 'error',
  category: 'structure',
  check(html: string): LintIssue[] {
    if (/meta\s+name\s*=\s*"viewport"/i.test(html)) return [];
    return [{
      ruleId: 'has-meta-viewport',
      message: 'Missing <meta name="viewport"> tag for mobile rendering.',
      severity: 'error',
      line: findLine(html, /<head/i),
    }];
  },
};

/** `<title>` must be present (some clients show it). */
export const hasTitle: LintRule = {
  id: 'has-title',
  description: '<title> must be present (some email clients show it)',
  severity: 'warning',
  category: 'structure',
  check(html: string): LintIssue[] {
    if (/<title[^>]*>/i.test(html)) return [];
    return [{
      ruleId: 'has-title',
      message: 'Missing <title> tag. Some email clients display the title.',
      severity: 'warning',
      line: findLine(html, /<head/i),
    }];
  },
};

/** No `<script>` tags allowed in email. */
export const noScript: LintRule = {
  id: 'no-script',
  description: 'No <script> tags allowed in email',
  severity: 'error',
  category: 'structure',
  check(html: string): LintIssue[] {
    const issues: LintIssue[] = [];
    const re = /<script[\s>]/gi;
    let match: RegExpExecArray | null;
    while ((match = re.exec(html)) !== null) {
      const line = html.slice(0, match.index).split('\n').length;
      issues.push({
        ruleId: 'no-script',
        message: '<script> tags are not supported in email and will be stripped by most clients.',
        severity: 'error',
        line,
      });
    }
    return issues;
  },
};

/** No `<link rel="stylesheet">` — all CSS must be inline or in `<style>`. */
export const noExternalCss: LintRule = {
  id: 'no-external-css',
  description: 'No <link rel="stylesheet"> — all CSS must be inline or in <style>',
  severity: 'error',
  category: 'structure',
  check(html: string): LintIssue[] {
    const issues: LintIssue[] = [];
    const re = /<link[^>]*rel\s*=\s*"stylesheet"[^>]*>/gi;
    let match: RegExpExecArray | null;
    while ((match = re.exec(html)) !== null) {
      const line = html.slice(0, match.index).split('\n').length;
      issues.push({
        ruleId: 'no-external-css',
        message: 'External stylesheets (<link rel="stylesheet">) are not supported in most email clients. Use inline styles or <style> blocks.',
        severity: 'error',
        line,
      });
    }
    return issues;
  },
};

/** All structure rules. */
export const STRUCTURE_RULES: LintRule[] = [
  hasDoctype,
  hasXmlns,
  hasMetaCharset,
  hasMetaViewport,
  hasTitle,
  noScript,
  noExternalCss,
];
