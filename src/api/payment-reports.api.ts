import { api } from './client'
import type {
  PaymentReportWithDetails,
  PaymentReportsListResponse,
  ReviewPaymentReportRequest,
  ReviewPaymentReportResponse,
} from '@/types/api'

interface PaymentReportsListParams {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'
  organizationId?: string
  limit?: number
  offset?: number
}

export const paymentReportsApi = {
  list: async (params?: PaymentReportsListParams): Promise<PaymentReportsListResponse> => {
    const response = await api.get<PaymentReportsListResponse>('/payment-reports', { params })
    return response.data
  },

  getPendingCount: async (params?: { organizationId?: string }): Promise<{ pending: number }> => {
    const response = await api.get<{ pending: number }>('/payment-reports/count', { params })
    return response.data
  },

  getById: async (id: string): Promise<PaymentReportWithDetails> => {
    const response = await api.get<PaymentReportWithDetails>(`/payment-reports/${id}`)
    return response.data
  },

  review: async (id: string, data: ReviewPaymentReportRequest): Promise<ReviewPaymentReportResponse> => {
    const response = await api.post<ReviewPaymentReportResponse>(`/payment-reports/${id}/review`, data)
    return response.data
  },
}
