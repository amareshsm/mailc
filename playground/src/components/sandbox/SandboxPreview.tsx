import { useSandboxStore } from '@/store/sandbox-store'
import { Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmailPreviewPanel, type ViewTab } from '@/components/shared/EmailPreviewPanel'

const TABS: ViewTab[] = [{ id: 'preview', label: 'Preview', icon: Eye }]

export function SandboxPreview() {
  const { compiledHtml, compileTimeMs, consoleOpen } = useSandboxStore()

  return (
    <EmailPreviewPanel
      tabs={TABS}
      html={compiledHtml ?? ''}
      compileTimeMs={compileTimeMs}
      emptyMessage="No output — check the console for errors."
      layoutId="playgroundViewTab"
      getTabContent={() => ''}
      className={cn(consoleOpen ? 'flex-[7]' : 'flex-1')}
    />
  )
}
