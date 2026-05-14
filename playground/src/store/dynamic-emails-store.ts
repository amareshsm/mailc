import { create } from 'zustand'
import { TEMPLATES, getTemplatesByCategory, type Template } from '@/templates'
import type { ViewportMode } from '@/types/email'

export type DynamicViewMode = 'preview' | 'code' | 'markup'

interface DynamicEmailsStore {
  templates: Template[]
  selectedTemplateId: string | null
  viewMode: DynamicViewMode
  viewportMode: ViewportMode
  customWidth: number

  /** Per-template data overrides: templateId → JSON data */
  templateData: Record<string, Record<string, unknown>>

  compiledHtml: string
  compileError: string | null
  compileTimeMs: number

  // Actions
  selectTemplate: (id: string) => void
  setViewMode: (mode: DynamicViewMode) => void
  setViewportMode: (mode: ViewportMode) => void
  setCustomWidth: (width: number) => void
  setTemplateData: (templateId: string, data: Record<string, unknown>) => void
  resetTemplateData: (templateId: string) => void
  setCompileResult: (html: string, timeMs: number) => void
  setCompileError: (error: string) => void

  // Selectors
  getSelectedTemplate: () => Template | null
  getCurrentData: () => Record<string, unknown>
}

const INITIAL_TEMPLATES = getTemplatesByCategory(TEMPLATES, 'dynamic')

export const useDynamicEmailsStore = create<DynamicEmailsStore>()((set, get) => ({
  templates: INITIAL_TEMPLATES,
  selectedTemplateId: INITIAL_TEMPLATES[0]?.id ?? null,
  viewMode: 'preview',
  viewportMode: 'desktop',
  customWidth: 480,

  templateData: {},

  compiledHtml: '',
  compileError: null,
  compileTimeMs: 0,

  selectTemplate: (id) => set({ selectedTemplateId: id, compileError: null }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setViewportMode: (mode) => set({ viewportMode: mode }),
  setCustomWidth: (width) => set({ customWidth: width }),

  setTemplateData: (templateId, data) =>
    set((state) => ({
      templateData: { ...state.templateData, [templateId]: data },
    })),

  resetTemplateData: (templateId) =>
    set((state) => {
      const next = { ...state.templateData }
      delete next[templateId]
      return { templateData: next }
    }),

  setCompileResult: (html, timeMs) =>
    set({ compiledHtml: html, compileTimeMs: timeMs, compileError: null }),

  setCompileError: (error) => set({ compileError: error }),

  getSelectedTemplate: () => {
    const { templates, selectedTemplateId } = get()
    return templates.find((t) => t.id === selectedTemplateId) ?? null
  },

  getCurrentData: () => {
    const { selectedTemplateId, templateData, templates } = get()
    if (!selectedTemplateId) return {}
    const override = templateData[selectedTemplateId]
    if (override) return override
    const tmpl = templates.find((t) => t.id === selectedTemplateId)
    return tmpl?.defaultData ?? {}
  },
}))
