export interface DragItem {
  id: string
  type: 'sidebar-component' | 'canvas-component'
  componentType?: string
  index?: number
  parentId?: string
}

export interface DropTarget {
  id: string
  type: 'canvas' | 'section' | 'column'
  index: number
}
