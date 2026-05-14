/**
 * Zustand store for the JSON Playground page (`/json-playground` route).
 *
 * Mirrors the `playground-store` exactly except the `source` and `draftSource`
 * fields hold a JSON string (the result of `JSON.stringify(MCNode, null, 2)`)
 * instead of `.mc` markup. Compilation is performed by
 * `useJsonPlaygroundCompilation`, which calls `compileFromJSON()` from mailc.
 */
import { create } from 'zustand'
import { markupToJSON } from 'mailc'
import type { MCNode } from 'mailc'
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
 */
const SOURCE_MAP_AVAILABLE = getTemplatesByFeature(TEMPLATES, 'source-map-friendly')

/** Right-column tab — what's shown next to the preview. */
export type InspectorTab = 'inspector' | 'tokens'

export interface JsonPlaygroundState {
  selectedTemplateId: string
  /** Last compiled source — read by the compiler hook. JSON string. */
  source: string
  /** Live editing buffer — not compiled until saveAndCompile(). JSON string. */
  draftSource: string
  /** Whether the source editor is in edit mode. */
  isEditing: boolean
  compiledHtml: string | null
  sourceMap: EmailSourceMap | null
  /**
   * The parsed JSON tree (MCNode) with `loc` populated for every node.
   * Lifted from `compileFromJSON(...).json`. Used by the inline-edit tab to
   * resolve a source-map entry back to its source node via loc match.
   */
  parsedJson: MCNode | null
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
  /** Increments on every saveAndCompile() call. */
  compileTrigger: number
  /** Template data passed to compile() for dynamic template resolution. */
  templateData: Record<string, unknown>
  sourceJump: { line: number; token: number } | null

  // ── Right-column tab + brand-token state (theme-class templates) ──────
  inspectorTab: InspectorTab
  tokens: ClassToken[]
  brandMappings: Record<string, string>
  setInspectorTab: (tab: InspectorTab) => void
  setTokenHex: (tokenId: string, hex: string) => void
  setBrandMapping: (role: string, tokenId: string) => void
  resetTokens: () => void
  resetBrandMappings: () => void

  setSelectedTemplate: (id: string) => void
  setDraftSource: (source: string) => void
  setEditing: (v: boolean) => void
  saveAndCompile: () => void
  setCompileResult: (html: string, map: EmailSourceMap, parsedJson: MCNode | null) => void
  /**
   * Replace the JSON source with a fresh serialization of `tree`. Used by the
   * inline TipTap editor to write back a single content change. Strips the
   * `loc` field that the position-tracking parser injects, so the round-trip
   * stays human-readable and re-parses cleanly.
   */
  setSourceFromTree: (tree: MCNode) => void
  setConsoleEntries: (entries: ConsoleEntry[]) => void
  clearConsole: () => void
  toggleConsole: () => void
  setConsoleFilter: (filter: 'all' | 'error' | 'warning' | 'info') => void
  setCompiling: (v: boolean) => void
  setSelectedEntry: (id: string | null) => void
  setTemplateData: (data: Record<string, unknown>) => void
  setSourceJump: (line: number) => void
}

const DEFAULT = SOURCE_MAP_AVAILABLE[0]
if (!DEFAULT) {
  throw new Error('[json-playground-store] no source-map-friendly templates registered')
}

/** Minimal fallback JSON document used when markupToJSON throws. */
const FALLBACK_JSON = JSON.stringify(
  { type: 'mc', children: [{ type: 'mc-body', attributes: {}, children: [] }] },
  null,
  2,
)

/**
 * Convert a `.mc` markup string to a pretty-printed JSON string. Falls back
 * to a minimal document on any error so the editor always loads with valid
 * input.
 */
function markupToJsonString(markup: string): string {
  try {
    const node = markupToJSON(markup)
    return JSON.stringify(node, null, 2)
  } catch {
    return FALLBACK_JSON
  }
}

const DEFAULT_JSON_SOURCE = markupToJsonString(DEFAULT.markup)

export const useJsonPlaygroundStore = create<JsonPlaygroundState>((set) => ({
  selectedTemplateId: DEFAULT.id,
  source: DEFAULT_JSON_SOURCE,
  draftSource: DEFAULT_JSON_SOURCE,
  isEditing: false,
  compiledHtml: null,
  sourceMap: null,
  parsedJson: null,
  isCompiling: true,
  consoleEntries: [],
  consoleOpen: true,
  consoleFilter: 'all',
  selectedEntryId: null,
  compileRevision: 0,
  compileTrigger: 1,
  templateData: DEFAULT.defaultData ?? {},
  sourceJump: null,

  inspectorTab: DEFAULT.category === 'theme-class' ? 'tokens' : 'inspector',
  tokens: structuredClone(CLASS_TOKENS),
  brandMappings: { ...DEFAULT_CLASS_BRAND_MAPPINGS },
  setInspectorTab: (tab) => set({ inspectorTab: tab }),
  setTokenHex: (tokenId, hex) =>
    set((s) => ({
      tokens: s.tokens.map((t) => (t.id === tokenId ? { ...t, hex } : t)),
    })),
  setBrandMapping: (role, tokenId) =>
    set((s) => ({ brandMappings: { ...s.brandMappings, [role]: tokenId } })),
  resetTokens: () => set({ tokens: structuredClone(CLASS_TOKENS) }),
  resetBrandMappings: () => set({ brandMappings: { ...DEFAULT_CLASS_BRAND_MAPPINGS } }),

  setSelectedTemplate: (id) => {
    const t = getTemplateById(SOURCE_MAP_AVAILABLE, id)
    if (t) {
      const json = markupToJsonString(t.markup)
      set((s) => ({
        selectedTemplateId: id,
        source: json,
        draftSource: json,
        isEditing: false,
        selectedEntryId: null,
        isCompiling: true,
        consoleEntries: [],
        compileTrigger: s.compileTrigger + 1,
        templateData: t.defaultData ?? {},
        inspectorTab: t.category === 'theme-class' ? 'tokens' : 'inspector',
      }))
    }
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
  setCompileResult: (html, map, parsedJson) => set((s) => ({ compiledHtml: html, sourceMap: map, parsedJson, isCompiling: false, compileRevision: s.compileRevision + 1 })),
  setSourceFromTree: (tree) => set((s) => {
    const cleaned = stripInternalFields(tree)
    const json = JSON.stringify(cleaned, null, 2)
    return {
      source: json,
      draftSource: json,
      isCompiling: true,
      consoleEntries: [],
      compileTrigger: s.compileTrigger + 1,
    }
  }),
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

/**
 * Recursively strip the `loc` field (and any other internal book-keeping)
 * from an MCNode tree so it serializes back into a clean, human-readable
 * JSON string. The position-tracking parser injects `loc` on every node — we
 * keep it in memory for click-to-locate but must NOT round-trip it into the
 * source string.
 */
function stripInternalFields(node: MCNode): MCNode {
  const { loc: _loc, ...rest } = node as MCNode & { loc?: unknown }
  const out: MCNode = { ...rest } as MCNode
  if (out.children) {
    out.children = out.children.map(stripInternalFields)
  }
  return out
}

export function selectSelectedEntry(state: JsonPlaygroundState): SourceMapEntry | null {
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
