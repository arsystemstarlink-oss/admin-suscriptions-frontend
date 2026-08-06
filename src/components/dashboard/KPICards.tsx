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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Cargando...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-red-600 dark:text-red-400">No se pudieron cargar los datos</p>
            </CardContent>
          </Card>
        ))}
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
      iconClass: 'text-primary-800 dark:text-primary-200',
      subtitle: undefined,
      href: '/config/clients',
    },
    {
      title: 'Suscripciones',
      value: data.subscriptions.active,
      icon: Link2,
      iconClass: 'text-emerald-600 dark:text-emerald-400',
      subtitle: data.subscriptions.suspended > 0 ? `${data.subscriptions.suspended} suspendidas` : undefined,
      href: '/subscriptions',
    },
    {
      title: 'Ingresos del Mes',
      value: formatCurrency(data.financial.monthlyIncome),
      icon: DollarSign,
      iconClass: 'text-emerald-600 dark:text-emerald-400',
      subtitle: `${data.billingPeriods.paid} períodos pagados`,
      href: '/billing?status=PAID',
    },
    {
      title: 'Deuda Total',
      value: formatCurrency(data.financial.totalDebt),
      icon: AlertTriangle,
      iconClass: 'text-secondary-700 dark:text-secondary-400',
      subtitle: `${formatCurrency(data.financial.totalOverdue)} vencida`,
      href: '/billing?status=OVERDUE',
    },
    {
      title: 'Planes Activos',
      value: data.plans.active,
      icon: Package,
      iconClass: 'text-primary-600 dark:text-primary-300',
      subtitle: `${data.plans.total} totales`,
      href: '/config/plans',
    },
    {
      title: 'Períodos Vencidos',
      value: data.billingPeriods.overdue,
      icon: AlertCircle,
      iconClass: 'text-red-600 dark:text-red-400',
      subtitle: data.billingPeriods.overdue > 0 ? formatCurrency(data.financial.totalOverdue) : 'Sin deuda',
      href: '/billing?status=OVERDUE',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card) => (
        <Card
          key={card.title}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate(card.href)}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
            <card.icon className={`h-5 w-5 shrink-0 ${card.iconClass}`} />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
            {card.subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
