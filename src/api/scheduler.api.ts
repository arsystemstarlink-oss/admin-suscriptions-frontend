import { api } from './client'
import type {
  SchedulerConfig,
  UpdateSchedulerConfigRequest,
  RunSchedulerResponse,
  GetSchedulerLogsResponse,
} from '@/types/api'

export const schedulerApi = {
  getConfig: async (organizationId?: string): Promise<SchedulerConfig> => {
    const response = await api.get<SchedulerConfig>('/scheduler/config', {
      params: organizationId ? { organizationId } : undefined,
    })
    return response.data
  },

  updateConfig: async (
    data: UpdateSchedulerConfigRequest,
    organizationId?: string,
  ): Promise<SchedulerConfig> => {
    const response = await api.put<SchedulerConfig>('/scheduler/config', data, {
      params: organizationId ? { organizationId } : undefined,
    })
    return response.data
  },

  runNow: async (organizationId?: string): Promise<RunSchedulerResponse> => {
    const response = await api.post<RunSchedulerResponse>('/scheduler/run', {}, {
      params: organizationId ? { organizationId } : undefined,
    })
    return response.data
  },

  getLogs: async (limit = 50, organizationId?: string): Promise<GetSchedulerLogsResponse> => {
    const response = await api.get<GetSchedulerLogsResponse>('/scheduler/logs', {
      params: { limit, ...(organizationId ? { organizationId } : undefined) },
    })
    return response.data
  },
}
