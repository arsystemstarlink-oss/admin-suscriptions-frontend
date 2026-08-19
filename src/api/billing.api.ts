import { api } from './client'
import type {
  BillingPeriodWithDetails,
  PayRequest,
  PayResponse,
  UpdateBillingPeriodRequest,
  Pagination,
} from '@/types/api'

interface BillingPeriodsListParams {
  subscriptionId?: string
  clientId?: string
  status?: 'PENDING' | 'PAID' | 'OVERDUE'
  search?: string
  expiresBefore?: string
  periodLabel?: string
  organizationId?: string
  limit?: number
  offset?: number
}

interface BillingPeriodsListResponse {
  periods: BillingPeriodWithDetails[]
  pagination: Pagination
}

export const billingApi = {
  list: async (params?: BillingPeriodsListParams): Promise<BillingPeriodsListResponse> => {
    const response = await api.get<BillingPeriodsListResponse>('/billing-periods', { params })
    return response.data
  },

  getById: async (id: string): Promise<BillingPeriodWithDetails> => {
    const response = await api.get<BillingPeriodWithDetails>(`/billing-periods/${id}`)
    return response.data
  },

  updatePeriod: async (id: string, data: UpdateBillingPeriodRequest): Promise<BillingPeriodWithDetails> => {
    const response = await api.put<BillingPeriodWithDetails>(`/billing-periods/${id}`, data)
    return response.data
  },

  payPeriod: async (id: string, data: PayRequest): Promise<PayResponse> => {
    const response = await api.post<PayResponse>(`/billing-periods/${id}/pay`, data)
    return response.data
  },
}
