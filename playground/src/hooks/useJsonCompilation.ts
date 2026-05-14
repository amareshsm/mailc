/**
 * useJsonCompilation — auto-compiles the JSON email tree on every store change.
 *
 * Debounced 300ms to avoid hammering compileFromJSON while the user is typing.
 * Compilation runs synchronously on the main thread (simple enough for the
 * live-preview use case; a worker version can be wired in later via the
 * json-compile.worker.ts file).
 */

import { useEffect, useRef } from 'react'
import { compileFromJSON } from 'mailc'
import { useJsonBuilderStore } from '@/store/json-builder-store'

export function useJsonCompilation() {
  const nodes = useJsonBuilderStore((s) => s.nodes)
  const emailTitle = useJsonBuilderStore((s) => s.emailTitle)
  const emailPreview = useJsonBuilderStore((s) => s.emailPreview)
  const themeColors = useJsonBuilderStore((s) => s.themeColors)
  const templateData = useJsonBuilderStore((s) => s.templateData)
  const buildMCDocument = useJsonBuilderStore((s) => s.buildMCDocument)
  const setCompileResult = useJsonBuilderStore((s) => s.setCompileResult)
  const setCompiling = useJsonBuilderStore((s) => s.setCompiling)

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setCompiling(true)
      try {
        const node = buildMCDocument()

        const result = compileFromJSON(node, {
          templateStyle: 'class',
          sourceMap: true,
          ...(Object.keys(themeColors).length > 0
            ? { theme: { extend: { colors: themeColors } } }
            : {}),
          ...(Object.keys(templateData).length > 0 ? { data: templateData } : {}),
        })

        setCompileResult({
          html: result.html,
          errors: result.errors,
          warnings: result.warnings,
          info: result.info,
          sourceMapJSON: result.sourceMapJSON ?? null,
          stats: result.stats
            ? {
                inputSize: result.stats.inputSize,
                outputSize: result.stats.outputSize,
                compileTime: result.stats.compileTime,
                components: result.stats.components,
              }
            : null,
        })
      } catch (err) {
        setCompileResult(null, err instanceof Error ? err.message : String(err))
      }
    }, 300)

    return () => clearTimeout(timerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, emailTitle, emailPreview, themeColors, templateData])
}
