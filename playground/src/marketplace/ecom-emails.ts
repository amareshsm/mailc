import type { BrandEmail } from './brands'

const CART_RECOVERY = `<mc>
  <mc-head>
    <mc-title>You left items in your cart</mc-title>
  </mc-head>
  <mc-body background-color="#f1f5f9">
    <ecom-cart-recovery
      headline="You left these behind"
      subhead="Your cart misses you. Finish checking out — we saved your items for the next 24 hours."
      items="Wool Beanie::$29.99::https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=200&q=80|Linen Shirt::$57.98::https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=200&q=80"
      total="$87.97"
      cta-label="Complete checkout"
      cta-href="https://shop.example.com/checkout" />
  </mc-body>
</mc>`

const SHIPPED = `<mc>
  <mc-head>
    <mc-title>Your order is on the way</mc-title>
  </mc-head>
  <mc-body background-color="#f1f5f9">
    <ecom-order-status
      order-number="#A8124-2026"
      status="shipped"
      eta="Tuesday, May 12"
      address="550 Mission St, San Francisco"
      tracking-href="https://shop.example.com/track/A8124" />
  </mc-body>
</mc>`

const DEALS = `<mc>
  <mc-head>
    <mc-title>Today's deals — up to 40% off</mc-title>
  </mc-head>
  <mc-body background-color="#ffffff">
    <ecom-deal-grid
      title="Today's deals"
      products="Linen Shirt::$120::$79::https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=400&q=80::https://example.com/p1|Wool Beanie::$45::$29::https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=400&q=80::https://example.com/p2|Leather Wallet::$80::$49::https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&q=80::https://example.com/p3|Canvas Tote::$60::$39::https://images.unsplash.com/photo-1591561954557-26941169b49e?w=400&q=80::https://example.com/p4" />
  </mc-body>
</mc>`

export const ECOM_EMAILS: BrandEmail[] = [
  { slug: 'cart-recovery', title: 'Cart abandonment',     description: 'Win-back email with cart contents and total.',          category: 'lifecycle',     source: CART_RECOVERY },
  { slug: 'order-shipped', title: 'Order shipped',        description: 'Transactional shipment confirmation with tracking.',    category: 'transactional', source: SHIPPED },
  { slug: 'todays-deals',  title: 'Today\'s deals',       description: 'Promotional grid with strikethrough pricing.',          category: 'marketing',     source: DEALS },
]
