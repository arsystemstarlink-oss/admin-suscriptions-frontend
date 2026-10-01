import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useUIStore } from '@/stores/ui.store'
import { whatsappApi } from '@/api/whatsapp.api'
import { qk } from '@/lib/query-keys'

export function useUnreadChatsCount() {
  const { readChatTimestamps } = useUIStore()

  const { data: conversations } = useQuery({
    queryKey: qk.whatsapp.conversations,
    queryFn: () => whatsappApi.getConversations(),
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  })

  return useMemo(() => {
    const twentyFourHoursInMs = 24 * 60 * 60 * 1000

    return (conversations?.conversations || []).reduce((count, conv) => {
      const last = conv.lastMessage
      if (!last || last.direction !== 'INBOUND') return count

      const ts = new Date(last.createdAt).getTime()
      const isRecent = Date.now() - ts <= twentyFourHoursInMs
      const lastRead = readChatTimestamps[conv.phone] ?? -Infinity

      if (!isRecent || ts <= lastRead) return count

      return count + 1
    }, 0)
  }, [conversations, readChatTimestamps])
}
