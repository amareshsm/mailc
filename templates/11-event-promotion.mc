<mc>
  <mc-head>
    <mc-title>{{ event_name }} - {{ event_date }}</mc-title>
    <mc-preview>Join 500+ professionals. Get your ticket now — Early bird pricing ends soon.</mc-preview>
  </mc-head>

  <mc-body class="bg-[#ffffff]">
    <!-- Hero Section -->
    <mc-section class="p-0">
      <mc-column>
        <mc-image
          src="{{ hero_banner }}"
          alt="{{ event_name }}"
          width="600"
          height="300"
        />
      </mc-column>
    </mc-section>

    <!-- Event Header -->
    <mc-section class="bg-[#1a1a1a] py-[40px] px-[32px]">
      <mc-column>
        <mc-text class="text-center text-[12px] font-bold text-[#ff6b6b] tracking-[1.5px] uppercase">
          Live Event
        </mc-text>
        <mc-spacer class="h-[12px]" />
        <mc-text class="text-center text-[36px] font-bold text-[#ffffff] leading-[44px]">
          {{ event_name }}
        </mc-text>
        <mc-spacer class="h-[16px]" />
        <mc-text class="text-center text-[16px] text-[#c0c0c0] leading-[24px]">
          {{ event_tagline }}
        </mc-text>
        <mc-spacer class="h-[28px]" />
        <mc-button
          href="{{ registration_url }}"
          class="bg-[#ff6b6b] text-[#ffffff] font-bold py-[14px] px-[40px] rounded-[6px] text-[16px] w-full"
        >
          Register Now (Early Bird: ${{ early_bird_price }})
        </mc-button>
      </mc-column>
    </mc-section>

    <!-- Key Info Section (3 columns) -->
    <mc-section class="py-[40px] px-[32px] bg-[#f9fafb]">
      <mc-column width="33%">
        <mc-text class="text-center text-[24px] font-bold text-[#ff6b6b]">
          📅
        </mc-text>
        <mc-spacer class="h-[12px]" />
        <mc-text class="text-center text-[13px] font-bold text-[#1a1a1a]">
          Date & Time
        </mc-text>
        <mc-text class="text-center text-[12px] text-[#666666] mt-[8px]">
          {{ event_date }}
        </mc-text>
        <mc-text class="text-center text-[12px] text-[#666666]">
          {{ event_time }}
        </mc-text>
      </mc-column>
      <mc-column width="33%">
        <mc-text class="text-center text-[24px] font-bold text-[#ff6b6b]">
          📍
        </mc-text>
        <mc-spacer class="h-[12px]" />
        <mc-text class="text-center text-[13px] font-bold text-[#1a1a1a]">
          Location
        </mc-text>
        <mc-text class="text-center text-[12px] text-[#666666] mt-[8px]">
          {{ event_venue }}
        </mc-text>
        <mc-text class="text-center text-[12px] text-[#666666]">
          {{ event_city }}
        </mc-text>
      </mc-column>
      <mc-column width="34%">
        <mc-text class="text-center text-[24px] font-bold text-[#ff6b6b]">
          👥
        </mc-text>
        <mc-spacer class="h-[12px]" />
        <mc-text class="text-center text-[13px] font-bold text-[#1a1a1a]">
          Attendees
        </mc-text>
        <mc-text class="text-center text-[12px] text-[#666666] mt-[8px]">
          {{ attendee_count }} registered
        </mc-text>
        <mc-text class="text-center text-[12px] text-[#666666]">
          {{ capacity_remaining }} spots left
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- Event Description -->
    <mc-section class="py-[48px] px-[32px] bg-[#ffffff]">
      <mc-column>
        <mc-text class="text-[20px] font-bold text-[#1a1a1a] mb-[16px]">
          About the Event
        </mc-text>
        <mc-text class="text-[14px] text-[#666666] leading-[24px] mb-[24px]">
          {{ event_description }}
        </mc-text>
        <mc-text class="text-[14px] font-bold text-[#1a1a1a] mb-[12px]">
          What You'll Learn:
        </mc-text>
        <mc-text class="text-[13px] text-[#666666] mb-[6px]">
          ✓ {{ learning_1 }}
        </mc-text>
        <mc-text class="text-[13px] text-[#666666] mb-[6px]">
          ✓ {{ learning_2 }}
        </mc-text>
        <mc-text class="text-[13px] text-[#666666] mb-[6px]">
          ✓ {{ learning_3 }}
        </mc-text>
        <mc-text class="text-[13px] text-[#666666] mb-[24px]">
          ✓ {{ learning_4 }}
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- Featured Speakers Section -->
    <mc-section class="py-[48px] px-[32px] bg-[#f9fafb]">
      <mc-column>
        <mc-text class="text-center text-[28px] font-bold text-[#1a1a1a] mb-[8px]">
          Featured Speakers
        </mc-text>
        <mc-text class="text-center text-[14px] text-[#666666] mb-[40px]">
          Learn from industry leaders and innovators
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- Speaker 1 & 2 -->
    <mc-section class="p-[32px] bg-[#ffffff]">
      <mc-column width="50%">
        <mc-image
          src="{{ speaker_1_image }}"
          alt="{{ speaker_1_name }}"
          width="240"
          height="240"
          class="rounded-[8px]"
        />
        <mc-spacer class="h-[16px]" />
        <mc-text class="text-center text-[16px] font-bold text-[#1a1a1a]">
          {{ speaker_1_name }}
        </mc-text>
        <mc-text class="text-center text-[12px] text-[#ff6b6b] font-bold mb-[8px]">
          {{ speaker_1_title }}
        </mc-text>
        <mc-text class="text-center text-[13px] text-[#666666] leading-[20px]">
          {{ speaker_1_bio }}
        </mc-text>
      </mc-column>
      <mc-column width="50%">
        <mc-image
          src="{{ speaker_2_image }}"
          alt="{{ speaker_2_name }}"
          width="240"
          height="240"
          class="rounded-[8px]"
        />
        <mc-spacer class="h-[16px]" />
        <mc-text class="text-center text-[16px] font-bold text-[#1a1a1a]">
          {{ speaker_2_name }}
        </mc-text>
        <mc-text class="text-center text-[12px] text-[#ff6b6b] font-bold mb-[8px]">
          {{ speaker_2_title }}
        </mc-text>
        <mc-text class="text-center text-[13px] text-[#666666] leading-[20px]">
          {{ speaker_2_bio }}
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- Speaker 3 & 4 -->
    <mc-section class="p-[32px] bg-[#f9fafb]">
      <mc-column width="50%">
        <mc-image
          src="{{ speaker_3_image }}"
          alt="{{ speaker_3_name }}"
          width="240"
          height="240"
          class="rounded-[8px]"
        />
        <mc-spacer class="h-[16px]" />
        <mc-text class="text-center text-[16px] font-bold text-[#1a1a1a]">
          {{ speaker_3_name }}
        </mc-text>
        <mc-text class="text-center text-[12px] text-[#ff6b6b] font-bold mb-[8px]">
          {{ speaker_3_title }}
        </mc-text>
        <mc-text class="text-center text-[13px] text-[#666666] leading-[20px]">
          {{ speaker_3_bio }}
        </mc-text>
      </mc-column>
      <mc-column width="50%">
        <mc-image
          src="{{ speaker_4_image }}"
          alt="{{ speaker_4_name }}"
          width="240"
          height="240"
          class="rounded-[8px]"
        />
        <mc-spacer class="h-[16px]" />
        <mc-text class="text-center text-[16px] font-bold text-[#1a1a1a]">
          {{ speaker_4_name }}
        </mc-text>
        <mc-text class="text-center text-[12px] text-[#ff6b6b] font-bold mb-[8px]">
          {{ speaker_4_title }}
        </mc-text>
        <mc-text class="text-center text-[13px] text-[#666666] leading-[20px]">
          {{ speaker_4_bio }}
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- Schedule Agenda -->
    <mc-section class="py-[48px] px-[32px] bg-[#ffffff]">
      <mc-column>
        <mc-text class="text-center text-[28px] font-bold text-[#1a1a1a] mb-[32px]">
          Event Schedule
        </mc-text>

        <!-- Time slot 1 -->
        <mc-text class="text-[13px] font-bold text-[#ff6b6b] uppercase mb-[4px]">
          {{ slot_1_time }}
        </mc-text>
        <mc-text class="text-[14px] font-bold text-[#1a1a1a] mb-[12px]">
          {{ slot_1_title }}
        </mc-text>
        <mc-text class="text-[13px] text-[#666666] mb-[24px]">
          {{ slot_1_desc }}
        </mc-text>

        <mc-divider class="border-[#e0e0e0] pb-[24px]" />

        <!-- Time slot 2 -->
        <mc-text class="text-[13px] font-bold text-[#ff6b6b] uppercase mb-[4px]">
          {{ slot_2_time }}
        </mc-text>
        <mc-text class="text-[14px] font-bold text-[#1a1a1a] mb-[12px]">
          {{ slot_2_title }}
        </mc-text>
        <mc-text class="text-[13px] text-[#666666] mb-[24px]">
          {{ slot_2_desc }}
        </mc-text>

        <mc-divider class="border-[#e0e0e0] pb-[24px]" />

        <!-- Time slot 3 -->
        <mc-text class="text-[13px] font-bold text-[#ff6b6b] uppercase mb-[4px]">
          {{ slot_3_time }}
        </mc-text>
        <mc-text class="text-[14px] font-bold text-[#1a1a1a] mb-[12px]">
          {{ slot_3_title }}
        </mc-text>
        <mc-text class="text-[13px] text-[#666666] mb-[24px]">
          {{ slot_3_desc }}
        </mc-text>

        <mc-divider class="border-[#e0e0e0] pb-[24px]" />

        <!-- Time slot 4 -->
        <mc-text class="text-[13px] font-bold text-[#ff6b6b] uppercase mb-[4px]">
          {{ slot_4_time }}
        </mc-text>
        <mc-text class="text-[14px] font-bold text-[#1a1a1a] mb-[12px]">
          {{ slot_4_title }}
        </mc-text>
        <mc-text class="text-[13px] text-[#666666]">
          {{ slot_4_desc }}
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- Pricing Tiers -->
    <mc-section class="py-[48px] px-[32px] bg-[#f9fafb]">
      <mc-column>
        <mc-text class="text-center text-[28px] font-bold text-[#1a1a1a] mb-[12px]">
          Ticket Pricing
        </mc-text>
        <mc-text class="text-center text-[14px] text-[#666666] mb-[40px]">
          Early bird pricing expires {{ early_bird_deadline }}
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- Ticket Tier 1 -->
    <mc-section class="p-[28px] bg-[#ffffff] rounded-[8px] border-[1px_solid_#e0e0e0]">
      <mc-column>
        <mc-text class="text-[16px] font-bold text-[#1a1a1a] mb-[8px]">
          Standard Ticket
        </mc-text>
        <mc-text class="text-[12px] text-[#ff6b6b] font-bold mb-[12px]">
          EARLY BIRD
        </mc-text>
        <mc-text class="text-[24px] font-bold text-[#ff6b6b] mb-[2px]">
          ${{ ticket_1_price }}
        </mc-text>
        <mc-text class="text-[11px] text-[#999999] mb-[16px]">
          Regular price: ${{ ticket_1_regular }}
        </mc-text>
        <mc-text class="text-[12px] font-bold text-[#1a1a1a] mb-[8px]">
          ✓ All-day access
        </mc-text>
        <mc-text class="text-[12px] font-bold text-[#1a1a1a] mb-[8px]">
          ✓ Lunch included
        </mc-text>
        <mc-text class="text-[12px] font-bold text-[#1a1a1a] mb-[16px]">
          ✓ Networking reception
        </mc-text>
        <mc-button
          href="{{ ticket_1_url }}"
          class="bg-[#ff6b6b] text-[#ffffff] font-bold py-[11px] px-[24px] rounded-[6px] text-[13px] w-full"
        >
          Get Standard
        </mc-button>
      </mc-column>
    </mc-section>

    <!-- Ticket Tier 2 (VIP) -->
    <mc-section class="p-[28px] bg-[#1a1a1a] rounded-[8px] border-[2px_solid_#ff6b6b]">
      <mc-column>
        <mc-text class="text-center text-[11px] font-bold text-[#ff6b6b] uppercase tracking-[1px] mb-[8px]">
          🎯 Most Popular
        </mc-text>
        <mc-text class="text-[16px] font-bold text-[#ffffff] mb-[8px]">
          VIP Ticket
        </mc-text>
        <mc-text class="text-[12px] text-[#ff6b6b] font-bold mb-[12px]">
          EARLY BIRD
        </mc-text>
        <mc-text class="text-[24px] font-bold text-[#ff6b6b] mb-[2px]">
          ${{ ticket_2_price }}
        </mc-text>
        <mc-text class="text-[11px] text-[#999999] mb-[16px]">
          Regular price: ${{ ticket_2_regular }}
        </mc-text>
        <mc-text class="text-[12px] font-bold text-[#c0c0c0] mb-[8px]">
          ✓ All Standard benefits
        </mc-text>
        <mc-text class="text-[12px] font-bold text-[#c0c0c0] mb-[8px]">
          ✓ Private VIP lounge
        </mc-text>
        <mc-text class="text-[12px] font-bold text-[#c0c0c0] mb-[8px]">
          ✓ 1-on-1 speaker meet & greet
        </mc-text>
        <mc-text class="text-[12px] font-bold text-[#c0c0c0] mb-[16px]">
          ✓ Premium materials & swag
        </mc-text>
        <mc-button
          href="{{ ticket_2_url }}"
          class="bg-[#ff6b6b] text-[#ffffff] font-bold py-[11px] px-[24px] rounded-[6px] text-[13px] w-full"
        >
          Get VIP Access
        </mc-button>
      </mc-column>
    </mc-section>

    <!-- Testimonials Section -->
    <mc-section class="py-[48px] px-[32px] bg-[#ffffff]">
      <mc-column>
        <mc-text class="text-center text-[28px] font-bold text-[#1a1a1a] mb-[32px]">
          What Attendees Say
        </mc-text>

        <mc-text class="text-[13px] text-[#666666] leading-[22px] mb-[12px]">
          "{{ testimonial_1_text }}"
        </mc-text>
        <mc-text class="text-[12px] font-bold text-[#1a1a1a] mb-[28px]">
          — {{ testimonial_1_author }}, {{ testimonial_1_title }}
        </mc-text>

        <mc-divider class="border-[#e0e0e0] pb-[28px]" />

        <mc-text class="text-[13px] text-[#666666] leading-[22px] mb-[12px]">
          "{{ testimonial_2_text }}"
        </mc-text>
        <mc-text class="text-[12px] font-bold text-[#1a1a1a]">
          — {{ testimonial_2_author }}, {{ testimonial_2_title }}
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- Final CTA Section -->
    <mc-section class="py-[48px] px-[32px] bg-[#ff6b6b]">
      <mc-column>
        <mc-text class="text-center text-[28px] font-bold text-[#ffffff] mb-[12px]">
          Don't Miss Out
        </mc-text>
        <mc-text class="text-center text-[14px] text-[#ffffff] mb-[32px] leading-[22px]">
          {{ final_cta_text }}
        </mc-text>
        <mc-button
          href="{{ registration_url }}"
          class="bg-[#ffffff] text-[#ff6b6b] font-bold py-[16px] px-[40px] rounded-[6px] text-[16px] w-full"
        >
          Register Now
        </mc-button>
      </mc-column>
    </mc-section>

    <!-- Footer -->
    <mc-section class="p-[32px] bg-[#1a1a1a]">
      <mc-column>
        <mc-text class="text-center text-[12px] text-[#999999] mb-[12px]">
          Questions? Email us at <a href="mailto:{{ support_email }}" style="color: #ff6b6b; text-decoration: none;">{{ support_email }}</a>
        </mc-text>
        <mc-text class="text-center text-[11px] text-[#666666]">
          © 2026 {{ organizer_name }}. All rights reserved.
        </mc-text>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>
