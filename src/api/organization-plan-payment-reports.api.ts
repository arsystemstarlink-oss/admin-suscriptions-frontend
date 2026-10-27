import { api } from '@/api/client'
import type {
  BusinessPlanKey,
  BusinessPlansResponse,
  CreateOrganizationPlanPaymentReportRequest,
  OrganizationPlanPaymentReport,
  OrganizationPlanPaymentReportsResponse,
  OrganizationPlanQuoteResponse,
  ReviewOrganizationPlanPaymentReportRequest,
  ReviewOrganizationPlanPaymentReportResponse,
} from '@/types/api'

export const businessPlansApi = {
  list: async (): Promise<BusinessPlansResponse> => {
    const response = await api.get<BusinessPlansResponse>('/public/business-plans')
    return response.data
  },
}

interface OrganizationPlanReportsListParams {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'
  limit?: number
  offset?: number
}

export interface OrganizationPlanQuoteParams {
  organizationId: string
  plan: BusinessPlanKey
  paidAt: string
}

export const organizationPlanPaymentReportsApi = {
  quote: async (params: OrganizationPlanQuoteParams): Promise<OrganizationPlanQuoteResponse> => {
    const response = await api.get<OrganizationPlanQuoteResponse>(
      '/organization-plan-payment-reports/quote',
      { params },
    )
    return response.data
  },
  create: async (
    data: CreateOrganizationPlanPaymentReportRequest,
  ): Promise<{ report: OrganizationPlanPaymentReport }> => {
    const response = await api.post<{ report: OrganizationPlanPaymentReport }>(
      '/organization-plan-payment-reports',
      data,
    )
    return response.data
  },
  listMine: async (): Promise<OrganizationPlanPaymentReportsResponse> => {
    const response = await api.get<OrganizationPlanPaymentReportsResponse>(
      '/organization-plan-payment-reports/mine',
    )
    return response.data
  },
  list: async (
    params?: OrganizationPlanReportsListParams,
  ): Promise<OrganizationPlanPaymentReportsResponse> => {
    const response = await api.get<OrganizationPlanPaymentReportsResponse>(
      '/organization-plan-payment-reports',
      { params },
    )
    return response.data
  },
  review: async (
    id: string,
    data: ReviewOrganizationPlanPaymentReportRequest,
  ): Promise<ReviewOrganizationPlanPaymentReportResponse> => {
    const response = await api.post<ReviewOrganizationPlanPaymentReportResponse>(
      `/organization-plan-payment-reports/${id}/review`,
      data,
    )
    return response.data
  },
}
