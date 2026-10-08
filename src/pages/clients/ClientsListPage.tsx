import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useClients } from '@/hooks/useClients'
import { useOrganizationStore } from '@/stores/organization.store'
import { useIsSuperAdmin } from '@/stores/auth.store'
import { Users, Phone, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ListPageLayout, ListCard } from '@/components/design-system'
import { FilterPill } from '@/components/design-system/FilterPill'
import { getClientFullName, getInitial } from '@/lib/utils'

export function ClientsListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('search') || '')
  const navigate = useNavigate()
  const location = useLocation()
  const isSuperAdmin = useIsSuperAdmin()
  const organizationId = useOrganizationStore((state) => state.selectedOrganizationId)

  const subscriptionStatus = searchParams.get('subscriptionStatus') as 'ACTIVE' | 'SUSPENDED' | 'MIXED' | 'NONE' | null
  const hasOverdue = searchParams.get('hasOverdue') === 'true' ? true : searchParams.get('hasOverdue') === 'false' ? false : undefined

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timeout)
  }, [search])

  const { data, isLoading } = useClients({
    search: debouncedSearch || undefined,
    subscriptionStatus: subscriptionStatus || undefined,
    hasOverdue,
    organizationId: organizationId || undefined,
  }, { enabled: !isSuperAdmin || !!organizationId })
  const clients = useMemo(
    () => [...(data?.clients || [])].sort((a, b) =>
      getClientFullName(a).localeCompare(getClientFullName(b), 'es', { sensitivity: 'base' }),
    ),
    [data?.clients],
  )

  const handleSearch = (value: string) => {
    setSearch(value)
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set('search', value)
    } else {
      params.delete('search')
    }
    setSearchParams(params, { replace: true })
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

  const handleShowAll = () => {
    const params = new URLSearchParams(searchParams)
    params.delete('subscriptionStatus')
    params.delete('hasOverdue')
    setSearchParams(params)
  }

  const isEmpty = !data || clients.length === 0
  const showEmpty = isSuperAdmin && !organizationId

  return (
    <ListPageLayout
      searchProps={{
        value: search,
        onChange: handleSearch,
        placeholder: "Buscar cliente...",
      }}
      filters={!showEmpty ? (
        <>
          <FilterPill
            active={!subscriptionStatus && hasOverdue === undefined}
            onClick={handleShowAll}
          >
            Todos
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
      ) : undefined}
      primaryAction={!showEmpty ? (
        <Button
          onClick={() => navigate('/subscriptions/clients/new')}
          className="h-10 w-10 rounded-full! p-0 sm:h-10 sm:w-auto sm:rounded-md sm:px-4 sm:py-2"
          aria-label="Nuevo cliente"
          title="Nuevo cliente"
        >
          <Plus className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 sm:mr-1.5" />
          <span className="hidden sm:inline">Nuevo</span>
        </Button>
      ) : undefined}
      isLoading={isLoading && !showEmpty}
      isEmpty={showEmpty || isEmpty}
      emptyIcon={<Users className="h-16 w-16 text-subtle-foreground" />}
      emptyTitle={showEmpty ? 'Selecciona una organización' : 'Sin clientes'}
      emptyDescription={showEmpty ? 'Elige una organización en la barra superior para ver los clientes.' : 'No encontramos resultados. Modifica los filtros o añade uno nuevo.'}
      emptyAction={!showEmpty && isEmpty ? (
        <Button onClick={() => navigate('/subscriptions/clients/new')}>
          <Plus className="h-4 w-4 mr-2 shrink-0" />
          Crear Cliente
        </Button>
      ) : undefined}
    >
      {!showEmpty && clients.map((client) => {
        const initial = getInitial(client.firstName)
        
        return (
          <ListCard
            key={client.id}
            onClick={() => navigate(`/subscriptions/clients/${client.id}`, { state: { from: `${location.pathname}${location.search}` } })}
          >
            <div className="flex items-start gap-3 sm:items-center sm:gap-4 min-w-0">
              <div className="relative shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-surface-muted text-surface-muted-foreground font-bold text-lg">
                  {initial}
                </div>
                <div className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-surface ${
                  client.subscriptionStatus === 'ACTIVE' ? 'bg-success' :
                  client.subscriptionStatus === 'SUSPENDED' ? 'bg-destructive' : 'bg-muted-foreground'
                }`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-semibold text-base truncate pr-2">
                    {getClientFullName(client)}
                  </h3>
                  {client.hasDebt && (
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase text-destructive bg-destructive/10">
                      Deuda
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                  {client.phone && (
                    <span className="flex items-center gap-1 truncate">
                      <Phone size={14} />
                      {client.phone}
                    </span>
                  )}
                  {client.dni && (
                    <span className="flex items-center gap-1 shrink-0">
                      <CreditCardIcon size={14} />
                      C.I. {client.dni}
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