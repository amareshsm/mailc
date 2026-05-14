/**
 * Sample emails authored against the Kicks & Co. design system.
 */

import type { BrandEmail } from './brands'

const TRAIL_DROP = `<mc>
  <mc-head>
    <mc-title>New drop — Trailburst Pro Runner</mc-title>
  </mc-head>
  <mc-body background-color="#f1f5f9">
    <kicks-product-hero
      eyebrow="New Drop"
      title-bold="Trailburst"
      title-rest="Pro Runner"
      subtitle="Built for every terrain."
      body="A featherweight knit upper meets a carbon-plate midsole and gripped lugs designed for trails, tarmac, and everything in between. Available in three new colorways for spring."
      cta-label="Shop the drop"
      cta-href="https://example.com/trailburst-pro" />
  </mc-body>
</mc>`

const RESTOCK = `<mc>
  <mc-head>
    <mc-title>Back in stock — your size is here</mc-title>
  </mc-head>
  <mc-body background-color="#ffffff">
    <kicks-product-hero
      eyebrow="Back in Stock"
      title-bold="Cloudwave"
      title-rest="Glide 4"
      subtitle="Sizes are flying — grab yours."
      body="The everyday cushioned trainer is back. Limited inventory across our full size range, refreshed in obsidian-black and bone-white. Once they're gone, they're gone."
      cta-label="See available sizes"
      cta-href="https://example.com/cloudwave-glide-4" />

    <kicks-size-grid
      title="Pick your size"
      sizes="7,7.5,8,8.5,9,9.5,10,10.5"
      unavailable="7,9.5"
      href-template="https://example.com/buy?size={size}" />
  </mc-body>
</mc>`

export const KICKS_EMAILS: BrandEmail[] = [
  {
    slug: 'trailburst-launch',
    title: 'Trailburst Pro Runner — New Drop',
    description: 'Single-product launch email with full-bleed background hero.',
    category: 'product',
    source: TRAIL_DROP,
  },
  {
    slug: 'restock-alert',
    title: 'Cloudwave Glide 4 — Back in Stock',
    description: 'Restock alert combining the hero with a size selector grid.',
    category: 'lifecycle',
    source: RESTOCK,
  },
]
