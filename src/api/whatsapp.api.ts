import { api } from './client'
import type {
  SendMessageRequest,
  SendMessageResponse,
  MessagesByPhoneResponse,
  ConversationsResponse,
  DeleteMessagesResponse,
} from '@/types/api'

export const whatsappApi = {
  getMessagesByPhone: async (phone: string): Promise<MessagesByPhoneResponse> => {
    const response = await api.get<MessagesByPhoneResponse>(`/whatsapp/messages/${encodeURIComponent(phone)}`)
    return response.data
  },

  getConversations: async (organizationId?: string): Promise<ConversationsResponse> => {
    const response = await api.get<ConversationsResponse>('/whatsapp/conversations', {
      params: { organizationId },
    })
    return response.data
  },

  sendMessage: async (
    data: SendMessageRequest,
    organizationId?: string,
  ): Promise<SendMessageResponse> => {
    const response = await api.post<SendMessageResponse>('/whatsapp/send', data, {
      params: { organizationId },
    })
    return response.data
  },

  deleteMessagesByPhone: async (
    phone: string,
    organizationId?: string,
  ): Promise<DeleteMessagesResponse> => {
    const response = await api.delete<DeleteMessagesResponse>(
      `/whatsapp/messages/${encodeURIComponent(phone)}`,
      { params: { organizationId } },
    )
    return response.data
  },
}
