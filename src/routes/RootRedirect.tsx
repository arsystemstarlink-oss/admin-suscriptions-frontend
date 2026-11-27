import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { useMe } from '@/hooks/useAuth'
import { getLandingPath } from '@/lib/business-plan'
import { FullPageLoader } from '@/routes/lazy-pages'

export function RootRedirect() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)
  const me = useMe(isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/planes" replace />
  }

  // Sin usuario persistido no conocemos el plan: esperamos `/auth/me` para no
  // mandar al panel a un admin cuya organización aún no tiene plan.
  if (!user && me.isPending) {
    return <FullPageLoader />
  }

  return <Navigate to={getLandingPath(user ?? me.data?.user)} replace />
}
