/**
 * Welcome-email starter template.
 *
 * Loaded into the visual builder on first visit so the canvas isn't empty.
 * Users can clear it (delete sections), or click "Load demo" again to reset.
 */

import type { EmailComponent } from '@/types/email'
import { generateId } from '@/lib/id'

const STORAGE_KEY = 'mailc-builder-demo-loaded'

export function hasLoadedStarter(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(STORAGE_KEY) === '1'
}

export function markStarterLoaded(): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, '1')
}

export function loadStarterTemplate(): EmailComponent[] {
  return [
    // Hero section
    {
      id: generateId(),
      type: 'mc-section',
      attributes: {
        'padding': '40px 24px',
        'background-color': '#0f172a',
      },
      children: [
        {
          id: generateId(),
          type: 'mc-column',
          attributes: { padding: '0' },
          children: [
            {
              id: generateId(),
              type: 'mc-text',
              attributes: {
                'color': '#a78bfa',
                'font-size': '12px',
                'font-weight': '600',
                'font-family': 'Arial, sans-serif',
                'align': 'center',
                'padding': '0 0 8px',
                'line-height': '1.4',
              },
              content: 'WELCOME TO MAILC',
            },
            {
              id: generateId(),
              type: 'mc-text',
              attributes: {
                'color': '#ffffff',
                'font-size': '32px',
                'font-weight': '700',
                'font-family': 'Arial, sans-serif',
                'align': 'center',
                'line-height': '1.2',
                'padding': '0 0 12px',
              },
              content: 'Build emails that just work',
            },
            {
              id: generateId(),
              type: 'mc-text',
              attributes: {
                'color': '#cbd5e1',
                'font-size': '15px',
                'font-family': 'Arial, sans-serif',
                'align': 'center',
                'line-height': '1.6',
                'padding': '0 24px 24px',
              },
              content: 'A modern email compiler with source maps, an introspection API, and an AI-friendly component model.',
            },
            {
              id: generateId(),
              type: 'mc-button',
              attributes: {
                'href': 'https://example.com/get-started',
                'background-color': '#ffffff',
                'color': '#0f172a',
                'font-size': '14px',
                'font-weight': '600',
                'font-family': 'Arial, sans-serif',
                'border-radius': '8px',
                'padding': '0',
                'inner-padding': '12px 28px',
              },
              content: 'Get started →',
            },
          ],
        },
      ],
    },

    // Two-column features
    {
      id: generateId(),
      type: 'mc-section',
      attributes: {
        'padding': '40px 24px',
        'background-color': '#ffffff',
      },
      children: [
        {
          id: generateId(),
          type: 'mc-column',
          attributes: { padding: '0 12px' },
          children: [
            {
              id: generateId(),
              type: 'mc-text',
              attributes: {
                'color': '#0f172a',
                'font-size': '18px',
                'font-weight': '700',
                'font-family': 'Arial, sans-serif',
                'padding': '0 0 8px',
              },
              content: 'Source maps',
            },
            {
              id: generateId(),
              type: 'mc-text',
              attributes: {
                'color': '#475569',
                'font-size': '14px',
                'font-family': 'Arial, sans-serif',
                'line-height': '1.6',
                'padding': '0',
              },
              content: 'Click any element in the preview to jump to the markup that produced it. Bidirectional, free.',
            },
          ],
        },
        {
          id: generateId(),
          type: 'mc-column',
          attributes: { padding: '0 12px' },
          children: [
            {
              id: generateId(),
              type: 'mc-text',
              attributes: {
                'color': '#0f172a',
                'font-size': '18px',
                'font-weight': '700',
                'font-family': 'Arial, sans-serif',
                'padding': '0 0 8px',
              },
              content: 'Plugin API',
            },
            {
              id: generateId(),
              type: 'mc-text',
              attributes: {
                'color': '#475569',
                'font-size': '14px',
                'font-family': 'Arial, sans-serif',
                'line-height': '1.6',
                'padding': '0',
              },
              content: 'defineComponent() to ship reusable, themed blocks across emails. Validates against the registry.',
            },
          ],
        },
      ],
    },

    // Divider + footer
    {
      id: generateId(),
      type: 'mc-section',
      attributes: { 'padding': '0 24px', 'background-color': '#ffffff' },
      children: [
        {
          id: generateId(),
          type: 'mc-column',
          attributes: { padding: '0' },
          children: [
            {
              id: generateId(),
              type: 'mc-divider',
              attributes: {
                'border-color': '#e2e8f0',
                'border-width': '1px',
                'border-style': 'solid',
                'padding': '0',
              },
            },
          ],
        },
      ],
    },
    {
      id: generateId(),
      type: 'mc-section',
      attributes: { 'padding': '24px', 'background-color': '#ffffff' },
      children: [
        {
          id: generateId(),
          type: 'mc-column',
          attributes: { padding: '0' },
          children: [
            {
              id: generateId(),
              type: 'mc-text',
              attributes: {
                'color': '#94a3b8',
                'font-size': '12px',
                'font-family': 'Arial, sans-serif',
                'align': 'center',
                'line-height': '1.6',
                'padding': '0',
              },
              content: '© 2026 mailc · You\'re receiving this because you signed up for the playground.',
            },
          ],
        },
      ],
    },
  ]
}
