import { useEffect } from 'react'
import { useThemePlaygroundStore } from '@/store/theme-playground-store'
import { compileWithBranding } from '@/lib/theme-compiler'
import { TemplateList } from './TemplateList'
import { ThemePreview } from './ThemePreview'
import { ThemeConfigPanel } from './ThemeConfigPanel'

export function ThemePlayground() {
  const {
    templates,
    selectedTemplateId,
    tokens,
    brandMappings,
    getSelectedTemplate,
    setCompileResult,
    setCompileError,
  } = useThemePlaygroundStore()

  // Templates are eagerly loaded by the store from the unified registry —
  // no runtime fetch needed. Recompile whenever selected template or brand
  // colors change.
  useEffect(() => {
    const template = getSelectedTemplate()
    if (!template) return

    const result = compileWithBranding(template, tokens, brandMappings)
    if (result.error) {
      setCompileError(result.error)
    } else {
      setCompileResult(result.html, result.markup, result.timeMs)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplateId, tokens, brandMappings, templates])

  return (
    <div className="flex-1 flex overflow-hidden">
      <TemplateList />
      <ThemePreview />
      <ThemeConfigPanel />
    </div>
  )
}
