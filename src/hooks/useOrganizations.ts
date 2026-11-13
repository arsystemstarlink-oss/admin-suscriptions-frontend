import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { organizationsApi } from '@/api/organizations.api'
import { qk } from '@/lib/query-keys'
import type {
  CreateOrganizationRequest,
  OrganizationListFilter,
  OnboardOrganizationRequest,
  RegisterOrganizationPlanPaymentRequest,
  UpdateOrganizationRequest,
  UpdateOrganizationWhatsAppConfigRequest,
  WhatsAppTemplateKey,
} from '@/types/api'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/error-handler'

interface UseOrganizationsParams {
  search?: string
  limit?: number
  offset?: number
  filter?: OrganizationListFilter
}

export function useOrganizations(params?: UseOrganizationsParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...qk.organizations.lists, params],
    queryFn: () => organizationsApi.list(params),
    enabled: options?.enabled ?? true,
  })
}

export function useOrganizationDetail(id: string) {
  return useQuery({
    queryKey: qk.organizations.detail(id),
    queryFn: () => organizationsApi.getById(id),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useOrganizationWhatsAppConfig(id: string, enabled = true) {
  return useQuery({
    queryKey: qk.organizations.whatsappConfig(id),
    queryFn: () => organizationsApi.getWhatsAppConfig(id),
    enabled: Boolean(id) && enabled,
  })
}

export function useUpdateOrganizationWhatsAppConfig() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: UpdateOrganizationWhatsAppConfigRequest
    }) => organizationsApi.updateWhatsAppConfig(id, data),
    onSuccess: (config, variables) => {
      qc.setQueryData(qk.organizations.whatsappConfig(variables.id), config)
      qc.invalidateQueries({ queryKey: qk.organizations.whatsappConnection(variables.id) })
      qc.invalidateQueries({ queryKey: qk.organizations.whatsappTemplates(variables.id) })
      qc.invalidateQueries({ queryKey: qk.organizations.lists })
      qc.invalidateQueries({ queryKey: qk.organizations.detail(variables.id) })
      toast.success('Configuración de WhatsApp actualizada')
    },
    onError: (err) => handleApiError(err),
  })
}

/** Consulta a Twilio, así que no se repite cada vez que la ventana recupera el foco. */
export function useWhatsAppConnectionCheck(id: string) {
  return useQuery({
    queryKey: qk.organizations.whatsappConnection(id),
    queryFn: () => organizationsApi.checkWhatsAppConnection(id),
    enabled: Boolean(id),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useConnectWhatsAppInboundWebhook() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => organizationsApi.connectWhatsAppInboundWebhook(id),
    onSuccess: (connection, id) => {
      qc.setQueryData(qk.organizations.whatsappConnection(id), connection)
      if (connection.inboundWebhookConnected) {
        toast.success('Listo: las respuestas de tus clientes llegarán a Chats')
      } else {
        toast.error('Twilio aceptó el cambio, pero aún no lo vemos en tu número. Compruébalo de nuevo en un momento.')
      }
    },
    onError: (err) => handleApiError(err),
  })
}

const TEMPLATE_REVIEW_POLL_MS = 60_000

export function useWhatsAppTemplates(id: string) {
  return useQuery({
    queryKey: qk.organizations.whatsappTemplates(id),
    queryFn: () => organizationsApi.getWhatsAppTemplates(id),
    enabled: Boolean(id),
    refetchInterval: (query) =>
      query.state.data?.templates.some((template) => template.request?.status === 'pending')
        ? TEMPLATE_REVIEW_POLL_MS
        : false,
  })
}

export function useSubmitWhatsAppTemplate() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, key, body }: { id: string; key: WhatsAppTemplateKey; body: string }) =>
      organizationsApi.submitWhatsAppTemplate(id, key, body),
    onSuccess: (templates, variables) => {
      qc.setQueryData(qk.organizations.whatsappTemplates(variables.id), templates)
      toast.success('Plantilla enviada a revisión de WhatsApp')
    },
    onError: (err) => handleApiError(err),
  })
}

export function useSubmitMissingWhatsAppTemplates() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => organizationsApi.submitMissingWhatsAppTemplates(id),
    onSuccess: ({ templates, submitted, failed }, id) => {
      qc.setQueryData(qk.organizations.whatsappTemplates(id), { templates })
      if (submitted.length > 0) {
        toast.success(
          submitted.length === 1
            ? '1 plantilla enviada a revisión de WhatsApp'
            : `${submitted.length} plantillas enviadas a revisión de WhatsApp`,
        )
      }
      failed.forEach(({ label, message }) => toast.error(`${label}: ${message}`))
    },
    onError: (err) => handleApiError(err),
  })
}

export function useSendWhatsAppTestMessage() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, to }: { id: string; to: string }) => organizationsApi.sendWhatsAppTestMessage(id, to),
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: qk.organizations.whatsappFailures(variables.id) })
      // El servidor registra la fecha de la prueba en la configuración.
      qc.invalidateQueries({ queryKey: qk.organizations.whatsappConfig(variables.id) })
      toast.success('Prueba enviada. Revisa tu WhatsApp.')
    },
    onError: (err) => handleApiError(err),
  })
}

export function useWhatsAppFailures(id: string) {
  return useQuery({
    queryKey: qk.organizations.whatsappFailures(id),
    queryFn: () => organizationsApi.getWhatsAppFailures(id),
    enabled: Boolean(id),
  })
}

export function useCreateOrganization() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateOrganizationRequest) => organizationsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.organizations.lists })
      toast.success('Organización creada correctamente')
    },
    onError: (err) => handleApiError(err),
  })
}

export function useOnboardOrganization() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: OnboardOrganizationRequest) => organizationsApi.onboard(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.organizations.lists })
      toast.success('Organización creada e invitación generada')
    },
  })
}

export function useUpdateOrganization() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOrganizationRequest }) =>
      organizationsApi.update(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.organizations.lists })
      qc.invalidateQueries({ queryKey: qk.organizations.detail(variables.id) })
      toast.success('Organización actualizada correctamente')
    },
    onError: (err) => handleApiError(err),
  })
}

export function useRegisterOrganizationPlanPayment() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: RegisterOrganizationPlanPaymentRequest
    }) => organizationsApi.registerPlanPayment(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.organizations.lists })
      qc.invalidateQueries({ queryKey: qk.organizations.detail(variables.id) })
      toast.success('Pago del plan registrado y vencimiento actualizado')
    },
  })
}

export function useDeleteOrganization() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => organizationsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.organizations.lists })
      toast.success('Organización eliminada correctamente')
    },
    onError: (err) => handleApiError(err),
  })
}
