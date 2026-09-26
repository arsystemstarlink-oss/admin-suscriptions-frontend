import { useDashboardSummary } from '@/hooks/useDashboard'
import { useOrganizationStore } from '@/stores/organization.store'
import { useIsSuperAdmin } from '@/stores/auth.store'
import { Users, Link2, Package } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'

export function KPICards() {
  const isSuperAdmin = useIsSuperAdmin()
  const organizationId = useOrganizationStore((state) => state.selectedOrganizationId)
  const { data, isLoading, error } = useDashboardSummary(
    { organizationId: organizationId ?? undefined },
    { enabled: !isSuperAdmin || !!organizationId }
  )
  const navigate = useNavigate()

  if (!isSuperAdmin || !!organizationId) {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-xl border border-primary-100 bg-white p-2.5 text-primary-900 dark:border-primary-800 dark:bg-primary-900/50 dark:text-primary-50"
            >
              <div className="h-8 w-8 shrink-0 rounded-lg bg-primary-100 animate-pulse dark:bg-primary-800" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="h-2.5 w-14 rounded bg-primary-100 animate-pulse dark:bg-primary-800" />
                <div className="h-5 w-8 rounded bg-primary-100 animate-pulse dark:bg-primary-800" />
              </div>
            </div>
          ))}
        </div>
      )
    }

    if (error || !data) {
      return (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900">
          <p className="font-semibold text-sm">No se pudieron cargar las métricas</p>
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
        iconClass: 'text-primary-800 bg-primary-100 dark:text-primary-100 dark:bg-primary-800',
        href: '/clients',
      },
      {
        title: 'Suscripciones',
        value: data.subscriptions.total,
        icon: Link2,
        iconClass: 'text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950',
        subtitle: data.subscriptions.suspended > 0 ? `${data.subscriptions.suspended} suspendidas` : undefined,
        href: '/subscriptions',
      },
      {
        title: 'Planes',
        value: data.plans.active,
        icon: Package,
        iconClass: 'text-primary-600 bg-primary-50 dark:text-primary-300 dark:bg-primary-900',
        subtitle: `${data.plans.total} totales`,
        href: '/plans',
      },
    ]

    return (
      <div className="grid grid-cols-3 gap-2">
        {cards.map((card) => (
          <button
            key={card.title}
            type="button"
            onClick={() => navigate(card.href)}
            className="flex items-center gap-2 rounded-xl border border-primary-100 bg-white p-2.5 text-left text-primary-900 shadow-sm transition-transform active:scale-95 touch-manipulation dark:border-primary-800 dark:bg-primary-900/50 dark:text-primary-50"
          >
            <div className={`p-1.5 rounded-lg shrink-0 ${card.iconClass}`}>
              <card.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-primary-600 dark:text-primary-400 truncate leading-tight">
                {card.title}
              </p>
              <p className="text-lg font-bold text-primary-900 dark:text-primary-50 leading-tight">
                {card.value}
              </p>
              {card.subtitle && (
                <p className="text-[10px] font-medium text-primary-500 dark:text-primary-400 truncate leading-tight">
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
