import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  rectIntersection,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import { useEmailStore } from '@/store/email-store'
import { componentRegistry } from '@/lib/component-registry'
import { getIcon } from '@/lib/icon-lookup'
import { TopBar } from '@/components/layout/TopBar'
import { loadStarterTemplate, hasLoadedStarter, markStarterLoaded } from '@/lib/starter-template'
import { canNest } from '@/lib/introspect-bridge'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { Canvas } from '@/components/canvas/Canvas'
import { RightPanel } from '@/components/right-panel/RightPanel'
import { PreviewPanel } from '@/components/preview/PreviewPanel'
import { CodePanel } from '@/components/code-editor/CodePanel'
import type { ComponentType } from '@/types/email'

function DragOverlayContent({ componentType }: { componentType: string }) {
  const def = componentRegistry[componentType as ComponentType]
  if (!def) return null
  const IconComponent = getIcon(def.icon)
  return (
    <div className="flex items-center gap-3 rounded-lg border border-ring/40 bg-surface px-4 py-3 shadow-xl shadow-black/30 cursor-grabbing opacity-90">
      {IconComponent && <IconComponent className="h-4 w-4 text-foreground" />}
      <span className="text-sm font-medium text-foreground">{def.label}</span>
    </div>
  )
}

export function BuilderPage() {
  const {
    components,
    addComponent,
    moveComponent,
    activeTab,
    undo,
    redo,
    removeComponent,
    selectedId,
    loadTemplate,
  } = useEmailStore()

  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeComponentType, setActiveComponentType] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // First-visit: load the welcome-email starter so the canvas isn't empty.
  // Subsequent visits respect whatever the user left behind (or cleared).
  useEffect(() => {
    if (components.length === 0 && !hasLoadedStarter()) {
      loadTemplate(loadStarterTemplate())
      markStarterLoaded()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMeta = e.metaKey || e.ctrlKey
      if (isMeta && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if (isMeta && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) { e.preventDefault(); redo() }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        const t = e.target as HTMLElement
        if (t.tagName !== 'INPUT' && t.tagName !== 'TEXTAREA' && t.tagName !== 'SELECT' && !t.isContentEditable) {
          e.preventDefault()
          removeComponent(selectedId)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, removeComponent, selectedId])

  function handleDragStart(event: DragStartEvent) {
    const { active } = event
    setActiveId(String(active.id))
    setIsDragging(true)
    if (active.data.current?.type === 'sidebar-component') {
      setActiveComponentType(active.data.current.componentType)
    } else if (active.data.current?.type === 'canvas-component') {
      setActiveComponentType(active.data.current.componentType)
    }
  }

  // Resolve the parent component type for a drop target id, so we can run
  // `introspect.canNest()` before committing the drop. The store has its own
  // smart auto-wrap (e.g. content dropped at root → wrapped in section), so
  // we only block the obviously-wrong cases (e.g. mc-section into mc-text).
  const findById = (arr: typeof components, id: string): typeof components[number] | undefined => {
    for (const c of arr) {
      if (c.id === id) return c
      if (c.children) {
        const found = findById(c.children, id)
        if (found) return found
      }
    }
    return undefined
  }
  const dropParentType = (overId: string): string | undefined => {
    if (overId === 'canvas-body' || overId.startsWith('canvas-drop-')) return undefined
    if (overId.startsWith('drop-')) {
      const w = overId.slice('drop-'.length)
      const ld = w.lastIndexOf('-')
      const parentId = w.slice(0, ld)
      return findById(components, parentId)?.type
    }
    return undefined
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    setActiveComponentType(null)
    setIsDragging(false)
    if (!over) return
    const overId = String(over.id)

    if (active.data.current?.type === 'sidebar-component') {
      const compType = active.data.current.componentType as string
      const parentType = dropParentType(overId)
      // Gate via introspect.canNest. Root drops (no parentType) and content
      // dropped onto a section/group are auto-routed by the store, so we
      // only veto direct nests that introspect explicitly rejects.
      if (parentType && !canNest(parentType, compType)) return

      if (overId.startsWith('canvas-drop-')) {
        addComponent(compType, undefined, parseInt(overId.replace('canvas-drop-', ''), 10))
        return
      }
      if (overId.startsWith('drop-')) {
        const w = overId.slice('drop-'.length)
        const ld = w.lastIndexOf('-')
        addComponent(compType, w.slice(0, ld), parseInt(w.slice(ld + 1), 10))
        return
      }
      if (overId === 'canvas-body') { addComponent(compType, undefined); return }
      return
    }

    if (active.data.current?.type === 'canvas-component') {
      const activeCompId = String(active.id)
      const compType = active.data.current.componentType as string
      let fromParentId: string | undefined
      let fromIndex = -1
      const findInTree = (arr: typeof components, parentId?: string): boolean => {
        for (let i = 0; i < arr.length; i++) {
          if (arr[i].id === activeCompId) { fromParentId = parentId; fromIndex = i; return true }
          if (arr[i].children && findInTree(arr[i].children!, arr[i].id)) return true
        }
        return false
      }
      findInTree(components)
      if (fromIndex === -1) return
      const parentType = dropParentType(overId)
      if (parentType && !canNest(parentType, compType)) return
      if (overId.startsWith('canvas-drop-')) {
        moveComponent(fromParentId, fromIndex, undefined, parseInt(overId.replace('canvas-drop-', ''), 10))
        return
      }
      if (overId.startsWith('drop-')) {
        const w = overId.slice('drop-'.length)
        const ld = w.lastIndexOf('-')
        moveComponent(fromParentId, fromIndex, w.slice(0, ld), parseInt(w.slice(ld + 1), 10))
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full h-full flex flex-col overflow-hidden bg-background">
        <TopBar />
          <div className="flex-1 flex overflow-hidden">
            <AnimatePresence mode="wait">
              {activeTab === 'editor' && (
                <motion.div key="editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex-1 flex overflow-hidden">
                  <Sidebar />
                  <Canvas isDragging={isDragging} />
                  <RightPanel />
                </motion.div>
              )}
              {activeTab === 'preview' && (
                <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex-1 flex overflow-hidden">
                  <PreviewPanel />
                </motion.div>
              )}
              {activeTab === 'code' && (
                <motion.div key="code" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex-1 flex overflow-hidden">
                  <CodePanel />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        <DragOverlay dropAnimation={null}>
          {activeId && activeComponentType && (
            <DragOverlayContent componentType={activeComponentType} />
          )}
        </DragOverlay>
      </DndContext>
  )
}
