import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { useUIStore } from '@/stores/ui.store'
import { Button } from '@/components/ui/button'
import { Search, Menu, MessageSquare } from 'lucide-react'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { useClients } from '@/hooks/useClients'
import { whatsappApi } from '@/api/whatsapp.api'
import { qk } from '@/lib/query-keys'

interface TopBarProps {
  isMobile: boolean
  onMobileToggle: () => void
}

export function TopBar({ isMobile, onMobileToggle }: TopBarProps) {
  const { openOmniSearch, readChatTimestamps } = useUIStore()
  const navigate = useNavigate()
  const { data: clientsData } = useClients({ limit: 100 })

  const clients = clientsData?.clients || []
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

  const unreadChatsCount = useMemo(() => {
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

  return (
    <header className="h-16 border-b border-primary-700 flex items-center justify-between px-4 md:px-6 bg-primary-800 text-primary-50 dark:bg-primary-950 dark:text-primary-50 dark:border-primary-900">
      <div className="flex items-center gap-3">
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileToggle}
            className="md:hidden text-primary-50 hover:bg-primary-700 hover:text-primary-50 dark:hover:bg-primary-900"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5 shrink-0" />
          </Button>
        )}

        <div className="flex items-center gap-1.5">
          <span className="text-xl font-black tracking-wider text-secondary-500">AR</span>
          <span className="text-xl font-semibold tracking-wider text-primary-50 hidden sm:inline">SISTEMA</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="relative h-9 w-9 rounded-full bg-primary-700 border-primary-600 text-primary-50 hover:bg-primary-600 hover:text-primary-50 dark:bg-primary-900 dark:border-primary-800 dark:hover:bg-primary-800"
          onClick={() => navigate('/chats')}
          aria-label="Abrir chats"
        >
          <MessageSquare className="h-4 w-4 shrink-0" />
          {unreadChatsCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-semibold text-white">
              {unreadChatsCount}
            </span>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 w-48 sm:w-64 justify-start bg-primary-700 border-primary-600 text-primary-50 hover:bg-primary-600 hover:text-primary-50 dark:bg-primary-900 dark:border-primary-800 dark:hover:bg-primary-800"
          onClick={openOmniSearch}
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Buscar... (Ctrl+K)</span>
          <span className="sm:hidden">Buscar</span>
        </Button>
        <ThemeToggle />
      </div>
    </header>
  )
}
