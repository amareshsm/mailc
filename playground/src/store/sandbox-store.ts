import { create } from 'zustand'
import { type ConsoleEntry, issuesToEntries } from '@/lib/console-entries'

export type { ConsoleEntry }
export { issuesToEntries }

export type CodeFormat = 'markup' | 'json'
export type ViewportMode = 'desktop' | 'mobile'

const DEFAULT_MARKUP = `<mc>
  <mc-body>
    <mc-section>
      <mc-column>
        <mc-text class="text-2xl font-bold py-4">
          Hello from mailc!
        </mc-text>
        <mc-text class="text-base text-gray-600 pb-4">
          Start editing to see your email preview update in real-time.
          The console below will show compilation errors, warnings, and info.
        </mc-text>
        <mc-button href="https://github.com" class="bg-black text-white px-6 py-3">
          Get Started
        </mc-button>
      </mc-column>
    </mc-section>
    <mc-section class="bg-gray-100">
      <mc-column>
        <mc-divider class="border-gray-300" />
        <mc-text class="text-sm text-gray-500 py-4">
          Built with mailc — the modern email compiler.
        </mc-text>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`

interface SandboxState {
  /** Source code in markup format. */
  markupCode: string
  /** Source code in JSON format (stringified). */
  jsonCode: string
  /** Active format tab. */
  format: CodeFormat
  /** Compiled HTML output. */
  compiledHtml: string | null
  /** Compile time in ms. */
  compileTimeMs: number
  /** Console entries from last compilation. */
  consoleEntries: ConsoleEntry[]
  /** Whether the console is expanded. */
  consoleOpen: boolean
  /** Console severity filter. */
  consoleFilter: 'all' | 'error' | 'warning' | 'info'
  /** Viewport mode for preview. */
  viewportMode: ViewportMode
  /** Selected source line to highlight in markup editor. */
  highlightedMarkupLine: number | null
  /** Incrementing token to retrigger jump when same line is clicked again. */
  highlightedMarkupVersion: number

  // Actions
  setMarkupCode: (code: string) => void
  setJsonCode: (code: string) => void
  setFormat: (format: CodeFormat) => void
  setCompiledHtml: (html: string | null) => void
  setCompileTimeMs: (ms: number) => void
  setConsoleEntries: (entries: ConsoleEntry[]) => void
  clearConsole: () => void
  toggleConsole: () => void
  setConsoleFilter: (filter: 'all' | 'error' | 'warning' | 'info') => void
  setViewportMode: (mode: ViewportMode) => void
  jumpToMarkupLine: (line: number) => void
}


export const useSandboxStore = create<SandboxState>((set) => ({
  markupCode: DEFAULT_MARKUP,
  jsonCode: '{}',
  format: 'markup',
  compiledHtml: null,
  compileTimeMs: 0,
  consoleEntries: [],
  consoleOpen: true,
  consoleFilter: 'all',
  viewportMode: 'desktop',
  highlightedMarkupLine: null,
  highlightedMarkupVersion: 0,

  setMarkupCode: (code) => set({ markupCode: code }),
  setJsonCode: (code) => set({ jsonCode: code }),
  setFormat: (format) => set({ format }),
  setCompiledHtml: (html) => set({ compiledHtml: html }),
  setCompileTimeMs: (ms) => set({ compileTimeMs: ms }),
  setConsoleEntries: (entries) => set({ consoleEntries: entries }),
  clearConsole: () => set({ consoleEntries: [] }),
  toggleConsole: () => set((s) => ({ consoleOpen: !s.consoleOpen })),
  setConsoleFilter: (filter) => set({ consoleFilter: filter }),
  setViewportMode: (mode) => set({ viewportMode: mode }),
  jumpToMarkupLine: (line) =>
    set((s) => ({
      format: 'markup',
      highlightedMarkupLine: Math.max(1, line),
      highlightedMarkupVersion: s.highlightedMarkupVersion + 1,
    })),
}))
