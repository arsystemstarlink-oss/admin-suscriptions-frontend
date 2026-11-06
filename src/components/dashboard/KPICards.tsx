import { useDashboardSummary } from '@/hooks/useDashboard'
import { useOrganizationStore } from '@/stores/organization.store'
import { useIsSuperAdmin } from '@/stores/auth.store'
import { Users, Link2, Package } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { LucideIcon } from 'lucide-react'

export function KPICards() {
  const isSuperAdmin = useIsSuperAdmin()
  const organizationId = useOrganizationStore((state) => state.selectedOrganizationId)
  const { data, isLoading, error, isFetching, refetch } = useDashboardSummary(
    { organizationId: organizationId ?? undefined },
    { enabled: !isSuperAdmin || !!organizationId }
  )
  const navigate = useNavigate()

  if (!isSuperAdmin || !!organizationId) {
    if (isLoading) {
      return (
        <div className="grid grid-cols-3 gap-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-start gap-1.5 rounded-xl border border-border bg-surface p-2.5 text-surface-foreground sm:flex-row sm:items-center sm:gap-2"
            >
              <div className="h-8 w-8 shrink-0 rounded-lg bg-muted animate-pulse" />
              <div className="w-full min-w-0 flex-1 space-y-1.5">
                <div className="h-2.5 w-14 rounded bg-muted animate-pulse" />
                <div className="h-5 w-8 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )
    }

    if (error || !data) {
      return (
        <div role="alert" className="flex items-center justify-between gap-3 p-4 bg-destructive/10 text-destructive rounded-xl border border-destructive/20">
          <p className="font-semibold text-sm">No se pudieron cargar las métricas</p>
          <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? 'Reintentando...' : 'Reintentar'}
          </Button>
        </div>
      )
    }

    const cards: {
      title: string
      value: string | number
      icon: LucideIcon
      iconClass: string
      subtitle?: string
      href: string
    }[] = [
      {
        title: 'Clientes',
        value: data.clients.total,
        icon: Users,
        iconClass: 'text-primary-text bg-primary/10',
        href: '/subscriptions/clients',
      },
      {
        title: 'Suscripciones',
        value: data.subscriptions.total,
        icon: Link2,
        iconClass: 'text-success bg-success/10',
        subtitle: data.subscriptions.suspended > 0 ? `${data.subscriptions.suspended} suspendidas` : undefined,
        href: '/subscriptions',
      },
      {
        title: 'Planes',
        value: data.plans.active,
        icon: Package,
        iconClass: 'text-info bg-info/10',
        subtitle: `${data.plans.total} totales`,
        href: '/subscriptions/plans',
      },
    ]

    return (
      <div className="grid grid-cols-3 gap-2">
        {cards.map((card) => (
          <button
            key={card.title}
            type="button"
            onClick={() => navigate(card.href)}
            className="flex flex-col items-start gap-1.5 rounded-xl border border-border bg-surface p-2.5 text-left sm:flex-row sm:items-center sm:gap-2 text-surface-foreground shadow-sm transition-transform active:scale-95 touch-manipulation"
          >
            <div className={`p-1.5 rounded-lg shrink-0 ${card.iconClass}`}>
              <card.icon className="h-4 w-4" />
            </div>
            <div className="w-full min-w-0">
              <p className="text-xs font-semibold text-muted-foreground truncate leading-tight">
                {card.title}
              </p>
              <p className="text-lg font-bold text-foreground leading-tight">
                {card.value}
              </p>
              {card.subtitle && (
                <p className="text-xs font-medium text-muted-foreground truncate leading-tight">
                  {card.subtitle}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    )
  }

  return null
}
