import { api } from './client'
import type {
  Admin,
  AdminsListResponse,
  AdminDetailResponse,
  CreateAdminRequest,
  UpdateAdminRequest,
  UpdateAdminResponse,
} from '@/types/api'

interface AdminsListParams {
  search?: string
  limit?: number
  offset?: number
  organizationId?: string
}

export const adminsApi = {
  list: async (params?: AdminsListParams): Promise<AdminsListResponse> => {
    const response = await api.get<AdminsListResponse>('/admins', { params })
    return response.data
  },

  getById: async (id: string): Promise<AdminDetailResponse> => {
    const response = await api.get<AdminDetailResponse>(`/admins/${id}`)
    return response.data
  },

  create: async (data: CreateAdminRequest): Promise<{ message: string; user: Admin }> => {
    const response = await api.post<{ message: string; user: Admin }>('/auth/register', data)
    return response.data
  },

  update: async (id: string, data: UpdateAdminRequest): Promise<UpdateAdminResponse> => {
    const response = await api.put<UpdateAdminResponse>(`/admins/${id}`, data)
    return response.data
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/admins/${id}`)
  },
}
