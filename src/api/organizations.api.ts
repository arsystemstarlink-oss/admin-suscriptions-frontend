import { api } from './client'
import type {
  CreateOrganizationRequest,
  OrganizationWhatsAppConfig,
  Organization,
  OrganizationDetailResponse,
  OrganizationsListResponse,
  UpdateOrganizationRequest,
  UpdateOrganizationWhatsAppConfigRequest,
} from '@/types/api'

interface OrganizationsListParams {
  search?: string
  limit?: number
  offset?: number
}

export const organizationsApi = {
  list: async (params?: OrganizationsListParams): Promise<OrganizationsListResponse> => {
    const response = await api.get<OrganizationsListResponse>('/organizations', { params })
    return response.data
  },

  getById: async (id: string): Promise<OrganizationDetailResponse> => {
    const response = await api.get<OrganizationDetailResponse>(`/organizations/${id}`)
    return response.data
  },

  create: async (data: CreateOrganizationRequest): Promise<Organization> => {
    const response = await api.post<Organization>('/organizations', data)
    return response.data
  },

  update: async (id: string, data: UpdateOrganizationRequest): Promise<Organization> => {
    const response = await api.put<Organization>(`/organizations/${id}`, data)
    return response.data
  },

  getWhatsAppConfig: async (organizationId: string): Promise<OrganizationWhatsAppConfig> => {
    const response = await api.get<OrganizationWhatsAppConfig>('/whatsapp/config', {
      params: { organizationId },
    })
    return response.data
  },

  updateWhatsAppConfig: async (
    organizationId: string,
    data: UpdateOrganizationWhatsAppConfigRequest,
  ): Promise<OrganizationWhatsAppConfig> => {
    const response = await api.put<OrganizationWhatsAppConfig>('/whatsapp/config', data, {
      params: { organizationId },
    })
    return response.data
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/organizations/${id}`)
  },
}
