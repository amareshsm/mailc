import type { BrandEmail } from './brands'

const TRAVEL_NEWSLETTER = `<mc>
  <mc-head>
    <mc-title>Antarctica — Journey to the edge of the earth</mc-title>
  </mc-head>
  <mc-body background-color="#f8fafc">
    <essentials-overlay-hero
      image-url="https://images.unsplash.com/photo-1517783999520-f068d7431a60?w=1200&q=80"
      eyebrow="Journey to the edge of the earth"
      title="Antarctica"
      subtitle="Edition No.5"
      body="Step into a world of untouched beauty and icy grandeur. From towering glaciers to vast, silent expanses, explore the last great wilderness on Earth."
      cta-label="Discover now"
      cta-href="https://example.com/antarctica" />
  </mc-body>
</mc>`

const STATS_DIGEST = `<mc>
  <mc-head>
    <mc-title>Your monthly metrics digest</mc-title>
  </mc-head>
  <mc-body background-color="#f8fafc">
    <essentials-stat-card-grid
      metric-label="API Calls"
      metric-value="25k"
      metric-change="↗ 10%"
      metric-sub="Compared to last month"
      metric-href="https://example.com/report"
      image-url="https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=600&q=80"
      feature-title="One API, unlimited potential."
      feature-body="Powering 28,000+ vendors across the Americas and Europe."
      side-label="Engine v2"
      side-value="75x"
      side-sub="faster" />
  </mc-body>
</mc>`

const COLLECTION_ROLLUP = `<mc>
  <mc-head>
    <mc-title>This week's collections</mc-title>
  </mc-head>
  <mc-body background-color="#ffffff">
    <essentials-category-grid
      card1-title="Monochrome Mood"
      card1-image="https://images.unsplash.com/photo-1485231183945-fffde7cc051e?w=400&q=80"
      card1-href="https://example.com/mono"
      card2-title="Bold moves"
      card2-image="https://images.unsplash.com/photo-1516762689617-e1cffcef479d?w=400&q=80"
      card2-href="https://example.com/bold"
      card3-title="Redux Denim"
      card3-image="https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80"
      card3-href="https://example.com/denim"
      card4-title="Casual Cool"
      card4-image="https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=400&q=80"
      card4-href="https://example.com/casual" />
  </mc-body>
</mc>`

const INSTALLMENTS = `<mc>
  <mc-head>
    <mc-title>Your installment plan</mc-title>
  </mc-head>
  <mc-body background-color="#f8fafc">
    <essentials-payment-timeline
      steps="17/11::$9.99|17/12::$9.99|17/01::$9.99|17/02::$9.99"
      paid-count="1"
      paid-prefix="Paid: " />
  </mc-body>
</mc>`

export const ESSENTIALS_EMAILS: BrandEmail[] = [
  { slug: 'travel-newsletter',  title: 'Antarctica — Edition No.5', description: 'Editorial travel newsletter with overlay hero.', category: 'marketing',     source: TRAVEL_NEWSLETTER },
  { slug: 'monthly-digest',     title: 'Monthly metrics digest',     description: 'Bento dashboard recap email for SaaS users.',  category: 'lifecycle',     source: STATS_DIGEST },
  { slug: 'collection-rollup',  title: 'This week\'s collections',   description: 'Editorial collection grid for fashion brands.', category: 'marketing',    source: COLLECTION_ROLLUP },
  { slug: 'installments',       title: 'Installment plan',           description: 'Payment timeline with paid / upcoming steps.', category: 'transactional', source: INSTALLMENTS },
]
