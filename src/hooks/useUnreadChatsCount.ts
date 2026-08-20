import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useUIStore } from '@/stores/ui.store'
import { useClients } from '@/hooks/useClients'
import { whatsappApi } from '@/api/whatsapp.api'
import { qk } from '@/lib/query-keys'

export function useUnreadChatsCount() {
  const { readChatTimestamps } = useUIStore()
  const { data: clientsData } = useClients({ limit: 100 })

  const clients = useMemo(() => clientsData?.clients || [], [clientsData])
  const clientPhones = useMemo(
    () => clients.map((client) => client.phone).filter(Boolean),
    [clients]
  )

  const conversationQueries = useQueries({
    queries: clientPhones.map((phone) => ({
      queryKey: qk.whatsapp.messages(phone),
      queryFn: () => whatsappApi.getMessagesByPhone(phone),
      enabled: !!phone,
      staleTime: 0,
      refetchInterval: 15_000,
      refetchIntervalInBackground: true,
    })),
  })

  return useMemo(() => {
    const twentyFourHoursInMs = 24 * 60 * 60 * 1000

    return conversationQueries.reduce((count, query, index) => {
      const phone = clientPhones[index]
      if (!phone || !query.data) return count

      const latestInboundTimestamp = query.data.messages.reduce((latest, message) => {
        if (message.direction !== 'INBOUND') return latest

        const messageTimestamp = new Date(message.createdAt).getTime()
        return Math.max(latest, messageTimestamp)
      }, -Infinity)

      const lastReadAt = readChatTimestamps[phone] ?? -Infinity
      const isRecentlyInbound = latestInboundTimestamp !== -Infinity
        && Date.now() - latestInboundTimestamp <= twentyFourHoursInMs

      if (!isRecentlyInbound || latestInboundTimestamp <= lastReadAt) {
        return count
      }

      return count + 1
    }, 0)
  }, [clientPhones, conversationQueries, readChatTimestamps])
}
