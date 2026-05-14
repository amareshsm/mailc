/**
 * Zustand store for the JSON email builder.
 *
 * Manages the MCNode tree (sections/columns/content), compile state,
 * theme colors, and template data.
 *
 * Class mode only — all styling uses Tailwind classes via the `class` attribute.
 *
 * GAP: mc-head nodes (mc-title, mc-preview) are managed as flat metadata
 * fields (emailTitle, emailPreview) rather than as editable canvas nodes.
 * The mc-head structure is reconstructed in buildMCDocument() before compile.
 */

import { create } from 'zustand'
import type { MCNode } from 'mailc'
import { mcComponentRegistry } from '@/lib/mc-component-registry'
import { generateId } from '@/lib/id'
import type { WorkerIssue } from '@/workers/compile-worker-types'

export type ActiveTab = 'preview' | 'json' | 'html' | 'sourcemap' | 'theme' | 'data'

// ─── Helpers ───────────────────────────────────────────────────────────────────

export function findNode(nodes: MCNode[], id: string): MCNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children) {
      const found = findNode(node.children, id)
      if (found) return found
    }
  }
  return null
}

export function findParentAndIndex(
  nodes: MCNode[],
  id: string
): { parent: MCNode[] | null; index: number } {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === id) {
      return { parent: nodes, index: i }
    }
    if (nodes[i].children) {
      const result = findParentAndIndex(nodes[i].children!, id)
      if (result.parent !== null) return result
    }
  }
  return { parent: null, index: -1 }
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function createNode(type: string): MCNode {
  const def = mcComponentRegistry[type]
  if (!def) throw new Error(`Unknown MC component type: ${type}`)

  const node: MCNode = {
    id: generateId(),
    type: def.type,
    attributes: { ...def.defaultAttributes },
    content: def.defaultContent,
  }

  // Seed default children for layout containers
  if (type === 'mc-section') {
    node.children = [
      {
        id: generateId(),
        type: 'mc-column',
        attributes: { ...mcComponentRegistry['mc-column'].defaultAttributes },
        children: [],
      },
    ]
  } else if (def.acceptsChildren) {
    node.children = []
  }

  return node
}

// ─── Store interface ────────────────────────────────────────────────────────────

interface JsonBuilderStore {
  // Email metadata (mc-head level)
  // GAP: mc-head nodes are off-canvas. emailTitle and emailPreview are flat
  // metadata fields reconstructed into mc-head children in buildMCDocument().
  emailTitle: string
  emailPreview: string

  // Body nodes (sections inside mc-body)
  nodes: MCNode[]
  selectedId: string | null

  // Theme — class-mode token overrides
  // GAP: No color picker UI — colors are Tailwind class names (bg-brand, text-brand).
  // Adding "brand: '#e11d48'" here enables class names like bg-brand, text-brand.
  themeColors: Record<string, string>

  // Template data for {{ }} resolution
  templateData: Record<string, unknown>

  // Compile state
  compiledHtml: string | null
  compiledErrors: WorkerIssue[]
  compiledWarnings: WorkerIssue[]
  compiledInfo: WorkerIssue[]
  sourceMapJSON: string | null
  compiling: boolean
  compileStats: {
    inputSize: number
    outputSize: number
    compileTime: number
    components: number
  } | null

  // UI
  activeTab: ActiveTab

  // Actions
  setEmailTitle: (title: string) => void
  setEmailPreview: (preview: string) => void

  addNode: (type: string, parentId?: string, index?: number) => void
  removeNode: (id: string) => void
  updateNodeAttributes: (id: string, attrs: Record<string, string>) => void
  updateNodeContent: (id: string, content: string) => void
  moveNode: (
    fromParentId: string | null,
    fromIndex: number,
    toParentId: string | null,
    toIndex: number
  ) => void

  selectNode: (id: string | null) => void
  setActiveTab: (tab: ActiveTab) => void

  setThemeColor: (name: string, value: string) => void
  removeThemeColor: (name: string) => void

  setTemplateData: (data: Record<string, unknown>) => void

  setCompileResult: (
    result: {
      html: string | null
      errors: WorkerIssue[]
      warnings: WorkerIssue[]
      info: WorkerIssue[]
      sourceMapJSON: string | null
      stats: { inputSize: number; outputSize: number; compileTime: number; components: number } | null
    } | null,
    errorMessage?: string
  ) => void
  setCompiling: (compiling: boolean) => void

  // Builds the full MCNode tree for compileFromJSON
  buildMCDocument: () => MCNode

  // Loads a sample email for first-mount display
  loadSampleEmail: () => void

  // Get the currently selected node
  getSelectedNode: () => MCNode | null
}

// ─── Store implementation ───────────────────────────────────────────────────────

export const useJsonBuilderStore = create<JsonBuilderStore>((set, get) => ({
  emailTitle: 'My Email',
  emailPreview: 'Check out our latest updates',
  nodes: [],
  selectedId: null,
  themeColors: {},
  templateData: {},
  compiledHtml: null,
  compiledErrors: [],
  compiledWarnings: [],
  compiledInfo: [],
  sourceMapJSON: null,
  compiling: false,
  compileStats: null,
  activeTab: 'preview',

  setEmailTitle: (title) => set({ emailTitle: title }),
  setEmailPreview: (preview) => set({ emailPreview: preview }),

  addNode: (type, parentId, index) => {
    const newNode = createNode(type)

    set((state) => {
      const nodes = deepClone(state.nodes)

      const isLayoutType = type === 'mc-section'
      const isContentType = !isLayoutType && type !== 'mc-column'

      if (!parentId) {
        // Root level — only sections are valid at root
        if (type === 'mc-section') {
          if (index !== undefined) {
            nodes.splice(index, 0, newNode)
          } else {
            nodes.push(newNode)
          }
        } else if (isContentType) {
          // Content dropped at root → wrap in section + column
          const section = createNode('mc-section')
          section.children![0].children = [newNode]
          if (index !== undefined) {
            nodes.splice(index, 0, section)
          } else {
            nodes.push(section)
          }
        }
      } else {
        const parent = findNode(nodes, parentId)
        if (!parent) return state

        if (isContentType && parent.type === 'mc-section') {
          // Content dropped into section → add to first column
          if (parent.children && parent.children.length > 0) {
            const firstCol = parent.children[0]
            if (!firstCol.children) firstCol.children = []
            if (index !== undefined) {
              firstCol.children.splice(index, 0, newNode)
            } else {
              firstCol.children.push(newNode)
            }
          } else {
            const col = createNode('mc-column')
            col.children = [newNode]
            parent.children = [col]
          }
        } else if (parent.children !== undefined) {
          if (index !== undefined) {
            parent.children.splice(index, 0, newNode)
          } else {
            parent.children.push(newNode)
          }
        }
      }

      return { nodes, selectedId: newNode.id }
    })
  },

  removeNode: (id) => {
    set((state) => {
      const nodes = deepClone(state.nodes)
      const { parent, index } = findParentAndIndex(nodes, id)
      if (parent && index >= 0) {
        parent.splice(index, 1)
      }
      return {
        nodes,
        selectedId: state.selectedId === id ? null : state.selectedId,
      }
    })
  },

  updateNodeAttributes: (id, attrs) => {
    set((state) => {
      const nodes = deepClone(state.nodes)
      const node = findNode(nodes, id)
      if (node) {
        node.attributes = { ...node.attributes, ...attrs }
      }
      return { nodes }
    })
  },

  updateNodeContent: (id, content) => {
    set((state) => {
      const nodes = deepClone(state.nodes)
      const node = findNode(nodes, id)
      if (node) {
        node.content = content
      }
      return { nodes }
    })
  },

  moveNode: (fromParentId, fromIndex, toParentId, toIndex) => {
    set((state) => {
      const nodes = deepClone(state.nodes)

      let fromArray: MCNode[]
      if (fromParentId) {
        const fromParent = findNode(nodes, fromParentId)
        if (!fromParent?.children) return state
        fromArray = fromParent.children
      } else {
        fromArray = nodes
      }

      if (fromIndex < 0 || fromIndex >= fromArray.length) return state
      const [moved] = fromArray.splice(fromIndex, 1)

      let toArray: MCNode[]
      if (toParentId) {
        const toParent = findNode(nodes, toParentId)
        if (!toParent?.children) return state
        toArray = toParent.children
      } else {
        toArray = nodes
      }

      const adjustedIndex =
        fromParentId === toParentId && fromIndex < toIndex ? toIndex - 1 : toIndex
      toArray.splice(Math.max(0, adjustedIndex), 0, moved)

      return { nodes }
    })
  },

  selectNode: (id) => set({ selectedId: id }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setThemeColor: (name, value) => {
    set((state) => ({
      themeColors: { ...state.themeColors, [name]: value },
    }))
  },

  removeThemeColor: (name) => {
    set((state) => {
      const next = { ...state.themeColors }
      delete next[name]
      return { themeColors: next }
    })
  },

  setTemplateData: (data) => set({ templateData: data }),

  setCompileResult: (result, errorMessage) => {
    if (result === null) {
      set({
        compiling: false,
        compiledHtml: null,
        compiledErrors: errorMessage
          ? [{ code: 'COMPILE_EXCEPTION', message: errorMessage, severity: 'error' }]
          : [],
        compiledWarnings: [],
        compiledInfo: [],
        sourceMapJSON: null,
        compileStats: null,
      })
      return
    }
    set({
      compiling: false,
      compiledHtml: result.html,
      compiledErrors: result.errors,
      compiledWarnings: result.warnings,
      compiledInfo: result.info,
      sourceMapJSON: result.sourceMapJSON,
      compileStats: result.stats,
    })
  },

  setCompiling: (compiling) => set({ compiling }),

  buildMCDocument: () => {
    const { emailTitle, emailPreview, nodes } = get()

    // Build mc-head children
    const headChildren: MCNode[] = []

    if (emailTitle) {
      headChildren.push({
        id: generateId(),
        type: 'mc-title',
        attributes: {},
        content: emailTitle,
      })
    }

    if (emailPreview) {
      headChildren.push({
        id: generateId(),
        type: 'mc-preview',
        attributes: {},
        content: emailPreview,
      })
    }

    // Build the full document
    const document: MCNode = {
      id: generateId(),
      type: 'mc',
      attributes: {},
      children: [
        {
          id: generateId(),
          type: 'mc-head',
          attributes: {},
          children: headChildren,
        },
        {
          id: generateId(),
          type: 'mc-body',
          attributes: {},
          children: deepClone(nodes),
        },
      ],
    }

    return document
  },

  loadSampleEmail: () => {
    const textId = generateId()
    const btnId = generateId()
    const colId = generateId()
    const sectionId = generateId()
    const section2Id = generateId()
    const col2Id = generateId()
    const imgId = generateId()

    const nodes: MCNode[] = [
      {
        id: sectionId,
        type: 'mc-section',
        attributes: { class: 'bg-white' },
        children: [
          {
            id: colId,
            type: 'mc-column',
            attributes: { class: '' },
            children: [
              {
                id: textId,
                type: 'mc-text',
                attributes: { class: 'text-2xl font-bold text-gray-900 text-center' },
                content: 'Welcome to mailc JSON Builder',
              },
              {
                id: generateId(),
                type: 'mc-text',
                attributes: { class: 'text-base text-gray-600 text-center' },
                content: 'Build emails visually using a JSON tree. Edit nodes, add components, and see the live preview.',
              },
              {
                id: btnId,
                type: 'mc-button',
                attributes: {
                  href: 'https://example.com',
                  class: 'bg-blue-600 text-white font-semibold rounded',
                },
                content: 'Get Started',
              },
            ],
          },
        ],
      },
      {
        id: section2Id,
        type: 'mc-section',
        attributes: { class: 'bg-gray-50' },
        children: [
          {
            id: col2Id,
            type: 'mc-column',
            attributes: { class: '' },
            children: [
              {
                id: imgId,
                type: 'mc-image',
                attributes: {
                  src: 'https://placehold.co/600x200/e2e8f0/64748b?text=Image',
                  alt: 'Placeholder image',
                  class: '',
                },
              },
              {
                id: generateId(),
                type: 'mc-divider',
                attributes: { class: '' },
              },
              {
                id: generateId(),
                type: 'mc-spacer',
                attributes: { class: 'h-8' },
              },
            ],
          },
        ],
      },
    ]

    set({
      nodes,
      selectedId: null,
      emailTitle: 'Welcome Email',
      emailPreview: 'Build emails with the JSON builder',
    })
  },

  getSelectedNode: () => {
    const { nodes, selectedId } = get()
    if (!selectedId) return null
    return findNode(nodes, selectedId)
  },
}))
