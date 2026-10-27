import { publicApi } from './public-client'
import type {
  CreatePlanQuoteRequest,
  CreatePlanQuoteRequestResponse,
  CreatePublicReportRequest,
  CreatePublicReportResponse,
  PublicLookupRequest,
  PublicLookupResponse,
  PublicOrganization,
  PublicPaymentInstructions,
  PublicSignupRequest,
  PublicSignupResponse,
} from '@/types/api'

export const publicPortalApi = {
  getOrganization: async (slug: string): Promise<{ organization: PublicOrganization }> => {
    const response = await publicApi.get<{ organization: PublicOrganization }>(
      `/public/org/${encodeURIComponent(slug)}`,
    )
    return response.data
  },

  lookup: async (slug: string, data: PublicLookupRequest): Promise<PublicLookupResponse> => {
    const response = await publicApi.post<PublicLookupResponse>(
      `/public/org/${encodeURIComponent(slug)}/lookup`,
      data,
    )
    return response.data
  },

  createReport: async (
    slug: string,
    data: CreatePublicReportRequest,
  ): Promise<CreatePublicReportResponse> => {
    const response = await publicApi.post<CreatePublicReportResponse>(
      `/public/org/${encodeURIComponent(slug)}/reports`,
      data,
    )
    return response.data
  },
}

export const publicPlansApi = {
  getPaymentInstructions: async (): Promise<PublicPaymentInstructions> => {
    const response = await publicApi.get<PublicPaymentInstructions>(
      '/public/payment-instructions',
    )
    return response.data
  },

  signup: async (data: PublicSignupRequest): Promise<PublicSignupResponse> => {
    const response = await publicApi.post<PublicSignupResponse>('/public/signup', data)
    return response.data
  },

  createPlanQuoteRequest: async (
    data: CreatePlanQuoteRequest,
  ): Promise<CreatePlanQuoteRequestResponse> => {
    const response = await publicApi.post<CreatePlanQuoteRequestResponse>(
      '/public/plan-quote-requests',
      data,
    )
    return response.data
  },
}
