<mc>
  <mc-head>
    <mc-title>The Weekly Field Report — Issue #42</mc-title>
    <mc-preview>This week: rate limiting at scale, a Postgres footgun, and the calmest debugger you'll ever see.</mc-preview>

    <!-- ═══ MC-ATTRIBUTES — document-wide defaults ════════════════════════════
         These flow through to every element of the matching type unless
         the element overrides them locally. Tests defaults serialization
         end-to-end (markup → JSON → markup → compile).
    ════════════════════════════════════════════════════════════════════════ -->
    <mc-attributes>
      <!-- Applied to ALL components -->
      <mc-all font-family="Georgia, 'Times New Roman', serif" />

      <!-- Applied to all mc-text elements -->
      <mc-text
        font-size="15px"
        line-height="24px"
        color="#1f2937" />

      <!-- Applied to all mc-button elements -->
      <mc-button
        background-color="#1f2937"
        color="#ffffff"
        border-radius="0"
        font-size="14px"
        font-weight="bold"
        padding="14px 28px" />

      <!-- Applied to all mc-section elements -->
      <mc-section
        background-color="#fffbeb"
        padding="32px 40px" />

      <!-- Named class bundle: any element can opt in via mc-class="muted" -->
      <mc-class name="muted"
        color="#6b7280"
        font-size="13px"
        line-height="20px" />

      <!-- Named class bundle: extends `muted` with smaller type for footnotes -->
      <mc-class name="footnote"
        extends="muted"
        font-size="11px"
        line-height="16px" />
    </mc-attributes>
  </mc-head>

  <mc-body background-color="#fef3c7">

    <!-- Masthead — inherits mc-section bg + padding from defaults -->
    <mc-section>
      <mc-column>
        <mc-text
          font-size="11px"
          font-weight="bold"
          color="#92400e"
          letter-spacing="3px">
          THE WEEKLY FIELD REPORT
        </mc-text>
        <mc-text
          font-size="32px"
          font-weight="900"
          color="#451a03"
          line-height="38px"
          padding-top="6px">
          Issue #42 — April 27, 2026
        </mc-text>
        <mc-text mc-class="muted" padding-top="6px">
          Three things worth reading and one thing worth trying.
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- Item 1 — text inherits font-family + line-height from defaults -->
    <mc-section background-color="#ffffff" padding="36px 40px">
      <mc-column>
        <mc-text
          font-size="11px"
          font-weight="bold"
          color="#dc2626"
          letter-spacing="2px">
          01 · DEEP DIVE
        </mc-text>
        <mc-text
          font-size="22px"
          font-weight="bold"
          color="#0c0a09"
          line-height="28px"
          padding-top="8px"
          padding-bottom="10px">
          How Cloudflare actually rate-limits 50M requests per second
        </mc-text>
        <mc-text padding-bottom="14px">
          The naive approach is a counter per IP. That falls over at about ten
          thousand requests per second per host. The version that scales uses
          a probabilistic data structure called a Count-Min Sketch — and the
          tradeoffs are not what you'd expect.
        </mc-text>
        <mc-button href="https://example.com/article/rate-limiting">
          Read the breakdown →
        </mc-button>
      </mc-column>
    </mc-section>

    <!-- Item 2 — pure inherited defaults, no overrides on mc-text -->
    <mc-section background-color="#ffffff" padding="0 40px 36px">
      <mc-column>
        <mc-text
          font-size="11px"
          font-weight="bold"
          color="#dc2626"
          letter-spacing="2px">
          02 · POSTGRES FOOTGUN
        </mc-text>
        <mc-text
          font-size="22px"
          font-weight="bold"
          color="#0c0a09"
          line-height="28px"
          padding-top="8px"
          padding-bottom="10px">
          Your CTE is not the cache you think it is
        </mc-text>
        <mc-text padding-bottom="14px">
          A WITH clause in Postgres looks like memoisation. It is not. Postgres
          re-executes the CTE every time it is referenced unless you mark it
          MATERIALIZED — and even then there are caveats around the query planner.
        </mc-text>
        <mc-button href="https://example.com/article/cte-materialization">
          The four-paragraph version →
        </mc-button>
      </mc-column>
    </mc-section>

    <!-- Tool of the week — mc-class="muted" referenced for byline -->
    <mc-section background-color="#fef3c7" padding="36px 40px">
      <mc-column>
        <mc-text
          font-size="11px"
          font-weight="bold"
          color="#92400e"
          letter-spacing="2px">
          03 · ONE THING WORTH TRYING
        </mc-text>
        <mc-text
          font-size="22px"
          font-weight="bold"
          color="#451a03"
          line-height="28px"
          padding-top="8px">
          delve — the calmest Go debugger you'll ever use
        </mc-text>
        <mc-text mc-class="muted" padding-top="6px" padding-bottom="14px">
          By Sundar V. · 3 min read
        </mc-text>
        <mc-text padding-bottom="14px">
          Three commands. No GUI. Steps through goroutines without lying about
          where you are. The kind of tool that disappears into the work and
          lets you think. We've started using it in CI for postmortem analysis.
        </mc-text>
        <mc-button href="https://example.com/tools/delve" background-color="#451a03">
          Try delve →
        </mc-button>
      </mc-column>
    </mc-section>

    <!-- Footer — uses mc-class="footnote" (extends muted) -->
    <mc-section background-color="#0c0a09" padding="32px 40px">
      <mc-column>
        <mc-text
          font-size="12px"
          color="#fef3c7"
          font-weight="bold"
          letter-spacing="2px">
          THE WEEKLY FIELD REPORT
        </mc-text>
        <mc-text mc-class="footnote" color="#a8a29e" padding-top="6px">
          Sent every Sunday to 28,000 engineers who write production code.
          Forwarded to you? <a href="#" style="color:#fbbf24;">Subscribe here</a>.
        </mc-text>
        <mc-text mc-class="footnote" color="#57534e" padding-top="10px">
          The Field Report Ltd · 14 Soho Square, London W1D 3QP ·
          <a href="#" style="color:#57534e;">Unsubscribe</a>
        </mc-text>
      </mc-column>
    </mc-section>

  </mc-body>
</mc>
