import { useThemePlaygroundStore } from '@/store/theme-playground-store'
import { Eye, Code2, FileText } from 'lucide-react'
import { EmailPreviewPanel, type ViewTab } from '@/components/shared/EmailPreviewPanel'

const TABS: ViewTab[] = [
  { id: 'preview', label: 'Preview', icon: Eye },
  { id: 'code', label: 'HTML', icon: Code2 },
  { id: 'json', label: 'Markup', icon: FileText },
]

export function ThemePreview() {
  const { compiledHtml, compiledMarkup, compileError, compileTimeMs, getSelectedTemplate } =
    useThemePlaygroundStore()
  const template = getSelectedTemplate()

  return (
    <EmailPreviewPanel
      tabs={TABS}
      html={compiledHtml}
      error={compileError}
      compileTimeMs={compileTimeMs}
      emptyMessage="Select a template from the left panel"
      layoutId="themeViewTab"
      getTabContent={(tabId) => {
        if (tabId === 'code') return compiledHtml || 'No output yet'
        if (tabId === 'json') return compiledMarkup || template?.markup || ''
        return ''
      }}
    />
  )
}
