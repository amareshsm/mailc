/**
 * Local mirror of mailc source map types.
 *
 * These match the interfaces in `src/types.ts` exactly.
 * Swap `import type { EmailSourceMap, SourceMapEntry } from 'mailc'` once
 * the playground's local mailc is rebuilt and reinstalled.
 */

export interface SourceLoc {
  startLine: number
  startCol: number
  endLine: number
  endCol: number
}

/** Origin of a single CSS property on a compiled component element. */
export interface StyleOrigin {
  property: string
  value: string
  /** Where the style came from. */
  origin: 'attribute' | 'tailwind-class' | 'mc-attributes' | 'component-default' | 'post-processor'
  /** The raw value before transformation (e.g. Tailwind class name). */
  originalValue?: string
  /** caniemail support data for this property. */
  support?: Record<string, unknown>
}

export interface SourceMapEntry {
  id: string
  parentId: string | null
  /** The mc-* component type, e.g. "mc-section". */
  sourceComponent: string
  sourceLoc: SourceLoc
  role: string
  outputTag: string
  outputRange: { start: number; end: number } | null
  outputLoc: SourceLoc | null
  styles: StyleOrigin[]
  expressions: unknown[]
  conditional: unknown | null
  loop: unknown | null
  sourceAttributes: Record<string, string>
  children: string[]
}

export interface EmailSourceMap {
  version: 1
  sourceFile: string
  outputFile: string
  templateData: unknown
  mailcVersion: string
  entries: SourceMapEntry[]
  stats: {
    sourceComponents: number
    outputElements: number
    [key: string]: unknown
  }
}
