<mc>
  <mc-head>
    <mc-title>Theme Config — {{brand.name}}</mc-title>
    <mc-preview>{{brand.previewText}}</mc-preview>
    <!--
      ┌──────────────────────────────────────────────────────────────────┐
      │  mc-attributes — global defaults wired to your theme tokens      │
      │                                                                  │
      │  Everything set here applies to every matching component         │
      │  in the email unless overridden at the component level.          │
      │  This is the #1 reason to use theme config: write font-family    │
      │  once here, never repeat it across 40 mc-text nodes.             │
      └──────────────────────────────────────────────────────────────────┘
    -->
    <mc-attributes>
      <mc-all font-family="'Helvetica Neue', Helvetica, Arial, sans-serif" />
      <mc-text font-size="15px" line-height="26px" color="#e4e4e7" />
      <mc-button border-radius="8px" font-weight="700" font-size="15px" />
    </mc-attributes>
  </mc-head>
  <mc-body class="bg-[#0a0a0a]">

  <!-- ═══════════════════════════════════════════════ -->
  <!-- 1 ▸ Hero — brand header                         -->
  <!-- ═══════════════════════════════════════════════ -->
  <mc-hero
    height="480px"
    class="bg-[#18181b] pt-[40px] px-[32px] pb-[36px]"
    aria-label="{{brand.name}} hero"
  >

      <!-- Logo -->
      <mc-image
        src="{{brand.logoUrl}}"
        alt="{{brand.logoAlt}}"
        width="120"
        align="center"
      />
      <mc-spacer class="h-[28px]" />

      <!-- Eyebrow badge -->
      <mc-text class="text-center text-[11px] font-bold text-[#a78bfa] tracking-[2.5px]">
        {{hero.eyebrow}}
      </mc-text>
      <mc-spacer class="h-[14px]" />

      <!-- Headline -->
      <mc-text class="text-center text-[34px] font-extrabold text-[#ffffff] leading-[42px]">
        {{hero.headline}}
      </mc-text>
      <mc-spacer class="h-[14px]" />

      <!-- Sub-headline -->
      <mc-text class="text-center text-[16px] text-[#a1a1aa] leading-[28px]">
        {{hero.subline}}
      </mc-text>
      <mc-spacer class="h-[28px]" />

      <!-- Primary CTA -->
      <mc-button
        href="{{hero.ctaUrl}}"
        class="bg-[#6d28d9] text-[#ffffff] py-[14px] px-[32px] text-center"
      >
        {{hero.ctaLabel}}
      </mc-button>
      <mc-spacer class="h-[12px]" />

      <!-- Secondary CTA -->
      <mc-text class="text-center text-[13px] text-[#71717a]">
        <a href="{{hero.ctaSecondaryUrl}}" style="color:#a78bfa;text-decoration:none;">
          {{hero.ctaSecondaryLabel}}
        </a>
      </mc-text>

  </mc-hero>

  <!-- ═══════════════════════════════════════════════ -->
  <!-- 2 ▸ What is theme config? — code block section  -->
  <!-- ═══════════════════════════════════════════════ -->
  <mc-section class="bg-[#0a0a0a] pt-[48px] px-[32px] pb-0">
    <mc-column>
      <mc-text class="text-center text-[11px] font-bold text-[#6d28d9] tracking-[2.5px]">
        HOW IT WORKS
      </mc-text>
      <mc-spacer class="h-[12px]" />
      <mc-text class="text-center text-[26px] font-extrabold text-[#ffffff] leading-[34px]">
        {{configSnippet.title}}
      </mc-text>
      <mc-spacer class="h-[10px]" />
      <mc-text class="text-center text-[15px] text-[#a1a1aa] leading-[26px]">
        Add a <span style="background:#1e1b4b;color:#a78bfa;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:13px;">theme.extend</span>
        block to your config. Every key becomes a Tailwind-style class you can use directly in your markup — no plugins, no build step.
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- Config code block (rendered as styled pre) -->
  <mc-section class="bg-[#0a0a0a] py-[24px] px-[32px]">
    <mc-column>
      <mc-raw>
        <div style="background:#111827;border:1px solid #1f2937;border-radius:10px;padding:24px 28px;overflow:hidden;">
          <div style="margin-bottom:16px;">
            <span style="width:10px;height:10px;border-radius:50%;background:#ef4444;display:inline-block;"></span>
            <span style="width:10px;height:10px;border-radius:50%;background:#f59e0b;display:inline-block;margin-left:4px;"></span>
            <span style="width:10px;height:10px;border-radius:50%;background:#22c55e;display:inline-block;margin-left:4px;"></span>
            <span style="margin-left:12px;font-family:monospace;font-size:11px;color:#4b5563;">mailc.config.js</span>
          </div>
          <pre style="margin:0;font-family:'Courier New',Courier,monospace;font-size:12px;line-height:20px;color:#e2e8f0;white-space:pre-wrap;word-break:break-all;"><span style="color:#6d28d9;">export</span> <span style="color:#6d28d9;">default</span> {
  <span style="color:#a78bfa;">theme</span>: {
    <span style="color:#a78bfa;">extend</span>: {
      <span style="color:#34d399;">colors</span>: {
        <span style="color:#fbbf24;">brand</span>: {
          DEFAULT: <span style="color:#86efac;">'#6d28d9'</span>,
          light:   <span style="color:#86efac;">'#a78bfa'</span>,
          dark:    <span style="color:#86efac;">'#4c1d95'</span>,
        },
        <span style="color:#fbbf24;">surface</span>: <span style="color:#86efac;">'#18181b'</span>,
        <span style="color:#fbbf24;">muted</span>:   <span style="color:#86efac;">'#71717a'</span>,
      },
      <span style="color:#34d399;">fontFamily</span>: {
        <span style="color:#fbbf24;">display</span>: <span style="color:#86efac;">"'Helvetica Neue', Arial, sans-serif"</span>,
      },
      <span style="color:#34d399;">borderRadius</span>: {
        <span style="color:#fbbf24;">card</span>: <span style="color:#86efac;">'12px'</span>,
      },
    },
  },
};</pre>
        </div>
      </mc-raw>
    </mc-column>
  </mc-section>

  <!-- ═══════════════════════════════════════════════ -->
  <!-- 3 ▸ Token palette — live swatches               -->
  <!-- ═══════════════════════════════════════════════ -->
  <mc-section class="bg-[#0a0a0a] pt-[40px] px-[32px] pb-0">
    <mc-column>
      <mc-text class="text-center text-[11px] font-bold text-[#6d28d9] tracking-[2.5px]">
        DESIGN TOKENS IN ACTION
      </mc-text>
      <mc-spacer class="h-[12px]" />
      <mc-text class="text-center text-[22px] font-extrabold text-[#ffffff] leading-[30px]">
        Every token. One source of truth.
      </mc-text>
      <mc-spacer class="h-[8px]" />
      <mc-text class="text-center text-[14px] text-[#71717a]">
        These swatches are rendered using the exact classes defined in the config above.
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- Token swatches — 2×2 grid rendered inline -->
  <mc-section class="bg-[#0a0a0a] pt-[20px] px-[32px] pb-0">
    <mc-column width="48%" class="pr-[8px]">
      <mc-raw>
        <div style="background:#18181b;border-radius:10px;overflow:hidden;margin-bottom:12px;">
          <div style="height:56px;background:{{tokens.0.swatch}};"></div>
          <div style="padding:14px 16px;">
            <div style="font-family:'Courier New',Courier,monospace;font-size:12px;color:#a78bfa;font-weight:700;margin-bottom:4px;">{{tokens.0.class}}</div>
            <div style="font-size:11px;color:#52525b;font-family:'Courier New',Courier,monospace;margin-bottom:6px;">{{tokens.0.value}}</div>
            <div style="font-size:12px;color:#a1a1aa;line-height:18px;">{{tokens.0.usage}}</div>
          </div>
        </div>
        <div style="background:#18181b;border-radius:10px;overflow:hidden;">
          <div style="height:56px;background:{{tokens.2.swatch}};"></div>
          <div style="padding:14px 16px;">
            <div style="font-family:'Courier New',Courier,monospace;font-size:12px;color:#a78bfa;font-weight:700;margin-bottom:4px;">{{tokens.2.class}}</div>
            <div style="font-size:11px;color:#52525b;font-family:'Courier New',Courier,monospace;margin-bottom:6px;">{{tokens.2.value}}</div>
            <div style="font-size:12px;color:#a1a1aa;line-height:18px;">{{tokens.2.usage}}</div>
          </div>
        </div>
      </mc-raw>
    </mc-column>
    <mc-column width="48%" class="pl-[8px]">
      <mc-raw>
        <div style="background:#18181b;border-radius:10px;overflow:hidden;margin-bottom:12px;">
          <div style="height:56px;background:{{tokens.1.swatch}};"></div>
          <div style="padding:14px 16px;">
            <div style="font-family:'Courier New',Courier,monospace;font-size:12px;color:#a78bfa;font-weight:700;margin-bottom:4px;">{{tokens.1.class}}</div>
            <div style="font-size:11px;color:#52525b;font-family:'Courier New',Courier,monospace;margin-bottom:6px;">{{tokens.1.value}}</div>
            <div style="font-size:12px;color:#a1a1aa;line-height:18px;">{{tokens.1.usage}}</div>
          </div>
        </div>
        <div style="background:#18181b;border-radius:10px;overflow:hidden;">
          <div style="height:56px;background:{{tokens.3.swatch}};"></div>
          <div style="padding:14px 16px;">
            <div style="font-family:'Courier New',Courier,monospace;font-size:12px;color:#a78bfa;font-weight:700;margin-bottom:4px;">{{tokens.3.class}}</div>
            <div style="font-size:11px;color:#52525b;font-family:'Courier New',Courier,monospace;margin-bottom:6px;">{{tokens.3.value}}</div>
            <div style="font-size:12px;color:#a1a1aa;line-height:18px;">{{tokens.3.usage}}</div>
          </div>
        </div>
      </mc-raw>
    </mc-column>
  </mc-section>

  <!-- ═══════════════════════════════════════════════ -->
  <!-- 4 ▸ Feature grid — 6 features, 2 per row        -->
  <!-- ═══════════════════════════════════════════════ -->
  <mc-section class="bg-[#0a0a0a] pt-[48px] px-[32px] pb-0">
    <mc-column>
      <mc-text class="text-center text-[11px] font-bold text-[#6d28d9] tracking-[2.5px]">
        WHAT YOU GET
      </mc-text>
      <mc-spacer class="h-[12px]" />
      <mc-text class="text-center text-[22px] font-extrabold text-[#ffffff] leading-[30px]">
        Everything your design system needs.
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- Row 1: features 0 & 1 -->
  <mc-section class="bg-[#0a0a0a] pt-[24px] px-[32px] pb-0">
    <mc-column width="48%" class="pr-[8px]">
      <mc-raw>
        <div style="background:#18181b;border-radius:10px;padding:20px;height:100%;">
          <div style="font-size:24px;margin-bottom:10px;">{{features.0.icon}}</div>
          <div style="font-size:14px;font-weight:700;color:#ffffff;margin-bottom:6px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">{{features.0.title}}</div>
          <div style="font-size:13px;color:#71717a;line-height:20px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">{{features.0.description}}</div>
        </div>
      </mc-raw>
    </mc-column>
    <mc-column width="48%" class="pl-[8px]">
      <mc-raw>
        <div style="background:#18181b;border-radius:10px;padding:20px;height:100%;">
          <div style="font-size:24px;margin-bottom:10px;">{{features.1.icon}}</div>
          <div style="font-size:14px;font-weight:700;color:#ffffff;margin-bottom:6px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">{{features.1.title}}</div>
          <div style="font-size:13px;color:#71717a;line-height:20px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">{{features.1.description}}</div>
        </div>
      </mc-raw>
    </mc-column>
  </mc-section>

  <!-- Row 2: features 2 & 3 -->
  <mc-section class="bg-[#0a0a0a] pt-[12px] px-[32px] pb-0">
    <mc-column width="48%" class="pr-[8px]">
      <mc-raw>
        <div style="background:#18181b;border-radius:10px;padding:20px;height:100%;">
          <div style="font-size:24px;margin-bottom:10px;">{{features.2.icon}}</div>
          <div style="font-size:14px;font-weight:700;color:#ffffff;margin-bottom:6px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">{{features.2.title}}</div>
          <div style="font-size:13px;color:#71717a;line-height:20px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">{{features.2.description}}</div>
        </div>
      </mc-raw>
    </mc-column>
    <mc-column width="48%" class="pl-[8px]">
      <mc-raw>
        <div style="background:#18181b;border-radius:10px;padding:20px;height:100%;">
          <div style="font-size:24px;margin-bottom:10px;">{{features.3.icon}}</div>
          <div style="font-size:14px;font-weight:700;color:#ffffff;margin-bottom:6px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">{{features.3.title}}</div>
          <div style="font-size:13px;color:#71717a;line-height:20px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">{{features.3.description}}</div>
        </div>
      </mc-raw>
    </mc-column>
  </mc-section>

  <!-- Row 3: features 4 & 5 -->
  <mc-section class="bg-[#0a0a0a] pt-[12px] px-[32px] pb-0">
    <mc-column width="48%" class="pr-[8px]">
      <mc-raw>
        <div style="background:#18181b;border-radius:10px;padding:20px;height:100%;">
          <div style="font-size:24px;margin-bottom:10px;">{{features.4.icon}}</div>
          <div style="font-size:14px;font-weight:700;color:#ffffff;margin-bottom:6px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">{{features.4.title}}</div>
          <div style="font-size:13px;color:#71717a;line-height:20px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">{{features.4.description}}</div>
        </div>
      </mc-raw>
    </mc-column>
    <mc-column width="48%" class="pl-[8px]">
      <mc-raw>
        <div style="background:#18181b;border-radius:10px;padding:20px;height:100%;">
          <div style="font-size:24px;margin-bottom:10px;">{{features.5.icon}}</div>
          <div style="font-size:14px;font-weight:700;color:#ffffff;margin-bottom:6px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">{{features.5.title}}</div>
          <div style="font-size:13px;color:#71717a;line-height:20px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">{{features.5.description}}</div>
        </div>
      </mc-raw>
    </mc-column>
  </mc-section>

  <!-- ═══════════════════════════════════════════════ -->
  <!-- 5 ▸ Accessibility checks — conditional badge    -->
  <!-- ═══════════════════════════════════════════════ -->
  <mc-section class="bg-[#0a0a0a] pt-[48px] px-[32px] pb-0">
    <mc-column>
      <mc-text class="text-center text-[11px] font-bold text-[#6d28d9] tracking-[2.5px]">
        BUILT FOR EVERYONE
      </mc-text>
      <mc-spacer class="h-[12px]" />
      <mc-text class="text-center text-[22px] font-extrabold text-[#ffffff] leading-[30px]">
        Accessibility is not an afterthought.
      </mc-text>
      <mc-spacer class="h-[8px]" />
      <mc-text class="text-center text-[14px] text-[#71717a] leading-[22px]">
        Enable <span style="background:#1e1b4b;color:#a78bfa;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:12px;">accessibility.enabled: true</span>
        in your config and mailc automatically validates every compile for WCAG compliance.
      </mc-text>
    </mc-column>
  </mc-section>

  <!-- Conditional badge — only shown when showA11yBadge is truthy -->
  <mc-if condition="showA11yBadge">
    <mc-section class="bg-[#0a0a0a] pt-[20px] px-[32px] pb-0">
      <mc-column>
        <mc-raw>
          <div style="display:inline-block;background:#052e16;border:1px solid #16a34a;border-radius:8px;padding:10px 18px;text-align:center;">
            <span style="font-size:13px;font-weight:700;color:#22c55e;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
              ✓ WCAG AA Compliant
            </span>
            <span style="font-size:12px;color:#4ade80;margin-left:10px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
              All checks passed
            </span>
          </div>
        </mc-raw>
      </mc-column>
    </mc-section>
  </mc-if>

  <!-- A11y check list — single column, all 4 checks stacked -->
  <mc-section class="bg-[#0a0a0a] pt-[20px] px-[32px] pb-0">
    <mc-column>
      <mc-raw>
        <div style="background:#18181b;border-radius:8px;padding:14px 16px;margin-bottom:8px;">
          <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:#052e16;border:1.5px solid #16a34a;text-align:center;line-height:18px;font-size:11px;color:#22c55e;font-weight:700;vertical-align:middle;margin-right:10px;">✓</span>
          <span style="font-size:13px;font-weight:700;color:#ffffff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">{{a11yChecks.0.check}}</span>
          <div style="font-size:12px;color:#71717a;line-height:18px;margin-top:4px;padding-left:30px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">{{a11yChecks.0.note}}</div>
        </div>
        <div style="background:#18181b;border-radius:8px;padding:14px 16px;margin-bottom:8px;">
          <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:#052e16;border:1.5px solid #16a34a;text-align:center;line-height:18px;font-size:11px;color:#22c55e;font-weight:700;vertical-align:middle;margin-right:10px;">✓</span>
          <span style="font-size:13px;font-weight:700;color:#ffffff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">{{a11yChecks.1.check}}</span>
          <div style="font-size:12px;color:#71717a;line-height:18px;margin-top:4px;padding-left:30px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">{{a11yChecks.1.note}}</div>
        </div>
        <div style="background:#18181b;border-radius:8px;padding:14px 16px;margin-bottom:8px;">
          <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:#052e16;border:1.5px solid #16a34a;text-align:center;line-height:18px;font-size:11px;color:#22c55e;font-weight:700;vertical-align:middle;margin-right:10px;">✓</span>
          <span style="font-size:13px;font-weight:700;color:#ffffff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">{{a11yChecks.2.check}}</span>
          <div style="font-size:12px;color:#71717a;line-height:18px;margin-top:4px;padding-left:30px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">{{a11yChecks.2.note}}</div>
        </div>
        <div style="background:#18181b;border-radius:8px;padding:14px 16px;">
          <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:#052e16;border:1.5px solid #16a34a;text-align:center;line-height:18px;font-size:11px;color:#22c55e;font-weight:700;vertical-align:middle;margin-right:10px;">✓</span>
          <span style="font-size:13px;font-weight:700;color:#ffffff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">{{a11yChecks.3.check}}</span>
          <div style="font-size:12px;color:#71717a;line-height:18px;margin-top:4px;padding-left:30px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">{{a11yChecks.3.note}}</div>
        </div>
      </mc-raw>
    </mc-column>
  </mc-section>

  <!-- ═══════════════════════════════════════════════ -->
  <!-- 6 ▸ CTA strip — branded purple gradient         -->
  <!-- ═══════════════════════════════════════════════ -->
  <mc-section class="bg-[#4c1d95] py-[44px] px-[32px]">
    <mc-column>
      <mc-text class="text-center text-[24px] font-extrabold text-[#ffffff] leading-[32px]">
        Ready to ship your brand in every inbox?
      </mc-text>
      <mc-spacer class="h-[10px]" />
      <mc-text class="text-center text-[15px] text-[#c4b5fd] leading-[24px]">
        Define your theme once. Use it everywhere. Free and open source.
      </mc-text>
      <mc-spacer class="h-[24px]" />
      <mc-button
        href="{{hero.ctaUrl}}"
        class="bg-[#ffffff] text-[#4c1d95] py-[14px] px-[36px] text-[15px] font-bold rounded-[8px] text-center"
      >
        Start building for free →
      </mc-button>
    </mc-column>
  </mc-section>

  <!-- ═══════════════════════════════════════════════ -->
  <!-- 7 ▸ Footer                                      -->
  <!-- ═══════════════════════════════════════════════ -->
  <mc-section class="bg-[#18181b] py-[28px] px-[32px]">
    <mc-column>
      <mc-text class="text-center text-[12px] text-[#52525b] leading-[20px]">
        {{brand.company}} · {{meta.year}} · {{meta.version}}
      </mc-text>
      <mc-spacer class="h-[6px]" />
      <mc-text class="text-center text-[12px] text-[#3f3f46]">
        <a href="{{brand.privacyUrl}}" style="color:#52525b;text-decoration:none;">Privacy</a>
        &nbsp;·&nbsp;
        <a href="{{brand.unsubscribeUrl}}" style="color:#52525b;text-decoration:none;">Unsubscribe</a>
        &nbsp;·&nbsp;
        <a href="{{brand.siteUrl}}" style="color:#52525b;text-decoration:none;">{{brand.siteUrl}}</a>
      </mc-text>
    </mc-column>
  </mc-section>

  </mc-body>
</mc>
