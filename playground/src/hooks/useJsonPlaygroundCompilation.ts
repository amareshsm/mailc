/**
 * useJsonPlaygroundCompilation — JSON variant of usePlaygroundCompilation.
 *
 * Pass the JSON SOURCE STRING directly to `compileFromJSON()`. The library's
 * position-tracking parser threads real line/col through to source map
 * entries, so source-line click works natively — no playground-side patching.
 *
 * Parse errors surface as MCIssues (code: JSON_PARSE_ERROR) with real line/col.
 */
import { useEffect } from 'react'
import { compileFromJSON } from 'mailc'
import { useJsonPlaygroundStore } from '@/store/json-playground-store'
import { issuesToEntries, exceptionEntry } from '@/lib/console-entries'
import type { EmailSourceMap } from '@/types/source-map'
import { TEMPLATES, getTemplateById, getCompileOptions } from '@/templates'
import { buildThemeColorsWithMappings } from '@/lib/class-brand-tokens'

export function useJsonPlaygroundCompilation() {
  const compileTrigger = useJsonPlaygroundStore((s) => s.compileTrigger)
  const source = useJsonPlaygroundStore((s) => s.source)
  const selectedTemplateId = useJsonPlaygroundStore((s) => s.selectedTemplateId)
  const templateData = useJsonPlaygroundStore((s) => s.templateData)
  const tokens = useJsonPlaygroundStore((s) => s.tokens)
  const brandMappings = useJsonPlaygroundStore((s) => s.brandMappings)
  const setCompileResult = useJsonPlaygroundStore((s) => s.setCompileResult)
  const setConsoleEntries = useJsonPlaygroundStore((s) => s.setConsoleEntries)
  const setCompiling = useJsonPlaygroundStore((s) => s.setCompiling)

  useEffect(() => {
    try {
      const template = getTemplateById(TEMPLATES, selectedTemplateId)
      const baseOptions = template
        ? getCompileOptions(template)
        : { templateStyle: 'attribute' as const }
      const data = Object.keys(templateData).length > 0 ? templateData : baseOptions.data

      const theme =
        template?.category === 'theme-class'
          ? { extend: { colors: buildThemeColorsWithMappings(tokens, brandMappings) } }
          : baseOptions.theme

      // Pass the JSON string directly — the library's position-tracking parser
      // attaches real loc to every typed object and threads it through to
      // source map entries. No client-side patching needed.
      const result = compileFromJSON(source, {
        ...baseOptions,
        sourceMap: true,
        data,
        ...(theme ? { theme } : {}),
      })

      const entries = [
        ...issuesToEntries(result.errors ?? []),
        ...issuesToEntries(result.warnings ?? []),
        ...issuesToEntries(result.info ?? []),
      ]
      setConsoleEntries(entries)

      const map = result.sourceMap as EmailSourceMap | undefined
      if (result.html && map) {
        setCompileResult(result.html, map, result.json ?? null)
      } else {
        setCompiling(false)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setConsoleEntries([exceptionEntry(message)])
      setCompiling(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compileTrigger, tokens, brandMappings])
}
