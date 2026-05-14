<mc>
  <mc-head>
    <mc-title>Welcome to mailc</mc-title>
    <mc-preview>You're in — let's build something great together.</mc-preview>
    <mc-attributes>
      <mc-all font-family="Arial, sans-serif" />
    </mc-attributes>
  </mc-head>
  <mc-body class="bg-[#f4f4f5]">
    <!-- Header -->
    <mc-section class="bg-[#4f46e5] py-[40px] px-[24px]">
      <mc-column>
        <mc-text class="text-center text-[#ffffff] text-[28px] font-bold">
          Welcome to mailc ✉️
        </mc-text>
        <mc-text class="text-center text-[#c7d2fe] text-[16px] pt-[8px]">
          The modern email compiler for developers
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- Hero image -->
    <mc-section class="bg-[#ffffff] pt-[32px] px-[24px] pb-0">
      <mc-column>
        <mc-image
          src="https://placehold.co/560x200/4f46e5/ffffff?text=mailc"
          alt="mailc — email that works everywhere"
          width="560"
          class="rounded-[8px]"
        />
      </mc-column>
    </mc-section>

    <!-- Intro text -->
    <mc-section class="bg-[#ffffff] p-[24px]">
      <mc-column>
        <mc-text class="text-[16px] text-[#374151] leading-[24px]">
          Hi there 👋
        </mc-text>
        <mc-text class="text-[16px] text-[#374151] leading-[24px] pt-[12px]">
          You've just found a friendlier, quicker way to write email-safe HTML. mailc takes your
          component markup, expands Tailwind-style classes, inlines CSS, and outputs bulletproof
          email HTML — compatible with Gmail, Outlook, Apple Mail, and 20+ other clients.
        </mc-text>
        <mc-spacer class="h-[16px]" />
        <mc-button
          href="https://mailcraft.dev/docs/getting-started"
          class="bg-[#4f46e5] text-[#ffffff] rounded-[6px] py-[14px] px-[28px] text-[15px] font-bold"
        >
          Read the Docs →
        </mc-button>
      </mc-column>
    </mc-section>

    <mc-section class="p-0"><mc-column>

      <mc-divider class="border-[#e5e7eb]" />

    </mc-column></mc-section>

    <!-- Feature row -->
    <mc-section class="bg-[#ffffff] p-[24px]">
      <mc-column width="33%" class="pr-[8px]">
        <mc-text class="text-[24px] text-center">⚡</mc-text>
        <mc-text class="text-[14px] font-bold text-[#111827] text-center">Fast</mc-text>
        <mc-text class="text-[13px] text-[#6b7280] text-center pt-[4px]">
          Compiles in under 5ms
        </mc-text>
      </mc-column>
      <mc-column width="33%" class="px-[4px]">
        <mc-text class="text-[24px] text-center">🛡️</mc-text>
        <mc-text class="text-[14px] font-bold text-[#111827] text-center">Safe</mc-text>
        <mc-text class="text-[13px] text-[#6b7280] text-center pt-[4px]">
          Only email-safe CSS
        </mc-text>
      </mc-column>
      <mc-column width="33%" class="pl-[8px]">
        <mc-text class="text-[24px] text-center">🌐</mc-text>
        <mc-text class="text-[14px] font-bold text-[#111827] text-center">Portable</mc-text>
        <mc-text class="text-[13px] text-[#6b7280] text-center pt-[4px]">
          Browser + Node.js
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- Footer -->
    <mc-section class="p-[24px]">
      <mc-column>
        <mc-text class="text-center text-[12px] text-[#9ca3af]">
          © 2026 mailc. Built with ❤️ for developers.
        </mc-text>
        <mc-text class="text-center text-[12px] text-[#9ca3af] pt-[4px]">
          <a href="https://mailcraft.dev/unsubscribe" style="color:#9ca3af;">Unsubscribe</a>
        </mc-text>
      </mc-column>
    </mc-section>

  </mc-body>
</mc>
