export type ComponentType =
  | 'mc-section'
  | 'mc-column'
  | 'mc-text'
  | 'mc-image'
  | 'mc-button'
  | 'mc-divider'
  | 'mc-spacer'
  | 'mc-social'
  | 'mc-hero'
  | 'mc-group'

export type ComponentCategory = 'layout' | 'content'

export interface EmailComponent {
  id: string
  type: ComponentType
  attributes: Record<string, string>
  content?: string
  children?: EmailComponent[]
}

export interface ComponentDefinition {
  type: ComponentType
  label: string
  icon: string
  category: ComponentCategory
  defaultAttributes: Record<string, string>
  defaultContent?: string
  acceptsChildren?: boolean
  childTypes?: ComponentType[]
}

export interface AttributeDefinition {
  key: string
  label: string
  type: 'text' | 'color' | 'number' | 'select' | 'textarea' | 'url'
  options?: string[]
  placeholder?: string
  unit?: string
}

export type ViewportMode = 'desktop' | 'mobile' | 'custom'

export interface ViewportConfig {
  mode: ViewportMode
  width: number
}
