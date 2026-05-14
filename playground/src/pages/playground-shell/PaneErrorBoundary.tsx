/**
 * PaneErrorBoundary — last-resort guard around the splitkit `LayoutRoot`.
 *
 * If any tab throws during render (bad source-map shape, unexpected null,
 * etc.), this catches it and shows a recoverable fallback instead of
 * white-screening the whole pane. Reload uses `window.location.reload()`
 * because resetting the boundary alone won't re-mount the failing tab's
 * subtree if the error came from a stale cached store value.
 */
import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class PaneErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[playground] tab render crashed:', error, info)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleDismiss = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-4 px-6 py-10 bg-card text-center">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
        <div className="max-w-md">
          <p className="text-sm font-semibold text-foreground mb-1">
            Something went wrong rendering this pane.
          </p>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            {error.message || 'An unexpected error occurred.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={this.handleDismiss}
            className="px-3 h-7 rounded-md text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={this.handleReload}
            className="flex items-center gap-1.5 px-3 h-7 rounded-md text-[12px] bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="h-3 w-3" />
            Reload
          </button>
        </div>
      </div>
    )
  }
}
