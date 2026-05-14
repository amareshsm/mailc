/**
 * Dynamic email templates demonstrating mailc templating features:
 * - {{variables}} and {{nested.access}}
 * - {{fallback || "default"}}
 * - <mc-if> / <mc-else-if> / <mc-else>
 * - <mc-each> loops with index
 * - Nested conditionals inside loops
 */

export interface DynamicTemplate {
  id: string
  name: string
  level: 'basic' | 'intermediate' | 'advanced'
  description: string
  markup: string
  defaultData: Record<string, unknown>
}

export const DYNAMIC_TEMPLATES: DynamicTemplate[] = [
  // ── 1. Basic — Simple variable interpolation ─────────────────────
  {
    id: 'welcome-simple',
    name: 'Welcome (Variables)',
    level: 'basic',
    description: 'Simple variable interpolation and fallback values',
    markup: `<mc>
  <mc-head>
    <mc-title>Welcome, {{user.name || "there"}}!</mc-title>
    <mc-preview>Thanks for joining {{company.name || "us"}}.</mc-preview>
  </mc-head>
  <mc-body background-color="#f4f6f9">

  <mc-section background-color="#2563eb" padding="32px 40px">
    <mc-column>
      <mc-text align="center" color="#ffffff" font-size="22px" font-weight="bold">
        {{company.name || "Acme Inc"}}
      </mc-text>
    </mc-column>
  </mc-section>

  <mc-section background-color="#ffffff" padding="40px">
    <mc-column>
      <mc-text color="#111827" font-size="24px" font-weight="bold" padding-bottom="16px">
        Welcome, {{user.name || "there"}}!
      </mc-text>
      <mc-text color="#374151" font-size="15px" line-height="26px" padding-bottom="24px">
        We're thrilled to have you join {{company.name || "our platform"}}. Your account
        ({{user.email}}) is all set up and ready to go.
      </mc-text>
      <mc-button
        href="{{user.dashboardUrl || 'https://example.com/dashboard'}}"
        background-color="#2563eb"
        color="#ffffff"
        border-radius="8px"
        padding="14px 32px"
        font-size="14px"
        font-weight="bold"
        align="center"
      >
        Go to Dashboard →
      </mc-button>
    </mc-column>
  </mc-section>

  <mc-section background-color="#111827" padding="24px 40px">
    <mc-column>
      <mc-text align="center" color="#6b7280" font-size="12px">
        © 2025 {{company.name || "Acme Inc"}} · {{company.address || "123 Main St"}}
      </mc-text>
    </mc-column>
  </mc-section>
  </mc-body>
</mc>`,
    defaultData: {
      user: {
        name: 'Sarah Chen',
        email: 'sarah@example.com',
        dashboardUrl: 'https://app.acme.com/dashboard',
      },
      company: {
        name: 'Acme Corp',
        address: '123 Market St, San Francisco, CA',
      },
    },
  },

  // ── 2. Basic — Conditional rendering ─────────────────────────────
  {
    id: 'status-conditional',
    name: 'Order Status (Conditionals)',
    level: 'basic',
    description: 'mc-if / mc-else-if / mc-else for status-based rendering',
    markup: `<mc>
  <mc-head>
    <mc-title>Order #{{order.id}} Update</mc-title>
    <mc-preview>Your order status has been updated.</mc-preview>
  </mc-head>
  <mc-body background-color="#f4f6f9">

  <mc-section background-color="#ffffff" padding="32px 40px">
    <mc-column>
      <mc-text color="#6b7280" font-size="12px" padding-bottom="8px" font-weight="bold" style="letter-spacing:0.1em;">
        ORDER UPDATE
      </mc-text>
      <mc-text color="#111827" font-size="22px" font-weight="bold" padding-bottom="4px">
        Order #{{order.id}}
      </mc-text>
      <mc-text color="#6b7280" font-size="13px">
        Placed on {{order.date}}
      </mc-text>
    </mc-column>
  </mc-section>

  <mc-section background-color="#ffffff" padding="0 40px 32px">
    <mc-column>
      <mc-divider border-color="#e5e7eb" padding-bottom="24px" />

      <mc-if condition="order.status == 'shipped'">
        <mc-text color="#059669" font-size="16px" font-weight="bold" padding-bottom="8px">
          🚚 Your order is on the way!
        </mc-text>
        <mc-text color="#374151" font-size="14px" line-height="24px" padding-bottom="16px">
          Tracking number: {{order.trackingNumber || "Not available yet"}}
        </mc-text>
        <mc-button
          href="{{order.trackingUrl || '#'}}"
          background-color="#059669"
          color="#ffffff"
          border-radius="8px"
          padding="12px 28px"
          font-size="13px"
          font-weight="bold"
        >
          Track Package →
        </mc-button>
      </mc-if>

      <mc-else-if condition="order.status == 'processing'">
        <mc-text color="#d97706" font-size="16px" font-weight="bold" padding-bottom="8px">
          ⏳ We're preparing your order
        </mc-text>
        <mc-text color="#374151" font-size="14px" line-height="24px">
          Your order is being packed and will ship soon. We'll send you a tracking number once it's on its way.
        </mc-text>
      </mc-else-if>

      <mc-else-if condition="order.status == 'delivered'">
        <mc-text color="#2563eb" font-size="16px" font-weight="bold" padding-bottom="8px">
          ✅ Delivered!
        </mc-text>
        <mc-text color="#374151" font-size="14px" line-height="24px" padding-bottom="16px">
          Your order was delivered on {{order.deliveredDate || "recently"}}. We hope you love it!
        </mc-text>
        <mc-button
          href="{{order.reviewUrl || '#'}}"
          background-color="#2563eb"
          color="#ffffff"
          border-radius="8px"
          padding="12px 28px"
          font-size="13px"
          font-weight="bold"
        >
          Leave a Review
        </mc-button>
      </mc-else-if>

      <mc-else>
        <mc-text color="#6b7280" font-size="16px" font-weight="bold" padding-bottom="8px">
          📋 Order received
        </mc-text>
        <mc-text color="#374151" font-size="14px" line-height="24px">
          We've received your order and will begin processing it shortly.
        </mc-text>
      </mc-else>
    </mc-column>
  </mc-section>

  <mc-section background-color="#111827" padding="24px 40px">
    <mc-column>
      <mc-text align="center" color="#6b7280" font-size="12px">
        Questions? Reply to this email or contact support.
      </mc-text>
    </mc-column>
  </mc-section>
  </mc-body>
</mc>`,
    defaultData: {
      order: {
        id: 'ORD-7842',
        date: 'April 15, 2025',
        status: 'shipped',
        trackingNumber: '1Z999AA10123456784',
        trackingUrl: 'https://tracking.example.com/1Z999AA10123456784',
        deliveredDate: null,
        reviewUrl: 'https://example.com/review/ORD-7842',
      },
    },
  },

  // ── 3. Intermediate — Loop with items ────────────────────────────
  {
    id: 'order-receipt',
    name: 'Receipt (Loops)',
    level: 'intermediate',
    description: 'mc-each to render order line items dynamically',
    markup: `<mc>
  <mc-head>
    <mc-title>Your receipt from {{company.name}}</mc-title>
    <mc-preview>Receipt for order #{{order.id}} — {{order.total}}</mc-preview>
  </mc-head>
  <mc-body background-color="#f4f6f9">

  <mc-section background-color="#111827" padding="24px 40px">
    <mc-column width="50%">
      <mc-text color="#ffffff" font-size="16px" font-weight="bold">
        {{company.name}}
      </mc-text>
    </mc-column>
    <mc-column width="50%">
      <mc-text align="right" color="#9ca3af" font-size="12px">
        Receipt #{{order.id}}
      </mc-text>
    </mc-column>
  </mc-section>

  <mc-section background-color="#ffffff" padding="32px 40px 16px">
    <mc-column>
      <mc-text color="#111827" font-size="20px" font-weight="bold" padding-bottom="4px">
        Thanks for your purchase!
      </mc-text>
      <mc-text color="#6b7280" font-size="13px" padding-bottom="24px">
        Hi {{customer.name}}, here's your receipt for {{order.date}}.
      </mc-text>

      <mc-text color="#6b7280" font-size="11px" font-weight="bold" padding-bottom="8px" style="letter-spacing:0.08em;">
        ITEMS
      </mc-text>
      <mc-divider border-color="#e5e7eb" padding-bottom="0" />
    </mc-column>
  </mc-section>

  <mc-each items="order.items" as="item">
    <mc-section background-color="#ffffff" padding="12px 40px">
      <mc-column width="60%">
        <mc-text color="#111827" font-size="14px" font-weight="600">
          {{item.name}}
        </mc-text>
        <mc-text color="#6b7280" font-size="12px">
          Qty: {{item.qty}}
        </mc-text>
      </mc-column>
      <mc-column width="40%">
        <mc-text align="right" color="#111827" font-size="14px" font-weight="600">
          {{item.price}}
        </mc-text>
      </mc-column>
    </mc-section>
  </mc-each>

  <mc-section background-color="#ffffff" padding="0 40px 8px">
    <mc-column>
      <mc-divider border-color="#e5e7eb" />
    </mc-column>
  </mc-section>

  <mc-section background-color="#ffffff" padding="8px 40px 32px">
    <mc-column width="60%">
      <mc-text color="#111827" font-size="16px" font-weight="bold">Total</mc-text>
    </mc-column>
    <mc-column width="40%">
      <mc-text align="right" color="#111827" font-size="16px" font-weight="bold">
        {{order.total}}
      </mc-text>
    </mc-column>
  </mc-section>

  <mc-section background-color="#111827" padding="24px 40px">
    <mc-column>
      <mc-text align="center" color="#6b7280" font-size="12px">
        © 2025 {{company.name}} · {{company.address}}
      </mc-text>
    </mc-column>
  </mc-section>
  </mc-body>
</mc>`,
    defaultData: {
      company: {
        name: 'Acme Store',
        address: '456 Commerce Blvd, Austin, TX',
      },
      customer: {
        name: 'Alex Rivera',
      },
      order: {
        id: 'INV-2025-0421',
        date: 'April 18, 2025',
        total: '$247.00',
        items: [
          { name: 'Wireless Earbuds Pro', qty: 1, price: '$129.00' },
          { name: 'Silicone Case (Black)', qty: 2, price: '$38.00' },
          { name: 'USB-C Charging Cable', qty: 1, price: '$19.00' },
          { name: 'Premium Warranty (1yr)', qty: 1, price: '$61.00' },
        ],
      },
    },
  },

  // ── 4. Intermediate — Loop + Conditionals combined ──────────────
  {
    id: 'notification-digest',
    name: 'Notification Digest (Loop + If)',
    level: 'intermediate',
    description: 'Loop over notifications with conditional styling by type',
    markup: `<mc>
  <mc-head>
    <mc-title>Your activity digest</mc-title>
    <mc-preview>You have {{notifications.length}} new notifications</mc-preview>
  </mc-head>
  <mc-body background-color="#f4f6f9">

  <mc-section background-color="#2563eb" padding="32px 40px">
    <mc-column>
      <mc-text align="center" color="#ffffff" font-size="20px" font-weight="bold" padding-bottom="4px">
        Activity Digest
      </mc-text>
      <mc-text align="center" color="#93c5fd" font-size="13px">
        {{notifications.length}} new notifications for {{user.name || "you"}}
      </mc-text>
    </mc-column>
  </mc-section>

  <mc-each items="notifications" as="notif">
    <mc-section background-color="#ffffff" padding="16px 40px">
      <mc-column>
        <mc-if condition="notif.type == 'mention'">
          <mc-text color="#2563eb" font-size="11px" font-weight="bold" padding-bottom="4px" style="letter-spacing:0.08em;">
            💬 MENTION
          </mc-text>
        </mc-if>
        <mc-else-if condition="notif.type == 'like'">
          <mc-text color="#e11d48" font-size="11px" font-weight="bold" padding-bottom="4px" style="letter-spacing:0.08em;">
            ❤️ LIKE
          </mc-text>
        </mc-else-if>
        <mc-else-if condition="notif.type == 'follow'">
          <mc-text color="#059669" font-size="11px" font-weight="bold" padding-bottom="4px" style="letter-spacing:0.08em;">
            👤 NEW FOLLOWER
          </mc-text>
        </mc-else-if>
        <mc-else>
          <mc-text color="#6b7280" font-size="11px" font-weight="bold" padding-bottom="4px" style="letter-spacing:0.08em;">
            🔔 NOTIFICATION
          </mc-text>
        </mc-else>

        <mc-text color="#111827" font-size="14px" font-weight="600" padding-bottom="4px">
          {{notif.title}}
        </mc-text>
        <mc-text color="#6b7280" font-size="12px">
          {{notif.message}} · {{notif.time}}
        </mc-text>
        <mc-divider border-color="#f3f4f6" padding-top="16px" />
      </mc-column>
    </mc-section>
  </mc-each>

  <mc-section background-color="#ffffff" padding="24px 40px">
    <mc-column>
      <mc-button
        href="{{dashboardUrl || 'https://example.com'}}"
        background-color="#2563eb"
        color="#ffffff"
        border-radius="8px"
        padding="12px 28px"
        font-size="13px"
        font-weight="bold"
        align="center"
      >
        View All Activity
      </mc-button>
    </mc-column>
  </mc-section>

  <mc-section background-color="#111827" padding="24px 40px">
    <mc-column>
      <mc-text align="center" color="#6b7280" font-size="12px">
        Manage notification preferences in your settings.
      </mc-text>
    </mc-column>
  </mc-section>
  </mc-body>
</mc>`,
    defaultData: {
      user: { name: 'Jamie' },
      dashboardUrl: 'https://app.example.com/activity',
      notifications: [
        { type: 'mention', title: '@dave mentioned you', message: '"Check out this design @jamie"', time: '2 hours ago' },
        { type: 'like', title: 'Sarah liked your post', message: '"Building email templates with mailc"', time: '4 hours ago' },
        { type: 'follow', title: 'New follower: Alex Rivera', message: 'Alex started following you', time: '6 hours ago' },
        { type: 'mention', title: '@team tagged you', message: '"Review needed on the Q2 report"', time: '1 day ago' },
      ],
    },
  },

  // ── 5. Advanced — Nested loops + conditionals ────────────────────
  {
    id: 'project-report',
    name: 'Project Report (Advanced)',
    level: 'advanced',
    description: 'Nested conditionals, loops with index, complex data',
    markup: `<mc>
  <mc-head>
    <mc-title>Weekly Report: {{report.title}}</mc-title>
    <mc-preview>{{report.summary}}</mc-preview>
  </mc-head>
  <mc-body background-color="#f4f6f9">

  <mc-section background-color="#111827" padding="32px 40px">
    <mc-column>
      <mc-text color="#9ca3af" font-size="11px" font-weight="bold" style="letter-spacing:0.1em;">
        WEEKLY REPORT
      </mc-text>
      <mc-text color="#ffffff" font-size="22px" font-weight="bold" padding-top="8px">
        {{report.title}}
      </mc-text>
      <mc-text color="#9ca3af" font-size="13px" padding-top="4px">
        {{report.period}} · by {{report.author}}
      </mc-text>
    </mc-column>
  </mc-section>

  <mc-section background-color="#ffffff" padding="32px 40px 16px">
    <mc-column>
      <mc-text color="#111827" font-size="15px" line-height="26px" padding-bottom="16px">
        {{report.summary}}
      </mc-text>
    </mc-column>
  </mc-section>

  <mc-if condition="report.highlights.length > 0">
    <mc-section background-color="#ffffff" padding="0 40px 24px">
      <mc-column>
        <mc-text color="#2563eb" font-size="11px" font-weight="bold" padding-bottom="12px" style="letter-spacing:0.08em;">
          KEY HIGHLIGHTS
        </mc-text>
      </mc-column>
    </mc-section>
    <mc-each items="report.highlights" as="highlight" index="i">
      <mc-section background-color="#ffffff" padding="0 40px 12px">
        <mc-column>
          <mc-text color="#374151" font-size="14px" line-height="22px">
            <span style="color:#2563eb;font-weight:bold;">{{i + 1}}.</span> {{highlight}}
          </mc-text>
        </mc-column>
      </mc-section>
    </mc-each>
  </mc-if>

  <mc-section background-color="#ffffff" padding="16px 40px">
    <mc-column>
      <mc-divider border-color="#e5e7eb" />
    </mc-column>
  </mc-section>

  <mc-section background-color="#ffffff" padding="16px 40px 8px">
    <mc-column>
      <mc-text color="#059669" font-size="11px" font-weight="bold" padding-bottom="12px" style="letter-spacing:0.08em;">
        TASKS COMPLETED
      </mc-text>
    </mc-column>
  </mc-section>

  <mc-each items="report.tasks" as="task">
    <mc-section background-color="#ffffff" padding="4px 40px">
      <mc-column width="70%">
        <mc-text color="#111827" font-size="13px">
          <mc-if condition="task.done">
            <mc-text color="#059669" font-size="13px">✓ {{task.title}}</mc-text>
          </mc-if>
          <mc-else>
            <mc-text color="#d97706" font-size="13px">○ {{task.title}}</mc-text>
          </mc-else>
        </mc-text>
      </mc-column>
      <mc-column width="30%">
        <mc-text align="right" color="#6b7280" font-size="12px">
          {{task.assignee}}
        </mc-text>
      </mc-column>
    </mc-section>
  </mc-each>

  <mc-if condition="report.nextSteps">
    <mc-section background-color="#f9fafb" padding="24px 40px" border-radius="0">
      <mc-column>
        <mc-text color="#6b7280" font-size="11px" font-weight="bold" padding-bottom="8px" style="letter-spacing:0.08em;">
          NEXT STEPS
        </mc-text>
        <mc-text color="#374151" font-size="14px" line-height="24px">
          {{report.nextSteps}}
        </mc-text>
      </mc-column>
    </mc-section>
  </mc-if>

  <mc-section background-color="#111827" padding="24px 40px">
    <mc-column>
      <mc-text align="center" color="#6b7280" font-size="12px">
        Auto-generated report · {{report.period}}
      </mc-text>
    </mc-column>
  </mc-section>
  </mc-body>
</mc>`,
    defaultData: {
      report: {
        title: 'Sprint 24 — Email Compiler',
        period: 'Apr 14 – Apr 18, 2025',
        author: 'Amaresh',
        summary: 'Completed dynamic templating system with conditionals, loops, and variable interpolation. All 1,743 tests passing. Browser + Node builds shipping.',
        highlights: [
          'Shipped mc-if / mc-else-if / mc-else conditional rendering',
          'Implemented mc-each loops with index support',
          'Added variable interpolation with fallback values',
          'Zero runtime JS — all compile-time resolution',
        ],
        tasks: [
          { title: 'Template expression parser', done: true, assignee: 'Amaresh' },
          { title: 'Conditional evaluation engine', done: true, assignee: 'Amaresh' },
          { title: 'Loop expansion with scope', done: true, assignee: 'Amaresh' },
          { title: 'Nested loop support', done: true, assignee: 'Amaresh' },
          { title: 'Dark mode post-processor', done: false, assignee: 'TBD' },
        ],
        nextSteps: 'Begin Phase 16 (Accessibility) — add aria-labels, role attributes, alt text validation, and screen reader optimization.',
      },
    },
  },

  // ── 6. Advanced — E-commerce cart with all features ──────────────
  {
    id: 'cart-abandonment',
    name: 'Cart Abandonment (Full)',
    level: 'advanced',
    description: 'Variables, loops, conditionals, fallbacks — all combined',
    markup: `<mc>
  <mc-head>
    <mc-title>You left items in your cart, {{user.firstName || "friend"}}!</mc-title>
    <mc-preview>Don't forget — {{cart.items.length}} items waiting for you.</mc-preview>
  </mc-head>
  <mc-body background-color="#f4f6f9">

  <mc-section background-color="#ffffff" padding="24px 40px">
    <mc-column width="50%">
      <mc-text color="#111827" font-size="16px" font-weight="bold">
        {{store.name}}
      </mc-text>
    </mc-column>
    <mc-column width="50%">
      <mc-text align="right" color="#6b7280" font-size="12px">
        {{store.tagline || "Shop smarter"}}
      </mc-text>
    </mc-column>
  </mc-section>

  <mc-section background-color="#ffffff" padding="0 40px 32px">
    <mc-column>
      <mc-text color="#111827" font-size="22px" font-weight="bold" padding-bottom="8px">
        Still thinking it over?
      </mc-text>
      <mc-text color="#374151" font-size="14px" line-height="24px" padding-bottom="24px">
        Hi {{user.firstName || "there"}}, you left {{cart.items.length}} item{{cart.items.length > 1 || "s"}} in your cart.
        Complete your purchase before they're gone!
      </mc-text>
    </mc-column>
  </mc-section>

  <mc-each items="cart.items" as="item">
    <mc-section background-color="#ffffff" padding="8px 40px">
      <mc-column width="20%">
        <mc-image
          src="{{item.image}}"
          alt="{{item.name}}"
          width="80"
          border-radius="8px"
        />
      </mc-column>
      <mc-column width="50%" padding-left="16px">
        <mc-text color="#111827" font-size="14px" font-weight="600" padding-bottom="4px">
          {{item.name}}
        </mc-text>
        <mc-text color="#6b7280" font-size="12px">
          {{item.variant || "Standard"}} · Qty: {{item.qty}}
        </mc-text>
        <mc-if condition="item.onSale">
          <mc-text color="#e11d48" font-size="11px" font-weight="bold" padding-top="4px">
            🔥 ON SALE
          </mc-text>
        </mc-if>
      </mc-column>
      <mc-column width="30%">
        <mc-text align="right" color="#111827" font-size="14px" font-weight="bold">
          {{item.price}}
        </mc-text>
        <mc-if condition="item.originalPrice">
          <mc-text align="right" color="#9ca3af" font-size="12px" style="text-decoration:line-through;">
            {{item.originalPrice}}
          </mc-text>
        </mc-if>
      </mc-column>
    </mc-section>
    <mc-section background-color="#ffffff" padding="0 40px">
      <mc-column>
        <mc-divider border-color="#f3f4f6" />
      </mc-column>
    </mc-section>
  </mc-each>

  <mc-section background-color="#ffffff" padding="16px 40px 8px">
    <mc-column width="60%">
      <mc-text color="#111827" font-size="15px" font-weight="bold">Subtotal</mc-text>
    </mc-column>
    <mc-column width="40%">
      <mc-text align="right" color="#111827" font-size="15px" font-weight="bold">
        {{cart.subtotal}}
      </mc-text>
    </mc-column>
  </mc-section>

  <mc-if condition="cart.discount">
    <mc-section background-color="#ffffff" padding="4px 40px">
      <mc-column width="60%">
        <mc-text color="#059669" font-size="13px">
          Discount ({{cart.discount.code}})
        </mc-text>
      </mc-column>
      <mc-column width="40%">
        <mc-text align="right" color="#059669" font-size="13px">
          -{{cart.discount.amount}}
        </mc-text>
      </mc-column>
    </mc-section>
  </mc-if>

  <mc-section background-color="#ffffff" padding="24px 40px 32px">
    <mc-column>
      <mc-button
        href="{{cart.checkoutUrl || 'https://example.com/cart'}}"
        background-color="#2563eb"
        color="#ffffff"
        border-radius="8px"
        padding="14px 40px"
        font-size="14px"
        font-weight="bold"
        align="center"
      >
        Complete Purchase →
      </mc-button>
    </mc-column>
  </mc-section>

  <mc-if condition="cart.expiresIn">
    <mc-section background-color="#fef3c7" padding="12px 40px">
      <mc-column>
        <mc-text align="center" color="#92400e" font-size="13px" font-weight="600">
          ⏰ Your cart expires in {{cart.expiresIn}}
        </mc-text>
      </mc-column>
    </mc-section>
  </mc-if>

  <mc-section background-color="#111827" padding="24px 40px">
    <mc-column>
      <mc-text align="center" color="#6b7280" font-size="12px">
        © 2025 {{store.name}} · <a href="#" style="color:#6b7280;">Unsubscribe</a>
      </mc-text>
    </mc-column>
  </mc-section>
  </mc-body>
</mc>`,
    defaultData: {
      user: { firstName: 'Maria' },
      store: {
        name: 'NovaTech Store',
        tagline: 'Tech for everyone',
      },
      cart: {
        checkoutUrl: 'https://novatech.com/cart/resume',
        subtotal: '$397.00',
        expiresIn: '48 hours',
        discount: {
          code: 'SPRING25',
          amount: '$50.00',
        },
        items: [
          {
            name: 'Wireless Noise-Cancelling Headphones',
            variant: 'Matte Black',
            qty: 1,
            price: '$249.00',
            originalPrice: '$299.00',
            onSale: true,
            image: 'https://placehold.co/80x80/111827/ffffff?text=🎧',
          },
          {
            name: 'USB-C Hub (7-in-1)',
            variant: 'Space Gray',
            qty: 1,
            price: '$89.00',
            originalPrice: null,
            onSale: false,
            image: 'https://placehold.co/80x80/111827/ffffff?text=🔌',
          },
          {
            name: 'Premium Braided Cable',
            variant: '2m Length',
            qty: 2,
            price: '$59.00',
            originalPrice: null,
            onSale: false,
            image: 'https://placehold.co/80x80/111827/ffffff?text=🔗',
          },
        ],
      },
    },
  },

  // ── 8. Intermediate — mc-table with mc-each loop ─────────────────
  {
    id: 'order-summary-table',
    name: 'Order Summary (mc-table)',
    level: 'intermediate',
    description: 'Data table with mc-each loop inside tbody, totals row, conditional discount row, and all table attributes.',
    markup: `<mc>
  <mc-head>
    <mc-title>Order #{{order.number}} Summary</mc-title>
    <mc-preview>{{order.items.length}} item(s) · Total: {{order.total}}</mc-preview>
    <mc-attributes>
      <mc-all font-family="Arial, sans-serif" />
    </mc-attributes>
  </mc-head>
  <mc-body background-color="#f8fafc">

  <!-- Header -->
  <mc-section background-color="#1e293b" padding="28px 32px">
    <mc-column>
      <mc-text align="center" font-size="20px" font-weight="bold" color="#ffffff">
        🧾 Order Summary
      </mc-text>
      <mc-text align="center" font-size="13px" color="#94a3b8" padding-top="4px">
        Order #{{order.number}} · {{order.date}}
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- Greeting -->
  <mc-section background-color="#ffffff" padding="28px 32px 16px">
    <mc-column>
      <mc-text font-size="17px" font-weight="bold" color="#111827" padding-bottom="8px">
        Hi {{customer.name || "there"}} 👋
      </mc-text>
      <mc-text font-size="14px" color="#475569" line-height="22px">
        Here's your order summary for <strong>{{order.number}}</strong>.
        Payment via <strong>{{order.paymentMethod || "card"}}</strong>.
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- Line-items table: thead + mc-each in tbody -->
  <mc-section background-color="#ffffff" padding="0 32px 4px">
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
          <tr class="bg-slate-100">
            <th scope="col" class="text-left text-xs text-slate-500 font-bold py-2.5 px-2 border-b border-slate-200">Item</th>
            <th scope="col" class="text-center text-xs text-slate-500 font-bold py-2.5 px-2 border-b border-slate-200" width="15%">Qty</th>
            <th scope="col" class="text-right text-xs text-slate-500 font-bold py-2.5 px-2 border-b border-slate-200" width="20%">Price</th>
            <th scope="col" class="text-right text-xs text-slate-500 font-bold py-2.5 px-2 border-b border-slate-200" width="22%">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          <mc-each items="order.items" as="item">
            <tr class="border-b border-slate-100">
              <td class="text-slate-800 py-2.5 px-2">
                {{item.name}}<mc-if condition="item.variant"> · <span style="color:#94a3b8;font-size:11px;">{{item.variant}}</span></mc-if>
              </td>
              <td class="text-slate-600 text-center py-2.5 px-2">{{item.qty}}</td>
              <td class="text-slate-600 text-right py-2.5 px-2">{{item.price}}</td>
              <td class="text-slate-900 text-right font-bold py-2.5 px-2">{{item.subtotal}}</td>
            </tr>
          </mc-each>
        </tbody>
      </mc-table>
    </mc-column>
  </mc-section>

  <!-- Totals table (no headers — summary only) -->
  <mc-section background-color="#f8fafc" padding="0 32px 24px">
    <mc-column>
      <mc-table class="w-full text-sm" style="border-top:1px solid #e2e8f0;">
        <tr>
          <td class="text-slate-500 py-2">Subtotal</td>
          <td class="text-slate-800 text-right py-2">{{order.subtotal}}</td>
        </tr>
        <mc-if condition="order.discount">
          <tr>
            <td class="text-slate-500 py-2">Discount ({{order.discount.code}})</td>
            <td class="text-green-600 text-right py-2 font-bold">−{{order.discount.amount}}</td>
          </tr>
        </mc-if>
        <tr>
          <td class="text-slate-500 py-2">Shipping</td>
          <td class="text-slate-800 text-right py-2">{{order.shipping}}</td>
        </tr>
        <tr>
          <td class="text-slate-500 py-2">Tax</td>
          <td class="text-slate-800 text-right py-2">{{order.tax}}</td>
        </tr>
        <tr class="bg-slate-100 border-t-2 border-slate-300">
          <td class="text-slate-900 font-bold py-3 text-base">Total</td>
          <td class="text-blue-700 text-right font-bold py-3 text-base">{{order.total}}</td>
        </tr>
      </mc-table>
    </mc-column>
  </mc-section>

  <!-- Shipping address -->
  <mc-section background-color="#ffffff" padding="20px 32px">
    <mc-column>
      <mc-text font-size="12px" font-weight="bold" color="#374151" padding-bottom="6px">
        📦 Shipping to
      </mc-text>
      <mc-text font-size="13px" color="#475569" line-height="20px">
        {{shipping.name}}<br />
        {{shipping.line1}}<br />
        {{shipping.city}}, {{shipping.state}} {{shipping.zip}}
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- CTA -->
  <mc-section background-color="#ffffff" padding="8px 32px 28px">
    <mc-column>
      <mc-button
        href="{{order.trackingUrl || 'https://example.com/track'}}"
        background-color="#1e293b"
        color="#ffffff"
        border-radius="6px"
        padding="12px 24px"
        font-size="14px"
        font-weight="bold"
      >
        Track My Order
      </mc-button>
    </mc-column>
  </mc-section>

  <!-- Footer -->
  <mc-section padding="20px 32px">
    <mc-column>
      <mc-text align="center" font-size="12px" color="#94a3b8">
        This receipt was sent to {{customer.email || "you"}}. Questions?
        <a href="mailto:help@example.com" style="color:#94a3b8;">Contact us</a>.
      </mc-text>
    </mc-column>
  </mc-section>

  </mc-body>
</mc>`,
    defaultData: {
      customer: {
        name: 'Alex Chen',
        email: 'alex@example.com',
      },
      order: {
        number: 'ORD-20240421',
        date: '21 Apr 2026',
        paymentMethod: 'Visa ending 4242',
        trackingUrl: 'https://example.com/track/ORD-20240421',
        subtotal: '$427.00',
        shipping: '$9.99',
        tax: '$34.96',
        total: '$431.95',
        discount: {
          code: 'SPRING20',
          amount: '$40.00',
        },
        items: [
          {
            name: 'Pro License — Annual',
            variant: 'Team plan',
            qty: 1,
            price: '$299.00',
            subtotal: '$299.00',
          },
          {
            name: 'Onboarding Pack',
            variant: null,
            qty: 2,
            price: '$49.00',
            subtotal: '$98.00',
          },
          {
            name: 'Support Add-on',
            variant: 'Priority',
            qty: 1,
            price: '$79.00',
            subtotal: '$79.00',
          },
        ],
      },
      shipping: {
        name: 'Alex Chen',
        line1: '742 Evergreen Terrace',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
      },
    },
  },

  // ── Hero Campaign ─────────────────────────────────────────────────
  {
    id: 'hero-campaign',
    name: 'Hero Campaign',
    level: 'basic',
    description: 'Dynamic hero banner using mc-hero with variable background image, headline, badge, and CTA',
    markup: `<mc>
  <mc-head>
    <mc-title>{{campaign.title || "Campaign"}}</mc-title>
    <mc-preview>{{campaign.subtitle || "Check out our latest campaign."}}</mc-preview>
  </mc-head>
  <mc-body background-color="#f1f5f9">

  <mc-hero
    background-image="{{campaign.backgroundImage}}"
    background-color="{{campaign.backgroundColor || '#1e293b'}}"
    background-size="cover"
    background-position="center"
    height="{{campaign.height || '320px'}}"
    padding="64px 40px"
    align="center"
    aria-label="{{campaign.title || 'Campaign'}} hero banner"
  >
    <mc-if condition="campaign.badge">
      <mc-text align="center" color="#fbbf24" font-size="12px" font-weight="bold" padding-bottom="12px" style="text-transform:uppercase;letter-spacing:0.1em;">
        ★ {{campaign.badge}}
      </mc-text>
    </mc-if>

    <mc-text align="center" color="#ffffff" font-size="36px" font-weight="bold" line-height="46px" padding-bottom="12px">
      {{campaign.title || "Big Campaign Headline"}}
    </mc-text>

    <mc-text align="center" color="{{campaign.subtitleColor || '#cbd5e1'}}" font-size="16px" line-height="26px" padding-bottom="28px">
      {{campaign.subtitle || "A short subtitle that supports the headline."}}
    </mc-text>

    <mc-button
      href="{{campaign.ctaUrl || 'https://example.com'}}"
      background-color="{{campaign.ctaColor || '#3b82f6'}}"
      color="#ffffff"
      border-radius="8px"
      padding="14px 36px"
      font-size="15px"
      font-weight="bold"
      align="center"
    >
      {{campaign.ctaText || "Learn More"}}
    </mc-button>
  </mc-hero>

  <mc-section background-color="#ffffff" padding="40px">
    <mc-column>
      <mc-text color="#374151" font-size="15px" line-height="26px">
        {{campaign.bodyText || "Add supporting body content here after the hero."}}
      </mc-text>
    </mc-column>
  </mc-section>

  <mc-section background-color="#1e293b" padding="24px 40px">
    <mc-column>
      <mc-text align="center" color="#64748b" font-size="12px">
        © 2026 {{campaign.brand || "Acme Inc"}} · You received this because you're subscribed.
      </mc-text>
    </mc-column>
  </mc-section>

  </mc-body>
</mc>`,
    defaultData: {
      campaign: {
        title: 'Introducing Pro 2.0',
        subtitle: "The fastest, most powerful version we've ever shipped.",
        badge: 'New Release',
        backgroundImage: 'https://placehold.co/600x320/1e293b/94a3b8?text=Pro+2.0+Launch',
        backgroundColor: '#1e293b',
        subtitleColor: '#94a3b8',
        height: '320px',
        ctaText: 'Get Early Access →',
        ctaUrl: 'https://example.com/pro',
        ctaColor: '#e85d3a',
        bodyText: 'Pro 2.0 brings a completely rewritten engine, 3× faster compilation, and new components. Available now for all paid plans.',
        brand: 'mailc',
      },
    },
  },
]
