import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'

export function RootRedirect() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  return <Navigate to={isAuthenticated ? '/dashboard' : '/planes'} replace />
}
