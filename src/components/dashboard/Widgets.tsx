import { useDashboardAlerts } from '@/hooks/useDashboard'
import { useUIStore } from '@/stores/ui.store'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { billingApi } from '@/api/billing.api'
import { qk } from '@/lib/query-keys'
import { formatCurrency, formatDate } from '@/lib/constants'
import { AlertTriangle, MessageSquare, DollarSign, Calendar, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

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
              <div key={i} className="flex justify-between items-center h-[72px] bg-primary-50 dark:bg-primary-900/40 animate-pulse rounded-xl" />
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
                onClick={() => navigate(`/clients/${debtor.clientId}`)}
                className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-primary-900 border border-primary-100 dark:border-primary-800 active:bg-primary-50 dark:active:bg-primary-800 transition-colors touch-manipulation cursor-pointer group"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm text-primary-900 dark:text-primary-50 truncate pr-2 group-hover:text-primary-600 dark:group-hover:text-primary-300 transition-colors">
                      {debtor.clientName}
                    </p>
                    <p className="font-bold text-red-600 dark:text-red-400 whitespace-nowrap">
                      {formatCurrency(debtor.totalDebt)}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    <span className="text-primary-500 dark:text-primary-400 truncate max-w-[120px]">{debtor.clientPhone}</span>
                    {debtor.clientDni && (
                      <>
                        <span className="text-primary-300 dark:text-primary-600">•</span>
                        <span className="text-primary-500 dark:text-primary-400 truncate max-w-[100px]">C.I. {debtor.clientDni}</span>
                      </>
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
                    className="flex items-center justify-center h-10 w-10 sm:w-auto sm:px-3 rounded-lg bg-primary-800 text-white dark:bg-primary-700 active:scale-95 transition-transform touch-manipulation shadow-sm disabled:opacity-50"
                    aria-label="Cobrar"
                  >
                    <DollarSign className="h-4 w-4 sm:mr-1 shrink-0" />
                    <span className="hidden sm:inline text-sm font-semibold">
                      {loadingId === debtor.clientId ? '...' : 'Cobrar'}
                    </span>
                  </button>
                  <ChevronRight className="h-5 w-5 text-primary-300 dark:text-primary-600 ml-2 hidden sm:block group-hover:translate-x-0.5 transition-transform" />
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
              <div key={i} className="flex justify-between items-center h-[72px] bg-primary-50 dark:bg-primary-900/40 animate-pulse rounded-xl" />
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
                onClick={() => navigate(`/subscriptions/${item.subscriptionId}`)}
                className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-primary-900 border border-primary-100 dark:border-primary-800 active:bg-primary-50 dark:active:bg-primary-800 transition-colors touch-manipulation cursor-pointer group"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm text-primary-900 dark:text-primary-50 truncate pr-2 group-hover:text-primary-600 dark:group-hover:text-primary-300 transition-colors">
                      {item.clientName}
                    </p>
                    <p className="font-bold text-primary-900 dark:text-primary-50 whitespace-nowrap">
                      {formatCurrency(item.amount)}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs">
                    <span className="text-primary-500 dark:text-primary-400 bg-primary-50 dark:bg-primary-950 px-1.5 py-0.5 rounded">
                      Kit #{item.kitNumber}
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
                    className="flex items-center justify-center h-10 w-10 sm:w-auto sm:px-3 rounded-lg bg-green-50 text-green-700 border border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-900 active:bg-green-100 transition-colors touch-manipulation shadow-sm"
                    aria-label="WhatsApp"
                  >
                    <MessageSquare className="h-4 w-4 sm:mr-1 shrink-0" />
                    <span className="hidden sm:inline text-sm font-semibold">WhatsApp</span>
                  </button>
                  <ChevronRight className="h-5 w-5 text-primary-300 dark:text-primary-600 ml-2 hidden sm:block group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
