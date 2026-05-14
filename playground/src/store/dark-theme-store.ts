import { create } from 'zustand'
import { issuesToEntries, type ConsoleEntry } from '@/lib/console-entries'

export { issuesToEntries }
export type { ConsoleEntry }

// ---------------------------------------------------------------------------
// Default template — demonstrates dark-mode-aware email authoring.
// The @media (prefers-color-scheme: dark) block inside mc-style activates
// in the Dark preview panel because buildPreviewSrcdoc injects
// `:root { color-scheme: dark }` which triggers the media query.
// ---------------------------------------------------------------------------

export const DARK_THEME_DEFAULT_MARKUP = `<mc>
  <mc-head>
    <mc-title>Dark Mode Email Demo</mc-title>
    <mc-preview>See how this email adapts to light and dark themes.</mc-preview>

    <!--
      mc-style injects a raw <style> block into the compiled email's <head>.

      Dark mode strategy: mailc compiles Tailwind classes into both
      inline style="..." and bgcolor="..." attributes on table elements.
      The @media (prefers-color-scheme: dark) block below targets the
      bgcolor attributes to flip background colours with !important —
      a technique that works in Apple Mail, iOS Mail, and Samsung Email.

      In the playground the Dark panel simulates this by injecting
      :root { color-scheme: dark } into the iframe, which activates
      this media query so you can see both views side-by-side.
    -->
    <mc-style>
      @media (prefers-color-scheme: dark) {
        /* Outer email wrapper */
        body { background-color: #1c1c1e !important; }

        /* White card sections → dark card */
        [bgcolor="#ffffff"] { background-color: #2c2c2e !important; }

        /* Light grey sections → near-black */
        [bgcolor="#f8fafc"],
        [bgcolor="#f1f5f9"] { background-color: #1c1c1e !important; }

        /* Divider line */
        .border-slate-200 { border-color: #3a3a3c !important; }
      }
    </mc-style>
  </mc-head>

  <!--
    All styling uses Tailwind utility classes (class mode).
    No CSS attribute props (color=, font-size=, padding=, etc.) are used
    because the playground compiles in class mode by default.
  -->
  <mc-body class="bg-[#f1f5f9]">

    <!-- ── Dark header — stays dark in both modes ──────────────────────── -->
    <mc-section class="bg-slate-900 py-7 px-10">
      <mc-column>
        <mc-text class="text-[13px] font-bold text-sky-400 pb-2">
          DARK MODE DEMO
        </mc-text>
        <mc-text class="text-2xl font-bold text-slate-50 leading-8">
          Side-by-side preview 🌗
        </mc-text>
        <mc-text class="text-[13px] text-slate-400 pt-1.5">
          Light on the left · Dark on the right
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- ── Main card — white in light, dark in dark ─────────────────────── -->
    <!--
      bg-white compiles to bgcolor="#ffffff" on the section table.
      The mc-style rule [bgcolor="#ffffff"] flips it to #2c2c2e in dark mode.
    -->
    <mc-section class="bg-white pt-9 px-10 pb-7">
      <mc-column>
        <mc-text class="text-[22px] font-bold text-slate-900 pb-3">
          Hello, dark mode! 🌙
        </mc-text>
        <mc-text class="text-sm text-slate-600 leading-[22px] pb-3">
          This email is <strong>dark-mode aware</strong>. Open it in Apple Mail,
          iOS Mail, or Samsung Email with the OS in dark mode and the section
          backgrounds automatically adapt — no images swapped, no JavaScript.
        </mc-text>
        <mc-text class="text-sm text-slate-600 leading-[22px] pb-6">
          The trick: <strong>@media (prefers-color-scheme: dark)</strong> inside
          mc-style targets the compiled bgcolor attributes (e.g.
          [bgcolor="#ffffff"]) and overrides them with !important.
          The playground simulates this in the Dark panel by injecting
          :root { color-scheme: dark } into the iframe.
        </mc-text>
        <mc-button href="https://mailc.dev" class="bg-blue-600 text-white text-sm font-bold rounded-md px-6 py-3">
          Learn more about mailc
        </mc-button>
      </mc-column>
    </mc-section>

    <!-- ── Two-column feature row ────────────────────────────────────────── -->
    <!--
      bg-slate-50 compiles to bgcolor="#f8fafc".
      The mc-style rule [bgcolor="#f8fafc"] flips it to #1c1c1e in dark mode.
    -->
    <mc-section class="bg-slate-50 p-6">
      <mc-column class="px-2">
        <mc-text class="text-[15px] font-bold text-slate-900 pb-1">
          ☀️ Light mode
        </mc-text>
        <mc-text class="text-[13px] text-slate-500 leading-5">
          White card on light grey. The Tailwind classes are compiled to
          inline styles — light email clients render them natively.
        </mc-text>
      </mc-column>
      <mc-column class="px-2">
        <mc-text class="text-[15px] font-bold text-slate-900 pb-1">
          🌙 Dark mode
        </mc-text>
        <mc-text class="text-[13px] text-slate-500 leading-5">
          The bgcolor overrides in mc-style kick in. Section backgrounds
          flip to dark — toggle the Dark panel to see the difference.
        </mc-text>
      </mc-column>
    </mc-section>

    <!-- ── Footer ────────────────────────────────────────────────────────── -->
    <mc-section class="pt-5 px-10 pb-7">
      <mc-column>
        <mc-divider class="border-slate-200" />
        <mc-text class="text-[11px] text-zinc-400 text-center pt-3">
          Built with mailc — edit the mc-style block above to experiment
        </mc-text>
      </mc-column>
    </mc-section>

  </mc-body>
</mc>`

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface DarkThemeState {
  markupCode: string
  compiledHtml: string | null
  compileTimeMs: number
  consoleEntries: ConsoleEntry[]

  setMarkupCode: (code: string) => void
  setCompiledHtml: (html: string | null) => void
  setCompileTimeMs: (ms: number) => void
  setConsoleEntries: (entries: ConsoleEntry[]) => void
}

export const useDarkThemeStore = create<DarkThemeState>((set) => ({
  markupCode: DARK_THEME_DEFAULT_MARKUP,
  compiledHtml: null,
  compileTimeMs: 0,
  consoleEntries: [],

  setMarkupCode: (code) => set({ markupCode: code }),
  setCompiledHtml: (html) => set({ compiledHtml: html }),
  setCompileTimeMs: (ms) => set({ compileTimeMs: ms }),
  setConsoleEntries: (entries) => set({ consoleEntries: entries }),
}))
