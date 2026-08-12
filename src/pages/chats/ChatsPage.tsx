import { useEffect, useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useClients } from '@/hooks/useClients'
import { useWhatsAppMessages, useSendMessage } from '@/hooks/useWhatsApp'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Send, Users, ArrowLeft } from 'lucide-react'
import { cn, getClientFullName } from '@/lib/utils'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { whatsappApi } from '@/api/whatsapp.api'
import { qk } from '@/lib/query-keys'
import type { WhatsAppMessage } from '@/types/api'
import { useUIStore } from '@/stores/ui.store'

export function ChatsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const phoneFromUrl = searchParams.get('phone')
  const [selectedPhone, setSelectedPhone] = useState<string | null>(phoneFromUrl)
  const [message, setMessage] = useState('')
  const [hasAutoSelected, setHasAutoSelected] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { markChatAsRead } = useUIStore()

  const { data: clientsData, isLoading: clientsLoading } = useClients({ limit: 100 })
  const { data: messagesData, isLoading: messagesLoading } = useWhatsAppMessages(selectedPhone)
  const sendMessageMutation = useSendMessage()

  const clients = clientsData?.clients || []
  const messages = messagesData?.messages || []
  const canSendFreeMessage = useMemo(() => {
    const twentyFourHoursInMs = 24 * 60 * 60 * 1000

    return messages.some((message) => {
      if (message.direction !== 'INBOUND') return false

      const messageAge = Date.now() - new Date(message.createdAt).getTime()
      return messageAge <= twentyFourHoursInMs
    })
  }, [messages])
  const clientPhones = useMemo(
    () => clients.map((client) => client.phone).filter(Boolean),
    [clients]
  )

  const conversationQueries = useQueries({
    queries: clientPhones.map((phone) => ({
      queryKey: qk.whatsapp.messages(phone),
      queryFn: () => whatsappApi.getMessagesByPhone(phone),
      enabled: !!phone,
      staleTime: 5 * 60 * 1000,
    })),
  })

  const conversationSummaries = useMemo(() => {
    return clientPhones.map((phone, index) => {
      const query = conversationQueries[index]
      const messages = query.data?.messages ?? []

      const latestMessage = messages.reduce<WhatsAppMessage | null>((latest, message) => {
        if (!latest) return message

        const latestTimestamp = new Date(latest.createdAt).getTime()
        const currentTimestamp = new Date(message.createdAt).getTime()

        return currentTimestamp > latestTimestamp ? message : latest
      }, null)

      return {
        phone,
        latestMessage,
        latestTimestamp: latestMessage ? new Date(latestMessage.createdAt).getTime() : -Infinity,
      }
    })
  }, [clientPhones, conversationQueries])

  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => {
      const aSummary = conversationSummaries.find((item) => item.phone === a.phone)
      const bSummary = conversationSummaries.find((item) => item.phone === b.phone)
      return (bSummary?.latestTimestamp ?? -Infinity) - (aSummary?.latestTimestamp ?? -Infinity)
    })
  }, [clients, conversationSummaries])

  const latestConversationPhone = useMemo(() => {
    let chosenPhone: string | null = clientPhones[0] || null
    let latestTimestamp = -Infinity

    conversationSummaries.forEach((summary) => {
      if (summary.latestTimestamp > latestTimestamp) {
        latestTimestamp = summary.latestTimestamp
        chosenPhone = summary.phone
      }
    })

    return chosenPhone
  }, [clientPhones, conversationSummaries])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (!isMobile && !hasAutoSelected && !phoneFromUrl && latestConversationPhone) {
      setSelectedPhone(latestConversationPhone)
      setHasAutoSelected(true)
    }
  }, [hasAutoSelected, isMobile, latestConversationPhone, phoneFromUrl])

  useEffect(() => {
    if (selectedPhone) {
      markChatAsRead(selectedPhone, Date.now())
    }
  }, [selectedPhone, markChatAsRead])

  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  const handleSendMessage = async () => {
    if (!selectedPhone || !message.trim()) return

    try {
      await sendMessageMutation.mutateAsync({
        to: selectedPhone,
        body: message.trim(),
      })
      setMessage('')
      toast.success('Mensaje enviado')
    } catch {
      toast.error('Error al enviar mensaje. Verifica que el cliente haya escrito en las últimas 24h o usa un template.')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="flex flex-col h-full gap-4 md:gap-6">
      <div className={cn('shrink-0', isMobile && selectedPhone ? 'hidden' : 'block')}>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Mensajes</h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Conversaciones de WhatsApp con clientes
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0">
        <Card
          className={cn(
            'md:col-span-1 flex flex-col overflow-hidden h-full min-h-0',
            isMobile && selectedPhone ? 'hidden' : 'block'
          )}
        >
          <CardHeader className="border-b border-border shrink-0">
            <h2 className="font-semibold text-foreground">Conversaciones</h2>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            {clientsLoading ? (
              <div className="space-y-3 p-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : clients.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 shrink-0" />
                <p className="text-muted-foreground text-sm">No hay clientes disponibles</p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {sortedClients.map((client) => {
                  const summary = conversationSummaries.find((item) => item.phone === client.phone)
                  const latestMessage = summary?.latestMessage ?? null
                  const initial = getClientFullName(client).charAt(0).toUpperCase() || '?'

                  return (
                    <Button
                      key={client.id}
                      type="button"
                      variant="ghost"
                      onClick={() => {
                      setSelectedPhone(client.phone)
                      if (searchParams.get('phone')) {
                        const next = new URLSearchParams(searchParams)
                        next.delete('phone')
                        setSearchParams(next, { replace: true })
                      }
                      markChatAsRead(client.phone, Date.now())
                    }}
                      className={cn(
                        'h-auto w-full justify-start text-left p-3 rounded-xl border transition-all duration-200',
                        selectedPhone === client.phone
                          ? 'bg-sky-50/90 dark:bg-sky-950/40 border-primary/70 shadow-md shadow-primary/10 hover:bg-sky-50/90 dark:hover:bg-sky-950/40'
                          : 'bg-card border-border hover:bg-muted/70'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                          {initial}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <p className="font-medium text-foreground truncate">{getClientFullName(client)}</p>
                              {latestMessage?.direction === 'INBOUND' && (
                                <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                              )}
                            </div>

                            {latestMessage && (
                              <span className="text-[11px] text-muted-foreground">
                                {format(new Date(latestMessage.createdAt), 'HH:mm')}
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex items-center justify-between gap-2">
                            <p className="text-xs text-muted-foreground truncate">
                              {latestMessage?.body || client.phone}
                            </p>
                            <div className="flex items-center gap-1.5">
                              {latestMessage?.direction === 'INBOUND' && (
                                <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                                  Nuevo
                                </span>
                              )}
                              {client.hasDebt && (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">
                                  Deuda
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card
          className={cn(
            'md:col-span-2 flex flex-col overflow-hidden h-full min-h-0',
            isMobile && !selectedPhone ? 'hidden' : 'block'
          )}
        >
          {!selectedPhone ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4 shrink-0" />
                <p className="text-muted-foreground">Selecciona una conversación</p>
              </div>
            </div>
          ) : (
            <>
              <CardHeader className="border-b border-border shrink-0">
                <div className="flex items-center justify-between gap-3">
                  {isMobile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedPhone(null)
                        if (searchParams.get('phone')) {
                          const next = new URLSearchParams(searchParams)
                          next.delete('phone')
                          setSearchParams(next, { replace: true })
                        }
                      }}
                      className="md:hidden"
                      aria-label="Volver a conversaciones"
                    >
                      <ArrowLeft className="h-4 w-4 shrink-0" />
                    </Button>
                  )}
                  <div>
                    <h2 className="font-semibold text-foreground">
                      {(() => {
                        const selectedClient = clients.find((c) => c.phone === selectedPhone)
                        return selectedClient ? getClientFullName(selectedClient) : selectedPhone
                      })()}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{selectedPhone}</p>
                  </div>
                </div>
              </CardHeader>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messagesLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : sortedMessages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4 shrink-0" />
                    <p className="text-muted-foreground text-sm">No hay mensajes en esta conversación</p>
                  </div>
                ) : (
                  sortedMessages.map((msg) => {
                    const isOutbound = msg.direction === 'OUTBOUND'

                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          'flex',
                          isOutbound ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-[78%] rounded-2xl px-4 py-3 shadow-sm',
                            isOutbound
                              ? 'bg-sky-500 dark:bg-sky-700 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-50'
                          )}
                        >
                          <div className="flex items-center justify-between gap-3 mb-1">
                            <span
                              className={cn(
                                'text-[10px] font-semibold uppercase tracking-wide',
                                isOutbound ? 'text-white/85' : 'text-slate-500 dark:text-slate-300'
                              )}
                            >
                              {isOutbound ? 'Tú' : 'Cliente'}
                            </span>
                            <span
                              className={cn(
                                'text-[11px]',
                                isOutbound ? 'text-white/75' : 'text-slate-500 dark:text-slate-300'
                              )}
                            >
                              {format(new Date(msg.createdAt), 'HH:mm')}
                            </span>
                          </div>

                          <p className="text-sm whitespace-pre-wrap wrap-break-word leading-6 text-current">{msg.body}</p>

                          <div
                            className={cn(
                              'mt-2 flex items-center justify-end gap-2 text-[11px]',
                              isOutbound ? 'text-white/80' : 'text-slate-500 dark:text-slate-300'
                            )}
                          >
                            {isOutbound && (
                              <span>
                                {msg.status === 'FAILED'
                                  ? 'No enviado'
                                  : msg.status === 'READ'
                                    ? 'Leído'
                                    : msg.status === 'DELIVERED'
                                      ? 'Entregado'
                                      : 'Enviado'}
                              </span>
                            )}
                            {msg.status === 'FAILED' && !isOutbound && (
                              <span className="text-red-500">Error</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="border-t border-border p-4 shrink-0">
                <div className="flex gap-2">
                  <Input
                    placeholder={
                      canSendFreeMessage
                        ? 'Escribe un mensaje...'
                        : 'El cliente no ha escrito en las últimas 24h'
                    }
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={sendMessageMutation.isPending || !canSendFreeMessage}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!canSendFreeMessage || !message.trim() || sendMessageMutation.isPending}
                    size="icon"
                  >
                    <Send className="h-4 w-4 shrink-0" />
                  </Button>
                </div>
                <p className="text-xs mt-2 text-muted-foreground">
                  {canSendFreeMessage
                    ? 'Solo puedes enviar mensajes libres si el cliente escribió en las últimas 24h'
                    : 'Este chat está bloqueado para mensajes libres porque el cliente no ha escrito en las últimas 24h. Usa un template.'}
                </p>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
