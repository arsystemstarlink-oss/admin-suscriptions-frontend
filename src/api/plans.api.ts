import { api } from './client'
import type { Plan, Pagination, CreatePlanRequest, UpdatePlanRequest } from '@/types/api'

interface PlansListParams {
  search?: string
  active?: boolean
  organizationId?: string
  limit?: number
  offset?: number
}

interface PlansListResponse {
  plans: Plan[]
  pagination: Pagination
}

export const plansApi = {
  list: async (params?: PlansListParams): Promise<PlansListResponse> => {
    const response = await api.get<PlansListResponse>('/plans', { params })
    return response.data
  },

  getById: async (id: string): Promise<Plan> => {
    const response = await api.get<Plan>(`/plans/${id}`)
    return response.data
  },

  create: async (data: CreatePlanRequest): Promise<Plan> => {
    const response = await api.post<Plan>('/plans', data)
    return response.data
  },

  update: async (id: string, data: UpdatePlanRequest): Promise<Plan> => {
    const response = await api.put<Plan>(`/plans/${id}`, data)
    return response.data
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/plans/${id}`)
  },
}
