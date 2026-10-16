import { api } from './client'
import type { BadgesResponse } from '@/types/api'

export const badgesApi = {
  get: async (organizationId?: string): Promise<BadgesResponse> => {
    const response = await api.get<BadgesResponse>('/badges', { params: { organizationId } })
    return response.data
  },
}
