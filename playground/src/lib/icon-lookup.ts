import {
  LayoutList,
  Columns2,
  Group,
  Type,
  Image,
  MousePointerClick,
  Minus,
  Space,
  Share2,
  Sparkles,
} from 'lucide-react'
import type { ComponentType } from 'react'

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  LayoutList,
  Columns2,
  Group,
  Type,
  Image,
  MousePointerClick,
  Minus,
  Space,
  Share2,
  Sparkles,
}

export function getIcon(name: string): ComponentType<{ className?: string }> | null {
  return iconMap[name] || null
}
