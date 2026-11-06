import { useEffect, useRef, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { Link2, Search, User } from 'lucide-react'
import { clientsApi } from '@/api/clients.api'
import { subscriptionsApi } from '@/api/subscriptions.api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ErrorState } from '@/components/design-system/ErrorState'
import { SUBSCRIPTION_STATUS_COLORS, SUBSCRIPTION_STATUS_LABELS } from '@/lib/constants'
import { qk } from '@/lib/query-keys'
import { getClientFullName } from '@/lib/utils'
import { useIsSuperAdmin } from '@/stores/auth.store'
import { useOrganizationStore } from '@/stores/organization.store'

const MIN_QUERY_LENGTH = 2
const RESULTS_PER_GROUP = 5
const RESULT_CLASS =
  'flex min-h-12 items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-hover active:bg-surface-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
const OVERDUE_CHIP_CLASS =
  'shrink-0 rounded-full border border-destructive/20 bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive'

function SearchPanel({ inputRef, onNavigate }: { inputRef: React.RefObject<HTMLInputElement | null>; onNavigate: () => void }) {
  const location = useLocation()
  const isSuperAdmin = useIsSuperAdmin()
  const organizationId = useOrganizationStore((state) => state.selectedOrganizationId) ?? undefined
  const [query, setQuery] = useState('')
  const [term, setTerm] = useState('')
  const canSearch = !isSuperAdmin || !!organizationId
  const enabled = canSearch && term.length >= MIN_QUERY_LENGTH

  useEffect(() => {
    const timeout = window.setTimeout(() => setTerm(query.trim()), 300)
    return () => window.clearTimeout(timeout)
  }, [query])

  const params = { search: term, organizationId, limit: RESULTS_PER_GROUP }
  const clientsQuery = useQuery({
    queryKey: [...qk.clients.lists, 'global-search', params],
    queryFn: () => clientsApi.list(params),
    enabled,
    placeholderData: keepPreviousData,
  })
  const subscriptionsQuery = useQuery({
    queryKey: [...qk.subscriptions.lists, 'global-search', params],
    queryFn: () => subscriptionsApi.list(params),
    enabled,
    placeholderData: keepPreviousData,
  })

  const clients = enabled ? (clientsQuery.data?.clients ?? []) : []
  const subscriptions = enabled ? (subscriptionsQuery.data?.subscriptions ?? []) : []
  const hasResults = clients.length > 0 || subscriptions.length > 0
  const isLoading = enabled && (clientsQuery.isLoading || subscriptionsQuery.isLoading)
  const isPartialError = enabled && (clientsQuery.isError || subscriptionsQuery.isError)
  const from = `${location.pathname}${location.search}`

  const retry = () => {
    if (clientsQuery.isError) void clientsQuery.refetch()
    if (subscriptionsQuery.isError) void subscriptionsQuery.refetch()
  }

  return (
    <>
      <div className="relative border-b border-border p-3 pr-11">
        <Search className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nombre, teléfono, cédula o kit"
          aria-label="Buscar clientes y suscripciones"
          disabled={!canSearch}
          className="h-11 pl-9"
        />
      </div>

      <div className="max-h-[60dvh] space-y-3 overflow-y-auto p-2" aria-live="polite">
        {!canSearch ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">Elige una organización para buscar.</p>
        ) : query.trim().length < MIN_QUERY_LENGTH ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">Escribe al menos {MIN_QUERY_LENGTH} caracteres.</p>
        ) : isLoading || term !== query.trim() && !hasResults ? (
          <div className="space-y-2" role="status" aria-label="Buscando">
            {[...Array(3)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />)}
          </div>
        ) : isPartialError && !hasResults ? (
          <ErrorState title="No se pudo completar la búsqueda" onRetry={retry} isRetrying={clientsQuery.isFetching || subscriptionsQuery.isFetching} />
        ) : !hasResults ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">Sin resultados para “{term}”.</p>
        ) : (
          <>
            {clients.length > 0 && (
              <section aria-label="Clientes">
                <h3 className="px-3 pb-1 text-xs font-semibold text-muted-foreground">Clientes</h3>
                <ul>
                  {clients.map((client) => (
                    <li key={client.id}>
                      <Link to={`/subscriptions/clients/${client.id}`} state={{ from }} onClick={onNavigate} className={RESULT_CLASS}>
                        <User className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-foreground">{getClientFullName(client)}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {client.phone}{client.dni ? ` · C.I. ${client.dni}` : ''}
                          </span>
                        </span>
                        {client.hasDebt && <span className={OVERDUE_CHIP_CLASS}>Vencidos</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {subscriptions.length > 0 && (
              <section aria-label="Suscripciones">
                <h3 className="px-3 pb-1 text-xs font-semibold text-muted-foreground">Suscripciones</h3>
                <ul>
                  {subscriptions.map((subscription) => (
                    <li key={subscription.id}>
                      <Link to={`/subscriptions/${subscription.id}`} state={{ from }} onClick={onNavigate} className={RESULT_CLASS}>
                        <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-foreground">
                            {subscription.accountNumber || subscription.kitNumber}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {getClientFullName(subscription.client)} · {subscription.plan.name}
                          </span>
                        </span>
                        {subscription.hasDebt ? (
                          <span className={OVERDUE_CHIP_CLASS}>Vencidos</span>
                        ) : (
                          <Badge className={`shrink-0 ${SUBSCRIPTION_STATUS_COLORS[subscription.status]}`}>
                            {SUBSCRIPTION_STATUS_LABELS[subscription.status]}
                          </Badge>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {isPartialError && (
              <p role="alert" className="px-3 pb-1 text-xs font-medium text-destructive">
                Algunos resultados no se pudieron cargar.
              </p>
            )}
          </>
        )}
      </div>
    </>
  )
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="h-9 w-9 shrink-0 text-header-foreground hover:bg-header-hover hover:text-header-foreground sm:h-8 sm:w-8"
        aria-label="Buscar clientes y suscripciones"
        title="Buscar (Ctrl+K)"
      >
        <Search className="h-4 w-4 shrink-0" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="top-[8dvh] max-w-xl translate-y-0 gap-0 overflow-hidden rounded-xl p-0 sm:p-0"
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            inputRef.current?.focus()
          }}
        >
          <DialogTitle className="sr-only">Búsqueda global</DialogTitle>
          <DialogDescription className="sr-only">Busca clientes y suscripciones de la organización activa.</DialogDescription>
          <SearchPanel inputRef={inputRef} onNavigate={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}
