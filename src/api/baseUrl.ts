import axios from 'axios'
import type { AxiosRequestConfig, AxiosResponse } from 'axios'

const LOCAL_API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
const REMOTE_API_URL =
  import.meta.env.VITE_API_FALLBACK_URL ||
  'https://admin-suscriptions-backend-production.up.railway.app/api'

let activeBaseUrl = LOCAL_API_URL

export function getApiBaseUrl(): string {
  return activeBaseUrl
}

export function switchToFallback(): boolean {
  if (activeBaseUrl === REMOTE_API_URL) return false
  activeBaseUrl = REMOTE_API_URL
  return true
}

export async function requestWithFallback<T = unknown>(
  config: AxiosRequestConfig,
): Promise<AxiosResponse<T>> {
  try {
    return await axios.request<T>({ ...config, baseURL: getApiBaseUrl() })
  } catch (error) {
    if (axios.isAxiosError(error) && !error.response && switchToFallback()) {
      return await axios.request<T>({ ...config, baseURL: getApiBaseUrl() })
    }
    throw error
  }
}
