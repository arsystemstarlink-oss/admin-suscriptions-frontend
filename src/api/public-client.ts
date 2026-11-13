import axios from 'axios'
import type { ApiError } from '@/types/api'
import { getApiBaseUrl, switchToFallback } from '@/api/baseUrl'
import { localizeNetworkError } from '@/lib/network-error'

export const publicApi = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
})

publicApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const errorCode = error.response?.data?.error?.code as string | undefined

    if (!error.response && originalRequest && !originalRequest._fallbackTried && switchToFallback()) {
      originalRequest._fallbackTried = true
      publicApi.defaults.baseURL = getApiBaseUrl()
      originalRequest.baseURL = getApiBaseUrl()
      return publicApi(originalRequest)
    }

    if (errorCode) {
      const apiError: ApiError = {
        code: errorCode as ApiError['code'],
        message: error.response?.data?.error?.message || 'No se pudo completar la consulta',
      }
      return Promise.reject(apiError)
    }

    localizeNetworkError(error)
    return Promise.reject(error)
  },
)
