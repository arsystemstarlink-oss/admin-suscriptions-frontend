import { api } from './client'
import type {
  SendMessageRequest,
  SendMessageResponse,
  MessagesByPhoneResponse,
  ConversationsResponse,
} from '@/types/api'

export const whatsappApi = {
  getMessagesByPhone: async (phone: string): Promise<MessagesByPhoneResponse> => {
    const response = await api.get<MessagesByPhoneResponse>(`/whatsapp/messages/${encodeURIComponent(phone)}`)
    return response.data
  },

  getConversations: async (): Promise<ConversationsResponse> => {
    const response = await api.get<ConversationsResponse>('/whatsapp/conversations')
    return response.data
  },

  sendMessage: async (data: SendMessageRequest): Promise<SendMessageResponse> => {
    const response = await api.post<SendMessageResponse>('/whatsapp/send', data)
    return response.data
  },
}
