<mc>
  <mc-head>
    <mc-title>Introducing {{product.name}} — {{product.tagline}}</mc-title>
    <mc-preview>{{product.previewText}}</mc-preview>
    <mc-attributes>
      <mc-all font-family="'Helvetica Neue', Helvetica, Arial, sans-serif" />
      <mc-text font-size="15px" line-height="26px" color="#e4e4e7" />
      <mc-button border-radius="8px" font-weight="600" />
    </mc-attributes>
  </mc-head>
  <mc-body class="bg-[#0f0f0f]">

    <!-- ═══════════════════════════════════════════════ -->
    <!-- Section 1: Hero                                 -->
    <!-- ═══════════════════════════════════════════════ -->
    <mc-hero
      height="520px"
      class="bg-[#18181b] pt-[48px] px-[32px] pb-[40px]"
      aria-label="{{product.name}} product hero"
    >
      <mc-text class="text-center text-[12px] font-bold text-[#a78bfa] tracking-[2px]">
        {{product.badge}}
      </mc-text>
      <mc-spacer class="h-[16px]" />
      <mc-text class="text-center text-[36px] font-extrabold text-[#ffffff] leading-[44px]">
        {{product.name}}
      </mc-text>
      <mc-spacer class="h-[8px]" />
      <mc-text class="text-center text-[18px] text-[#a1a1aa] leading-[28px]">
        {{product.tagline}}
      </mc-text>
      <mc-spacer class="h-[24px]" />
      <mc-image
        src="{{product.heroImage}}"
        alt="{{product.name}} hero screenshot"
        width="536px"
        class="rounded-[12px]"
      />
      <mc-spacer class="h-[28px]" />
      <mc-button
        href="{{product.ctaUrl}}"
        class="bg-[#7c3aed] text-[#ffffff] py-[14px] px-[36px] text-[16px]"
      >
        {{product.ctaLabel}}
      </mc-button>
      <mc-spacer class="h-[12px]" />
      <mc-text class="text-center text-[12px] text-[#71717a]">
        {{product.ctaSubtext}}
      </mc-text>
    </mc-hero>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- Section 2: Social proof — stats bar             -->
    <!-- ═══════════════════════════════════════════════ -->

    <!-- "Trusted by" header row -->
    <mc-section class="bg-[#6d28d9] pt-[20px] px-[32px] pb-0">
      <mc-column>
        <mc-text class="text-center text-[11px] font-bold text-[#ede9fe] tracking-[2px]">
          TRUSTED WORLDWIDE
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- 3 stat columns — no horizontal padding so columns fit perfectly -->
    <mc-section class="bg-[#6d28d9] py-[16px] px-0">
      <mc-column width="33%">
        <mc-text class="text-center text-[11px] text-[#c4b5fd] pb-[6px]">
          {{stats.metric1Icon}}
        </mc-text>
        <mc-text class="text-center text-[28px] font-extrabold text-[#ffffff] leading-[32px]">
          {{stats.metric1Value}}
        </mc-text>
        <mc-text class="text-center text-[10px] font-bold text-[#ddd6fe] tracking-[1px] pt-[4px]">
          {{stats.metric1Label}}
        </mc-text>
        <mc-text class="text-center text-[11px] text-[#a78bfa] pt-[2px]">
          {{stats.metric1Sub}}
        </mc-text>
      </mc-column>
      <mc-column width="34%" class="border-l-[1px_solid_rgba(255,255,255,0.15)] border-r-[1px_solid_rgba(255,255,255,0.15)]">
        <mc-text class="text-center text-[11px] text-[#c4b5fd] pb-[6px]">
          {{stats.metric2Icon}}
        </mc-text>
        <mc-text class="text-center text-[28px] font-extrabold text-[#ffffff] leading-[32px]">
          {{stats.metric2Value}}
        </mc-text>
        <mc-text class="text-center text-[10px] font-bold text-[#ddd6fe] tracking-[1px] pt-[4px]">
          {{stats.metric2Label}}
        </mc-text>
        <mc-text class="text-center text-[11px] text-[#a78bfa] pt-[2px]">
          {{stats.metric2Sub}}
        </mc-text>
      </mc-column>
      <mc-column width="33%">
        <mc-text class="text-center text-[11px] text-[#c4b5fd] pb-[6px]">
          {{stats.metric3Icon}}
        </mc-text>
        <mc-text class="text-center text-[28px] font-extrabold text-[#ffffff] leading-[32px]">
          {{stats.metric3Value}}
        </mc-text>
        <mc-text class="text-center text-[10px] font-bold text-[#ddd6fe] tracking-[1px] pt-[4px]">
          {{stats.metric3Label}}
        </mc-text>
        <mc-text class="text-center text-[11px] text-[#a78bfa] pt-[2px]">
          {{stats.metric3Sub}}
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- Logo strip row — "as seen in" -->
    <mc-section class="bg-[#6d28d9] pt-[12px] px-[32px] pb-[24px]">
      <mc-column>
        <mc-divider class="border-[rgba(255,255,255,0.15)] pb-[12px]" />
        <mc-text class="text-center text-[11px] text-[#a78bfa]">
          {{stats.featuredLine}}
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- Section 3: Key features (loop)                  -->
    <!-- ═══════════════════════════════════════════════ -->
    <mc-section class="bg-[#18181b] pt-[40px] px-[32px] pb-[16px]">
      <mc-column>
        <mc-text class="text-center text-[11px] font-bold text-[#a78bfa] tracking-[2px]">
          WHY {{product.nameUpper}}
        </mc-text>
        <mc-spacer class="h-[8px]" />
        <mc-text class="text-center text-[24px] font-bold text-[#ffffff] leading-[32px]">
          Everything you need, nothing you don't
        </mc-text>
      </mc-column>
    </mc-section>

    <mc-each items="features" as="feature">
      <mc-section class="bg-[#18181b] py-[16px] px-[32px]">
        <mc-column width="15%">
          <mc-text class="text-center text-[28px] text-[#a78bfa]">
            {{feature.icon}}
          </mc-text>
        </mc-column>
        <mc-column width="85%">
          <mc-text class="text-[16px] font-bold text-[#ffffff]">
            {{feature.title}}
          </mc-text>
          <mc-text class="text-[13px] text-[#a1a1aa] pt-[4px] leading-[20px]">
            {{feature.description}}
          </mc-text>
        </mc-column>
      </mc-section>
    </mc-each>

    <mc-section class="bg-[#18181b] pt-[8px] px-[32px] pb-[40px]">
      <mc-column>
        <mc-divider class="border-[#27272a] py-[16px]" />
      </mc-column>
    </mc-section>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- Section 4: Pricing — 2 columns + conditional   -->
    <!-- ═══════════════════════════════════════════════ -->
    <mc-section class="bg-[#0f0f0f] pt-[40px] px-[32px] pb-[8px]">
      <mc-column>
        <mc-text class="text-center text-[11px] font-bold text-[#a78bfa] tracking-[2px]">
          SIMPLE PRICING
        </mc-text>
        <mc-spacer class="h-[8px]" />
        <mc-text class="text-center text-[24px] font-bold text-[#ffffff]">
          Start free. Scale when ready.
        </mc-text>
        <mc-spacer class="h-[4px]" />
        <mc-text class="text-center text-[12px] text-[#52525b]">
          {{pricing.billingNote}}
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- Free tier card -->
    <mc-section class="bg-[#0f0f0f] pt-[12px] px-[32px] pb-[8px]">
      <mc-column class="rounded-[12px] p-[24px] border-[1px_solid_#27272a]">
        <mc-text class="text-[13px] font-bold text-[#a1a1aa] tracking-[1px]">
          FREE
        </mc-text>
        <mc-spacer class="h-[8px]" />
        <mc-text class="text-[36px] font-extrabold text-[#ffffff] leading-[40px]">
          $0
        </mc-text>
        <mc-text class="text-[12px] text-[#52525b] pt-[2px]">
          per month, forever
        </mc-text>
        <mc-divider class="border-[#27272a] py-[16px]" />
        <mc-each items="pricing.freeFeatures" as="feat">
          <mc-text class="text-[13px] text-[#a1a1aa] leading-[22px]">
            ✓ {{feat.label}}
          </mc-text>
        </mc-each>
        <mc-spacer class="h-[20px]" />
        <mc-button
          href="{{pricing.ctaUrl}}"
          class="bg-[#27272a] text-[#e4e4e7] py-[12px] px-[24px] text-[14px] font-semibold"
        >
          Get started free
        </mc-button>
      </mc-column>
    </mc-section>

    <!-- Pro tier card — highlighted -->
    <mc-section class="bg-[#0f0f0f] pt-[8px] px-[32px] pb-[12px]">
      <mc-column class="rounded-[12px] p-[24px] bg-[#0f0a1e] border-[2px_solid_#7c3aed]">
        <mc-text class="text-[11px] font-bold text-[#7c3aed] tracking-[2px]">
          ✦ MOST POPULAR
        </mc-text>
        <mc-spacer class="h-[6px]" />
        <mc-text class="text-[13px] font-bold text-[#a78bfa] tracking-[1px]">
          PRO
        </mc-text>
        <mc-spacer class="h-[8px]" />
        <mc-text class="text-[36px] font-extrabold text-[#ffffff] leading-[40px]">
          {{pricing.proPrice}}
        </mc-text>
        <mc-text class="text-[12px] text-[#71717a] pt-[2px]">
          per month · billed {{pricing.billingCycle}}
        </mc-text>
        <mc-divider class="border-[#3b1f6b] py-[16px]" />
        <mc-each items="pricing.proFeatures" as="feat">
          <mc-text class="text-[13px] text-[#e4e4e7] leading-[22px]">
            ✦ {{feat.label}}
          </mc-text>
        </mc-each>
        <mc-spacer class="h-[20px]" />
        <mc-button
          href="{{pricing.ctaUrl}}"
          class="bg-[#7c3aed] text-[#ffffff] py-[12px] px-[24px] text-[14px] font-bold"
        >
          {{pricing.ctaLabel}}
        </mc-button>
      </mc-column>
    </mc-section>

    <mc-if condition="pricing.showEarlyBird">
      <mc-section class="bg-[#0f0f0f] pt-[4px] px-[32px] pb-0">
        <mc-column class="rounded-[8px] py-[12px] px-[16px] bg-[#1e1b4b] border-[1px_solid_#3b1f6b]">
          <mc-text class="text-center text-[13px] font-semibold text-[#c4b5fd]">
            🐦 Early bird offer: {{pricing.earlyBirdOffer}}
          </mc-text>
        </mc-column>
      </mc-section>
    </mc-if>

    <mc-section class="bg-[#0f0f0f] pt-[16px] px-[32px] pb-[40px]">
      <mc-column>
        <mc-text class="text-center text-[11px] text-[#3f3f46]">
          {{pricing.footerNote}}
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- Section 5: 4-column integrations showcase       -->
    <!-- ═══════════════════════════════════════════════ -->
    <mc-section class="bg-[#18181b] pt-[40px] px-[32px] pb-[16px]">
      <mc-column>
        <mc-text class="text-center text-[11px] font-bold text-[#a78bfa] tracking-[2px]">
          WORKS WITH YOUR STACK
        </mc-text>
        <mc-spacer class="h-[8px]" />
        <mc-text class="text-center text-[24px] font-bold text-[#ffffff]">
          Integrates with everything
        </mc-text>
        <mc-spacer class="h-[4px]" />
        <mc-text class="text-center text-[13px] text-[#71717a]">
          Drop-in SDK for any environment. Zero runtime dependencies.
        </mc-text>
      </mc-column>
    </mc-section>

    <mc-section class="bg-[#18181b] pt-[16px] px-0 pb-[40px]">
      <mc-column width="25%">
        <mc-text class="text-center text-[22px] text-[#a78bfa]">🟢</mc-text>
        <mc-text class="text-center text-[13px] font-bold text-[#ffffff] pt-[6px]">
          {{integrations.item1Name}}
        </mc-text>
        <mc-text class="text-center text-[11px] text-[#71717a] pt-[2px]">
          {{integrations.item1Sub}}
        </mc-text>
      </mc-column>
      <mc-column width="25%">
        <mc-text class="text-center text-[22px] text-[#a78bfa]">🔵</mc-text>
        <mc-text class="text-center text-[13px] font-bold text-[#ffffff] pt-[6px]">
          {{integrations.item2Name}}
        </mc-text>
        <mc-text class="text-center text-[11px] text-[#71717a] pt-[2px]">
          {{integrations.item2Sub}}
        </mc-text>
      </mc-column>
      <mc-column width="25%">
        <mc-text class="text-center text-[22px] text-[#a78bfa]">⚫</mc-text>
        <mc-text class="text-center text-[13px] font-bold text-[#ffffff] pt-[6px]">
          {{integrations.item3Name}}
        </mc-text>
        <mc-text class="text-center text-[11px] text-[#71717a] pt-[2px]">
          {{integrations.item3Sub}}
        </mc-text>
      </mc-column>
      <mc-column width="25%">
        <mc-text class="text-center text-[22px] text-[#a78bfa]">🟣</mc-text>
        <mc-text class="text-center text-[13px] font-bold text-[#ffffff] pt-[6px]">
          {{integrations.item4Name}}
        </mc-text>
        <mc-text class="text-center text-[11px] text-[#71717a] pt-[2px]">
          {{integrations.item4Sub}}
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- Section 6: Testimonials (loop)                  -->
    <!-- ═══════════════════════════════════════════════ -->
    <mc-section class="bg-[#0f0f0f] pt-[40px] px-[32px] pb-[16px]">
      <mc-column>
        <mc-text class="text-center text-[11px] font-bold text-[#a78bfa] tracking-[2px]">
          LOVED BY DEVELOPERS
        </mc-text>
        <mc-spacer class="h-[8px]" />
        <mc-text class="text-center text-[24px] font-bold text-[#ffffff]">
          Don't take our word for it
        </mc-text>
      </mc-column>
    </mc-section>

    <mc-each items="testimonials" as="t">
      <mc-section class="bg-[#0f0f0f] py-[12px] px-[32px]">
        <mc-column>
          <mc-text class="text-[14px] text-[#e4e4e7] italic leading-[22px]">
            "{{t.quote}}"
          </mc-text>
          <mc-text class="text-[12px] text-[#71717a] pt-[8px]">
            — {{t.name}}, {{t.role}}
          </mc-text>
          <mc-divider class="border-[#27272a] pt-[12px]" />
        </mc-column>
      </mc-section>
    </mc-each>

    <!-- ═══════════════════════════════════════════════ -->
    <!-- Section 7: FAQ (conditional)                    -->
    <!-- ═══════════════════════════════════════════════ -->
    <mc-if condition="showFaq">
      <mc-section class="bg-[#18181b] pt-[40px] px-[32px] pb-[16px]">
        <mc-column>
          <mc-text class="text-center text-[11px] font-bold text-[#a78bfa] tracking-[2px]">
            FAQ
          </mc-text>
        </mc-column>
      </mc-section>

      <mc-each items="faqs" as="faq">
        <mc-section class="bg-[#18181b] py-[8px] px-[32px]">
          <mc-column>
            <mc-text class="text-[14px] font-bold text-[#ffffff]">
              {{faq.question}}
            </mc-text>
            <mc-text class="text-[13px] text-[#a1a1aa] pt-[4px] leading-[20px]">
              {{faq.answer}}
            </mc-text>
            <mc-divider class="border-[#27272a] pt-[12px]" />
          </mc-column>
        </mc-section>
      </mc-each>

      <mc-section class="bg-[#18181b] pt-0 px-0 pb-[40px]">
        <mc-column>
          <mc-spacer class="h-[1px]" />
        </mc-column>
      </mc-section>
    </mc-if>

    <!-- Final CTA -->
    <mc-section class="bg-[#7c3aed] py-[48px] px-[32px]">
      <mc-column>
        <mc-text class="text-center text-[28px] font-extrabold text-[#ffffff] leading-[36px]">
          Ready to build beautiful emails?
        </mc-text>
        <mc-spacer class="h-[8px]" />
        <mc-text class="text-center text-[15px] text-[#ddd6fe] leading-[24px]">
          {{product.finalCtaCopy}}
        </mc-text>
        <mc-spacer class="h-[24px]" />
        <mc-button
          href="{{product.ctaUrl}}"
          class="bg-[#ffffff] text-[#7c3aed] py-[14px] px-[36px] text-[16px] font-bold"
        >
          Get started free →
        </mc-button>
      </mc-column>
    </mc-section>

    <!-- Footer -->

    <!-- Footer nav links -->
    <mc-section class="bg-[#111113] pt-[32px] px-[32px] pb-0">
      <mc-column width="25%">
        <mc-text class="text-[11px] font-bold text-[#a78bfa] tracking-[1px]">
          PRODUCT
        </mc-text>
        <mc-spacer class="h-[10px]" />
        <mc-each items="footer.colProduct" as="lnk">
          <mc-button
            href="{{lnk.url}}"
            class="bg-transparent text-[#71717a] py-[3px] text-[12px] text-left"
          >
            {{lnk.label}}
          </mc-button>
        </mc-each>
      </mc-column>
      <mc-column width="25%">
        <mc-text class="text-[11px] font-bold text-[#a78bfa] tracking-[1px]">
          DEVELOPERS
        </mc-text>
        <mc-spacer class="h-[10px]" />
        <mc-each items="footer.colDevelopers" as="lnk">
          <mc-button
            href="{{lnk.url}}"
            class="bg-transparent text-[#71717a] py-[3px] text-[12px] text-left"
          >
            {{lnk.label}}
          </mc-button>
        </mc-each>
      </mc-column>
      <mc-column width="25%">
        <mc-text class="text-[11px] font-bold text-[#a78bfa] tracking-[1px]">
          COMPANY
        </mc-text>
        <mc-spacer class="h-[10px]" />
        <mc-each items="footer.colCompany" as="lnk">
          <mc-button
            href="{{lnk.url}}"
            class="bg-transparent text-[#71717a] py-[3px] text-[12px] text-left"
          >
            {{lnk.label}}
          </mc-button>
        </mc-each>
      </mc-column>
      <mc-column width="25%">
        <mc-text class="text-[11px] font-bold text-[#a78bfa] tracking-[1px]">
          LEGAL
        </mc-text>
        <mc-spacer class="h-[10px]" />
        <mc-each items="footer.colLegal" as="lnk">
          <mc-button
            href="{{lnk.url}}"
            class="bg-transparent text-[#71717a] py-[3px] text-[12px] text-left"
          >
            {{lnk.label}}
          </mc-button>
        </mc-each>
      </mc-column>
    </mc-section>

    <!-- Footer divider + bottom bar -->
    <mc-section class="bg-[#111113] pt-[24px] px-[32px] pb-0">
      <mc-column>
        <mc-divider class="border-[#27272a] pb-[20px]" />
      </mc-column>
    </mc-section>

    <mc-section class="bg-[#111113] pt-0 px-[32px] pb-[32px]">
      <mc-column width="60%">
        <mc-text class="text-[13px] font-bold text-[#a78bfa]">
          {{product.name}}
        </mc-text>
        <mc-text class="text-[11px] text-[#3f3f46] pt-[4px] leading-[18px]">
          © 2026 {{product.company}} · All rights reserved.
        </mc-text>
        <mc-text class="text-[11px] text-[#3f3f46] pt-[2px]">
          {{footer.sentTo}}
        </mc-text>
      </mc-column>
      <mc-column width="40%">
        <mc-text class="text-right text-[11px] text-[#3f3f46] pt-[4px]">
          {{footer.socialLine}}
        </mc-text>
        <mc-spacer class="h-[6px]" />
        <mc-button
          href="{{footer.unsubscribeUrl}}"
          class="bg-transparent text-[#3f3f46] text-[11px] text-right"
        >
          Unsubscribe · Manage preferences
        </mc-button>
      </mc-column>
    </mc-section>

</mc-body>
</mc>
