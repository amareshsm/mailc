import { create } from 'zustand'
import type { EmailComponent, ViewportMode } from '@/types/email'
import { componentRegistry } from '@/lib/component-registry'
import { generateId } from '@/lib/id'

export type EditorTab = 'editor' | 'preview' | 'code'

interface HistoryEntry {
  components: EmailComponent[]
  selectedId: string | null
}

interface EmailStore {
  components: EmailComponent[]
  selectedId: string | null
  activeTab: EditorTab
  viewportMode: ViewportMode
  customWidth: number
  hiddenIds: Set<string>

  // History for undo/redo
  history: HistoryEntry[]
  historyIndex: number

  // Actions
  setActiveTab: (tab: EditorTab) => void
  setViewportMode: (mode: ViewportMode) => void
  setCustomWidth: (width: number) => void
  selectComponent: (id: string | null) => void
  toggleHidden: (id: string) => void

  addComponent: (type: string, parentId?: string, index?: number) => void
  removeComponent: (id: string) => void
  moveComponent: (fromParentId: string | undefined, fromIndex: number, toParentId: string | undefined, toIndex: number) => void
  updateComponentAttributes: (id: string, attrs: Record<string, string>) => void
  updateComponentContent: (id: string, content: string) => void
  duplicateComponent: (id: string) => void

  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  getSelectedComponent: () => EmailComponent | null

  loadTemplate: (components: EmailComponent[]) => void
}

function findComponent(components: EmailComponent[], id: string): EmailComponent | null {
  for (const comp of components) {
    if (comp.id === id) return comp
    if (comp.children) {
      const found = findComponent(comp.children, id)
      if (found) return found
    }
  }
  return null
}

function findParentAndIndex(
  components: EmailComponent[],
  id: string
): { parent: EmailComponent[] | null; index: number; parentComponent: EmailComponent | null } {
  for (let i = 0; i < components.length; i++) {
    if (components[i].id === id) {
      return { parent: components, index: i, parentComponent: null }
    }
    if (components[i].children) {
      const result = findParentAndIndex(components[i].children!, id)
      if (result.parent) {
        return {
          ...result,
          parentComponent: result.parentComponent || components[i],
        }
      }
    }
  }
  return { parent: null, index: -1, parentComponent: null }
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

function cloneWithNewIds(component: EmailComponent): EmailComponent {
  return {
    ...component,
    id: generateId(),
    children: component.children?.map(cloneWithNewIds),
  }
}

function createComponent(type: string): EmailComponent {
  const def = componentRegistry[type as keyof typeof componentRegistry]
  if (!def) throw new Error(`Unknown component type: ${type}`)

  const comp: EmailComponent = {
    id: generateId(),
    type: def.type,
    attributes: { ...def.defaultAttributes },
    content: def.defaultContent,
  }

  if (type === 'mc-section') {
    comp.children = [
      {
        id: generateId(),
        type: 'mc-column',
        attributes: { ...componentRegistry['mc-column'].defaultAttributes },
        children: [],
      },
    ]
  } else if (type === 'mc-group') {
    comp.children = [
      {
        id: generateId(),
        type: 'mc-column',
        attributes: { ...componentRegistry['mc-column'].defaultAttributes },
        children: [],
      },
      {
        id: generateId(),
        type: 'mc-column',
        attributes: { ...componentRegistry['mc-column'].defaultAttributes },
        children: [],
      },
    ]
  } else if (def.acceptsChildren) {
    comp.children = []
  }

  return comp
}

const MAX_HISTORY = 50

function pushHistory(state: EmailStore): Pick<EmailStore, 'history' | 'historyIndex'> {
  const entry: HistoryEntry = {
    components: deepClone(state.components),
    selectedId: state.selectedId,
  }
  // Truncate any redo entries
  const newHistory = state.history.slice(0, state.historyIndex + 1)
  newHistory.push(entry)
  // Limit history size
  if (newHistory.length > MAX_HISTORY) {
    newHistory.shift()
  }
  return {
    history: newHistory,
    historyIndex: newHistory.length - 1,
  }
}

export const useEmailStore = create<EmailStore>((set, get) => ({
  components: [],
  selectedId: null,
  activeTab: 'editor',
  viewportMode: 'desktop',
  customWidth: 400,
  hiddenIds: new Set(),
  history: [{ components: [], selectedId: null }],
  historyIndex: 0,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setViewportMode: (mode) => set({ viewportMode: mode }),
  setCustomWidth: (width) => set({ customWidth: width }),
  selectComponent: (id) => set({ selectedId: id }),

  toggleHidden: (id) => {
    set((state) => {
      const next = new Set(state.hiddenIds)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return { hiddenIds: next }
    })
  },

  addComponent: (type, parentId, index) => {
    const newComp = createComponent(type)
    set((state) => {
      const hist = pushHistory(state)
      const components = deepClone(state.components)

      const isLayoutType = type === 'mc-section' || type === 'mc-hero' || type === 'mc-group' || type === 'mc-column'
      const isContentType = !isLayoutType

      if (!parentId) {
        // Root level — only sections/heroes are valid at root
        if (type === 'mc-section' || type === 'mc-hero' || type === 'mc-group') {
          if (index !== undefined) {
            components.splice(index, 0, newComp)
          } else {
            components.push(newComp)
          }
        } else {
          // Content or column dropped at root → wrap in section+column
          const section = createComponent('mc-section')
          if (isContentType) {
            section.children![0].children = [newComp]
          } else {
            // It's mc-column — put directly in section
            section.children = [newComp]
          }
          if (index !== undefined) {
            components.splice(index, 0, section)
          } else {
            components.push(section)
          }
        }
      } else {
        const parent = findComponent(components, parentId)
        if (!parent) return state

        // Smart routing: content dropped into a section → redirect to first column
        if (isContentType && (parent.type === 'mc-section' || parent.type === 'mc-group')) {
          if (parent.children && parent.children.length > 0) {
            const firstCol = parent.children[0]
            if (!firstCol.children) firstCol.children = []
            if (index !== undefined) {
              firstCol.children.splice(index, 0, newComp)
            } else {
              firstCol.children.push(newComp)
            }
          } else {
            // Section has no columns yet — create one
            const col = createComponent('mc-column')
            col.children = [newComp]
            parent.children = [col]
          }
        } else if (parent.children !== undefined) {
          if (index !== undefined) {
            parent.children.splice(index, 0, newComp)
          } else {
            parent.children.push(newComp)
          }
        }
      }

      return { components, selectedId: newComp.id, ...hist }
    })
  },

  removeComponent: (id) => {
    set((state) => {
      const hist = pushHistory(state)
      const components = deepClone(state.components)
      const { parent, index } = findParentAndIndex(components, id)
      if (parent && index >= 0) {
        parent.splice(index, 1)
      }
      return {
        components,
        selectedId: state.selectedId === id ? null : state.selectedId,
        ...hist,
      }
    })
  },

  moveComponent: (fromParentId, fromIndex, toParentId, toIndex) => {
    set((state) => {
      const hist = pushHistory(state)
      const components = deepClone(state.components)

      let fromArray: EmailComponent[]
      if (fromParentId) {
        const fromParent = findComponent(components, fromParentId)
        if (!fromParent?.children) return state
        fromArray = fromParent.children
      } else {
        fromArray = components
      }

      if (fromIndex < 0 || fromIndex >= fromArray.length) return state
      const [moved] = fromArray.splice(fromIndex, 1)

      let toArray: EmailComponent[]
      if (toParentId) {
        const toParent = findComponent(components, toParentId)
        if (!toParent?.children) return state
        toArray = toParent.children
      } else {
        toArray = components
      }

      const adjustedIndex = fromParentId === toParentId && fromIndex < toIndex ? toIndex - 1 : toIndex
      toArray.splice(Math.max(0, adjustedIndex), 0, moved)

      return { components, ...hist }
    })
  },

  updateComponentAttributes: (id, attrs) => {
    set((state) => {
      const hist = pushHistory(state)
      const components = deepClone(state.components)
      const comp = findComponent(components, id)
      if (comp) {
        comp.attributes = { ...comp.attributes, ...attrs }
      }
      return { components, ...hist }
    })
  },

  updateComponentContent: (id, content) => {
    set((state) => {
      const hist = pushHistory(state)
      const components = deepClone(state.components)
      const comp = findComponent(components, id)
      if (comp) {
        comp.content = content
      }
      return { components, ...hist }
    })
  },

  duplicateComponent: (id) => {
    set((state) => {
      const hist = pushHistory(state)
      const components = deepClone(state.components)
      const { parent, index } = findParentAndIndex(components, id)
      if (parent && index >= 0) {
        const clone = cloneWithNewIds(parent[index])
        parent.splice(index + 1, 0, clone)
        return { components, selectedId: clone.id, ...hist }
      }
      return state
    })
  },

  undo: () => {
    set((state) => {
      if (state.historyIndex <= 0) return state
      const newIndex = state.historyIndex - 1
      const entry = state.history[newIndex]
      return {
        components: deepClone(entry.components),
        selectedId: entry.selectedId,
        historyIndex: newIndex,
      }
    })
  },

  redo: () => {
    set((state) => {
      if (state.historyIndex >= state.history.length - 1) return state
      const newIndex = state.historyIndex + 1
      const entry = state.history[newIndex]
      return {
        components: deepClone(entry.components),
        selectedId: entry.selectedId,
        historyIndex: newIndex,
      }
    })
  },

  canUndo: () => {
    const state = get()
    return state.historyIndex > 0
  },

  canRedo: () => {
    const state = get()
    return state.historyIndex < state.history.length - 1
  },

  getSelectedComponent: () => {
    const { components, selectedId } = get()
    if (!selectedId) return null
    return findComponent(components, selectedId)
  },

  loadTemplate: (components) =>
    set({
      components,
      selectedId: null,
      history: [{ components: deepClone(components), selectedId: null }],
      historyIndex: 0,
    }),
}))
