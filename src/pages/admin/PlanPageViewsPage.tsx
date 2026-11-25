import { useState } from 'react'
import { BarChart3, Eye, Globe2, MonitorSmartphone } from 'lucide-react'
import { ErrorState } from '@/components/design-system/ErrorState'
import { PageHeader } from '@/components/design-system/PageHeader'
import { Button } from '@/components/ui/button'
import { usePlanPageViews } from '@/hooks/usePageViews'

const PERIODS: { value: 7 | 30 | 90; label: string }[] = [
  { value: 7, label: '7 días' },
  { value: 30, label: '30 días' },
  { value: 90, label: '90 días' },
]

function dayLabel(date: string): string {
  const [, month, day] = date.split('-')
  return `${day}/${month}`
}

function Breakdown({
  title,
  items,
}: {
  title: string
  items: { label: string; visits: number }[]
}) {
  const max = Math.max(...items.map((item) => item.visits), 1)

  return (
    <section className="rounded-xl border border-border bg-surface p-4 text-surface-foreground">
      <h2 className="font-semibold">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Todavía no hay datos para este período.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {items.map((item) => (
            <li key={item.label}>
              <div className="mb-1 flex justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-muted-foreground">{item.label}</span>
                <span className="font-medium tabular-nums">{item.visits}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max((item.visits / max) * 100, 2)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function PlanPageViewsPage() {
  const [days, setDays] = useState<7 | 30 | 90>(30)
  const { data, isLoading, isError, refetch, isRefetching } = usePlanPageViews(days)
  const maxDailyVisits = Math.max(...(data?.daily.map((item) => item.visits) ?? []), 1)
  const average = data?.totalVisits ? (data.totalVisits / days).toFixed(1) : '0'
  const activeDays = data?.daily.filter((item) => item.visits > 0).length ?? 0

  return (
    <div className="space-y-5">
      <PageHeader
        title="Visitas a /planes"
        description="Sesiones únicas por día, fuentes de llegada y dispositivos. No se guardan IP ni MAC."
        actions={
          <div className="flex gap-2" aria-label="Período del informe">
            {PERIODS.map((period) => (
              <Button
                key={period.value}
                type="button"
                size="sm"
                variant={days === period.value ? 'secondary' : 'outline'}
                aria-pressed={days === period.value}
                onClick={() => setDays(period.value)}
              >
                {period.label}
              </Button>
            ))}
          </div>
        }
      />

      {isError ? (
        <ErrorState
          title="No se pudieron cargar las visitas"
          onRetry={() => void refetch()}
          isRetrying={isRefetching}
        />
      ) : isLoading ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-surface p-4 text-surface-foreground">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Eye className="h-4 w-4" />
                Sesiones en el período
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums">{data.totalVisits}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4 text-surface-foreground">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BarChart3 className="h-4 w-4" />
                Promedio diario
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums">{average}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4 text-surface-foreground">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MonitorSmartphone className="h-4 w-4" />
                Días con actividad
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums">{activeDays}</p>
            </div>
          </div>

          {data.truncated && (
            <p className="rounded-lg border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-warning">
              Se alcanzó el límite de registros de este informe. Reduce el período para ver cifras completas.
            </p>
          )}

          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
            <section className="rounded-xl border border-border bg-surface p-4 text-surface-foreground">
              <h2 className="font-semibold">Visitas por día</h2>
              <div className="mt-4 max-h-96 space-y-2 overflow-y-auto pr-1">
                {data.daily.slice().reverse().map((item) => (
                  <div key={item.date} className="grid grid-cols-[3.5rem_1fr_2.5rem] items-center gap-3 text-sm">
                    <span className="text-muted-foreground">{dayLabel(item.date)}</span>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                      {item.visits > 0 && (
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.max((item.visits / maxDailyVisits) * 100, 2)}%` }}
                        />
                      )}
                    </div>
                    <span className="text-right font-medium tabular-nums">{item.visits}</span>
                  </div>
                ))}
              </div>
            </section>
            <Breakdown title="Origen de las visitas" items={data.sources} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Breakdown title="Campañas" items={data.campaigns} />
            <Breakdown title="Dispositivos" items={data.devices} />
            <Breakdown title="Navegadores" items={data.browsers} />
          </div>

          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Globe2 className="mt-0.5 h-4 w-4 shrink-0" />
            Una sesión se cuenta una vez por día en este navegador. Los registros se eliminan automáticamente después de 90 días.
          </p>
        </>
      ) : null}
    </div>
  )
}
