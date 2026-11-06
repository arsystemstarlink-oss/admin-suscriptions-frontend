import { api } from './client'
import type {
  CreateOrganizationRequest,
  OnboardOrganizationRequest,
  OnboardOrganizationResponse,
  OrganizationWhatsAppConfig,
  WhatsAppConnectionCheck,
  WhatsAppFailureGroup,
  WhatsAppTemplateKey,
  WhatsAppTemplatesResponse,
  OrganizationListFilter,
  SlugAvailabilityResponse,
  RegisterOrganizationPlanPaymentRequest,
  RegisterOrganizationPlanPaymentResponse,
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
  filter?: OrganizationListFilter
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

  onboard: async (data: OnboardOrganizationRequest): Promise<OnboardOrganizationResponse> => {
    const response = await api.post<OnboardOrganizationResponse>('/organizations/onboard', data)
    return response.data
  },

  checkSlug: async (slug: string): Promise<SlugAvailabilityResponse> => {
    const response = await api.get<SlugAvailabilityResponse>('/organizations/check-slug', {
      params: { slug },
    })
    return response.data
  },

  update: async (id: string, data: UpdateOrganizationRequest): Promise<Organization> => {
    const response = await api.put<Organization>(`/organizations/${id}`, data)
    return response.data
  },

  registerPlanPayment: async (
    id: string,
    data: RegisterOrganizationPlanPaymentRequest,
  ): Promise<RegisterOrganizationPlanPaymentResponse> => {
    const response = await api.post<RegisterOrganizationPlanPaymentResponse>(
      `/organizations/${id}/plan-payments`,
      data,
    )
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

  checkWhatsAppConnection: async (organizationId: string): Promise<WhatsAppConnectionCheck> => {
    const response = await api.get<WhatsAppConnectionCheck>('/whatsapp/config/connection', {
      params: { organizationId },
    })
    return response.data
  },

  getWhatsAppTemplates: async (organizationId: string): Promise<WhatsAppTemplatesResponse> => {
    const response = await api.get<WhatsAppTemplatesResponse>('/whatsapp/config/templates', {
      params: { organizationId },
    })
    return response.data
  },

  submitWhatsAppTemplate: async (
    organizationId: string,
    key: WhatsAppTemplateKey,
    body: string,
  ): Promise<WhatsAppTemplatesResponse> => {
    const response = await api.post<WhatsAppTemplatesResponse>(
      `/whatsapp/config/templates/${key}/submit`,
      { body },
      { params: { organizationId } },
    )
    return response.data
  },

  sendWhatsAppTestMessage: async (organizationId: string, to: string): Promise<void> => {
    await api.post('/whatsapp/config/test-message', { to }, { params: { organizationId } })
  },

  getWhatsAppFailures: async (organizationId: string): Promise<{ failures: WhatsAppFailureGroup[] }> => {
    const response = await api.get<{ failures: WhatsAppFailureGroup[] }>('/whatsapp/config/failures', {
      params: { organizationId },
    })
    return response.data
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/organizations/${id}`)
  },
}
