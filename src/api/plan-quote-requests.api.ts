import { api } from '@/api/client'
import type {
  PlanQuoteRequestStatus,
  PlanQuoteRequestsResponse,
  UpdatePlanQuoteRequestRequest,
  UpdatePlanQuoteRequestResponse,
} from '@/types/api'

interface PlanQuoteRequestsListParams {
  status?: PlanQuoteRequestStatus | 'ALL'
  limit?: number
  offset?: number
}

export const planQuoteRequestsApi = {
  list: async (params?: PlanQuoteRequestsListParams): Promise<PlanQuoteRequestsResponse> => {
    const response = await api.get<PlanQuoteRequestsResponse>('/plan-quote-requests', { params })
    return response.data
  },
  update: async (
    id: string,
    data: UpdatePlanQuoteRequestRequest,
  ): Promise<UpdatePlanQuoteRequestResponse> => {
    const response = await api.patch<UpdatePlanQuoteRequestResponse>(
      `/plan-quote-requests/${id}`,
      data,
    )
    return response.data
  },
}
