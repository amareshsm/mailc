import { useEffect } from 'react'
import { compile } from 'mailc'
import { useClassThemeStore } from '@/store/class-theme-store'
import { buildThemeColorsWithMappings } from '@/lib/class-brand-tokens'
import { getCompileOptions } from '@/templates'
import { ClassTemplateList } from './ClassTemplateList'
import { ClassPreview } from './ClassPreview'
import { ClassConfigPanel } from './ClassConfigPanel'

export function ClassThemePlayground() {
  const {
    selectedTemplateId,
    tokens,
    brandMappings,
    templates,
    getSelectedTemplate,
    setCompileResult,
    setCompileError,
  } = useClassThemeStore()

  // Recompile whenever the selected template, any token hex, or any brand
  // mapping changes. We start from the template's `getCompileOptions` (which
  // gives the correct `templateStyle` and the default brand colours), then
  // overlay the user's edited tokens — those win over the defaults.
  useEffect(() => {
    const template = getSelectedTemplate()
    if (!template) return

    const start = performance.now()
    try {
      const baseOptions = getCompileOptions(template)
      const userColors = buildThemeColorsWithMappings(tokens, brandMappings)
      const result = compile(template.markup, {
        ...baseOptions,
        theme: { extend: { colors: userColors } },
      })
      const timeMs = Math.round((performance.now() - start) * 100) / 100

      if (!result.html) {
        setCompileError(result.errors.map((e) => e.message).join('\n') || 'Compilation failed')
        return
      }

      setCompileResult(result.html, timeMs)
    } catch (err) {
      const timeMs = Math.round((performance.now() - start) * 100) / 100
      setCompileError(err instanceof Error ? err.message : String(err))
      console.error('Class theme compile error:', err, timeMs)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplateId, tokens, brandMappings, templates])

  return (
    <div className="flex-1 flex overflow-hidden">
      <ClassTemplateList />
      <ClassPreview />
      <ClassConfigPanel />
    </div>
  )
}
