import { api } from './client'
import type { PlanPageViewsResponse } from '@/types/api'

export const pageViewsApi = {
  get: async (days: 7 | 30 | 90): Promise<PlanPageViewsResponse> => {
    const response = await api.get<PlanPageViewsResponse>('/page-views', { params: { days } })
    return response.data
  },
}
