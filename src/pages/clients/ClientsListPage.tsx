import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useClients } from '@/hooks/useClients'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Plus, Search, Users } from 'lucide-react'
import { CLIENT_SUBSCRIPTION_STATUS_LABELS, CLIENT_SUBSCRIPTION_STATUS_COLORS } from '@/lib/constants'

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

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Clientes</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">Gestión de clientes del sistema</p>
        </div>
        <Button asChild className="w-full md:w-auto">
          <Link to="/config/clients/new">
            <Plus className="h-4 w-4 md:mr-2 shrink-0" />
            <span className="hidden md:inline">Nuevo Cliente</span>
            <span className="md:hidden">Nuevo</span>
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1 w-full md:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                placeholder="Buscar por nombre, email o teléfono..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <Button
                variant={subscriptionStatus === 'ACTIVE' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilter('subscriptionStatus', subscriptionStatus === 'ACTIVE' ? null : 'ACTIVE')}
                className="whitespace-nowrap"
              >
                Activos
              </Button>
              <Button
                variant={subscriptionStatus === 'SUSPENDED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilter('subscriptionStatus', subscriptionStatus === 'SUSPENDED' ? null : 'SUSPENDED')}
                className="whitespace-nowrap"
              >
                Suspendidos
              </Button>
              <Button
                variant={hasOverdue === true ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilter('hasOverdue', hasOverdue === true ? null : 'true')}
                className="whitespace-nowrap"
              >
                Con Deuda
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : !data || data.clients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 shrink-0" />
              <p className="text-muted-foreground">No se encontraron clientes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.clients.map((client) => (
                <Link
                  key={client.id}
                  to={`/config/clients/${client.id}`}
                  className="block p-4 bg-muted rounded-lg border border-border hover:bg-accent transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground truncate">{client.name}</p>
                        <Badge className={CLIENT_SUBSCRIPTION_STATUS_COLORS[client.subscriptionStatus]}>
                          {CLIENT_SUBSCRIPTION_STATUS_LABELS[client.subscriptionStatus]}
                        </Badge>
                        {client.hasDebt && (
                          <Badge variant="destructive">Con deuda</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
                        <span className="truncate">{client.email}</span>
                        <span>{client.phone}</span>
                        <span>{client.totalSubscriptions} suscripciones</span>
                        {client.overdueCount > 0 && (
                          <span className="rounded-md px-1.5 py-0.5 text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/50">{client.overdueCount} períodos vencidos</span>
                        )}
                      </div>
                    </div>
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
