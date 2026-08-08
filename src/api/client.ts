import axios from 'axios'
import type { ApiError } from '@/types/api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://admin-suscriptions-backend-production.up.railway.app/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

let isRefreshing = false
let refreshSubscribers: Array<(token: string) => void> = []

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

function getStoredTokens() {
  const accessToken = localStorage.getItem('accessToken')
  const refreshToken = localStorage.getItem('refreshToken')
  return { accessToken, refreshToken }
}

function setStoredTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('accessToken', accessToken)
  localStorage.setItem('refreshToken', refreshToken)
}

function clearStoredTokens() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
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

    if (status === 401 && errorCode === 'UNAUTHORIZED' && !originalRequest._retry) {
      originalRequest._retry = true

      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshSubscribers.push((newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            resolve(api(originalRequest))
          })
        })
      }

      isRefreshing = true

      try {
        const { refreshToken } = getStoredTokens()
        if (!refreshToken) throw new Error('No refresh token')

        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        })

        setStoredTokens(data.accessToken, data.refreshToken)
        onRefreshed(data.accessToken)
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
        return api(originalRequest)
      } catch {
        clearStoredTokens()
        window.location.href = '/login'
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    if (status === 400 && errorCode) {
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
