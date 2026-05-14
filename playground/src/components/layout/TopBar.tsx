import { useEmailStore, type EditorTab } from '@/store/email-store'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  LayoutTemplate,
  Eye,
  Code2,
  Download,
  Undo2,
  Redo2,
  RotateCcw,
  Telescope,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { generateMailcMarkup } from '@/lib/mailc-generator'
import { loadStarterTemplate } from '@/lib/starter-template'

export function TopBar() {
  const { activeTab, setActiveTab, components, canUndo, canRedo, undo, redo, loadTemplate } = useEmailStore()

  const tabs: { id: EditorTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'editor', label: 'Editor', icon: LayoutTemplate },
    { id: 'preview', label: 'Preview', icon: Eye },
    { id: 'code', label: 'Code', icon: Code2 },
  ]

  const handleExport = () => {
    const markup = generateMailcMarkup(components)
    const blob = new Blob([markup], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'email-template.mc'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleLoadDemo = () => loadTemplate(loadStarterTemplate())

  return (
    <div className="h-11 border-b border-border bg-card/50 flex items-center justify-between px-4 shrink-0">
      {/* Left: undo / redo + introspect badge */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={!canUndo()}
                onClick={undo}
              >
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={!canRedo()}
                onClick={redo}
              >
                <Redo2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo</TooltipContent>
          </Tooltip>
        </div>
        <div className="h-5 w-px bg-border" />
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-mono text-muted-foreground bg-surface border border-border">
              <Telescope className="h-3 w-3 text-emerald-500" />
              nesting validated by <span className="text-foreground">introspect</span>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            Drop targets are checked at runtime via <code>introspect.canNest()</code>.
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Center: tab switcher */}
      <div className="flex items-center gap-0.5 bg-surface rounded-lg p-0.5 relative">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors z-10',
              activeTab === tab.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-background rounded-md shadow-sm"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <tab.icon className="h-3.5 w-3.5 relative z-10" />
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5" onClick={handleLoadDemo}>
              <RotateCcw className="h-3.5 w-3.5" />
              Load demo
            </Button>
          </TooltipTrigger>
          <TooltipContent>Replace the canvas with the welcome-email starter template.</TooltipContent>
        </Tooltip>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleExport}>
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </div>
    </div>
  )
}
