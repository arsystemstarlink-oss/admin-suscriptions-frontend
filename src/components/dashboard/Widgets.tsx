import { useDashboardAlerts } from '@/hooks/useDashboard'
import { useUIStore } from '@/stores/ui.store'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { billingApi } from '@/api/billing.api'
import { qk } from '@/lib/query-keys'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/constants'
import { AlertTriangle, MessageSquare, DollarSign } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export function TopDebtorsWidget() {
  const { data, isLoading } = useDashboardAlerts()
  const { openQuickPay } = useUIStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handlePay = async (clientId: string) => {
    setLoadingId(clientId)
    try {
      const result = await queryClient.fetchQuery({
        queryKey: [...qk.billing.lists, { clientId, status: 'OVERDUE', limit: 1 }],
        queryFn: () => billingApi.list({ clientId, status: 'OVERDUE', limit: 1 }),
        staleTime: 0,
      })
      if (result.periods.length > 0) {
        const period = result.periods[0]
        openQuickPay({ period })
      } else {
        toast.info('No hay períodos vencidos para este cliente')
      }
    } catch {
      toast.error('Error al buscar períodos del cliente')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            <CardTitle className="text-lg">Top Deudores</CardTitle>
          </div>
          {data && (
            <Badge variant="destructive">
              {data.topDebtors.count}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : !data || data.topDebtors.items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No hay deudores registrados</p>
        ) : (
          <div className="space-y-3">
            {data.topDebtors.items.map((debtor) => (
              <div
                key={debtor.clientId}
                className="flex flex-col gap-3 p-3 bg-muted rounded-lg border border-border"
              >
                <div className="min-w-0">
                  <Button
                    variant="link"
                    onClick={() => navigate(`/config/clients/${debtor.clientId}`)}
                    className="h-auto p-0 font-medium text-foreground hover:text-primary text-left whitespace-normal"
                  >
                    {debtor.clientName}
                  </Button>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                    <span className="text-sm text-muted-foreground">{debtor.clientPhone}</span>
                    <Badge variant="destructive" className="text-xs">
                      {debtor.overdueCount} períodos
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end sm:gap-3">
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(debtor.totalDebt)}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => handlePay(debtor.clientId)}
                    disabled={loadingId === debtor.clientId}
                    aria-label="Cobrar"
                  >
                    <DollarSign className="h-4 w-4 shrink-0" />
                    <span className="hidden sm:inline">
                      {loadingId === debtor.clientId ? '...' : 'Cobrar'}
                    </span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function ExpiringSoonWidget() {
  const { data, isLoading } = useDashboardAlerts()
  const navigate = useNavigate()

  const handleOpenChat = (phone: string) => {
    navigate(`/chats?phone=${encodeURIComponent(phone)}`)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
            <CardTitle className="text-lg">Vencimientos Próximos</CardTitle>
          </div>
          {data && (
            <Badge variant="secondary">
              {data.expiringSoon.count}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : !data || data.expiringSoon.items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No hay vencimientos próximos</p>
        ) : (
          <div className="space-y-3">
            {data.expiringSoon.items.map((item) => (
              <div
                key={item.periodId}
                className="flex flex-col gap-3 p-3 bg-muted rounded-lg border border-border"
              >
                <div className="min-w-0">
                  <Button
                    variant="link"
                    onClick={() => navigate(`/subscriptions/${item.subscriptionId}`)}
                    className="h-auto p-0 font-medium text-foreground hover:text-primary text-left whitespace-normal"
                  >
                    {item.clientName}
                  </Button>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                    <span className="text-sm text-muted-foreground">Kit #{item.kitNumber}</span>
                    <span className="text-sm text-muted-foreground">{item.periodLabel}</span>
                    <span className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                      Vence: {formatDate(item.endDate)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end sm:gap-3">
                  <p className="text-lg font-bold text-foreground">
                    {formatCurrency(item.amount)}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => handleOpenChat(item.clientPhone)}
                    aria-label="Contactar"
                  >
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    <span className="hidden sm:inline">Contactar</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
