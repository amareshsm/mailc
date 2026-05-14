import { create } from 'zustand'
import {
  CLASS_TOKENS,
  DEFAULT_CLASS_HEX,
  DEFAULT_CLASS_BRAND_MAPPINGS,
  type ClassToken,
} from '@/lib/class-brand-tokens'
import { TEMPLATES, getTemplatesByCategory, type Template } from '@/templates'
import type { ViewportMode } from '@/types/email'

export type ClassViewMode = 'preview' | 'code' | 'markup'

interface ClassThemeStore {
  templates: Template[]
  selectedTemplateId: string
  tokens: ClassToken[]
  /** slot (token id) → which token's hex to inject into that compile slot */
  brandMappings: Record<string, string>
  viewMode: ClassViewMode
  viewportMode: ViewportMode
  customWidth: number

  compiledHtml: string
  compileError: string | null
  compileTimeMs: number

  // Actions
  selectTemplate: (id: string) => void
  setTokenHex: (tokenId: string, hex: string) => void
  resetTokens: () => void
  setBrandMapping: (slotId: string, tokenId: string) => void
  resetBrandMappings: () => void
  setViewMode: (mode: ClassViewMode) => void
  setViewportMode: (mode: ViewportMode) => void
  setCustomWidth: (width: number) => void
  setCompileResult: (html: string, timeMs: number) => void
  setCompileError: (error: string) => void

  // Selectors
  getSelectedTemplate: () => Template | null
  getTokenOverrideCount: () => number
  getMappingOverrideCount: () => number
}

const INITIAL_TEMPLATES = getTemplatesByCategory(TEMPLATES, 'theme-class')

export const useClassThemeStore = create<ClassThemeStore>()((set, get) => ({
  templates: INITIAL_TEMPLATES,
  selectedTemplateId: INITIAL_TEMPLATES[0]?.id ?? '',
  tokens: structuredClone(CLASS_TOKENS),
  brandMappings: { ...DEFAULT_CLASS_BRAND_MAPPINGS },
  viewMode: 'preview',
  viewportMode: 'desktop',
  customWidth: 480,
  compiledHtml: '',
  compileError: null,
  compileTimeMs: 0,

  selectTemplate: (id) => set({ selectedTemplateId: id, compileError: null }),
  setTokenHex: (tokenId, hex) =>
    set((state) => ({
      tokens: state.tokens.map((t) => (t.id === tokenId ? { ...t, hex } : t)),
    })),
  resetTokens: () => set({ tokens: structuredClone(CLASS_TOKENS) }),
  setBrandMapping: (slotId, tokenId) =>
    set((state) => ({ brandMappings: { ...state.brandMappings, [slotId]: tokenId } })),
  resetBrandMappings: () => set({ brandMappings: { ...DEFAULT_CLASS_BRAND_MAPPINGS } }),

  setViewMode: (mode) => set({ viewMode: mode }),
  setViewportMode: (mode) => set({ viewportMode: mode }),
  setCustomWidth: (width) => set({ customWidth: width }),
  setCompileResult: (html, timeMs) =>
    set({ compiledHtml: html, compileError: null, compileTimeMs: timeMs }),
  setCompileError: (error) => set({ compileError: error }),

  getSelectedTemplate: () => {
    const { templates, selectedTemplateId } = get()
    return templates.find((t) => t.id === selectedTemplateId) ?? null
  },

  getTokenOverrideCount: () =>
    get().tokens.filter((t) => {
      const def = DEFAULT_CLASS_HEX[t.id]
      return def ? t.hex.toLowerCase() !== def.toLowerCase() : false
    }).length,

  getMappingOverrideCount: () =>
    Object.entries(get().brandMappings).filter(
      ([slotId, tokenId]) => tokenId !== slotId
    ).length,
}))
