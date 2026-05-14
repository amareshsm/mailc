<mc>
  <mc-head>
    <mc-title>Your Project Quotation</mc-title>
    <mc-preview>Quotation for {{ project_name }} — Valid until {{ expiry_date }}</mc-preview>
  </mc-head>

  <mc-body class="bg-[#f9fafb]">
    <!-- Header Section -->
    <mc-section class="bg-[#1e40af] py-[32px] px-[24px]">
      <mc-column>
        <mc-text class="text-center text-[#ffffff] text-[24px] font-bold">
          {{ company_name }}
        </mc-text>
        <mc-text class="text-center text-[#93c5fd] text-[14px] pt-[8px]">
          Professional Services Quotation
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- Main Content Section -->
    <mc-section class="bg-[#ffffff] py-[32px] px-[24px]">
      <mc-column>
        <mc-text class="text-[16px] text-[#1f2937] font-bold pb-[16px]">
          Hello {{ client_name }},
        </mc-text>

        <mc-text class="text-[14px] text-[#4b5563] leading-[22px] pb-[24px]">
          Thank you for considering us for {{ project_name }}. We've carefully reviewed your requirements and prepared a detailed quotation tailored to your needs.
        </mc-text>

        <!-- Project Details -->
        <mc-text class="text-[12px] text-[#6b7280] font-bold uppercase pb-[4px] pt-[16px]">
          Project Name
        </mc-text>
        <mc-text class="text-[14px] text-[#1f2937] font-bold pb-[16px]">
          {{ project_name }}
        </mc-text>

        <mc-text class="text-[12px] text-[#6b7280] font-bold uppercase pb-[4px]">
          Quote ID
        </mc-text>
        <mc-text class="text-[14px] text-[#1f2937] font-bold pb-[16px]">
          {{ quote_id }}
        </mc-text>

        <mc-text class="text-[12px] text-[#6b7280] font-bold uppercase pb-[4px]">
          Start Date
        </mc-text>
        <mc-text class="text-[14px] text-[#1f2937] font-bold pb-[16px]">
          {{ start_date }}
        </mc-text>

        <mc-text class="text-[12px] text-[#6b7280] font-bold uppercase pb-[4px]">
          Duration
        </mc-text>
        <mc-text class="text-[14px] text-[#1f2937] font-bold pb-[24px]">
          {{ duration_weeks }} weeks
        </mc-text>

        <mc-divider class="border-[#e5e7eb]" />

        <!-- Services Breakdown -->
        <mc-text class="text-[16px] text-[#1f2937] font-bold pt-[24px] pb-[16px]">
          Services Included
        </mc-text>

        <!-- Service 1 -->
        <mc-text class="text-[14px] text-[#1f2937] font-bold pt-[12px]">
          {{ service_1_name }}
        </mc-text>
        <mc-text class="text-[13px] text-[#6b7280] pt-[4px]">
          {{ service_1_desc }}
        </mc-text>
        <mc-text class="text-[13px] text-[#4b5563] pt-[8px]">
          Qty: {{ service_1_qty }} × ${{ service_1_price }} = <strong>${{ service_1_total }}</strong>
        </mc-text>

        <mc-divider class="border-[#e5e7eb] pt-[12px] pb-[12px]" />

        <!-- Service 2 -->
        <mc-text class="text-[14px] text-[#1f2937] font-bold pt-[12px]">
          {{ service_2_name }}
        </mc-text>
        <mc-text class="text-[13px] text-[#6b7280] pt-[4px]">
          {{ service_2_desc }}
        </mc-text>
        <mc-text class="text-[13px] text-[#4b5563] pt-[8px]">
          Qty: {{ service_2_qty }} × ${{ service_2_price }} = <strong>${{ service_2_total }}</strong>
        </mc-text>

        <mc-divider class="border-[#e5e7eb] pt-[12px] pb-[12px]" />

        <!-- Service 3 -->
        <mc-text class="text-[14px] text-[#1f2937] font-bold pt-[12px]">
          {{ service_3_name }}
        </mc-text>
        <mc-text class="text-[13px] text-[#6b7280] pt-[4px]">
          {{ service_3_desc }}
        </mc-text>
        <mc-text class="text-[13px] text-[#4b5563] pt-[8px]">
          Qty: {{ service_3_qty }} × ${{ service_3_price }} = <strong>${{ service_3_total }}</strong>
        </mc-text>

        <mc-divider class="border-[#e5e7eb] pt-[12px] pb-[24px]" />

        <!-- Pricing Summary -->
        <mc-text class="text-[13px] text-[#1e40af] font-bold uppercase pb-[12px]">
          Summary
        </mc-text>

        <mc-text class="text-[14px] text-[#1f2937] pb-[8px]">
          Subtotal: <strong>${{ subtotal }}</strong>
        </mc-text>

        <mc-text class="text-[14px] text-[#1f2937] pb-[12px]">
          Tax ({{ tax_rate }}%): <strong>${{ tax_amount }}</strong>
        </mc-text>

        <mc-divider class="border-[#1e40af] pb-[16px]" />

        <mc-text class="text-[18px] text-[#1e40af] font-bold pb-[24px]">
          TOTAL DUE: ${{ total }}
        </mc-text>

        <!-- Validity Notice -->
        <mc-text class="text-[13px] text-[#92400e] font-bold pt-[12px]">
          ⚠ Valid until {{ expiry_date }}
        </mc-text>
        <mc-text class="text-[12px] text-[#b45309] pt-[8px] leading-[18px]">
          Please review the quotation carefully. To proceed, reply to this email or contact us. We're happy to discuss any adjustments.
        </mc-text>

      </mc-column>
    </mc-section>

    <!-- CTA Buttons Section -->
    <mc-section class="p-[24px]">
      <mc-column width="48%">
        <mc-button
          href="https://example.com/accept"
          class="bg-[#1e40af] text-[#ffffff] font-bold py-[12px] px-[24px] rounded-[6px] text-[14px] w-full"
        >
          Accept Quotation
        </mc-button>
      </mc-column>
      <mc-column width="4%" />
      <mc-column width="48%">
        <mc-button
          href="https://example.com/request"
          class="bg-[#e5e7eb] text-[#1f2937] font-bold py-[12px] px-[24px] rounded-[6px] text-[14px] w-full"
        >
          Request Changes
        </mc-button>
      </mc-column>
    </mc-section>

    <!-- Contact Info Section -->
    <mc-section class="bg-[#f3f4f6] p-[24px]">
      <mc-column>
        <mc-text class="text-[12px] text-[#6b7280] font-bold uppercase">
          Questions?
        </mc-text>
        <mc-text class="text-[14px] text-[#1f2937] font-bold pt-[8px]">
          {{ contact_name }}
        </mc-text>
        <mc-text class="text-[13px] text-[#1e40af] pt-[4px]">
          {{ contact_email }}
        </mc-text>
        <mc-text class="text-[13px] text-[#4b5563] pt-[2px]">
          {{ contact_phone }}
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- Footer Section -->
    <mc-section class="bg-[#1f2937] p-[24px]">
      <mc-column>
        <mc-text class="text-center text-[12px] text-[#9ca3af] leading-[18px]">
          © 2026 {{ company_name }}. All rights reserved. This quotation is confidential.
        </mc-text>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>
