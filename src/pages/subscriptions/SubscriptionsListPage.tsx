import { useMemo, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useSubscriptions } from '@/hooks/useSubscriptions'
import { useDashboardSummary } from '@/hooks/useDashboard'
import { billingApi } from '@/api/billing.api'
import { qk } from '@/lib/query-keys'
import { Button } from '@/components/ui/button'
import { Plus, Link2, RotateCcw, Box, Phone, Calendar, Zap, AlertTriangle, Clock } from 'lucide-react'
import { PageToolbar } from '@/components/design-system/PageToolbar'
import { FilterPill } from '@/components/design-system/FilterPill'
import { EmptyState } from '@/components/design-system/EmptyState'
import { formatCurrency, SUBSCRIPTION_STATUS_LABELS, isExpiringSoon, getExpiringLabel } from '@/lib/constants'
import { getClientFullName } from '@/lib/utils'
import { useUIStore } from '@/stores/ui.store'
import { toast } from 'sonner'
import type { SubscriptionWithDetails } from '@/types/api'

export function SubscriptionsListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { openQuickPay } = useUIStore()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [payingId, setPayingId] = useState<string | null>(null)

  const statusFilter = searchParams.get('status') as 'ACTIVE' | 'SUSPENDED' | null
  const hasOverdue = searchParams.get('hasOverdue') === 'true' ? true : searchParams.get('hasOverdue') === 'false' ? false : undefined
  const expiringFilter = searchParams.get('expiring') === 'true'

  const { data, isLoading } = useSubscriptions({ limit: 200 })
  const { data: summary } = useDashboardSummary()

  const isExpiringSub = (sub: SubscriptionWithDetails) =>
    sub.currentPeriod?.status === 'PENDING' && isExpiringSoon(sub.currentPeriod.endDate)

  const metrics = useMemo(() => {
    const subs = data?.subscriptions ?? []
    const expiring = subs.filter(isExpiringSub)
    return {
      debtCount: subs.filter((s) => s.hasDebt).length,
      expiringCount: expiring.length,
      expiringTotal: expiring.reduce((sum, s) => sum + (s.currentPeriod?.amount ?? 0), 0),
    }
  }, [data])

  const visibleSubscriptions = useMemo(() => {
    const items = [...(data?.subscriptions ?? [])]

    const normalizedSearch = search.trim().toLowerCase()

    return items
      .filter((sub) => {
        if (statusFilter && sub.status !== statusFilter) return false
        if (hasOverdue !== undefined && sub.hasDebt !== hasOverdue) return false
        if (expiringFilter && !isExpiringSub(sub)) return false
        if (!normalizedSearch) return true

        const haystack = [
          getClientFullName(sub.client),
          sub.client.phone,
          sub.client.dni || '',
          sub.plan.name,
          sub.kitNumber,
        ]
          .join(' ')
          .toLowerCase()

        return haystack.includes(normalizedSearch)
      })
      .sort((a, b) => {
        const aPriority = Number(a.hasDebt) * 100 + Number(a.overduePeriods > 0) * 10 + Number(a.pendingPeriods > 0)
        const bPriority = Number(b.hasDebt) * 100 + Number(b.overduePeriods > 0) * 10 + Number(b.pendingPeriods > 0)

        if (aPriority !== bPriority) return bPriority - aPriority
        return a.kitNumber.localeCompare(b.kitNumber)
      })
  }, [data, search, statusFilter, hasOverdue, expiringFilter])

  const hasActiveFilters = Boolean(search || statusFilter || hasOverdue !== undefined || expiringFilter)

  const handleSearch = (value: string) => {
    setSearch(value)
    const params = new URLSearchParams(searchParams)
    if (value) params.set('search', value)
    else params.delete('search')
    setSearchParams(params)
  }

  const handleFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams)
    if (value) params.set(key, value)
    else params.delete(key)
    setSearchParams(params)
  }

  const clearAllFilters = () => {
    setSearch('')
    setSearchParams({})
  }

  const handleQuickPay = async (sub: SubscriptionWithDetails) => {
    if (payingId) return
    setPayingId(sub.id)
    try {
      const result = await queryClient.fetchQuery({
        queryKey: [...qk.billing.lists, { subscriptionId: sub.id, limit: 50 }],
        queryFn: () => billingApi.list({ subscriptionId: sub.id, limit: 50 }),
        staleTime: 30_000,
      })
      const unpaid = result.periods
        .filter((p) => p.status !== 'PAID')
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0]

      if (unpaid) {
        openQuickPay({ period: unpaid })
      } else {
        toast.info('No hay períodos pendientes para esta suscripción')
      }
    } catch {
      toast.error('Error al consultar los períodos de la suscripción')
    } finally {
      setPayingId(null)
    }
  }

  const getCardTone = (sub: SubscriptionWithDetails) => {
    if (sub.hasDebt) {
      return 'border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/20'
    }

    if (sub.status === 'SUSPENDED') {
      return 'border-blue-200 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/20'
    }

    if (isExpiringSub(sub)) {
      return 'border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/20'
    }

    return 'border-primary-100 bg-white dark:border-primary-800 dark:bg-primary-900/50'
  }

  const getStatusClass = (status: 'ACTIVE' | 'SUSPENDED') => {
    if (status === 'ACTIVE') {
      return 'text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950'
    }
    return 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-950'
  }

  // Mobile Skeleton UI
  if (isLoading) {
    return (
      <div className="space-y-4 px-2">
        <div className="h-10 bg-primary-100 dark:bg-primary-900 rounded-xl animate-pulse" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-primary-100 dark:bg-primary-900 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="flex gap-2 mb-4">
          <div className="h-8 w-20 bg-primary-100 dark:bg-primary-900 rounded-full animate-pulse" />
          <div className="h-8 w-24 bg-primary-100 dark:bg-primary-900 rounded-full animate-pulse" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4 p-4 rounded-2xl bg-white dark:bg-primary-900/50 border border-primary-100 dark:border-primary-800">
            <div className="flex-1 space-y-3">
              <div className="flex justify-between">
                <div className="h-5 w-1/2 bg-primary-100 dark:bg-primary-800 rounded animate-pulse" />
                <div className="h-5 w-12 bg-primary-100 dark:bg-primary-800 rounded animate-pulse" />
              </div>
              <div className="h-4 w-3/4 bg-primary-50 dark:bg-primary-800/50 rounded animate-pulse" />
              <div className="h-4 w-1/3 bg-primary-50 dark:bg-primary-800/50 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-20">

      <PageToolbar
        searchProps={{
          value: search,
          onChange: handleSearch,
          placeholder: "Buscar kit, cliente, o teléfono..."
        }}
        primaryAction={
          <Button asChild className="h-10">
            <Link to="/subscriptions/new">
              <Plus className="h-4 w-4 mr-1.5 shrink-0" />
              Nuevo
            </Link>
          </Button>
        }
        filters={
          <>
            <FilterPill active={statusFilter === 'ACTIVE'} onClick={() => handleFilter('status', statusFilter === 'ACTIVE' ? null : 'ACTIVE')}>
              Activas
            </FilterPill>
            <FilterPill active={statusFilter === 'SUSPENDED'} onClick={() => handleFilter('status', statusFilter === 'SUSPENDED' ? null : 'SUSPENDED')}>
              Suspendidas
            </FilterPill>
            <FilterPill active={hasOverdue === true} variant="destructive" onClick={() => handleFilter('hasOverdue', hasOverdue === true ? null : 'true')}>
              Con Deuda
            </FilterPill>
            <FilterPill active={expiringFilter} onClick={() => handleFilter('expiring', expiringFilter ? null : 'true')}>
              Por Vencer
            </FilterPill>
            {hasActiveFilters && (
              <FilterPill variant="secondary" onClick={clearAllFilters}>
                <RotateCcw className="h-3.5 w-3.5" />
                Limpiar
              </FilterPill>
            )}
          </>
        }
      />

      {/* Métricas de Cobranza */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-400 p-3 min-w-0">
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Vencidos
          </div>
          <p className="text-2xl font-bold mt-1 leading-none">{metrics.debtCount}</p>
          <p className="text-xs font-medium mt-1.5 truncate">{formatCurrency(summary?.financial.totalOverdue ?? 0)}</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-400 p-3 min-w-0">
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            Por Vencer
          </div>
          <p className="text-2xl font-bold mt-1 leading-none">{metrics.expiringCount}</p>
          <p className="text-xs font-medium mt-1.5 truncate">{formatCurrency(metrics.expiringTotal)}</p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-400 p-3 min-w-0">
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide">
            <Box className="h-3.5 w-3.5 shrink-0" />
            Pendientes
          </div>
          <p className="text-2xl font-bold mt-1 leading-none">{summary?.billingPeriods.pending ?? 0}</p>
          <p className="text-xs font-medium mt-1.5 truncate">{formatCurrency(summary?.financial.totalPending ?? 0)}</p>
        </div>
      </div>

      {/* Lista de Suscripciones (List Tiles) */}
      {!data || visibleSubscriptions.length === 0 ? (
        <EmptyState
          icon={<Link2 className="h-16 w-16 text-primary-200 dark:text-primary-800" />}
          title="Sin suscripciones"
          description="No encontramos resultados. Modifica los filtros o añade una nueva."
        />
      ) : (
        <div className="space-y-3">
          {visibleSubscriptions.map((sub) => (
            <div
              key={sub.id}
              onClick={() => navigate(`/subscriptions/${sub.id}`)}
              className={`block p-4 rounded-2xl border active:scale-[0.98] transition-all touch-manipulation shadow-sm cursor-pointer ${getCardTone(sub)}`}
            >
              {/* Top Row: Client & Status */}
              <div className="flex justify-between items-start mb-3">
                <div className="min-w-0 pr-4">
                  <h3 className="text-base font-bold text-primary-900 dark:text-primary-50 truncate leading-tight">
                    {getClientFullName(sub.client)}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-primary-500 dark:text-primary-400 text-sm">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{sub.client.phone}</span>
                    {sub.client.dni && (
                      <span className="text-xs">• C.I. {sub.client.dni}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0 gap-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${getStatusClass(sub.status)}`}>
                    {SUBSCRIPTION_STATUS_LABELS[sub.status]}
                  </span>
                  {sub.hasDebt && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400">
                      Deuda
                    </span>
                  )}
                </div>
              </div>

              {/* Middle Row: Kit & Plan Details */}
              <div className="flex items-center gap-3 bg-white/50 dark:bg-primary-950/30 rounded-xl p-2.5 mb-3 border border-primary-100/50 dark:border-primary-800/50">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-300 shrink-0">
                    <Box className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-primary-500 dark:text-primary-400 font-medium">Kit #{sub.kitNumber}</p>
                    <p className="text-sm font-semibold text-primary-800 dark:text-primary-100 truncate">{sub.plan.name}</p>
                  </div>
                </div>

                {/* Billing Day Badge */}
                <div className="shrink-0 text-center px-3 border-l border-primary-200 dark:border-primary-800">
                  <p className="text-[10px] font-medium uppercase text-primary-400 dark:text-primary-500">Corte</p>
                  <p className="text-lg font-bold text-primary-800 dark:text-primary-100 leading-none mt-0.5">{sub.billingDay}</p>
                </div>
              </div>

              {/* Bottom Row: Price, Alerts & Charge */}
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-primary-900 dark:text-primary-50">
                  {formatCurrency(sub.plan.price)}<span className="text-primary-400 dark:text-primary-500 font-normal">/mes</span>
                </span>

                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    {sub.currentPeriod && sub.currentPeriod.status === 'PENDING' && isExpiringSoon(sub.currentPeriod.endDate) && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                        <Calendar className="h-3 w-3" />
                        {getExpiringLabel(sub.currentPeriod.endDate)}
                      </span>
                    )}
                    {sub.overduePeriods > 0 && (
                      <span className="px-1.5 py-0.5 rounded-md text-xs font-medium bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400">
                        {sub.overduePeriods} venc.
                      </span>
                    )}
                  </div>

                  {(sub.hasDebt || (sub.currentPeriod && sub.currentPeriod.status !== 'PAID')) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleQuickPay(sub)
                      }}
                      disabled={payingId === sub.id}
                      className="flex items-center gap-1 px-3 h-9 rounded-lg bg-primary-800 text-white dark:bg-primary-700 text-sm font-semibold shadow-sm active:scale-95 transition-transform touch-manipulation disabled:opacity-50"
                      aria-label="Cobrar"
                    >
                      <Zap className="h-4 w-4 shrink-0" />
                      {payingId === sub.id ? '...' : 'Cobrar'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
