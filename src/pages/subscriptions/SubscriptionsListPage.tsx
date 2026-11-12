import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams, useLocation } from 'react-router-dom'
import { useInfiniteSubscriptions, usePrefetchSubscriptionDetail, useSubscriptionFilterTotals } from '@/hooks/useSubscriptions'
import { useDashboardAlerts, useDashboardSummary } from '@/hooks/useDashboard'
import { useOrganizationStore } from '@/stores/organization.store'
import { useAuthStore, useIsSuperAdmin } from '@/stores/auth.store'
import { getOrganizationPlanAccess } from '@/lib/business-plan'
import { Button } from '@/components/ui/button'
import { Plus, Link2, RotateCcw, Box, Phone, Calendar, DollarSign, AlertTriangle, Clock, LoaderCircle } from 'lucide-react'
import { PageToolbar } from '@/components/design-system/PageToolbar'
import { FilterPill } from '@/components/design-system/FilterPill'
import { EmptyState } from '@/components/design-system/EmptyState'
import { ErrorState } from '@/components/design-system/ErrorState'
import { Skeleton } from '@/components/design-system/Skeleton'
import { formatCurrency, SUBSCRIPTION_STATUS_LABELS, isExpiringSoon, getExpiringLabel } from '@/lib/constants'
import { getClientFullName, canPayAdvance } from '@/lib/utils'
import { useOpenOldestUnpaidPeriod } from '@/hooks/useOpenOldestUnpaidPeriod'
import { PayAdvanceSheet } from '@/components/payment/PayAdvanceSheet'
import { OrganizationSelectionEmptyState } from '@/components/organizations/OrganizationSelectionEmptyState'
import type { SubscriptionWithDetails } from '@/types/api'

export function SubscriptionsListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('search') || '')
  const [advanceSub, setAdvanceSub] = useState<SubscriptionWithDetails | null>(null)
  const isSuperAdmin = useIsSuperAdmin()
  const user = useAuthStore((state) => state.user)
  const { isReadOnly } = getOrganizationPlanAccess(user?.role === 'admin' ? user.organization : undefined)
  const organizationId = useOrganizationStore((state) => state.selectedOrganizationId)
  const { openOldestUnpaidPeriod, loadingSubscriptionId: payingId } = useOpenOldestUnpaidPeriod(organizationId ?? undefined)
  const prefetchSubscription = usePrefetchSubscriptionDetail(organizationId ?? undefined)

  const pageIndex = Math.max(0, (Number.parseInt(searchParams.get('page') ?? '', 10) || 1) - 1)
  const statusFilter = searchParams.get('status') as 'ACTIVE' | 'SUSPENDED' | null
  const hasOverdue = searchParams.get('hasOverdue') === 'true' ? true : searchParams.get('hasOverdue') === 'false' ? false : undefined
  const expiringFilter = searchParams.get('expiring') === 'true'
  const pendingFilter = searchParams.get('pending') === 'true'

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timeout)
  }, [search])

  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
    isFetchingNextPage,
    isFetchNextPageError,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteSubscriptions(
    {
      organizationId: organizationId ?? undefined,
      status: statusFilter ?? undefined,
      hasOverduePeriods: hasOverdue ?? undefined,
      expiring: expiringFilter || undefined,
      pending: pendingFilter || undefined,
      search: debouncedSearch || undefined,
      limit: 50,
    },
    { enabled: !isSuperAdmin || !!organizationId }
  )
  const pageData = data?.pages[pageIndex]
  const pageLimit = pageData?.pagination.limit ?? 50
  const total = data?.pages[0]?.pagination.total
  const canGoNext = pageIndex < (data?.pages.length ?? 0) - 1 || hasNextPage

  const goToPage = useCallback((index: number) => {
    const params = new URLSearchParams(searchParams)
    if (index > 0) params.set('page', String(index + 1))
    else params.delete('page')
    setSearchParams(params, { replace: true })
  }, [searchParams, setSearchParams])

  // Cambiar de organización invalida la página; cambiar filtros ya la quita en sus handlers.
  const previousOrganizationId = useRef(organizationId)
  useEffect(() => {
    if (previousOrganizationId.current === organizationId) return
    previousOrganizationId.current = organizationId
    if (searchParams.has('page')) goToPage(0)
  }, [organizationId, searchParams, goToPage])

  // Al volver a una página guardada en la URL sin caché, se piden las anteriores en orden.
  const loadedPages = data?.pages.length ?? 0
  const isLoadingSavedPage = loadedPages > 0 && pageIndex >= loadedPages && hasNextPage && !isFetchNextPageError
  useEffect(() => {
    if (isLoadingSavedPage && !isFetchingNextPage) void fetchNextPage()
  }, [isLoadingSavedPage, isFetchingNextPage, loadedPages, fetchNextPage])

  // La página guardada ya no existe (menos resultados): se muestra la última disponible.
  useEffect(() => {
    if (loadedPages > 0 && pageIndex >= loadedPages && !isLoadingSavedPage && !isFetchingNextPage) {
      goToPage(loadedPages - 1)
    }
  }, [loadedPages, pageIndex, isLoadingSavedPage, isFetchingNextPage, goToPage])

  const showEmpty = isSuperAdmin && !organizationId

  const handleSearch = (value: string) => {
    setSearch(value)
    const params = new URLSearchParams(searchParams)
    params.delete('page')
    if (value) params.set('search', value)
    else params.delete('search')
    setSearchParams(params, { replace: true })
  }

  const handleFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams)
    params.delete('page')
    if (value) params.set(key, value)
    else params.delete(key)
    setSearchParams(params)
  }

  const clearAllFilters = () => {
    setSearch('')
    setSearchParams({})
  }

  const isExpiringSub = (sub: SubscriptionWithDetails) =>
    sub.status === 'ACTIVE' &&
    sub.currentPeriod != null &&
    sub.currentPeriod.status !== 'PAID' &&
    isExpiringSoon(sub.currentPeriod.endDate)

  // Totales de toda la organización: no dependen de la página ni de los filtros activos.
  const totalsEnabled = !isSuperAdmin || !!organizationId
  const totalsParams = { organizationId: organizationId ?? undefined }
  const filterTotals = useSubscriptionFilterTotals(organizationId ?? undefined, { enabled: totalsEnabled })
  const { data: summary } = useDashboardSummary(totalsParams, { enabled: totalsEnabled })
  const { data: alerts } = useDashboardAlerts(totalsParams, { enabled: totalsEnabled })

  const expiringAmount = alerts
    ? alerts.expiringSoon.items.filter((item) => item.status !== 'PAID').reduce((sum, item) => sum + item.amount, 0)
    : undefined
  const formatMetricAmount = (amount: number | undefined, isPartial = false) =>
    amount === undefined ? '—' : `${isPartial ? 'Más de ' : ''}${formatCurrency(amount)}`

  const visibleSubscriptions = useMemo(
    () => (pageData?.subscriptions ?? []).filter((sub) => sub.client != null),
    [pageData],
  )

  const handleNextPage = async () => {
    if (pageIndex < loadedPages - 1) {
      goToPage(pageIndex + 1)
      return
    }

    const result = await fetchNextPage()
    if (result.data?.pages[pageIndex + 1]) {
      goToPage(pageIndex + 1)
    }
  }

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

  if ((isLoading || isLoadingSavedPage) && !showEmpty) {
    return (
      <div role="status" aria-label="Cargando suscripciones" className="space-y-4 px-2">
        <Skeleton className="h-10" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 sm:gap-4">

      <PageToolbar
        searchProps={{
          value: search,
          onChange: handleSearch,
          placeholder: "Buscar cliente, código o teléfono"
        }}
        primaryAction={!isReadOnly ? (
          <Button asChild className="h-10 w-10 rounded-full! p-0 sm:h-10 sm:w-auto sm:rounded-md sm:px-4 sm:py-2" aria-label="Nueva suscripción" title="Nueva suscripción">
            <Link
              to="/subscriptions/new"
              state={{ returnTo: `${location.pathname}${location.search}` }}
            >
              <Plus className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 sm:mr-1.5" />
              <span className="hidden sm:inline">Nuevo</span>
            </Link>
          </Button>
        ) : undefined}
        filters={!showEmpty ? (
          <>
            <FilterPill active={statusFilter === 'ACTIVE'} onClick={() => handleFilter('status', statusFilter === 'ACTIVE' ? null : 'ACTIVE')}>
              Activas
            </FilterPill>
            <FilterPill active={statusFilter === 'SUSPENDED'} onClick={() => handleFilter('status', statusFilter === 'SUSPENDED' ? null : 'SUSPENDED')}>
              Suspendidas
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
        <OrganizationSelectionEmptyState description="Elige una organización para consultar sus suscripciones." />
      ) : isError && !data ? (
        <ErrorState
          title="No se pudieron cargar las suscripciones"
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
      ) : (
        <>
          {/* Métricas de Cobranza (filtros rápidos) */}
          <p className="text-xs text-muted-foreground">Totales de la organización. Toca uno para filtrar.</p>
          <div className="-mt-1 grid grid-cols-3 gap-2 sm:-mt-2">
            <button
              type="button"
              onClick={() => handleFilter('hasOverdue', hasOverdue === true ? null : 'true')}
              aria-pressed={hasOverdue === true}
              title={hasOverdue === true ? 'Quitar filtro de vencidos' : 'Ver solo vencidos'}
              className="rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive p-2.5 min-w-0 text-left cursor-pointer transition-all touch-manipulation hover:brightness-95 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50 data-[active=true]:ring-2 data-[active=true]:ring-destructive/50"
              data-active={hasOverdue === true}
            >
              <span className="flex items-center gap-1 text-xs font-bold">
                <AlertTriangle className="hidden h-3.5 w-3.5 shrink-0 min-[400px]:block" />
                Vencidos
              </span>
              <span className="text-xl font-bold mt-1 leading-none block">{filterTotals.overdue ?? '—'}</span>
              <span className="text-xs font-medium mt-1 truncate block">{formatMetricAmount(summary?.financial.totalOverdue)}</span>
            </button>

            <button
              type="button"
              onClick={() => handleFilter('expiring', expiringFilter ? null : 'true')}
              aria-pressed={expiringFilter}
              title={expiringFilter ? 'Quitar filtro de por vencer' : 'Ver solo por vencer'}
              className="rounded-2xl border border-warning/20 bg-warning/10 text-warning p-2.5 min-w-0 text-left cursor-pointer transition-all touch-manipulation hover:brightness-95 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning/50 data-[active=true]:ring-2 data-[active=true]:ring-warning/50"
              data-active={expiringFilter}
            >
              <span className="flex items-center gap-1 text-xs font-bold">
                <Clock className="hidden h-3.5 w-3.5 shrink-0 min-[400px]:block" />
                Por vencer
              </span>
              <span className="text-xl font-bold mt-1 leading-none block">{filterTotals.expiring ?? '—'}</span>
              <span className="text-xs font-medium mt-1 truncate block">{formatMetricAmount(expiringAmount, alerts?.expiringSoon.hasMore)}</span>
            </button>

            <button
              type="button"
              onClick={() => handleFilter('pending', pendingFilter ? null : 'true')}
              aria-pressed={pendingFilter}
              title={pendingFilter ? 'Quitar filtro de pendientes' : 'Ver solo pendientes'}
              className="rounded-2xl border border-info/20 bg-info/10 text-info p-2.5 min-w-0 text-left cursor-pointer transition-all touch-manipulation hover:brightness-95 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/50 data-[active=true]:ring-2 data-[active=true]:ring-info/50"
              data-active={pendingFilter}
            >
              <span className="flex items-center gap-1 text-xs font-bold">
                <Box className="hidden h-3.5 w-3.5 shrink-0 min-[400px]:block" />
                Pendientes
              </span>
              <span className="text-xl font-bold mt-1 leading-none block">{filterTotals.pending ?? '—'}</span>
              <span className="text-xs font-medium mt-1 truncate block">{formatMetricAmount(summary?.financial.totalPending)}</span>
            </button>
          </div>

          {/* Lista de Suscripciones (List Tiles) */}
          {!data || visibleSubscriptions.length === 0 ? (
            <EmptyState
              icon={<Link2 className="h-16 w-16 text-subtle-foreground" />}
              title={hasActiveFilters ? 'Sin resultados' : 'Sin suscripciones'}
              description={
                hasActiveFilters
                  ? 'Ninguna suscripción coincide con tu búsqueda o filtros.'
                  : 'Registra la primera suscripción para empezar a cobrar.'
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" onClick={clearAllFilters}>
                    <RotateCcw className="h-4 w-4 mr-2 shrink-0" />
                    Limpiar filtros
                  </Button>
                ) : !isReadOnly ? (
                  <Button asChild>
                    <Link
                      to="/subscriptions/new"
                      state={{ returnTo: `${location.pathname}${location.search}` }}
                    >
                      <Plus className="h-4 w-4 mr-2 shrink-0" />
                      Crear suscripción
                    </Link>
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {visibleSubscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className={`rounded-xl sm:rounded-2xl border shadow-sm ${getCardTone(sub)}`}
                >
                  <Link
                    to={`/subscriptions/${sub.id}`}
                    state={{
                      from: `${location.pathname}${location.search}`,
                      preview: { title: getClientFullName(sub.client), subtitle: sub.kitNumber },
                    }}
                    onPointerDown={() => prefetchSubscription(sub.id)}
                    onFocus={() => prefetchSubscription(sub.id)}
                    className="block rounded-xl sm:rounded-2xl p-3 sm:p-4 active:scale-[0.98] transition-all touch-manipulation"
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
                          <span className="text-xs truncate shrink-0">• C.I. {sub.client.dni}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-1 sm:gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusClass(sub.status)}`}>
                        {SUBSCRIPTION_STATUS_LABELS[sub.status]}
                      </span>
                      {sub.hasDebt && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide text-destructive bg-destructive/10">
                          Vencidos
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle Row: Service & Plan Details */}
                  <div className="flex items-center gap-2 sm:gap-3 bg-surface-muted rounded-lg sm:rounded-xl p-2 sm:p-2.5 mb-2 sm:mb-3 border border-border-subtle">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-primary/10 text-primary-text shrink-0">
                        <Box className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </div>
                        <div className="min-w-0">
                          <p className="text-[13px] sm:text-sm font-semibold text-foreground truncate leading-tight">
                            {sub.accountNumber ? sub.accountNumber : sub.kitNumber}
                          </p>
                          <p className="text-xs text-muted-foreground font-medium truncate leading-tight mt-0.5">
                            {sub.accountNumber ? `${sub.kitNumber} • ` : ''}{sub.plan.name}
                          </p>
                        </div>
                    </div>

                    {/* Billing Day Badge */}
                    <div className="shrink-0 text-center px-2 sm:px-3 border-l border-border">
                      <p className="text-xs font-medium uppercase text-subtle-foreground">Corte</p>
                      <p className="text-base sm:text-lg font-bold text-foreground leading-none mt-0.5">{sub.billingDay}</p>
                    </div>
                  </div>
                  </Link>

                  {/* Bottom Row: Price, Alerts & Charge */}
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-3 text-[13px] sm:px-4 sm:pb-4 sm:text-sm">
                    <span className="font-semibold text-foreground truncate">
                      {formatCurrency(sub.plan.price)}<span className="text-subtle-foreground font-normal">/mes</span>
                    </span>

                    <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 ml-auto">
                      <div className="flex flex-wrap justify-end gap-1 sm:gap-1.5">
                        {sub.currentPeriod && isExpiringSoon(sub.currentPeriod.endDate) && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium bg-warning/10 text-warning">
                            <Calendar className="h-3 w-3" />
                            {getExpiringLabel(sub.currentPeriod.endDate)}
                          </span>
                        )}
                        {sub.pendingPeriods > 0 && (!sub.currentPeriod || sub.currentPeriod.status !== 'PENDING') && (
                          <span className="px-1.5 py-0.5 rounded-md text-xs font-medium bg-info/10 text-info">
                            {sub.pendingPeriods} pendientes
                          </span>
                        )}
                        {sub.overduePeriods > 0 && (
                          <span className="px-1.5 py-0.5 rounded-md text-xs font-medium bg-destructive/10 text-destructive">
                            {sub.overduePeriods} vencidos
                          </span>
                        )}
                      </div>

                      {(sub.hasDebt || sub.pendingPeriods > 0 || (sub.currentPeriod && sub.currentPeriod.status !== 'PAID')) && (
                        <button
                          type="button"
                          onClick={() => {
                            void openOldestUnpaidPeriod(sub.id)
                          }}
                          disabled={payingId === sub.id}
                          className="flex items-center justify-center gap-1 h-10 min-w-10 px-3 sm:h-9 rounded-full sm:rounded-lg bg-primary text-primary-foreground text-[13px] sm:text-sm font-semibold shadow-sm transition-colors hover:bg-primary/90 active:scale-95 touch-manipulation disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          aria-label={`Cobrar a ${getClientFullName(sub.client)}`}
                          title={`Cobrar a ${getClientFullName(sub.client)}`}
                        >
                          {payingId === sub.id
                            ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" />
                            : <DollarSign className="h-4 w-4 shrink-0" />}
                          <span className="hidden min-[380px]:inline">Cobrar</span>
                        </button>
                      )}
                      {canPayAdvance(sub) && (
                        <button
                          type="button"
                          onClick={() => {
                            setAdvanceSub(sub)
                          }}
                          className="flex items-center justify-center gap-1 h-10 min-w-10 px-3 sm:h-9 rounded-full sm:rounded-lg bg-surface-muted text-surface-muted-foreground border border-border-subtle text-[13px] sm:text-sm font-semibold shadow-sm transition-colors hover:bg-surface-hover active:bg-surface-active active:scale-95 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
          {total !== undefined && total > pageLimit && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 text-sm text-surface-foreground">
              <span className="text-muted-foreground">
                {pageIndex * pageLimit + 1}–{Math.min(pageIndex * pageLimit + (pageData?.subscriptions.length ?? 0), total)} de {total}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pageIndex === 0 || isFetchingNextPage}
                  onClick={() => goToPage(pageIndex - 1)}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canGoNext || isFetchingNextPage}
                  onClick={() => void handleNextPage()}
                >
                  {isFetchingNextPage && <LoaderCircle className="animate-spin" />}
                  Siguiente
                </Button>
              </div>
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