/**
 * usePlaygroundCompilation — compiles whenever `compileTrigger` increments.
 *
 * Compilation is EXPLICIT — the user clicks "▶ Compile" which calls
 * saveAndCompile(), incrementing compileTrigger and copying draftSource→source.
 *
 * We watch compileTrigger (a counter) rather than the source string so that
 * clicking Compile always fires even when the source text hasn't changed.
 * The initial value is 1 so the default template compiles on first mount.
 *
 * All compiler issues (errors, warnings, info) are captured into rich
 * ConsoleEntry[] in the store via setConsoleEntries.
 */
import { useEffect } from 'react'
import { compile } from 'mailc'
import { usePlaygroundStore } from '@/store/playground-store'
import { issuesToEntries, exceptionEntry } from '@/lib/console-entries'
import type { EmailSourceMap } from '@/types/source-map'
import { TEMPLATES, getTemplateById, getCompileOptions } from '@/templates'
import { buildThemeColorsWithMappings } from '@/lib/class-brand-tokens'

/**
 * Watches compileTrigger and runs compilation synchronously.
 * Mount fires once (compileTrigger starts at 1). Every saveAndCompile()
 * call increments it, triggering another compile.
 */
export function usePlaygroundCompilation() {
  const compileTrigger = usePlaygroundStore((s) => s.compileTrigger)
  const source = usePlaygroundStore((s) => s.source)
  const selectedTemplateId = usePlaygroundStore((s) => s.selectedTemplateId)
  const templateData = usePlaygroundStore((s) => s.templateData)
  const tokens = usePlaygroundStore((s) => s.tokens)
  const brandMappings = usePlaygroundStore((s) => s.brandMappings)
  const setCompileResult = usePlaygroundStore((s) => s.setCompileResult)
  const setConsoleEntries = usePlaygroundStore((s) => s.setConsoleEntries)
  const setCompiling = usePlaygroundStore((s) => s.setCompiling)

  useEffect(() => {
    try {
      // Resolve per-template options from the unified registry — `templateStyle`,
      // optional `theme` (theme-class templates), and the template's
      // `defaultData`. The user's edited `templateData` from the data panel
      // overrides the template's defaults when present.
      const template = getTemplateById(TEMPLATES, selectedTemplateId)
      const baseOptions = template
        ? getCompileOptions(template)
        : { templateStyle: 'attribute' as const }
      const data = Object.keys(templateData).length > 0 ? templateData : baseOptions.data

      // For theme-class templates, overlay the user's edited brand tokens on
      // top of the template's defaults so live edits in the Tokens tab flow
      // through to the preview.
      const theme =
        template?.category === 'theme-class'
          ? { extend: { colors: buildThemeColorsWithMappings(tokens, brandMappings) } }
          : baseOptions.theme

      const result = compile(source, {
        ...baseOptions,
        sourceMap: true,
        data,
        ...(theme ? { theme } : {}),
      })

      // Collect all issues into rich entries regardless of success/failure
      const entries = [
        ...issuesToEntries(result.errors ?? []),
        ...issuesToEntries(result.warnings ?? []),
        ...issuesToEntries(result.info ?? []),
      ]
      setConsoleEntries(entries)

      const map = result.sourceMap as EmailSourceMap | undefined
      if (result.html && map) {
        setCompileResult(result.html, map)
      } else {
        // No HTML output — stop the spinner; entries already have error details
        setCompiling(false)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setConsoleEntries([exceptionEntry(message)])
      setCompiling(false)
    }
  // `compileTrigger` is the explicit trigger (Compile button / template switch)
  // for source-code edits. `tokens` / `brandMappings` are listed too so live
  // edits in the Tokens tab trigger an instant recompile — same UX as the
  // /brand-theme-class route.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compileTrigger, tokens, brandMappings])
}
