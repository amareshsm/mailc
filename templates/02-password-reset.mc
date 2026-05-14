<mc>
  <mc-head>
    <mc-title>Reset your password</mc-title>
    <mc-preview>Hi {{user.name || "there"}} — here's your password reset link.</mc-preview>
  </mc-head>
  <mc-body class="bg-[#f9fafb]">
    <!-- Header -->
    <mc-section class="bg-[#111827] p-[24px]">
      <mc-column>
        <mc-text class="text-center text-[#ffffff] text-[20px] font-bold">
          🔐 Password Reset
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- Card -->
    <mc-section class="bg-[#ffffff] py-[32px] px-[24px] my-[16px]">
      <mc-column>
        <mc-text class="text-[22px] font-bold text-[#111827]">
          Hi {{user.name || "there"}} 👋
        </mc-text>
        <mc-text class="text-[15px] text-[#4b5563] leading-[24px] pt-[12px]">
          We received a request to reset the password for your account
          (<strong>{{user.email}}</strong>). Click the button below to choose a new password.
        </mc-text>
        <mc-spacer class="h-[24px]" />
        <mc-button
          href="{{resetUrl}}"
          class="bg-[#111827] text-[#ffffff] rounded-[6px] py-[14px] px-[28px] text-[15px] font-bold"
        >
          Reset My Password
        </mc-button>
        <mc-spacer class="h-[24px]" />
        <mc-text class="text-[13px] text-[#6b7280] leading-[20px]">
          This link expires in <strong>{{expiryMinutes || "60"}} minutes</strong>.
          If you didn't request a password reset, you can safely ignore this email —
          your password will remain unchanged.
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- Security notice -->
    <mc-section class="bg-[#fef3c7] py-[16px] px-[24px]">
      <mc-column>
        <mc-text class="text-[13px] text-[#92400e] leading-[20px]">
          ⚠️ <strong>Security notice:</strong> This request came from IP
          <strong>{{requestIp || "unknown"}}</strong> at <strong>{{requestTime}}</strong>.
          If this wasn't you, please secure your account immediately.
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- Footer -->
    <mc-section class="p-[24px]">
      <mc-column>
        <mc-text class="text-center text-[12px] text-[#9ca3af]">
          © 2026 mailc · <a href="https://mailcraft.dev" style="color:#9ca3af;">mailcraft.dev</a>
        </mc-text>
      </mc-column>
    </mc-section>

  </mc-body>
</mc>
