<mc>
  <mc-head>
    <mc-title>Order #{{order.number}} confirmed</mc-title>
    <mc-preview>Thanks {{customer.firstName}}! Your order is on its way.</mc-preview>
  </mc-head>
  <mc-body class="bg-[#f3f4f6]">
    <!-- Header -->
    <mc-section class="bg-[#059669] py-[32px] px-[24px]">
      <mc-column>
        <mc-text class="text-center text-[32px]">✅</mc-text>
        <mc-text class="text-center text-[22px] font-bold text-[#ffffff] pt-[8px]">
          Order Confirmed!
        </mc-text>
        <mc-text class="text-center text-[14px] text-[#d1fae5] pt-[4px]">
          Order #{{order.number}}
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- Greeting -->
    <mc-section class="bg-[#ffffff] pt-[28px] px-[24px] pb-[16px]">
      <mc-column>
        <mc-text class="text-[18px] font-bold text-[#111827]">
          Hi {{customer.firstName}} {{customer.lastName}},
        </mc-text>
        <mc-text class="text-[15px] text-[#4b5563] leading-[24px] pt-[8px]">
          Great news — your order has been confirmed and is being prepared for shipment.
          We'll send you a tracking link as soon as it ships.
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- Order summary table -->
    <mc-section class="bg-[#ffffff] pt-0 px-[24px] pb-[24px]">
      <mc-column>
        <mc-table class="w-full text-sm border-t border-gray-200" style="margin-top:8px;">
          <tr>
            <td class="text-gray-500 py-3">Order date</td>
            <td class="text-gray-900 text-right py-3">{{order.date}}</td>
          </tr>
          <tr class="border-t border-gray-100">
            <td class="text-gray-500 py-3">Payment</td>
            <td class="text-gray-900 text-right py-3">{{order.payment.method}} ending {{order.payment.last4}}</td>
          </tr>
          <tr class="border-t border-gray-100">
            <td class="text-gray-500 py-3">Total</td>
            <td class="text-green-600 text-right py-3 font-bold text-base">{{order.total}}</td>
          </tr>
        </mc-table>
      </mc-column>
    </mc-section>

    <!-- Shipping address -->
    <mc-section class="bg-[#f9fafb] py-[20px] px-[24px] mb-[4px]">
      <mc-column>
        <mc-text class="text-[13px] font-bold text-[#374151]">📦 Shipping to</mc-text>
        <mc-text class="text-[14px] text-[#4b5563] pt-[6px] leading-[22px]">
          {{order.shipping.address.name}}<br />
          {{order.shipping.address.line1}}<br />
          {{order.shipping.address.city}}, {{order.shipping.address.state}} {{order.shipping.address.zip}}<br />
          {{order.shipping.address.country}}
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- CTA -->
    <mc-section class="bg-[#ffffff] p-[24px]">
      <mc-column>
        <mc-button
          href="{{order.trackingUrl}}"
          class="bg-[#059669] text-[#ffffff] rounded-[6px] py-[13px] px-[24px] text-[14px] font-bold"
        >
          Track My Order
        </mc-button>
      </mc-column>
    </mc-section>

    <!-- Footer -->
    <mc-section class="py-[20px] px-[24px]">
      <mc-column>
        <mc-text class="text-center text-[12px] text-[#9ca3af]">
          Questions? Reply to this email or visit
          <a href="https://mailcraft.dev/help" style="color:#9ca3af;">our help centre</a>.
        </mc-text>
      </mc-column>
    </mc-section>

  </mc-body>
</mc>
