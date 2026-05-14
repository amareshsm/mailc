/**
 * Static email templates for the theme playground.
 * No handlebars — pure static mc markup using consistent brand color hex values.
 *
 * All templates share the same color tokens so brand changes reflect everywhere:
 *   Primary:      #2563eb  (blue-600)
 *   Primary Dark: #1d4ed8  (blue-700)
 *   Primary Light:#3b82f6  (blue-500)
 *   Button Text:  #ffffff
 *   Body BG:      #f9fafb  (gray-50)
 *   Card BG:      #ffffff
 *   Heading:      #111827  (gray-900)
 *   Body Text:    #374151  (gray-700)
 *   Muted:        #6b7280  (gray-500)
 *   Divider:      #e5e7eb  (gray-200)
 *   Link:         #2563eb  (blue-600)
 */

export const STATIC_TEMPLATES = [
  {
    id: 'welcome',
    name: 'Welcome Email',
    markup: `<mc>
  <mc-head>
    <mc-title>Welcome to Acme!</mc-title>
    <mc-preview>You're in — let's build something great together.</mc-preview>
    <mc-attributes>
      <mc-all font-family="Georgia, 'Times New Roman', serif" />
    </mc-attributes>
  </mc-head>
  <mc-body background-color="#f4f6f9">

  <!-- Top spacer -->
  <mc-section background-color="#f4f6f9" padding="24px 0 0">
    <mc-column></mc-column>
  </mc-section>

  <!-- Header / Logo bar -->
  <mc-section background-color="#ffffff" padding="24px 40px">
    <mc-column width="50%">
      <mc-text color="#111827" font-size="18px" font-weight="bold" font-family="Arial, sans-serif">
        ◆ <span style="color:#2563eb;">acme</span>
      </mc-text>
    </mc-column>
    <mc-column width="50%">
      <mc-text align="right" color="#6b7280" font-size="12px" font-family="Arial, sans-serif">
        Welcome email
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- Hero image -->
  <mc-section background-color="#2563eb" padding="0">
    <mc-column>
      <mc-image
        src="https://placehold.co/600x280/2563eb/ffffff?text=Welcome+to+Acme"
        alt="Welcome to Acme"
        width="600"
      />
    </mc-column>
  </mc-section>

  <!-- Hero copy -->
  <mc-section background-color="#ffffff" padding="48px 48px 40px">
    <mc-column>
      <mc-text
        align="center"
        color="#111827"
        font-size="32px"
        font-weight="bold"
        line-height="42px"
        padding-bottom="16px"
        font-family="Georgia, serif"
      >
        Welcome aboard, Sarah 🎉
      </mc-text>
      <mc-text
        align="center"
        color="#6b7280"
        font-size="16px"
        line-height="28px"
        padding-bottom="32px"
        font-family="Arial, sans-serif"
      >
        Your account is all set up and ready to explore. We've got everything
        you need to hit the ground running — let's dive in.
      </mc-text>
      <mc-button
        href="https://example.com"
        background-color="#2563eb"
        color="#ffffff"
        border-radius="8px"
        padding="16px 40px"
        font-size="15px"
        font-weight="bold"
        align="center"
        font-family="Arial, sans-serif"
      >
        Get started →
      </mc-button>
    </mc-column>
  </mc-section>

  <!-- Divider -->
  <mc-section background-color="#ffffff" padding="0 48px">
    <mc-column>
      <mc-divider border-color="#e5e7eb" />
    </mc-column>
  </mc-section>

  <!-- Feature cards row -->
  <mc-section background-color="#ffffff" padding="40px 32px 48px">
    <mc-column width="33%" padding="24px 16px" background-color="#f9fafb">
      <mc-text font-size="32px" align="center" padding-bottom="12px">⚡</mc-text>
      <mc-text
        font-size="14px"
        font-weight="bold"
        color="#111827"
        align="center"
        padding-bottom="8px"
        font-family="Arial, sans-serif"
      >Fast setup</mc-text>
      <mc-text
        font-size="13px"
        color="#6b7280"
        align="center"
        line-height="20px"
        font-family="Arial, sans-serif"
      >
        Up and running in under 5 minutes
      </mc-text>
    </mc-column>
    <mc-column width="33%" padding="24px 16px" background-color="#f9fafb">
      <mc-text font-size="32px" align="center" padding-bottom="12px">🛡️</mc-text>
      <mc-text
        font-size="14px"
        font-weight="bold"
        color="#111827"
        align="center"
        padding-bottom="8px"
        font-family="Arial, sans-serif"
      >Enterprise secure</mc-text>
      <mc-text
        font-size="13px"
        color="#6b7280"
        align="center"
        line-height="20px"
        font-family="Arial, sans-serif"
      >
        SOC2 compliant, encrypted at rest
      </mc-text>
    </mc-column>
    <mc-column width="33%" padding="24px 16px" background-color="#f9fafb">
      <mc-text font-size="32px" align="center" padding-bottom="12px">💬</mc-text>
      <mc-text
        font-size="14px"
        font-weight="bold"
        color="#111827"
        align="center"
        padding-bottom="8px"
        font-family="Arial, sans-serif"
      >24 / 7 support</mc-text>
      <mc-text
        font-size="13px"
        color="#6b7280"
        align="center"
        line-height="20px"
        font-family="Arial, sans-serif"
      >
        Real humans, not just bots
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- Footer -->
  <mc-section background-color="#111827" padding="40px 48px">
    <mc-column>
      <mc-text
        align="center"
        color="#ffffff"
        font-size="16px"
        font-weight="bold"
        padding-bottom="8px"
        font-family="Arial, sans-serif"
      >◆ acme</mc-text>
      <mc-text
        align="center"
        color="#6b7280"
        font-size="12px"
        line-height="20px"
        padding-bottom="16px"
        font-family="Arial, sans-serif"
      >
        123 Market Street, San Francisco, CA 94105
      </mc-text>
      <mc-divider border-color="#374151" padding-bottom="16px" />
      <mc-text align="center" color="#4b5563" font-size="11px" font-family="Arial, sans-serif">
        © 2025 Acme Inc. ·
        <a href="#" style="color:#6b7280;text-decoration:none;">Privacy</a> ·
        <a href="#" style="color:#6b7280;text-decoration:none;">Terms</a> ·
        <a href="#" style="color:#6b7280;text-decoration:none;">Unsubscribe</a>
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- Bottom spacer -->
  <mc-section background-color="#f4f6f9" padding="24px 0">
    <mc-column></mc-column>
  </mc-section>
  </mc-body>
</mc>`,
  },

  {
    id: 'promotional',
    name: 'Promotional',
    markup: `<mc>
  <mc-head>
    <mc-title>Special Offer — 50% Off This Weekend</mc-title>
    <mc-preview>Your exclusive offer expires Sunday at midnight. Don't miss out.</mc-preview>
    <mc-attributes>
      <mc-all font-family="Arial, sans-serif" />
    </mc-attributes>
  </mc-head>
  <mc-body background-color="#f4f6f9">

  <!-- Top spacer -->
  <mc-section background-color="#f4f6f9" padding="24px 0 0">
    <mc-column></mc-column>
  </mc-section>

  <!-- Header -->
  <mc-section background-color="#111827" padding="20px 40px">
    <mc-column width="50%">
      <mc-text color="#ffffff" font-size="16px" font-weight="bold">
        ◆ <span style="color:#2563eb;">acme</span> store
      </mc-text>
    </mc-column>
    <mc-column width="50%">
      <mc-text align="right" color="#9ca3af" font-size="12px">
        Limited-time offer
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- Hero banner -->
  <mc-section background-color="#2563eb" padding="56px 48px">
    <mc-column>
      <mc-text
        align="center"
        color="#bfdbfe"
        font-size="11px"
        font-weight="bold"
        padding-bottom="16px"
        style="letter-spacing:0.12em;"
      >
        THIS WEEKEND ONLY
      </mc-text>
      <mc-text
        align="center"
        color="#ffffff"
        font-size="64px"
        font-weight="bold"
        line-height="72px"
        padding-bottom="8px"
      >
        50% OFF
      </mc-text>
      <mc-text
        align="center"
        color="#dbeafe"
        font-size="18px"
        line-height="28px"
        padding-bottom="36px"
      >
        Everything in the store — no code needed.
      </mc-text>
      <mc-button
        href="https://example.com/shop"
        background-color="#ffffff"
        color="#2563eb"
        border-radius="8px"
        padding="16px 48px"
        font-size="15px"
        font-weight="bold"
        align="center"
      >
        Shop the sale →
      </mc-button>
    </mc-column>
  </mc-section>

  <!-- Product spotlight -->
  <mc-section background-color="#ffffff" padding="48px 40px">
    <mc-column width="48%" padding="0 16px 0 0">
      <mc-image
        src="https://placehold.co/280x220/3b82f6/ffffff?text=Pro+Package"
        alt="Pro Package"
        width="280"
        border-radius="12px"
      />
    </mc-column>
    <mc-column width="52%" padding="8px 0 0">
      <mc-text
        color="#2563eb"
        font-size="11px"
        font-weight="bold"
        padding-bottom="12px"
        style="letter-spacing:0.1em;"
      >FEATURED PRODUCT</mc-text>
      <mc-text
        color="#111827"
        font-size="26px"
        font-weight="bold"
        line-height="34px"
        padding-bottom="12px"
      >
        Pro Package
      </mc-text>
      <mc-text
        color="#374151"
        font-size="14px"
        line-height="24px"
        padding-bottom="20px"
      >
        Everything you need to scale — premium tools, advanced analytics,
        team collaboration, and unlimited storage.
      </mc-text>
      <mc-text color="#9ca3af" font-size="13px" padding-bottom="4px">
        <span style="text-decoration:line-through;">$199 / month</span>
      </mc-text>
      <mc-text
        color="#111827"
        font-size="28px"
        font-weight="bold"
        padding-bottom="24px"
      >
        $99 <span style="font-size:16px;font-weight:400;color:#6b7280;">/ month</span>
      </mc-text>
      <mc-button
        href="https://example.com"
        background-color="#2563eb"
        color="#ffffff"
        border-radius="8px"
        padding="14px 28px"
        font-size="14px"
        font-weight="bold"
      >
        Claim this offer
      </mc-button>
    </mc-column>
  </mc-section>

  <!-- Trust strip -->
  <mc-section background-color="#f9fafb" padding="28px 40px">
    <mc-column width="33%">
      <mc-text align="center" color="#6b7280" font-size="12px" line-height="18px">
        ✓ No contracts
      </mc-text>
    </mc-column>
    <mc-column width="33%">
      <mc-text align="center" color="#6b7280" font-size="12px" line-height="18px">
        ✓ Cancel anytime
      </mc-text>
    </mc-column>
    <mc-column width="33%">
      <mc-text align="center" color="#6b7280" font-size="12px" line-height="18px">
        ✓ 30-day refund
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- Footer -->
  <mc-section background-color="#111827" padding="40px 48px">
    <mc-column>
      <mc-text align="center" color="#ffffff" font-size="16px" font-weight="bold" padding-bottom="8px">
        ◆ <span style="color:#2563eb;">acme</span> store
      </mc-text>
      <mc-divider border-color="#374151" padding-bottom="16px" />
      <mc-text align="center" color="#4b5563" font-size="11px">
        © 2025 Acme Inc. ·
        <a href="#" style="color:#6b7280;text-decoration:none;">Unsubscribe</a> ·
        <a href="#" style="color:#6b7280;text-decoration:none;">View in browser</a>
      </mc-text>
    </mc-column>
  </mc-section>

  <mc-section background-color="#f4f6f9" padding="24px 0">
    <mc-column></mc-column>
  </mc-section>
  </mc-body>
</mc>`,
  },

  {
    id: 'newsletter',
    name: 'Newsletter',
    markup: `<mc>
  <mc-head>
    <mc-title>The Weekly Brief — Issue #42</mc-title>
    <mc-preview>AI tools, design trends, and the CLI tools you actually need this week.</mc-preview>
    <mc-attributes>
      <mc-all font-family="Georgia, 'Times New Roman', serif" />
    </mc-attributes>
  </mc-head>
  <mc-body background-color="#f4f6f9">

  <!-- Top spacer -->
  <mc-section background-color="#f4f6f9" padding="24px 0 0">
    <mc-column></mc-column>
  </mc-section>

  <!-- Masthead -->
  <mc-section background-color="#111827" padding="32px 48px">
    <mc-column width="60%">
      <mc-text color="#ffffff" font-size="22px" font-weight="bold" font-family="Georgia, serif">
        The Weekly Brief
      </mc-text>
      <mc-text color="#6b7280" font-size="12px" padding-top="4px" font-family="Arial, sans-serif">
        Issue #42 · April 18, 2025
      </mc-text>
    </mc-column>
    <mc-column width="40%">
      <mc-text align="right" color="#4b5563" font-size="11px" padding-top="8px" font-family="Arial, sans-serif">
        <a href="#" style="color:#6b7280;text-decoration:none;">View online</a>
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- Category strip -->
  <mc-section background-color="#2563eb" padding="10px 48px">
    <mc-column>
      <mc-text color="#bfdbfe" font-size="11px" font-family="Arial, sans-serif" style="letter-spacing:0.1em;">
        AI · DESIGN · TOOLS · DELIVERABILITY
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- Lead article -->
  <mc-section background-color="#ffffff" padding="0">
    <mc-column>
      <mc-image
        src="https://placehold.co/600x240/1d4ed8/ffffff?text=The+Rise+of+AI+Email+Tools"
        alt="AI-Powered Email Tools"
        width="600"
      />
    </mc-column>
  </mc-section>

  <mc-section background-color="#ffffff" padding="36px 48px 40px">
    <mc-column>
      <mc-text
        color="#2563eb"
        font-size="11px"
        font-weight="bold"
        padding-bottom="12px"
        font-family="Arial, sans-serif"
        style="letter-spacing:0.1em;"
      >FEATURE STORY</mc-text>
      <mc-text
        color="#111827"
        font-size="28px"
        font-weight="bold"
        line-height="38px"
        padding-bottom="16px"
        font-family="Georgia, serif"
      >
        The Rise of AI-Powered Email Tools
      </mc-text>
      <mc-text
        color="#374151"
        font-size="15px"
        line-height="26px"
        padding-bottom="20px"
        font-family="Arial, sans-serif"
      >
        From smart segmentation to hyper-personalised subject lines, AI is
        reshaping how marketing teams build and send campaigns. Here's what's
        changed, what works, and what's still hype.
      </mc-text>
      <mc-text font-size="14px" font-family="Arial, sans-serif">
        <a href="#" style="color:#2563eb;text-decoration:none;font-weight:bold;">Read the full story →</a>
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- Divider -->
  <mc-section background-color="#ffffff" padding="0 48px">
    <mc-column>
      <mc-divider border-color="#e5e7eb" />
    </mc-column>
  </mc-section>

  <!-- Two-column articles -->
  <mc-section background-color="#ffffff" padding="36px 40px 40px">
    <mc-column width="50%" padding="0 16px 0 0">
      <mc-image
        src="https://placehold.co/240x140/3b82f6/ffffff?text=CLI+Tools"
        alt="CLI Tools"
        width="240"
        border-radius="8px"
      />
      <mc-text
        color="#2563eb"
        font-size="10px"
        font-weight="bold"
        padding-top="16px"
        padding-bottom="8px"
        font-family="Arial, sans-serif"
        style="letter-spacing:0.1em;"
      >TOOLS</mc-text>
      <mc-text
        color="#111827"
        font-size="17px"
        font-weight="bold"
        line-height="26px"
        padding-bottom="10px"
        font-family="Georgia, serif"
      >
        5 CLI Tools Every Developer Should Know
      </mc-text>
      <mc-text
        color="#6b7280"
        font-size="13px"
        line-height="21px"
        padding-bottom="14px"
        font-family="Arial, sans-serif"
      >
        Boost your terminal workflow with these handpicked tools that save hours every week.
      </mc-text>
      <mc-text font-size="13px" font-family="Arial, sans-serif">
        <a href="#" style="color:#2563eb;text-decoration:none;font-weight:600;">Read more →</a>
      </mc-text>
    </mc-column>
    <mc-column width="50%" padding="0 0 0 16px">
      <mc-image
        src="https://placehold.co/240x140/6366f1/ffffff?text=Design+Trends"
        alt="Design Trends"
        width="240"
        border-radius="8px"
      />
      <mc-text
        color="#2563eb"
        font-size="10px"
        font-weight="bold"
        padding-top="16px"
        padding-bottom="8px"
        font-family="Arial, sans-serif"
        style="letter-spacing:0.1em;"
      >DESIGN</mc-text>
      <mc-text
        color="#111827"
        font-size="17px"
        font-weight="bold"
        line-height="26px"
        padding-bottom="10px"
        font-family="Georgia, serif"
      >
        Email Design Trends for 2025
      </mc-text>
      <mc-text
        color="#6b7280"
        font-size="13px"
        line-height="21px"
        padding-bottom="14px"
        font-family="Arial, sans-serif"
      >
        Dark mode, fluid layouts, and interactive components are shaping the next wave.
      </mc-text>
      <mc-text font-size="13px" font-family="Arial, sans-serif">
        <a href="#" style="color:#2563eb;text-decoration:none;font-weight:600;">Read more →</a>
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- CTA banner -->
  <mc-section background-color="#2563eb" padding="48px 48px">
    <mc-column>
      <mc-text
        align="center"
        color="#bfdbfe"
        font-size="11px"
        font-weight="bold"
        padding-bottom="12px"
        font-family="Arial, sans-serif"
        style="letter-spacing:0.1em;"
      >FOR SUBSCRIBERS</mc-text>
      <mc-text
        align="center"
        color="#ffffff"
        font-size="24px"
        font-weight="bold"
        line-height="34px"
        padding-bottom="12px"
        font-family="Georgia, serif"
      >
        Unlock the full archive
      </mc-text>
      <mc-text
        align="center"
        color="#bfdbfe"
        font-size="15px"
        line-height="24px"
        padding-bottom="28px"
        font-family="Arial, sans-serif"
      >
        No ads, deep dives every week, exclusive interviews.
      </mc-text>
      <mc-button
        href="https://example.com"
        background-color="#ffffff"
        color="#2563eb"
        border-radius="8px"
        padding="14px 40px"
        font-size="14px"
        font-weight="bold"
        align="center"
        font-family="Arial, sans-serif"
      >
        Upgrade to Pro
      </mc-button>
    </mc-column>
  </mc-section>

  <!-- Footer -->
  <mc-section background-color="#111827" padding="40px 48px">
    <mc-column>
      <mc-text
        align="center"
        color="#ffffff"
        font-size="16px"
        font-weight="bold"
        padding-bottom="4px"
        font-family="Georgia, serif"
      >The Weekly Brief</mc-text>
      <mc-text
        align="center"
        color="#6b7280"
        font-size="12px"
        padding-bottom="16px"
        font-family="Arial, sans-serif"
      >Your Friday roundup of what matters in tech</mc-text>
      <mc-divider border-color="#374151" padding-bottom="16px" />
      <mc-text align="center" color="#4b5563" font-size="11px" font-family="Arial, sans-serif">
        © 2025 The Weekly Brief ·
        <a href="#" style="color:#6b7280;text-decoration:none;">Manage preferences</a> ·
        <a href="#" style="color:#6b7280;text-decoration:none;">Unsubscribe</a>
      </mc-text>
    </mc-column>
  </mc-section>

  <mc-section background-color="#f4f6f9" padding="24px 0">
    <mc-column></mc-column>
  </mc-section>
  </mc-body>
</mc>`,
  },

  {
    id: 'transactional',
    name: 'Order Confirmation',
    markup: `<mc>
  <mc-head>
    <mc-title>Order Confirmed — #ORD-8821</mc-title>
    <mc-preview>Your order has been confirmed. Estimated delivery: April 22–24.</mc-preview>
    <mc-attributes>
      <mc-all font-family="Arial, sans-serif" />
    </mc-attributes>
  </mc-head>
  <mc-body background-color="#f4f6f9">

  <!-- Top spacer -->
  <mc-section background-color="#f4f6f9" padding="24px 0 0">
    <mc-column></mc-column>
  </mc-section>

  <!-- Header -->
  <mc-section background-color="#ffffff" padding="24px 40px">
    <mc-column width="50%">
      <mc-text color="#111827" font-size="16px" font-weight="bold">
        ◆ <span style="color:#2563eb;">acme</span> shop
      </mc-text>
    </mc-column>
    <mc-column width="50%">
      <mc-text align="right" color="#6b7280" font-size="12px" padding-top="4px">
        Order receipt
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- Success banner -->
  <mc-section background-color="#2563eb" padding="40px 48px">
    <mc-column>
      <mc-text align="center" font-size="44px" padding-bottom="12px">✅</mc-text>
      <mc-text
        align="center"
        color="#ffffff"
        font-size="26px"
        font-weight="bold"
        padding-bottom="8px"
      >Order confirmed!</mc-text>
      <mc-text
        align="center"
        color="#bfdbfe"
        font-size="14px"
        line-height="22px"
      >
        Hi Sarah — we've received your order and it's being processed.
        You'll get a shipping update within 24 hours.
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- Order meta -->
  <mc-section background-color="#f9fafb" padding="24px 40px">
    <mc-column width="33%">
      <mc-text color="#6b7280" font-size="11px" font-weight="bold" padding-bottom="4px" style="letter-spacing:0.08em;">ORDER</mc-text>
      <mc-text color="#111827" font-size="14px" font-weight="bold">#ORD-8821</mc-text>
    </mc-column>
    <mc-column width="33%">
      <mc-text color="#6b7280" font-size="11px" font-weight="bold" padding-bottom="4px" style="letter-spacing:0.08em;">DATE</mc-text>
      <mc-text color="#111827" font-size="14px" font-weight="bold">April 18, 2025</mc-text>
    </mc-column>
    <mc-column width="33%">
      <mc-text color="#6b7280" font-size="11px" font-weight="bold" padding-bottom="4px" style="letter-spacing:0.08em;">DELIVERY</mc-text>
      <mc-text color="#111827" font-size="14px" font-weight="bold">April 22–24</mc-text>
    </mc-column>
  </mc-section>

  <!-- Order items -->
  <mc-section background-color="#ffffff" padding="32px 40px 0">
    <mc-column>
      <mc-text
        color="#111827"
        font-size="13px"
        font-weight="bold"
        padding-bottom="16px"
        style="letter-spacing:0.08em;"
      >ORDER SUMMARY</mc-text>
    </mc-column>
  </mc-section>

  <!-- Item 1 -->
  <mc-section background-color="#ffffff" padding="0 40px">
    <mc-column>
      <mc-divider border-color="#e5e7eb" />
    </mc-column>
  </mc-section>

  <mc-section background-color="#ffffff" padding="16px 40px">
    <mc-column width="60%">
      <mc-text color="#111827" font-size="14px" font-weight="600" padding-bottom="4px">Pro Subscription (Annual)</mc-text>
      <mc-text color="#6b7280" font-size="12px">Billed annually · Renews April 2026</mc-text>
    </mc-column>
    <mc-column width="40%">
      <mc-text color="#111827" font-size="14px" font-weight="600" align="right">$99.00</mc-text>
    </mc-column>
  </mc-section>

  <!-- Item 2 -->
  <mc-section background-color="#ffffff" padding="0 40px">
    <mc-column>
      <mc-divider border-color="#e5e7eb" />
    </mc-column>
  </mc-section>

  <mc-section background-color="#ffffff" padding="16px 40px">
    <mc-column width="60%">
      <mc-text color="#111827" font-size="14px" font-weight="600" padding-bottom="4px">Design Templates Pack</mc-text>
      <mc-text color="#6b7280" font-size="12px">20 premium templates · One-time purchase</mc-text>
    </mc-column>
    <mc-column width="40%">
      <mc-text color="#111827" font-size="14px" font-weight="600" align="right">$29.00</mc-text>
    </mc-column>
  </mc-section>

  <!-- Total row -->
  <mc-section background-color="#2563eb" padding="16px 40px">
    <mc-column width="60%">
      <mc-text color="#ffffff" font-size="15px" font-weight="bold">Total charged</mc-text>
    </mc-column>
    <mc-column width="40%">
      <mc-text color="#ffffff" font-size="18px" font-weight="bold" align="right">$128.00</mc-text>
    </mc-column>
  </mc-section>

  <!-- CTA -->
  <mc-section background-color="#ffffff" padding="40px 48px">
    <mc-column>
      <mc-text
        align="center"
        color="#374151"
        font-size="14px"
        line-height="22px"
        padding-bottom="24px"
      >
        View your order, download your invoice, or reach out to support — all from your dashboard.
      </mc-text>
      <mc-button
        href="https://example.com/orders"
        background-color="#2563eb"
        color="#ffffff"
        border-radius="8px"
        padding="15px 40px"
        font-size="14px"
        font-weight="bold"
        align="center"
      >
        View order details
      </mc-button>
    </mc-column>
  </mc-section>

  <!-- Footer -->
  <mc-section background-color="#111827" padding="40px 48px">
    <mc-column>
      <mc-text
        align="center"
        color="#ffffff"
        font-size="16px"
        font-weight="bold"
        padding-bottom="8px"
      >◆ <span style="color:#2563eb;">acme</span> shop</mc-text>
      <mc-divider border-color="#374151" padding-bottom="16px" />
      <mc-text align="center" color="#4b5563" font-size="11px">
        © 2025 Acme Inc. ·
        <a href="#" style="color:#6b7280;text-decoration:none;">Help Centre</a> ·
        <a href="#" style="color:#6b7280;text-decoration:none;">Returns</a> ·
        <a href="#" style="color:#6b7280;text-decoration:none;">Unsubscribe</a>
      </mc-text>
    </mc-column>
  </mc-section>

  <mc-section background-color="#f4f6f9" padding="24px 0">
    <mc-column></mc-column>
  </mc-section>
  </mc-body>
</mc>`,
  },

  {
    id: 'social',
    name: 'Community Digest',
    markup: `<mc>
  <mc-head>
    <mc-title>Community Digest — Week of April 14</mc-title>
    <mc-preview>142 new members, 3 trending discussions, and your weekly stats.</mc-preview>
    <mc-attributes>
      <mc-all font-family="Arial, sans-serif" />
    </mc-attributes>
  </mc-head>
  <mc-body background-color="#f4f6f9">

  <!-- Top spacer -->
  <mc-section background-color="#f4f6f9" padding="24px 0 0">
    <mc-column></mc-column>
  </mc-section>

  <!-- Masthead -->
  <mc-section background-color="#2563eb" padding="32px 48px 0">
    <mc-column>
      <mc-text align="center" color="#bfdbfe" font-size="11px" font-weight="bold" padding-bottom="8px" style="letter-spacing:0.12em;">
        WEEKLY DIGEST
      </mc-text>
      <mc-text align="center" color="#ffffff" font-size="28px" font-weight="bold" padding-bottom="4px" font-family="Georgia, serif">
        Community Hub
      </mc-text>
      <mc-text align="center" color="#93c5fd" font-size="13px" padding-bottom="0">
        Week of April 14, 2025
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- Stats bar -->
  <mc-section background-color="#1d4ed8" padding="24px 40px">
    <mc-column width="33%">
      <mc-text align="center" color="#ffffff" font-size="28px" font-weight="bold" padding-bottom="4px">142</mc-text>
      <mc-text align="center" color="#93c5fd" font-size="11px" style="letter-spacing:0.06em;">NEW MEMBERS</mc-text>
    </mc-column>
    <mc-column width="33%">
      <mc-text align="center" color="#ffffff" font-size="28px" font-weight="bold" padding-bottom="4px">3.2k</mc-text>
      <mc-text align="center" color="#93c5fd" font-size="11px" style="letter-spacing:0.06em;">POSTS THIS WEEK</mc-text>
    </mc-column>
    <mc-column width="33%">
      <mc-text align="center" color="#ffffff" font-size="28px" font-weight="bold" padding-bottom="4px">98%</mc-text>
      <mc-text align="center" color="#93c5fd" font-size="11px" style="letter-spacing:0.06em;">SATISFACTION</mc-text>
    </mc-column>
  </mc-section>

  <!-- Section heading -->
  <mc-section background-color="#ffffff" padding="36px 48px 0">
    <mc-column>
      <mc-text color="#2563eb" font-size="11px" font-weight="bold" padding-bottom="0" style="letter-spacing:0.1em;">
        TOP DISCUSSIONS THIS WEEK
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- Discussion 1 -->
  <mc-section background-color="#ffffff" padding="20px 48px 0">
    <mc-column>
      <mc-divider border-color="#e5e7eb" padding-bottom="20px" />
    </mc-column>
  </mc-section>
  <mc-section background-color="#ffffff" padding="0 48px 0">
    <mc-column padding="20px 20px" background-color="#f9fafb">
      <mc-text color="#111827" font-size="15px" font-weight="bold" line-height="22px" padding-bottom="6px">
        🔥 How to build email templates with AI
      </mc-text>
      <mc-text color="#6b7280" font-size="12px" padding-bottom="12px">
        87 replies · 2.4k views · Posted by @mikecreator
      </mc-text>
      <mc-text font-size="13px">
        <a href="#" style="color:#2563eb;text-decoration:none;font-weight:600;">Join the conversation →</a>
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- Discussion 2 -->
  <mc-section background-color="#ffffff" padding="16px 48px 0">
    <mc-column padding="20px 20px" background-color="#f9fafb">
      <mc-text color="#111827" font-size="15px" font-weight="bold" line-height="22px" padding-bottom="6px">
        💡 Best practices for mobile email design
      </mc-text>
      <mc-text color="#6b7280" font-size="12px" padding-bottom="12px">
        53 replies · 1.8k views · Posted by @designpro
      </mc-text>
      <mc-text font-size="13px">
        <a href="#" style="color:#2563eb;text-decoration:none;font-weight:600;">Join the conversation →</a>
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- Discussion 3 -->
  <mc-section background-color="#ffffff" padding="16px 48px 36px">
    <mc-column padding="20px 20px" background-color="#f9fafb">
      <mc-text color="#111827" font-size="15px" font-weight="bold" line-height="22px" padding-bottom="6px">
        📊 Email deliverability report Q1 2025
      </mc-text>
      <mc-text color="#6b7280" font-size="12px" padding-bottom="12px">
        41 replies · 3.1k views · Posted by @datanerds
      </mc-text>
      <mc-text font-size="13px">
        <a href="#" style="color:#2563eb;text-decoration:none;font-weight:600;">Join the conversation →</a>
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- Follow us -->
  <mc-section background-color="#f9fafb" padding="36px 48px 16px">
    <mc-column>
      <mc-text
        align="center"
        color="#374151"
        font-size="14px"
        font-weight="bold"
        padding-bottom="0"
      >Follow us everywhere</mc-text>
    </mc-column>
  </mc-section>
  <mc-section background-color="#f9fafb" padding="0 48px 36px">
    <mc-column width="22%" padding="12px 6px" background-color="#1d4ed8">
      <mc-text align="center" color="#ffffff" font-size="13px" font-weight="bold">𝕏</mc-text>
      <mc-text align="center" color="#93c5fd" font-size="10px" padding-top="4px">Twitter</mc-text>
    </mc-column>
    <mc-column width="22%" padding="12px 6px" background-color="#1d4ed8">
      <mc-text align="center" color="#ffffff" font-size="13px" font-weight="bold">in</mc-text>
      <mc-text align="center" color="#93c5fd" font-size="10px" padding-top="4px">LinkedIn</mc-text>
    </mc-column>
    <mc-column width="22%" padding="12px 6px" background-color="#1d4ed8">
      <mc-text align="center" color="#ffffff" font-size="13px" font-weight="bold">gh</mc-text>
      <mc-text align="center" color="#93c5fd" font-size="10px" padding-top="4px">GitHub</mc-text>
    </mc-column>
    <mc-column width="22%" padding="12px 6px" background-color="#1d4ed8">
      <mc-text align="center" color="#ffffff" font-size="13px" font-weight="bold">▶</mc-text>
      <mc-text align="center" color="#93c5fd" font-size="10px" padding-top="4px">YouTube</mc-text>
    </mc-column>
  </mc-section>

  <!-- Footer -->
  <mc-section background-color="#111827" padding="40px 48px">
    <mc-column>
      <mc-text
        align="center"
        color="#ffffff"
        font-size="16px"
        font-weight="bold"
        padding-bottom="4px"
      >Community Hub</mc-text>
      <mc-text
        align="center"
        color="#6b7280"
        font-size="12px"
        padding-bottom="16px"
      >Where builders connect</mc-text>
      <mc-divider border-color="#374151" padding-bottom="16px" />
      <mc-text align="center" color="#4b5563" font-size="11px">
        © 2025 Community Hub ·
        <a href="#" style="color:#6b7280;text-decoration:none;">Notification settings</a> ·
        <a href="#" style="color:#6b7280;text-decoration:none;">Unsubscribe</a>
      </mc-text>
    </mc-column>
  </mc-section>

  <mc-section background-color="#f4f6f9" padding="24px 0">
    <mc-column></mc-column>
  </mc-section>
  </mc-body>
</mc>`,
  },

  // ── mc-table showcase ────────────────────────────────────────────────────
  {
    id: 'table-showcase',
    name: 'Table Showcase',
    markup: `<mc>
  <mc-head>
    <mc-title>mc-table — All Attributes Showcase</mc-title>
    <mc-preview>Data tables with Tailwind classes, colspan, scope, thead/tbody/tfoot, and more.</mc-preview>
    <mc-attributes>
      <mc-all font-family="Arial, sans-serif" />
    </mc-attributes>
  </mc-head>
  <mc-body background-color="#f8fafc">

  <!-- Header -->
  <mc-section background-color="#1e293b" padding="32px 32px">
    <mc-column>
      <mc-text align="center" font-size="22px" font-weight="bold" color="#ffffff">
        mc-table Showcase
      </mc-text>
      <mc-text align="center" font-size="13px" color="#94a3b8" padding-top="6px">
        Every attribute, every variant — all in one email
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- ─── Example 1: Full semantic table with thead / tbody / tfoot ──────── -->
  <mc-section background-color="#ffffff" padding="32px 32px 8px">
    <mc-column>
      <mc-text font-size="14px" font-weight="bold" color="#374151" padding-bottom="4px">
        1 · Semantic table — thead / tbody / tfoot with scope
      </mc-text>
      <mc-text font-size="12px" color="#94a3b8" padding-bottom="16px">
        Uses width, align, thead/tbody/tfoot wrappers, th scope="col", colspan on tfoot summary row.
      </mc-text>
    </mc-column>
  </mc-section>
  <mc-section background-color="#ffffff" padding="0 32px 32px">
    <mc-column>
      <mc-table
        class="w-full text-sm"
        width="100%"
        cellpadding="0"
        cellspacing="0"
        align="left"
        role="table"
      >
        <thead>
          <tr class="bg-slate-50">
            <th scope="col" class="text-left text-xs text-slate-500 font-bold py-2.5 px-3 border-b border-slate-200">Product</th>
            <th scope="col" class="text-center text-xs text-slate-500 font-bold py-2.5 px-3 border-b border-slate-200">Qty</th>
            <th scope="col" class="text-right text-xs text-slate-500 font-bold py-2.5 px-3 border-b border-slate-200">Unit Price</th>
            <th scope="col" class="text-right text-xs text-slate-500 font-bold py-2.5 px-3 border-b border-slate-200">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b border-slate-100">
            <td class="text-slate-800 py-2.5 px-3" width="40%">Pro License — Annual</td>
            <td class="text-slate-600 text-center py-2.5 px-3" width="15%">1</td>
            <td class="text-slate-600 text-right py-2.5 px-3" width="20%">$299.00</td>
            <td class="text-slate-900 text-right font-bold py-2.5 px-3" width="25%">$299.00</td>
          </tr>
          <tr class="border-b border-slate-100">
            <td class="text-slate-800 py-2.5 px-3">Onboarding Pack</td>
            <td class="text-slate-600 text-center py-2.5 px-3">2</td>
            <td class="text-slate-600 text-right py-2.5 px-3">$49.00</td>
            <td class="text-slate-900 text-right font-bold py-2.5 px-3">$98.00</td>
          </tr>
          <tr>
            <td class="text-slate-800 py-2.5 px-3">Support Add-on</td>
            <td class="text-slate-600 text-center py-2.5 px-3">1</td>
            <td class="text-slate-600 text-right py-2.5 px-3">$79.00</td>
            <td class="text-slate-900 text-right font-bold py-2.5 px-3">$79.00</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="bg-slate-50 border-t-2 border-slate-300">
            <td colspan="3" class="text-slate-700 font-bold py-3 px-3 text-right">Order Total</td>
            <td class="text-blue-700 font-bold text-right py-3 px-3 text-base">$476.00</td>
          </tr>
        </tfoot>
      </mc-table>
    </mc-column>
  </mc-section>

  <mc-section padding="0 32px"><mc-column>
    <mc-divider border-color="#e2e8f0" />
  </mc-column></mc-section>

  <!-- ─── Example 2: Totals summary (no headers — warning is expected) ──── -->
  <mc-section background-color="#ffffff" padding="24px 32px 8px">
    <mc-column>
      <mc-text font-size="14px" font-weight="bold" color="#374151" padding-bottom="4px">
        2 · Totals summary — no th headers (border-t, bg-*, font classes)
      </mc-text>
      <mc-text font-size="12px" color="#94a3b8" padding-bottom="16px">
        Uses bg-* → bgcolor fallback, border-t, text-right, font-bold, explicit style merge.
      </mc-text>
    </mc-column>
  </mc-section>
  <mc-section background-color="#ffffff" padding="0 32px 32px">
    <mc-column>
      <mc-table class="w-full text-sm" style="border-top:1px solid #e2e8f0;">
        <tr>
          <td class="text-slate-500 py-2">Subtotal</td>
          <td class="text-slate-800 text-right py-2">$476.00</td>
        </tr>
        <tr>
          <td class="text-slate-500 py-2">Discount (SAVE20)</td>
          <td class="text-green-600 text-right py-2">−$95.20</td>
        </tr>
        <tr>
          <td class="text-slate-500 py-2">Tax (8%)</td>
          <td class="text-slate-800 text-right py-2">$30.47</td>
        </tr>
        <tr class="bg-slate-50 border-t-2 border-slate-300">
          <td class="text-slate-900 font-bold py-3 text-base">Total due</td>
          <td class="text-blue-700 font-bold text-right py-3 text-base">$411.27</td>
        </tr>
      </mc-table>
    </mc-column>
  </mc-section>

  <mc-section padding="0 32px"><mc-column>
    <mc-divider border-color="#e2e8f0" />
  </mc-column></mc-section>

  <!-- ─── Example 3: Usage stats / metrics table ───────────────────────── -->
  <mc-section background-color="#ffffff" padding="24px 32px 8px">
    <mc-column>
      <mc-text font-size="14px" font-weight="bold" color="#374151" padding-bottom="4px">
        3 · Account metrics — row headers with scope="row"
      </mc-text>
      <mc-text font-size="12px" color="#94a3b8" padding-bottom="16px">
        Uses th scope="row", alternating bg-* row colors, text-center, colspan, explicit style attr.
      </mc-text>
    </mc-column>
  </mc-section>
  <mc-section background-color="#ffffff" padding="0 32px 32px">
    <mc-column>
      <mc-table class="w-full text-sm" border="0">
        <thead>
          <tr class="bg-blue-600">
            <th scope="col" class="text-left text-white font-bold py-2.5 px-3 text-xs" width="40%">Metric</th>
            <th scope="col" class="text-center text-white font-bold py-2.5 px-3 text-xs" width="20%">This Month</th>
            <th scope="col" class="text-center text-white font-bold py-2.5 px-3 text-xs" width="20%">Last Month</th>
            <th scope="col" class="text-center text-white font-bold py-2.5 px-3 text-xs" width="20%">Change</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row" class="text-slate-700 font-medium text-left py-2.5 px-3">Emails Sent</th>
            <td class="text-slate-900 text-center py-2.5 px-3">12,450</td>
            <td class="text-slate-900 text-center py-2.5 px-3">10,200</td>
            <td class="text-green-600 text-center font-bold py-2.5 px-3">+22%</td>
          </tr>
          <tr class="bg-slate-50">
            <th scope="row" class="text-slate-700 font-medium text-left py-2.5 px-3">Open Rate</th>
            <td class="text-slate-900 text-center py-2.5 px-3">38.4%</td>
            <td class="text-slate-900 text-center py-2.5 px-3">35.1%</td>
            <td class="text-green-600 text-center font-bold py-2.5 px-3">+3.3pp</td>
          </tr>
          <tr>
            <th scope="row" class="text-slate-700 font-medium text-left py-2.5 px-3">Click-Through</th>
            <td class="text-slate-900 text-center py-2.5 px-3">7.2%</td>
            <td class="text-slate-900 text-center py-2.5 px-3">8.1%</td>
            <td class="text-red-500 text-center font-bold py-2.5 px-3">−0.9pp</td>
          </tr>
          <tr class="bg-slate-50">
            <th scope="row" class="text-slate-700 font-medium text-left py-2.5 px-3">Unsubscribes</th>
            <td class="text-slate-900 text-center py-2.5 px-3">24</td>
            <td class="text-slate-900 text-center py-2.5 px-3">31</td>
            <td class="text-green-600 text-center font-bold py-2.5 px-3">−23%</td>
          </tr>
        </tbody>
      </mc-table>
    </mc-column>
  </mc-section>

  <mc-section padding="0 32px"><mc-column>
    <mc-divider border-color="#e2e8f0" />
  </mc-column></mc-section>

  <!-- ─── Example 4: colspan / rowspan demonstration ───────────────────── -->
  <mc-section background-color="#ffffff" padding="24px 32px 8px">
    <mc-column>
      <mc-text font-size="14px" font-weight="bold" color="#374151" padding-bottom="4px">
        4 · Feature matrix — colspan and rowspan
      </mc-text>
      <mc-text font-size="12px" color="#94a3b8" padding-bottom="16px">
        Demonstrates colspan on header cells and rowspan on category labels.
      </mc-text>
    </mc-column>
  </mc-section>
  <mc-section background-color="#ffffff" padding="0 32px 32px">
    <mc-column>
      <mc-table class="w-full text-sm" role="table">
        <thead>
          <tr class="bg-violet-600">
            <th scope="col" class="text-white font-bold text-left py-2.5 px-3 text-xs" width="35%">Feature</th>
            <th scope="col" class="text-white font-bold text-center py-2.5 px-3 text-xs" width="21%">Free</th>
            <th scope="col" class="text-white font-bold text-center py-2.5 px-3 text-xs" width="22%">Pro</th>
            <th scope="col" class="text-white font-bold text-center py-2.5 px-3 text-xs" width="22%">Enterprise</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b border-slate-100">
            <th scope="row" class="text-slate-700 font-medium text-left py-2.5 px-3">Templates</th>
            <td class="text-slate-600 text-center py-2.5 px-3">5</td>
            <td class="text-slate-900 text-center py-2.5 px-3 font-bold">Unlimited</td>
            <td class="text-slate-900 text-center py-2.5 px-3 font-bold">Unlimited</td>
          </tr>
          <tr class="bg-slate-50 border-b border-slate-100">
            <th scope="row" class="text-slate-700 font-medium text-left py-2.5 px-3">Custom domain</th>
            <td class="text-slate-400 text-center py-2.5 px-3">✗</td>
            <td class="text-green-600 text-center py-2.5 px-3 font-bold">✓</td>
            <td class="text-green-600 text-center py-2.5 px-3 font-bold">✓</td>
          </tr>
          <tr class="border-b border-slate-100">
            <th scope="row" class="text-slate-700 font-medium text-left py-2.5 px-3">SLA &amp; Support</th>
            <td colspan="2" class="text-slate-400 text-center py-2.5 px-3">Community only</td>
            <td class="text-green-600 text-center py-2.5 px-3 font-bold">99.9% SLA</td>
          </tr>
          <tr class="bg-slate-50">
            <th scope="row" class="text-slate-700 font-medium text-left py-2.5 px-3">Price / mo</th>
            <td class="text-slate-900 text-center py-2.5 px-3 font-bold">$0</td>
            <td class="text-blue-700 text-center py-2.5 px-3 font-bold">$29</td>
            <td class="text-violet-700 text-center py-2.5 px-3 font-bold">Custom</td>
          </tr>
        </tbody>
      </mc-table>
    </mc-column>
  </mc-section>

  <!-- ─── Example 5: Inline style merge + explicit width on cells ──────── -->
  <mc-section background-color="#f1f5f9" padding="24px 32px 8px">
    <mc-column>
      <mc-text font-size="14px" font-weight="bold" color="#374151" padding-bottom="4px">
        5 · Explicit style merge + width attribute on td
      </mc-text>
      <mc-text font-size="12px" color="#94a3b8" padding-bottom="16px">
        class-derived styles are merged with explicit style="" attr. width="" on td bypasses CSS.
      </mc-text>
    </mc-column>
  </mc-section>
  <mc-section background-color="#f1f5f9" padding="0 32px 32px">
    <mc-column>
      <mc-table class="w-full" style="border-collapse:collapse;">
        <tbody>
          <tr>
            <td width="120" class="bg-blue-600 text-white font-bold py-3 px-4" style="border-radius:6px 0 0 6px;">Status</td>
            <td class="text-slate-700 py-3 px-4 bg-white" style="border:1px solid #e2e8f0;border-left:none;">
              <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#22c55e;margin-right:6px;"></span>
              Active — Next renewal <strong>1 Jan 2027</strong>
            </td>
          </tr>
          <tr>
            <td width="120" class="bg-blue-600 text-white font-bold py-3 px-4" style="border-top:1px solid rgba(255,255,255,0.2);border-radius:0;">Plan</td>
            <td class="text-slate-700 py-3 px-4 bg-white" style="border:1px solid #e2e8f0;border-left:none;border-top:none;">
              Pro Annual · <strong>$276/yr</strong>
            </td>
          </tr>
          <tr>
            <td width="120" class="bg-blue-600 text-white font-bold py-3 px-4" style="border-top:1px solid rgba(255,255,255,0.2);border-radius:0 0 0 6px;">Payment</td>
            <td class="text-slate-700 py-3 px-4 bg-white" style="border:1px solid #e2e8f0;border-left:none;border-top:none;border-radius:0 0 6px 0;">
              Visa ending 4242
            </td>
          </tr>
        </tbody>
      </mc-table>
    </mc-column>
  </mc-section>

  <!-- Footer -->
  <mc-section background-color="#1e293b" padding="28px 32px">
    <mc-column>
      <mc-text align="center" font-size="12px" color="#64748b" line-height="20px">
        © 2026 mailc · mc-table showcase email ·
        <a href="https://mailcraft.dev/docs/mc-table" style="color:#64748b;">docs</a>
      </mc-text>
    </mc-column>
  </mc-section>

  </mc-body>
</mc>`,
  },

  // ── Hero Showcase ─────────────────────────────────────────────────
  {
    id: 'hero-showcase',
    name: 'Hero Showcase',
    markup: `<mc>
  <mc-head>
    <mc-title>mc-hero Showcase</mc-title>
    <mc-preview>Four hero banner styles — colored, image, overlay, full-width.</mc-preview>
  </mc-head>
  <mc-body background-color="#f1f5f9">

  <!-- ── Example 1: Colored banner (no image) ── -->
  <mc-section background-color="#f1f5f9" padding="24px 0 0">
    <mc-column>
      <mc-text align="center" color="#64748b" font-size="11px" font-weight="bold" style="text-transform:uppercase;letter-spacing:0.08em;">
        Example 1 — Colored Banner
      </mc-text>
    </mc-column>
  </mc-section>

  <mc-hero background-color="#1e293b" height="280px" padding="60px 40px" align="center">
    <mc-text align="center" color="#ffffff" font-size="32px" font-weight="bold" line-height="42px" padding-bottom="8px">
      Summer Collection
    </mc-text>
    <mc-text align="center" color="#94a3b8" font-size="16px" padding-bottom="24px">
      New arrivals just dropped
    </mc-text>
    <mc-button href="https://example.com/shop" background-color="#3b82f6" color="#ffffff" border-radius="8px" padding="14px 32px" font-size="14px" font-weight="bold" align="center">
      Shop Now →
    </mc-button>
  </mc-hero>

  <mc-section background-color="#f1f5f9" padding="0 0 20px">
    <mc-column></mc-column>
  </mc-section>

  <!-- ── Example 2: Hero with background image ── -->
  <mc-section background-color="#f1f5f9" padding="0 0 0">
    <mc-column>
      <mc-text align="center" color="#64748b" font-size="11px" font-weight="bold" style="text-transform:uppercase;letter-spacing:0.08em;">
        Example 2 — Background Image + VML Fallback
      </mc-text>
    </mc-column>
  </mc-section>

  <mc-hero
    background-image="https://placehold.co/600x300/1e293b/94a3b8?text=Hero+Image"
    background-color="#1e293b"
    background-size="cover"
    background-position="center"
    height="300px"
    padding="60px 40px"
    align="center"
  >
    <mc-text align="center" color="#ffffff" font-size="32px" font-weight="bold" line-height="42px" padding-bottom="16px">
      Product Launch
    </mc-text>
    <mc-text align="center" color="#cbd5e1" font-size="16px" padding-bottom="24px">
      The future of email, today.
    </mc-text>
    <mc-button href="https://example.com/launch" background-color="#e85d3a" color="#ffffff" border-radius="8px" padding="14px 32px" font-size="14px" font-weight="bold" align="center">
      Learn More
    </mc-button>
  </mc-hero>

  <mc-section background-color="#f1f5f9" padding="0 0 20px">
    <mc-column></mc-column>
  </mc-section>

  <!-- ── Example 3: With overlay ── -->
  <mc-section background-color="#f1f5f9" padding="0 0 0">
    <mc-column>
      <mc-text align="center" color="#64748b" font-size="11px" font-weight="bold" style="text-transform:uppercase;letter-spacing:0.08em;">
        Example 3 — Overlay Colour
      </mc-text>
    </mc-column>
  </mc-section>

  <mc-hero
    background-image="https://placehold.co/600x300/059669/ffffff?text=Spring+Sale"
    background-color="#059669"
    overlay-color="rgba(0,0,0,0.45)"
    height="300px"
    padding="60px 40px"
    align="center"
    aria-label="Spring sale hero banner"
  >
    <mc-text align="center" color="#ffffff" font-size="32px" font-weight="bold" line-height="42px" padding-bottom="8px">
      Spring Sale
    </mc-text>
    <mc-text align="center" color="#d1fae5" font-size="16px" padding-bottom="0">
      Up to 60% off — this weekend only
    </mc-text>
  </mc-hero>

  <mc-section background-color="#f1f5f9" padding="0 0 20px">
    <mc-column></mc-column>
  </mc-section>

  <!-- ── Example 4: Full-width background ── -->
  <mc-section background-color="#f1f5f9" padding="0 0 0">
    <mc-column>
      <mc-text align="center" color="#64748b" font-size="11px" font-weight="bold" style="text-transform:uppercase;letter-spacing:0.08em;">
        Example 4 — Full-Width Background Colour
      </mc-text>
    </mc-column>
  </mc-section>

  <mc-hero
    background-color="#f59e0b"
    full-width="true"
    height="200px"
    padding="40px"
    align="center"
  >
    <mc-text align="center" color="#ffffff" font-size="26px" font-weight="bold" line-height="36px">
      Free Shipping Today Only 🚚
    </mc-text>
    <mc-text align="center" color="#fef3c7" font-size="14px" padding-bottom="0">
      Use code SHIPFREE at checkout
    </mc-text>
  </mc-hero>

  <mc-section background-color="#f1f5f9" padding="0 0 32px">
    <mc-column></mc-column>
  </mc-section>

  </mc-body>
</mc>`,
  },
]
