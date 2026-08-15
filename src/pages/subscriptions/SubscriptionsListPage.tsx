import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useSubscriptions } from '@/hooks/useSubscriptions'
import { Input } from '@/components/ui/input'
import { Plus, Search, Link2, RotateCcw, Box, Phone, Calendar } from 'lucide-react'
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
      return 'border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/20'
    }

    if (sub.status === 'SUSPENDED') {
      return 'border-blue-200 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/20'
    }

    if (sub.currentPeriod && sub.currentPeriod.status === 'PENDING' && isExpiringSoon(sub.currentPeriod.endDate)) {
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
      
      {/* Search Header (Sticky en móvil) */}
      <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-slate-50/90 dark:bg-primary-950/90 backdrop-blur-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-400 shrink-0" />
          <Input
            placeholder="Buscar kit, cliente, o teléfono..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 h-12 bg-white dark:bg-primary-900 border-primary-100 dark:border-primary-800 rounded-xl text-base shadow-sm focus-visible:ring-secondary-600"
          />
        </div>
        
        {/* Pills / Filters (Scrollable) */}
        <div className="flex items-center gap-2 overflow-x-auto py-3 no-scrollbar touch-pan-x">
          <button
            onClick={() => handleFilter('status', statusFilter === 'ACTIVE' ? null : 'ACTIVE')}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors active:scale-95 touch-manipulation flex items-center gap-1.5 ${
              statusFilter === 'ACTIVE'
                ? 'bg-primary-800 text-white dark:bg-primary-700'
                : 'bg-white text-primary-600 border border-primary-200 dark:bg-primary-900 dark:text-primary-300 dark:border-primary-700'
            }`}
          >
            Activas
          </button>
          <button
            onClick={() => handleFilter('status', statusFilter === 'SUSPENDED' ? null : 'SUSPENDED')}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors active:scale-95 touch-manipulation flex items-center gap-1.5 ${
              statusFilter === 'SUSPENDED'
                ? 'bg-primary-800 text-white dark:bg-primary-700'
                : 'bg-white text-primary-600 border border-primary-200 dark:bg-primary-900 dark:text-primary-300 dark:border-primary-700'
            }`}
          >
            Suspendidas
          </button>
          <button
            onClick={() => handleFilter('hasOverdue', hasOverdue === true ? null : 'true')}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors active:scale-95 touch-manipulation flex items-center gap-1.5 ${
              hasOverdue === true
                ? 'bg-red-600 text-white dark:bg-red-700'
                : 'bg-white text-primary-600 border border-primary-200 dark:bg-primary-900 dark:text-primary-300 dark:border-primary-700'
            }`}
          >
            Con Deuda
          </button>
          {hasActiveFilters && (
            <button 
              onClick={clearAllFilters} 
              className="whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium bg-secondary-100 text-secondary-800 dark:bg-secondary-900/30 dark:text-secondary-400 flex items-center gap-1 active:scale-95 touch-manipulation"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Lista de Suscripciones (List Tiles) */}
      {!data || visibleSubscriptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Link2 className="h-16 w-16 text-primary-200 dark:text-primary-800 mb-4" />
          <h3 className="text-lg font-medium text-primary-800 dark:text-primary-100">Sin suscripciones</h3>
          <p className="text-sm text-primary-500 dark:text-primary-400 mt-1 max-w-[250px]">
            No encontramos resultados. Modifica los filtros o añade una nueva.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleSubscriptions.map((sub) => (
            <Link
              key={sub.id}
              to={`/subscriptions/${sub.id}`}
              className={`block p-4 rounded-2xl border active:scale-[0.98] transition-all touch-manipulation shadow-sm ${getCardTone(sub)}`}
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

              {/* Bottom Row: Price & Alerts */}
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-primary-900 dark:text-primary-50">
                  {formatCurrency(sub.plan.price)}<span className="text-primary-400 dark:text-primary-500 font-normal">/mes</span>
                </span>
                
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
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Floating Action Button (FAB) Mobile */}
      <Link 
        to="/subscriptions/new"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+70px)] right-4 flex items-center justify-center h-14 w-14 rounded-full bg-primary-800 text-white shadow-lg active:scale-95 transition-transform touch-manipulation z-40 dark:bg-primary-700"
        aria-label="Nueva Suscripción"
      >
        <Plus size={24} strokeWidth={2.5} />
      </Link>
    </div>
  )
}
