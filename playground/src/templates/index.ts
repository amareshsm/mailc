/**
 * Public API for the unified template registry.
 *
 * Consumers should ONLY import from this barrel — never reach into the
 * per-category files (`theme-attribute.ts`, `dynamic.ts`, …) directly.
 *
 * Typical usage:
 *
 *   import { TEMPLATES, getTemplatesByCategory, getCompileOptions } from '@/templates'
 *
 *   const dynamicTemplates = getTemplatesByCategory(TEMPLATES, 'dynamic')
 *   const result = compile(template.markup, getCompileOptions(template))
 */

export type {
  Template,
  TemplateCategory,
  TemplateStyle,
  TemplateFeature,
  TemplateLevel,
} from './types'

export { TEMPLATES } from './registry'

export {
  getTemplatesByCategory,
  getTemplatesByFeature,
  getTemplateById,
  getCompileOptions,
} from './helpers'
