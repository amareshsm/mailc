import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Settings2, Layers } from 'lucide-react'
import { motion } from 'framer-motion'
import { PropertiesPanel } from '@/components/properties/PropertiesPanel'
import { LayersPanel } from '@/components/layers/LayersPanel'

type RightTab = 'properties' | 'layers'

export function RightPanel() {
  const [activeTab, setActiveTab] = useState<RightTab>('properties')

  const tabs: { id: RightTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'properties', label: 'Properties', icon: Settings2 },
    { id: 'layers', label: 'Layers', icon: Layers },
  ]

  return (
    <div className="w-[280px] shrink-0 border-l border-border bg-card flex flex-col">
      {/* Tab header */}
      <div className="px-2 py-2 border-b border-border">
        <div className="flex items-center gap-0.5 bg-surface rounded-lg p-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-medium rounded-md transition-colors z-10',
                activeTab === tab.id
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="rightPanelTab"
                  className="absolute inset-0 bg-background rounded-md shadow-sm"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <tab.icon className="h-3 w-3 relative z-10" />
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'properties' ? (
          <PropertiesPanel />
        ) : (
          <LayersPanel />
        )}
      </div>
    </div>
  )
}
