import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useSubscriptions } from '@/hooks/useSubscriptions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Plus, Search, Link2, RotateCcw } from 'lucide-react'
import { formatCurrency, SUBSCRIPTION_STATUS_LABELS, isExpiringSoon, getExpiringLabel } from '@/lib/constants'
import { getClientFullName } from '@/lib/utils'
import type { SubscriptionWithDetails } from '@/types/api'

export function SubscriptionsListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')

  const statusFilter = searchParams.get('status') as 'ACTIVE' | 'SUSPENDED' | null
  const hasOverdue = searchParams.get('hasOverdue') === 'true' ? true : searchParams.get('hasOverdue') === 'false' ? false : undefined

  const { data, isLoading } = useSubscriptions()

  const visibleSubscriptions = useMemo(() => {
    const items = [...(data?.subscriptions ?? [])]

    const normalizedSearch = search.trim().toLowerCase()

    return items
      .filter((sub) => {
        if (statusFilter && sub.status !== statusFilter) return false
        if (hasOverdue !== undefined && sub.hasDebt !== hasOverdue) return false
        if (!normalizedSearch) return true

        const haystack = [
          getClientFullName(sub.client),
          sub.client.phone,
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
  }, [data, search, statusFilter, hasOverdue])

  const hasActiveFilters = Boolean(search || statusFilter || hasOverdue !== undefined)

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

  const getCardTone = (sub: SubscriptionWithDetails) => {
    if (sub.hasDebt) {
      return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-400'
    }

    if (sub.status === 'SUSPENDED') {
      return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-400'
    }

    if (sub.currentPeriod && sub.currentPeriod.status === 'PENDING' && isExpiringSoon(sub.currentPeriod.endDate)) {
      return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-400'
    }

    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-400'
  }

  const getStatusClass = (status: 'ACTIVE' | 'SUSPENDED') => {
    if (status === 'ACTIVE') {
      return 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50'
    }

    return 'text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/50'
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Suscripciones</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">Gestión de suscripciones activas</p>
        </div>
        <Button asChild className="w-full md:w-auto">
          <Link to="/subscriptions/new">
            <Plus className="h-4 w-4 md:mr-2 shrink-0" />
            <span className="hidden md:inline">Nueva Suscripción</span>
            <span className="md:hidden">Nueva</span>
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1 w-full md:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                placeholder="Buscar por cliente, teléfono, kit o plan"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <Button
                variant={statusFilter === 'ACTIVE' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilter('status', statusFilter === 'ACTIVE' ? null : 'ACTIVE')}
                className="whitespace-nowrap"
              >
                Activas
              </Button>
              <Button
                variant={statusFilter === 'SUSPENDED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilter('status', statusFilter === 'SUSPENDED' ? null : 'SUSPENDED')}
                className="whitespace-nowrap"
              >
                Suspendidas
              </Button>
              <Button
                variant={hasOverdue === true ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilter('hasOverdue', hasOverdue === true ? null : 'true')}
                className="whitespace-nowrap"
              >
                Con Deuda
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="whitespace-nowrap gap-1">
                  <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : !data || visibleSubscriptions.length === 0 ? (
            <div className="text-center py-12">
              <Link2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 shrink-0" />
              <p className="text-foreground font-medium">No se encontraron suscripciones</p>
              <p className="text-muted-foreground mt-2">
                Ajusta los filtros o crea una nueva suscripción para empezar.
              </p>
              {hasActiveFilters && (
                <Button variant="outline" className="mt-4" onClick={clearAllFilters}>
                  <RotateCcw className="h-4 w-4 mr-2 shrink-0" />
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {visibleSubscriptions.map((sub) => (
                <Link
                  key={sub.id}
                  to={`/subscriptions/${sub.id}`}
                  className={`block rounded-2xl border p-3 transition-all hover:-translate-y-0.5 hover:shadow-sm ${getCardTone(sub)}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-foreground">{getClientFullName(sub.client)}</p>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getStatusClass(sub.status)}`}>
                          {SUBSCRIPTION_STATUS_LABELS[sub.status]}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span>Kit #{sub.kitNumber}</span>
                        <span>•</span>
                        <span>{sub.plan.name}</span>
                        <span>•</span>
                        <span>{sub.client.phone}</span>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                      <div className="rounded-xl border border-primary-100 bg-white px-2 py-1 text-center shadow-sm text-primary-800 dark:border-primary-800 dark:bg-primary-900/50 dark:text-primary-100">
                        <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Corte</div>
                        <div className="text-lg font-bold leading-none">{sub.billingDay}</div>
                      </div>
                      {sub.currentPeriod && sub.currentPeriod.status === 'PENDING' && isExpiringSoon(sub.currentPeriod.endDate) && (
                        <span className="rounded-md px-1.5 py-0.5 text-[11px] font-medium text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/50">
                          {getExpiringLabel(sub.currentPeriod.endDate)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{formatCurrency(sub.plan.price)}/mes</span>
                    {sub.overduePeriods > 0 && (
                      <>
                        <span>•</span>
                        <span className="rounded-md px-1.5 py-0.5 text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/50">{sub.overduePeriods} vencidos</span>
                      </>
                    )}
                    {sub.pendingPeriods > 0 && (
                      <>
                        <span>•</span>
                        <span className="rounded-md px-1.5 py-0.5 text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/50">{sub.pendingPeriods} pendientes</span>
                      </>
                    )}
                    {sub.hasDebt && (
                      <>
                        <span>•</span>
                        <span className="rounded-md px-1.5 py-0.5 text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/50">Deuda</span>
                      </>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
