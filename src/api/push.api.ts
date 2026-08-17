import { api } from './client'
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

  sendTest: async (): Promise<SendTestPushResponse> => {
    const response = await api.post<SendTestPushResponse>('/push/test')
    return response.data
  },
}

export type { PushSubscriptionInfo }
