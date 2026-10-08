import { useDashboardAlerts } from '@/hooks/useDashboard'
import { useUIStore } from '@/stores/ui.store'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { billingApi } from '@/api/billing.api'
import { qk } from '@/lib/query-keys'
import { formatCurrency, formatDate } from '@/lib/constants'
import { useDolarRates } from '@/hooks/useExchange'
import { useExchangeStore } from '@/stores/exchange.store'
import { getRateForSource } from '@/lib/exchange'
import { BsReference } from '@/components/exchange/BsReference'
import type { AlertItem, DebtorItem } from '@/types/api'
import { AlertTriangle, MessageSquare, DollarSign, Calendar, ChevronRight, ChevronDown, Clock, Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { useSendMessage } from '@/hooks/useWhatsApp'
import { useOrganizationWhatsAppConfig } from '@/hooks/useOrganizations'
import { useAuthStore } from '@/stores/auth.store'
import { whatsappApi } from '@/api/whatsapp.api'
import { Button } from '@/components/ui/button'
import type { BillingPeriodWithDetails } from '@/types/api'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const WIDGET_COLLAPSED_COUNT = 3
const WIDGET_EXPANDED_COUNT = 8

export interface DashboardWidgetProps {
  organizationId?: string
  enabled: boolean
}

function WidgetExpandFooter({
  expanded,
  total,
  onToggle,
  onViewAll,
  viewAllLabel,
}: {
  expanded: boolean
  total: number
  onToggle: () => void
  onViewAll?: () => void
  viewAllLabel?: string
}) {
  if (total <= WIDGET_COLLAPSED_COUNT) return null
  const collapsedLabel =
    total > WIDGET_EXPANDED_COUNT ? 'Mostrar más' : `Mostrar ${total - WIDGET_COLLAPSED_COUNT} más`

  return (
    <div className="border-t border-border p-2 space-y-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full min-h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-medium text-muted-foreground transition-all touch-manipulation hover:bg-surface-hover hover:text-foreground active:scale-[0.99]"
      >
        {expanded ? 'Mostrar menos' : collapsedLabel}
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 transition-transform duration-300', expanded && 'rotate-180')}
        />
      </button>
      {expanded && onViewAll && total > WIDGET_EXPANDED_COUNT && (
        <button
          type="button"
          onClick={onViewAll}
          className="flex w-full min-h-11 items-center justify-center gap-1 rounded-xl bg-surface-muted text-sm font-semibold text-foreground transition-all touch-manipulation hover:bg-surface-hover active:scale-[0.99]"
        >
          {viewAllLabel ?? `Ver todos (${total})`}
          <ChevronRight className="h-4 w-4 shrink-0" />
        </button>
      )}
    </div>
  )
}

type PendingAlertItem = AlertItem & { isOverdue: boolean }

export function PendingPaymentsWidget({ organizationId, enabled }: DashboardWidgetProps) {
  const { data, isLoading } = useDashboardAlerts({ organizationId }, { enabled })
  const { openQuickPay } = useUIStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const exchangeSource = useExchangeStore((s) => s.source)
  const { data: exchangeRates } = useDolarRates()
  const activeRate = getRateForSource(exchangeRates, exchangeSource)

  const items = useMemo<PendingAlertItem[]>(() => {
    const overdue = (data?.overdueDebt.items ?? []).map((item) => ({ ...item, isOverdue: true }))
    const expiring = (data?.expiringSoon.items ?? []).map((item) => ({ ...item, isOverdue: false }))
    return [...overdue, ...expiring]
  }, [data])

  const visibleItems = items.slice(0, 8)

  const [expanded, setExpanded] = useState(false)
  useEffect(() => {
    setExpanded(false)
  }, [organizationId, items.length])
  const displayedItems = expanded ? visibleItems : visibleItems.slice(0, WIDGET_COLLAPSED_COUNT)

  const handlePay = async (periodId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setLoadingId(periodId)
    try {
      const period = await queryClient.fetchQuery({
        queryKey: [...qk.billing.detail(periodId), { organizationId }],
        queryFn: () => billingApi.getById(periodId, { organizationId }),
        staleTime: 0,
      })
      openQuickPay({ period })
    } catch {
      toast.error('Error al cargar el período para el cobro')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="bg-surface text-surface-foreground rounded-2xl border border-border shadow-sm overflow-hidden">
      <button
        onClick={() => navigate('/subscriptions?pending=true')}
        className="w-full flex items-center justify-between p-4 border-b border-border group text-left"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <Clock className="h-4 w-4 shrink-0" />
          </span>
          <h2 className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">Cobros Pendientes</h2>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {items.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-muted text-foreground">
              {items.length}
            </span>
          )}
          <ChevronRight className="h-5 w-5 text-subtle-foreground hidden sm:block group-hover:translate-x-0.5 transition-transform" />
        </span>
      </button>

      <div className="p-2">
        {isLoading ? (
          <div className="space-y-2 px-2 pb-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between items-center h-18 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : !data || displayedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center mb-3">
              <DollarSign className="h-6 w-6 text-success" />
            </div>
            <p className="text-sm font-medium text-foreground">Sin cobros pendientes</p>
            <p className="text-xs text-muted-foreground mt-1">Todos los clientes están al día.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayedItems.map((period) => (
              <div
                key={period.periodId}
                onClick={() => navigate(`/subscriptions/${period.subscriptionId}`, { state: { from: '/dashboard' } })}
                className="flex items-center gap-3 p-3 rounded-xl bg-surface-muted text-foreground border border-border-subtle active:bg-surface-active transition-colors touch-manipulation cursor-pointer group"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                    {period.clientName}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs">
                    <span className="text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {period.kitNumber}
                    </span>
                    <span className="font-bold text-foreground">
                      {formatCurrency(period.amount)}
                    </span>
                    <BsReference usdAmount={period.amount} rate={activeRate} />
                    {period.isOverdue ? (
                      <span className="text-destructive bg-destructive/10 font-medium px-1.5 py-0.5 rounded">
                        Vencida: {formatDate(period.endDate)}
                      </span>
                    ) : (
                      <span className="text-info bg-info/10 font-medium px-1.5 py-0.5 rounded">
                        Vence: {formatDate(period.endDate)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center">
                  <button
                    onClick={(e) => handlePay(period.periodId, e)}
                    disabled={loadingId === period.periodId}
                    className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 active:scale-95 touch-manipulation disabled:opacity-50"
                    aria-label={`Cobrar a ${period.clientName}`}
                    title={`Cobrar a ${period.clientName}`}
                  >
                    {loadingId === period.periodId ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    ) : (
                      <DollarSign className="h-4 w-4 shrink-0" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {!isLoading && visibleItems.length > 0 && (
        <WidgetExpandFooter
          expanded={expanded}
          total={items.length}
          onToggle={() => setExpanded((v) => !v)}
          onViewAll={() => navigate('/subscriptions?pending=true')}
          viewAllLabel={`Ver todos (${items.length})`}
        />
      )}
    </div>
  )
}

function findDebtorOldestOverdue(overdueItems: AlertItem[], debtor: DebtorItem): AlertItem | undefined {
  // overdueDebt.items viene ordenado por endDate asc: la primera coincidencia es la más antigua.
  const byPhone = debtor.clientPhone
    ? overdueItems.find((p) => p.clientPhone === debtor.clientPhone)
    : undefined
  if (byPhone) return byPhone
  const byDni = debtor.clientDni
    ? overdueItems.find((p) => p.clientDni === debtor.clientDni)
    : undefined
  if (byDni) return byDni
  return overdueItems.find((p) => p.clientName === debtor.clientName)
}

interface ReminderCandidate {
  clientId: string
  clientName: string
  clientPhone: string
  overduePeriod: BillingPeriodWithDetails
}

function toReminderCandidates(periods: BillingPeriodWithDetails[]): ReminderCandidate[] {
  const oldestByClient = new Map<string, ReminderCandidate>()
  const oldestFirst = [...periods].sort(
    (a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime(),
  )

  for (const period of oldestFirst) {
    const client = period.client
    if (!client?.id || !client.phone || oldestByClient.has(client.id)) continue
    oldestByClient.set(client.id, {
      clientId: client.id,
      clientName: `${client.firstName} ${client.lastName}`.trim(),
      clientPhone: client.phone,
      overduePeriod: period,
    })
  }

  return [...oldestByClient.values()]
}

function isFromToday(dateString: string): boolean {
  const date = new Date(dateString)
  const today = new Date()
  return !Number.isNaN(date.getTime())
    && date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate()
}

export function TopDebtorsWidget({ organizationId, enabled }: DashboardWidgetProps) {
  const { data, isLoading } = useDashboardAlerts({ organizationId }, { enabled })
  const { openQuickPay } = useUIStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const userOrganizationId = useAuthStore((state) => state.user?.organizationId)
  const effectiveOrganizationId = organizationId ?? userOrganizationId ?? undefined
  const sendMessage = useSendMessage(organizationId)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false)
  const [selectedReminderIds, setSelectedReminderIds] = useState<string[]>([])
  const [isSendingReminders, setIsSendingReminders] = useState(false)
  const [reminderResult, setReminderResult] = useState<{
    sent: number
    skipped: number
    failures: Array<{ name: string; message: string }>
  } | null>(null)
  const exchangeSource = useExchangeStore((s) => s.source)
  const { data: exchangeRates } = useDolarRates()
  const activeRate = getRateForSource(exchangeRates, exchangeSource)
  const { data: whatsAppConfig, isLoading: isLoadingWhatsAppConfig, isError: whatsAppConfigError } =
    useOrganizationWhatsAppConfig(effectiveOrganizationId ?? '', reminderDialogOpen)
  const overduePeriodsQuery = useQuery({
    queryKey: [...qk.billing.lists, 'all-overdue-reminder-candidates', effectiveOrganizationId],
    enabled: reminderDialogOpen && enabled,
    queryFn: async () => {
      const periods: BillingPeriodWithDetails[] = []
      let offset = 0

      while (true) {
        const page = await billingApi.list({
          status: 'OVERDUE',
          organizationId: effectiveOrganizationId,
          limit: 100,
          offset,
        })
        periods.push(...page.periods)
        if (!page.pagination.hasMore) return periods

        const nextOffset = page.pagination.offset + page.pagination.limit
        if (nextOffset <= offset) {
          throw new Error('La paginación de períodos vencidos no avanzó.')
        }
        offset = nextOffset
      }
    },
  })
  const items = useMemo(() => data?.topDebtors.items ?? [], [data?.topDebtors.items])
  const visibleItems = items.slice(0, WIDGET_EXPANDED_COUNT)
  const displayedItems = expanded ? visibleItems : visibleItems.slice(0, WIDGET_COLLAPSED_COUNT)
  const reminderCandidates = useMemo(
    () => toReminderCandidates(overduePeriodsQuery.data ?? []),
    [overduePeriodsQuery.data],
  )
  const reminderTemplateName = whatsAppConfig?.templates.dueDateWarning?.trim()
  const selectedReminderCandidates = reminderCandidates.filter((debtor) =>
    selectedReminderIds.includes(debtor.clientId),
  )
  useEffect(() => {
    setExpanded(false)
  }, [items.length])

  useEffect(() => {
    if (!reminderDialogOpen) return
    setSelectedReminderIds(reminderCandidates.map((debtor) => debtor.clientId))
    setReminderResult(null)
  }, [reminderDialogOpen, reminderCandidates])

  const handlePay = async (debtor: DebtorItem, e: React.MouseEvent) => {
    e.stopPropagation()
    setLoadingId(debtor.clientId)
    try {
      const candidate = findDebtorOldestOverdue(data?.overdueDebt.items ?? [], debtor)
      if (!candidate) {
        toast.info('No hay períodos vencidos para este cliente')
        return
      }
      const period = await queryClient.fetchQuery({
        queryKey: [...qk.billing.detail(candidate.periodId), { organizationId }],
        queryFn: () => billingApi.getById(candidate.periodId, { organizationId }),
        staleTime: 0,
      })
      openQuickPay({ period })
    } catch {
      toast.error('Error al cargar el período del cliente')
    } finally {
      setLoadingId(null)
    }
  }

  const handleSendBulkReminders = async () => {
    if (isSendingReminders || selectedReminderCandidates.length === 0) return

    setIsSendingReminders(true)
    setReminderResult(null)
    const failures: Array<{ name: string; message: string }> = []
    let sent = 0
    let skipped = 0

    if (!reminderTemplateName) {
      setReminderResult({
        sent,
        skipped,
        failures: [{ name: 'Configuración de WhatsApp', message: 'No hay una plantilla de aviso de vencimiento configurada para esta organización.' }],
      })
      setIsSendingReminders(false)
      return
    }

    for (const debtor of selectedReminderCandidates) {
      try {
        const history = await whatsappApi.getMessagesByPhone(debtor.clientPhone, effectiveOrganizationId)
        const alreadySentToday = history.messages.some((message) =>
          message.direction === 'OUTBOUND'
          && message.templateName === reminderTemplateName
          && message.status !== 'FAILED'
          && isFromToday(message.createdAt),
        )
        if (alreadySentToday) {
          skipped += 1
          continue
        }

        const overduePeriod = debtor.overduePeriod
        await sendMessage.mutateAsync({
          to: debtor.clientPhone,
          templateName: reminderTemplateName,
          variables: {
            '1': debtor.clientName,
            '2': overduePeriod.subscription.kitNumber,
            '3': overduePeriod.endDate.split('T')[0],
          },
        })
        sent += 1
      } catch (error) {
        failures.push({
          name: debtor.clientName,
          message: isAxiosError<{ error?: { code?: string; message?: string } }>(error)
            ? error.response?.data.error?.message ?? error.response?.data.error?.code ?? error.message
            : error instanceof Error
              ? error.message
              : 'No se pudo enviar el aviso.',
        })
      }
    }

    setReminderResult({ sent, skipped, failures })
    if (failures.length > 0) {
      toast.error(`Se enviaron ${sent} avisos; ${skipped} ya se habían enviado hoy y ${failures.length} no pudieron enviarse.`)
    } else if (skipped > 0) {
      toast.success(`Se enviaron ${sent} avisos; ${skipped} ya se habían enviado hoy.`)
    } else {
      toast.success(`Se enviaron ${sent} avisos de vencimiento por WhatsApp.`)
    }
    setIsSendingReminders(false)
  }

  return (
    <div className="bg-surface text-surface-foreground rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border p-4">
        <button
          type="button"
          onClick={() => navigate('/subscriptions?hasOverdue=true')}
          className="group flex min-w-0 items-center gap-2 text-left"
        >
          <span className="shrink-0 rounded-lg bg-destructive/10 p-1.5 text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
          </span>
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-base font-bold text-foreground transition-colors group-hover:text-primary">Top Deudores</span>
            {data && data.topDebtors.count > 0 && (
              <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive">
                {data.topDebtors.count}
              </span>
            )}
          </span>
          <ChevronRight className="hidden h-5 w-5 shrink-0 text-subtle-foreground transition-transform group-hover:translate-x-0.5 sm:block" />
        </button>
        {reminderCandidates.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setReminderDialogOpen(true)}
            className="shrink-0"
            aria-label="Enviar recordatorios de vencimiento por WhatsApp"
            title="Enviar recordatorios de vencimiento por WhatsApp"
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Recordar</span>
          </Button>
        )}
      </div>

      <div className="p-2">
        {isLoading ? (
          <div className="space-y-2 px-2 pb-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between items-center h-18 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : !data || displayedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center mb-3">
              <DollarSign className="h-6 w-6 text-success" />
            </div>
            <p className="text-sm font-medium text-foreground">No hay deudores</p>
            <p className="text-xs text-muted-foreground mt-1">Todos los clientes están al día.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayedItems.map((debtor) => (
              <div
                key={debtor.clientId}
                onClick={() => navigate(`/subscriptions/clients/${debtor.clientId}`, { state: { from: '/dashboard' } })}
                className="flex items-center gap-3 p-3 rounded-xl bg-surface-muted text-foreground border border-border-subtle active:bg-surface-active transition-colors touch-manipulation cursor-pointer group"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                    {debtor.clientName}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs">
                    <span className="font-bold text-destructive">
                      {formatCurrency(debtor.totalDebt)}
                    </span>
                    <BsReference usdAmount={debtor.totalDebt} rate={activeRate} />
                    <span className="text-muted-foreground truncate max-w-30">{debtor.clientPhone}</span>
                    {debtor.clientDni && (
                      <span className="text-muted-foreground truncate max-w-25">C.I. {debtor.clientDni}</span>
                    )}
                    <span className="text-destructive bg-destructive/10 font-medium px-1.5 py-0.5 rounded">
                      {debtor.overdueCount} vencidos
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center">
                  <button
                    onClick={(e) => handlePay(debtor, e)}
                    disabled={loadingId === debtor.clientId}
                    className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 active:scale-95 touch-manipulation disabled:opacity-50"
                    aria-label={`Cobrar a ${debtor.clientName}`}
                    title={`Cobrar a ${debtor.clientName}`}
                  >
                    {loadingId === debtor.clientId ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    ) : (
                      <DollarSign className="h-4 w-4 shrink-0" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {!isLoading && visibleItems.length > 0 && (
        <WidgetExpandFooter
          expanded={expanded}
          total={data?.topDebtors.count ?? items.length}
          onToggle={() => setExpanded((v) => !v)}
          onViewAll={() => navigate('/subscriptions?hasOverdue=true')}
          viewAllLabel={`Ver todos (${items.length})`}
        />
      )}
      <Dialog
        open={reminderDialogOpen}
        onOpenChange={(open) => {
          if (isSendingReminders && !open) return
          setReminderDialogOpen(open)
        }}
      >
        <DialogContent className="bg-surface-elevated text-surface-elevated-foreground">
          <DialogHeader>
            <DialogTitle>Recordatorio masivo por WhatsApp</DialogTitle>
            <DialogDescription>
              Se enviará a los clientes con teléfono y un período vencido disponible. Se usa la plantilla de aviso de vencimiento configurada para esta organización.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {isLoadingWhatsAppConfig && (
              <p role="status" className="text-sm text-muted-foreground">Cargando la plantilla de WhatsApp...</p>
            )}
            {whatsAppConfigError && (
              <p role="alert" className="text-sm text-destructive">No se pudo cargar la configuración de WhatsApp.</p>
            )}
            {!isLoadingWhatsAppConfig && !whatsAppConfigError && !reminderTemplateName && (
              <p role="alert" className="text-sm text-destructive">Configura una plantilla de aviso de vencimiento en Configuración de WhatsApp antes de enviar.</p>
            )}
            {overduePeriodsQuery.isFetching && (
              <p role="status" className="text-sm text-muted-foreground">Cargando todos los períodos vencidos...</p>
            )}
            {overduePeriodsQuery.isError && (
              <div role="alert" className="flex items-center justify-between gap-3 text-sm text-destructive">
                <span>No se pudo cargar la lista completa de vencidos.</span>
                <Button type="button" variant="outline" size="sm" onClick={() => void overduePeriodsQuery.refetch()}>
                  Reintentar
                </Button>
              </div>
            )}
            {!overduePeriodsQuery.isFetching && !overduePeriodsQuery.isError && reminderCandidates.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay clientes vencidos con teléfono disponible.</p>
            )}
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {selectedReminderCandidates.length} de {reminderCandidates.length} clientes seleccionados
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isSendingReminders || reminderResult !== null || overduePeriodsQuery.isFetching || reminderCandidates.length === 0}
                onClick={() => setSelectedReminderIds(
                  selectedReminderCandidates.length === reminderCandidates.length
                    ? []
                    : reminderCandidates.map((debtor) => debtor.clientId),
                )}
              >
                {selectedReminderCandidates.length === reminderCandidates.length ? 'Ninguno' : 'Seleccionar todos'}
              </Button>
            </div>
            <ul className="max-h-56 space-y-2 overflow-y-auto">
              {reminderCandidates.map((debtor) => (
                <li key={debtor.clientId}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface p-3 text-surface-foreground">
                    <input
                      type="checkbox"
                      checked={selectedReminderIds.includes(debtor.clientId)}
                      disabled={isSendingReminders || reminderResult !== null || overduePeriodsQuery.isFetching}
                      onChange={(event) => setSelectedReminderIds((current) =>
                        event.target.checked
                          ? [...current, debtor.clientId]
                          : current.filter((clientId) => clientId !== debtor.clientId),
                      )}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{debtor.clientName}</span>
                      <span className="block text-xs text-muted-foreground">{debtor.clientPhone}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            {reminderResult && (
              <div role="status" className="space-y-2 rounded-lg border border-border bg-surface-muted p-3 text-sm">
                <p className="font-medium text-foreground">Enviados: {reminderResult.sent}. Ya enviados hoy: {reminderResult.skipped}. Fallidos: {reminderResult.failures.length}.</p>
                {reminderResult.failures.length > 0 && (
                  <ul className="space-y-1 text-destructive">
                    {reminderResult.failures.map((failure) => (
                      <li key={`${failure.name}-${failure.message}`}>{failure.name}: {failure.message}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            {reminderResult ? (
              <Button type="button" onClick={() => setReminderDialogOpen(false)}>Cerrar</Button>
            ) : (
              <Button
                type="button"
                onClick={handleSendBulkReminders}
                disabled={isSendingReminders || overduePeriodsQuery.isFetching || overduePeriodsQuery.isError || isLoadingWhatsAppConfig || whatsAppConfigError || !reminderTemplateName || selectedReminderCandidates.length === 0}
              >
                {isSendingReminders ? 'Enviando…' : `Enviar a ${selectedReminderCandidates.length}`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function ExpiringSoonWidget({ organizationId, enabled }: DashboardWidgetProps) {
  const { data, isLoading } = useDashboardAlerts({ organizationId }, { enabled })
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const exchangeSource = useExchangeStore((s) => s.source)
  const { data: exchangeRates } = useDolarRates()
  const activeRate = getRateForSource(exchangeRates, exchangeSource)
  const items = data?.expiringSoon.items ?? []
  const visibleItems = items.slice(0, WIDGET_EXPANDED_COUNT)
  const displayedItems = expanded ? visibleItems : visibleItems.slice(0, WIDGET_COLLAPSED_COUNT)
  useEffect(() => {
    setExpanded(false)
  }, [items.length])

  const handleOpenChat = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/chats?phone=${encodeURIComponent(phone)}`)
  }

  return (
    <div className="bg-surface text-surface-foreground rounded-2xl border border-border shadow-sm overflow-hidden">
      <button
        onClick={() => navigate('/subscriptions?expiring=true')}
        className="w-full flex items-center justify-between p-4 border-b border-border group text-left"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="p-1.5 rounded-lg bg-warning/10 text-warning shrink-0">
            <Calendar className="h-4 w-4 shrink-0" />
          </span>
          <h2 className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">Vencimientos Próximos</h2>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {data && data.expiringSoon.count > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-warning/10 text-warning">
              {data.expiringSoon.count}
            </span>
          )}
          <ChevronRight className="h-5 w-5 text-subtle-foreground hidden sm:block group-hover:translate-x-0.5 transition-transform" />
        </span>
      </button>

      <div className="p-2">
        {isLoading ? (
          <div className="space-y-2 px-2 pb-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between items-center h-18 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : !data || displayedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <div className="h-12 w-12 rounded-full bg-surface-muted flex items-center justify-center mb-3">
              <Calendar className="h-6 w-6 text-subtle-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Sin vencimientos cercanos</p>
            <p className="text-xs text-muted-foreground mt-1">No hay cobros pendientes a corto plazo.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayedItems.map((item) => (
              <div
                key={item.periodId}
                onClick={() => navigate(`/subscriptions/${item.subscriptionId}`, { state: { from: '/dashboard' } })}
                className="flex items-center gap-3 p-3 rounded-xl bg-surface-muted text-foreground border border-border-subtle active:bg-surface-active transition-colors touch-manipulation cursor-pointer group"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                    {item.clientName}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs">
                    <span className="text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {item.kitNumber}
                    </span>
                    <span className="font-bold text-foreground">
                      {formatCurrency(item.amount)}
                    </span>
                    <BsReference usdAmount={item.amount} rate={activeRate} />
                    {item.clientDni && (
                      <span className="text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        C.I. {item.clientDni}
                      </span>
                    )}
                    <span className="text-warning bg-warning/10 font-medium px-1.5 py-0.5 rounded">
                      Vence: {formatDate(item.endDate)}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center">
                  <button
                    onClick={(e) => handleOpenChat(item.clientPhone, e)}
                    className="flex items-center justify-center h-10 w-10 rounded-full bg-success/10 text-success border border-success/20 active:bg-success/20 transition-colors touch-manipulation shadow-sm"
                    aria-label="WhatsApp"
                  >
                    <MessageSquare className="h-4 w-4 shrink-0" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {!isLoading && visibleItems.length > 0 && (
        <WidgetExpandFooter
          expanded={expanded}
          total={data?.expiringSoon.count ?? items.length}
          onToggle={() => setExpanded((v) => !v)}
          onViewAll={() => navigate('/subscriptions?expiring=true')}
          viewAllLabel={`Ver todos (${items.length})`}
        />
      )}
    </div>
  )
}
