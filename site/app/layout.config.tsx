import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'

/**
 * Shared layout config — used by both the docs layout and the home (marketing) layout.
 * Matches the playground's NavBar identity (logo + nav links + GitHub CTA).
 */
export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <span className="flex items-center gap-2">
        <span
          className="flex items-center justify-center"
          style={{
            width: 24,
            height: 24,
            borderRadius: 7,
            background: 'var(--surface-2)',
            border: '1px solid var(--border-strong)',
            color: 'var(--accent)',
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="1" y="3" width="14" height="10" rx="1.5" />
            <path d="M1.5 5.5L8 9.5L14.5 5.5" />
            <path d="M4.5 10.5 L3 12 L4.5 13.5" strokeWidth="1.25" />
            <path d="M11.5 10.5 L13 12 L11.5 13.5" strokeWidth="1.25" />
          </svg>
        </span>
        <span className="font-semibold tracking-tight">mailc</span>
        <span
          className="hidden sm:inline-block text-[9.5px] font-mono uppercase tracking-wider px-2 py-0.5"
          style={{
            borderRadius: 999,
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            color: 'var(--fg-dim)',
          }}
        >
          v0.1 · beta
        </span>
      </span>
    ),
  },
  links: [
    { text: 'Docs', url: '/docs' },
    { text: 'Blog', url: '/blog' },
    { text: 'Playground', url: '/', external: true },
  ],
  githubUrl: 'https://github.com/anthropics/mailc',
}
