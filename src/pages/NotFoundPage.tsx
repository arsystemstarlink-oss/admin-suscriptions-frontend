import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Home } from 'lucide-react'

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <p className="text-9xl font-bold text-muted-foreground">404</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Página no encontrada</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            El recurso que buscas no existe o ha sido movido.
          </p>
        </div>
        <Button asChild>
          <Link to="/dashboard" className="gap-2">
            <Home className="h-4 w-4 shrink-0" />
            Volver al inicio
          </Link>
        </Button>
      </div>
    </div>
  )
}
