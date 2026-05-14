<mc>
  <mc-head>
    <mc-title>Your receipt for order #{{order.number}}</mc-title>
    <mc-preview>{{order.items.length}} item(s) · Total: {{order.total}}</mc-preview>
  </mc-head>
  <mc-body class="bg-[#f9fafb]">
    <!-- Header -->
    <mc-section class="bg-[#1e293b] py-[28px] px-[24px]">
      <mc-column>
        <mc-text class="text-center text-[18px] font-bold text-[#ffffff]">
          🧾 Order Receipt
        </mc-text>
        <mc-text class="text-center text-[13px] text-[#94a3b8] pt-[4px]">
          Order #{{order.number}} · {{order.date}}
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- Items table header -->
    <mc-section class="bg-[#f1f5f9] py-[10px] px-[24px]">
      <mc-column width="50%">
        <mc-text class="text-[11px] font-bold text-[#64748b]">ITEM</mc-text>
      </mc-column>
      <mc-column width="20%">
        <mc-text class="text-[11px] font-bold text-[#64748b] text-center">QTY</mc-text>
      </mc-column>
      <mc-column width="30%">
        <mc-text class="text-[11px] font-bold text-[#64748b] text-right">SUBTOTAL</mc-text>
      </mc-column>
    </mc-section>

    <!-- Line items via mc-each -->
    <mc-each items="order.items" as="item" index="i">
      <mc-section class="bg-[#ffffff] py-[12px] px-[24px] border-b-[1px_solid_#f1f5f9]">
        <mc-column width="50%">
          <mc-text class="text-[14px] font-bold text-[#111827]">
            {{item.name}}
          </mc-text>
          <mc-text class="text-[12px] text-[#6b7280] pt-[2px]">
            SKU: {{item.sku || "—"}}
          </mc-text>
        </mc-column>
        <mc-column width="20%">
          <mc-text class="text-[14px] text-[#374151] text-center">{{item.qty}}</mc-text>
        </mc-column>
        <mc-column width="30%">
          <mc-text class="text-[14px] text-[#111827] text-right font-bold">
            {{item.total}}
          </mc-text>
        </mc-column>
      </mc-section>
    </mc-each>

    <!-- Totals -->
    <mc-section class="bg-[#f8fafc] py-[16px] px-[24px]">
      <mc-column>
        <mc-table class="w-full text-sm">
          <tr>
            <td class="text-gray-500 py-1.5">Subtotal ({{order.items.length}} items)</td>
            <td class="text-gray-900 text-right py-1.5">{{order.subtotal}}</td>
          </tr>
          <tr>
            <td class="text-gray-500 py-1.5">Shipping</td>
            <td class="text-gray-900 text-right py-1.5">{{order.shipping}}</td>
          </tr>
          <tr>
            <td class="text-gray-500 py-1.5">Tax</td>
            <td class="text-gray-900 text-right py-1.5">{{order.tax}}</td>
          </tr>
          <tr class="border-t-2 border-gray-200">
            <td class="text-gray-900 font-bold pt-2.5 pb-1.5">Total</td>
            <td class="text-green-600 text-right font-bold pt-2.5 pb-1.5">{{order.total}}</td>
          </tr>
        </mc-table>
      </mc-column>
    </mc-section>

    <!-- Footer -->
    <mc-section class="p-[24px]">
      <mc-column>
        <mc-text class="text-center text-[12px] text-[#9ca3af]">
          Thank you for your purchase! This receipt was sent to {{customer.email}}.
        </mc-text>
      </mc-column>
    </mc-section>

  </mc-body>
</mc>
