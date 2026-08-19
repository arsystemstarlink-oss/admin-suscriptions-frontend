import { api } from './client'
import type { DashboardSummary, DashboardAlerts } from '@/types/api'

interface DashboardParams {
  organizationId?: string
}

export const dashboardApi = {
  getSummary: async (params?: DashboardParams): Promise<DashboardSummary> => {
    const response = await api.get<DashboardSummary>('/dashboard/summary', { params })
    return response.data
  },

  getAlerts: async (params?: DashboardParams): Promise<DashboardAlerts> => {
    const response = await api.get<DashboardAlerts>('/dashboard/alerts', { params })
    return response.data
  },
}
