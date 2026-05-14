<mc>
  <mc-head>
    <mc-title>Invoice #INV-2026-07732 — Luxora Store</mc-title>
    <mc-preview>Your premium order has been confirmed. Total: ₹18,450 · Delivered within 2 business days.</mc-preview>
  </mc-head>

  <!--
    CONVERSION NOTES (attribute → tailwind):
    ─────────────────────────────────────────
    COLORS (all exact hex matches via stone + green palettes):
      #fafaf9 → bg-stone-50   | #1c1917 → bg-stone-900 | #a8a29e → text-stone-400
      #e7e5e4 → stone-200     | #57534e → stone-600     | #78716c → stone-500
      #44403c → stone-700     | #f5f5f4 → stone-100     | #292524 → stone-800
      #166534 → green-800     | #bbf7d0 → green-200     | #86efac → green-300

    KNOWN LIMITATIONS:
      1. border-right on mc-column — not supported via Tailwind classes.
         The column compiler only reads the `border` attribute, not CSS classes.
         Workaround: skipped (visual separator disappears).

      2. padding-left on mc-column — not supported via Tailwind classes.
         The column compiler extracts only `padding:` shorthand from class styles.
         Workaround: ml-7 (28px) applied to inner mc-text elements instead.

      3. width="45%" / width="15%" — no matching Tailwind fraction.
         Closest: w-1/2 (50%) for product col, w-1/6 (16.7%) for narrow cols.
         Layout shifts slightly but total = 100%.
  -->

  <mc-body class="bg-stone-50">

    <!-- ─── TOP BRAND BAR ─── -->
    <!-- padding="20px 32px" → py-5 px-8 ✅ -->
    <mc-section class="bg-stone-900 px-8 py-5">
      <mc-column class="w-1/2">
        <!-- font-size="22px" → text-[22px] | letter-spacing="2px" → tracking-[2px] -->
        <mc-text class="text-white text-[22px] font-black tracking-[2px]">LUXORA</mc-text>
        <!-- font-size="11px" → text-[11px] | padding-top="4px" → mt-1 ✅ -->
        <mc-text class="text-stone-400 text-[11px] mt-1">Premium Lifestyle Products</mc-text>
      </mc-column>
      <mc-column class="w-1/2">
        <mc-text class="text-stone-400 text-[11px] text-right">TAX INVOICE</mc-text>
        <!-- font-size="13px" → text-[13px] | padding-top="4px" → mt-1 ✅ -->
        <mc-text class="text-stone-200 text-[13px] font-bold text-right mt-1">#INV-2026-07732</mc-text>
      </mc-column>
    </mc-section>

    <!-- ─── STATUS STRIP ─── -->
    <!-- padding="14px 32px" → py-[14px] px-8 (14px not on 4px grid, arbitrary needed) -->
    <mc-section class="bg-green-800 px-8 py-[14px]">
      <mc-column class="w-1/2">
        <!-- letter-spacing="1px" → tracking-[1px] -->
        <mc-text class="text-green-200 text-[11px] font-bold tracking-[1px]">✓ PAYMENT CONFIRMED</mc-text>
      </mc-column>
      <mc-column class="w-1/2">
        <mc-text class="text-green-300 text-[12px] text-right">April 24, 2026 · 11:05 AM IST</mc-text>
      </mc-column>
    </mc-section>

    <!-- ─── CUSTOMER INFO COLUMNS ─── -->
    <!-- padding="32px 32px 24px" → px-8 pt-8 pb-6 ✅ -->
    <!-- LIMITATION: border-right="1px solid #e7e5e4" on first column not supported via class -->
    <mc-section class="bg-white px-8 pt-8 pb-6">
      <mc-column class="w-1/2">
        <!-- font-size="10px" → text-[10px] | letter-spacing="2px" → tracking-[2px] -->
        <mc-text class="text-stone-400 text-[10px] font-bold tracking-[2px]">BILLED TO</mc-text>
        <!-- font-size="16px" → text-base ✅ | padding-top="12px" → mt-3 ✅ -->
        <mc-text class="text-stone-900 text-base font-bold mt-3">Priya Nair</mc-text>
        <!-- font-size="13px" → text-[13px] | line-height="1.625" → leading-relaxed ✅ | padding-top="6px" → mt-[6px] -->
        <mc-text class="text-stone-600 text-[13px] leading-relaxed mt-[6px]">
          12 Indiranagar 100ft Road<br />
          Bengaluru, Karnataka 560038<br />
          India
        </mc-text>
        <!-- padding-top="10px" → mt-[10px] -->
        <mc-text class="text-stone-500 text-[13px] mt-[10px]">priya.nair@email.com</mc-text>
        <!-- padding-top="2px" → mt-[2px] -->
        <mc-text class="text-stone-500 text-[13px] mt-[2px]">+91 94483 17620</mc-text>
      </mc-column>
      <!-- LIMITATION: padding-left="28px" not settable on mc-column via Tailwind.
           Workaround: ml-7 (28px) on inner text elements -->
      <mc-column class="w-1/2">
        <mc-text class="text-stone-400 text-[10px] font-bold tracking-[2px] ml-7">DELIVERY ADDRESS</mc-text>
        <mc-text class="text-stone-900 text-base font-bold mt-3 ml-7">Priya Nair</mc-text>
        <mc-text class="text-stone-600 text-[13px] leading-relaxed mt-[6px] ml-7">
          12 Indiranagar 100ft Road<br />
          Bengaluru, Karnataka 560038<br />
          India
        </mc-text>
        <mc-text class="text-stone-500 text-[12px] mt-[10px] ml-7">Tracking ID: LXR-88KA-04912</mc-text>
        <mc-text class="text-green-800 text-[13px] font-semibold mt-[2px] ml-7">Est. delivery: Apr 26, 2026</mc-text>
      </mc-column>
    </mc-section>

    <!-- ─── SECTION DIVIDER ─── -->
    <!-- padding="0 32px" → px-8 py-0 ✅ -->
    <mc-section class="bg-white px-8 py-0">
      <mc-column class="w-full">
        <!-- border-color="#e7e5e4" = stone-200 → border-stone-200 ✅ -->
        <mc-divider class="border-stone-200" />
      </mc-column>
    </mc-section>

    <!-- ─── ITEMS TABLE HEADER ─── -->
    <!-- padding="10px 32px" → px-8 py-[10px] (10px not on 4px grid) -->
    <mc-section class="bg-stone-100 px-8 py-[10px]">
      <!-- LIMITATION: width="45%" → w-1/2 (50%, closest fraction) -->
      <mc-column class="w-1/2">
        <!-- letter-spacing="1.5px" → tracking-[1.5px] -->
        <mc-text class="text-stone-500 text-[10px] font-bold tracking-[1.5px]">PRODUCT</mc-text>
      </mc-column>
      <!-- LIMITATION: width="15%" → w-1/6 (16.7%, closest fraction) -->
      <mc-column class="w-1/6">
        <mc-text class="text-stone-500 text-[10px] font-bold tracking-[1.5px] text-right">QTY</mc-text>
      </mc-column>
      <!-- width="20%" → w-1/5 ✅ exact -->
      <mc-column class="w-1/5">
        <mc-text class="text-stone-500 text-[10px] font-bold tracking-[1.5px] text-right">UNIT PRICE</mc-text>
      </mc-column>
      <mc-column class="w-1/5">
        <mc-text class="text-stone-500 text-[10px] font-bold tracking-[1.5px] text-right">TOTAL</mc-text>
      </mc-column>
    </mc-section>

    <!-- ─── ITEM 1 ─── -->
    <!-- padding="18px 32px" → px-8 py-[18px] (18px not on 4px grid) -->
    <mc-section class="bg-white px-8 py-[18px]">
      <mc-column class="w-1/2">
        <mc-text class="text-stone-900 text-sm font-bold">Dyson V15 Detect Vacuum</mc-text>
        <!-- padding-top="3px" → mt-[3px] -->
        <mc-text class="text-stone-400 text-[11px] mt-[3px]">SKU: DYS-V15-NIC · Nickel/Gold</mc-text>
      </mc-column>
      <mc-column class="w-1/6">
        <mc-text class="text-stone-700 text-sm text-right">1</mc-text>
      </mc-column>
      <mc-column class="w-1/5">
        <mc-text class="text-stone-700 text-sm text-right">₹9,500</mc-text>
      </mc-column>
      <mc-column class="w-1/5">
        <mc-text class="text-stone-900 text-sm font-bold text-right">₹9,500</mc-text>
      </mc-column>
    </mc-section>

    <!-- border-color="#f5f5f4" = stone-100 → border-stone-100 ✅ -->
    <mc-section class="bg-white px-8 py-0">
      <mc-column class="w-full"><mc-divider class="border-stone-100" /></mc-column>
    </mc-section>

    <!-- ─── ITEM 2 ─── -->
    <mc-section class="bg-white px-8 py-[18px]">
      <mc-column class="w-1/2">
        <mc-text class="text-stone-900 text-sm font-bold">Aesop Resurrection Aromatique</mc-text>
        <mc-text class="text-stone-400 text-[11px] mt-[3px]">SKU: AES-RES-500 · 500mL Refill</mc-text>
      </mc-column>
      <mc-column class="w-1/6">
        <mc-text class="text-stone-700 text-sm text-right">2</mc-text>
      </mc-column>
      <mc-column class="w-1/5">
        <mc-text class="text-stone-700 text-sm text-right">₹2,600</mc-text>
      </mc-column>
      <mc-column class="w-1/5">
        <mc-text class="text-stone-900 text-sm font-bold text-right">₹5,200</mc-text>
      </mc-column>
    </mc-section>

    <mc-section class="bg-white px-8 py-0">
      <mc-column class="w-full"><mc-divider class="border-stone-100" /></mc-column>
    </mc-section>

    <!-- ─── ITEM 3 ─── -->
    <mc-section class="bg-white px-8 py-[18px]">
      <mc-column class="w-1/2">
        <mc-text class="text-stone-900 text-sm font-bold">Le Labo Santal 33 Candle</mc-text>
        <mc-text class="text-stone-400 text-[11px] mt-[3px]">SKU: LLB-S33-245 · 245g, Black Vessel</mc-text>
      </mc-column>
      <mc-column class="w-1/6">
        <mc-text class="text-stone-700 text-sm text-right">1</mc-text>
      </mc-column>
      <mc-column class="w-1/5">
        <mc-text class="text-stone-700 text-sm text-right">₹3,750</mc-text>
      </mc-column>
      <mc-column class="w-1/5">
        <mc-text class="text-stone-900 text-sm font-bold text-right">₹3,750</mc-text>
      </mc-column>
    </mc-section>

    <!-- ─── TOTALS ─── -->
    <!-- padding="20px 32px" → px-8 py-5 ✅ -->
    <mc-section class="bg-stone-50 px-8 py-5">
      <!-- width="60%" → w-3/5 ✅ exact -->
      <mc-column class="w-3/5">
        <mc-spacer class="h-1" />
      </mc-column>
      <!-- width="20%" → w-1/5 ✅ exact | padding="4px 0" → py-1 -->
      <mc-column class="w-1/5 py-1">
        <!-- padding-bottom="8px" → mb-2 ✅ -->
        <mc-text class="text-stone-500 text-[13px] mb-2">Subtotal</mc-text>
        <mc-text class="text-stone-500 text-[13px] mb-2">Express Shipping</mc-text>
        <mc-text class="text-stone-500 text-[13px] mb-2">GST (18%)</mc-text>
        <mc-text class="text-stone-500 text-[13px] mb-2">Loyalty Discount</mc-text>
      </mc-column>
      <mc-column class="w-1/5 py-1">
        <mc-text class="text-stone-900 text-[13px] font-semibold text-right mb-2">₹18,450</mc-text>
        <mc-text class="text-stone-900 text-[13px] font-semibold text-right mb-2">₹199</mc-text>
        <mc-text class="text-stone-900 text-[13px] font-semibold text-right mb-2">₹3,321</mc-text>
        <mc-text class="text-green-800 text-[13px] font-semibold text-right mb-2">−₹500</mc-text>
      </mc-column>
    </mc-section>

    <!-- ─── GRAND TOTAL ─── -->
    <!-- padding="20px 32px" → px-8 py-5 ✅ -->
    <mc-section class="bg-stone-900 px-8 py-5">
      <mc-column class="w-1/2">
        <!-- font-size="15px" → text-[15px] -->
        <mc-text class="text-white text-[15px] font-bold">Total Amount Paid</mc-text>
        <!-- font-size="12px" → text-xs ✅ | padding-top="4px" → mt-1 ✅ -->
        <mc-text class="text-stone-400 text-xs mt-1">Paid via HDFC Credit Card •••• 8812</mc-text>
      </mc-column>
      <mc-column class="w-1/2">
        <!-- font-size="28px" → text-[28px] -->
        <mc-text class="text-white text-[28px] font-black text-right">₹21,470</mc-text>
      </mc-column>
    </mc-section>

    <!-- ─── ORDER + PAYMENT DETAILS ─── -->
    <!-- padding="28px 32px" → px-8 py-7 ✅ -->
    <!-- LIMITATION: border-right="1px solid #e7e5e4" on first column not supported -->
    <mc-section class="bg-white px-8 py-7">
      <mc-column class="w-1/2">
        <mc-text class="text-stone-400 text-[10px] font-bold tracking-[2px]">PAYMENT DETAILS</mc-text>
        <!-- padding-top="10px" → mt-[10px] -->
        <mc-text class="text-stone-900 text-[13px] font-bold mt-[10px]">HDFC Credit Card</mc-text>
        <!-- padding-top="2px" → mt-[2px] -->
        <mc-text class="text-stone-500 text-[12px] mt-[2px]">Card ending in 8812</mc-text>
        <mc-text class="text-stone-500 text-[12px] mt-[2px]">Authorization: AUTH7821KA</mc-text>
        <mc-text class="text-stone-500 text-[12px] mt-[2px]">April 24, 2026 · 11:05 AM</mc-text>
      </mc-column>
      <!-- LIMITATION: padding-left="28px" not supported on mc-column via class -->
      <mc-column class="w-1/2">
        <mc-text class="text-stone-400 text-[10px] font-bold tracking-[2px] ml-7">ORDER DETAILS</mc-text>
        <mc-text class="text-stone-900 text-[13px] font-bold mt-[10px] ml-7">ORD-2026-174832</mc-text>
        <mc-text class="text-stone-500 text-[12px] mt-[2px] ml-7">Transaction: TXN77321LXR</mc-text>
        <mc-text class="text-stone-500 text-[12px] mt-[2px] ml-7">3 items · Luxury Packaging</mc-text>
        <mc-text class="text-stone-500 text-[12px] mt-[2px] ml-7">Gift note: Included</mc-text>
      </mc-column>
    </mc-section>

    <!-- ─── RETURN POLICY CALLOUT ─── -->
    <!-- padding="24px 32px" → px-8 py-6 ✅ -->
    <mc-section class="bg-stone-100 px-8 py-6">
      <mc-column class="w-full">
        <mc-text class="text-stone-900 text-sm font-bold">30-Day Return Policy</mc-text>
        <!-- line-height="1.625" → leading-relaxed ✅ | padding-top="8px" → mt-2 ✅ -->
        <mc-text class="text-stone-600 text-[13px] leading-relaxed mt-2">
          Not satisfied? Return any item within 30 days of delivery for a full refund. Items must be in original packaging. Reach us at care@luxora.in or call 1800-200-8899.
        </mc-text>
        <!-- background-color="#1c1917" → bg-stone-900 ✅ | font-size="13px" → text-[13px] | border-radius="6px" → rounded-md ✅ -->
        <mc-button href="https://luxora.in/returns" class="bg-stone-900 text-white text-[13px] font-bold rounded-md px-6 py-3 mt-4">
          Initiate a Return
        </mc-button>
      </mc-column>
    </mc-section>

    <!-- ─── FOOTER ─── -->
    <!-- padding="32px 32px 24px" → px-8 pt-8 pb-6 ✅ -->
    <mc-section class="bg-stone-900 px-8 pt-8 pb-6">
      <mc-column class="w-full">
        <!-- font-size="18px" → text-lg ✅ | letter-spacing="2px" → tracking-[2px] -->
        <mc-text class="text-white text-lg font-black tracking-[2px]">LUXORA</mc-text>
        <!-- font-size="12px" → text-xs ✅ | padding-top="12px" → mt-3 ✅ | line-height="1.625" → leading-relaxed ✅ -->
        <mc-text class="text-stone-500 text-xs leading-relaxed mt-3">
          Luxora Retail Pvt. Ltd. · 77 Vittal Mallya Road, Bengaluru 560001<br />
          GSTIN: 29AABCL5678B1Z3 · CIN: U52100KA2019PTC98765
        </mc-text>
        <!-- border-color="#292524" = stone-800 → border-stone-800 ✅ | padding-top="20px" → mt-5 ✅ -->
        <mc-divider class="border-stone-800 mt-5" />
        <!-- font-size="11px" → text-[11px] | padding-top="20px" → mt-5 ✅ | line-height="1.625" → leading-relaxed ✅ -->
        <mc-text class="text-stone-600 text-[11px] leading-relaxed mt-5">
          This is a system-generated invoice. Please do not reply to this email.<br />
          For queries, visit luxora.in/support or email care@luxora.in
        </mc-text>
        <!-- padding-top="12px" → mt-3 ✅ -->
        <mc-text class="text-stone-700 text-[11px] mt-3">© 2026 Luxora Retail Pvt. Ltd. All rights reserved.</mc-text>
      </mc-column>
    </mc-section>

  </mc-body>
</mc>
