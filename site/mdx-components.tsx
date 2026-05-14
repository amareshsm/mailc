import defaultMdxComponents from 'fumadocs-ui/mdx'
import { Tab, Tabs } from 'fumadocs-ui/components/tabs'
import type { MDXComponents } from 'mdx/types'
import { ComponentDemo } from '@/components/ComponentDemo'
import { CompilePhasesFlow } from '@/components/CompilePhasesFlow'

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Tab,
    Tabs,
    ComponentDemo,
    CompilePhasesFlow,
    ...components,
  }
}
