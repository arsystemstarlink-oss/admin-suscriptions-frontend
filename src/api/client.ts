import axios from 'axios'
import type { ApiError } from '@/types/api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://admin-suscriptions-backend-production.up.railway.app/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

const REFRESH_LOCK_KEY = 'authRefreshLock'
const REFRESH_VERSION_KEY = 'authRefreshVersion'
const REFRESH_LOCK_TIMEOUT_MS = 15_000

const TAB_ID =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

function getStoredTokens() {
  const accessToken = localStorage.getItem('accessToken')
  const refreshToken = localStorage.getItem('refreshToken')
  return { accessToken, refreshToken }
}

function getRefreshVersion() {
  return Number(localStorage.getItem(REFRESH_VERSION_KEY) ?? '0')
}

function setStoredTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('accessToken', accessToken)
  localStorage.setItem('refreshToken', refreshToken)
  localStorage.setItem(REFRESH_VERSION_KEY, String(getRefreshVersion() + 1))
}

function clearStoredTokens() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
  localStorage.removeItem(REFRESH_LOCK_KEY)
  localStorage.removeItem(REFRESH_VERSION_KEY)
}

function acquireRefreshLock(): boolean {
  const now = Date.now()
  try {
    const lockRaw = localStorage.getItem(REFRESH_LOCK_KEY)
    if (lockRaw) {
      const lock = JSON.parse(lockRaw) as { tabId: string; startedAt: number }
      if (lock.tabId === TAB_ID) return true
      if (now - lock.startedAt < REFRESH_LOCK_TIMEOUT_MS) return false
    }
    localStorage.setItem(REFRESH_LOCK_KEY, JSON.stringify({ tabId: TAB_ID, startedAt: now }))
    return true
  } catch {
    return true
  }
}

function releaseRefreshLock() {
  try {
    const lockRaw = localStorage.getItem(REFRESH_LOCK_KEY)
    if (lockRaw) {
      const lock = JSON.parse(lockRaw) as { tabId: string }
      if (lock.tabId === TAB_ID) localStorage.removeItem(REFRESH_LOCK_KEY)
    }
  } catch {
    // lock corrupto; se ignora
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

api.interceptors.request.use((config) => {
  const { accessToken } = getStoredTokens()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const status = error.response?.status
    const errorCode = error.response?.data?.error?.code as string | undefined

    if (status === 401 && errorCode === 'REFRESH_TOKEN_REVOKED') {
      clearStoredTokens()
      if (window.location.pathname !== `${import.meta.env.BASE_URL}login`) {
        window.location.href = `${import.meta.env.BASE_URL}login`
      }
      return Promise.reject(error)
    }

    if (status === 401 && errorCode === 'UNAUTHORIZED' && !originalRequest._retry) {
      originalRequest._retry = true

      const versionAtError = getRefreshVersion()

      while (!acquireRefreshLock()) {
        await sleep(150)
        if (getRefreshVersion() !== versionAtError) {
          const { accessToken } = getStoredTokens()
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return api(originalRequest)
        }
      }

      try {
        const { refreshToken } = getStoredTokens()
        if (!refreshToken) throw new Error('No refresh token')

        if (getRefreshVersion() !== versionAtError) {
          const { accessToken } = getStoredTokens()
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return api(originalRequest)
        }

        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        })

        setStoredTokens(data.accessToken, data.refreshToken)
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
        return api(originalRequest)
      } catch {
        clearStoredTokens()
        window.location.href = `${import.meta.env.BASE_URL}login`
        return Promise.reject(error)
      } finally {
        releaseRefreshLock()
      }
    }

    if (status === 429) {
      const retryCount = (originalRequest._retryCount as number | undefined) ?? 0
      if (retryCount < 2) {
        originalRequest._retryCount = retryCount + 1
        const retryAfter = Number(error.response?.headers?.['retry-after'])
        const delay =
          Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : 2000 * (retryCount + 1)
        await sleep(delay)
        return api(originalRequest)
      }
    }

    if (errorCode) {
      const apiError: ApiError = {
        code: errorCode as ApiError['code'],
        message: error.response?.data?.error?.message || 'Error de negocio',
      }
      return Promise.reject(apiError)
    }

    return Promise.reject(error)
  }
)

export { getStoredTokens, setStoredTokens, clearStoredTokens }
