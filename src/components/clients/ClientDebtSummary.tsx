import { AlertTriangle, CheckCircle, Clock, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BsReference } from '@/components/exchange/BsReference'
import { useBillingPeriods } from '@/hooks/useBilling'
import { useDolarRates } from '@/hooks/useExchange'
import { getRateForSource } from '@/lib/exchange'
import { formatCurrency } from '@/lib/constants'
import { useExchangeStore } from '@/stores/exchange.store'
import { useUIStore } from '@/stores/ui.store'

interface ClientDebtSummaryProps {
  clientId: string
  organizationId?: string
  enabled: boolean
}

/** Suma los montos reales de cada período: pueden diferir del precio actual del plan. */
export function ClientDebtSummary({ clientId, organizationId, enabled }: ClientDebtSummaryProps) {
  const openQuickPay = useUIStore((state) => state.openQuickPay)
  const exchangeSource = useExchangeStore((s) => s.source)
  const { data: exchangeRates } = useDolarRates()
  const activeRate = getRateForSource(exchangeRates, exchangeSource)
  // Sin filtro de estado: el índice de Firestore cubre organización + cliente, no + estado.
  const { data, isLoading, isError, isFetching, refetch } = useBillingPeriods(
    { clientId, organizationId, limit: 200 },
    { enabled },
  )

  if (isLoading) {
    return <div role="status" aria-label="Cargando deuda del cliente" className="mt-3 h-20 animate-pulse rounded-xl bg-muted sm:mt-5" />
  }

  if (isError || !data) {
    return (
      <div role="alert" className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm font-medium text-destructive sm:mt-5">
        No se pudo calcular la deuda
        <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => void refetch()} disabled={isFetching}>
          Reintentar
        </Button>
      </div>
    )
  }

  const unpaidPeriods = data.periods
    .filter((period) => period.status === 'OVERDUE' || period.status === 'PENDING')
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())

  if (unpaidPeriods.length === 0) {
    return (
      <p className="mt-3 flex items-center gap-2 rounded-xl border border-success/20 bg-success/10 p-3 text-sm font-medium text-success sm:mt-5">
        <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
        Al día: sin períodos por cobrar
      </p>
    )
  }

  const sumAmounts = (status: 'OVERDUE' | 'PENDING') =>
    unpaidPeriods.filter((period) => period.status === status).reduce((sum, period) => sum + period.amount, 0)
  const amountPrefix = data.pagination.hasMore ? 'Más de ' : ''
  const overdueAmount = sumAmounts('OVERDUE')
  const pendingAmount = sumAmounts('PENDING')
  const oldestUnpaidPeriod = unpaidPeriods.find((period) => period.subscription != null)

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-border-subtle bg-surface-muted p-3 sm:mt-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" aria-hidden="true" />
            Vencido
          </p>
          <p className="mt-0.5 text-lg font-semibold leading-tight text-foreground">{amountPrefix}{formatCurrency(overdueAmount)}</p>
          <BsReference usdAmount={overdueAmount} rate={activeRate} />
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0 text-info" aria-hidden="true" />
            Por cobrar
          </p>
          <p className="mt-0.5 text-lg font-semibold leading-tight text-foreground">{amountPrefix}{formatCurrency(pendingAmount)}</p>
          <BsReference usdAmount={pendingAmount} rate={activeRate} />
        </div>
      </div>
      {oldestUnpaidPeriod && (
        <Button type="button" className="h-11 w-full font-semibold" onClick={() => openQuickPay({ period: oldestUnpaidPeriod })}>
          <DollarSign className="h-4 w-4 shrink-0" />
          Cobrar {oldestUnpaidPeriod.periodLabel}
        </Button>
      )}
    </div>
  )
}
