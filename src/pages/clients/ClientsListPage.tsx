import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useClients } from '@/hooks/useClients'
import { Users, Phone, Plus } from 'lucide-react'
import { ListPageLayout, ListCard } from '@/components/design-system'
import { FilterPill } from '@/components/design-system/FilterPill'
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

  const navigate = useNavigate()

  const handleFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    setSearchParams(params)
  }

  const isEmpty = !data || data.clients.length === 0

  return (
    <ListPageLayout
      searchProps={{
        value: search,
        onChange: handleSearch,
        placeholder: "Buscar cliente...",
      }}
      filters={
        <>
          <FilterPill active={false} onClick={() => navigate('/clients/new')}>
            <Plus className="h-3.5 w-3.5 mr-1.5 shrink-0" />
            Nuevo Cliente
          </FilterPill>
          <FilterPill active={subscriptionStatus === 'ACTIVE'} onClick={() => handleFilter('subscriptionStatus', subscriptionStatus === 'ACTIVE' ? null : 'ACTIVE')}>
            Activos
          </FilterPill>
          <FilterPill active={subscriptionStatus === 'SUSPENDED'} onClick={() => handleFilter('subscriptionStatus', subscriptionStatus === 'SUSPENDED' ? null : 'SUSPENDED')}>
            Suspendidos
          </FilterPill>
          <FilterPill active={hasOverdue === true} variant="destructive" onClick={() => handleFilter('hasOverdue', hasOverdue === true ? null : 'true')}>
            Con Deuda
          </FilterPill>
        </>
      }
      isLoading={isLoading}
      isEmpty={isEmpty}
      emptyIcon={<Users className="h-16 w-16 text-primary-200 dark:text-primary-800" />}
      emptyTitle="Sin clientes"
      emptyDescription="No encontramos resultados. Modifica los filtros o añade uno nuevo."
    >
      {data?.clients.map((client) => {
        const initial = client.firstName ? client.firstName.charAt(0).toUpperCase() : '?'
        
        return (
          <ListCard
            key={client.id}
            onClick={() => {}}
          >
            <div className="flex items-start gap-3 sm:items-center sm:gap-4 min-w-0">
              <div className="relative shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-secondary-100 text-secondary-700 font-bold text-lg dark:bg-secondary-900/30 dark:text-secondary-400">
                  {initial}
                </div>
                <div className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-primary-900 ${
                  client.subscriptionStatus === 'ACTIVE' ? 'bg-emerald-500' : 
                  client.subscriptionStatus === 'SUSPENDED' ? 'bg-red-500' : 'bg-primary-400'
                }`} />
              </div>

              <div className="flex-1 min-w-0">
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
            </div>
          </ListCard>
        )
      })}
    </ListPageLayout>
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
