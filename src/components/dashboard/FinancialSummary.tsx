import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle, ChevronRight, Clock, type LucideIcon } from 'lucide-react'
import { useDashboardSummary } from '@/hooks/useDashboard'
import { useDolarRates } from '@/hooks/useExchange'
import { useExchangeStore } from '@/stores/exchange.store'
import { getRateForSource } from '@/lib/exchange'
import { formatCurrency } from '@/lib/constants'
import { BsReference } from '@/components/exchange/BsReference'
import { ErrorState } from '@/components/design-system/ErrorState'

const TILE_CLASS =
  'flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-3 text-surface-foreground shadow-sm sm:flex-col sm:items-start sm:p-4'

const updatedAtFormat = new Intl.DateTimeFormat('es-VE', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
})

interface FinancialTileProps {
  label: string
  amount: number
  icon: LucideIcon
  iconClass: string
  rate: number | null
  href?: string
}

function FinancialTile({ label, amount, icon: Icon, iconClass, rate, href }: FinancialTileProps) {
  const content: ReactNode = (
    <>
      <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} aria-hidden="true" />
        {label}
        {href && <ChevronRight className="hidden h-4 w-4 shrink-0 text-subtle-foreground sm:block" aria-hidden="true" />}
      </span>
      <span className="flex shrink-0 flex-col items-end sm:items-start">
        <span className="text-lg font-semibold leading-tight text-foreground sm:text-2xl">
          {formatCurrency(amount)}
        </span>
        <BsReference usdAmount={amount} rate={rate} />
      </span>
    </>
  )

  if (!href) return <div className={TILE_CLASS}>{content}</div>

  return (
    <Link
      to={href}
      className={`${TILE_CLASS} transition-colors hover:bg-surface-hover active:bg-surface-active touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
    >
      {content}
    </Link>
  )
}

interface FinancialSummaryProps {
  organizationId?: string
  enabled: boolean
}

export function FinancialSummary({ organizationId, enabled }: FinancialSummaryProps) {
  const { data, isLoading, isError, isFetching, refetch } = useDashboardSummary({ organizationId }, { enabled })
  const exchangeSource = useExchangeStore((s) => s.source)
  const { data: exchangeRates } = useDolarRates()
  const activeRate = getRateForSource(exchangeRates, exchangeSource)

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3" role="status" aria-label="Cargando resumen de cobros">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted sm:h-28" />
        ))}
      </div>
    )
  }

  if (isError && !data) {
    return <ErrorState title="No se pudo cargar el resumen de cobros" onRetry={() => void refetch()} isRetrying={isFetching} />
  }

  if (!data) return null

  return (
    <section aria-label="Resumen de cobros" className="space-y-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
        <FinancialTile
          label="Cobrado este mes"
          amount={data.financial.monthlyIncome}
          icon={CheckCircle}
          iconClass="text-success"
          rate={activeRate}
        />
        <FinancialTile
          label="Por cobrar"
          amount={data.financial.totalPending}
          icon={Clock}
          iconClass="text-info"
          rate={activeRate}
          href="/subscriptions?pending=true"
        />
        <FinancialTile
          label="Vencido"
          amount={data.financial.totalOverdue}
          icon={AlertTriangle}
          iconClass="text-destructive"
          rate={activeRate}
          href="/subscriptions?hasOverdue=true"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Actualizado: {updatedAtFormat.format(new Date(data.generatedAt))}
      </p>
    </section>
  )
}
