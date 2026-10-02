import { useDashboardAlerts } from '@/hooks/useDashboard'
import { useBillingPeriods } from '@/hooks/useBilling'
import { useOrganizationStore } from '@/stores/organization.store'
import { useIsSuperAdmin } from '@/stores/auth.store'
import { useUIStore } from '@/stores/ui.store'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { billingApi } from '@/api/billing.api'
import { qk } from '@/lib/query-keys'
import { formatCurrency, formatDate } from '@/lib/constants'
import { useDolarRates } from '@/hooks/useExchange'
import { useExchangeStore } from '@/stores/exchange.store'
import { getRateForSource } from '@/lib/exchange'
import { BsReference } from '@/components/exchange/BsReference'
import { getClientFullName } from '@/lib/utils'
import { AlertTriangle, MessageSquare, DollarSign, Calendar, ChevronRight, ChevronDown, Clock, Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const WIDGET_COLLAPSED_COUNT = 3
const WIDGET_EXPANDED_COUNT = 8

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

export function PendingPaymentsWidget() {
  const isSuperAdmin = useIsSuperAdmin()
  const organizationId = useOrganizationStore((state) => state.selectedOrganizationId)
  const orgParam = organizationId ?? undefined
  const { data: pendingData, isLoading: loadingPending } = useBillingPeriods(
    { status: 'PENDING', organizationId: orgParam, limit: 500 },
    { enabled: !isSuperAdmin || !!organizationId }
  )
  const { data: overdueData, isLoading: loadingOverdue } = useBillingPeriods(
    { status: 'OVERDUE', organizationId: orgParam, limit: 500 },
    { enabled: !isSuperAdmin || !!organizationId }
  )
  const isLoading = loadingPending || loadingOverdue
  const { openQuickPay } = useUIStore()
  const navigate = useNavigate()
  const exchangeSource = useExchangeStore((s) => s.source)
  const { data: exchangeRates } = useDolarRates()
  const activeRate = getRateForSource(exchangeRates, exchangeSource)

  const items = useMemo(() => {
    const overdue = (overdueData?.periods ?? []).filter(
      (p) => p.client != null && p.subscription != null && p.subscription.status === 'ACTIVE' && p.plan != null
    )
    const pending = (pendingData?.periods ?? []).filter(
      (p) => p.client != null && p.subscription != null && p.subscription.status === 'ACTIVE' && p.plan != null
    )
    overdue.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
    pending.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return [...pending, ...overdue]
  }, [overdueData, pendingData])

  const visibleItems = items.slice(0, 8)

  const [expanded, setExpanded] = useState(false)
  useEffect(() => {
    setExpanded(false)
  }, [orgParam, items.length])
  const displayedItems = expanded ? visibleItems : visibleItems.slice(0, WIDGET_COLLAPSED_COUNT)

  const handlePay = (periodId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const period = items.find((p) => p.id === periodId)
    if (!period) return
    if (!period.subscription || !period.plan) return
    openQuickPay({ period })
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
        ) : displayedItems.length === 0 ? (
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
                key={period.id}
                onClick={() => navigate(`/subscriptions/${period.subscriptionId}`, { state: { from: '/dashboard' } })}
                className="flex items-center gap-3 p-3 rounded-xl bg-surface-muted text-foreground border border-border-subtle active:bg-surface-active transition-colors touch-manipulation cursor-pointer group"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                    {getClientFullName(period.client)}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs">
                    <span className="text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {period.subscription.kitNumber}
                    </span>
                    <span className="font-bold text-foreground">
                      {formatCurrency(period.amount)}
                    </span>
                    <BsReference usdAmount={period.amount} rate={activeRate} />
                    {period.status === 'OVERDUE' ? (
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
                    onClick={(e) => handlePay(period.id, e)}
                    className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 active:scale-95 touch-manipulation"
                    aria-label="Cobrar"
                  >
                    <DollarSign className="h-4 w-4 shrink-0" />
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

export function TopDebtorsWidget() {
  const { data, isLoading } = useDashboardAlerts()
  const { openQuickPay } = useUIStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const exchangeSource = useExchangeStore((s) => s.source)
  const { data: exchangeRates } = useDolarRates()
  const activeRate = getRateForSource(exchangeRates, exchangeSource)
  const items = data?.topDebtors.items ?? []
  const visibleItems = items.slice(0, WIDGET_EXPANDED_COUNT)
  const displayedItems = expanded ? visibleItems : visibleItems.slice(0, WIDGET_COLLAPSED_COUNT)
  useEffect(() => {
    setExpanded(false)
  }, [items.length])

  const handlePay = async (clientId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setLoadingId(clientId)
    try {
      const result = await queryClient.fetchQuery({
        queryKey: [...qk.billing.lists, { clientId, status: 'OVERDUE', limit: 200 }],
        queryFn: () => billingApi.list({ clientId, status: 'OVERDUE', limit: 200 }),
        staleTime: 0,
      })
      if (result.periods.length > 0) {
        const period = result.periods.reduce((oldest, p) =>
          new Date(p.startDate).getTime() < new Date(oldest.startDate).getTime() ? p : oldest
        )
        openQuickPay({ period })
      } else {
        toast.info('No hay períodos vencidos para este cliente')
      }
    } catch {
      toast.error('Error al buscar períodos del cliente')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="bg-surface text-surface-foreground rounded-2xl border border-border shadow-sm overflow-hidden">
      <button
        onClick={() => navigate('/subscriptions?hasOverdue=true')}
        className="w-full flex items-center justify-between p-4 border-b border-border group text-left"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="p-1.5 rounded-lg bg-destructive/10 text-destructive shrink-0">
            <AlertTriangle className="h-4 w-4 shrink-0" />
          </span>
          <h2 className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">Top Deudores</h2>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {data && data.topDebtors.count > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-destructive/10 text-destructive">
              {data.topDebtors.count}
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
                    onClick={(e) => handlePay(debtor.clientId, e)}
                    disabled={loadingId === debtor.clientId}
                    className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 active:scale-95 touch-manipulation disabled:opacity-50"
                    aria-label="Cobrar"
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
    </div>
  )
}

export function ExpiringSoonWidget() {
  const { data, isLoading } = useDashboardAlerts()
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
