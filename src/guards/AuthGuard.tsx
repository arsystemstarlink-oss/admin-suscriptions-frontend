import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { isSessionRejected, useMe } from '@/hooks/useAuth'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  const { isPending, isError, isFetching, error, refetch } = useMe(isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Nada protegido se muestra hasta validar la sesión, aunque haya usuario y
  // datos en caché. Si falla la red se sigue con la caché; si se rechazó la
  // sesión se mantiene el spinner mientras useMe la cierra.
  if (isPending || isSessionRejected(error)) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  // Fallo temporal sin usuario guardado: no hay con qué pintar la app, y el login
  // devolvería aquí de inmediato porque la sesión sigue abierta.
  if (isError && !user) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="text-sm text-muted-foreground">
          No pudimos verificar tu sesión. Revisa tu conexión e inténtalo de nuevo.
        </p>
        <Button onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? 'Verificando...' : 'Reintentar'}
        </Button>
      </div>
    )
  }

  if (user?.mustChangePassword && location.pathname !== '/config/profile') {
    return <Navigate to="/config/profile" replace />
  }

  return <>{children}</>
}
