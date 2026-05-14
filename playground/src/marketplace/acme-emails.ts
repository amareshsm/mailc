/**
 * Sample emails authored against the AcmeCorp design system.
 *
 * Each email is a `.mc` markup string that uses only the registered
 * `acme-*` plugin components — illustrating how a company's branded
 * design system flows from a npm package into actual emails.
 */

export interface AcmeEmail {
  slug: string
  title: string
  description: string
  category: 'lifecycle' | 'transactional' | 'marketing' | 'product'
  source: string
}

const WELCOME = `<mc>
  <mc-head>
    <mc-title>Welcome to Acme</mc-title>
  </mc-head>
  <mc-body background-color="#f8fafc">
    <acme-hero
      title="Welcome aboard 👋"
      subtitle="You're all set. Here's how to send your first email in 60 seconds."
      cta-label="Open dashboard"
      cta-href="https://acme.com/app" />

    <acme-feature
      icon="⚡"
      title="Lightning-fast setup"
      description="Drop in the SDK, point it at a template, hit send. No DNS gymnastics required." />

    <acme-feature
      icon="🎨"
      title="Your brand, baked in"
      description="Every email respects your design system — colors, type, spacing — automatically." />

    <acme-feature
      icon="📊"
      title="Insight on every send"
      description="Open, click, and conversion analytics, scoped down to the component level." />

    <acme-footer
      company-name="Acme Corp"
      address="123 Market St, San Francisco, CA 94105"
      unsubscribe-href="https://acme.com/unsubscribe?id=u_123" />
  </mc-body>
</mc>`

const PRODUCT_LAUNCH = `<mc>
  <mc-head>
    <mc-title>Introducing Acme Workflows</mc-title>
  </mc-head>
  <mc-body background-color="#f8fafc">
    <acme-hero
      title="Workflows is here 🚀"
      subtitle="Chain triggers, conditions, and sends into one declarative pipeline."
      cta-label="Read the launch post"
      cta-href="https://acme.com/blog/workflows"
      bg-color="#0f172a" />

    <acme-feature
      icon="🔗"
      title="Chain anything"
      description="Webhooks → conditions → branching sends. All described in YAML, all version-controlled." />

    <acme-feature
      icon="🧪"
      title="Test before you ship"
      description="Dry-run any workflow against last week's events. See exactly what would have sent." />

    <acme-feature
      icon="🛡️"
      title="Safe by default"
      description="Per-recipient rate limits and quiet hours are on by default. No more 3am test blasts." />

    <acme-footer
      company-name="Acme Corp"
      address="123 Market St, San Francisco, CA 94105"
      unsubscribe-href="https://acme.com/unsubscribe?id=u_123" />
  </mc-body>
</mc>`

const PRICING = `<mc>
  <mc-head>
    <mc-title>Choose your Acme plan</mc-title>
  </mc-head>
  <mc-body background-color="#f8fafc">
    <acme-hero
      title="Pricing that scales with you"
      subtitle="Start free. Upgrade when you outgrow it."
      bg-color="#7c3aed" />

    <acme-price-card
      plan="Starter"
      price="Free"
      features="1,000 sends/mo, 1 template, Community support"
      cta-label="Start free"
      cta-href="https://acme.com/signup" />

    <acme-price-card
      plan="Pro"
      price="$29/mo"
      features="50,000 sends/mo, Unlimited templates, Priority support, Custom domain"
      cta-label="Choose Pro"
      cta-href="https://acme.com/checkout?plan=pro"
      highlight="true" />

    <acme-price-card
      plan="Scale"
      price="Custom"
      features="Unlimited sends, Dedicated infra, SLA, SSO &amp; SCIM, Solutions engineer"
      cta-label="Talk to sales"
      cta-href="https://acme.com/contact" />

    <acme-footer
      company-name="Acme Corp"
      address="123 Market St, San Francisco, CA 94105"
      unsubscribe-href="https://acme.com/unsubscribe?id=u_123" />
  </mc-body>
</mc>`

const REENGAGEMENT = `<mc>
  <mc-head>
    <mc-title>We miss you at Acme</mc-title>
  </mc-head>
  <mc-body background-color="#f8fafc">
    <acme-hero
      title="It's been a while 👀"
      subtitle="Your account is still here, and we shipped a few things you'd probably like."
      cta-label="See what's new"
      cta-href="https://acme.com/changelog" />

    <acme-feature
      icon="🆕"
      title="Visual builder beta"
      description="Drag-and-drop email composition, with the same JSON output devs ship to prod." />

    <acme-feature
      icon="🤖"
      title="AI copy assist"
      description="One click to rewrite a CTA — three variants, ranked by historical click-through." />

    <acme-feature
      icon="💸"
      title="20% off your next 3 months"
      description="Use code COMEBACK at checkout. Valid until the end of the month." />

    <acme-footer
      company-name="Acme Corp"
      address="123 Market St, San Francisco, CA 94105"
      unsubscribe-href="https://acme.com/unsubscribe?id=u_123" />
  </mc-body>
</mc>`

const RECEIPT = `<mc>
  <mc-head>
    <mc-title>Your Acme receipt</mc-title>
  </mc-head>
  <mc-body background-color="#f8fafc">
    <acme-hero
      title="Thanks for your purchase ✅"
      subtitle="A quick summary of your order — keep this for your records."
      bg-color="#0f172a" />

    <acme-feature
      icon="🧾"
      title="Order #A-10293"
      description="Acme Pro — annual plan. Charged to Visa ending 4242 on March 4, 2026." />

    <acme-feature
      icon="📧"
      title="Need an invoice?"
      description="A PDF invoice is attached to this email and also available in your billing portal." />

    <acme-feature
      icon="🔐"
      title="Manage billing anytime"
      description="Update payment method, change plan, or download past invoices from your account." />

    <acme-footer
      company-name="Acme Corp"
      address="123 Market St, San Francisco, CA 94105"
      unsubscribe-href="https://acme.com/billing/preferences" />
  </mc-body>
</mc>`

export const ACME_EMAILS: AcmeEmail[] = [
  {
    slug: 'welcome',
    title: 'Welcome onboarding',
    description: 'First-touch onboarding email — sent on signup.',
    category: 'lifecycle',
    source: WELCOME,
  },
  {
    slug: 'product-launch',
    title: 'Product launch announcement',
    description: 'Marketing blast to existing users about a new feature.',
    category: 'marketing',
    source: PRODUCT_LAUNCH,
  },
  {
    slug: 'pricing',
    title: 'Pricing comparison',
    description: 'Sales-led email with a 3-tier pricing card layout.',
    category: 'marketing',
    source: PRICING,
  },
  {
    slug: 're-engagement',
    title: 'Re-engagement / win-back',
    description: 'Nudge for inactive users with a discount code.',
    category: 'lifecycle',
    source: REENGAGEMENT,
  },
  {
    slug: 'receipt',
    title: 'Purchase receipt',
    description: 'Transactional receipt with order details.',
    category: 'transactional',
    source: RECEIPT,
  },
]

export function getAcmeEmail(slug: string): AcmeEmail | undefined {
  return ACME_EMAILS.find((e) => e.slug === slug)
}
