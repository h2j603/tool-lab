import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught', error, info)
  }

  reset = () => this.setState({ error: null })

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error, this.reset)
      return (
        <div className="flex flex-col items-center justify-center h-full text-sm text-neutral-700 p-8">
          <div className="font-semibold mb-2">Canvas failed to render.</div>
          <div className="text-xs font-mono text-neutral-500 mb-4 max-w-lg text-center">
            {this.state.error.message}
          </div>
          <button
            onClick={this.reset}
            className="px-3 py-1.5 bg-black text-white text-xs rounded hover:bg-neutral-800"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
