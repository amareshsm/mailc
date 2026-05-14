/**
 * component-icons — metadata and icons for mailc components.
 * Used by the Inspector panel layers tree and detail rows.
 *
 * @module lib/component-icons
 */
import {
  Code2,
  Mail,
  FileCode,
  LayoutTemplate,
  Columns2,
  Type,
  MousePointerClick,
  Image,
  Minus,
  GitBranch,
  Repeat2,
} from 'lucide-react'

export interface ComponentMeta {
  label: string
  Icon: React.ComponentType<{ className?: string }>
}

const COMPONENT_META: Record<string, ComponentMeta> = {
  'mc':         { label: 'Document',  Icon: Mail },
  'mc-head':    { label: 'Head',      Icon: FileCode },
  'mc-title':   { label: 'Title',     Icon: FileCode },
  'mc-preview': { label: 'Preview',   Icon: FileCode },
  'mc-body':    { label: 'Body',      Icon: LayoutTemplate },
  'mc-section': { label: 'Section',   Icon: LayoutTemplate },
  'mc-column':  { label: 'Column',    Icon: Columns2 },
  'mc-text':    { label: 'Text',      Icon: Type },
  'mc-button':  { label: 'Button',    Icon: MousePointerClick },
  'mc-image':   { label: 'Image',     Icon: Image },
  'mc-divider': { label: 'Divider',   Icon: Minus },
  'mc-if':      { label: 'If',        Icon: GitBranch },
  'mc-each':    { label: 'Each',      Icon: Repeat2 },
}

/**
 * Returns metadata (display label + icon) for a mailc component type.
 * Falls back to a generic code icon with the component name stripped of `mc-`.
 */
export function getComponentMeta(type: string): ComponentMeta {
  return COMPONENT_META[type] ?? { label: type.replace(/^mc-/, ''), Icon: Code2 }
}
