<mc>
  <mc-head>
    <mc-title>Your {{subscription.planLabel}} subscription</mc-title>
    <mc-preview>
      <mc-if condition="subscription.isTrial">
        Your trial ends in {{subscription.trialDaysLeft}} days — don't lose access.
      </mc-if>
      <mc-else>
        Manage your {{subscription.planLabel}} plan at any time.
      </mc-else>
    </mc-preview>
  </mc-head>
  <mc-body class="bg-[#f8fafc]">

    <!-- Header: conditional background via mc-if wrapping mc-section -->
    <mc-if condition="subscription.isPro">
      <mc-section class="bg-[#7c3aed] py-[32px] px-[24px]">
        <mc-column>
          <mc-text class="text-center text-[28px]">💎</mc-text>
          <mc-text class="text-center text-[22px] font-bold text-[#ffffff] pt-[8px]">
            Pro Plan Active
          </mc-text>
          <mc-text class="text-center text-[13px] text-[#cbd5e1] pt-[4px]">
            {{subscription.billingCycle || "Monthly"}} · Renews {{subscription.renewalDate}}
          </mc-text>
        </mc-column>
      </mc-section>
    </mc-if>
    <mc-else>
      <mc-section class="bg-[#1e293b] py-[32px] px-[24px]">
        <mc-column>
          <mc-text class="text-center text-[28px]">🚀</mc-text>
          <mc-text class="text-center text-[22px] font-bold text-[#ffffff] pt-[8px]">
            You're on the Free Plan
          </mc-text>
          <mc-text class="text-center text-[13px] text-[#cbd5e1] pt-[4px]">
            {{subscription.billingCycle || "Monthly"}} · Renews {{subscription.renewalDate}}
          </mc-text>
        </mc-column>
      </mc-section>
    </mc-else>

    <!-- Trial banner — shows only when isTrial is truthy -->
    <mc-if condition="subscription.isTrial">
      <mc-section class="bg-[#fef9c3] py-[14px] px-[24px]">
        <mc-column>
          <mc-text class="text-[13px] text-[#854d0e] text-center">
            ⏳ Trial ends in <strong>{{subscription.trialDaysLeft}} days</strong>.
          </mc-text>
          <mc-button
            href="https://mailcraft.dev/billing"
            class="bg-[#854d0e] text-[#ffffff] rounded-[4px] py-[8px] px-[16px] text-[12px] font-bold"
          >
            Upgrade now →
          </mc-button>
        </mc-column>
      </mc-section>
    </mc-if>

    <!-- Features list via mc-each -->
    <mc-section class="bg-[#ffffff] p-[24px]">
      <mc-column>
        <mc-text class="text-[16px] font-bold text-[#111827]">
          Your plan includes:
        </mc-text>
        <mc-spacer class="h-[12px]" />
        <mc-each items="subscription.features" as="feature">
          <mc-text class="text-[14px] text-[#374151] pt-[6px]">
            ✓ {{feature}}
          </mc-text>
        </mc-each>
      </mc-column>
    </mc-section>

    <mc-section class="p-0"><mc-column>
      <mc-divider class="border-[#e5e7eb]" />
    </mc-column></mc-section>

    <!-- Usage stats — two-column layout -->
    <mc-section class="bg-[#ffffff] py-[20px] px-[24px]">
      <mc-column width="50%" class="pr-[8px]">
        <mc-text class="text-[28px] font-bold text-[#7c3aed] text-center">
          {{subscription.usage.emailsSent || "0"}}
        </mc-text>
        <mc-text class="text-[12px] text-[#6b7280] text-center">Emails sent</mc-text>
      </mc-column>
      <mc-column width="50%" class="pl-[8px]">
        <mc-text class="text-[28px] font-bold text-[#7c3aed] text-center">
          {{subscription.usage.templatesCreated || "0"}}
        </mc-text>
        <mc-text class="text-[12px] text-[#6b7280] text-center">Templates created</mc-text>
      </mc-column>
    </mc-section>

    <!-- Upgrade CTA — only for free users (NOT isPro) -->
    <mc-if condition="subscription.showUpgrade">
      <mc-section class="bg-[#7c3aed] py-[28px] px-[24px]">
        <mc-column>
          <mc-text class="text-center text-[18px] font-bold text-[#ffffff]">
            Unlock the full power of mailc
          </mc-text>
          <mc-text class="text-center text-[14px] text-[#ddd6fe] pt-[8px]">
            Dark mode, unlimited templates, priority support, and more.
          </mc-text>
          <mc-spacer class="h-[16px]" />
          <mc-button
            href="https://mailcraft.dev/upgrade"
            class="bg-[#ffffff] text-[#7c3aed] rounded-[6px] py-[13px] px-[28px] text-[14px] font-bold"
          >
            Upgrade to Pro →
          </mc-button>
        </mc-column>
      </mc-section>
    </mc-if>

    <!-- Footer -->
    <mc-section class="p-[24px]">
      <mc-column>
        <mc-text class="text-center text-[12px] text-[#9ca3af]">
          Manage your subscription at mailcraft.dev/billing
        </mc-text>
      </mc-column>
    </mc-section>

</mc-body>
</mc>
