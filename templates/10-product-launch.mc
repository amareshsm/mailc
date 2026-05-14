<mc>
  <mc-head>
    <mc-title>Introducing {{ product_name }} — The Future Is Here</mc-title>
    <mc-preview>Be the first to get access. Limited launch offer inside.</mc-preview>
  </mc-head>

  <mc-body class="bg-[#ffffff]">
    <!-- Hero Section with Background Image -->
    <mc-section class="p-0">
      <mc-column>
        <mc-image
          src="{{ hero_image }}"
          alt="{{ product_name }} Launch"
          width="600"
          height="340"
        />
      </mc-column>
    </mc-section>

    <!-- Hero Text Overlay Section -->
    <mc-section class="bg-[#000000] py-[48px] px-[32px]">
      <mc-column>
        <mc-text class="text-center text-[14px] font-bold text-[#00d9ff] tracking-[2px] uppercase">
          Exclusive Launch
        </mc-text>
        <mc-spacer class="h-[16px]" />
        <mc-text class="text-center text-[42px] font-extrabold text-[#ffffff] leading-[52px]">
          {{ product_name }}
        </mc-text>
        <mc-spacer class="h-[12px]" />
        <mc-text class="text-center text-[18px] text-[#c0c0c0] leading-[28px]">
          {{ tagline }}
        </mc-text>
        <mc-spacer class="h-[28px]" />
        <mc-button
          href="{{ cta_url }}"
          class="bg-[#00d9ff] text-[#000000] font-bold py-[16px] px-[40px] rounded-[8px] text-[16px] w-full"
        >
          Get Early Access
        </mc-button>
      </mc-column>
    </mc-section>

    <!-- Highlights Section with 3 Columns -->
    <mc-section class="bg-[#f5f5f5] py-[48px] px-[32px]">
      <mc-column width="33%">
        <mc-text class="text-center text-[14px] font-bold text-[#00d9ff] uppercase">
          ⚡ Feature 1
        </mc-text>
        <mc-spacer class="h-[12px]" />
        <mc-text class="text-center text-[16px] text-[#333333] leading-[24px] font-bold">
          {{ feature_1_title }}
        </mc-text>
        <mc-spacer class="h-[8px]" />
        <mc-text class="text-center text-[13px] text-[#666666] leading-[20px]">
          {{ feature_1_desc }}
        </mc-text>
      </mc-column>
      <mc-column width="33%">
        <mc-text class="text-center text-[14px] font-bold text-[#00d9ff] uppercase">
          🚀 Feature 2
        </mc-text>
        <mc-spacer class="h-[12px]" />
        <mc-text class="text-center text-[16px] text-[#333333] leading-[24px] font-bold">
          {{ feature_2_title }}
        </mc-text>
        <mc-spacer class="h-[8px]" />
        <mc-text class="text-center text-[13px] text-[#666666] leading-[20px]">
          {{ feature_2_desc }}
        </mc-text>
      </mc-column>
      <mc-column width="34%">
        <mc-text class="text-center text-[14px] font-bold text-[#00d9ff] uppercase">
          💎 Feature 3
        </mc-text>
        <mc-spacer class="h-[12px]" />
        <mc-text class="text-center text-[16px] text-[#333333] leading-[24px] font-bold">
          {{ feature_3_title }}
        </mc-text>
        <mc-spacer class="h-[8px]" />
        <mc-text class="text-center text-[13px] text-[#666666] leading-[20px]">
          {{ feature_3_desc }}
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- Product Image Showcase -->
    <mc-section class="py-[48px] px-[32px] bg-[#ffffff]">
      <mc-column>
        <mc-text class="text-center text-[28px] font-bold text-[#000000] mb-[32px]">
          See It In Action
        </mc-text>
        <mc-image
          src="{{ product_image_1 }}"
          alt="Product screenshot 1"
          width="600"
          height="280"
          class="rounded-[8px]"
        />
        <mc-spacer class="h-[24px]" />
        <mc-text class="text-[14px] text-[#666666] leading-[22px] text-center">
          {{ product_desc_1 }}
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- Two-Column Product Features -->
    <mc-section class="py-[48px] px-[32px] bg-[#f9fafb]">
      <mc-column width="50%">
        <mc-image
          src="{{ product_image_2 }}"
          alt="Feature showcase"
          width="280"
          height="240"
          class="rounded-[8px]"
        />
      </mc-column>
      <mc-column width="50%">
        <mc-text class="text-[24px] font-bold text-[#000000] leading-[32px] mb-[16px]">
          {{ feature_section_title }}
        </mc-text>
        <mc-text class="text-[14px] text-[#666666] leading-[22px] mb-[24px]">
          {{ feature_section_desc }}
        </mc-text>
        <mc-text class="text-[13px] text-[#333333] font-bold mb-[8px]">
          ✓ {{ benefit_1 }}
        </mc-text>
        <mc-text class="text-[13px] text-[#333333] font-bold mb-[8px]">
          ✓ {{ benefit_2 }}
        </mc-text>
        <mc-text class="text-[13px] text-[#333333] font-bold mb-[8px]">
          ✓ {{ benefit_3 }}
        </mc-text>
        <mc-text class="text-[13px] text-[#333333] font-bold mb-[24px]">
          ✓ {{ benefit_4 }}
        </mc-text>
        <mc-button
          href="{{ learn_more_url }}"
          class="bg-[#000000] text-[#ffffff] font-bold py-[12px] px-[32px] rounded-[6px] text-[14px] w-full"
        >
          Learn More
        </mc-button>
      </mc-column>
    </mc-section>

    <!-- Pricing Section with Multiple Tiers -->
    <mc-section class="py-[48px] px-[32px] bg-[#ffffff]">
      <mc-column>
        <mc-text class="text-center text-[32px] font-bold text-[#000000] mb-[12px]">
          Launch Pricing
        </mc-text>
        <mc-text class="text-center text-[14px] text-[#666666] mb-[40px]">
          Special rates for our earliest adopters — Limited time only
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- Pricing Tier 1 -->
    <mc-section class="p-[32px] bg-[#f5f5f5] rounded-[8px] border-[1px_solid_#e0e0e0]">
      <mc-column>
        <mc-text class="text-[18px] font-bold text-[#000000] mb-[8px]">
          {{ tier_1_name }}
        </mc-text>
        <mc-text class="text-[13px] text-[#666666] mb-[16px]">
          {{ tier_1_desc }}
        </mc-text>
        <mc-text class="text-[28px] font-bold text-[#00d9ff] mb-[4px]">
          ${{ tier_1_price }}
        </mc-text>
        <mc-text class="text-[12px] text-[#999999] mb-[20px]">
          {{ tier_1_billing }}
        </mc-text>
        <mc-text class="text-[12px] font-bold text-[#333333] mb-[8px]">
          {{ tier_1_feature_1 }}
        </mc-text>
        <mc-text class="text-[12px] font-bold text-[#333333] mb-[8px]">
          {{ tier_1_feature_2 }}
        </mc-text>
        <mc-text class="text-[12px] font-bold text-[#333333] mb-[20px]">
          {{ tier_1_feature_3 }}
        </mc-text>
        <mc-button
          href="{{ tier_1_cta_url }}"
          class="bg-[#00d9ff] text-[#000000] font-bold py-[12px] px-[24px] rounded-[6px] text-[13px] w-full"
        >
          Choose Plan
        </mc-button>
      </mc-column>
    </mc-section>

    <!-- Pricing Tier 2 (Highlighted) -->
    <mc-section class="p-[32px] bg-[#000000] rounded-[8px] border-[2px_solid_#00d9ff]">
      <mc-column>
        <mc-text class="text-center text-[11px] font-bold text-[#00d9ff] uppercase tracking-[1.5px] mb-[12px]">
          ⭐ Most Popular
        </mc-text>
        <mc-text class="text-[18px] font-bold text-[#ffffff] mb-[8px]">
          {{ tier_2_name }}
        </mc-text>
        <mc-text class="text-[13px] text-[#c0c0c0] mb-[16px]">
          {{ tier_2_desc }}
        </mc-text>
        <mc-text class="text-[28px] font-bold text-[#00d9ff] mb-[4px]">
          ${{ tier_2_price }}
        </mc-text>
        <mc-text class="text-[12px] text-[#999999] mb-[20px]">
          {{ tier_2_billing }}
        </mc-text>
        <mc-text class="text-[12px] font-bold text-[#ffffff] mb-[8px]">
          ✓ {{ tier_2_feature_1 }}
        </mc-text>
        <mc-text class="text-[12px] font-bold text-[#ffffff] mb-[8px]">
          ✓ {{ tier_2_feature_2 }}
        </mc-text>
        <mc-text class="text-[12px] font-bold text-[#ffffff] mb-[8px]">
          ✓ {{ tier_2_feature_3 }}
        </mc-text>
        <mc-text class="text-[12px] font-bold text-[#ffffff] mb-[20px]">
          ✓ {{ tier_2_feature_4 }}
        </mc-text>
        <mc-button
          href="{{ tier_2_cta_url }}"
          class="bg-[#00d9ff] text-[#000000] font-bold py-[12px] px-[24px] rounded-[6px] text-[13px] w-full"
        >
          Get Started Now
        </mc-button>
      </mc-column>
    </mc-section>

    <!-- Pricing Tier 3 -->
    <mc-section class="p-[32px] bg-[#f5f5f5] rounded-[8px] border-[1px_solid_#e0e0e0]">
      <mc-column>
        <mc-text class="text-[18px] font-bold text-[#000000] mb-[8px]">
          {{ tier_3_name }}
        </mc-text>
        <mc-text class="text-[13px] text-[#666666] mb-[16px]">
          {{ tier_3_desc }}
        </mc-text>
        <mc-text class="text-[28px] font-bold text-[#00d9ff] mb-[4px]">
          Custom
        </mc-text>
        <mc-text class="text-[12px] text-[#999999] mb-[20px]">
          Contact sales for pricing
        </mc-text>
        <mc-text class="text-[12px] font-bold text-[#333333] mb-[8px]">
          ✓ {{ tier_3_feature_1 }}
        </mc-text>
        <mc-text class="text-[12px] font-bold text-[#333333] mb-[8px]">
          ✓ {{ tier_3_feature_2 }}
        </mc-text>
        <mc-text class="text-[12px] font-bold text-[#333333] mb-[20px]">
          ✓ {{ tier_3_feature_3 }}
        </mc-text>
        <mc-button
          href="{{ tier_3_cta_url }}"
          class="bg-[#666666] text-[#ffffff] font-bold py-[12px] px-[24px] rounded-[6px] text-[13px] w-full"
        >
          Contact Sales
        </mc-button>
      </mc-column>
    </mc-section>

    <!-- FAQ Section -->
    <mc-section class="py-[48px] px-[32px] bg-[#f9fafb]">
      <mc-column>
        <mc-text class="text-center text-[28px] font-bold text-[#000000] mb-[8px]">
          Frequently Asked Questions
        </mc-text>
        <mc-text class="text-center text-[14px] text-[#666666] mb-[32px]">
          Everything you need to know about {{ product_name }}
        </mc-text>

        <!-- FAQ 1 -->
        <mc-text class="text-[14px] font-bold text-[#000000] mb-[8px]">
          {{ faq_1_question }}
        </mc-text>
        <mc-text class="text-[13px] text-[#666666] leading-[20px] mb-[16px]">
          {{ faq_1_answer }}
        </mc-text>

        <mc-divider class="border-[#e0e0e0] pb-[16px]" />

        <!-- FAQ 2 -->
        <mc-text class="text-[14px] font-bold text-[#000000] mb-[8px]">
          {{ faq_2_question }}
        </mc-text>
        <mc-text class="text-[13px] text-[#666666] leading-[20px] mb-[16px]">
          {{ faq_2_answer }}
        </mc-text>

        <mc-divider class="border-[#e0e0e0] pb-[16px]" />

        <!-- FAQ 3 -->
        <mc-text class="text-[14px] font-bold text-[#000000] mb-[8px]">
          {{ faq_3_question }}
        </mc-text>
        <mc-text class="text-[13px] text-[#666666] leading-[20px] mb-[24px]">
          {{ faq_3_answer }}
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- Final CTA Section -->
    <mc-section class="py-[48px] px-[32px] bg-[#000000]">
      <mc-column>
        <mc-text class="text-center text-[28px] font-bold text-[#ffffff] mb-[12px]">
          Ready to join the revolution?
        </mc-text>
        <mc-text class="text-center text-[14px] text-[#c0c0c0] mb-[32px]">
          {{ final_cta_desc }}
        </mc-text>
        <mc-button
          href="{{ final_cta_url }}"
          class="bg-[#00d9ff] text-[#000000] font-bold py-[16px] px-[40px] rounded-[8px] text-[16px] w-full"
        >
          Get Early Access Today
        </mc-button>
        <mc-spacer class="h-[24px]" />
        <mc-text class="text-center text-[12px] text-[#999999]">
          Limited spots available. {{ availability }} slots remaining.
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- Social & Footer -->
    <mc-section class="p-[32px] bg-[#1a1a1a]">
      <mc-column>
        <mc-text class="text-center text-[12px] text-[#666666] mb-[16px]">
          Follow us for updates
        </mc-text>
        <mc-text class="text-center text-[11px] text-[#999999]">
          <a href="https://twitter.com/{{ twitter_handle }}" style="color: #00d9ff; text-decoration: none;">Twitter</a> &nbsp;|&nbsp;
          <a href="https://linkedin.com/company/{{ company_handle }}" style="color: #00d9ff; text-decoration: none;">LinkedIn</a> &nbsp;|&nbsp;
          <a href="{{ website_url }}" style="color: #00d9ff; text-decoration: none;">Website</a>
        </mc-text>
        <mc-spacer class="h-[16px]" />
        <mc-text class="text-center text-[11px] text-[#666666]">
          © 2026 {{ company_name }}. All rights reserved.
        </mc-text>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>
