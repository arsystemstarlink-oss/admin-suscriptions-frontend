import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { clientsApi } from '@/api/clients.api'
import { subscriptionsApi } from '@/api/subscriptions.api'
import { useUIStore } from '@/stores/ui.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Search, DollarSign, User } from 'lucide-react'
import { formatCurrency, SUBSCRIPTION_STATUS_COLORS, SUBSCRIPTION_STATUS_LABELS, CLIENT_SUBSCRIPTION_STATUS_COLORS, CLIENT_SUBSCRIPTION_STATUS_LABELS } from '@/lib/constants'
import { getClientFullName } from '@/lib/utils'
import type { ClientWithStats, SubscriptionWithDetails } from '@/types/api'

export function OmniSearch() {
  const { omniSearchOpen, openOmniSearch, closeOmniSearch, openQuickPay } = useUIStore()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        openOmniSearch()
      }
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault()
        openOmniSearch()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openOmniSearch])

  useEffect(() => {
    if (omniSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery('')
    }
  }, [omniSearchOpen])

  const trimmed = query.trim()

  const { data: clientsData } = useQuery({
    queryKey: ['omni-clients', trimmed],
    queryFn: () => clientsApi.list({ search: trimmed, limit: 5 }),
    enabled: trimmed.length >= 2,
  })

  const { data: subsData } = useQuery({
    queryKey: ['omni-subs', trimmed],
    queryFn: () => subscriptionsApi.list({ search: trimmed, limit: 5 }),
    enabled: trimmed.length >= 2,
  })

  const clients = clientsData?.clients || []
  const subscriptions = subsData?.subscriptions || []
  const hasResults = clients.length > 0 || subscriptions.length > 0

  const handleOpenQuickPay = (sub: SubscriptionWithDetails) => {
    if (sub.currentPeriod && sub.currentPeriod.status !== 'PAID') {
      openQuickPay({
        period: {
          ...sub.currentPeriod,
          subscription: { id: sub.id, kitNumber: sub.kitNumber, status: sub.status },
          client: sub.client,
          plan: sub.plan,
        },
      })
      closeOmniSearch()
    }
  }

  return (
    <Dialog open={omniSearchOpen} onOpenChange={(open) => !open && closeOmniSearch()}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">Búsqueda rápida</DialogTitle>
        <div className="flex items-center border-b px-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cliente, kit, teléfono..."
            className="h-12 border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-auto p-2">
          {trimmed.length < 2 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Escribe al menos 2 caracteres para buscar
            </p>
          ) : !hasResults ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin resultados</p>
          ) : (
            <div className="space-y-1">
              {clients.map((client: ClientWithStats) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-3 rounded-md hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{getClientFullName(client)}</p>
                      <p className="text-xs text-muted-foreground">{client.phone} • {client.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {client.hasDebt && <Badge variant="destructive" className="text-xs">Deuda</Badge>}
                    <Badge className={`text-xs ${CLIENT_SUBSCRIPTION_STATUS_COLORS[client.subscriptionStatus] || CLIENT_SUBSCRIPTION_STATUS_COLORS.NONE}`}>
                      {CLIENT_SUBSCRIPTION_STATUS_LABELS[client.subscriptionStatus] || client.subscriptionStatus}
                    </Badge>
                  </div>
                </div>
              ))}

              {subscriptions.map((sub: SubscriptionWithDetails) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-3 rounded-md hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">Kit #{sub.kitNumber}</p>
                        <Badge className={`text-xs ${SUBSCRIPTION_STATUS_COLORS[sub.status]}`}>
                          {SUBSCRIPTION_STATUS_LABELS[sub.status]}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {getClientFullName(sub.client)} • {sub.plan.name} • {formatCurrency(sub.plan.price)}/mes
                      </p>
                    </div>
                  </div>
                  {sub.hasDebt && sub.currentPeriod && sub.currentPeriod.status !== 'PAID' && (
                    <Button size="sm" className="gap-1" onClick={() => handleOpenQuickPay(sub)}>
                      <DollarSign className="h-3 w-3 shrink-0" />
                      Cobrar
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
