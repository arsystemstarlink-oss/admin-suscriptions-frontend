import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { whatsappApi } from '@/api/whatsapp.api'
import { qk } from '@/lib/query-keys'
import type { MessagesByPhoneResponse, SendMessageRequest, WhatsAppMessage } from '@/types/api'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/error-handler'

/** Prefijo del id de un mensaje que aún no confirma el servidor. */
export const PENDING_MESSAGE_PREFIX = 'pending-'

export function useWhatsAppMessages(phone: string | null, organizationId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...qk.whatsapp.messages(phone || ''), organizationId],
    queryFn: () => whatsappApi.getMessagesByPhone(phone!, organizationId),
    enabled: !!phone && (options?.enabled ?? true),
  })
}

export function whatsAppConversationsQueryOptions(organizationId?: string) {
  return {
    queryKey: [...qk.whatsapp.conversations, organizationId],
    queryFn: () => whatsappApi.getConversations(organizationId),
    staleTime: 5 * 60_000,
  }
}

export function useWhatsAppConversations(organizationId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    ...whatsAppConversationsQueryOptions(organizationId),
    ...options,
  })
}

export function useSendMessage(organizationId?: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: SendMessageRequest) => whatsappApi.sendMessage(data, organizationId),
    // Optimista: el mensaje de texto aparece al instante y se retira si el envío falla.
    // Las plantillas no: su texto final lo resuelve el servidor.
    onMutate: async (variables) => {
      if (!variables.body) return undefined
      const queryKey = [...qk.whatsapp.messages(variables.to), organizationId]
      await qc.cancelQueries({ queryKey })
      const previous = qc.getQueryData<MessagesByPhoneResponse>(queryKey)
      if (!previous) return undefined
      const pending: WhatsAppMessage = {
        id: `${PENDING_MESSAGE_PREFIX}${Date.now()}`,
        organizationId,
        phone: variables.to,
        direction: 'OUTBOUND',
        messageSid: '',
        body: variables.body,
        status: 'SENT',
        createdAt: new Date().toISOString(),
      }
      qc.setQueryData<MessagesByPhoneResponse>(queryKey, {
        ...previous,
        messages: [...previous.messages, pending],
      })
      return { queryKey, previous }
    },
    onError: (_error, _variables, context) => {
      if (context) qc.setQueryData(context.queryKey, context.previous)
    },
    onSettled: (_data, _error, variables) => {
      qc.invalidateQueries({ queryKey: qk.whatsapp.messages(variables.to) })
      qc.invalidateQueries({ queryKey: qk.whatsapp.conversations })
    },
  })
}

export function useMarkConversationRead(organizationId?: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (phone: string) => whatsappApi.markConversationRead(phone, organizationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.badges })
    },
  })
}

export function useDeleteChat() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ phone, password, organizationId }: { phone: string; password: string; organizationId?: string }) =>
      whatsappApi.deleteMessagesByPhone(phone, password, organizationId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.whatsapp.messages(variables.phone) })
      qc.invalidateQueries({ queryKey: qk.whatsapp.conversations })
      qc.invalidateQueries({ queryKey: qk.badges })
      toast.success('Conversación eliminada correctamente')
    },
    onError: (err) => handleApiError(err),
  })
}

export function useDeleteChats() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({
      phones,
      password,
      organizationId,
    }: {
      phones: string[]
      password: string
      organizationId?: string
    }) => whatsappApi.deleteMessagesByPhones(phones, password, organizationId),
    onSuccess: (_data, variables) => {
      variables.phones.forEach((phone) => {
        qc.invalidateQueries({ queryKey: qk.whatsapp.messages(phone) })
      })
      qc.invalidateQueries({ queryKey: qk.whatsapp.conversations })
      qc.invalidateQueries({ queryKey: qk.badges })
      toast.success(`${variables.phones.length} chats eliminados correctamente`)
    },
    onError: (err) => handleApiError(err),
  })
}
