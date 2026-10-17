import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { whatsappApi } from '@/api/whatsapp.api'
import { qk } from '@/lib/query-keys'
import type { SendMessageRequest } from '@/types/api'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/error-handler'

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
    onSuccess: (_data, variables) => {
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
