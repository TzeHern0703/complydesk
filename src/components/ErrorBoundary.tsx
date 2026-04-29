import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
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
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center p-8">
          <div className="max-w-md text-center space-y-4">
            <p className="text-neutral-900 font-medium">Something went wrong</p>
            <p className="text-sm text-neutral-500">{this.state.error.message}</p>
            <button
              onClick={() => this.setState({ error: null })}
              className="text-sm underline underline-offset-2 text-neutral-500 hover:text-neutral-900"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
