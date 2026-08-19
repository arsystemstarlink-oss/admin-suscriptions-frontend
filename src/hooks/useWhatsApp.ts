import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { whatsappApi } from '@/api/whatsapp.api'
import { qk } from '@/lib/query-keys'
import type { SendMessageRequest } from '@/types/api'

export function useWhatsAppMessages(phone: string | null) {
  return useQuery({
    queryKey: qk.whatsapp.messages(phone || ''),
    queryFn: () => whatsappApi.getMessagesByPhone(phone!),
    enabled: !!phone,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  })
}

export function useWhatsAppConversations(organizationId?: string) {
  return useQuery({
    queryKey: [...qk.whatsapp.conversations, organizationId],
    queryFn: () => whatsappApi.getConversations(organizationId),
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
