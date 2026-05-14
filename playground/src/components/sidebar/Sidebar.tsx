import { getLayoutComponents, getContentComponents } from '@/lib/component-registry'
import { SidebarComponentItem } from './SidebarComponentItem'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

export function Sidebar() {
  const layoutComponents = getLayoutComponents()
  const contentComponents = getContentComponents()

  return (
    <div className="w-[240px] shrink-0 border-r border-border bg-card flex flex-col">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Components
        </h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2 px-1">
              Layout
            </p>
            <div className="space-y-1.5">
              {layoutComponents.map((def) => (
                <SidebarComponentItem key={def.type} definition={def} />
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2 px-1">
              Content
            </p>
            <div className="space-y-1.5">
              {contentComponents.map((def) => (
                <SidebarComponentItem key={def.type} definition={def} />
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
