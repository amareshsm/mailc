/**
 * Tests for the URL sanitiser utility.
 */
import { describe, it, expect } from 'vitest';
import { isSafeUrl, sanitizeUrl, SAFE_URL_FALLBACK } from '../../src/utils/url-sanitizer.js';

describe('isSafeUrl', () => {
  // ── Dangerous schemes ──────────────────────────────────────────────
  it('returns false for javascript: scheme', () => {
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
  });

  it('returns false for JAVASCRIPT: (case-insensitive)', () => {
    expect(isSafeUrl('JAVASCRIPT:alert(1)')).toBe(false);
  });

  it('returns false for data: scheme', () => {
    expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
  });

  it('returns false for DATA: (case-insensitive)', () => {
    expect(isSafeUrl('DATA:text/plain,hello')).toBe(false);
  });

  it('returns false for vbscript: scheme', () => {
    expect(isSafeUrl('vbscript:msgbox(1)')).toBe(false);
  });

  it('returns false for VBScript: (case-insensitive)', () => {
    expect(isSafeUrl('VBScript:msgbox(1)')).toBe(false);
  });

  it('returns false for javascript: with leading spaces (bypass attempt)', () => {
    expect(isSafeUrl('  javascript:alert(1)')).toBe(false);
  });

  it('returns false for javascript: with leading tab (bypass attempt)', () => {
    expect(isSafeUrl('\tjavascript:alert(1)')).toBe(false);
  });

  it('returns false for javascript: with zero-width space (bypass attempt)', () => {
    expect(isSafeUrl('\u200Bjavascript:alert(1)')).toBe(false);
  });

  it('returns false for data: with spaces before scheme', () => {
    expect(isSafeUrl('   data:text/html,<b>hi</b>')).toBe(false);
  });

  // ── Safe schemes ────────────────────────────────────────────────────
  it('returns true for https: URL', () => {
    expect(isSafeUrl('https://example.com')).toBe(true);
  });

  it('returns true for http: URL', () => {
    expect(isSafeUrl('http://example.com/path')).toBe(true);
  });

  it('returns true for relative path', () => {
    expect(isSafeUrl('/images/logo.png')).toBe(true);
  });

  it('returns true for relative URL with query string', () => {
    expect(isSafeUrl('/page?id=1&ref=email')).toBe(true);
  });

  it('returns true for hash-only link', () => {
    expect(isSafeUrl('#')).toBe(true);
  });

  it('returns true for mailto: URL', () => {
    expect(isSafeUrl('mailto:hello@example.com')).toBe(true);
  });

  it('returns true for empty string', () => {
    expect(isSafeUrl('')).toBe(true);
  });
});

describe('sanitizeUrl', () => {
  it('returns the URL unchanged when safe', () => {
    const url = 'https://example.com/product';
    expect(sanitizeUrl(url)).toBe(url);
  });

  it('returns SAFE_URL_FALLBACK for javascript:', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe(SAFE_URL_FALLBACK);
  });

  it('returns SAFE_URL_FALLBACK for data:', () => {
    expect(sanitizeUrl('data:text/html,<b>x</b>')).toBe(SAFE_URL_FALLBACK);
  });

  it('returns SAFE_URL_FALLBACK for vbscript:', () => {
    expect(sanitizeUrl('vbscript:msgbox(1)')).toBe(SAFE_URL_FALLBACK);
  });

  it('SAFE_URL_FALLBACK is #', () => {
    expect(SAFE_URL_FALLBACK).toBe('#');
  });
});
