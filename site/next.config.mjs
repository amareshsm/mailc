import { createMDX } from 'fumadocs-mdx/next'

const withMDX = createMDX()

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Lint runs via `pnpm lint` separately; skip during build so a missing-return
  // type rule doesn't block production output.
  eslint: { ignoreDuringBuilds: true },
}

export default withMDX(config)
