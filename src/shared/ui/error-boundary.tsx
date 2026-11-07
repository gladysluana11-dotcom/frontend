import { Component, type ErrorInfo, type ReactNode } from 'react'
import { texts } from '../texts'
import { Button } from './button'

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Error no controlado en la interfaz del SGE.', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-5 p-6 text-center">
          <div>
            <h1 className="text-2xl font-bold">
              {texts.states.unexpectedTitle}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {texts.unexpectedError}
            </p>
          </div>
          <Button type="button" onClick={() => window.location.reload()}>
            {texts.states.reload}
          </Button>
        </main>
      )
    }
    return this.props.children
  }
}
