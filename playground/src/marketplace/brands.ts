/**
 * Multi-brand registry for the plugin marketplace.
 *
 * Each brand is a self-contained design system that registers its components
 * with mailc via `defineComponent()` at module load. This file ties them
 * together so the marketplace UI can list all brands and let users pick one.
 *
 * To add a new brand:
 *   1. Create `<brand>-design-system.ts` exporting `<BRAND>_DESIGN_SYSTEM` and `<BRAND>_COMPONENTS`.
 *   2. Create `<brand>-emails.ts` exporting `<BRAND>_EMAILS`.
 *   3. Import them here and add an entry to `BRANDS`.
 *   4. Import the design system file from `compile-mc.ts` so its components register.
 */

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface BrandComponentSpec {
  type: string
  label: string
  tagline: string
  example: string
}

export interface BrandEmail {
  slug: string
  title: string
  description: string
  category: 'lifecycle' | 'transactional' | 'marketing' | 'product'
  source: string
}

export type BrandCategory =
  | 'saas'
  | 'shoe'
  | 'ecommerce'
  | 'automotive'
  | 'beauty'
  | 'newsletter'

export interface BrandDesignSystem {
  id: string
  name: string
  version: string
  publisher: string
  brandColor: string
  category: BrandCategory
  description: string
}

export interface Brand {
  system: BrandDesignSystem
  components: BrandComponentSpec[]
  emails: BrandEmail[]
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

import { ACME_DESIGN_SYSTEM, ACME_COMPONENTS } from './acme-design-system'
import { ACME_EMAILS } from './acme-emails'
import { KICKS_DESIGN_SYSTEM, KICKS_COMPONENTS } from './kicks-design-system'
import { KICKS_EMAILS } from './kicks-emails'
import { ESSENTIALS_DESIGN_SYSTEM, ESSENTIALS_COMPONENTS } from './mailc-essentials-design-system'
import { ESSENTIALS_EMAILS } from './mailc-essentials-emails'
import { ECOM_DESIGN_SYSTEM, ECOM_COMPONENTS } from './ecom-design-system'
import { ECOM_EMAILS } from './ecom-emails'
import { AUTO_DESIGN_SYSTEM, AUTO_COMPONENTS } from './auto-design-system'
import { AUTO_EMAILS } from './auto-emails'
import { GLOW_DESIGN_SYSTEM, GLOW_COMPONENTS } from './glow-design-system'
import { GLOW_EMAILS } from './glow-emails'

const ACME_AS_BRAND: BrandDesignSystem = {
  id: 'acme',
  name: ACME_DESIGN_SYSTEM.name,
  version: ACME_DESIGN_SYSTEM.version,
  publisher: ACME_DESIGN_SYSTEM.publisher,
  brandColor: ACME_DESIGN_SYSTEM.brandColor,
  category: 'saas',
  description:
    'Generic SaaS design system for transactional and lifecycle emails — onboarding, receipts, pricing.',
}

export const BRANDS: Brand[] = [
  {
    system: ESSENTIALS_DESIGN_SYSTEM,
    components: ESSENTIALS_COMPONENTS,
    emails: ESSENTIALS_EMAILS,
  },
  {
    system: ACME_AS_BRAND,
    components: ACME_COMPONENTS,
    emails: ACME_EMAILS,
  },
  {
    system: KICKS_DESIGN_SYSTEM,
    components: KICKS_COMPONENTS,
    emails: KICKS_EMAILS,
  },
  {
    system: ECOM_DESIGN_SYSTEM,
    components: ECOM_COMPONENTS,
    emails: ECOM_EMAILS,
  },
  {
    system: AUTO_DESIGN_SYSTEM,
    components: AUTO_COMPONENTS,
    emails: AUTO_EMAILS,
  },
  {
    system: GLOW_DESIGN_SYSTEM,
    components: GLOW_COMPONENTS,
    emails: GLOW_EMAILS,
  },
]

export function getBrand(id: string): Brand | undefined {
  return BRANDS.find((b) => b.system.id === id)
}
