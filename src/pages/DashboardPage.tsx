import { KPICards } from '@/components/dashboard/KPICards'
import { TopDebtorsWidget, ExpiringSoonWidget } from '@/components/dashboard/Widgets'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { useDashboardSummary } from '@/hooks/useDashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/constants'
import { TrendingDown, DollarSign, AlertCircle } from 'lucide-react'

export function DashboardPage() {
  const { data: summary } = useDashboardSummary()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Panel</h1>
        <p className="text-muted-foreground mt-1">Centro de operaciones del sistema</p>
      </div>

      <QuickActions />

      <KPICards />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpiringSoonWidget />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopDebtorsWidget />
        
        {summary && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-orange-600 dark:text-orange-500 shrink-0" />
                  Períodos Pendientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{summary.billingPeriods.pending}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatCurrency(summary.financial.totalPending)} por cobrar
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-500 shrink-0" />
                  Períodos Vencidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{summary.billingPeriods.overdue}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatCurrency(summary.financial.totalOverdue)} vencidos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600 dark:text-green-500 shrink-0" />
                  Ingresos Totales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(summary.financial.totalIncome)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {summary.billingPeriods.paid} períodos pagados
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
