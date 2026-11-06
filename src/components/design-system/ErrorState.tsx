import { AlertTriangle, LoaderCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
  isRetrying?: boolean
  className?: string
}

export function ErrorState({
  title = 'No se pudo cargar la información',
  description = 'Revisa tu conexión e inténtalo de nuevo.',
  onRetry,
  isRetrying = false,
  className,
}: ErrorStateProps) {
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center px-4 py-8 text-center', className)}>
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground">{description}</p>
      {onRetry && (
        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={onRetry} disabled={isRetrying}>
          {isRetrying ? <LoaderCircle className="animate-spin" /> : <RotateCcw />}
          {isRetrying ? 'Reintentando...' : 'Reintentar'}
        </Button>
      )}
    </div>
  )
}
