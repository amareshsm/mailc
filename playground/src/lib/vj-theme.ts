/**
 * Visual-JSON theme hook.
 *
 * Returns inline CSS custom properties for @visual-json/react's `--vj-*`
 * variables, matched to the playground's current light/dark theme.
 * Uses hardcoded values (not CSS var() references) so the library's inline
 * styles resolve correctly regardless of Tailwind's CSS variable chain.
 */
import { useThemeStore } from '@/lib/theme'

const DARK_THEME: React.CSSProperties = {
  '--vj-bg': '#111113',
  '--vj-bg-panel': '#0a0a0c',
  '--vj-bg-hover': '#18181b',
  '--vj-bg-selected': 'rgba(59,130,246,0.18)',
  '--vj-bg-selected-muted': '#18181b',
  '--vj-bg-match': 'rgba(234,179,8,0.15)',
  '--vj-bg-match-active': 'rgba(234,179,8,0.28)',
  '--vj-border': '#27272a',
  '--vj-border-subtle': '#1f1f22',
  '--vj-text': '#fafafa',
  '--vj-text-muted': '#a1a1aa',
  '--vj-text-dim': '#71717a',
  '--vj-text-dimmer': '#52525b',
  '--vj-text-selected': '#fafafa',
  '--vj-input-bg': '#18181b',
  '--vj-input-border': '#3f3f46',
  '--vj-accent': '#3b82f6',
  '--vj-accent-muted': 'rgba(59,130,246,0.15)',
  '--vj-string': '#a1a1aa',
  '--vj-number': '#fafafa',
  '--vj-boolean': '#fafafa',
  '--vj-error': '#f87171',
  '--vj-font': 'ui-monospace, "Cascadia Code", "Fira Code", monospace',
  '--vj-input-font-size': '12px',
} as React.CSSProperties

const LIGHT_THEME: React.CSSProperties = {
  '--vj-bg': '#ffffff',
  '--vj-bg-panel': '#f8f8fa',
  '--vj-bg-hover': '#e8e8eb',
  '--vj-bg-selected': 'rgba(59,130,246,0.12)',
  '--vj-bg-selected-muted': '#f0f0f2',
  '--vj-bg-match': 'rgba(234,179,8,0.15)',
  '--vj-bg-match-active': 'rgba(234,179,8,0.28)',
  '--vj-border': '#e4e4e7',
  '--vj-border-subtle': '#f0f0f2',
  '--vj-text': '#09090b',
  '--vj-text-muted': '#71717a',
  '--vj-text-dim': '#a1a1aa',
  '--vj-text-dimmer': '#d4d4d8',
  '--vj-text-selected': '#09090b',
  '--vj-input-bg': '#f4f4f5',
  '--vj-input-border': '#d4d4d8',
  '--vj-accent': '#3b82f6',
  '--vj-accent-muted': 'rgba(59,130,246,0.1)',
  '--vj-string': '#71717a',
  '--vj-number': '#09090b',
  '--vj-boolean': '#09090b',
  '--vj-error': '#dc2626',
  '--vj-font': 'ui-monospace, "Cascadia Code", "Fira Code", monospace',
  '--vj-input-font-size': '12px',
} as React.CSSProperties

export function useVjTheme(): React.CSSProperties {
  const theme = useThemeStore((s) => s.theme)
  return theme === 'light' ? LIGHT_THEME : DARK_THEME
}
