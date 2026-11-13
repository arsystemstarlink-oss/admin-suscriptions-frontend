import axios from 'axios'
import { api } from './client'
import { getApiBaseUrl } from '@/api/baseUrl'
import type {
  PushSubscriptionInfo,
  PushSubscriptionsListResponse,
  RegisterPushSubscriptionResponse,
  SendTestPushResponse,
  VapidPublicKeyResponse,
} from '@/types/api'

export const pushApi = {
  getVapidPublicKey: async (): Promise<VapidPublicKeyResponse> => {
    const response = await api.get<VapidPublicKeyResponse>('/push/vapid-public-key')
    return response.data
  },

  listSubscriptions: async (): Promise<PushSubscriptionsListResponse> => {
    const response = await api.get<PushSubscriptionsListResponse>('/push/subscriptions')
    return response.data
  },

  register: async (subscription: PushSubscription): Promise<RegisterPushSubscriptionResponse> => {
    const response = await api.post<RegisterPushSubscriptionResponse>('/push/subscriptions', {
      ...subscription.toJSON(),
      userAgent: navigator.userAgent,
    })
    return response.data
  },

  unregister: async (endpoint: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(
      `/push/subscriptions/${encodeURIComponent(endpoint)}`,
    )
    return response.data
  },

  /**
   * Baja de la suscripción al cerrar sesión. Va sin los interceptores de `api`:
   * el token ya no está en el storage y un 401 aquí no debe redirigir ni tocar
   * la sesión que se abra después.
   */
  unregisterOnLogout: async (endpoint: string, accessToken: string): Promise<void> => {
    await axios.delete(`${getApiBaseUrl()}/push/subscriptions/${encodeURIComponent(endpoint)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 10_000,
    })
  },

  sendTest: async (): Promise<SendTestPushResponse> => {
    const response = await api.post<SendTestPushResponse>('/push/test')
    return response.data
  },
}

export type { PushSubscriptionInfo }
