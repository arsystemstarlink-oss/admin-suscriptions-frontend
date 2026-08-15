import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useClients } from '@/hooks/useClients'
import { Input } from '@/components/ui/input'
import { Plus, Search, Users, Phone, MoreVertical } from 'lucide-react'
import { getClientFullName } from '@/lib/utils'

export function ClientsListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')

  const subscriptionStatus = searchParams.get('subscriptionStatus') as 'ACTIVE' | 'SUSPENDED' | 'MIXED' | 'NONE' | null
  const hasOverdue = searchParams.get('hasOverdue') === 'true' ? true : searchParams.get('hasOverdue') === 'false' ? false : undefined

  const { data, isLoading } = useClients({
    search: searchParams.get('search') || undefined,
    subscriptionStatus: subscriptionStatus || undefined,
    hasOverdue,
  })

  const handleSearch = (value: string) => {
    setSearch(value)
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set('search', value)
    } else {
      params.delete('search')
    }
    setSearchParams(params)
  }

  const handleFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    setSearchParams(params)
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
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-4 p-4 rounded-2xl bg-white dark:bg-primary-900/50 border border-primary-100 dark:border-primary-800">
            <div className="h-12 w-12 rounded-full bg-primary-100 dark:bg-primary-800 animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-primary-100 dark:bg-primary-800 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-primary-50 dark:bg-primary-800/50 rounded animate-pulse" />
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
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 h-12 bg-white dark:bg-primary-900 border-primary-100 dark:border-primary-800 rounded-xl text-base shadow-sm focus-visible:ring-secondary-600"
          />
        </div>
        
        {/* Pills / Filters (Scrollable) */}
        <div className="flex items-center gap-2 overflow-x-auto py-3 no-scrollbar touch-pan-x">
          <button
            onClick={() => handleFilter('subscriptionStatus', subscriptionStatus === 'ACTIVE' ? null : 'ACTIVE')}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors active:scale-95 touch-manipulation ${
              subscriptionStatus === 'ACTIVE'
                ? 'bg-primary-800 text-white dark:bg-primary-700'
                : 'bg-white text-primary-600 border border-primary-200 dark:bg-primary-900 dark:text-primary-300 dark:border-primary-700'
            }`}
          >
            Activos
          </button>
          <button
            onClick={() => handleFilter('subscriptionStatus', subscriptionStatus === 'SUSPENDED' ? null : 'SUSPENDED')}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors active:scale-95 touch-manipulation ${
              subscriptionStatus === 'SUSPENDED'
                ? 'bg-primary-800 text-white dark:bg-primary-700'
                : 'bg-white text-primary-600 border border-primary-200 dark:bg-primary-900 dark:text-primary-300 dark:border-primary-700'
            }`}
          >
            Suspendidos
          </button>
          <button
            onClick={() => handleFilter('hasOverdue', hasOverdue === true ? null : 'true')}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors active:scale-95 touch-manipulation ${
              hasOverdue === true
                ? 'bg-red-600 text-white dark:bg-red-700'
                : 'bg-white text-primary-600 border border-primary-200 dark:bg-primary-900 dark:text-primary-300 dark:border-primary-700'
            }`}
          >
            Con Deuda
          </button>
        </div>
      </div>

      {/* Lista de Clientes (List Tiles) */}
      {!data || data.clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="h-16 w-16 text-primary-200 dark:text-primary-800 mb-4" />
          <h3 className="text-lg font-medium text-primary-800 dark:text-primary-100">Sin clientes</h3>
          <p className="text-sm text-primary-500 dark:text-primary-400 mt-1 max-w-[250px]">
            No encontramos resultados. Modifica los filtros o añade uno nuevo.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.clients.map((client) => {
            const initial = client.firstName ? client.firstName.charAt(0).toUpperCase() : '?';
            
            return (
              <Link
                key={client.id}
                to={`/clients/${client.id}`}
                className="group flex gap-4 p-4 rounded-2xl bg-white text-primary-900 border border-primary-100 shadow-sm active:scale-[0.98] active:bg-primary-50 transition-all touch-manipulation dark:bg-primary-900/50 dark:text-primary-50 dark:border-primary-800 dark:active:bg-primary-800"
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-secondary-100 text-secondary-700 font-bold text-lg dark:bg-secondary-900/30 dark:text-secondary-400">
                    {initial}
                  </div>
                  {/* Status Indicator Dot */}
                  <div className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-primary-900 ${
                    client.subscriptionStatus === 'ACTIVE' ? 'bg-emerald-500' : 
                    client.subscriptionStatus === 'SUSPENDED' ? 'bg-red-500' : 'bg-primary-400'
                  }`} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-semibold text-base truncate pr-2">
                      {getClientFullName(client)}
                    </h3>
                    {client.hasDebt && (
                      <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-950">
                        Deuda
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 mt-1.5 text-sm text-primary-500 dark:text-primary-400">
                    {client.phone && (
                      <span className="flex items-center gap-1 truncate">
                        <Phone size={14} />
                        {client.phone}
                      </span>
                    )}
                    {client.totalSubscriptions > 0 && (
                      <span className="flex items-center gap-1 shrink-0">
                        <CreditCardIcon size={14} />
                        {client.totalSubscriptions}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Chevron */}
                <div className="flex items-center text-primary-300 dark:text-primary-600">
                  <MoreVertical size={20} />
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Floating Action Button (FAB) Mobile */}
      <Link 
        to="/clients/new"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+70px)] right-4 flex items-center justify-center h-14 w-14 rounded-full bg-primary-800 text-white shadow-lg active:scale-95 transition-transform touch-manipulation z-40 dark:bg-primary-700"
        aria-label="Nuevo Cliente"
      >
        <Plus size={24} strokeWidth={2.5} />
      </Link>
    </div>
  )
}

function CreditCardIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
      <line x1="1" y1="10" x2="23" y2="10"></line>
    </svg>
  )
}
