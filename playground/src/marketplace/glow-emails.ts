import type { BrandEmail } from './brands'

const COLLECTION_LAUNCH = `<mc>
  <mc-head>
    <mc-title>Petal Velvet — New Collection</mc-title>
  </mc-head>
  <mc-body background-color="#fdf2f8">
    <glow-collection-hero
      image-url="https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&q=80"
      eyebrow="New Collection"
      title="Petal Velvet Lipstick"
      subtitle="12 shades, blurring finish, all-day wear."
      cta-label="Shop the collection"
      cta-href="https://example.com/lipstick" />

    <glow-shade-grid
      title="Shop your shade"
      shades="Petal::#f9a8d4::https://example.com/petal|Rose::#ec4899::https://example.com/rose|Plum::#831843::https://example.com/plum|Berry::#9f1239::https://example.com/berry|Mauve::#a78bfa::https://example.com/mauve|Coral::#fb7185::https://example.com/coral|Spice::#dc2626::https://example.com/spice|Nude::#fcd34d::https://example.com/nude" />
  </mc-body>
</mc>`

const TUTORIAL = `<mc>
  <mc-head>
    <mc-title>How to: soft glam look in 4 steps</mc-title>
  </mc-head>
  <mc-body background-color="#fdf2f8">
    <glow-tutorial-card
      image-url="https://images.unsplash.com/photo-1522335789203-aaa749b9aef0?w=1200&q=80"
      title="Master the soft glam look"
      subtitle="In 4 simple steps."
      steps="Prime your lids with our long-wear base|Sweep on a warm shimmer shadow|Line and smudge with kohl pencil|Finish with two coats of volumizing mascara"
      cta-label="Watch the full video"
      cta-href="https://example.com/tutorial" />
  </mc-body>
</mc>`

export const GLOW_EMAILS: BrandEmail[] = [
  { slug: 'collection-launch', title: 'Petal Velvet collection',  description: 'New-collection launch with shade swatches.', category: 'product',    source: COLLECTION_LAUNCH },
  { slug: 'tutorial',          title: 'Soft glam tutorial',       description: 'Editorial how-to with numbered steps.',     category: 'marketing',  source: TUTORIAL },
]
