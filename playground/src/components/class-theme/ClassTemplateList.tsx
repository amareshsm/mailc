import { useClassThemeStore } from '@/store/class-theme-store'
import { cn } from '@/lib/utils'
import { FileText } from 'lucide-react'

export function ClassTemplateList() {
  const { templates, selectedTemplateId, selectTemplate } = useClassThemeStore()

  return (
    <div className="w-56 border-r border-border bg-card flex flex-col shrink-0">
      <div className="px-3 py-2.5 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Templates
        </h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">Class-based theming</p>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => selectTemplate(t.id)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
              selectedTemplateId === t.id
                ? 'bg-accent text-foreground font-medium'
                : 'text-muted-foreground hover:bg-surface hover:text-foreground'
            )}
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{t.label}</span>
          </button>
        ))}
      </div>

      {/* How it works callout */}
      <div className="px-3 py-3 border-t border-border">
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Templates use class names like{' '}
          <code className="font-mono bg-surface px-0.5 rounded">bg-brand</code> —
          no hardcoded hex. Token changes re-compile instantly.
        </p>
      </div>
    </div>
  )
}
