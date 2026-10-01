import { publicApi } from './public-client'
import type {
  CreatePublicReportRequest,
  CreatePublicReportResponse,
  PublicLookupRequest,
  PublicLookupResponse,
  PublicOrganization,
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
