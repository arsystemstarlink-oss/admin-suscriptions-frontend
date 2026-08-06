import { api } from './client'
import type { DashboardSummary, DashboardAlerts } from '@/types/api'

export const dashboardApi = {
  getSummary: async (): Promise<DashboardSummary> => {
    const response = await api.get<DashboardSummary>('/dashboard/summary')
    return response.data
  },

  getAlerts: async (): Promise<DashboardAlerts> => {
    const response = await api.get<DashboardAlerts>('/dashboard/alerts')
    return response.data
  },
}
