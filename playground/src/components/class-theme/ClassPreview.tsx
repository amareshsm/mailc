import { useClassThemeStore } from '@/store/class-theme-store'
import { Eye, Code2, FileText } from 'lucide-react'
import { EmailPreviewPanel, type ViewTab } from '@/components/shared/EmailPreviewPanel'

const TABS: ViewTab[] = [
  { id: 'preview', label: 'Preview', icon: Eye },
  { id: 'code', label: 'HTML', icon: Code2 },
  { id: 'markup', label: 'Markup', icon: FileText },
]

export function ClassPreview() {
  const { compiledHtml, compileError, compileTimeMs, getSelectedTemplate } = useClassThemeStore()
  const template = getSelectedTemplate()

  return (
    <EmailPreviewPanel
      tabs={TABS}
      html={compiledHtml}
      error={compileError}
      compileTimeMs={compileTimeMs}
      emptyMessage="Select a template from the left panel"
      layoutId="classViewTab"
      getTabContent={(tabId) => {
        if (tabId === 'code') return compiledHtml || 'No output yet'
        if (tabId === 'markup') return template?.markup || ''
        return ''
      }}
    />
  )
}
