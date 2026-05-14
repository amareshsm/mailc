import { useDynamicEmailsStore } from '@/store/dynamic-emails-store'
import { Eye, Code, FileText } from 'lucide-react'
import { EmailPreviewPanel, type ViewTab } from '@/components/shared/EmailPreviewPanel'

const TABS: ViewTab[] = [
  { id: 'preview', label: 'Preview', icon: Eye },
  { id: 'code', label: 'Code', icon: Code },
  { id: 'markup', label: 'Markup', icon: FileText },
]

export function DynamicPreview() {
  const { compiledHtml, compileError, templates, selectedTemplateId } = useDynamicEmailsStore()
  const template = templates.find((t) => t.id === selectedTemplateId)

  return (
    <EmailPreviewPanel
      tabs={TABS}
      html={compiledHtml ?? ''}
      error={compileError}
      emptyMessage="Select a template from the left panel"
      layoutId="dynamicViewTab"
      getTabContent={(tabId) => {
        if (tabId === 'code') return compiledHtml ?? 'No output'
        if (tabId === 'markup') return template?.markup ?? ''
        return ''
      }}
    />
  )
}
