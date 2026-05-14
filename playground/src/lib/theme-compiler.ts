import { compile } from 'mailc'
import { DEFAULT_TOKENS, DEFAULT_BRAND_MAPPINGS, type ColorToken } from './brand-tokens'
import { getCompileOptions, type Template } from '@/templates'

export interface ThemeCompileResult {
  html: string
  markup: string
  timeMs: number
  error: string | null
}

/**
 * Compile a static template, then apply all color overrides.
 *
 * Resolution order (highest priority last, wins):
 *  1. Default token hex values baked into the template.
 *  2. Direct token hex changes (Tokens tab).
 *  3. Brand mapping remaps (Brand tab) — if a role is remapped to a
 *     different token, that token's current hex overrides the default
 *     token's hex for all elements that used the original default color.
 *
 * Note: because colors are resolved via global hex find-replace, roles
 * that share the same default token hex will all change together when
 * any one of those roles is remapped.
 */
export function compileWithBranding(
  template: Template,
  tokens: ColorToken[],
  brandMappings: Record<string, string> = {},
): ThemeCompileResult {
  const start = performance.now()

  try {
    // Source compile options from the registry — `templateStyle` flows from
    // the template's own metadata. Color overrides are applied post-compile
    // via `applyColorOverrides`, so no theme.extend.colors is needed here.
    const result = compile(template.markup, getCompileOptions(template))
    const timeMs = Math.round((performance.now() - start) * 100) / 100

    if (!result.html) {
      const msg = result.errors.map((e) => e.message).join('\n')
      const markup = applyColorOverrides(template.markup, tokens, brandMappings)
      return { html: '', markup, timeMs, error: msg || 'Compilation failed' }
    }

    const html = applyColorOverrides(result.html, tokens, brandMappings)
    const markup = applyColorOverrides(template.markup, tokens, brandMappings)

    return { html, markup, timeMs, error: null }
  } catch (err) {
    const timeMs = Math.round((performance.now() - start) * 100) / 100
    const markup = applyColorOverrides(template.markup, tokens, brandMappings)
    return {
      html: '',
      markup,
      timeMs,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

/**
 * Resolves a final hex replacement map and applies it to `input`.
 *
 * For each DEFAULT_TOKEN, we compute the "effective" hex:
 *  - Start from the token's current hex (handles Tokens-tab edits).
 *  - If any brand role whose DEFAULT mapping is this token has been
 *    remapped to a different token, override with that token's current hex.
 *    (Last brand-role write for a given default token wins.)
 */
export function applyColorOverrides(
  input: string,
  tokens: ColorToken[],
  brandMappings: Record<string, string>,
): string {
  // Build effectiveHex: defaultTokenId → finalHex
  const effectiveHex = new Map<string, string>()

  // Step 1: apply direct token changes
  for (const defToken of DEFAULT_TOKENS) {
    const current = tokens.find((t) => t.id === defToken.id)
    if (current) {
      effectiveHex.set(defToken.id, current.hex)
    }
  }

  // Step 2: apply brand mapping overrides (higher priority).
  // Only process roles that have actually been remapped away from their default.
  // Unchanged roles (currentTokenId === defaultTokenId) must be skipped — otherwise
  // they overwrite the effectiveHex set by a genuinely overridden sibling role that
  // shares the same defaultTokenId (e.g. buttonBg and headerBg both default to 'primary').
  for (const [role, currentTokenId] of Object.entries(brandMappings)) {
    const defaultTokenId = DEFAULT_BRAND_MAPPINGS[role]
    if (!defaultTokenId) continue
    if (currentTokenId === defaultTokenId) continue  // not remapped — skip

    const currentToken = tokens.find((t) => t.id === currentTokenId)
    if (!currentToken) continue

    effectiveHex.set(defaultTokenId, currentToken.hex)
  }

  // Step 3: replace each default hex whose effective color differs
  let output = input
  for (const defToken of DEFAULT_TOKENS) {
    const finalHex = effectiveHex.get(defToken.id)
    if (!finalHex || finalHex.toLowerCase() === defToken.hex.toLowerCase()) continue
    output = replaceColor(output, defToken.hex, finalHex)
  }

  return output
}

/** Backward-compatible wrapper used by external callers. */
export function applyTokenColorOverrides(input: string, tokens: ColorToken[]): string {
  return applyColorOverrides(input, tokens, DEFAULT_BRAND_MAPPINGS)
}

/**
 * Case-insensitive global replacement of a hex color in HTML.
 */
function replaceColor(html: string, from: string, to: string): string {
  const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return html.replace(new RegExp(escaped, 'gi'), to)
}
