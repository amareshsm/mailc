import type { ReactNode } from 'react'
import { RootProvider } from 'fumadocs-ui/provider'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './global.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata = {
  title: { default: 'mailc — modern email compiler', template: '%s · mailc' },
  description: 'TypeScript-native email compiler. Build, style, and ship emails that work everywhere.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body
        style={{
          fontFamily: 'var(--font-sans), ui-sans-serif, system-ui, sans-serif',
        }}
      >
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  )
}
