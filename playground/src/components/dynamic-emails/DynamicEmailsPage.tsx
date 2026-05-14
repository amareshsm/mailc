import { useEffect } from 'react'
import { useDynamicEmailsStore } from '@/store/dynamic-emails-store'
import { compile } from 'mailc'
import { getCompileOptions } from '@/templates'
import { DynamicTemplateList } from './DynamicTemplateList'
import { DynamicPreview } from './DynamicPreview'
import { DynamicDataEditor } from './DynamicDataEditor'

export function DynamicEmailsPage() {
  const {
    selectedTemplateId,
    getSelectedTemplate,
    getCurrentData,
    setCompileResult,
    setCompileError,
  } = useDynamicEmailsStore()

  // Access templateData to trigger reactivity
  const templateData = useDynamicEmailsStore((s) => s.templateData)

  // Recompile whenever template or data changes
  useEffect(() => {
    const template = getSelectedTemplate()
    if (!template) return

    const data = getCurrentData()
    const start = performance.now()

    try {
      // Pull templateStyle / theme / etc. from the registry so a future
      // class-mode dynamic template would render correctly without code
      // changes here. The user's edited data from the panel overrides the
      // template's defaultData.
      const baseOptions = getCompileOptions(template)
      const result = compile(template.markup, { ...baseOptions, data })
      const timeMs = Math.round((performance.now() - start) * 100) / 100

      if (!result.html) {
        const msg = result.errors.map((e) => e.message).join('\n')
        setCompileError(msg || 'Compilation failed')
      } else {
        setCompileResult(result.html, timeMs)
      }
    } catch (err) {
      const timeMs = Math.round((performance.now() - start) * 100) / 100
      setCompileError(err instanceof Error ? err.message : String(err))
      void timeMs // suppress unused
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplateId, templateData])

  return (
    <div className="flex-1 flex overflow-hidden">
      <DynamicTemplateList />
      <DynamicPreview />
      <DynamicDataEditor />
    </div>
  )
}
