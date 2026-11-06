import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Se renderiza fuera de los layouts y de los lazy-routes: debe seguir funcionando
// aunque el fallo sea un chunk obsoleto tras un despliegue.
export function RouteErrorPage() {
  return (
    <div role="alert" className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center text-foreground">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
      </div>
      <h1 className="text-xl font-bold tracking-tight">Algo salió mal</h1>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        No pudimos mostrar esta pantalla. Recarga la página para continuar.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={() => window.location.reload()}>
          Recargar
        </Button>
        <Button asChild variant="outline">
          <a href={import.meta.env.BASE_URL}>Ir al inicio</a>
        </Button>
      </div>
    </div>
  )
}
