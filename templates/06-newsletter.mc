<mc>
  <mc-head>
    <mc-title>mailc Weekly #{{issue.number}} — {{issue.headline}}</mc-title>
    <mc-preview>{{issue.previewText}}</mc-preview>
    <mc-attributes>
      <mc-all font-family="Georgia, 'Times New Roman', serif" />
      <mc-text font-size="15px" line-height="24px" color="#1a1a1a" />
    </mc-attributes>
  </mc-head>
  <mc-body class="bg-[#fafaf9]">

    <!-- Masthead -->
    <mc-section class="bg-[#1a1a1a] py-[20px] px-[24px]">
      <mc-column width="60%">
        <mc-text class="text-[20px] font-bold text-[#ffffff]">
          mailc Weekly
        </mc-text>
        <mc-text class="text-[12px] text-[#a8a29e] pt-[2px]">
          Issue #{{issue.number}} · {{issue.date}}
        </mc-text>
      </mc-column>
      <mc-column width="40%">
        <mc-text class="text-[12px] text-[#a8a29e] text-right pt-[6px]">
          Hi {{user.firstName}} 👋
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- Hero headline -->
    <mc-section class="bg-[#ffffff] pt-[32px] px-[24px] pb-[24px]">
      <mc-column>
        <mc-text class="text-[11px] font-bold text-[#78716c] tracking-[1px]">
          THIS WEEK
        </mc-text>
        <mc-text class="text-[28px] font-bold text-[#1a1a1a] pt-[8px] leading-[36px]">
          {{issue.headline}}
        </mc-text>
        <mc-divider class="border-[#e7e5e4] pt-[20px]" />
      </mc-column>
    </mc-section>

    <!-- Articles loop -->
    <mc-each items="articles" as="article" index="i">
      <mc-section class="bg-[#ffffff] py-[20px] px-[24px]">
        <mc-column>
          <!-- Free articles (proOnly is false/absent) -->
          <mc-if condition="article.isFree">
            <mc-text class="text-[10px] font-bold text-[#059669] tracking-[1px]">
              FREE · {{article.category}}
            </mc-text>
            <mc-text class="text-[18px] font-bold text-[#1a1a1a] pt-[6px] leading-[26px]">
              {{article.title}}
            </mc-text>
            <mc-text class="text-[14px] text-[#57534e] pt-[8px] leading-[22px]">
              {{article.summary}}
            </mc-text>
            <mc-text class="text-[12px] text-[#a8a29e] pt-[8px]">
              {{article.readTime}}
            </mc-text>
            <mc-button
              href="{{article.url}}"
              class="bg-[#1a1a1a] text-[#ffffff] rounded-[4px] py-[10px] px-[20px] text-[13px] font-bold mt-[12px]"
            >
              Read article →
            </mc-button>
          </mc-if>

          <!-- Pro articles user can access -->
          <mc-if condition="article.showFull">
            <mc-text class="text-[10px] font-bold text-[#7c3aed] tracking-[1px]">
              💎 PRO · {{article.category}}
            </mc-text>
            <mc-text class="text-[18px] font-bold text-[#1a1a1a] pt-[6px] leading-[26px]">
              {{article.title}}
            </mc-text>
            <mc-text class="text-[14px] text-[#57534e] pt-[8px] leading-[22px]">
              {{article.summary}}
            </mc-text>
            <mc-text class="text-[12px] text-[#a8a29e] pt-[8px]">
              {{article.readTime}}
            </mc-text>
            <mc-button
              href="{{article.url}}"
              class="bg-[#7c3aed] text-[#ffffff] rounded-[4px] py-[10px] px-[20px] text-[13px] font-bold mt-[12px]"
            >
              Read article →
            </mc-button>
          </mc-if>

          <!-- Pro articles user cannot access (teaser) -->
          <mc-if condition="article.showTeaser">
            <mc-text class="text-[10px] font-bold text-[#7c3aed] tracking-[1px]">
              🔒 PRO ONLY · {{article.category}}
            </mc-text>
            <mc-text class="text-[18px] font-bold text-[#a8a29e] pt-[6px] leading-[26px]">
              {{article.title}}
            </mc-text>
            <mc-text class="text-[13px] text-[#a8a29e] pt-[8px] italic">
              This article is available to Pro subscribers. Upgrade to read the full piece.
            </mc-text>
            <mc-button
              href="https://mailcraft.dev/upgrade"
              class="bg-[#f5f5f4] text-[#7c3aed] rounded-[4px] py-[10px] px-[20px] text-[13px] font-bold mt-[12px]"
            >
              Upgrade to Pro →
            </mc-button>
          </mc-if>

          <mc-divider class="border-[#f5f5f4] pt-[16px]" />
        </mc-column>
      </mc-section>
    </mc-each>

    <!-- Sponsor block -->
    <mc-section class="bg-[#fef9c3] py-[20px] px-[24px]">
      <mc-column>
        <mc-text class="text-[10px] font-bold text-[#92400e] tracking-[1px]">
          SPONSOR
        </mc-text>
        <mc-text class="text-[16px] font-bold text-[#78350f] pt-[6px]">
          {{sponsor.name}}
        </mc-text>
        <mc-text class="text-[13px] text-[#92400e] pt-[6px] leading-[20px]">
          {{sponsor.copy}}
        </mc-text>
        <mc-button
          href="{{sponsor.url}}"
          class="bg-[#d97706] text-[#ffffff] rounded-[4px] py-[10px] px-[20px] text-[13px] font-bold mt-[12px]"
        >
          {{sponsor.cta}}
        </mc-button>
      </mc-column>
    </mc-section>

    <!-- Quick links -->
    <mc-section class="bg-[#ffffff] p-[24px]">
      <mc-column>
        <mc-text class="text-[13px] font-bold text-[#1a1a1a]">
          ⚡ Quick Links
        </mc-text>
        <mc-spacer class="h-[8px]" />
        <mc-each items="quickLinks" as="link">
          <mc-text class="text-[13px] text-[#57534e] pt-[6px]">
            {{link.label}}
          </mc-text>
          <mc-button
            href="{{link.url}}"
            class="bg-[#f5f5f4] text-[#1a1a1a] rounded-[4px] py-[6px] px-[14px] text-[12px]"
          >
            Read →
          </mc-button>
        </mc-each>
      </mc-column>
    </mc-section>

    <!-- Upgrade banner — only for non-pro -->
    <mc-if condition="showUpgradeBar">
      <mc-section class="bg-[#7c3aed] py-[28px] px-[24px]">
        <mc-column>
          <mc-text class="text-center text-[17px] font-bold text-[#ffffff]">
            You're missing {{proArticleCount}} Pro articles in this issue
          </mc-text>
          <mc-text class="text-center text-[13px] text-[#ddd6fe] pt-[6px]">
            Upgrade for $9/mo and get full access to every article, forever.
          </mc-text>
          <mc-spacer class="h-[16px]" />
          <mc-button
            href="https://mailcraft.dev/upgrade"
            class="bg-[#ffffff] text-[#7c3aed] rounded-[4px] py-[12px] px-[24px] text-[14px] font-bold"
          >
            Upgrade to Pro — $9/mo
          </mc-button>
        </mc-column>
      </mc-section>
    </mc-if>

    <!-- Footer -->
    <mc-section class="p-[24px]">
      <mc-column>
        <mc-text class="text-center text-[11px] text-[#a8a29e] leading-[18px]">
          mailc Weekly · Sent to {{user.email}}
        </mc-text>
        <mc-spacer class="h-[8px]" />
        <mc-button
          href="https://mailcraft.dev/unsubscribe"
          class="bg-transparent text-[#a8a29e] rounded-[4px] py-[6px] px-[14px] text-[11px]"
        >
          Unsubscribe
        </mc-button>
      </mc-column>
    </mc-section>

</mc-body>
</mc>
