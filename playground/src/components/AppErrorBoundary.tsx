/**
 * AppErrorBoundary — top-level catch-all wrapping the entire route tree.
 *
 * The playground's pane shell has its own scoped boundary; this one is the
 * final safety net for everything else (landing, marketplace, builder, etc.).
 * On crash we show a centered fallback with reload + go-home, and reset the
 * boundary state on route changes so a single bad route doesn't permanently
 * break the rest of the app.
 */
import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  pathname: string
}

interface State {
  error: Error | null
  capturedAt: string | null
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null, capturedAt: null }

  static getDerivedStateFromError(error: Error): State {
    return { error, capturedAt: window.location.pathname }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[app] uncaught render error:', error, info)
  }

  componentDidUpdate(prevProps: Props) {
    if (
      this.state.error &&
      prevProps.pathname !== this.props.pathname &&
      this.props.pathname !== this.state.capturedAt
    ) {
      this.setState({ error: null, capturedAt: null })
    }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div
        className="h-screen w-screen flex flex-col items-center justify-center gap-5 px-6 text-center bg-background"
      >
        <AlertTriangle className="h-10 w-10 text-amber-500" />
        <div className="max-w-md">
          <p className="text-base font-semibold text-foreground mb-1">
            Something went wrong.
          </p>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            {error.message || 'An unexpected error occurred while rendering this page.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/"
            className="px-4 h-8 inline-flex items-center rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Go home
          </a>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 px-4 h-8 rounded-md text-[13px] bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reload
          </button>
        </div>
      </div>
    )
  }
}
