import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/auth.api'
import { qk } from '@/lib/query-keys'
import { useAuthStore } from '@/stores/auth.store'
import { useEffect } from 'react'

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
    const status = (query.error as { response?: { status?: number } })?.response?.status
    if ((status === 401 || status === 404) && !hasUser) {
      logout()
    }
  }, [query.error, logout, hasUser])

  return query
}

export function useUpdateMe() {
  const queryClient = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)

  return useMutation({
    mutationFn: authApi.updateMe,
    onSuccess: (data) => {
      setUser(data.user)
      queryClient.setQueryData(qk.auth.me, data)
    },
  })
}

export function useChangePassword() {
  return useMutation({ mutationFn: authApi.changePassword })
}
