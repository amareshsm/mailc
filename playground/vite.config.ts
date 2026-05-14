import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// The playground is the host app — it serves at `/` directly. The docs
// (Next.js) run on a separate port internally and are reached through Vite's
// dev-server proxy below, so users only ever visit one URL (Vite's port).
//
// Production mirrors this: Vercel routes `/docs/*` to the docs project and
// everything else to this playground. URL shape is identical in dev and prod.
const DOCS_DEV_ORIGIN = 'http://localhost:3000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    // js-beautify is required by mailc's formatter (optional dep).
    // Explicitly include it so Vite pre-bundles it for browser use.
    include: ['js-beautify'],
  },
  server: {
    proxy: {
      // /docs/* — the docs MDX pages (Next.js routes)
      '/docs': { target: DOCS_DEV_ORIGIN, changeOrigin: true },
      // /_next/* — Next.js bundled assets (chunks, fonts, CSS)
      '/_next': { target: DOCS_DEV_ORIGIN, changeOrigin: true },
      // /api/search — the docs Orama search API
      '/api/search': { target: DOCS_DEV_ORIGIN, changeOrigin: true },
    },
  },
})
