/**
 * Zustand store for the Playground page (`/playground` route).
 *
 * Holds compilation state, the active source map, and bidirectional
 * selection state shared across the three panels.
 *
 * Edit flow:
 *   User clicks "Edit" → isEditing:true → types → setDraftSource →
 *   clicks "▶ Compile" → saveAndCompile() increments compileTrigger →
 *   usePlaygroundCompilation effect fires → isEditing resets to false.
 *
 * compileTrigger (not source string) drives recompilation so clicking
 * Compile always fires even when the source text hasn't changed.
 */
import { create } from 'zustand'
import type { EmailSourceMap, SourceMapEntry } from '@/types/source-map'
import { TEMPLATES, getTemplatesByFeature, getTemplateById } from '@/templates'
import type { ConsoleEntry } from '@/lib/console-entries'
import {
  CLASS_TOKENS,
  DEFAULT_CLASS_BRAND_MAPPINGS,
  type ClassToken,
} from '@/lib/class-brand-tokens'

/**
 * Source-map-friendly templates from the unified registry.
 * Drawn from `'showcase'`, `'dynamic'`, and `'theme-class'` categories that
 * carry the `'source-map-friendly'` feature tag.
 */
const SOURCE_MAP_AVAILABLE = getTemplatesByFeature(TEMPLATES, 'source-map-friendly')

/** Right-column tab — what's shown next to the preview. */
export type InspectorTab = 'inspector' | 'tokens'

export interface PlaygroundState {
  selectedTemplateId: string
  /** Last compiled source — read by the compiler hook. */
  source: string
  /** Live editing buffer — not compiled until saveAndCompile(). */
  draftSource: string
  /** Whether the source editor is in edit mode. */
  isEditing: boolean
  compiledHtml: string | null
  sourceMap: EmailSourceMap | null
  isCompiling: boolean
  /** Rich console entries from the last compile (errors, warnings, info). */
  consoleEntries: ConsoleEntry[]
  /** Whether the console pane is expanded. */
  consoleOpen: boolean
  /** Console severity filter. */
  consoleFilter: 'all' | 'error' | 'warning' | 'info'
  selectedEntryId: string | null
  /** Increments on every successful compile — used as iframe key to force reload. */
  compileRevision: number
  /**
   * Increments on every saveAndCompile() call.
   * The compilation hook watches this value, NOT source string, so clicking
   * Compile always fires even when the source text hasn't changed.
   */
  compileTrigger: number
  /** Template data passed to compile() for dynamic template resolution. */
  templateData: Record<string, unknown>
  /**
   * Signals the source editor to scroll to and highlight a specific line
   * WITHOUT changing selectedEntryId. Set by console loc-click so only the
   * source panel reacts — not the preview, HTML panel, or inspector.
   * Token increments on every call so the effect always fires even for the
   * same line.
   */
  sourceJump: { line: number; token: number } | null

  // ── Right-column tab + brand-token state (theme-class templates) ──────
  /** Active tab in the right-column inspector area. */
  inspectorTab: InspectorTab
  /** Editable brand-token state — applied at compile time for theme-class templates. */
  tokens: ClassToken[]
  /** Editable brand-mapping state. */
  brandMappings: Record<string, string>
  setInspectorTab: (tab: InspectorTab) => void
  setTokenHex: (tokenId: string, hex: string) => void
  setBrandMapping: (role: string, tokenId: string) => void
  resetTokens: () => void
  resetBrandMappings: () => void

  setSelectedTemplate: (id: string) => void
  setDraftSource: (source: string) => void
  setEditing: (v: boolean) => void
  /** Snapshots draftSource → source and increments compileTrigger to fire compilation. */
  saveAndCompile: () => void
  setCompileResult: (html: string, map: EmailSourceMap) => void
  setConsoleEntries: (entries: ConsoleEntry[]) => void
  clearConsole: () => void
  toggleConsole: () => void
  setConsoleFilter: (filter: 'all' | 'error' | 'warning' | 'info') => void
  setCompiling: (v: boolean) => void
  setSelectedEntry: (id: string | null) => void
  setTemplateData: (data: Record<string, unknown>) => void
  /** Scroll+highlight the given source line without selecting any entry. */
  setSourceJump: (line: number) => void
}

const DEFAULT = SOURCE_MAP_AVAILABLE[0]
if (!DEFAULT) {
  throw new Error('[playground-store] no source-map-friendly templates registered')
}

export const usePlaygroundStore = create<PlaygroundState>((set) => ({
  selectedTemplateId: DEFAULT.id,
  source: DEFAULT.markup,
  draftSource: DEFAULT.markup,
  isEditing: false,
  compiledHtml: null,
  sourceMap: null,
  isCompiling: true,
  consoleEntries: [],
  consoleOpen: true,
  consoleFilter: 'all',
  selectedEntryId: null,
  compileRevision: 0,
  // Start at 1 so the effect fires on mount for the initial template compile.
  compileTrigger: 1,
  templateData: DEFAULT.defaultData ?? {},
  sourceJump: null,

  // Right-column tab + brand-token state. Auto-switches to 'tokens' when the
  // user lands on a theme-class template; switches back to 'inspector' for
  // any other category (so the inspector tree stays useful).
  inspectorTab: DEFAULT.category === 'theme-class' ? 'tokens' : 'inspector',
  tokens: structuredClone(CLASS_TOKENS),
  brandMappings: { ...DEFAULT_CLASS_BRAND_MAPPINGS },
  setInspectorTab: (tab) => set({ inspectorTab: tab }),
  setTokenHex: (tokenId, hex) =>
    set((s) => ({
      tokens: s.tokens.map((t) => (t.id === tokenId ? { ...t, hex } : t)),
      // Token edit reflects in the next compile, but doesn't restart it
      // unconditionally — the hook depends on `tokens` already.
    })),
  setBrandMapping: (role, tokenId) =>
    set((s) => ({ brandMappings: { ...s.brandMappings, [role]: tokenId } })),
  resetTokens: () => set({ tokens: structuredClone(CLASS_TOKENS) }),
  resetBrandMappings: () => set({ brandMappings: { ...DEFAULT_CLASS_BRAND_MAPPINGS } }),

  setSelectedTemplate: (id) => {
    const t = getTemplateById(SOURCE_MAP_AVAILABLE, id)
    if (t) set((s) => ({
      selectedTemplateId: id,
      source: t.markup,
      draftSource: t.markup,
      isEditing: false,
      selectedEntryId: null,
      isCompiling: true,
      consoleEntries: [],
      compileTrigger: s.compileTrigger + 1,
      templateData: t.defaultData ?? {},
      // Auto-switch tab so a theme-class pick shows the editor; other picks
      // restore the inspector. Users can override manually via setInspectorTab.
      inspectorTab: t.category === 'theme-class' ? 'tokens' : 'inspector',
    }))
  },
  setDraftSource: (draftSource) => set({ draftSource }),
  setEditing: (v) => set({ isEditing: v }),
  saveAndCompile: () => set((s) => ({
    source: s.draftSource,
    isEditing: false,
    selectedEntryId: null,
    isCompiling: true,
    consoleEntries: [],
    compileTrigger: s.compileTrigger + 1,
  })),
  setCompileResult: (html, map) => set((s) => ({ compiledHtml: html, sourceMap: map, isCompiling: false, compileRevision: s.compileRevision + 1 })),
  setConsoleEntries: (entries) => set({ consoleEntries: entries }),
  clearConsole: () => set({ consoleEntries: [] }),
  toggleConsole: () => set((s) => ({ consoleOpen: !s.consoleOpen })),
  setConsoleFilter: (filter) => set({ consoleFilter: filter }),
  setCompiling: (v) => set({ isCompiling: v }),
  setSelectedEntry: (id) => set({ selectedEntryId: id }),
  setTemplateData: (data) => set((s) => ({
    templateData: data,
    selectedEntryId: null,
    isCompiling: true,
    consoleEntries: [],
    compileTrigger: s.compileTrigger + 1,
  })),
  setSourceJump: (line) => set((s) => ({
    sourceJump: { line, token: (s.sourceJump?.token ?? 0) + 1 },
  })),
}))

export function selectSelectedEntry(state: PlaygroundState): SourceMapEntry | null {
  if (!state.sourceMap || !state.selectedEntryId) return null
  return state.sourceMap.entries.find((e) => e.id === state.selectedEntryId) ?? null
}

export function pickDeepestBySource(entries: SourceMapEntry[]): SourceMapEntry | null {
  if (entries.length === 0) return null
  return entries.reduce((best, e) =>
    e.sourceLoc.endLine - e.sourceLoc.startLine < best.sourceLoc.endLine - best.sourceLoc.startLine ? e : best
  )
}

export function pickDeepestByOutput(entries: SourceMapEntry[]): SourceMapEntry | null {
  if (entries.length === 0) return null
  const withLoc = entries.filter((e) => e.outputLoc !== null)
  const pool = withLoc.length > 0 ? withLoc : entries
  return pool.reduce((best, e) => {
    const eSpan = (e.outputLoc?.endLine ?? 0) - (e.outputLoc?.startLine ?? 0)
    const bSpan = (best.outputLoc?.endLine ?? 0) - (best.outputLoc?.startLine ?? 0)
    return eSpan < bSpan ? e : best
  })
}
