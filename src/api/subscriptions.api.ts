import { api } from './client'
import type {
  SubscriptionWithDetails,
  SubscriptionDetailResponse,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  CreateSubscriptionResponse,
  Pagination,
} from '@/types/api'

interface SubscriptionsListParams {
  clientId?: string
  search?: string
  limit?: number
  offset?: number
}

interface SubscriptionsListResponse {
  subscriptions: SubscriptionWithDetails[]
  pagination: Pagination
}

export const subscriptionsApi = {
  list: async (params?: SubscriptionsListParams): Promise<SubscriptionsListResponse> => {
    const response = await api.get<SubscriptionsListResponse>('/subscriptions', { params })
    return response.data
  },

  getById: async (id: string): Promise<SubscriptionDetailResponse> => {
    const response = await api.get<SubscriptionDetailResponse>(`/subscriptions/${id}`)
    return response.data
  },

  create: async (data: CreateSubscriptionRequest): Promise<CreateSubscriptionResponse> => {
    const response = await api.post<CreateSubscriptionResponse>('/subscriptions', data)
    return response.data
  },

  update: async (id: string, data: UpdateSubscriptionRequest): Promise<SubscriptionWithDetails> => {
    const response = await api.put<SubscriptionWithDetails>(`/subscriptions/${id}`, data)
    return response.data
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/subscriptions/${id}`)
  },
}
