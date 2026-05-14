/**
 * Demo templates and component color utilities for the Source Map Explorer.
 *
 * Each template is carefully sized to produce a clear, illustrative source map
 * (enough entries to show bidirectional lookup, small enough to read at a glance).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SourceMapTemplate {
  id: string
  label: string
  description: string
  markup: string
  /** Optional default data passed to compile() for dynamic templates. */
  defaultData?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Demo templates
// ---------------------------------------------------------------------------

const BASE_TEMPLATES: SourceMapTemplate[] = [
  {
    id: 'welcome-email',
    label: 'Welcome Email',
    description: 'Section · text · button — see exactly which HTML each component produces',
    markup: `<mc>
  <mc-head>
    <mc-title>Welcome to mailc</mc-title>
    <mc-preview>The modern email compiler — now with source maps.</mc-preview>
  </mc-head>
  <mc-body background-color="#f4f4f5">
    <mc-section background-color="#ffffff" padding="40px 32px">
      <mc-column>
        <mc-text font-size="26px" font-weight="bold" color="#09090b" padding-bottom="12px">
          Welcome to mailc ✉️
        </mc-text>
        <mc-text font-size="14px" color="#52525b" line-height="22px" padding-bottom="20px">
          Click any line on the left to see the exact HTML it compiled to.
          Click any line on the right to trace it back to the source.
        </mc-text>
        <mc-button href="https://github.com/amareshsm/mailc" background-color="#000000" color="#ffffff" inner-padding="12px 24px">
          View on GitHub
        </mc-button>
      </mc-column>
    </mc-section>
    <mc-section padding="16px 32px 24px">
      <mc-column>
        <mc-divider />
        <mc-text font-size="11px" color="#a1a1aa" align="center" padding-top="12px">
          Built with mailc — the modern email compiler
        </mc-text>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`,
  },
  {
    id: 'two-column',
    label: 'Two Columns',
    description: 'Multi-column layout — trace each column to its own table cell',
    markup: `<mc>
  <mc-head>
    <mc-title>Two Column Layout</mc-title>
  </mc-head>
  <mc-body background-color="#f8fafc">
    <mc-section background-color="#1e293b" padding="32px 24px 28px">
      <mc-column>
        <mc-text font-size="22px" font-weight="bold" color="#f8fafc" padding-bottom="6px">
          Source Maps in Action
        </mc-text>
        <mc-text font-size="13px" color="#94a3b8">
          Each column below maps to its own &lt;td&gt; in the compiled HTML.
        </mc-text>
      </mc-column>
    </mc-section>
    <mc-section background-color="#ffffff" padding="24px 16px">
      <mc-column padding="0 8px">
        <mc-text font-size="15px" font-weight="bold" color="#0f172a" padding-bottom="6px">
          Feature One
        </mc-text>
        <mc-text font-size="13px" color="#64748b" line-height="20px">
          Left column content. Click this text in the source — watch the right panel scroll to the matching output.
        </mc-text>
      </mc-column>
      <mc-column padding="0 8px">
        <mc-text font-size="15px" font-weight="bold" color="#0f172a" padding-bottom="6px">
          Feature Two
        </mc-text>
        <mc-text font-size="13px" color="#64748b" line-height="20px">
          Right column content. Try clicking the HTML output to jump straight back to this source line.
        </mc-text>
      </mc-column>
    </mc-section>
    <mc-section padding="0 24px 24px">
      <mc-column>
        <mc-divider />
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`,
  },
  {
    id: 'conditional-template',
    label: 'Gift Order',
    description: 'Order confirmation with gift message section — multi-section layout',
    markup: `<mc>
  <mc-head>
    <mc-title>Order Confirmation</mc-title>
    <mc-preview>Your order is confirmed!</mc-preview>
  </mc-head>
  <mc-body background-color="#f8fafc">
    <mc-section background-color="#ffffff" padding="32px 24px">
      <mc-column>
        <mc-text font-size="22px" font-weight="bold" color="#0f172a" padding-bottom="8px">
          Order Confirmed! 🎉
        </mc-text>
        <mc-text font-size="14px" color="#475569" line-height="22px" padding-bottom="16px">
          Hi Alex, your order <strong>#ORD-48291</strong> is on its way.
        </mc-text>
        <mc-text font-size="13px" color="#0284c7" padding="12px 16px" background-color="#f0f9ff" border-radius="6px">
          🎁 Gift message: Happy Birthday! Hope you love it.
        </mc-text>
        <mc-button href="https://example.com/track/48291" background-color="#2563eb" color="#ffffff" border-radius="6px" font-size="14px" font-weight="bold" padding="12px 28px" margin-top="24px">
          Track Your Order
        </mc-button>
      </mc-column>
    </mc-section>
    <mc-section background-color="#f1f5f9" padding="20px 24px">
      <mc-column>
        <mc-text font-size="12px" color="#94a3b8" align="center">
          Click any component to see its source map entry →
        </mc-text>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`,
  },
  {
    id: 'password-reset',
    label: 'Password Reset',
    description: 'Simple transactional email — single CTA with expiry notice',
    markup: `<mc>
  <mc-head>
    <mc-title>Reset your password</mc-title>
    <mc-preview>We received a request to reset your mailc password.</mc-preview>
  </mc-head>
  <mc-body background-color="#f1f5f9">
    <mc-section background-color="#ffffff" padding="40px 32px 32px">
      <mc-column>
        <mc-text font-size="24px" font-weight="bold" color="#0f172a" padding-bottom="12px">
          Reset your password
        </mc-text>
        <mc-text font-size="14px" color="#475569" line-height="22px" padding-bottom="24px">
          We received a request to reset the password for your account associated with this email address.
          Click the button below to reset it.
        </mc-text>
        <mc-button href="https://app.mailc.dev/reset?token={{token}}" background-color="#2563eb" color="#ffffff" inner-padding="12px 32px" font-size="16px" font-weight="600">
          Reset Password
        </mc-button>
        <mc-text font-size="12px" color="#94a3b8" padding-top="20px" line-height="18px">
          This link expires in 24 hours. If you did not request a password reset, you can safely ignore this email.
        </mc-text>
      </mc-column>
    </mc-section>
    <mc-section padding="20px 32px 32px">
      <mc-column>
        <mc-divider />
        <mc-text font-size="11px" color="#cbd5e1" align="center" padding-top="16px">
          mailc · Security notification · Do not share this email
        </mc-text>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`,
  },
  {
    id: 'newsletter',
    label: 'Newsletter',
    description: 'Multi-section newsletter — header, feature highlight, two-column grid, footer',
    markup: `<mc>
  <mc-head>
    <mc-title>mailc Monthly — April 2026</mc-title>
    <mc-preview>Source maps shipped, playground redesigned, and more.</mc-preview>
  </mc-head>
  <mc-body background-color="#f8fafc">
    <mc-section background-color="#0f172a" padding="32px 24px 28px">
      <mc-column>
        <mc-text font-size="13px" font-weight="bold" color="#38bdf8" padding-bottom="12px">
          MAILC MONTHLY
        </mc-text>
        <mc-text font-size="28px" font-weight="bold" color="#f8fafc" padding-bottom="8px">
          April 2026
        </mc-text>
        <mc-text font-size="14px" color="#94a3b8" line-height="22px">
          Source maps shipped, playground redesigned, and more — here's what changed.
        </mc-text>
      </mc-column>
    </mc-section>
    <mc-section background-color="#ffffff" padding="32px 24px 24px">
      <mc-column>
        <mc-text font-size="11px" font-weight="bold" color="#0284c7" padding-bottom="6px">
          HIGHLIGHT
        </mc-text>
        <mc-text font-size="20px" font-weight="bold" color="#0f172a" padding-bottom="10px">
          Source Maps — Debug with Confidence
        </mc-text>
        <mc-text font-size="14px" color="#475569" line-height="22px" padding-bottom="20px">
          Every compiled email now ships a <strong>.map.json</strong> file.
          Click any output HTML line and jump straight to the source component that produced it.
        </mc-text>
        <mc-button href="https://github.com/amareshsm/mailc" background-color="#0f172a" color="#ffffff" inner-padding="10px 24px">
          Read the Docs
        </mc-button>
      </mc-column>
    </mc-section>
    <mc-section background-color="#f8fafc" padding="24px 16px">
      <mc-column padding="0 8px">
        <mc-text font-size="15px" font-weight="bold" color="#0f172a" padding-bottom="4px">
          🧩 mc-table
        </mc-text>
        <mc-text font-size="13px" color="#64748b" line-height="20px">
          Native HTML table support with Tailwind utilities. Perfect for receipts.
        </mc-text>
      </mc-column>
      <mc-column padding="0 8px">
        <mc-text font-size="15px" font-weight="bold" color="#0f172a" padding-bottom="4px">
          🎨 Playground
        </mc-text>
        <mc-text font-size="13px" color="#64748b" line-height="20px">
          Completely redesigned. Dark mode, live preview, and source map explorer.
        </mc-text>
      </mc-column>
    </mc-section>
    <mc-section padding="0 24px 32px">
      <mc-column>
        <mc-divider />
        <mc-text font-size="11px" color="#cbd5e1" align="center" padding-top="16px">
          You're receiving this because you starred mailc on GitHub · Unsubscribe
        </mc-text>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`,
  },
]

// ---------------------------------------------------------------------------
// Rich / complex templates (invoice, pricing, booking, order, digest)
// ---------------------------------------------------------------------------
// Architecture rules enforced in these templates:
//   - mc-table children: plain thead/tbody/tr/td/th (no mc- prefix)
//   - Styles on td/th: use style="..." not padding="" / color="" attributes
//   - mc-section nests in mc-body only, never inside mc-column
//   - mc-each wrapping mc-section at body level is valid

const RICH_TEMPLATES: SourceMapTemplate[] = [
  {
    id: 'invoice',
    label: '🧾 Invoice',
    description: 'Invoice with line-items table, totals breakdown, and payment CTA',
    markup: `<mc>
  <mc-head>
    <mc-title>Invoice #INV-20489 from mailc</mc-title>
    <mc-preview>Invoice of $240.00 is ready. Due May 10, 2026.</mc-preview>
  </mc-head>
  <mc-body background-color="#f4f4f5">
    <!-- Hero — single-column so it renders identically at every viewport
         width. The earlier two-column variant (logo left + dates right) hit
         a layout edge case on narrow viewports where it stayed side-by-side
         while the body sections stacked, leaving the dark band visibly
         narrower than the white sections below. -->
    <mc-section background-color="#18181b" padding="24px 28px">
      <mc-column>
        <mc-text font-size="20px" font-weight="bold" color="#ffffff" line-height="24px">mailc</mc-text>
        <mc-text font-size="12px" color="#a1a1aa" padding-top="4px" line-height="18px">
          Invoice #INV-20489 · Issued May 1, 2026 · Due May 10, 2026
        </mc-text>
      </mc-column>
    </mc-section>
    <mc-section background-color="#ffffff" padding="28px 28px 0">
      <mc-column>
        <mc-text font-size="10px" font-weight="bold" color="#a1a1aa" padding-bottom="6px">BILL TO</mc-text>
        <mc-text font-size="16px" font-weight="bold" color="#09090b">Acme Corp</mc-text>
        <mc-text font-size="13px" color="#71717a" line-height="20px" padding-top="4px">
          123 Business Ave<br/>New York, NY 10001<br/>billing@acme.com
        </mc-text>
      </mc-column>
      <mc-column>
        <mc-text font-size="10px" font-weight="bold" color="#a1a1aa" padding-bottom="6px">AMOUNT DUE</mc-text>
        <mc-text font-size="32px" font-weight="bold" color="#18181b" line-height="36px">$240.00</mc-text>
        <mc-text font-size="12px" color="#71717a" padding-top="4px">USD</mc-text>
      </mc-column>
    </mc-section>
    <mc-section background-color="#ffffff" padding="24px 28px 0">
      <mc-column>
        <mc-table width="100%">
          <thead>
            <tr style="background-color:#f4f4f5;">
              <th style="text-align:left;padding:10px 12px;font-size:11px;color:#71717a;font-weight:600;">DESCRIPTION</th>
              <th style="text-align:center;padding:10px 12px;font-size:11px;color:#71717a;font-weight:600;">QTY</th>
              <th style="text-align:right;padding:10px 12px;font-size:11px;color:#71717a;font-weight:600;">UNIT</th>
              <th style="text-align:right;padding:10px 12px;font-size:11px;color:#71717a;font-weight:600;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:12px;font-size:13px;color:#09090b;">Pro Plan — Annual</td>
              <td style="padding:12px;font-size:13px;color:#71717a;text-align:center;">1</td>
              <td style="padding:12px;font-size:13px;color:#71717a;text-align:right;">$160.00</td>
              <td style="padding:12px;font-size:13px;font-weight:600;color:#09090b;text-align:right;">$160.00</td>
            </tr>
            <tr style="background-color:#f9fafb;">
              <td style="padding:12px;font-size:13px;color:#09090b;">Source Map Explorer Add-on</td>
              <td style="padding:12px;font-size:13px;color:#71717a;text-align:center;">1</td>
              <td style="padding:12px;font-size:13px;color:#71717a;text-align:right;">$40.00</td>
              <td style="padding:12px;font-size:13px;font-weight:600;color:#09090b;text-align:right;">$40.00</td>
            </tr>
          </tbody>
        </mc-table>
      </mc-column>
    </mc-section>
    <mc-section background-color="#ffffff" padding="8px 28px 0">
      <mc-column>
        <mc-divider />
      </mc-column>
    </mc-section>
    <mc-section background-color="#ffffff" padding="4px 28px">
      <mc-column>
        <mc-text font-size="13px" color="#71717a">Subtotal</mc-text>
      </mc-column>
      <mc-column>
        <mc-text font-size="13px" color="#09090b" align="right">$200.00</mc-text>
      </mc-column>
    </mc-section>
    <mc-section background-color="#ffffff" padding="4px 28px">
      <mc-column>
        <mc-text font-size="13px" color="#71717a">Tax (20%)</mc-text>
      </mc-column>
      <mc-column>
        <mc-text font-size="13px" color="#09090b" align="right">$40.00</mc-text>
      </mc-column>
    </mc-section>
    <mc-section background-color="#ffffff" padding="4px 28px 24px">
      <mc-column>
        <mc-text font-size="15px" font-weight="bold" color="#09090b">Total</mc-text>
      </mc-column>
      <mc-column>
        <mc-text font-size="15px" font-weight="bold" color="#09090b" align="right">$240.00</mc-text>
      </mc-column>
    </mc-section>
    <mc-section background-color="#f4f4f5" padding="24px 28px">
      <mc-column>
        <mc-text font-size="14px" color="#52525b" padding-bottom="16px">
          Pay securely using the link below. Reply with any questions.
        </mc-text>
        <mc-button href="https://pay.mailc.dev/inv/INV-20489" background-color="#18181b" color="#ffffff" border-radius="6px" font-size="14px" font-weight="bold">
          Pay Invoice — $240.00
        </mc-button>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`,
  },

  {
    id: 'pricing',
    label: '💳 Pricing Plans',
    description: 'Two-column pricing comparison with feature lists and CTAs',
    markup: `<mc>
  <mc-head>
    <mc-title>mailc Pricing — Choose Your Plan</mc-title>
    <mc-preview>Starter is free forever. Pro unlocks source maps, themes, and much more.</mc-preview>
  </mc-head>
  <mc-body background-color="#f8fafc">
    <mc-section background-color="#0f172a" padding="48px 32px 40px">
      <mc-column>
        <mc-text font-size="30px" font-weight="bold" color="#f8fafc" align="center" padding-bottom="12px">
          Simple, transparent pricing
        </mc-text>
        <mc-text font-size="15px" color="#94a3b8" align="center" line-height="24px">
          Start for free. Upgrade when you need more power.
        </mc-text>
      </mc-column>
    </mc-section>
    <mc-section background-color="#f8fafc" padding="40px 16px 0">
      <mc-column padding="0 8px" border="1px solid #e2e8f0" border-radius="12px" background-color="#ffffff">
        <mc-text font-size="11px" font-weight="bold" color="#64748b" padding="24px 24px 8px">STARTER</mc-text>
        <mc-text font-size="36px" font-weight="bold" color="#0f172a" padding="0 24px 4px">$0</mc-text>
        <mc-text font-size="13px" color="#64748b" padding="0 24px 20px">per month, forever free</mc-text>
        <mc-divider padding="0 24px" />
        <mc-text font-size="13px" color="#475569" padding="16px 24px" line-height="26px">
          ✓ 1,000 emails / month<br/>
          ✓ 5 templates<br/>
          ✓ Core components<br/>
          ✓ HTML + JSON export<br/>
          ✗ Source maps<br/>
          ✗ Theme customisation
        </mc-text>
        <mc-button href="https://mailc.dev/signup" background-color="#f1f5f9" color="#0f172a" border-radius="8px" font-size="14px" font-weight="bold" padding="14px 28px" margin="8px 24px 24px">
          Get started free
        </mc-button>
      </mc-column>
      <mc-column padding="0 8px" border="2px solid #3b82f6" border-radius="12px" background-color="#ffffff">
        <mc-text font-size="11px" font-weight="bold" color="#3b82f6" padding="20px 24px 0">★ PRO — MOST POPULAR</mc-text>
        <mc-text font-size="36px" font-weight="bold" color="#0f172a" padding="8px 24px 4px">$19</mc-text>
        <mc-text font-size="13px" color="#64748b" padding="0 24px 20px">per month, billed monthly</mc-text>
        <mc-divider padding="0 24px" />
        <mc-text font-size="13px" color="#475569" padding="16px 24px" line-height="26px">
          ✓ Unlimited emails<br/>
          ✓ Unlimited templates<br/>
          ✓ All components<br/>
          ✓ Source maps + playground<br/>
          ✓ Custom themes<br/>
          ✓ Priority support
        </mc-text>
        <mc-button href="https://mailc.dev/pro" background-color="#3b82f6" color="#ffffff" border-radius="8px" font-size="14px" font-weight="bold" padding="14px 28px" margin="8px 24px 24px">
          Start 14-day free trial
        </mc-button>
      </mc-column>
    </mc-section>
    <mc-section padding="28px 40px">
      <mc-column>
        <mc-text font-size="12px" color="#94a3b8" align="center">
          No credit card required for Starter. Cancel Pro any time.
        </mc-text>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`,
  },

  {
    id: 'booking',
    label: '📅 Booking Confirmation',
    description: 'Hotel booking with hero image, details table, amenity grid, and conditional upgrade',
    markup: `<mc>
  <mc-head>
    <mc-title>Booking Confirmed — Grand Ocean Hotel</mc-title>
    <mc-preview>Your stay Apr 28 to May 2 is confirmed. Ref #HOT-20489</mc-preview>
  </mc-head>
  <mc-body background-color="#f1f5f9">
    <mc-section padding="0">
      <mc-column>
        <mc-image
          src="https://placehold.co/600x220/1e3a5f/ffffff?text=Grand+Ocean+Hotel"
          alt="Grand Ocean Hotel"
          width="600"
        />
      </mc-column>
    </mc-section>
    <mc-section background-color="#16a34a" padding="14px 40px">
      <mc-column>
        <mc-text font-size="14px" font-weight="bold" color="#ffffff" align="center">
          Booking Confirmed — Ref #HOT-20489
        </mc-text>
      </mc-column>
    </mc-section>
    <mc-section background-color="#ffffff" padding="32px 40px 0">
      <mc-column>
        <mc-text font-size="22px" font-weight="bold" color="#0f172a" padding-bottom="4px">
          Hi Alex, you're all set!
        </mc-text>
        <mc-text font-size="14px" color="#64748b" line-height="22px">
          We look forward to welcoming you at Grand Ocean Hotel.
        </mc-text>
      </mc-column>
    </mc-section>
    <mc-section background-color="#ffffff" padding="24px 40px">
      <mc-column>
        <mc-table width="100%">
          <tbody>
            <tr>
              <td style="padding:10px 0;font-size:12px;color:#94a3b8;font-weight:600;width:40%;">CHECK-IN</td>
              <td style="padding:10px 0;font-size:14px;color:#0f172a;font-weight:600;">April 28, 2026</td>
            </tr>
            <tr style="background-color:#f8fafc;">
              <td style="padding:10px 0;font-size:12px;color:#94a3b8;font-weight:600;">CHECK-OUT</td>
              <td style="padding:10px 0;font-size:14px;color:#0f172a;font-weight:600;">May 2, 2026 (4 nights)</td>
            </tr>
            <tr>
              <td style="padding:10px 0;font-size:12px;color:#94a3b8;font-weight:600;">ROOM</td>
              <td style="padding:10px 0;font-size:14px;color:#0f172a;font-weight:600;">Deluxe Ocean View King</td>
            </tr>
            <tr style="background-color:#f8fafc;">
              <td style="padding:10px 0;font-size:12px;color:#94a3b8;font-weight:600;">GUESTS</td>
              <td style="padding:10px 0;font-size:14px;color:#0f172a;font-weight:600;">2 adults</td>
            </tr>
            <tr>
              <td style="padding:10px 0;font-size:12px;color:#94a3b8;font-weight:600;">TOTAL PAID</td>
              <td style="padding:10px 0;font-size:15px;font-weight:700;color:#0f172a;">$1,196.00</td>
            </tr>
          </tbody>
        </mc-table>
      </mc-column>
    </mc-section>
    <mc-section background-color="#eff6ff" padding="20px 40px">
      <mc-column>
        <mc-text font-size="14px" font-weight="bold" color="#1d4ed8" padding-bottom="6px">
          Room Upgrade Available
        </mc-text>
        <mc-text font-size="13px" color="#3b82f6" line-height="20px" padding-bottom="12px">
          A Panoramic Suite is available for just $89 more per night.
        </mc-text>
        <mc-button href="https://hotel.example.com/upgrade" background-color="#3b82f6" color="#ffffff" border-radius="6px" font-size="13px">
          Upgrade My Room
        </mc-button>
      </mc-column>
    </mc-section>
    <mc-section background-color="#ffffff" padding="24px 40px">
      <mc-column padding="0 8px">
        <mc-image src="https://placehold.co/80x80/e0f2fe/0284c7?text=WiFi" alt="WiFi" width="48" align="center" padding-bottom="6px" border-radius="8px" />
        <mc-text font-size="12px" color="#64748b" align="center">Free WiFi</mc-text>
      </mc-column>
      <mc-column padding="0 8px">
        <mc-image src="https://placehold.co/80x80/dcfce7/16a34a?text=Pool" alt="Pool" width="48" align="center" padding-bottom="6px" border-radius="8px" />
        <mc-text font-size="12px" color="#64748b" align="center">Rooftop Pool</mc-text>
      </mc-column>
      <mc-column padding="0 8px">
        <mc-image src="https://placehold.co/80x80/fef9c3/ca8a04?text=Food" alt="Breakfast" width="48" align="center" padding-bottom="6px" border-radius="8px" />
        <mc-text font-size="12px" color="#64748b" align="center">Breakfast</mc-text>
      </mc-column>
      <mc-column padding="0 8px">
        <mc-image src="https://placehold.co/80x80/fce7f3/db2777?text=Spa" alt="Spa" width="48" align="center" padding-bottom="6px" border-radius="8px" />
        <mc-text font-size="12px" color="#64748b" align="center">Spa Access</mc-text>
      </mc-column>
    </mc-section>
    <mc-section background-color="#f1f5f9" padding="28px 40px">
      <mc-column>
        <mc-button href="https://hotel.example.com/manage" background-color="#0f172a" color="#ffffff" border-radius="6px">
          Manage Booking
        </mc-button>
        <mc-text font-size="11px" color="#94a3b8" align="center" padding-top="16px">
          Questions? Call +1-800-555-0199 or email stays@grandocean.com
        </mc-text>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`,
  },

  {
    id: 'order-receipt',
    label: '📦 Order Receipt',
    description: 'E-commerce receipt with product items, order summary table, and shipping info',
    markup: `<mc>
  <mc-head>
    <mc-title>Order #ORD-8821 — On its way!</mc-title>
    <mc-preview>Thanks for your order! Estimated delivery Thu, May 7.</mc-preview>
  </mc-head>
  <mc-body background-color="#f4f4f5">
    <!-- Header. Two-column section: logo left, order metadata right. The
         columns will stack on mobile via mc-responsive — that's fine here
         because both halves read cleanly when stacked. -->
    <mc-section background-color="#ffffff" padding="24px 28px">
      <mc-column>
        <mc-text font-size="20px" font-weight="bold" color="#0f172a">shopcraft</mc-text>
      </mc-column>
      <mc-column>
        <mc-text font-size="12px" color="#64748b" align="right">
          Order #ORD-8821<br/>May 4, 2026
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- Confirmation banner -->
    <mc-section background-color="#3b82f6" padding="20px 28px">
      <mc-column>
        <mc-text font-size="18px" font-weight="bold" color="#ffffff">Order confirmed!</mc-text>
        <mc-text font-size="13px" color="#bfdbfe" padding-top="4px">
          Estimated delivery: Thu, May 7
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- "Items in your order" header -->
    <mc-section background-color="#ffffff" padding="24px 28px 8px">
      <mc-column>
        <mc-text font-size="14px" font-weight="bold" color="#0f172a">Items in your order</mc-text>
      </mc-column>
    </mc-section>

    <!-- Item rows — rendered with mc-table instead of mc-section + columns.
         A nested HTML table stays side-by-side at every viewport: it does
         NOT trigger the @media (max-width:500px) mc-responsive width:100%
         rule that collapses inline-block columns. The previous column-based
         layout broke on mobile because the image column became 100% width
         (centering the 64px image) and the text wrapped to a second row,
         making each item ~140px tall and visually disjointed. Tables avoid
         that entirely. -->
    <mc-section background-color="#ffffff" padding="0 28px">
      <mc-column>
        <mc-table width="100%">
          <tbody>
            <tr>
              <td style="width:80px;padding:0 16px 16px 0;vertical-align:top;">
                <img src="https://placehold.co/64x64/f1f5f9/64748b?text=SKU1" alt="Wireless Headphones Pro" width="64" height="64" style="display:block;width:64px;height:64px;border-radius:8px;border:1px solid #e2e8f0;" />
              </td>
              <td style="padding:0 0 16px;vertical-align:top;font-family:Arial,sans-serif;">
                <div style="font-size:14px;font-weight:bold;color:#0f172a;padding-bottom:2px;line-height:18px;">Wireless Headphones Pro</div>
                <div style="font-size:12px;color:#64748b;padding-bottom:4px;line-height:18px;">Midnight Black · Qty: 1</div>
                <div style="font-size:14px;font-weight:bold;color:#0f172a;line-height:18px;">$89.00</div>
              </td>
            </tr>
            <tr>
              <td style="width:80px;padding:0 16px 16px 0;vertical-align:top;">
                <img src="https://placehold.co/64x64/f1f5f9/64748b?text=SKU2" alt="7-in-1 USB-C Hub" width="64" height="64" style="display:block;width:64px;height:64px;border-radius:8px;border:1px solid #e2e8f0;" />
              </td>
              <td style="padding:0 0 16px;vertical-align:top;font-family:Arial,sans-serif;">
                <div style="font-size:14px;font-weight:bold;color:#0f172a;padding-bottom:2px;line-height:18px;">7-in-1 USB-C Hub</div>
                <div style="font-size:12px;color:#64748b;padding-bottom:4px;line-height:18px;">Silver · Qty: 2</div>
                <div style="font-size:14px;font-weight:bold;color:#0f172a;line-height:18px;">$78.00</div>
              </td>
            </tr>
          </tbody>
        </mc-table>
      </mc-column>
    </mc-section>

    <!-- Order summary -->
    <mc-section background-color="#ffffff" padding="16px 28px 32px">
      <mc-column>
        <mc-divider padding-bottom="16px" />
        <mc-table width="100%">
          <tbody>
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#64748b;">Subtotal</td>
              <td style="padding:4px 0;font-size:13px;color:#0f172a;text-align:right;">$167.00</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#64748b;">Shipping</td>
              <td style="padding:4px 0;font-size:13px;color:#16a34a;text-align:right;">Free</td>
            </tr>
            <tr>
              <td style="padding:8px 0 0;font-size:15px;font-weight:700;color:#0f172a;">Total</td>
              <td style="padding:8px 0 0;font-size:15px;font-weight:700;color:#0f172a;text-align:right;">$167.00</td>
            </tr>
          </tbody>
        </mc-table>
      </mc-column>
    </mc-section>

    <!-- Shipping + Payment. Two-column section that stacks on mobile —
         acceptable here because both blocks remain self-contained and
         readable when stacked. -->
    <mc-section background-color="#f8fafc" padding="24px 28px">
      <mc-column>
        <mc-text font-size="11px" font-weight="bold" color="#94a3b8" padding-bottom="8px">SHIPPING TO</mc-text>
        <mc-text font-size="14px" font-weight="bold" color="#0f172a">Jordan Lee</mc-text>
        <mc-text font-size="13px" color="#64748b" line-height="20px" padding-top="4px">
          456 Oak Street<br/>San Francisco, CA 94102
        </mc-text>
      </mc-column>
      <mc-column>
        <mc-text font-size="11px" font-weight="bold" color="#94a3b8" padding-bottom="8px">PAYMENT</mc-text>
        <mc-text font-size="13px" color="#0f172a">Visa</mc-text>
        <mc-text font-size="13px" color="#64748b" padding-top="2px">ending in 4242</mc-text>
      </mc-column>
    </mc-section>

    <!-- CTA -->
    <mc-section background-color="#f4f4f5" padding="24px 28px">
      <mc-column>
        <mc-button href="https://shopcraft.io/track/ORD-8821" background-color="#3b82f6" color="#ffffff" border-radius="6px" font-size="14px" font-weight="bold" padding="12px 28px">
          Track Your Order
        </mc-button>
        <mc-text font-size="11px" color="#94a3b8" align="center" padding-top="16px">
          Need help? Contact support@shopcraft.io
        </mc-text>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`,
  },

  {
    id: 'team-digest',
    label: '📊 Team Digest',
    description: 'Weekly stats with 4-column metrics grid, activity feed loop, and goal tracker',
    markup: `<mc>
  <mc-head>
    <mc-title>Dev Team — Weekly Digest for Apr 14–20</mc-title>
    <mc-preview>47 commits · 12 PRs merged · 31 reviews this week.</mc-preview>
  </mc-head>
  <mc-body background-color="#f1f5f9">
    <!-- Hero header — white card with logo block + label + title + period.
         Logo and meta sit in an mc-table so the pair stays horizontally
         aligned at every viewport width. -->
    <mc-section background-color="#ffffff" padding="28px 28px 22px">
      <mc-column>
        <mc-table width="100%">
          <tr>
            <td style="width:58px;padding:0 14px 0 0;vertical-align:middle;">
              <div style="width:44px;height:44px;background-color:#3b82f6;border-radius:10px;text-align:center;line-height:44px;font-weight:bold;color:#ffffff;font-size:14px;font-family:Arial,sans-serif;letter-spacing:0.5px;">DX</div>
            </td>
            <td style="vertical-align:middle;font-family:Arial,sans-serif;">
              <div style="font-size:11px;font-weight:bold;color:#3b82f6;letter-spacing:0.8px;line-height:14px;padding-bottom:2px;">WEEKLY DIGEST</div>
              <div style="font-size:20px;font-weight:bold;color:#0f172a;line-height:24px;">Dev Team</div>
              <div style="font-size:12px;color:#64748b;padding-top:4px;line-height:18px;">Apr 14–20 · 5 active days</div>
            </td>
          </tr>
        </mc-table>
      </mc-column>
    </mc-section>

    <!-- Stats grid — 4 tinted cards in a single mc-table row. Using
         table cells (not mc-section columns) so the four cards stay
         side-by-side at every viewport instead of stacking into a tall
         vertical strip on mobile. Each card uses an accent tint that
         matches its number's color. -->
    <mc-section background-color="#ffffff" padding="0 16px 24px">
      <mc-column>
        <mc-table width="100%">
          <tr>
            <td style="padding:4px;width:25%;vertical-align:top;">
              <div style="background-color:#eff6ff;border-radius:10px;padding:14px 6px;text-align:center;font-family:Arial,sans-serif;">
                <div style="font-size:24px;font-weight:bold;color:#2563eb;line-height:28px;">47</div>
                <div style="font-size:10px;font-weight:bold;color:#1e40af;letter-spacing:0.6px;padding-top:4px;">COMMITS</div>
              </div>
            </td>
            <td style="padding:4px;width:25%;vertical-align:top;">
              <div style="background-color:#ecfdf5;border-radius:10px;padding:14px 6px;text-align:center;font-family:Arial,sans-serif;">
                <div style="font-size:24px;font-weight:bold;color:#059669;line-height:28px;">12</div>
                <div style="font-size:10px;font-weight:bold;color:#065f46;letter-spacing:0.6px;padding-top:4px;">PRs MERGED</div>
              </div>
            </td>
            <td style="padding:4px;width:25%;vertical-align:top;">
              <div style="background-color:#fff7ed;border-radius:10px;padding:14px 6px;text-align:center;font-family:Arial,sans-serif;">
                <div style="font-size:24px;font-weight:bold;color:#ea580c;line-height:28px;">31</div>
                <div style="font-size:10px;font-weight:bold;color:#9a3412;letter-spacing:0.6px;padding-top:4px;">REVIEWS</div>
              </div>
            </td>
            <td style="padding:4px;width:25%;vertical-align:top;">
              <div style="background-color:#faf5ff;border-radius:10px;padding:14px 6px;text-align:center;font-family:Arial,sans-serif;">
                <div style="font-size:24px;font-weight:bold;color:#7c3aed;line-height:28px;">8</div>
                <div style="font-size:10px;font-weight:bold;color:#5b21b6;letter-spacing:0.6px;padding-top:4px;">ISSUES</div>
              </div>
            </td>
          </tr>
        </mc-table>
      </mc-column>
    </mc-section>

    <!-- Top contributor — distinct white card floating on the body bg. -->
    <mc-section background-color="#f1f5f9" padding="16px 16px 0">
      <mc-column>
        <mc-table width="100%" style="background-color:#ffffff;border-radius:12px;">
          <tr>
            <td style="padding:18px 20px;font-family:Arial,sans-serif;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="width:58px;padding:0 14px 0 0;vertical-align:middle;">
                    <div style="width:44px;height:44px;background-color:#8b5cf6;border-radius:22px;text-align:center;line-height:44px;font-weight:bold;color:#ffffff;font-size:13px;letter-spacing:0.5px;">AV</div>
                  </td>
                  <td style="vertical-align:middle;">
                    <div style="font-size:10px;font-weight:bold;color:#8b5cf6;letter-spacing:0.8px;padding-bottom:4px;">⭐ TOP CONTRIBUTOR</div>
                    <div style="font-size:15px;font-weight:bold;color:#0f172a;line-height:20px;">Arjun Verma</div>
                    <div style="font-size:12px;color:#64748b;padding-top:2px;line-height:16px;">18 commits · 2,847 additions</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </mc-table>
      </mc-column>
    </mc-section>

    <!-- Activity feed — separate white card. Header + list rows packed
         tightly. Each row uses table cells so emoji and text stay aligned
         on mobile. -->
    <mc-section background-color="#f1f5f9" padding="16px 16px 0">
      <mc-column>
        <mc-table width="100%" style="background-color:#ffffff;border-radius:12px;">
          <tr>
            <td style="padding:18px 20px;font-family:Arial,sans-serif;">
              <div style="font-size:13px;font-weight:bold;color:#0f172a;padding-bottom:2px;">Recent activity</div>
              <div style="font-size:11px;color:#94a3b8;padding-bottom:14px;">Latest events across all repos</div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="width:30px;padding:8px 12px 8px 0;vertical-align:top;font-size:16px;line-height:18px;">🔀</td>
                  <td style="padding:8px 0;vertical-align:top;border-bottom:1px solid #f1f5f9;">
                    <div style="font-size:13px;color:#334155;line-height:18px;"><strong style="color:#0f172a;">Arjun</strong> merged PR #412 in <strong style="color:#0f172a;">mailc/core</strong></div>
                    <div style="font-size:11px;color:#94a3b8;padding-top:2px;">2 hours ago</div>
                  </td>
                </tr>
                <tr>
                  <td style="width:30px;padding:8px 12px 8px 0;vertical-align:top;font-size:16px;line-height:18px;">🐛</td>
                  <td style="padding:8px 0;vertical-align:top;border-bottom:1px solid #f1f5f9;">
                    <div style="font-size:13px;color:#334155;line-height:18px;"><strong style="color:#0f172a;">Maya</strong> opened issue #87 in <strong style="color:#0f172a;">mailc/playground</strong></div>
                    <div style="font-size:11px;color:#94a3b8;padding-top:2px;">5 hours ago</div>
                  </td>
                </tr>
                <tr>
                  <td style="width:30px;padding:8px 12px 8px 0;vertical-align:top;font-size:16px;line-height:18px;">📦</td>
                  <td style="padding:8px 0;vertical-align:top;">
                    <div style="font-size:13px;color:#334155;line-height:18px;"><strong style="color:#0f172a;">Sam</strong> released v2.1.0 in <strong style="color:#0f172a;">mailc/cli</strong></div>
                    <div style="font-size:11px;color:#94a3b8;padding-top:2px;">Yesterday</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </mc-table>
      </mc-column>
    </mc-section>

    <!-- Sprint card — dark accent card for visual variety. Includes a
         simple progress bar built from nested divs (an email-safe pattern
         that mostly works in Outlook too). -->
    <mc-section background-color="#f1f5f9" padding="16px 16px 0">
      <mc-column>
        <mc-table width="100%" style="background-color:#0f172a;border-radius:12px;">
          <tr>
            <td style="padding:20px;font-family:Arial,sans-serif;">
              <div style="font-size:11px;font-weight:bold;color:#60a5fa;letter-spacing:0.8px;padding-bottom:4px;">CURRENT SPRINT</div>
              <div style="font-size:16px;font-weight:bold;color:#ffffff;padding-bottom:14px;line-height:20px;">Q2 Foundation</div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-size:12px;color:#94a3b8;padding-bottom:8px;">18 of 24 tasks complete</td>
                  <td style="font-size:12px;color:#60a5fa;font-weight:bold;text-align:right;padding-bottom:8px;">75%</td>
                </tr>
              </table>
              <div style="background-color:#1e293b;border-radius:999px;height:6px;line-height:6px;font-size:0;">
                <div style="background-color:#3b82f6;border-radius:999px;height:6px;width:75%;line-height:6px;font-size:0;">&nbsp;</div>
              </div>
            </td>
          </tr>
        </mc-table>
      </mc-column>
    </mc-section>

    <!-- CTA -->
    <mc-section background-color="#f1f5f9" padding="20px 28px 8px">
      <mc-column>
        <mc-button href="https://linear.app/team/sprint" background-color="#0f172a" color="#ffffff" border-radius="8px" font-size="13px" font-weight="bold" padding="12px 28px">
          View Sprint Board
        </mc-button>
      </mc-column>
    </mc-section>

    <!-- Footer -->
    <mc-section background-color="#f1f5f9" padding="16px 28px 28px">
      <mc-column>
        <mc-text font-size="11px" color="#94a3b8" align="center" line-height="16px">
          Sent to team@mailc.dev · Unsubscribe
        </mc-text>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>`,
  },
]

// ---------------------------------------------------------------------------
// Dynamic templates — variables + conditionals + loops
// ---------------------------------------------------------------------------

const DYNAMIC_TEMPLATES: SourceMapTemplate[] = [
  {
    id: 'loyalty-offer',
    label: '🎯 Loyalty Offer (mc-if)',
    description: 'Variables + mc-if/mc-else-if/mc-else — tier-based offer rendering. Edit data to switch gold → silver → member.',
    defaultData: {
      user: { firstName: 'Priya', tier: 'gold', memberSince: 'March 2022' },
      brand: { name: 'Meridian' },
      offer: { discount: '35%', expiry: 'Sunday, May 4', ctaUrl: 'https://meridian.example.com/offer' },
    },
    markup: `<mc>
  <mc-head>
    <mc-title>{{user.firstName}}, your {{user.tier}} member offer</mc-title>
    <mc-preview>{{offer.discount}} off — expires {{offer.expiry}}</mc-preview>
  </mc-head>
  <mc-body background-color="#f1f5f9">

    <mc-section background-color="#0f172a" padding="18px 32px">
      <mc-column width="50%">
        <mc-text font-size="15px" font-weight="bold" color="#f8fafc">
          {{brand.name || "Meridian"}}
        </mc-text>
      </mc-column>
      <mc-column width="50%">
        <mc-text font-size="11px" color="#64748b" align="right">
          Member since {{user.memberSince || "2024"}}
        </mc-text>
      </mc-column>
    </mc-section>

    <mc-section background-color="#ffffff" padding="40px 32px 28px">
      <mc-column>
        <mc-text font-size="22px" font-weight="800" color="#0f172a" line-height="30px" padding-bottom="10px">
          Hi {{user.firstName}},<br/>your exclusive offer is ready.
        </mc-text>
        <mc-text font-size="14px" color="#64748b" line-height="22px" padding-bottom="24px">
          As a <strong>{{user.tier}} member</strong>, we've unlocked special pricing just for you.
          This offer expires on <strong>{{offer.expiry}}</strong>.
        </mc-text>
      </mc-column>
    </mc-section>

    <mc-section background-color="#ffffff" padding="0 32px 36px">
      <mc-column>
        <mc-if condition="user.tier == 'gold'">
          <mc-text font-size="11px" font-weight="bold" color="#d97706" padding-bottom="6px">
            ★ GOLD MEMBER EXCLUSIVE
          </mc-text>
          <mc-text font-size="42px" font-weight="900" color="#0f172a" line-height="48px" padding-bottom="4px">
            {{offer.discount}} off
          </mc-text>
          <mc-text font-size="13px" color="#64748b" padding-bottom="20px">
            Sitewide — no minimum, no exclusions
          </mc-text>
          <mc-button href="{{offer.ctaUrl}}" background-color="#d97706" color="#ffffff" border-radius="6px" font-size="14px" font-weight="bold" padding="14px 32px">
            Claim Gold Offer →
          </mc-button>
        </mc-if>
        <mc-else-if condition="user.tier == 'silver'">
          <mc-text font-size="11px" font-weight="bold" color="#64748b" padding-bottom="6px">
            ◆ SILVER MEMBER EXCLUSIVE
          </mc-text>
          <mc-text font-size="42px" font-weight="900" color="#0f172a" line-height="48px" padding-bottom="4px">
            {{offer.discount}} off
          </mc-text>
          <mc-text font-size="13px" color="#64748b" padding-bottom="20px">
            Selected categories · minimum spend may apply
          </mc-text>
          <mc-button href="{{offer.ctaUrl}}" background-color="#475569" color="#ffffff" border-radius="6px" font-size="14px" font-weight="bold" padding="14px 32px">
            Claim Silver Offer →
          </mc-button>
        </mc-else-if>
        <mc-else>
          <mc-text font-size="11px" font-weight="bold" color="#2563eb" padding-bottom="6px">
            MEMBER EXCLUSIVE
          </mc-text>
          <mc-text font-size="42px" font-weight="900" color="#0f172a" line-height="48px" padding-bottom="4px">
            {{offer.discount}} off
          </mc-text>
          <mc-text font-size="13px" color="#64748b" padding-bottom="20px">
            Your next purchase this month
          </mc-text>
          <mc-button href="{{offer.ctaUrl}}" background-color="#2563eb" color="#ffffff" border-radius="6px" font-size="14px" font-weight="bold" padding="14px 32px">
            Claim Offer →
          </mc-button>
        </mc-else>
      </mc-column>
    </mc-section>

    <mc-section background-color="#f8fafc" padding="24px 32px" border-top="1px solid #e2e8f0">
      <mc-column>
        <mc-text font-size="11px" color="#94a3b8" align="center">
          © 2025 {{brand.name || "Meridian"}} · Unsubscribe
        </mc-text>
      </mc-column>
    </mc-section>

  </mc-body>
</mc>`,
  },

  {
    id: 'cart-recovery',
    label: '🛒 Cart Recovery (mc-each)',
    description: 'Variables + mc-each loop over cart items. Add/remove items in the Data panel to see the loop expand.',
    defaultData: {
      user: { firstName: 'Daniel' },
      cart: {
        itemCount: 2,
        total: '$228.00',
        checkoutUrl: 'https://shopcraft.example.com/cart/abc123',
        items: [
          { name: 'Wireless Noise-Cancelling Headphones', variant: 'Midnight Black · Qty 1', price: '$149.00' },
          { name: '7-in-1 USB-C Hub', variant: 'Silver · Qty 1', price: '$79.00' },
        ],
      },
    },
    markup: `<mc>
  <mc-head>
    <mc-title>{{user.firstName}}, you left something behind</mc-title>
    <mc-preview>Your cart has {{cart.itemCount}} item(s) waiting — {{cart.total}}</mc-preview>
  </mc-head>
  <mc-body background-color="#f8fafc">

    <mc-section background-color="#18181b" padding="18px 40px">
      <mc-column>
        <mc-text font-size="15px" font-weight="bold" color="#ffffff">shopcraft</mc-text>
      </mc-column>
    </mc-section>

    <mc-section background-color="#3b82f6" padding="12px 40px">
      <mc-column>
        <mc-text font-size="13px" font-weight="bold" color="#ffffff" align="center">
          ⏱ Your cart expires in 24 hours
        </mc-text>
      </mc-column>
    </mc-section>

    <mc-section background-color="#ffffff" padding="32px 40px 20px">
      <mc-column>
        <mc-text font-size="22px" font-weight="bold" color="#0f172a" padding-bottom="8px">
          Hey {{user.firstName}}, your cart misses you.
        </mc-text>
        <mc-text font-size="14px" color="#64748b" line-height="22px">
          You left {{cart.itemCount}} item(s) behind. Complete your order before they sell out.
        </mc-text>
      </mc-column>
    </mc-section>

    <mc-section background-color="#ffffff" padding="4px 40px 0">
      <mc-column>
        <mc-divider border-color="#e5e7eb" />
      </mc-column>
    </mc-section>

    <mc-section background-color="#ffffff" padding="0 40px">
      <mc-column>
        <mc-table width="100%">
          <tbody>
            <mc-each items="cart.items" as="item">
              <tr>
                <td style="padding:12px 0;vertical-align:top;">
                  <div style="font-size:14px;font-weight:600;color:#0f172a;padding-bottom:2px;">{{item.name}}</div>
                  <div style="font-size:12px;color:#94a3b8;">{{item.variant || ""}}</div>
                </td>
                <td style="padding:12px 0;vertical-align:top;text-align:right;font-size:14px;font-weight:bold;color:#0f172a;white-space:nowrap;">
                  {{item.price}}
                </td>
              </tr>
            </mc-each>
            <tr>
              <td colspan="2" style="padding:4px 0;border-top:1px solid #e5e7eb;"></td>
            </tr>
            <tr>
              <td style="padding:12px 0 28px;font-size:15px;font-weight:bold;color:#0f172a;">Total</td>
              <td style="padding:12px 0 28px;text-align:right;font-size:15px;font-weight:bold;color:#0f172a;">
                {{cart.total}}
              </td>
            </tr>
          </tbody>
        </mc-table>
      </mc-column>
    </mc-section>

    <mc-section background-color="#f8fafc" padding="24px 40px">
      <mc-column>
        <mc-button href="{{cart.checkoutUrl}}" background-color="#18181b" color="#ffffff" border-radius="6px" font-size="14px" font-weight="bold" padding="16px 32px" align="center">
          Complete Your Order →
        </mc-button>
        <mc-text font-size="11px" color="#94a3b8" align="center" padding-top="12px">
          Free shipping on orders over $50 · Cart saved for 48 hours
        </mc-text>
      </mc-column>
    </mc-section>

  </mc-body>
</mc>`,
  },
]

// ---------------------------------------------------------------------------
// Feature showcase templates — demonstrate specific mailc capabilities
// ---------------------------------------------------------------------------

const FEATURE_TEMPLATES: SourceMapTemplate[] = [
  {
    id: 'mc-attributes-classes',
    label: '🎨 Styling System (mc-attributes)',
    description: 'mc-all global defaults · per-type defaults · named mc-class bundles · extends inheritance · precedence chain',
    markup: `<mc>
  <mc-head>
    <mc-title>mc-attributes &amp; mc-class Showcase</mc-title>
    <mc-preview>Global defaults, named style bundles, and extends inheritance.</mc-preview>

    <mc-attributes>
      <!--
        mc-all: applies these attrs to EVERY body component as the lowest-priority default.
        Think of it as the email's global reset / base style.
      -->
      <mc-all font-family="Arial, Helvetica, sans-serif" color="#374151" />

      <!--
        Per-type defaults: only applied to mc-text nodes.
        Overrides mc-all for mc-text, but still lower priority than mc-class or explicit attrs.
      -->
      <mc-text font-size="14px" line-height="22px" />

      <!--
        Per-type defaults: only applied to mc-button nodes.
      -->
      <mc-button border-radius="6px" font-weight="bold" font-size="14px" />

      <!--
        Named mc-class bundles — referenced via mc-class="name" on any body component.
        The compiler resolves the bundle and merges it into the component's effective attrs.
      -->

      <!-- "hero": large heading style -->
      <mc-class name="hero" font-size="26px" font-weight="bold" color="#0f172a" line-height="34px" />

      <!-- "label": small all-caps annotation -->
      <mc-class name="label" font-size="11px" font-weight="bold" color="#6b7280" />

      <!-- "muted": de-emphasized body copy -->
      <mc-class name="muted" font-size="12px" color="#9ca3af" line-height="18px" />

      <!--
        "cta" extends "hero": inherits font-size + font-weight from hero,
        then overrides color and adds background-color of its own.
        Own attrs always beat the base class attrs.
      -->
      <mc-class name="cta" extends="hero" color="#ffffff" background-color="#2563eb" font-size="15px" padding="14px 28px" />
    </mc-attributes>
  </mc-head>

  <mc-body background-color="#f1f5f9">

    <!-- ── HEADER — explicit attrs, no mc-class ──────────────────────────── -->
    <mc-section background-color="#0f172a" padding="32px 40px">
      <mc-column>
        <mc-text font-size="11px" font-weight="bold" color="#38bdf8" padding-bottom="8px">
          FEATURE SHOWCASE
        </mc-text>
        <mc-text font-size="26px" font-weight="bold" color="#f8fafc" line-height="34px" padding-bottom="6px">
          mc-attributes &amp; mc-class
        </mc-text>
        <mc-text font-size="13px" color="#94a3b8">
          Global defaults · Named bundles · Extends · Precedence
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- ── GLOBAL DEFAULTS (mc-all + per-type) ───────────────────────────── -->
    <!--
      These mc-text nodes carry no explicit styling. They receive:
        font-family  → from mc-all
        font-size    → from mc-text per-type default
        line-height  → from mc-text per-type default
        color        → from mc-all
    -->
    <mc-section background-color="#ffffff" padding="32px 40px 24px">
      <mc-column>
        <mc-text mc-class="label" padding-bottom="10px">
          GLOBAL DEFAULTS — mc-all + per-type
        </mc-text>
        <mc-text padding-bottom="8px">
          This paragraph carries no explicit attrs. It inherits
          font-family from mc-all and font-size 14px + line-height 22px
          from the per-type mc-text default in mc-attributes.
        </mc-text>
        <mc-text mc-class="muted">
          Change the mc-all or mc-text default in mc-attributes above
          and every matching component in the email updates automatically.
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- ── NAMED BUNDLES (mc-class="name") ───────────────────────────────── -->
    <!--
      mc-class="hero" on mc-text injects the full hero bundle:
        font-size:26px, font-weight:bold, color:#0f172a, line-height:34px
      These override both mc-all and the mc-text per-type defaults.
    -->
    <mc-section background-color="#ffffff" padding="0 40px 32px" border-top="1px solid #f1f5f9">
      <mc-column>
        <mc-text mc-class="label" padding-bottom="14px">
          NAMED BUNDLES — mc-class="name"
        </mc-text>

        <!-- hero bundle → large, bold heading -->
        <mc-text mc-class="hero" padding-bottom="6px">
          Hero heading — mc-class="hero"
        </mc-text>

        <!-- muted bundle → small, de-emphasized text -->
        <mc-text mc-class="muted" padding-bottom="20px">
          Fine print — mc-class="muted"
        </mc-text>

        <mc-text font-size="13px" color="#64748b" padding-bottom="20px">
          Apply any bundle to any body component by writing mc-class="bundleName".
          The compiler merges the bundle before emitting HTML — the attribute is
          stripped from the output so it never reaches the inbox.
        </mc-text>

        <!--
          cta bundle extends hero: inherits font-weight:bold,
          overrides font-size to 15px + color to white, adds background-color.
        -->
        <mc-button href="https://mailc.dev" mc-class="cta">
          CTA button — mc-class="cta" (extends hero)
        </mc-button>
      </mc-column>
    </mc-section>

    <!-- ── EXTENDS INHERITANCE ────────────────────────────────────────────── -->
    <!--
      Extending a class merges: base attrs first, then own attrs on top.
      Chains can be arbitrarily deep — cycle detection prevents infinite loops.
    -->
    <mc-section background-color="#eff6ff" padding="24px 40px">
      <mc-column>
        <mc-text mc-class="label" color="#1d4ed8" padding-bottom="10px">
          EXTENDS — cta extends hero
        </mc-text>
        <mc-text font-size="13px" color="#1e40af" line-height="20px">
          The "cta" class is defined as extends="hero". At compile time the
          resolver merges hero's attributes first, then applies cta's own
          overrides on top. Result: font-weight bold (from hero) +
          font-size 15px + color white + background blue (own overrides).
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- ── MULTIPLE SPACE-SEPARATED CLASSES ──────────────────────────────── -->
    <!--
      mc-class accepts multiple space-separated names.
      They are merged left-to-right — later names win on conflicts.
    -->
    <mc-section background-color="#ffffff" padding="24px 40px">
      <mc-column>
        <mc-text mc-class="label" padding-bottom="12px">
          MULTIPLE CLASSES — mc-class="hero muted"
        </mc-text>
        <!--
          hero provides font-size:26px, font-weight:bold, color:#0f172a.
          muted provides font-size:12px, color:#9ca3af.
          "muted" comes last, so its font-size and color win.
          font-weight:bold from hero is kept (muted doesn't set it).
        -->
        <mc-text mc-class="hero muted" padding-bottom="8px">
          mc-class="hero muted" — muted overrides hero's font-size and color
        </mc-text>
        <mc-text font-size="12px" color="#94a3b8">
          Space-separated classes merge left-to-right. Later names override earlier ones
          on conflicting attrs. Non-conflicting attrs from all classes are preserved.
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- ── PRECEDENCE CHAIN ───────────────────────────────────────────────── -->
    <!--
      Full precedence order (lowest → highest):
        1. mc-all
        2. per-type default (mc-text, mc-button, …)
        3. mc-class bundle(s)
        4. explicit attribute on the tag
    -->
    <mc-section background-color="#f8fafc" padding="24px 40px 32px">
      <mc-column>
        <mc-text mc-class="label" padding-bottom="14px">
          PRECEDENCE: mc-all → per-type → mc-class → explicit
        </mc-text>

        <!--
          hero bundle sets color:#0f172a — but explicit color="#e11d48" wins.
          Explicit attributes always have the highest precedence.
        -->
        <mc-text mc-class="hero" color="#e11d48" padding-bottom="10px">
          mc-class="hero" + explicit color="#e11d48" — explicit wins
        </mc-text>

        <!--
          hero bundle sets font-size:26px, which beats the mc-text default 14px.
          mc-class beats per-type defaults.
        -->
        <mc-text mc-class="hero" padding-bottom="10px">
          mc-class="hero" font-size:26px beats mc-text default 14px
        </mc-text>

        <!--
          No mc-class — just mc-all + mc-text defaults apply.
        -->
        <mc-text mc-class="muted">
          No mc-class: only mc-all + mc-text default — font-size 12px from muted bundle
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- ── FOOTER ────────────────────────────────────────────────────────── -->
    <mc-section padding="16px 40px 28px">
      <mc-column>
        <mc-divider />
        <mc-text font-size="11px" color="#d1d5db" align="center" padding-top="12px">
          mailc · mc-attributes &amp; mc-class feature showcase
        </mc-text>
      </mc-column>
    </mc-section>

  </mc-body>
</mc>`,
  },

  {
    id: 'mobile-stacking',
    label: '📱 Mobile Stacking',
    description: 'How mc-columns auto-stack below 620px — three sections show where the default helps and where it hurts',
    markup: `<mc>
  <mc-head>
    <mc-title>Mobile stacking demo</mc-title>
    <mc-preview>Resize the preview below 620px to see every column flip to 100% width.</mc-preview>
  </mc-head>

  <mc-body background-color="#f8fafc">

    <!-- Header — explains what to look for -->
    <mc-section background-color="#0f172a" padding="32px 32px 28px">
      <mc-column>
        <mc-text font-size="11px" font-weight="bold" color="#38bdf8" letter-spacing="1.5px" padding-bottom="10px">
          MOBILE STACKING DEMO
        </mc-text>
        <mc-text font-size="22px" font-weight="bold" color="#f8fafc" line-height="30px" padding-bottom="10px">
          Resize the preview to see columns stack
        </mc-text>
        <mc-text font-size="13px" color="#94a3b8" line-height="20px">
          Below 620px every mc-column hits the @media query in &lt;head&gt; and flips to 100% width.
          The three sections below show where stacking is the right default — and where it isn't.
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- ── CASE 1: stacking works (image + text hero) ───────────────────────── -->
    <mc-section background-color="#ecfdf5" padding="16px 32px">
      <mc-column>
        <mc-text font-size="11px" font-weight="bold" color="#047857" letter-spacing="1px" padding-bottom="4px">
          CASE 1 · STACKING WORKS
        </mc-text>
        <mc-text font-size="13px" color="#065f46" line-height="20px">
          Two-column hero — image + text. On mobile each becomes full width and stays readable.
        </mc-text>
      </mc-column>
    </mc-section>

    <mc-section background-color="#ffffff" padding="32px">
      <mc-column width="50%">
        <mc-image src="https://placehold.co/280x200/4f46e5/ffffff?text=Hero" alt="Hero" width="280" height="200" />
      </mc-column>
      <mc-column width="50%">
        <mc-text font-size="20px" font-weight="bold" color="#0f172a" line-height="28px" padding-bottom="8px">
          Big content, full-width on mobile
        </mc-text>
        <mc-text font-size="14px" color="#475569" line-height="22px">
          When each column is a real content block, stacking gives the user comfortable
          reading widths on phones. This is mailc's default — and it's right most of the time.
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- ── CASE 2: stacking is wrong (4 small social icons) ─────────────────── -->
    <mc-section background-color="#fef2f2" padding="16px 32px">
      <mc-column>
        <mc-text font-size="11px" font-weight="bold" color="#b91c1c" letter-spacing="1px" padding-bottom="4px">
          CASE 2 · STACKING LOOKS BAD
        </mc-text>
        <mc-text font-size="13px" color="#991b1b" line-height="20px">
          Four social icons. On mobile they become a 4-line vertical strip — wasted scroll, broken row.
        </mc-text>
      </mc-column>
    </mc-section>

    <mc-section background-color="#ffffff" padding="24px 32px">
      <mc-column width="25%">
        <mc-text font-size="28px" align="center" padding-bottom="6px">🐦</mc-text>
        <mc-text font-size="11px" align="center" color="#64748b">Twitter</mc-text>
      </mc-column>
      <mc-column width="25%">
        <mc-text font-size="28px" align="center" padding-bottom="6px">💼</mc-text>
        <mc-text font-size="11px" align="center" color="#64748b">LinkedIn</mc-text>
      </mc-column>
      <mc-column width="25%">
        <mc-text font-size="28px" align="center" padding-bottom="6px">📷</mc-text>
        <mc-text font-size="11px" align="center" color="#64748b">Instagram</mc-text>
      </mc-column>
      <mc-column width="25%">
        <mc-text font-size="28px" align="center" padding-bottom="6px">📺</mc-text>
        <mc-text font-size="11px" align="center" color="#64748b">YouTube</mc-text>
      </mc-column>
    </mc-section>

    <!-- ── CASE 3: stacking is wrong (3 tiny feature labels) ────────────────── -->
    <mc-section background-color="#fef2f2" padding="16px 32px">
      <mc-column>
        <mc-text font-size="11px" font-weight="bold" color="#b91c1c" letter-spacing="1px" padding-bottom="4px">
          CASE 3 · STACKING LOOKS BAD
        </mc-text>
        <mc-text font-size="13px" color="#991b1b" line-height="20px">
          Three tiny "icon + label" feature cards. Stacking turns one tight row into three sparse ones.
        </mc-text>
      </mc-column>
    </mc-section>

    <mc-section background-color="#ffffff" padding="28px 32px">
      <mc-column width="33%">
        <mc-text font-size="24px" align="center" padding-bottom="6px">⚡</mc-text>
        <mc-text font-size="12px" align="center" font-weight="bold" color="#0f172a">Fast</mc-text>
      </mc-column>
      <mc-column width="33%">
        <mc-text font-size="24px" align="center" padding-bottom="6px">🔒</mc-text>
        <mc-text font-size="12px" align="center" font-weight="bold" color="#0f172a">Secure</mc-text>
      </mc-column>
      <mc-column width="34%">
        <mc-text font-size="24px" align="center" padding-bottom="6px">💎</mc-text>
        <mc-text font-size="12px" align="center" font-weight="bold" color="#0f172a">Premium</mc-text>
      </mc-column>
    </mc-section>

    <!-- ── CASE 4: FIXED with mc-group ──────────────────────────────────────── -->
    <mc-section background-color="#ecfdf5" padding="16px 32px">
      <mc-column>
        <mc-text font-size="11px" font-weight="bold" color="#047857" letter-spacing="1px" padding-bottom="4px">
          CASE 4 · FIXED WITH mc-group
        </mc-text>
        <mc-text font-size="13px" color="#065f46" line-height="20px">
          Same 4 social icons, now wrapped in &lt;mc-group&gt;. The wrapper opts out of the auto-stack rule —
          children stay side-by-side even below 620px.
        </mc-text>
      </mc-column>
    </mc-section>

    <mc-section background-color="#ffffff" padding="24px 32px">
      <mc-group>
        <mc-column width="25%">
          <mc-text font-size="28px" align="center" padding-bottom="6px">🐦</mc-text>
          <mc-text font-size="11px" align="center" color="#64748b">Twitter</mc-text>
        </mc-column>
        <mc-column width="25%">
          <mc-text font-size="28px" align="center" padding-bottom="6px">💼</mc-text>
          <mc-text font-size="11px" align="center" color="#64748b">LinkedIn</mc-text>
        </mc-column>
        <mc-column width="25%">
          <mc-text font-size="28px" align="center" padding-bottom="6px">📷</mc-text>
          <mc-text font-size="11px" align="center" color="#64748b">Instagram</mc-text>
        </mc-column>
        <mc-column width="25%">
          <mc-text font-size="28px" align="center" padding-bottom="6px">📺</mc-text>
          <mc-text font-size="11px" align="center" color="#64748b">YouTube</mc-text>
        </mc-column>
      </mc-group>
    </mc-section>

    <!-- Footer note -->
    <mc-section background-color="#f1f5f9" padding="22px 32px 26px">
      <mc-column>
        <mc-text font-size="11px" color="#64748b" line-height="18px" align="center">
          Try resizing the preview pane (or use the device-width toggle).
          Below 620px the @media query in &lt;head&gt; flips every mc-column to 100% width.
          Wrap a row in &lt;mc-group&gt; to opt out — children keep their declared widths and stay horizontal.
        </mc-text>
      </mc-column>
    </mc-section>

  </mc-body>
</mc>`,
  },

  {
    id: 'lists-attribute',
    label: '🧪 mc-list (Attribute mode)',
    description: 'Ordered & unordered lists in attribute mode — typography flows from mc-list onto every <li>',
    markup: `<mc>
  <mc-head>
    <mc-title>mc-list showcase</mc-title>
    <mc-preview>Semantic ul/ol with email-safe table wrapper.</mc-preview>
    <mc-attributes>
      <mc-all font-family="Arial, Helvetica, sans-serif" color="#374151" />
    </mc-attributes>
  </mc-head>
  <mc-body background-color="#f4f6f9">

    <mc-section background-color="#ffffff" padding="48px 40px 16px">
      <mc-column>
        <mc-text color="#111827" font-size="32px" font-weight="bold" line-height="40px">
          What's new
        </mc-text>
        <mc-text color="#6b7280" font-size="16px" line-height="24px" padding-top="12px">
          mc-list and mc-list-item — semantic lists wrapped in an Outlook-safe table.
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- Unordered list -->
    <mc-section background-color="#ffffff" padding="16px 40px">
      <mc-column>
        <mc-text color="#111827" font-size="20px" font-weight="bold" padding-bottom="12px">
          Highlights
        </mc-text>
        <mc-list list-style-type="disc" color="#374151" font-size="15px" line-height="22px" item-spacing="8px" padding-left="20px">
          <mc-list-item><strong>Semantic ul/ol</strong> — accessible markup, not faked with line breaks</mc-list-item>
          <mc-list-item><strong>Inline HTML supported</strong> — <a href="https://example.com" style="color:#2563eb;">links</a>, <em>emphasis</em>, <code>code</code></mc-list-item>
          <mc-list-item><strong>Email-safe defaults</strong> — list-style-type, padding-left, margin reset</mc-list-item>
          <mc-list-item><strong>Per-item spacing</strong> — item-spacing controls vertical gap</mc-list-item>
        </mc-list>
      </mc-column>
    </mc-section>

    <!-- Ordered list -->
    <mc-section background-color="#ffffff" padding="16px 40px 48px">
      <mc-column>
        <mc-text color="#111827" font-size="20px" font-weight="bold" padding-bottom="12px">
          Three-step setup
        </mc-text>
        <mc-list type="ol" list-style-type="decimal" color="#374151" font-size="15px" line-height="22px" item-spacing="6px" padding-left="20px">
          <mc-list-item>Pull the latest mailc package</mc-list-item>
          <mc-list-item>Replace any inline &lt;ul&gt; you had inside mc-text with mc-list</mc-list-item>
          <mc-list-item>Style the list — typography flows from mc-list onto every &lt;li&gt;</mc-list-item>
        </mc-list>
      </mc-column>
    </mc-section>

  </mc-body>
</mc>`,
  },

  {
    id: 'lists-class',
    label: '🧪 mc-list (Class mode)',
    description: 'Same lists authored with Tailwind utility classes — list-disc / list-decimal resolve via the class resolver',
    markup: `<mc>
  <mc-head>
    <mc-title>mc-list showcase (class mode)</mc-title>
    <mc-preview>Semantic ul/ol authored with Tailwind utility classes.</mc-preview>
  </mc-head>
  <mc-body class="bg-[#f4f6f9]">

    <mc-section class="bg-white px-[40px] pt-[48px] pb-[16px]">
      <mc-column>
        <mc-text class="text-[#111827] text-[32px] font-bold leading-[40px]">
          What's new
        </mc-text>
        <mc-text class="text-[#6b7280] text-[16px] leading-[24px] pt-[12px]">
          mc-list and mc-list-item — Tailwind classes flow through the resolver.
        </mc-text>
      </mc-column>
    </mc-section>

    <mc-section class="bg-white px-[40px] py-[16px]">
      <mc-column>
        <mc-text class="text-[#111827] text-[20px] font-bold pb-[12px]">
          Highlights
        </mc-text>
        <mc-list class="list-disc text-[#374151] text-[15px] leading-[22px] pl-[20px]" item-spacing="8px">
          <mc-list-item><strong>list-disc / list-decimal / list-none</strong> — resolver maps these to list-style-type</mc-list-item>
          <mc-list-item><strong>list-inside / list-outside</strong> — control bullet position</mc-list-item>
          <mc-list-item><strong>Inline HTML</strong> still works inside list items: <code>code</code>, <em>emphasis</em>, <a href="https://example.com">links</a></mc-list-item>
          <mc-list-item><strong>Class-mode safe</strong> — using color="#fff" on mc-list raises CSS_ATTR_IN_CLASS_MODE; class="text-[#fff]" doesn't</mc-list-item>
        </mc-list>
      </mc-column>
    </mc-section>

    <mc-section class="bg-white px-[40px] py-[16px] pb-[48px]">
      <mc-column>
        <mc-text class="text-[#111827] text-[20px] font-bold pb-[12px]">
          Three-step setup
        </mc-text>
        <mc-list type="ol" class="list-decimal text-[#374151] text-[15px] leading-[22px] pl-[20px]" item-spacing="6px">
          <mc-list-item>Pull the latest mailc package</mc-list-item>
          <mc-list-item>Replace any inline ul you had inside mc-text with mc-list</mc-list-item>
          <mc-list-item>Style with Tailwind utilities — list-disc, text-*, leading-*, pl-*</mc-list-item>
        </mc-list>
      </mc-column>
    </mc-section>

  </mc-body>
</mc>`,
  },
]

// ---------------------------------------------------------------------------
// Premium templates — alter.email-level quality: dark themes, typographic
// precision, generous whitespace, ghost buttons, split-tone layouts.
// All styling uses Tailwind class mode (no CSS attribute props).
// ---------------------------------------------------------------------------

const PREMIUM_TEMPLATES: SourceMapTemplate[] = [
  {
    id: 'premium-luxury-welcome',
    label: '⬛ Luxury Welcome (Premium)',
    description: 'Dark-theme luxury brand welcome — display typography, gold accents, ghost button, split-tone sections, 3-col footer',
    markup: `<mc>
  <mc-head>
    <mc-title>MERIDIAN — Autumn Collection 2026</mc-title>
    <mc-preview>Your exclusive early access to the Meridian Autumn Collection.</mc-preview>
  </mc-head>

  <!--
    Premium template — inspired by alter.email's luxury automotive emails.

    Techniques demonstrated:
      · Dark-theme design  (#09090b → zinc-900 → black hierarchy)
      · Typographic precision (display 48px / label 11px / body 14px)
      · Letter-spaced uppercase labels  (tracking-[3px])
      · Gold accent colour  (#c9a961)
      · Ghost / outline button  (bg-transparent + border)
      · Split-tone layout  (dark → white → dark → dark → black)
      · Whitespace mastery  (py-14 between major sections)
      · 3-column dark footer
      · Stats row  (3-col with large numerals)

    All styling is Tailwind class-based — no CSS attribute props.
  -->

  <mc-body class="bg-zinc-950">

    <!-- ── Brand bar ──────────────────────────────────────────────────── -->
    <mc-section class="bg-zinc-950 pt-8 pb-6 px-10">
      <mc-column>
        <!--
          Uppercase label with wide letter-spacing — the hallmark of premium
          brand emails. tracking-[3px] creates the editorial label look.
        -->
        <mc-text class="text-[11px] font-bold text-zinc-600 tracking-[3px] text-center pb-3">
          EXCLUSIVE MEMBER ACCESS
        </mc-text>
        <!--
          Brand name: large, bold, extremely wide tracking (6px).
          This alone communicates luxury before a single word is read.
        -->
        <mc-text class="text-3xl font-bold text-white tracking-[6px] text-center">
          MERIDIAN
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- ── Hero section — display heading on dark background ──────────── -->
    <!--
      Without background-image support (coming in Phase 1), the hero relies
      on dark bg + display typography for impact. text-5xl = 48px with
      tight line-height creates the "editorial full-bleed" feel on screen.
    -->
    <mc-section class="bg-zinc-900 pt-14 pb-14 px-10">
      <mc-column>
        <!-- Gold accent label above the hero heading -->
        <mc-text class="text-[11px] font-bold text-[#c9a961] tracking-[3px] text-center pb-6">
          AUTUMN COLLECTION · 2026
        </mc-text>
        <!-- Display heading: 48px, bold, tight line-height -->
        <mc-text class="text-5xl font-bold text-white leading-tight text-center pb-6">
          The Art of<br/>Understated<br/>Excellence
        </mc-text>
        <!-- Subtext: small, muted, generous line-height (1.75rem) -->
        <mc-text class="text-sm text-zinc-400 leading-7 text-center pb-10">
          A curated selection of timeless pieces, crafted for those<br/>who appreciate precision in every detail.
        </mc-text>
        <!--
          Primary CTA: solid gold button. Gold-on-dark is the luxury signature
          — it conveys exclusivity without screaming "sale".
        -->
        <mc-button href="https://meridian.example.com/collection" class="bg-[#c9a961] text-black text-sm font-bold px-10 py-4">
          Explore the Collection
        </mc-button>
      </mc-column>
    </mc-section>

    <!-- ── White content section — personal note ──────────────────────── -->
    <!--
      Split-tone: white card immediately after dark hero creates visual
      breathing room and makes the copy feel premium, not cramped.
      py-12 = 48px vertical padding — the whitespace minimum for premium.
    -->
    <mc-section class="bg-white pt-12 pb-12 px-10">
      <mc-column>
        <mc-text class="text-[11px] font-bold text-zinc-400 tracking-[3px] pb-6">
          A PERSONAL NOTE
        </mc-text>
        <!-- Section heading: 24px semi-bold, tighter than hero -->
        <mc-text class="text-2xl font-semibold text-zinc-900 leading-snug pb-6">
          Welcome to Meridian,<br/>a world apart.
        </mc-text>
        <mc-text class="text-sm text-zinc-600 leading-7 pb-4">
          We built Meridian for a single purpose: to bring the same deliberate craft that
          goes into an heirloom timepiece to every corner of your wardrobe. Each item in
          this collection has been chosen for longevity, not trend cycles.
        </mc-text>
        <mc-text class="text-sm text-zinc-600 leading-7 pb-10">
          As a founding member, you have early access to pieces that won't be available
          to the public until November. We hope you find something that will outlast the season.
        </mc-text>
        <!-- Signature block -->
        <mc-text class="text-sm font-bold text-zinc-900 pb-1">
          Alexandra Voss
        </mc-text>
        <mc-text class="text-[12px] text-zinc-400 pb-10">
          Founder &amp; Creative Director, Meridian
        </mc-text>
        <!--
          Ghost / outline button: bg-transparent + border.
          On a white background the zinc-900 border reads as elegant restraint.
          This is the "secondary CTA" pattern from premium email design.
        -->
        <mc-button href="https://meridian.example.com/collection" class="bg-transparent border border-zinc-900 text-zinc-900 text-sm font-semibold px-8 py-3">
          Browse the Full Collection
        </mc-button>
      </mc-column>
    </mc-section>

    <!-- ── Two-column dark feature row ────────────────────────────────── -->
    <!--
      Back to dark after the white section — split-tone rhythm.
      Two-column layout lets each feature breathe without a crowded grid.
    -->
    <mc-section class="bg-zinc-950 pt-12 pb-12 px-6">
      <mc-column class="px-4">
        <!-- Numbered gold label — editorial technique from print design -->
        <mc-text class="text-[10px] font-bold text-[#c9a961] tracking-[2px] pb-4">
          01 · MATERIAL
        </mc-text>
        <mc-text class="text-lg font-semibold text-white leading-snug pb-3">
          Japanese selvedge<br/>denim, sourced direct
        </mc-text>
        <mc-text class="text-[13px] text-zinc-500 leading-6">
          Every roll of fabric is traceable to a single mill in Kojima, Japan —
          where denim has been woven the same way since 1960.
        </mc-text>
      </mc-column>
      <mc-column class="px-4">
        <mc-text class="text-[10px] font-bold text-[#c9a961] tracking-[2px] pb-4">
          02 · CRAFT
        </mc-text>
        <mc-text class="text-lg font-semibold text-white leading-snug pb-3">
          Hand-finished by<br/>artisans in Lisbon
        </mc-text>
        <mc-text class="text-[13px] text-zinc-500 leading-6">
          Each piece passes through twelve pairs of hands before it ships.
          The finishing takes longer than the construction — and it shows.
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- ── Thin divider ────────────────────────────────────────────────── -->
    <mc-section class="bg-zinc-950 px-10">
      <mc-column>
        <mc-divider class="border-zinc-800" />
      </mc-column>
    </mc-section>

    <!-- ── Stats row — 3 large numerals ───────────────────────────────── -->
    <!--
      Oversized numerals with small labels below — a design pattern borrowed
      from annual reports and luxury brand lookbooks. Creates visual interest
      without requiring imagery.
    -->
    <mc-section class="bg-zinc-950 pt-10 pb-10 px-6">
      <mc-column class="px-4">
        <mc-text class="text-3xl font-bold text-white text-center pb-2">14</mc-text>
        <mc-text class="text-[11px] text-zinc-600 text-center tracking-[2px]">PIECES</mc-text>
      </mc-column>
      <mc-column class="px-4">
        <mc-text class="text-3xl font-bold text-white text-center pb-2">3</mc-text>
        <mc-text class="text-[11px] text-zinc-600 text-center tracking-[2px]">COUNTRIES</mc-text>
      </mc-column>
      <mc-column class="px-4">
        <!-- Gold numeral for the emotionally resonant stat -->
        <mc-text class="text-3xl font-bold text-[#c9a961] text-center pb-2">∞</mc-text>
        <mc-text class="text-[11px] text-zinc-600 text-center tracking-[2px]">SEASONS</mc-text>
      </mc-column>
    </mc-section>

    <!-- ── Dark CTA section — urgency + scarcity ──────────────────────── -->
    <!--
      The second dark hero section at the bottom mirrors the first — this
      "bookend" structure is common in premium editorial emails.
      py-14 = 56px, the generous whitespace that signals premium.
    -->
    <mc-section class="bg-zinc-900 pt-14 pb-14 px-10">
      <mc-column>
        <mc-text class="text-[11px] font-bold text-[#c9a961] tracking-[3px] text-center pb-6">
          MEMBER EXCLUSIVE · ENDS 1 NOV
        </mc-text>
        <mc-text class="text-3xl font-bold text-white text-center leading-snug pb-4">
          Early access closes<br/>in 72 hours.
        </mc-text>
        <mc-text class="text-sm text-zinc-400 text-center leading-7 pb-10">
          After November 1st, the collection opens to the public. Member pricing —
          15% below retail — is available only through this window.
        </mc-text>
        <mc-button href="https://meridian.example.com/shop" class="bg-[#c9a961] text-black text-sm font-bold px-10 py-4">
          Shop Member Pricing →
        </mc-button>
      </mc-column>
    </mc-section>

    <!-- ── Dark 3-column footer ───────────────────────────────────────── -->
    <!--
      3-col footer on black — the standard pattern in premium brand emails.
      Column 1: brand/address, Column 2: help links, Column 3: social.
      text-[12px] + text-zinc-600 + leading-6 = the perfect footer rhythm.
    -->
    <mc-section class="bg-black pt-10 pb-8 px-8">
      <mc-column class="px-3">
        <mc-text class="text-[13px] font-bold text-white tracking-[2px] pb-4">
          MERIDIAN
        </mc-text>
        <mc-text class="text-[12px] text-zinc-600 leading-6">
          23 Rue du Faubourg<br/>Paris, 75008<br/>France
        </mc-text>
      </mc-column>
      <mc-column class="px-3">
        <mc-text class="text-[10px] font-bold text-zinc-600 tracking-[2px] pb-4">
          HELP
        </mc-text>
        <mc-text class="text-[12px] text-zinc-600 leading-6">
          Sizing Guide<br/>Returns &amp; Exchanges<br/>Care Instructions
        </mc-text>
      </mc-column>
      <mc-column class="px-3">
        <mc-text class="text-[10px] font-bold text-zinc-600 tracking-[2px] pb-4">
          FOLLOW
        </mc-text>
        <mc-text class="text-[12px] text-zinc-600 leading-6">
          Instagram<br/>Pinterest<br/>Newsletter Archive
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- ── Fine print ─────────────────────────────────────────────────── -->
    <mc-section class="bg-black pb-10 px-10">
      <mc-column>
        <mc-divider class="border-zinc-900 pb-6" />
        <mc-text class="text-[11px] text-zinc-700 text-center leading-5">
          © 2026 Meridian SAS · You're receiving this as a founding member.<br/>
          Unsubscribe · Preferences · View in browser
        </mc-text>
      </mc-column>
    </mc-section>

  </mc-body>
</mc>`,
  },
  {
    id: 'santos-membership-balance',
    label: '🏆 Santos — Membership Balance (Premium)',
    description: 'Clay-tone loyalty email — Prata serif font, floating card with shadow, bordered points display, 5-icon social row, split-tone sections',
    markup: `<mc>
  <mc-head>
    <mc-title>Your membership balance — Santos</mc-title>
    <mc-preview>Check your current points and discover new rewards.</mc-preview>

    <!--
      Santos Membership Balance — premium loyalty email.

      Techniques demonstrated:
        · Prata serif web font loaded via @import (Apple Mail / iOS Mail)
        · font-serif Tailwind class as fallback (Georgia for other clients)
        · Clay colour palette: #A49D93 / #ECEAE8 / #BFBAB2 / #F7F6F5 / #282422
        · Floating 400px card created with px-[100px] on section + bg on column
        · Box shadow on card column (shadow-2xl)
        · Bordered points display box (inline-block border rounded-lg)
        · 5 social icons inline inside mc-text (kept inline-text for the original layout)
        · Shopify icon divider — 3-col layout: divider / image / divider

      All styling uses Tailwind classes — no CSS attribute props.
    -->
    <mc-style>
      @import url('https://fonts.googleapis.com/css2?family=Prata&display=swap');
    </mc-style>
  </mc-head>

  <mc-body class="bg-[#F7F6F5]">

    <!-- ── Header ────────────────────────────────────────────────────────── -->
    <mc-section class="bg-[#A49D93] pt-8 pb-10 px-16">
      <mc-column>
        <!-- Logo (light version for dark header) -->
        <mc-image
          src="https://assets.mailviews.com/images/templates/santos/images/logo-light.png"
          alt="Santos"
          width="120"
          class="pb-8"
        />
        <mc-text class="text-[30px] font-serif text-white leading-9 pb-3">
          Your membership balance
        </mc-text>
        <mc-text class="text-[18px] text-white leading-7 pb-1">
          Here is a summary of your current points<br/>and available rewards.
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- ── Card area ─────────────────────────────────────────────────────── -->
    <!--
      px-[100px] on the section narrows the inner content to ~400px,
      giving the card column a "floating" appearance.
      box-shadow is applied via shadow-2xl on the column.
    -->
    <mc-section class="bg-[#ECEAE8] pt-10 pb-10 px-[100px]">
      <mc-column class="bg-[#BFBAB2] rounded-lg shadow-2xl pt-8 pb-8 px-8">

        <!-- Dark logo inside card -->
        <mc-image
          src="https://assets.mailviews.com/images/templates/santos/images/logo.png"
          alt="Santos"
          width="90"
          class="pb-6"
        />

        <mc-text class="text-[13px] text-[#5C5650] tracking-[2px] pb-3">
          MEMBERSHIP POINTS
        </mc-text>

        <!-- Bordered points display -->
        <mc-text class="text-[16px] font-serif font-bold text-[#282422] border border-[#282422] rounded-lg px-12 py-2.5 text-center">
          1,503
        </mc-text>

        <mc-text class="text-[13px] text-[#857A71] pt-4 text-center">
          Points valid through December 2026
        </mc-text>

      </mc-column>
    </mc-section>

    <!-- ── Body content ───────────────────────────────────────────────────── -->
    <mc-section class="bg-[#ECEAE8] pt-2 pb-8 px-10">
      <mc-column>
        <mc-text class="text-[16px] text-[#857A71] leading-6 pb-6">
          Your points can be redeemed on any full-price purchase.
          Simply present your membership card or enter your email at checkout.
          Points never expire as long as your account remains active.
        </mc-text>
        <mc-button
          href="https://santos.example.com/shop"
          class="bg-[#282422] text-white text-[14px] font-bold rounded-md px-8 py-3"
        >
          Shop now
        </mc-button>
      </mc-column>
    </mc-section>

    <!-- ── Shopify / brand divider (3-col: line / icon / line) ───────────── -->
    <mc-section class="bg-[#ECEAE8] pb-6 px-8">
      <mc-column class="pt-1">
        <mc-divider class="border-[#C8C3BC]" />
      </mc-column>
      <mc-column class="w-10 px-3">
        <mc-image
          src="https://assets.mailviews.com/images/templates/santos/images/shopify.png"
          alt="Powered by Shopify"
          width="32"
          class="mx-auto"
        />
      </mc-column>
      <mc-column class="pt-1">
        <mc-divider class="border-[#C8C3BC]" />
      </mc-column>
    </mc-section>

    <!-- ── Footer nav ─────────────────────────────────────────────────────── -->
    <mc-section class="bg-[#F7F6F5] pt-8 pb-4 px-6">
      <mc-column>
        <!-- Dark logo -->
        <mc-image
          src="https://assets.mailviews.com/images/templates/santos/images/logo.png"
          alt="Santos"
          width="80"
          class="pb-6 mx-auto"
        />
      </mc-column>
    </mc-section>

    <!-- Footer nav links (4 cols) -->
    <mc-section class="bg-[#F7F6F5] pb-4 px-6">
      <mc-column class="px-2">
        <mc-text class="text-[13px] text-[#857A71] text-center">
          <a href="https://santos.example.com/about" style="color:#857A71;text-decoration:none;">About us</a>
        </mc-text>
      </mc-column>
      <mc-column class="px-2">
        <mc-text class="text-[13px] text-[#857A71] text-center">
          <a href="https://santos.example.com/boutique" style="color:#857A71;text-decoration:none;">Boutique</a>
        </mc-text>
      </mc-column>
      <mc-column class="px-2">
        <mc-text class="text-[13px] text-[#857A71] text-center">
          <a href="https://santos.example.com/faq" style="color:#857A71;text-decoration:none;">FAQs</a>
        </mc-text>
      </mc-column>
      <mc-column class="px-2">
        <mc-text class="text-[13px] text-[#857A71] text-center">
          <a href="https://santos.example.com/contact" style="color:#857A71;text-decoration:none;">Contact us</a>
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- Social icons (4 mc-image columns — email-safe, no inline img warnings) -->
    <mc-section class="bg-[#F7F6F5] pb-4 px-24">
      <mc-column class="px-2 text-center">
        <mc-image href="https://facebook.com" src="https://assets.mailviews.com/images/templates/santos/images/facebook.png" alt="Facebook" width="20" class="mx-auto" />
      </mc-column>
      <mc-column class="px-2 text-center">
        <mc-image href="https://linkedin.com" src="https://assets.mailviews.com/images/templates/santos/images/linkedin.png" alt="LinkedIn" width="20" class="mx-auto" />
      </mc-column>
      <mc-column class="px-2 text-center">
        <mc-image href="https://youtube.com" src="https://assets.mailviews.com/images/templates/santos/images/youtube.png" alt="YouTube" width="20" class="mx-auto" />
      </mc-column>
      <mc-column class="px-2 text-center">
        <mc-image href="https://x.com" src="https://assets.mailviews.com/images/templates/santos/images/x.png" alt="X" width="20" class="mx-auto" />
      </mc-column>
    </mc-section>

    <!-- Address & unsubscribe -->
    <mc-section class="bg-[#F7F6F5] pb-10 px-6">
      <mc-column>
        <mc-text class="text-[11px] text-[#B0A89F] text-center leading-5">
          © 2026 Santos · 155 Bdv Saint Germain · 75505 Paris<br/>
          <a href="https://santos.example.com/unsubscribe" style="color:#B0A89F;text-decoration:underline;">Unsubscribe</a>
        </mc-text>
      </mc-column>
    </mc-section>

  </mc-body>
</mc>`,
  },
]

export const SOURCE_MAP_TEMPLATES: SourceMapTemplate[] = [
  ...BASE_TEMPLATES,
  ...RICH_TEMPLATES,
  ...DYNAMIC_TEMPLATES,
  ...FEATURE_TEMPLATES,
  ...PREMIUM_TEMPLATES,
]
