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
  organizationId?: string
  limit?: number
  offset?: number
}

interface ClientsListResponse {
  clients: ClientWithStats[]
  pagination: Pagination
}

export const clientsApi = {
  list: async (params?: ClientsListParams): Promise<ClientsListResponse> => {
    const search = params?.search?.trim()
    const normalizedSearch = search
      ? search
          .split(/\s+/)
          .map((word) => word.charAt(0).toLocaleUpperCase() + word.slice(1).toLocaleLowerCase())
          .join(' ')
      : undefined
    const response = await api.get<ClientsListResponse>('/clients', {
      params: normalizedSearch ? { ...params, search: normalizedSearch } : params,
    })
    return response.data
  },

  getById: async (id: string, organizationId?: string): Promise<ClientDetailResponse> => {
    const response = await api.get<ClientDetailResponse>(`/clients/${id}`, {
      params: organizationId ? { organizationId } : undefined,
    })
    return response.data
  },

  create: async (data: CreateClientRequest): Promise<Client> => {
    const response = await api.post<Client>('/clients', data)
    return response.data
  },

  update: async (id: string, data: UpdateClientRequest, organizationId?: string): Promise<Client> => {
    const response = await api.put<Client>(`/clients/${id}`, data, {
      params: organizationId ? { organizationId } : undefined,
    })
    return response.data
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/clients/${id}`)
  },
}
