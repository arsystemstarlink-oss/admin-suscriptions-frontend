import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useClients } from '@/hooks/useClients'
import { useWhatsAppMessages, useSendMessage, useWhatsAppConversations, useDeleteChat } from '@/hooks/useWhatsApp'
import { useOrganizationStore } from '@/stores/organization.store'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Send, Users, ArrowLeft, Trash2 } from 'lucide-react'
import { cn, getClientFullName, getInitial } from '@/lib/utils'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { PageHeader } from '@/components/design-system/PageHeader'
import { OrganizationSelectionEmptyState } from '@/components/organizations/OrganizationSelectionEmptyState'
import { EmptyState } from '@/components/design-system/EmptyState'
import type { WhatsAppMessage } from '@/types/api'
import { useUIStore } from '@/stores/ui.store'
import { useIsSuperAdmin } from '@/stores/auth.store'

const isSameDay = (date: Date, reference: Date = new Date()): boolean =>
  date.getFullYear() === reference.getFullYear() &&
  date.getMonth() === reference.getMonth() &&
  date.getDate() === reference.getDate()

const formatChatTime = (iso: string): string => {
  const date = new Date(iso)
  return isSameDay(date) ? format(date, 'HH:mm') : format(date, 'd MMM')
}

const formatMessageTime = (iso: string): string => {
  const date = new Date(iso)
  return isSameDay(date) ? format(date, 'HH:mm') : format(date, 'd MMM, HH:mm')
}

export function ChatsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const phoneFromUrl = searchParams.get('phone')
  const [selectedPhone, setSelectedPhone] = useState<string | null>(phoneFromUrl)
  const [message, setMessage] = useState('')
  const [hasAutoSelected, setHasAutoSelected] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const sendingRef = useRef(false)
  const { markChatAsRead } = useUIStore()
  const { readChatTimestamps } = useUIStore()
  const isSuperAdmin = useIsSuperAdmin()
  const organizationId = useOrganizationStore((state) => state.selectedOrganizationId)

  const { data: clientsData, isLoading: clientsLoading } = useClients(
    { limit: 100, organizationId: organizationId ?? undefined },
    { enabled: !isSuperAdmin || !!organizationId }
  )
  const { data: conversationsData } = useWhatsAppConversations(organizationId ?? undefined, { enabled: !isSuperAdmin || !!organizationId })

  const clients = useMemo(() => clientsData?.clients || [], [clientsData])
  const clientPhones = useMemo(
    () => clients.map((client) => client.phone).filter(Boolean),
    [clients]
  )

  const phoneToOrganizationId = useMemo(() => {
    const map = new Map<string, string>()
    clients.forEach((client) => {
      if (client.phone && client.organizationId) map.set(client.phone, client.organizationId)
    })
    ;(conversationsData?.conversations || []).forEach((conv) => {
      if (conv.phone && conv.lastMessage?.organizationId) {
        map.set(conv.phone, conv.lastMessage.organizationId)
      }
    })
    return map
  }, [clients, conversationsData])

  const selectedChatOrganizationId = selectedPhone
    ? phoneToOrganizationId.get(selectedPhone)
    : undefined
  const chatOrganizationId = selectedChatOrganizationId ?? organizationId ?? undefined
  const {
    data: messagesData,
    isLoading: messagesLoading,
    error: messagesError,
  } = useWhatsAppMessages(selectedPhone, chatOrganizationId, {
    enabled: !!selectedPhone && (!isSuperAdmin || !!chatOrganizationId),
  })
  const sendMessageMutation = useSendMessage(chatOrganizationId)
  const deleteChatMutation = useDeleteChat()
  const messages = useMemo(() => messagesData?.messages || [], [messagesData])
  const canSendFreeMessage = useMemo(() => {
    const twentyFourHoursInMs = 24 * 60 * 60 * 1000

    return messages.some((message) => {
      if (message.direction !== 'INBOUND') return false

      const messageAge = Date.now() - new Date(message.createdAt).getTime()
      return messageAge <= twentyFourHoursInMs
    })
  }, [messages])

  const unknownConversations = useMemo(
    () => (conversationsData?.conversations || []).filter((conv) => !clientPhones.includes(conv.phone)),
    [conversationsData, clientPhones]
  )

  const conversationMap = useMemo(() => {
    const map = new Map<string, { latestMessage: WhatsAppMessage; latestTimestamp: number }>()
    for (const conv of conversationsData?.conversations || []) {
      if (conv.lastMessage) {
        map.set(conv.phone, {
          latestMessage: conv.lastMessage,
          latestTimestamp: new Date(conv.lastMessage.createdAt).getTime(),
        })
      }
    }
    return map
  }, [conversationsData])

  type ConversationItem = {
    key: string
    phone: string
    name: string
    hasDebt: boolean
    latestMessage: WhatsAppMessage | null
    latestTimestamp: number
  }

  const conversationItems = useMemo<ConversationItem[]>(() => {
    const items: ConversationItem[] = clients.map((client) => {
      const summary = conversationMap.get(client.phone)

      return {
        key: client.id,
        phone: client.phone,
        name: getClientFullName(client),
        hasDebt: !!client.hasDebt,
        latestMessage: summary?.latestMessage ?? null,
        latestTimestamp: summary?.latestTimestamp ?? -Infinity,
      }
    })

    unknownConversations.forEach((conv) => {
      const client = conv.clientId ? clients.find((c) => c.id === conv.clientId) : undefined

      items.push({
        key: `conv:${conv.phone}`,
        phone: conv.phone,
        name: client ? getClientFullName(client) : conv.profileName || conv.phone,
        hasDebt: !!client?.hasDebt,
        latestMessage: conv.lastMessage,
        latestTimestamp: new Date(conv.lastMessage.createdAt).getTime(),
      })
    })

    return items.sort((a, b) => b.latestTimestamp - a.latestTimestamp)
  }, [clients, conversationMap, unknownConversations])

  const latestConversationPhone = useMemo(() => {
    let chosenPhone: string | null = null
    let latestTimestamp = -Infinity
    const twentyFourHoursInMs = 24 * 60 * 60 * 1000

    conversationItems.forEach((item) => {
      const phone = item.phone
      if (!phone || !item.latestMessage) return

      const isInbound = item.latestMessage.direction === 'INBOUND'
      const messageAge = Date.now() - new Date(item.latestMessage.createdAt).getTime()
      const isRecent = messageAge <= twentyFourHoursInMs
      const lastReadAt = readChatTimestamps[phone] ?? -Infinity
      const isUnread = item.latestTimestamp > lastReadAt

      if (isInbound && isRecent && isUnread && item.latestTimestamp > latestTimestamp) {
        latestTimestamp = item.latestTimestamp
        chosenPhone = phone
      }
    })

    return chosenPhone
  }, [conversationItems, readChatTimestamps])

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

  useEffect(() => {
    if (!isMobile || !selectedPhone) return
    const main = document.querySelector('main')
    const previousOverflow = main instanceof HTMLElement ? main.style.overflow : ''
    if (main instanceof HTMLElement) main.style.overflow = 'hidden'
    return () => {
      if (main instanceof HTMLElement) main.style.overflow = previousOverflow
    }
  }, [isMobile, selectedPhone])

  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  useEffect(() => {
    const container = messagesContainerRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, [selectedPhone, sortedMessages.length, messagesLoading])

  const handleSendMessage = async () => {
    if (!selectedPhone || !message.trim() || sendingRef.current) return
    sendingRef.current = true
    try {
      await sendMessageMutation.mutateAsync({
        to: selectedPhone,
        body: message.trim(),
      })
      setMessage('')
      toast.success('Mensaje enviado')
    } catch (err) {
      const apiError = err as { code?: string; message?: string; twilioCode?: number; moreInfo?: string }
      if (apiError.code === 'WHATSAPP_NOT_CONFIGURED') {
        toast.error(
          'WhatsApp no está configurado para esta organización. Configura Twilio en la organización.'
        )
      } else if (apiError.code === 'ORGANIZATION_INACTIVE') {
        toast.error('La organización está inactiva y no puede enviar mensajes de WhatsApp.')
      } else if (apiError.code === 'TWILIO_ERROR') {
        const twilioDetail = apiError.twilioCode ? ` (Código Twilio: ${apiError.twilioCode})` : ''
        toast.error(`${apiError.message || 'Error de Twilio al enviar el mensaje.'}${twilioDetail}`)
      } else {
        toast.error('Error al enviar mensaje. Verifica que el cliente haya escrito en las últimas 24h o usa un template.')
      }
    } finally {
      sendingRef.current = false
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleDeleteChat = () => {
    if (!selectedPhone) return

    if (
      !confirm(
        '¿Eliminar esta conversación? Todos los mensajes con este número se borrarán permanentemente.'
      )
    ) {
      return
    }

    deleteChatMutation.mutate(
      { phone: selectedPhone, organizationId: isSuperAdmin ? chatOrganizationId : undefined },
      {
        onSuccess: () => {
          setSelectedPhone(null)
          setMessage('')
        },
      }
    )
  }

  const selectedClient = clients.find((c) => c.phone === selectedPhone)
  const selectedClientName = selectedClient
    ? getClientFullName(selectedClient)
    : conversationItems.find((item) => item.phone === selectedPhone)?.name || selectedPhone

  const openConversation = (phone: string) => {
    setSelectedPhone(phone)
    if (searchParams.get('phone')) {
      const next = new URLSearchParams(searchParams)
      next.delete('phone')
      setSearchParams(next, { replace: true })
    }
    markChatAsRead(phone, Date.now())
  }

  const closeConversation = () => {
    setSelectedPhone(null)
    if (searchParams.get('phone')) {
      const next = new URLSearchParams(searchParams)
      next.delete('phone')
      setSearchParams(next, { replace: true })
    }
  }

  const showEmpty = isSuperAdmin && !organizationId

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <PageHeader
        title="Chats"
        description="Conversaciones de WhatsApp con clientes"
        className={cn('block shrink-0', isMobile && selectedPhone && 'hidden')}
      />

      {showEmpty ? (
        <OrganizationSelectionEmptyState description="Elige una organización para consultar las conversaciones." />
      ) : (
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0">
          <Card className={cn(
            'md:col-span-1 flex flex-col overflow-hidden min-h-0 rounded-2xl border border-border bg-surface text-surface-foreground shadow-sm',
            isMobile && selectedPhone && 'hidden'
          )}>
            <CardHeader className="border-b border-border shrink-0 py-4 px-4">
              <h2 className="font-semibold text-foreground">Conversaciones</h2>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto p-2">
              {clientsLoading && conversationItems.length === 0 ? (
                <div className="space-y-3 p-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : conversationItems.length === 0 ? (
                <EmptyState
                  icon={<Users className="h-12 w-12 text-muted-foreground" />}
                  title="No hay conversaciones disponibles"
                />
              ) : (
                <div className="space-y-1">
                  {conversationItems.map((item) => {
                    const latestMessage = item.latestMessage
                    const initial = getInitial(item.name)
                    const isUnread =
                      !!latestMessage &&
                      latestMessage.direction === 'INBOUND' &&
                      item.latestTimestamp > (readChatTimestamps[item.phone] ?? -Infinity)

                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => openConversation(item.phone)}
                        className={cn(
                          'h-auto w-full justify-start text-left p-3 rounded-2xl border active:scale-[0.98] transition-all touch-manipulation shadow-sm',
                          selectedPhone === item.phone
                            ? 'bg-surface-active border-border-strong shadow-md shadow-primary/10 hover:bg-surface-hover'
                            : 'bg-surface text-surface-foreground border-border hover:bg-surface-hover'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                            {initial}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-2">
                                <p className="font-medium text-foreground truncate">{item.name}</p>
                                {isUnread && (
                                  <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-success" />
                                )}
                              </div>

                              {latestMessage && (
                                <span className="text-[11px] text-muted-foreground">
                                  {formatChatTime(latestMessage.createdAt)}
                                </span>
                              )}
                            </div>

                            <div className="mt-1 flex items-center justify-between gap-2">
                              <p className="text-xs text-muted-foreground truncate">
                                {latestMessage?.body || item.phone}
                              </p>
                              <div className="flex items-center gap-1.5">
                                {isUnread && (
                                  <span className="rounded-full bg-success/10 text-success px-1.5 py-0.5 text-xs font-medium">
                                    Nuevo
                                  </span>
                                )}
                                {item.hasDebt && (
                                  <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                                    Deuda
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div
            className={cn(
              'md:col-span-2 min-h-0',
              isMobile
                ? cn(
                    'fixed inset-x-0 z-40 flex flex-col bg-background text-foreground transition-transform duration-300 ease-out',
                    'top-(--mobile-header-h) bottom-(--mobile-nav-h) h-[calc(100dvh-var(--mobile-header-h)-var(--mobile-nav-h))]',
                    selectedPhone ? 'translate-x-0 pointer-events-auto' : 'translate-x-full pointer-events-none'
                  )
                : 'flex'
            )}
            aria-hidden={isMobile && !selectedPhone}
          >
            <Card className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-none border-0 bg-surface text-surface-foreground shadow-none md:rounded-3xl md:border md:border-border md:bg-surface md:shadow-sm">
              {!selectedPhone ? (
                <div className="hidden flex-1 items-center justify-center md:flex">
                  <EmptyState
                    icon={<MessageSquare className="h-16 w-16 text-muted-foreground" />}
                    title="Selecciona una conversación"
                  />
                </div>
              ) : (
                <>
                  <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface-muted px-3 text-surface-foreground md:h-16 md:px-5">
                    <button
                      type="button"
                      onClick={closeConversation}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-foreground active:scale-95 transition-transform touch-manipulation md:hidden"
                      aria-label="Volver a conversaciones"
                    >
                      <ArrowLeft className="h-5 w-5 shrink-0" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-base font-semibold leading-tight text-foreground">
                        {selectedClientName}
                      </h2>
                      <p className="truncate text-xs text-muted-foreground">{selectedPhone}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleDeleteChat}
                      disabled={
                        deleteChatMutation.isPending ||
                        (isSuperAdmin && !chatOrganizationId)
                      }
                      className="h-10 w-10 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Eliminar conversación"
                    >
                      <Trash2 className="h-5 w-5 shrink-0" />
                    </Button>
                  </header>

                  <div ref={messagesContainerRef} className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-3 md:px-4 md:py-4 space-y-3">
                    {messagesLoading ? (
                      <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                        ))}
                      </div>
                    ) : messagesError ? (
                      <EmptyState
                        icon={<MessageSquare className="h-12 w-12 text-muted-foreground" />}
                        title="No se pudieron cargar los mensajes"
                        description="Intenta abrir la conversación nuevamente."
                      />
                    ) : sortedMessages.length === 0 ? (
                      <EmptyState
                        icon={<MessageSquare className="h-12 w-12 text-muted-foreground" />}
                        title="No hay mensajes en esta conversación"
                      />
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
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-surface-muted text-surface-muted-foreground'
                              )}
                            >
                              <div className="flex items-center justify-between gap-3 mb-1">
                                <span
                                  className={cn(
                                    'text-[10px] font-semibold uppercase tracking-wide',
                                    isOutbound ? 'text-primary-foreground/85' : 'text-muted-foreground'
                                  )}
                                >
                                  {isOutbound ? 'Tú' : 'Cliente'}
                                </span>
                                <span
                                  className={cn(
                                    'text-[11px]',
                                    isOutbound ? 'text-primary-foreground/75' : 'text-muted-foreground'
                                  )}
                                >
                                  {formatMessageTime(msg.createdAt)}
                                </span>
                              </div>

                              <p className="text-sm whitespace-pre-wrap wrap-break-word leading-6 text-current">{msg.body}</p>

                              <div
                                className={cn(
                                  'mt-2 flex items-center justify-end gap-2 text-[11px]',
                                  isOutbound ? 'text-primary-foreground/80' : 'text-muted-foreground'
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
                                  <span className="text-destructive">Error</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  <div className="shrink-0 border-t border-border bg-surface-muted px-3 py-3 text-surface-foreground md:px-4 md:py-4">
                    <p className="mb-2 text-xs text-muted-foreground">
                      {canSendFreeMessage
                        ? 'Puedes responder porque el cliente escribió en las últimas 24h'
                        : 'Bloqueado: el cliente no ha escrito en las últimas 24h. Usa un template.'}
                    </p>
                    <div className="flex items-center gap-2">
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
                        className="flex-1 h-11"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!canSendFreeMessage || !message.trim() || sendMessageMutation.isPending}
                        size="icon"
                        className="h-11 w-11 shrink-0"
                        aria-label="Enviar mensaje"
                      >
                        <Send className="h-4 w-4 shrink-0" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}