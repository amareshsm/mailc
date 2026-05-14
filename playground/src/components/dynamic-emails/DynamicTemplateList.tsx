import { useDynamicEmailsStore } from '@/store/dynamic-emails-store'
import { cn } from '@/lib/utils'
import { Sparkles, Zap, Layers } from 'lucide-react'

const LEVEL_CONFIG = {
  basic: { icon: Zap, color: 'text-green-500', bg: 'bg-green-500/10' },
  intermediate: { icon: Sparkles, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  advanced: { icon: Layers, color: 'text-violet-500', bg: 'bg-violet-500/10' },
} as const

export function DynamicTemplateList() {
  const { templates, selectedTemplateId, selectTemplate } = useDynamicEmailsStore()

  return (
    <div className="w-56 border-r border-border bg-card flex flex-col shrink-0">
      <div className="px-3 py-2.5 border-b border-border shrink-0">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Templates
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {templates.map((t) => {
          const isActive = t.id === selectedTemplateId
          // `level` is optional in the unified Template; fall back to 'basic' for legacy entries.
          const level = LEVEL_CONFIG[t.level ?? 'basic']
          const Icon = level.icon
          return (
            <button
              key={t.id}
              onClick={() => selectTemplate(t.id)}
              className={cn(
                'w-full text-left px-3 py-2 transition-colors',
                isActive
                  ? 'bg-surface text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface/50'
              )}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <div className={cn('w-5 h-5 rounded flex items-center justify-center', level.bg)}>
                  <Icon className={cn('h-3 w-3', level.color)} />
                </div>
                <span className="text-xs font-medium truncate">{t.label}</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed pl-7 truncate">
                {t.description}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
