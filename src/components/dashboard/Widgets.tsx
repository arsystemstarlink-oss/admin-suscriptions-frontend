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
import { getClientFullName } from '@/lib/utils'
import { AlertTriangle, MessageSquare, DollarSign, Calendar, ChevronRight, Clock, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

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

  const handlePay = (periodId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const period = items.find((p) => p.id === periodId)
    if (!period) return
    if (!period.subscription || !period.plan) return
    openQuickPay({ period })
  }

  return (
    <div className="bg-white text-primary-900 dark:bg-primary-900/50 dark:text-primary-50 rounded-2xl border border-primary-100 dark:border-primary-800 shadow-sm overflow-hidden">
      <button
        onClick={() => navigate('/subscriptions?pending=true')}
        className="w-full flex items-center justify-between p-4 border-b border-primary-100 dark:border-primary-800 group text-left"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="p-1.5 rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-800 dark:text-primary-200 shrink-0">
            <Clock className="h-4 w-4 shrink-0" />
          </span>
          <h2 className="text-base font-bold text-primary-900 dark:text-primary-50 group-hover:text-primary-600 dark:group-hover:text-primary-300 transition-colors truncate">Cobros Pendientes</h2>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {items.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary-100 text-primary-800 dark:bg-primary-800 dark:text-primary-100">
              {items.length}
            </span>
          )}
          <ChevronRight className="h-5 w-5 text-primary-300 dark:text-primary-600 hidden sm:block group-hover:translate-x-0.5 transition-transform" />
        </span>
      </button>

      <div className="p-2">
        {isLoading ? (
          <div className="space-y-2 px-2 pb-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between items-center h-18 bg-primary-50 dark:bg-primary-900/40 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <div className="h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center mb-3">
              <DollarSign className="h-6 w-6 text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-primary-800 dark:text-primary-100">Sin cobros pendientes</p>
            <p className="text-xs text-primary-500 dark:text-primary-400 mt-1">Todos los clientes están al día.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleItems.map((period) => (
              <div
                key={period.id}
                onClick={() => navigate(`/subscriptions/${period.subscriptionId}`, { state: { from: '/dashboard' } })}
                className="flex items-center gap-3 p-3 rounded-xl bg-white text-primary-900 dark:bg-primary-900 dark:text-primary-50 border border-primary-100 dark:border-primary-800 active:bg-primary-50 dark:active:bg-primary-800 transition-colors touch-manipulation cursor-pointer group"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-primary-900 dark:text-primary-50 truncate group-hover:text-primary-600 dark:group-hover:text-primary-300 transition-colors">
                    {getClientFullName(period.client)}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs">
                    <span className="text-primary-500 dark:text-primary-400 bg-primary-50 dark:bg-primary-950 px-1.5 py-0.5 rounded">
                      {period.subscription.kitNumber}
                    </span>
                    <span className="font-bold text-primary-900 dark:text-primary-50">
                      {formatCurrency(period.amount)}
                    </span>
                    {period.status === 'OVERDUE' ? (
                      <span className="text-red-600 dark:text-red-400 font-medium px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-950">
                        Vencida: {formatDate(period.endDate)}
                      </span>
                    ) : (
                      <span className="text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/50 font-medium px-1.5 py-0.5 rounded">
                        Vence: {formatDate(period.endDate)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center">
                  <button
                    onClick={(e) => handlePay(period.id, e)}
                    className="flex items-center justify-center h-10 w-10 rounded-full bg-primary-800 text-white dark:bg-primary-700 dark:text-white active:scale-95 transition-transform touch-manipulation shadow-sm"
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
    </div>
  )
}

export function TopDebtorsWidget() {
  const { data, isLoading } = useDashboardAlerts()
  const { openQuickPay } = useUIStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [loadingId, setLoadingId] = useState<string | null>(null)

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
    <div className="bg-white dark:bg-primary-900/50 rounded-2xl border border-primary-100 dark:border-primary-800 shadow-sm overflow-hidden">
      <button
        onClick={() => navigate('/subscriptions?hasOverdue=true')}
        className="w-full flex items-center justify-between p-4 border-b border-primary-100 dark:border-primary-800 group text-left"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="p-1.5 rounded-lg bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400 shrink-0">
            <AlertTriangle className="h-4 w-4 shrink-0" />
          </span>
          <h2 className="text-base font-bold text-primary-900 dark:text-primary-50 group-hover:text-primary-600 dark:group-hover:text-primary-300 transition-colors truncate">Top Deudores</h2>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {data && data.topDebtors.count > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400">
              {data.topDebtors.count}
            </span>
          )}
          <ChevronRight className="h-5 w-5 text-primary-300 dark:text-primary-600 hidden sm:block group-hover:translate-x-0.5 transition-transform" />
        </span>
      </button>

      <div className="p-2">
        {isLoading ? (
          <div className="space-y-2 px-2 pb-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between items-center h-18 bg-primary-50 dark:bg-primary-900/40 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : !data || data.topDebtors.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <div className="h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center mb-3">
              <DollarSign className="h-6 w-6 text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-primary-800 dark:text-primary-100">No hay deudores</p>
            <p className="text-xs text-primary-500 dark:text-primary-400 mt-1">Todos los clientes están al día.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.topDebtors.items.map((debtor) => (
              <div
                key={debtor.clientId}
                onClick={() => navigate(`/subscriptions/clients/${debtor.clientId}`, { state: { from: '/dashboard' } })}
                className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-primary-900 border border-primary-100 dark:border-primary-800 active:bg-primary-50 dark:active:bg-primary-800 transition-colors touch-manipulation cursor-pointer group"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-primary-900 dark:text-primary-50 truncate group-hover:text-primary-600 dark:group-hover:text-primary-300 transition-colors">
                    {debtor.clientName}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs">
                    <span className="font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(debtor.totalDebt)}
                    </span>
                    <span className="text-primary-500 dark:text-primary-400 truncate max-w-30">{debtor.clientPhone}</span>
                    {debtor.clientDni && (
                      <span className="text-primary-500 dark:text-primary-400 truncate max-w-25">C.I. {debtor.clientDni}</span>
                    )}
                    <span className="text-red-600 dark:text-red-400 font-medium px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-950">
                      {debtor.overdueCount} vencidos
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center">
                  <button
                    onClick={(e) => handlePay(debtor.clientId, e)}
                    disabled={loadingId === debtor.clientId}
                    className="flex items-center justify-center h-10 w-10 rounded-full bg-primary-800 text-white dark:bg-primary-700 active:scale-95 transition-transform touch-manipulation shadow-sm disabled:opacity-50"
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
    </div>
  )
}

export function ExpiringSoonWidget() {
  const { data, isLoading } = useDashboardAlerts()
  const navigate = useNavigate()

  const handleOpenChat = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/chats?phone=${encodeURIComponent(phone)}`)
  }

  return (
    <div className="bg-white dark:bg-primary-900/50 rounded-2xl border border-primary-100 dark:border-primary-800 shadow-sm overflow-hidden">
      <button
        onClick={() => navigate('/subscriptions?expiring=true')}
        className="w-full flex items-center justify-between p-4 border-b border-primary-100 dark:border-primary-800 group text-left"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="p-1.5 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400 shrink-0">
            <Calendar className="h-4 w-4 shrink-0" />
          </span>
          <h2 className="text-base font-bold text-primary-900 dark:text-primary-50 group-hover:text-primary-600 dark:group-hover:text-primary-300 transition-colors truncate">Vencimientos Próximos</h2>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {data && data.expiringSoon.count > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
              {data.expiringSoon.count}
            </span>
          )}
          <ChevronRight className="h-5 w-5 text-primary-300 dark:text-primary-600 hidden sm:block group-hover:translate-x-0.5 transition-transform" />
        </span>
      </button>

      <div className="p-2">
        {isLoading ? (
          <div className="space-y-2 px-2 pb-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between items-center h-18 bg-primary-50 dark:bg-primary-900/40 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : !data || data.expiringSoon.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <div className="h-12 w-12 rounded-full bg-primary-50 dark:bg-primary-800/50 flex items-center justify-center mb-3">
              <Calendar className="h-6 w-6 text-primary-300 dark:text-primary-600" />
            </div>
            <p className="text-sm font-medium text-primary-800 dark:text-primary-100">Sin vencimientos cercanos</p>
            <p className="text-xs text-primary-500 dark:text-primary-400 mt-1">No hay cobros pendientes a corto plazo.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.expiringSoon.items.map((item) => (
              <div
                key={item.periodId}
                onClick={() => navigate(`/subscriptions/${item.subscriptionId}`, { state: { from: '/dashboard' } })}
                className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-primary-900 border border-primary-100 dark:border-primary-800 active:bg-primary-50 dark:active:bg-primary-800 transition-colors touch-manipulation cursor-pointer group"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-primary-900 dark:text-primary-50 truncate group-hover:text-primary-600 dark:group-hover:text-primary-300 transition-colors">
                    {item.clientName}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs">
                    <span className="text-primary-500 dark:text-primary-400 bg-primary-50 dark:bg-primary-950 px-1.5 py-0.5 rounded">
                      {item.kitNumber}
                    </span>
                    <span className="font-bold text-primary-900 dark:text-primary-50">
                      {formatCurrency(item.amount)}
                    </span>
                    {item.clientDni && (
                      <span className="text-primary-500 dark:text-primary-400 bg-primary-50 dark:bg-primary-950 px-1.5 py-0.5 rounded">
                        C.I. {item.clientDni}
                      </span>
                    )}
                    <span className="text-amber-600 dark:text-amber-400 font-medium px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950">
                      Vence: {formatDate(item.endDate)}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center">
                  <button
                    onClick={(e) => handleOpenChat(item.clientPhone, e)}
                    className="flex items-center justify-center h-10 w-10 rounded-full bg-green-50 text-green-700 border border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-900 active:bg-green-100 transition-colors touch-manipulation shadow-sm"
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
    </div>
  )
}
