import { create } from 'zustand'
import {
  DEFAULT_TOKENS,
  DEFAULT_BRAND_MAPPINGS,
  type ColorToken,
} from '@/lib/brand-tokens'
import type { ViewportMode } from '@/types/email'
import { TEMPLATES, getTemplatesByCategory, type Template } from '@/templates'

// ── Template registry ──────────────────────────────────────────────────────

/**
 * @deprecated Use `Template` from `@/templates` directly. Kept as an alias
 * during the unification migration so existing external consumers (if any)
 * don't break in a single commit.
 */
export type TemplateEntry = Template

// ── View modes ─────────────────────────────────────────────────────────────

export type ThemeViewMode = 'preview' | 'code' | 'json'
export type ConfigTab = 'tokens' | 'branding' | 'config'

// ── Store shape ────────────────────────────────────────────────────────────

interface ThemePlaygroundStore {
  templates: Template[]
  selectedTemplateId: string | null
  viewMode: ThemeViewMode
  viewportMode: ViewportMode
  customWidth: number
  configTab: ConfigTab

  /** All tokens (built-in + custom) */
  tokens: ColorToken[]
  /** Role → tokenId mappings */
  brandMappings: Record<string, string>

  compiledHtml: string
  compiledMarkup: string
  compileError: string | null
  compileTimeMs: number

  // Template actions
  setTemplates: (templates: Template[]) => void
  selectTemplate: (id: string) => void
  setViewMode: (mode: ThemeViewMode) => void
  setViewportMode: (mode: ViewportMode) => void
  setCustomWidth: (width: number) => void
  setConfigTab: (tab: ConfigTab) => void

  // Token actions
  setTokenHex: (tokenId: string, hex: string) => void
  addCustomToken: (token: ColorToken) => void
  removeCustomToken: (tokenId: string) => void
  resetTokens: () => void

  // Brand mapping actions
  setBrandMapping: (role: string, tokenId: string) => void
  resetBrandMappings: () => void

  // Compile actions
  setCompileResult: (html: string, markup: string, timeMs: number) => void
  setCompileError: (error: string) => void

  // Selectors
  getSelectedTemplate: () => Template | null
  resolveTokenHex: (tokenId: string) => string
  getTokenOverrideCount: () => number
  getMappingOverrideCount: () => number
}

// Eager initialization — the registry is static at module load.
// `setTemplates` is preserved for any caller that wants to swap at runtime.
const INITIAL_TEMPLATES = getTemplatesByCategory(TEMPLATES, 'theme-attribute')

export const useThemePlaygroundStore = create<ThemePlaygroundStore>()((set, get) => ({
  templates: INITIAL_TEMPLATES,
  selectedTemplateId: INITIAL_TEMPLATES[0]?.id ?? null,
  viewMode: 'preview',
  viewportMode: 'desktop',
  customWidth: 480,
  configTab: 'tokens',

  tokens: structuredClone(DEFAULT_TOKENS),
  brandMappings: { ...DEFAULT_BRAND_MAPPINGS },

  compiledHtml: '',
  compiledMarkup: '',
  compileError: null,
  compileTimeMs: 0,

  // Template actions
  setTemplates: (templates) => set({ templates }),
  selectTemplate: (id) => set({ selectedTemplateId: id, compileError: null }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setViewportMode: (mode) => set({ viewportMode: mode }),
  setCustomWidth: (width) => set({ customWidth: width }),
  setConfigTab: (tab) => set({ configTab: tab }),

  // Token actions
  setTokenHex: (tokenId, hex) =>
    set((state) => ({
      tokens: state.tokens.map((t) => (t.id === tokenId ? { ...t, hex } : t)),
    })),

  addCustomToken: (token) =>
    set((state) => ({
      tokens: [...state.tokens, { ...token, isCustom: true, category: 'custom' }],
    })),

  removeCustomToken: (tokenId) =>
    set((state) => {
      const newTokens = state.tokens.filter((t) => t.id !== tokenId)
      // Also remove any brand mappings pointing to this token
      const newMappings = { ...state.brandMappings }
      for (const [role, mapped] of Object.entries(newMappings)) {
        if (mapped === tokenId) {
          newMappings[role] = DEFAULT_BRAND_MAPPINGS[role] ?? 'primary'
        }
      }
      return { tokens: newTokens, brandMappings: newMappings }
    }),

  resetTokens: () =>
    set({ tokens: structuredClone(DEFAULT_TOKENS) }),

  // Brand mapping actions
  setBrandMapping: (role, tokenId) =>
    set((state) => ({
      brandMappings: { ...state.brandMappings, [role]: tokenId },
    })),

  resetBrandMappings: () =>
    set({ brandMappings: { ...DEFAULT_BRAND_MAPPINGS } }),

  // Compile actions
  setCompileResult: (html, markup, timeMs) =>
    set({ compiledHtml: html, compiledMarkup: markup, compileTimeMs: timeMs, compileError: null }),

  setCompileError: (error) => set({ compileError: error }),

  // Selectors
  getSelectedTemplate: () => {
    const { templates, selectedTemplateId } = get()
    return templates.find((t) => t.id === selectedTemplateId) ?? null
  },

  resolveTokenHex: (tokenId) => {
    const token = get().tokens.find((t) => t.id === tokenId)
    return token?.hex ?? '#000000'
  },

  getTokenOverrideCount: () => {
    const { tokens } = get()
    return tokens.filter((t) => {
      if (t.isCustom) return true
      const def = DEFAULT_TOKENS.find((d) => d.id === t.id)
      return def ? t.hex.toLowerCase() !== def.hex.toLowerCase() : false
    }).length
  },

  getMappingOverrideCount: () => {
    const { brandMappings } = get()
    return Object.entries(brandMappings).filter(
      ([role, tokenId]) => tokenId !== DEFAULT_BRAND_MAPPINGS[role]
    ).length
  },
}))
