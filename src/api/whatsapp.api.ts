import { api } from './client'
import type {
  SendMessageRequest,
  SendMessageResponse,
  MessagesByPhoneResponse,
  ConversationsResponse,
  DeleteMessagesResponse,
  DeleteChatsResponse,
} from '@/types/api'

export const whatsappApi = {
  getMessagesByPhone: async (phone: string, organizationId?: string): Promise<MessagesByPhoneResponse> => {
    const response = await api.get<MessagesByPhoneResponse>(`/whatsapp/messages/${encodeURIComponent(phone)}`, {
      params: { organizationId },
    })
    return response.data
  },

  getConversations: async (organizationId?: string): Promise<ConversationsResponse> => {
    const response = await api.get<ConversationsResponse>('/whatsapp/conversations', {
      params: { organizationId },
    })
    return response.data
  },

  markConversationRead: async (
    phone: string,
    organizationId?: string,
  ): Promise<{ success: boolean; read: boolean }> => {
    const response = await api.post<{ success: boolean; read: boolean }>(
      `/whatsapp/conversations/${encodeURIComponent(phone)}/read`,
      undefined,
      { params: { organizationId } },
    )
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
    password: string,
    organizationId?: string,
  ): Promise<DeleteMessagesResponse> => {
    const response = await api.delete<DeleteMessagesResponse>(
      `/whatsapp/messages/${encodeURIComponent(phone)}`,
      { params: { organizationId }, data: { password } },
    )
    return response.data
  },

  deleteMessagesByPhones: async (
    phones: string[],
    password: string,
    organizationId?: string,
  ): Promise<DeleteChatsResponse> => {
    const response = await api.delete<DeleteChatsResponse>('/whatsapp/messages/batch', {
      params: { organizationId },
      data: { phones, password },
    })
    return response.data
  },
}
