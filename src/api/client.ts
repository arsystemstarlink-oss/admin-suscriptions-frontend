import axios from 'axios'
import type { ApiError } from '@/types/api'
import { getApiBaseUrl, requestWithFallback, switchToFallback } from '@/api/baseUrl'
import {
  acquireRefreshLock,
  clearStoredTokens,
  getRefreshVersion,
  getStoredUser,
  getStoredTokens,
  releaseRefreshLock,
  setStoredTokens,
} from '@/lib/tokenStorage'
import { getOrganizationPlanAccess } from '@/lib/business-plan'

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
})

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Sin respuesta, 5xx o 429: el refresh token sigue siendo válido y se puede reintentar. */
function isTemporaryRefreshFailure(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  const status = error.response?.status
  return status === undefined || status >= 500 || status === 429
}

function readRenewedAccessToken(): string {
  const { accessToken } = getStoredTokens()
  if (!accessToken) throw new Error('No access token')
  return accessToken
}

/** Renueva los tokens; el candado de storage coordina con las demás pestañas. */
async function runTokenRefresh(): Promise<string> {
  const versionAtStart = getRefreshVersion()

  while (!acquireRefreshLock()) {
    await sleep(150)
    if (getRefreshVersion() !== versionAtStart) return readRenewedAccessToken()
  }

  try {
    if (getRefreshVersion() !== versionAtStart) return readRenewedAccessToken()

    const { refreshToken } = getStoredTokens()
    if (!refreshToken) throw new Error('No refresh token')

    const { data } = await requestWithFallback<{ accessToken: string; refreshToken: string }>({
      url: '/auth/refresh',
      method: 'POST',
      data: { refreshToken },
      timeout: 10_000,
    })

    setStoredTokens(data.accessToken, data.refreshToken)
    return data.accessToken
  } finally {
    releaseRefreshLock()
  }
}

let refreshInFlight: Promise<string> | null = null

/** Las peticiones que reciben 401 a la vez comparten una sola renovación. */
function refreshAccessToken(): Promise<string> {
  refreshInFlight ??= runTokenRefresh().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

api.interceptors.request.use((config) => {
  const user = getStoredUser()
  const method = config.method?.toUpperCase()
  const url = (config.url || '').split('?')[0].replace(/\/+$/, '')
  const isWriteRequest =
    method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE'
  const isAccountRequest = /\/auth\/(?:logout|refresh|me|change-password)$/.test(url)
  const isPlanPaymentReportRequest = /\/organization-plan-payment-reports(?:\/|$)/.test(url)

  if (
    user?.role === 'admin' &&
    isWriteRequest &&
    !isAccountRequest &&
    !isPlanPaymentReportRequest
  ) {
    const access = getOrganizationPlanAccess(user.organization)
    if (access.isReadOnly) {
      const error: ApiError = {
        code: 'PLAN_READ_ONLY',
        message: 'Tu plan venció o está suspendido. Puedes consultar tus datos, pero no cambiarlos.',
      }
      return Promise.reject(error)
    }

    if (method === 'POST' && /\/clients$/.test(url) && access.isAtLimit) {
      const error: ApiError = {
        code: 'CLIENT_LIMIT_REACHED',
        message: 'Llegaste al límite de clientes de tu plan. Elige un plan con más espacio para añadir otro.',
      }
      return Promise.reject(error)
    }
  }

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

    if (!import.meta.env.DEV && !error.response && switchToFallback()) {
      api.defaults.baseURL = getApiBaseUrl()
      originalRequest.baseURL = getApiBaseUrl()
      return api(originalRequest)
    }

    if (status === 401 && errorCode === 'REFRESH_TOKEN_REVOKED') {
      clearStoredTokens()
      if (window.location.pathname !== `${import.meta.env.BASE_URL}login`) {
        window.location.href = `${import.meta.env.BASE_URL}login`
      }
      return Promise.reject(error)
    }

    if (status === 401 && errorCode === 'UNAUTHORIZED' && !originalRequest._retry) {
      originalRequest._retry = true

      // La petición salió con un token que ya se renovó mientras estaba en curso.
      const { accessToken: currentToken } = getStoredTokens()
      if (currentToken && originalRequest.headers.Authorization !== `Bearer ${currentToken}`) {
        originalRequest.headers.Authorization = `Bearer ${currentToken}`
        return api(originalRequest)
      }

      try {
        const accessToken = await refreshAccessToken()
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        // Se rechaza con el error del refresh, no con el 401 original: useMe
        // interpretaría ese 401 como una sesión rechazada y la cerraría.
        if (isTemporaryRefreshFailure(refreshError)) {
          return Promise.reject(refreshError)
        }
        clearStoredTokens()
        window.location.href = `${import.meta.env.BASE_URL}login`
        return Promise.reject(error)
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
