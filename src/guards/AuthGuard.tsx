import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { useMe } from '@/hooks/useAuth'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  const { isLoading, isError } = useMe(isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!user && isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (isError && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
