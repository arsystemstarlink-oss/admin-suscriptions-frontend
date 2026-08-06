import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { authApi } from '@/api/auth.api'

function getTokenExpiry(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000
  } catch {
    return Date.now() + 15 * 60 * 1000
  }
}

export function useTokenRefresh() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { accessToken, refreshToken, setTokens, logout } = useAuthStore()

  useEffect(() => {
    if (!accessToken || !refreshToken) return

    const expiresAt = getTokenExpiry(accessToken)
    const now = Date.now()
    const timeUntilExpiry = expiresAt - now
    const refreshIn = Math.max(timeUntilExpiry - 60_000, 10_000)

    intervalRef.current = setInterval(async () => {
      try {
        const currentRefreshToken = useAuthStore.getState().refreshToken
        if (!currentRefreshToken) return

        const data = await authApi.refresh(currentRefreshToken)
        setTokens(data.accessToken, data.refreshToken)
      } catch {
        logout()
      }
    }, refreshIn)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [accessToken, refreshToken, setTokens, logout])
}
