import { api } from './client'
import type { SchedulerConfig, UpdateSchedulerConfigRequest } from '@/types/api'

export const schedulerApi = {
  getConfig: async (): Promise<SchedulerConfig> => {
    const response = await api.get<SchedulerConfig>('/scheduler/config')
    return response.data
  },

  updateConfig: async (data: UpdateSchedulerConfigRequest): Promise<SchedulerConfig> => {
    const response = await api.put<SchedulerConfig>('/scheduler/config', data)
    return response.data
  },

  runNow: async (): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/scheduler/run')
    return response.data
  },
}
