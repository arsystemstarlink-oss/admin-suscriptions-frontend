import axios from 'axios'
import type { ApiError } from '@/types/api'
import {
  acquireRefreshLock,
  clearStoredTokens,
  getRefreshVersion,
  getStoredTokens,
  releaseRefreshLock,
  setStoredTokens,
} from '@/lib/tokenStorage'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://admin-suscriptions-backend-production.up.railway.app/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

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

    if (errorCode === 'TWILIO_ERROR' && status === 502) {
      const retryCount = (originalRequest._retryCount as number | undefined) ?? 0
      if (retryCount < 3) {
        originalRequest._retryCount = retryCount + 1
        await sleep(2000 * Math.pow(2, retryCount))
        return api(originalRequest)
      }
    }

    if (errorCode) {
      const apiError: ApiError = {
        code: errorCode as ApiError['code'],
        message: error.response?.data?.error?.message || 'Error de negocio',
        twilioCode: error.response?.data?.error?.twilioCode,
        moreInfo: error.response?.data?.error?.moreInfo,
      }
      return Promise.reject(apiError)
    }

    return Promise.reject(error)
  }
)
