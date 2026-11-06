import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/auth.api'
import { qk } from '@/lib/query-keys'
import { useAuthStore } from '@/stores/auth.store'
import { useEffect } from 'react'

type AuthQueryError = { code?: string; response?: { status?: number } }

/** El servidor rechazó la sesión; un fallo de red o un 5xx no cuentan. */
export function isSessionRejected(error: unknown): boolean {
  if (!error) return false
  const { code, response } = error as AuthQueryError
  return response?.status === 401 || code === 'UNAUTHORIZED' || code === 'USER_NOT_FOUND'
}

export function useMe(enabled = true) {
  const setUser = useAuthStore((s) => s.setUser)
  const logout = useAuthStore((s) => s.logout)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const hasUser = useAuthStore((s) => !!s.user)

  const query = useQuery({
    queryKey: qk.auth.me,
    queryFn: () => authApi.me(),
    enabled: enabled && isAuthenticated,
    staleTime: 5 * 60_000,
    retry: false,
  })

  useEffect(() => {
    if (query.data?.user) {
      setUser(query.data.user)
    }
  }, [query.data, setUser])

  useEffect(() => {
    if (!query.error) return
    const status = (query.error as AuthQueryError).response?.status
    // Un 404 sin código no identifica a la sesión (p. ej. API mal configurada):
    // con un usuario guardado no es motivo para cerrarla.
    if (isSessionRejected(query.error) || (status === 404 && !hasUser)) {
      logout()
    }
  }, [query.error, logout, hasUser])

  return query
}

export function useUpdateMe() {
  const queryClient = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)
  const setTokens = useAuthStore((s) => s.setTokens)

  return useMutation({
    mutationFn: authApi.updateMe,
    onSuccess: (data) => {
      // Cambiar el email revoca las sesiones: sin guardar los tokens nuevos se cerraría la sesión.
      if (data.accessToken && data.refreshToken) {
        setTokens(data.accessToken, data.refreshToken)
      }
      setUser(data.user)
      queryClient.setQueryData(qk.auth.me, { user: data.user })
    },
  })
}

export function useChangePassword() {
  return useMutation({ mutationFn: authApi.changePassword })
}
