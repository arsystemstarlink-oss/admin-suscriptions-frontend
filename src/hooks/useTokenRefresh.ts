import { useEffect, useRef } from 'react'
import axios from 'axios'
import { getStoredTokens } from '@/api/client'
import { useAuthStore } from '@/stores/auth.store'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://admin-suscriptions-backend-production.up.railway.app/api'
const ACCESS_TOKEN_LIFETIME_MS = 15 * 60 * 1000
const REFRESH_BEFORE_EXPIRY_MS = 60 * 1000

function parseJwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

export function useTokenRefresh() {
  const setTokens = useAuthStore((s) => s.setTokens)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    let cancelled = false

    const scheduleRefresh = () => {
      if (timerRef.current) clearTimeout(timerRef.current)

      const { accessToken, refreshToken } = getStoredTokens()
      if (!accessToken || !refreshToken) return

      const now = Date.now()
      const expMs = parseJwtExp(accessToken)
      const delay = expMs
        ? Math.max(0, expMs - now - REFRESH_BEFORE_EXPIRY_MS)
        : Math.max(0, ACCESS_TOKEN_LIFETIME_MS - REFRESH_BEFORE_EXPIRY_MS)

      if (delay <= 0) {
        doRefresh()
        return
      }

      timerRef.current = setTimeout(() => {
        doRefresh()
      }, delay)
    }

    const doRefresh = async () => {
      if (cancelled) return

      try {
        const { refreshToken } = getStoredTokens()
        if (!refreshToken) return

        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        })

        if (cancelled) return

        setTokens(data.accessToken, data.refreshToken)
        scheduleRefresh()
      } catch {
        // Proactive refresh failed; reactive interceptor will handle on next request
      }
    }

    scheduleRefresh()

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'accessToken' || e.key === 'refreshToken') {
        scheduleRefresh()
      }
    }
    window.addEventListener('storage', handleStorage)

    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
      window.removeEventListener('storage', handleStorage)
    }
  }, [setTokens])

  return null
}
