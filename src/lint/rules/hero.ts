/**
 * Email HTML lint rules — Hero component rules.
 *
 * Checks that VML hero sections have a fallback color for Outlook,
 * and that hero background images use HTTPS.
 *
 * @module lint/rules/hero
 */

import type { LintRule, LintIssue } from '../types.js';

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

/**
 * When a VML `v:rect` (hero with background image) is present, it must have
 * a `fillcolor` attribute as a fallback for Outlook clients that don't support
 * CSS background images.
 */
export const heroHasFallbackColor: LintRule = {
  id: 'hero-has-fallback-color',
  description: 'Hero VML block must have a fillcolor fallback for Outlook',
  severity: 'warning',
  category: 'outlook',
  check(html: string): LintIssue[] {
    // No VML hero present — rule doesn't apply
    if (!/<v:rect/i.test(html)) return [];
    // All opening v:rect tags have a fillcolor attribute — passes
    if (!/<v:rect(?![^>]*fillcolor\s*=)/i.test(html)) return [];
    return [{
      ruleId: 'hero-has-fallback-color',
      message: 'Hero section is missing a VML fillcolor fallback. Outlook desktop will show no background color. Add background-color to mc-hero.',
      severity: 'warning',
    }];
  },
};

/**
 * Hero background-image URLs should use HTTPS for security and deliverability.
 * Email clients and spam filters may block or warn on HTTP images.
 */
export const heroImageIsHttps: LintRule = {
  id: 'hero-image-is-https',
  description: 'Hero background images should use HTTPS URLs',
  severity: 'warning',
  category: 'images',
  check(html: string): LintIssue[] {
    const issues: LintIssue[] = [];
    // Match all background-image:url(...) occurrences
    const regex = /background-image:\s*url\(([^)]+)\)/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null) {
      const url = match[1]!.trim().replace(/^['"]|['"]$/g, '');
      if (url.startsWith('http://')) {
        issues.push({
          ruleId: 'hero-image-is-https',
          message: `Hero background image uses HTTP: "${url}". Use HTTPS to avoid mixed-content warnings and improve deliverability.`,
          severity: 'warning',
        });
      }
    }
    return issues;
  },
};

/** All hero lint rules. */
export const HERO_RULES: LintRule[] = [
  heroHasFallbackColor,
  heroImageIsHttps,
];
