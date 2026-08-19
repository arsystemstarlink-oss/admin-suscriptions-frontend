import { api } from './client'
import type { SchedulerConfig, UpdateSchedulerConfigRequest } from '@/types/api'

export const schedulerApi = {
  getConfig: async (organizationId?: string): Promise<SchedulerConfig> => {
    const response = await api.get<SchedulerConfig>('/scheduler/config', {
      params: { organizationId },
    })
    return response.data
  },

  updateConfig: async (
    data: UpdateSchedulerConfigRequest,
    organizationId?: string,
  ): Promise<SchedulerConfig> => {
    const response = await api.put<SchedulerConfig>('/scheduler/config', data, {
      params: { organizationId },
    })
    return response.data
  },

  runNow: async (organizationId?: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/scheduler/run', {}, {
      params: { organizationId },
    })
    return response.data
  },
}
