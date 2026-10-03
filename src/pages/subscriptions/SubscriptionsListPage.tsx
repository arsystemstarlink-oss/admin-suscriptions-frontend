import { useMemo, useState } from 'react'
import { Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useSubscriptions } from '@/hooks/useSubscriptions'
import { useOrganizationStore } from '@/stores/organization.store'
import { useIsSuperAdmin } from '@/stores/auth.store'
import { billingApi } from '@/api/billing.api'
import { qk } from '@/lib/query-keys'
import { Button } from '@/components/ui/button'
import { Plus, Link2, RotateCcw, Box, Phone, Calendar, Zap, AlertTriangle, Clock } from 'lucide-react'
import { PageToolbar } from '@/components/design-system/PageToolbar'
import { FilterPill } from '@/components/design-system/FilterPill'
import { EmptyState } from '@/components/design-system/EmptyState'
import { formatCurrency, SUBSCRIPTION_STATUS_LABELS, isExpiringSoon, getExpiringLabel } from '@/lib/constants'
import { getClientFullName, canPayAdvance } from '@/lib/utils'
import { useUIStore } from '@/stores/ui.store'
import { PayAdvanceSheet } from '@/components/payment/PayAdvanceSheet'
import { toast } from 'sonner'
import type { SubscriptionWithDetails } from '@/types/api'

export function SubscriptionsListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { openQuickPay } = useUIStore()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [payingId, setPayingId] = useState<string | null>(null)
  const [advanceSub, setAdvanceSub] = useState<SubscriptionWithDetails | null>(null)
  const isSuperAdmin = useIsSuperAdmin()
  const organizationId = useOrganizationStore((state) => state.selectedOrganizationId)

  const statusFilter = searchParams.get('status') as 'ACTIVE' | 'SUSPENDED' | null
  const hasOverdue = searchParams.get('hasOverdue') === 'true' ? true : searchParams.get('hasOverdue') === 'false' ? false : undefined
  const expiringFilter = searchParams.get('expiring') === 'true'
  const pendingFilter = searchParams.get('pending') === 'true'

  const { data, isLoading } = useSubscriptions(
    {
      organizationId: organizationId ?? undefined,
      status: statusFilter ?? 'ACTIVE',
      limit: 200,
    },
    { enabled: !isSuperAdmin || !!organizationId }
  )

  const showEmpty = isSuperAdmin && !organizationId

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
        queryKey: [...qk.billing.lists, { subscriptionId: sub.id, organizationId: organizationId ?? undefined, limit: 50 }],
        queryFn: () => billingApi.list({ subscriptionId: sub.id, organizationId: organizationId ?? undefined, limit: 50 }),
        staleTime: 30_000,
      })
      const unpaid = result.periods
        .filter((p) => p.status !== 'PAID' && p.subscription != null)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0]

      if (unpaid) {
        openQuickPay({ period: unpaid })
      } else if (result.periods.some((p) => p.status !== 'PAID')) {
        toast.error('No se pudo abrir el cobro: datos incompletos del período')
      } else {
        toast.info('No hay períodos pendientes para esta suscripción')
      }
    } catch {
      toast.error('Error al consultar los períodos de la suscripción')
    } finally {
      setPayingId(null)
    }
  }

  const isOverdueSub = (sub: SubscriptionWithDetails) => sub.hasDebt

  const isExpiringSub = (sub: SubscriptionWithDetails) =>
    sub.currentPeriod?.status === 'PENDING' && isExpiringSoon(sub.currentPeriod.endDate)

  const isPendingSub = (sub: SubscriptionWithDetails) =>
    sub.status === 'ACTIVE' && sub.pendingPeriods > 0

  const getSubPrice = (sub: SubscriptionWithDetails) =>
    sub.plan?.price ?? sub.currentPeriod?.amount ?? 0

  const metrics = useMemo(() => {
    const subs = data?.subscriptions ?? []
    const overdueSubs = subs.filter(isOverdueSub)
    const expiringSubs = subs.filter(isExpiringSub)
    const pendingSubs = subs.filter(isPendingSub)
    return {
      debtCount: overdueSubs.length,
      debtTotal: overdueSubs.reduce((sum, s) => sum + s.overduePeriods * getSubPrice(s), 0),
      expiringCount: expiringSubs.length,
      expiringTotal: expiringSubs.reduce((sum, s) => sum + (s.currentPeriod?.amount ?? getSubPrice(s)), 0),
      pendingCount: pendingSubs.length,
      pendingTotal: pendingSubs.reduce((sum, s) => sum + s.pendingPeriods * getSubPrice(s), 0),
    }
  }, [data])

  const visibleSubscriptions = useMemo(() => {
    const items = [...(data?.subscriptions ?? [])].filter((sub) => sub.client != null)

    const normalizedSearch = search.trim().toLowerCase()

    return items.filter((sub) => {
      if (statusFilter && sub.status !== statusFilter) return false
      if (hasOverdue !== undefined && sub.hasDebt !== hasOverdue) return false
      if (expiringFilter && !isExpiringSub(sub)) return false
      if (pendingFilter && !isPendingSub(sub)) return false
      if (!normalizedSearch) return true

      const haystack = [
        getClientFullName(sub.client),
        sub.client?.phone ?? '',
        sub.client?.dni || '',
        sub.plan.name,
        sub.kitNumber,
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedSearch)
    })
  }, [data, search, statusFilter, hasOverdue, expiringFilter, pendingFilter])

  const hasActiveFilters = Boolean(search || statusFilter || hasOverdue !== undefined || expiringFilter || pendingFilter)

  const getCardTone = (sub: SubscriptionWithDetails) => {
    if (sub.hasDebt) {
      return 'border-destructive/30 bg-destructive/5 text-surface-foreground'
    }

    if (sub.status === 'SUSPENDED') {
      return 'border-info/30 bg-info/5 text-surface-foreground'
    }

    if (isExpiringSub(sub)) {
      return 'border-warning/30 bg-warning/5 text-surface-foreground'
    }

    return 'border-border bg-surface text-surface-foreground'
  }

  const getStatusClass = (status: 'ACTIVE' | 'SUSPENDED') => {
    if (status === 'ACTIVE') {
      return 'text-success bg-success/10'
    }
    return 'text-info bg-info/10'
  }

  if (isLoading && !showEmpty) {
    return (
      <div className="space-y-4 px-2">
        <div className="h-10 bg-muted rounded-xl animate-pulse" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="flex gap-2 mb-4">
          <div className="h-8 w-20 bg-muted rounded-full animate-pulse" />
          <div className="h-8 w-24 bg-muted rounded-full animate-pulse" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4 p-4 rounded-2xl bg-surface border border-border">
            <div className="flex-1 space-y-3">
              <div className="flex justify-between">
                <div className="h-5 w-1/2 bg-muted rounded animate-pulse" />
                <div className="h-5 w-12 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
              <div className="h-4 w-1/3 bg-muted rounded animate-pulse" />
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
          <Button asChild className="h-10 w-10 rounded-full! p-0 sm:h-10 sm:w-auto sm:rounded-md sm:px-4 sm:py-2" aria-label="Nueva suscripción" title="Nueva suscripción">
            <Link to="/subscriptions/new">
              <Plus className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 sm:mr-1.5" />
              <span className="hidden sm:inline">Nuevo</span>
            </Link>
          </Button>
        }
        filters={!showEmpty ? (
          <>
            <FilterPill active={statusFilter === 'ACTIVE' || statusFilter === null} onClick={() => handleFilter('status', statusFilter === 'ACTIVE' ? null : 'ACTIVE')}>
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
            <FilterPill active={pendingFilter} onClick={() => handleFilter('pending', pendingFilter ? null : 'true')}>
              Por cobrar
            </FilterPill>
            {hasActiveFilters && (
              <FilterPill variant="secondary" onClick={clearAllFilters}>
                <RotateCcw className="h-3.5 w-3.5" />
                Limpiar
              </FilterPill>
            )}
          </>
        ) : undefined}
      />

      {showEmpty ? (
        <div className="p-4 text-sm text-warning bg-warning/10 border border-warning/20 rounded-2xl flex items-start gap-3">
          <span className="shrink-0 mt-0.5">⚠️</span>
          <span>Selecciona una organización para ver las suscripciones.</span>
        </div>
      ) : (
        <>
          {/* Métricas de Cobranza (filtros rápidos) */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleFilter('hasOverdue', hasOverdue === true ? null : 'true')}
              aria-pressed={hasOverdue === true}
              title={hasOverdue === true ? 'Quitar filtro de vencidos' : 'Ver solo vencidos'}
              className="rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive p-3 min-w-0 text-left cursor-pointer transition-all touch-manipulation hover:brightness-95 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50 data-[active=true]:ring-2 data-[active=true]:ring-destructive/50"
              data-active={hasOverdue === true}
            >
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Vencidos
              </span>
              <span className="text-2xl font-bold mt-1 leading-none block">{metrics.debtCount}</span>
              <span className="text-xs font-medium mt-1.5 truncate block">{formatCurrency(metrics.debtTotal)}</span>
            </button>

            <button
              type="button"
              onClick={() => handleFilter('expiring', expiringFilter ? null : 'true')}
              aria-pressed={expiringFilter}
              title={expiringFilter ? 'Quitar filtro de por vencer' : 'Ver solo por vencer'}
              className="rounded-2xl border border-warning/20 bg-warning/10 text-warning p-3 min-w-0 text-left cursor-pointer transition-all touch-manipulation hover:brightness-95 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning/50 data-[active=true]:ring-2 data-[active=true]:ring-warning/50"
              data-active={expiringFilter}
            >
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                Por Vencer
              </span>
              <span className="text-2xl font-bold mt-1 leading-none block">{metrics.expiringCount}</span>
              <span className="text-xs font-medium mt-1.5 truncate block">{formatCurrency(metrics.expiringTotal)}</span>
            </button>

            <button
              type="button"
              onClick={() => handleFilter('pending', pendingFilter ? null : 'true')}
              aria-pressed={pendingFilter}
              title={pendingFilter ? 'Quitar filtro de pendientes' : 'Ver solo pendientes'}
              className="rounded-2xl border border-info/20 bg-info/10 text-info p-3 min-w-0 text-left cursor-pointer transition-all touch-manipulation hover:brightness-95 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/50 data-[active=true]:ring-2 data-[active=true]:ring-info/50"
              data-active={pendingFilter}
            >
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide">
                <Box className="h-3.5 w-3.5 shrink-0" />
                Pendientes
              </span>
              <span className="text-2xl font-bold mt-1 leading-none block">{metrics.pendingCount}</span>
              <span className="text-xs font-medium mt-1.5 truncate block">{formatCurrency(metrics.pendingTotal)}</span>
            </button>
          </div>

          {/* Lista de Suscripciones (List Tiles) */}
          {!data || visibleSubscriptions.length === 0 ? (
            <EmptyState
              icon={<Link2 className="h-16 w-16 text-subtle-foreground" />}
              title="Sin suscripciones"
              description="No encontramos resultados. Modifica los filtros o añade una nueva."
            />
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {visibleSubscriptions.map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => navigate(`/subscriptions/${sub.id}`, { state: { from: `${location.pathname}${location.search}` } })}
                  className={`block p-3 sm:p-4 rounded-xl sm:rounded-2xl border active:scale-[0.98] transition-all touch-manipulation shadow-sm cursor-pointer ${getCardTone(sub)}`}
                >
                  {/* Top Row: Client & Status */}
                  <div className="flex justify-between items-start gap-2 mb-2 sm:mb-3">
                    <div className="min-w-0 flex-1 pr-2 sm:pr-4">
                      <h3 className="text-[15px] sm:text-base font-bold text-foreground truncate leading-tight">
                        {getClientFullName(sub.client)}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5 sm:mt-1 text-muted-foreground text-xs sm:text-sm min-w-0">
                        <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                        <span className="truncate">{sub.client?.phone ?? 'Sin teléfono'}</span>
                        {sub.client?.dni && (
                          <span className="text-[11px] sm:text-xs truncate shrink-0">• C.I. {sub.client.dni}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-1 sm:gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${getStatusClass(sub.status)}`}>
                        {SUBSCRIPTION_STATUS_LABELS[sub.status]}
                      </span>
                      {sub.hasDebt && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide text-destructive bg-destructive/10">
                          Deuda
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle Row: Kit & Plan Details */}
                  <div className="flex items-center gap-2 sm:gap-3 bg-surface-muted rounded-lg sm:rounded-xl p-2 sm:p-2.5 mb-2 sm:mb-3 border border-border-subtle">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-primary/10 text-primary shrink-0">
                        <Box className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </div>
                        <div className="min-w-0">
                          <p className="text-[13px] sm:text-sm font-semibold text-foreground truncate leading-tight">
                            {sub.accountNumber ? sub.accountNumber : sub.kitNumber}
                          </p>
                          <p className="text-[11px] sm:text-xs text-muted-foreground font-medium truncate leading-tight mt-0.5">
                            {sub.accountNumber ? `${sub.kitNumber} • ` : ''}{sub.plan.name}
                          </p>
                        </div>
                    </div>

                    {/* Billing Day Badge */}
                    <div className="shrink-0 text-center px-2 sm:px-3 border-l border-border">
                      <p className="text-[10px] font-medium uppercase text-subtle-foreground">Corte</p>
                      <p className="text-base sm:text-lg font-bold text-foreground leading-none mt-0.5">{sub.billingDay}</p>
                    </div>
                  </div>

                  {/* Bottom Row: Price, Alerts & Charge */}
                  <div className="flex items-center justify-between gap-2 text-[13px] sm:text-sm">
                    <span className="font-semibold text-foreground truncate">
                      {formatCurrency(sub.plan.price)}<span className="text-subtle-foreground font-normal">/mes</span>
                    </span>

                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      <div className="flex gap-1 sm:gap-1.5">
                        {sub.currentPeriod && sub.currentPeriod.status === 'PENDING' && isExpiringSoon(sub.currentPeriod.endDate) && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium bg-warning/10 text-warning">
                            <Calendar className="h-3 w-3" />
                            {getExpiringLabel(sub.currentPeriod.endDate)}
                          </span>
                        )}
                        {sub.pendingPeriods > 0 && (!sub.currentPeriod || sub.currentPeriod.status !== 'PENDING') && (
                          <span className="px-1.5 py-0.5 rounded-md text-xs font-medium bg-info/10 text-info">
                            {sub.pendingPeriods} pend.
                          </span>
                        )}
                        {sub.overduePeriods > 0 && (
                          <span className="px-1.5 py-0.5 rounded-md text-xs font-medium bg-destructive/10 text-destructive">
                            {sub.overduePeriods} venc.
                          </span>
                        )}
                      </div>

                      {(sub.hasDebt || sub.pendingPeriods > 0 || (sub.currentPeriod && sub.currentPeriod.status !== 'PAID')) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleQuickPay(sub)
                          }}
                          disabled={payingId === sub.id}
                          className="flex items-center justify-center gap-1 h-8 min-w-8 px-2 sm:px-3 sm:h-9 rounded-full sm:rounded-lg bg-primary text-primary-foreground text-[13px] sm:text-sm font-semibold shadow-sm transition-colors hover:bg-primary/90 active:scale-95 touch-manipulation disabled:opacity-50"
                          aria-label="Cobrar"
                          title="Cobrar"
                        >
                          <Zap className="h-4 w-4 shrink-0" />
                          <span className="hidden min-[380px]:inline">{payingId === sub.id ? '...' : 'Cobrar'}</span>
                        </button>
                      )}
                      {canPayAdvance(sub) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setAdvanceSub(sub)
                          }}
                          className="flex items-center justify-center gap-1 h-8 min-w-8 px-2 sm:px-3 sm:h-9 rounded-full sm:rounded-lg bg-surface-muted text-surface-muted-foreground border border-border-subtle text-[13px] sm:text-sm font-semibold shadow-sm transition-colors hover:bg-surface-hover active:bg-surface-active active:scale-95 touch-manipulation"
                          aria-label="Pagar por adelantado"
                          title="Pagar por adelantado"
                        >
                          <Calendar className="h-4 w-4 shrink-0" />
                          <span className="hidden min-[380px]:inline">Adelanto</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <PayAdvanceSheet
        subscription={advanceSub}
        open={!!advanceSub}
        onOpenChange={(open) => !open && setAdvanceSub(null)}
      />
    </div>
  )
}