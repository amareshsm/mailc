import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'

import { NavBar } from '@/components/layout/NavBar'
import { LandingPage } from '@/pages/LandingPage'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppErrorBoundary } from '@/components/AppErrorBoundary'

// ─── Heavy routes (lazy) ─────────────────────────────────────────────────
// Each lazy() call creates a separate Vite chunk so the templates registry
// (with all template markup) is NOT bundled into the main JS file.

const BuilderPage = lazy(() =>
  import('@/pages/BuilderPage').then((m) => ({ default: m.BuilderPage }))
)
const ThemePlayground = lazy(() =>
  import('@/pages/style/ThemePageWrapper').then((m) => ({ default: m.ThemePageWrapper }))
)
const ClassThemePlayground = lazy(() =>
  import('@/components/class-theme/ClassThemePlayground').then((m) => ({ default: m.ClassThemePlayground }))
)
const DynamicEmailsPage = lazy(() =>
  import('@/components/dynamic-emails/DynamicEmailsPage').then((m) => ({ default: m.DynamicEmailsPage }))
)
const SandboxPage = lazy(() =>
  import('@/components/sandbox/SandboxPage').then((m) => ({ default: m.SandboxPage }))
)
const PlaygroundPage = lazy(() =>
  import('@/components/playground/PlaygroundPage').then((m) => ({ default: m.PlaygroundPage }))
)
const JsonPlaygroundPage = lazy(() =>
  import('@/components/json-playground/JsonPlaygroundPage').then((m) => ({ default: m.JsonPlaygroundPage }))
)
const ConfigGeneratorPage = lazy(() =>
  import('@/pages/build/ConfigGeneratorPage').then((m) => ({ default: m.ConfigGeneratorPage }))
)
const DarkThemePage = lazy(() =>
  import('@/components/dark-theme/DarkThemePage').then((m) => ({ default: m.DarkThemePage }))
)
const JsonBuilderPage = lazy(() =>
  import('@/components/json-builder/JsonBuilderPage').then((m) => ({ default: m.JsonBuilderPage }))
)
const MarketplaceLanding = lazy(() =>
  import('@/pages/marketplace/MarketplaceLanding').then((m) => ({ default: m.MarketplaceLanding }))
)
const MarketplaceBrandDetail = lazy(() =>
  import('@/pages/marketplace/MarketplaceBrandDetail').then((m) => ({ default: m.MarketplaceBrandDetail }))
)
const MarketplaceComponents = lazy(() =>
  import('@/pages/marketplace/MarketplaceComponents').then((m) => ({ default: m.MarketplaceComponents }))
)
const MarketplaceEmails = lazy(() =>
  import('@/pages/marketplace/MarketplaceEmails').then((m) => ({ default: m.MarketplaceEmails }))
)
const MarketplaceEmailDetail = lazy(() =>
  import('@/pages/marketplace/MarketplaceEmailDetail').then((m) => ({ default: m.MarketplaceEmailDetail }))
)
const IntrospectLanding = lazy(() =>
  import('@/pages/introspect/IntrospectLanding').then((m) => ({ default: m.IntrospectLanding }))
)
const ValidateSandbox = lazy(() =>
  import('@/pages/introspect/ValidateSandbox').then((m) => ({ default: m.ValidateSandbox }))
)
const ComponentExplorer = lazy(() =>
  import('@/pages/introspect/ComponentExplorer').then((m) => ({ default: m.ComponentExplorer }))
)
const NestingMatrix = lazy(() =>
  import('@/pages/introspect/NestingMatrix').then((m) => ({ default: m.NestingMatrix }))
)
const DataContractAnalyzer = lazy(() =>
  import('@/pages/introspect/DataContractAnalyzer').then((m) => ({ default: m.DataContractAnalyzer }))
)
const OutputExplorer = lazy(() =>
  import('@/pages/introspect/OutputExplorer').then((m) => ({ default: m.OutputExplorer }))
)

// ─── New pages (Phase 1) ─────────────────────────────────────────────────
const StyleCompatibilityPage = lazy(() =>
  import('@/pages/style/StyleCompatibility').then((m) => ({ default: m.StyleCompatibility }))
)
const StyleA11yPage = lazy(() =>
  import('@/pages/style/StyleA11y').then((m) => ({ default: m.StyleA11y }))
)
const StyleModesCompare = lazy(() =>
  import('@/pages/style/StyleModesCompare').then((m) => ({ default: m.StyleModesCompare }))
)
const McpPage = lazy(() =>
  import('@/pages/extend/McpPage').then((m) => ({ default: m.McpPage }))
)
const BucketLanding = lazy(() =>
  import('@/pages/BucketLanding').then((m) => ({ default: m.BucketLanding }))
)
const Tour = lazy(() =>
  import('@/pages/Tour').then((m) => ({ default: m.Tour }))
)

/** Full-screen spinner shown while a lazy route chunk is downloading. */
function RouteLoader() {
  return (
    <div className="flex-1 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <svg
          className="animate-spin h-8 w-8"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <span className="text-sm">Loading…</span>
      </div>
    </div>
  )
}

export default function App() {
  const location = useLocation()
  // Visual JSON builder still owns its full chrome; the markup builder now
  // sits under the global NavBar with a slim builder toolbar below.
  const isBuilder =
    location.pathname === '/build/visual-json' ||
    location.pathname === '/json'

  return (
    <TooltipProvider>
      <AppErrorBoundary pathname={location.pathname}>
        <AnimatePresence mode="wait">
        <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
          {!isBuilder && <NavBar />}
          <div className="flex-1 flex overflow-hidden">
            <Suspense fallback={<RouteLoader />}>
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={<LandingPage />} />

                {/* ── Bucket landings ─────────────────────────────────── */}
                <Route path="/build" element={<BucketLanding bucketId="build" />} />
                <Route path="/style" element={<BucketLanding bucketId="style" />} />
                <Route path="/extend" element={<BucketLanding bucketId="extend" />} />

                {/* ── Tour ─────────────────────────────────────────────── */}
                <Route path="/tour" element={<Tour />} />

                {/* ── Build bucket ─────────────────────────────────────── */}
                <Route path="/build/visual" element={<BuilderPage />} />
                <Route path="/build/code" element={<PlaygroundPage />} />
                <Route path="/build/json" element={<JsonPlaygroundPage />} />
                <Route path="/build/templating" element={<DynamicEmailsPage />} />
                <Route path="/build/config" element={<ConfigGeneratorPage />} />
                <Route path="/build/visual-json" element={<JsonBuilderPage />} />
                <Route path="/build/sandbox" element={<SandboxPage />} />

                {/* ── Style bucket ─────────────────────────────────────── */}
                <Route path="/style/theme" element={<ThemePlayground />} />
                <Route path="/style/class" element={<ClassThemePlayground />} />
                <Route path="/style/modes" element={<StyleModesCompare />} />
                <Route path="/style/compatibility" element={<StyleCompatibilityPage />} />
                <Route path="/style/a11y" element={<StyleA11yPage />} />
                <Route path="/style/dark-mode" element={<DarkThemePage />} />

                {/* ── Extend bucket ────────────────────────────────────── */}
                <Route path="/extend/plugins" element={<MarketplaceLanding />} />
                <Route path="/extend/plugins/:brand" element={<MarketplaceBrandDetail />} />
                <Route path="/extend/plugins/:brand/components" element={<MarketplaceComponents />} />
                <Route path="/extend/plugins/:brand/emails" element={<MarketplaceEmails />} />
                <Route path="/extend/plugins/:brand/emails/:slug" element={<MarketplaceEmailDetail />} />
                {/* Legacy redirects (default to acme) */}
                <Route path="/extend/plugins/components" element={<Navigate to="/extend/plugins/acme/components" replace />} />
                <Route path="/extend/plugins/emails" element={<Navigate to="/extend/plugins/acme/emails" replace />} />
                <Route path="/extend/introspect" element={<IntrospectLanding />} />
                <Route path="/extend/introspect/validate" element={<ValidateSandbox />} />
                <Route path="/extend/introspect/components" element={<ComponentExplorer />} />
                <Route path="/extend/introspect/nesting" element={<NestingMatrix />} />
                <Route path="/extend/introspect/data" element={<DataContractAnalyzer />} />
                <Route path="/extend/introspect/output" element={<OutputExplorer />} />
                <Route path="/extend/mcp" element={<McpPage />} />

                {/* ── Legacy redirects (keep external links working) ───── */}
                <Route path="/builder" element={<Navigate to="/build/visual" replace />} />
                <Route path="/playground" element={<Navigate to="/build/code" replace />} />
                <Route path="/sandbox" element={<Navigate to="/build/sandbox" replace />} />
                <Route path="/json" element={<Navigate to="/build/visual-json" replace />} />
                <Route path="/json-playground" element={<Navigate to="/build/json" replace />} />
                <Route path="/dynamic-emails" element={<Navigate to="/build/templating" replace />} />
                <Route path="/brand-theme-attribute" element={<Navigate to="/style/theme" replace />} />
                <Route path="/brand-theme-class" element={<Navigate to="/style/class" replace />} />
                <Route path="/dark-theme" element={<Navigate to="/style/dark-mode" replace />} />
                <Route path="/marketplace" element={<Navigate to="/extend/plugins" replace />} />
                <Route path="/marketplace/components" element={<Navigate to="/extend/plugins/acme/components" replace />} />
                <Route path="/marketplace/emails" element={<Navigate to="/extend/plugins/acme/emails" replace />} />
                <Route path="/marketplace/emails/:slug" element={<Navigate to="/extend/plugins/acme" replace />} />
                <Route path="/introspect" element={<Navigate to="/extend/introspect" replace />} />
                <Route path="/introspect/validate" element={<Navigate to="/extend/introspect/validate" replace />} />
                <Route path="/introspect/components" element={<Navigate to="/extend/introspect/components" replace />} />
                <Route path="/introspect/nesting" element={<Navigate to="/extend/introspect/nesting" replace />} />
                <Route path="/introspect/data" element={<Navigate to="/extend/introspect/data" replace />} />
              </Routes>
            </Suspense>
          </div>
        </div>
      </AnimatePresence>
      </AppErrorBoundary>
    </TooltipProvider>
  )
}
