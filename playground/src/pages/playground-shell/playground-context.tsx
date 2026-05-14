/**
 * Store-agnostic context for the splitkit shell. `/build/code` and
 * `/build/json` share an identical store shape but live behind two
 * different Zustand hooks — this context lets every tab component read
 * the right one through `usePlayground().useStore` without forking. The
 * two pre-built bundles below (MARKUP_BUNDLE / JSON_BUNDLE) wire each
 * hook to its compile hook, tokens panel, and source-editor metadata.
 */
import { createContext, useContext, type ReactNode } from 'react'
import type { UseBoundStore, StoreApi } from 'zustand'
import {
  usePlaygroundStore,
  type PlaygroundState,
  selectSelectedEntry as selectSelectedEntryMarkup,
  pickDeepestBySource as pickDeepestBySourceMarkup,
  pickDeepestByOutput as pickDeepestByOutputMarkup,
} from '@/store/playground-store'
import {
  useJsonPlaygroundStore,
  selectSelectedEntry as selectSelectedEntryJson,
  pickDeepestBySource as pickDeepestBySourceJson,
  pickDeepestByOutput as pickDeepestByOutputJson,
} from '@/store/json-playground-store'
import { usePlaygroundCompilation } from '@/hooks/usePlaygroundCompilation'
import { useJsonPlaygroundCompilation } from '@/hooks/useJsonPlaygroundCompilation'
import { TokensPanel } from '@/components/playground/TokensPanel'
import { JsonTokensPanel } from '@/components/json-playground/JsonTokensPanel'
import type { SourceMapEntry } from '@/types/source-map'

/**
 * The intersection of fields/actions every tab actually reads. We use the
 * markup `PlaygroundState` interface as the canonical shape — the JSON store
 * is a structural mirror of it (see `json-playground-store.ts` header
 * comment), so a hook typed against this interface accepts either.
 */
export type SharedPlaygroundState = PlaygroundState

type SharedStoreHook = UseBoundStore<StoreApi<SharedPlaygroundState>>

export interface PlaygroundBundle {
  /** The Zustand hook to read state from. */
  useStore: SharedStoreHook
  /** Source-map selector + deepest-pick helpers. */
  selectSelectedEntry: (state: SharedPlaygroundState) => SourceMapEntry | null
  pickDeepestBySource: (entries: SourceMapEntry[]) => SourceMapEntry | null
  pickDeepestByOutput: (entries: SourceMapEntry[]) => SourceMapEntry | null
  /** Hook that drives recompilation when the source / data changes. */
  useCompilation: () => void
  /** CodeEditor language for the source pane (.mc markup → 'xml'). */
  sourceLanguage: 'xml' | 'json'
  /** Display title for the source tab. */
  sourceTitle: string
  /** Tab type id for the source tab in the registry. */
  sourceTabType: 'markup' | 'json'
  /** Theme tokens panel — markup vs json variants live in different files. */
  TokensComponent: () => ReactNode
}

/* ── Bundles ────────────────────────────────────────────────────────────── */

export const MARKUP_BUNDLE: PlaygroundBundle = {
  useStore: usePlaygroundStore as unknown as SharedStoreHook,
  selectSelectedEntry: selectSelectedEntryMarkup,
  pickDeepestBySource: pickDeepestBySourceMarkup,
  pickDeepestByOutput: pickDeepestByOutputMarkup,
  useCompilation: usePlaygroundCompilation,
  sourceLanguage: 'xml',
  sourceTitle: 'Markup',
  sourceTabType: 'markup',
  TokensComponent: TokensPanel,
}

export const JSON_BUNDLE: PlaygroundBundle = {
  useStore: useJsonPlaygroundStore as unknown as SharedStoreHook,
  selectSelectedEntry: selectSelectedEntryJson as unknown as PlaygroundBundle['selectSelectedEntry'],
  pickDeepestBySource: pickDeepestBySourceJson,
  pickDeepestByOutput: pickDeepestByOutputJson,
  useCompilation: useJsonPlaygroundCompilation,
  sourceLanguage: 'json',
  sourceTitle: 'JSON',
  sourceTabType: 'json',
  TokensComponent: JsonTokensPanel,
}

/* ── Context plumbing ───────────────────────────────────────────────────── */

const PlaygroundContext = createContext<PlaygroundBundle | null>(null)

export function PlaygroundProvider({
  bundle,
  children,
}: {
  bundle: PlaygroundBundle
  children: ReactNode
}) {
  return (
    <PlaygroundContext.Provider value={bundle}>
      {children}
    </PlaygroundContext.Provider>
  )
}

/**
 * Read the active playground bundle. Throws if used outside a provider so
 * mis-wiring fails loudly during development.
 */
export function usePlayground(): PlaygroundBundle {
  const v = useContext(PlaygroundContext)
  if (!v) {
    throw new Error('usePlayground must be used inside <PlaygroundProvider>')
  }
  return v
}
