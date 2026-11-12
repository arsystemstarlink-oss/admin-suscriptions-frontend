import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled application error', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main
        role="alert"
        className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center text-foreground"
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Algo salió mal</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          La aplicación encontró un problema inesperado. Tus datos guardados no se han eliminado.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button type="button" onClick={() => window.location.reload()}>
            <RefreshCw />
            Recargar aplicación
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => window.location.assign(import.meta.env.BASE_URL)}
          >
            <Home />
            Ir al inicio
          </Button>
        </div>
        {this.state.error?.message && (
          <details className="mt-6 max-w-md text-left text-xs text-muted-foreground">
            <summary className="cursor-pointer">Ver detalle técnico</summary>
            <code className="mt-2 block break-words rounded-lg bg-muted p-3">{this.state.error.message}</code>
          </details>
        )}
      </main>
    )
  }
}
