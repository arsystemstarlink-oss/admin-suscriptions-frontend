import { KPICards } from '@/components/dashboard/KPICards'
import { TopDebtorsWidget, ExpiringSoonWidget } from '@/components/dashboard/Widgets'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { useDashboardSummary } from '@/hooks/useDashboard'
import { formatCurrency } from '@/lib/constants'
import { TrendingDown, DollarSign, AlertCircle } from 'lucide-react'
import { PageHeader } from '@/components/design-system/PageHeader'

export function DashboardPage() {
  const { data: summary } = useDashboardSummary()

  return (
    <div className="flex flex-col gap-6 pb-20">
      <PageHeader
        title="Panel"
        description="Centro de operaciones del sistema"
      />

      <QuickActions />

      <KPICards />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpiringSoonWidget />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopDebtorsWidget />
        
        {/* Resumen Financiero Consistente (Swipeable en Móvil) */}
        {summary && (
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar touch-pan-x -mx-4 px-4 pb-2 md:mx-0 md:px-0 md:flex-col md:overflow-visible">
            
            <div className="min-w-[70vw] sm:min-w-[280px] snap-center shrink-0">
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 h-full">
                <h3 className="text-xs font-bold uppercase tracking-wide text-amber-600 dark:text-amber-500 flex items-center gap-1.5 mb-2">
                  <TrendingDown className="h-4 w-4" />
                  Pendientes
                </h3>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{summary.billingPeriods.pending}</p>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400/80 mt-1">
                  {formatCurrency(summary.financial.totalPending)} por cobrar
                </p>
              </div>
            </div>

            <div className="min-w-[70vw] sm:min-w-[280px] snap-center shrink-0">
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-2xl p-4 h-full">
                <h3 className="text-xs font-bold uppercase tracking-wide text-red-600 dark:text-red-500 flex items-center gap-1.5 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  Vencidos
                </h3>
                <p className="text-2xl font-bold text-red-900 dark:text-red-100">{summary.billingPeriods.overdue}</p>
                <p className="text-sm font-medium text-red-700 dark:text-red-400/80 mt-1">
                  {formatCurrency(summary.financial.totalOverdue)} en mora
                </p>
              </div>
            </div>

            <div className="min-w-[70vw] sm:min-w-[280px] snap-center shrink-0">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 h-full">
                <h3 className="text-xs font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-500 flex items-center gap-1.5 mb-2">
                  <DollarSign className="h-4 w-4" />
                  Ingresos Totales
                </h3>
                <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{formatCurrency(summary.financial.totalIncome)}</p>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400/80 mt-1">
                  {summary.billingPeriods.paid} períodos pagados
                </p>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
