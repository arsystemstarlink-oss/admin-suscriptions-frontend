import { useDashboardSummary } from '@/hooks/useDashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Link2, DollarSign, AlertTriangle, Package, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/constants'
import { useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'

export function KPICards() {
  const { data, isLoading, error } = useDashboardSummary()
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory no-scrollbar touch-pan-x -mx-4 px-4 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 md:mx-0 md:px-0">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="min-w-[150px] w-[42vw] md:w-auto snap-center">
            <Card className="h-full bg-white dark:bg-primary-900/50 border-primary-100 dark:border-primary-800">
              <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-3 px-3 space-y-0">
                <div className="h-7 w-7 bg-primary-100 dark:bg-primary-800 rounded-lg animate-pulse" />
                <div className="h-3 w-20 bg-primary-100 dark:bg-primary-800 rounded animate-pulse" />
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="h-6 w-14 bg-primary-100 dark:bg-primary-800 rounded animate-pulse mb-2" />
                <div className="h-3 w-24 bg-primary-50 dark:bg-primary-800/50 rounded animate-pulse" />
              </CardContent>
            </Card>
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
      title: 'Total Clientes',
      value: data.clients.total,
      icon: Users,
      iconClass: 'text-primary-800 bg-primary-100 dark:text-primary-100 dark:bg-primary-800',
      subtitle: undefined,
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
      title: 'Ingresos Mes',
      value: formatCurrency(data.financial.monthlyIncome),
      icon: DollarSign,
      iconClass: 'text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950',
      subtitle: `${data.billingPeriods.paid} pagados`,
      href: '/subscriptions',
    },
    {
      title: 'Deuda Total',
      value: formatCurrency(data.financial.totalDebt),
      icon: AlertTriangle,
      iconClass: 'text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-950',
      subtitle: `${formatCurrency(data.financial.totalOverdue)} vencida`,
      href: '/subscriptions?hasOverdue=true',
    },
    {
      title: 'Períodos Vencidos',
      value: data.billingPeriods.overdue,
      icon: AlertCircle,
      iconClass: 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-950',
      subtitle: data.billingPeriods.overdue > 0 ? formatCurrency(data.financial.totalOverdue) : 'Sin deuda',
      href: '/subscriptions?hasOverdue=true',
    },
    {
      title: 'Planes Activos',
      value: data.plans.active,
      icon: Package,
      iconClass: 'text-primary-600 bg-primary-50 dark:text-primary-300 dark:bg-primary-900',
      subtitle: `${data.plans.total} totales`,
      href: '/plans',
    },
  ]

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory no-scrollbar touch-pan-x -mx-4 px-4 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 md:mx-0 md:px-0">
      {cards.map((card) => (
        <div key={card.title} className="min-w-[150px] w-[42vw] md:w-auto snap-center shrink-0">
          <Card
            className="h-full cursor-pointer active:scale-95 transition-transform touch-manipulation border-primary-100 bg-white shadow-sm dark:bg-primary-900/50 dark:border-primary-800 flex flex-col justify-center"
            onClick={() => navigate(card.href)}
          >
            <CardHeader className="flex flex-row items-center gap-2 pb-1 pt-3 px-3 space-y-0">
              <div className={`p-1.5 rounded-lg shrink-0 ${card.iconClass}`}>
                <card.icon className="h-4 w-4" />
              </div>
              <CardTitle className="text-xs font-semibold text-primary-600 dark:text-primary-400 truncate leading-tight">{card.title}</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <p className="text-xl font-bold text-primary-900 dark:text-primary-50 leading-none">{card.value}</p>
              <p className="text-[11px] font-medium text-primary-500 dark:text-primary-400 mt-1.5 h-3.5 truncate">
                {card.subtitle || ''}
              </p>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  )
}
