/**
 * Class-based email templates for the /brand-theme-class playground.
 *
 * These templates contain ZERO hardcoded hex values — all colors come from
 * Tailwind-style class names (bg-brand, text-brand-heading, etc.) which are
 * resolved at compile time from the theme token map.
 *
 * Changing a token → recompile with updated theme.extend.colors → only elements
 * using that class name change. No hex-collision side-effects.
 */

export interface ClassTemplateEntry {
  id: string
  name: string
  markup: string
}

export const CLASS_TEMPLATES: ClassTemplateEntry[] = [
  {
    id: 'welcome-class',
    name: 'Welcome Email',
    markup: `<mc>
  <mc-head>
    <mc-title>Welcome to Acme!</mc-title>
    <mc-preview>You're in — let's build something great together.</mc-preview>
    <mc-attributes>
      <mc-all font-family="Arial, Helvetica, sans-serif" />
    </mc-attributes>
  </mc-head>
  <mc-body class="bg-brand-outer">

  <!-- Top spacer -->
  <mc-section class="bg-brand-outer p-[20px_0_0]">
    <mc-column></mc-column>
  </mc-section>

  <!-- Header / Logo bar — brand color bg, btn-text colored text -->
  <mc-section class="bg-brand p-[20px_40px]">
    <mc-column width="50%">
      <mc-text class="text-brand-btn-text text-[18px] font-bold">
        ◆ acme
      </mc-text>
    </mc-column>
    <mc-column width="50%">
      <mc-text class="text-brand-btn-text text-right text-[12px]">
        Welcome email
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- Hero block — brand color bg -->
  <mc-section class="bg-brand p-[52px_40px]">
    <mc-column>
      <mc-text class="text-brand-btn-text text-[36px] font-bold text-center leading-[1.2] font-[Georgia,_serif]">
        Welcome to Acme
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- Content card — surface bg -->
  <mc-section class="bg-brand-surface p-[40px_40px_24px]">
    <mc-column>
      <mc-text class="text-brand-heading text-[24px] font-bold text-center font-[Georgia,_serif]">
        Welcome aboard, Sarah 🎉
      </mc-text>
      <mc-text class="text-brand-body text-center p-[16px_0_28px] text-[15px] leading-[1.6]">
        Your account is all set up and ready to explore. We've got everything
        you need to hit the ground running — let's dive in.
      </mc-text>
      <mc-button class="bg-brand text-brand-btn-text rounded-[6px] font-[600] py-[14px] px-[32px]" href="https://example.com">
        Get started →
      </mc-button>
    </mc-column>
  </mc-section>

  <!-- Divider row -->
  <mc-section class="bg-brand-surface px-[40px]">
    <mc-column>
      <mc-divider class="bg-brand-divider p-[0]" />
    </mc-column>
  </mc-section>

  <!-- Features row — 3 columns, all using typography tokens -->
  <mc-section class="bg-brand-surface p-[28px_40px_40px]">
    <mc-column>
      <mc-text class="text-brand-muted text-center text-[28px] p-[0_0_6px]">⚡</mc-text>
      <mc-text class="text-brand-heading text-center text-[13px] font-[600]">Fast setup</mc-text>
      <mc-text class="text-brand-body text-center text-[12px] p-[4px_0_0]">Up and running in minutes</mc-text>
    </mc-column>
    <mc-column>
      <mc-text class="text-brand-muted text-center text-[28px] p-[0_0_6px]">🛡</mc-text>
      <mc-text class="text-brand-heading text-center text-[13px] font-[600]">Enterprise secure</mc-text>
      <mc-text class="text-brand-body text-center text-[12px] p-[4px_0_0]">SOC 2 Type II certified</mc-text>
    </mc-column>
    <mc-column>
      <mc-text class="text-brand-muted text-center text-[28px] p-[0_0_6px]">💬</mc-text>
      <mc-text class="text-brand-heading text-center text-[13px] font-[600]">24 / 7 support</mc-text>
      <mc-text class="text-brand-body text-center text-[12px] p-[4px_0_0]">Always here when you need us</mc-text>
    </mc-column>
  </mc-section>

  <!-- Footer -->
  <mc-section class="bg-brand-outer p-[20px_40px_32px]">
    <mc-column>
      <mc-text class="text-brand-muted text-center text-[11px]">
        © 2025 Acme Inc. · All rights reserved.
      </mc-text>
    </mc-column>
  </mc-section>

  </mc-body>
</mc>`,
  },

  {
    id: 'order-class',
    name: 'Order Confirmation',
    markup: `<mc>
  <mc-head>
    <mc-title>Order Confirmed — #ORD-4821</mc-title>
    <mc-preview>Your order is confirmed and on its way. Thank you!</mc-preview>
    <mc-attributes>
      <mc-all font-family="Arial, Helvetica, sans-serif" />
    </mc-attributes>
  </mc-head>
  <mc-body class="bg-brand-outer">

  <!-- Top spacer -->
  <mc-section class="bg-brand-outer p-[20px_0_0]">
    <mc-column></mc-column>
  </mc-section>

  <!-- Header -->
  <mc-section class="bg-brand p-[20px_40px]">
    <mc-column width="60%">
      <mc-text class="text-brand-btn-text text-[16px] font-bold">
        ◆ acme
      </mc-text>
    </mc-column>
    <mc-column width="40%">
      <mc-text class="text-brand-btn-text text-right text-[12px]">
        Order #ORD-4821
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- Order confirmed banner -->
  <mc-section class="bg-brand p-[32px_40px_36px]">
    <mc-column>
      <mc-text class="text-brand-btn-text text-center text-[13px] font-[600] p-[0_0_10px]">
        ✓ ORDER CONFIRMED
      </mc-text>
      <mc-text class="text-brand-btn-text text-center text-[28px] font-bold font-[Georgia,_serif]">
        Thanks for your order!
      </mc-text>
      <mc-text class="text-brand-btn-text text-center text-[14px] p-[10px_0_0]">
        We'll send a shipping confirmation when it's on its way.
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- Order summary card -->
  <mc-section class="bg-brand-surface p-[28px_40px_8px]">
    <mc-column>
      <mc-text class="text-brand-heading text-[14px] font-[700] p-[0_0_16px]">
        ORDER SUMMARY
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- Item 1 -->
  <mc-section class="bg-brand-surface p-[0_40px_16px]">
    <mc-column width="70%">
      <mc-text class="text-brand-heading text-[14px] font-[600]">Wireless Noise-Cancelling Headphones</mc-text>
      <mc-text class="text-brand-muted text-[12px] p-[4px_0_0]">Qty: 1 · Color: Midnight Black</mc-text>
    </mc-column>
    <mc-column width="30%">
      <mc-text class="text-brand-heading text-[14px] font-[600] text-right">$249.00</mc-text>
    </mc-column>
  </mc-section>

  <!-- Divider -->
  <mc-section class="bg-brand-surface px-[40px]">
    <mc-column><mc-divider class="bg-brand-divider p-[0]" /></mc-column>
  </mc-section>

  <!-- Item 2 -->
  <mc-section class="bg-brand-surface p-[16px_40px]">
    <mc-column width="70%">
      <mc-text class="text-brand-heading text-[14px] font-[600]">USB-C Charging Cable 3m</mc-text>
      <mc-text class="text-brand-muted text-[12px] p-[4px_0_0]">Qty: 2 · Braided Nylon</mc-text>
    </mc-column>
    <mc-column width="30%">
      <mc-text class="text-brand-heading text-[14px] font-[600] text-right">$38.00</mc-text>
    </mc-column>
  </mc-section>

  <!-- Total divider -->
  <mc-section class="bg-brand-surface px-[40px]">
    <mc-column><mc-divider class="bg-brand-divider p-[0]" /></mc-column>
  </mc-section>

  <!-- Total row -->
  <mc-section class="bg-brand-surface p-[16px_40px_32px]">
    <mc-column width="70%">
      <mc-text class="text-brand-heading text-[15px] font-[700]">Total</mc-text>
    </mc-column>
    <mc-column width="30%">
      <mc-text class="text-brand-heading text-[15px] font-[700] text-right">$287.00</mc-text>
    </mc-column>
  </mc-section>

  <!-- CTA -->
  <mc-section class="bg-brand-surface p-[0_40px_40px]">
    <mc-column>
      <mc-button class="bg-brand text-brand-btn-text rounded-[6px] font-[600] py-[14px] px-[32px]" href="https://example.com/orders/4821">
        Track your order →
      </mc-button>
    </mc-column>
  </mc-section>

  <!-- Shipping info -->
  <mc-section class="bg-brand-outer p-[24px_40px]">
    <mc-column>
      <mc-text class="text-brand-muted text-[12px] font-[600] p-[0_0_6px]">SHIPPING TO</mc-text>
      <mc-text class="text-brand-body text-[13px]">Sarah Chen · 42 Market Street, San Francisco CA 94105</mc-text>
    </mc-column>
    <mc-column>
      <mc-text class="text-brand-muted text-[12px] font-[600] p-[0_0_6px] text-right">ESTIMATED DELIVERY</mc-text>
      <mc-text class="text-brand-body text-[13px] text-right">May 2 – May 5, 2025</mc-text>
    </mc-column>
  </mc-section>

  <!-- Footer -->
  <mc-section class="bg-brand-outer p-[4px_40px_32px]">
    <mc-column>
      <mc-divider class="bg-brand-divider p-[0_0_16px]" />
      <mc-text class="text-brand-muted text-center text-[11px]">
        © 2025 Acme Inc. · 42 Market Street, San Francisco CA 94105
      </mc-text>
    </mc-column>
  </mc-section>

  </mc-body>
</mc>`,
  },

  {
    id: 'newsletter-class',
    name: 'Monthly Newsletter',
    markup: `<mc>
  <mc-head>
    <mc-title>Acme Monthly — May 2025</mc-title>
    <mc-preview>Issue #24 is here — catch up on everything that matters this month.</mc-preview>
    <mc-attributes>
      <mc-all font-family="Arial, Helvetica, sans-serif" />
    </mc-attributes>
  </mc-head>
  <mc-body class="bg-brand-outer">

  <!-- Top spacer -->
  <mc-section class="bg-brand-outer p-[20px_0_0]">
    <mc-column></mc-column>
  </mc-section>

  <!-- Header bar -->
  <mc-section class="bg-brand p-[16px_40px]">
    <mc-column width="60%">
      <mc-text class="text-brand-btn-text text-[18px] font-bold">
        ◆ acme
      </mc-text>
    </mc-column>
    <mc-column width="40%">
      <mc-text class="text-brand-btn-text text-right text-[11px] font-[600]">
        MAY 2025 · ISSUE #24
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- Hero -->
  <mc-section class="bg-brand p-[48px_40px_52px]">
    <mc-column>
      <mc-text class="text-brand-btn-text text-[12px] font-[700] text-center p-[0_0_12px]">
        MONTHLY ROUNDUP
      </mc-text>
      <mc-text class="text-brand-btn-text text-[42px] font-bold text-center leading-[1.15] font-[Georgia,_serif] p-[0_0_16px]">
        Acme Monthly
      </mc-text>
      <mc-text class="text-brand-btn-text text-[16px] text-center leading-[1.6] px-[24px]">
        Your May roundup — product updates, engineering deep-dives, and the articles you missed.
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- Featured article label -->
  <mc-section class="bg-brand-surface p-[32px_40px_0]">
    <mc-column>
      <mc-text class="text-brand-muted text-[10px] font-[700] p-[0_0_12px]">
        FEATURED ARTICLE
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- Featured article body -->
  <mc-section class="bg-brand-surface p-[0_40px_8px]">
    <mc-column>
      <mc-text class="text-brand-heading text-[24px] font-bold leading-[1.3] font-[Georgia,_serif] p-[0_0_12px]">
        The Future of Distributed Systems
      </mc-text>
      <mc-text class="text-brand-body text-[14px] leading-[1.7] p-[0_0_10px]">
        As data volumes explode and latency budgets shrink, the assumptions behind our distributed architectures are being tested. Our principal engineers examine the patterns that are emerging at scale — and the ones that are quietly failing.
      </mc-text>
      <mc-text class="text-brand-body text-[14px] leading-[1.7] p-[0_0_20px]">
        From consensus algorithms to geo-distributed state management, the next generation of systems demands a fundamental rethink. We break down what's changing and what it means for your infrastructure.
      </mc-text>
      <mc-button class="bg-brand text-brand-btn-text rounded-[6px] font-[600] py-[12px] px-[28px] text-[13px]" href="https://example.com/articles/distributed-systems">
        Read the full article →
      </mc-button>
    </mc-column>
  </mc-section>

  <!-- Divider -->
  <mc-section class="bg-brand-surface p-[28px_40px_0]">
    <mc-column><mc-divider class="bg-brand-divider p-[0]" /></mc-column>
  </mc-section>

  <!-- Quick reads label -->
  <mc-section class="bg-brand-surface p-[20px_40px_0]">
    <mc-column>
      <mc-text class="text-brand-muted text-[10px] font-[700] p-[0_0_12px]">
        QUICK READS THIS MONTH
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- Quick reads 3-column grid -->
  <mc-section class="bg-brand-surface p-[0_40px_32px]">
    <mc-column>
      <mc-text class="text-brand-heading text-[13px] font-[700] p-[0_0_4px]">GraphQL at Scale</mc-text>
      <mc-text class="text-brand-body text-[12px] leading-[1.5] p-[0_0_8px]">How we migrated 200+ REST endpoints without a single customer noticing.</mc-text>
      <mc-text class="text-brand-muted text-[11px]">4 min read</mc-text>
    </mc-column>
    <mc-column>
      <mc-text class="text-brand-heading text-[13px] font-[700] p-[0_0_4px]">Zero-Downtime Deploys</mc-text>
      <mc-text class="text-brand-body text-[12px] leading-[1.5] p-[0_0_8px]">The exact checklist our SRE team uses before every production release.</mc-text>
      <mc-text class="text-brand-muted text-[11px]">6 min read</mc-text>
    </mc-column>
    <mc-column>
      <mc-text class="text-brand-heading text-[13px] font-[700] p-[0_0_4px]">Designing for Dark Mode</mc-text>
      <mc-text class="text-brand-body text-[12px] leading-[1.5] p-[0_0_8px]">Email dark mode support across 40+ clients — what works and what doesn't.</mc-text>
      <mc-text class="text-brand-muted text-[11px]">8 min read</mc-text>
    </mc-column>
  </mc-section>

  <!-- Social follow heading -->
  <mc-section class="bg-brand-outer p-[28px_40px_8px]">
    <mc-column>
      <mc-text class="text-brand-heading text-center text-[15px] font-[700] p-[0_0_4px]">
        Stay in the loop
      </mc-text>
      <mc-text class="text-brand-muted text-center text-[12px] p-[0_0_16px]">
        Follow Acme for daily updates, behind-the-scenes, and early access announcements.
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- Social buttons — uses bg-brand-social token -->
  <mc-section class="bg-brand-outer p-[0_40px_28px]">
    <mc-column>
      <mc-button class="bg-brand-social text-brand-btn-text rounded-[6px] text-[12px] font-[700] py-[10px] px-[16px]" href="https://twitter.com/acme">
        𝕏  Twitter
      </mc-button>
    </mc-column>
    <mc-column>
      <mc-button class="bg-brand-social text-brand-btn-text rounded-[6px] text-[12px] font-[700] py-[10px] px-[16px]" href="https://linkedin.com/company/acme">
        in  LinkedIn
      </mc-button>
    </mc-column>
    <mc-column>
      <mc-button class="bg-brand-social text-brand-btn-text rounded-[6px] text-[12px] font-[700] py-[10px] px-[16px]" href="https://github.com/acme">
        ⌥  GitHub
      </mc-button>
    </mc-column>
  </mc-section>

  <!-- Footer -->
  <mc-section class="bg-brand-outer p-[4px_40px_32px]">
    <mc-column>
      <mc-divider class="bg-brand-divider p-[0_0_16px]" />
      <mc-text class="text-brand-muted text-center text-[11px] p-[0_0_6px]">
        © 2025 Acme Inc. · You're receiving this because you subscribed to Acme Monthly.
      </mc-text>
      <mc-text class="text-brand-muted text-center text-[11px]">
        Unsubscribe · Privacy Policy · 42 Market Street, San Francisco CA 94105
      </mc-text>
    </mc-column>
  </mc-section>

  </mc-body>
</mc>`,
  },

  {
    id: 'launch-class',
    name: 'Product Launch',
    markup: `<mc>
  <mc-head>
    <mc-title>Introducing Acme Pro 3.0</mc-title>
    <mc-preview>Something big is here. The most powerful version of Acme ever built.</mc-preview>
    <mc-attributes>
      <mc-all font-family="Arial, Helvetica, sans-serif" />
    </mc-attributes>
  </mc-head>
  <mc-body class="bg-brand-outer">

  <!-- Top spacer -->
  <mc-section class="bg-brand-outer p-[20px_0_0]">
    <mc-column></mc-column>
  </mc-section>

  <!-- Header -->
  <mc-section class="bg-brand p-[16px_40px]">
    <mc-column width="50%">
      <mc-text class="text-brand-btn-text text-[18px] font-bold">
        ◆ acme
      </mc-text>
    </mc-column>
    <mc-column width="50%">
      <mc-text class="text-brand-btn-text text-right text-[10px] font-[700]">
        ✦ NEW RELEASE ✦
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- Announcement hero — inverted CTA button: bg-brand-btn-text + text-brand -->
  <mc-section class="bg-brand p-[56px_40px_60px]">
    <mc-column>
      <mc-text class="text-brand-btn-text text-center text-[12px] font-[700] p-[0_0_20px]">
        ANNOUNCING
      </mc-text>
      <mc-text class="text-brand-btn-text text-[52px] font-bold text-center leading-[1.1] font-[Georgia,_serif] p-[0_0_20px]">
        Acme Pro 3.0
      </mc-text>
      <mc-text class="text-brand-btn-text text-[17px] text-center leading-[1.6] p-[0_20px_32px]">
        Rebuilt from the ground up for the next generation of teams.
        Faster, smarter, and more powerful than anything we've shipped before.
      </mc-text>
      <mc-button class="bg-brand-btn-text text-brand rounded-[8px] font-[700] py-[16px] px-[40px] text-[15px]" href="https://example.com/launch">
        Get early access →
      </mc-button>
    </mc-column>
  </mc-section>

  <!-- What's new label -->
  <mc-section class="bg-brand-surface p-[40px_40px_0]">
    <mc-column>
      <mc-text class="text-brand-muted text-center text-[10px] font-[700] p-[0_0_20px]">
        WHAT'S NEW IN 3.0
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- Feature highlights 3-column -->
  <mc-section class="bg-brand-surface p-[0_40px_32px]">
    <mc-column>
      <mc-text class="text-center text-[28px] p-[0_0_6px]">⚡</mc-text>
      <mc-text class="text-brand-heading text-center text-[14px] font-[700] p-[0_0_6px]">10× Faster</mc-text>
      <mc-text class="text-brand-body text-center text-[12px] leading-[1.5]">Rebuilt pipeline. Results in under 50ms at any scale.</mc-text>
    </mc-column>
    <mc-column>
      <mc-text class="text-center text-[28px] p-[0_0_6px]">🧠</mc-text>
      <mc-text class="text-brand-heading text-center text-[14px] font-[700] p-[0_0_6px]">AI-Powered</mc-text>
      <mc-text class="text-brand-body text-center text-[12px] leading-[1.5]">Smart suggestions that learn from your team's patterns.</mc-text>
    </mc-column>
    <mc-column>
      <mc-text class="text-center text-[28px] p-[0_0_6px]">🔒</mc-text>
      <mc-text class="text-brand-heading text-center text-[14px] font-[700] p-[0_0_6px]">Zero-Trust</mc-text>
      <mc-text class="text-brand-body text-center text-[12px] leading-[1.5]">SOC 2 Type II, HIPAA-ready, audit logs on every action.</mc-text>
    </mc-column>
  </mc-section>

  <!-- Divider -->
  <mc-section class="bg-brand-surface px-[40px]">
    <mc-column><mc-divider class="bg-brand-divider p-[0]" /></mc-column>
  </mc-section>

  <!-- Key improvements list -->
  <mc-section class="bg-brand-surface p-[32px_40px_8px]">
    <mc-column>
      <mc-text class="text-brand-muted text-[10px] font-[700] p-[0_0_16px]">
        KEY IMPROVEMENTS
      </mc-text>
      <mc-text class="text-brand-heading text-[14px] font-[700] p-[0_0_4px]">🗂  Unified workspace</mc-text>
      <mc-text class="text-brand-body text-[13px] leading-[1.6] p-[0_0_16px]">
        Projects, tasks, and docs now live in one place. No more switching between apps mid-flow.
      </mc-text>
      <mc-text class="text-brand-heading text-[14px] font-[700] p-[0_0_4px]">📊  Real-time analytics</mc-text>
      <mc-text class="text-brand-body text-[13px] leading-[1.6] p-[0_0_16px]">
        Watch your metrics update live. Custom dashboards ship with every plan, no setup required.
      </mc-text>
      <mc-text class="text-brand-heading text-[14px] font-[700] p-[0_0_4px]">🔗  400+ integrations</mc-text>
      <mc-text class="text-brand-body text-[13px] leading-[1.6] p-[0_0_24px]">
        Connect every tool your team already uses in two clicks. Slack, GitHub, Jira, and more.
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- Social proof quote -->
  <mc-section class="bg-brand-surface px-[40px]">
    <mc-column><mc-divider class="bg-brand-divider p-[0]" /></mc-column>
  </mc-section>
  <mc-section class="bg-brand-surface p-[28px_40px_32px]">
    <mc-column>
      <mc-text class="text-brand-body text-[15px] leading-[1.7] text-center font-[Georgia,_serif] p-[0_0_10px]">
        "Acme Pro 3.0 cut our deployment cycle from 4 days to 6 hours.
        It's the tool we didn't know we were waiting for."
      </mc-text>
      <mc-text class="text-brand-muted text-[12px] font-[600] text-center">
        — Jamie Park, CTO at Verona Systems
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- Bottom CTA band -->
  <mc-section class="bg-brand p-[40px_40px]">
    <mc-column>
      <mc-text class="text-brand-btn-text text-[22px] font-bold text-center font-[Georgia,_serif] p-[0_0_8px]">
        Ready to see what 3.0 can do?
      </mc-text>
      <mc-text class="text-brand-btn-text text-[14px] text-center p-[0_0_24px]">
        Early access is open. No credit card required.
      </mc-text>
      <mc-button class="bg-brand-btn-text text-brand rounded-[8px] font-[700] py-[14px] px-[36px] text-[14px]" href="https://example.com/signup">
        Start free trial →
      </mc-button>
    </mc-column>
  </mc-section>

  <!-- Share the launch -->
  <mc-section class="bg-brand-outer p-[28px_40px_8px]">
    <mc-column>
      <mc-text class="text-brand-heading text-center text-[13px] font-[700] p-[0_0_4px]">
        Spread the word
      </mc-text>
      <mc-text class="text-brand-muted text-center text-[12px] p-[0_0_16px]">
        Help us reach the teams that need this most.
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- Social share buttons -->
  <mc-section class="bg-brand-outer p-[0_40px_28px]">
    <mc-column>
      <mc-button class="bg-brand-social text-brand-btn-text rounded-[6px] text-[12px] font-[700] py-[10px] px-[16px]" href="https://twitter.com/intent/tweet?text=Acme+Pro+3.0+is+here">
        𝕏  Share on Twitter
      </mc-button>
    </mc-column>
    <mc-column>
      <mc-button class="bg-brand-social text-brand-btn-text rounded-[6px] text-[12px] font-[700] py-[10px] px-[16px]" href="https://linkedin.com/shareArticle">
        in  Share on LinkedIn
      </mc-button>
    </mc-column>
  </mc-section>

  <!-- Footer -->
  <mc-section class="bg-brand-outer p-[4px_40px_32px]">
    <mc-column>
      <mc-divider class="bg-brand-divider p-[0_0_16px]" />
      <mc-text class="text-brand-muted text-center text-[11px] p-[0_0_6px]">
        © 2025 Acme Inc. · You're on this list because you signed up for early access.
      </mc-text>
      <mc-text class="text-brand-muted text-center text-[11px]">
        Unsubscribe · Privacy Policy
      </mc-text>
    </mc-column>
  </mc-section>

  </mc-body>
</mc>`,
  },
]
