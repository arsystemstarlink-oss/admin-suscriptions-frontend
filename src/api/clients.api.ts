import { api } from './client'
import type {
  Client,
  ClientWithStats,
  ClientDetailResponse,
  CreateClientRequest,
  UpdateClientRequest,
  Pagination,
} from '@/types/api'

interface ClientsListParams {
  search?: string
  include?: 'subscriptions'
  subscriptionStatus?: 'ACTIVE' | 'SUSPENDED' | 'MIXED' | 'NONE'
  hasOverdue?: boolean
  limit?: number
  offset?: number
}

interface ClientsListResponse {
  clients: ClientWithStats[]
  pagination: Pagination
}

export const clientsApi = {
  list: async (params?: ClientsListParams): Promise<ClientsListResponse> => {
    const response = await api.get<ClientsListResponse>('/clients', { params })
    return response.data
  },

  getById: async (id: string): Promise<ClientDetailResponse> => {
    const response = await api.get<ClientDetailResponse>(`/clients/${id}`)
    return response.data
  },

  create: async (data: CreateClientRequest): Promise<Client> => {
    const response = await api.post<Client>('/clients', data)
    return response.data
  },

  update: async (id: string, data: UpdateClientRequest): Promise<Client> => {
    const response = await api.put<Client>(`/clients/${id}`, data)
    return response.data
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/clients/${id}`)
  },
}
