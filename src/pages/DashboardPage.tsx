import { FinancialSummary } from '@/components/dashboard/FinancialSummary'
import { KPICards } from '@/components/dashboard/KPICards'
import { PendingPaymentsWidget, TopDebtorsWidget, ExpiringSoonWidget } from '@/components/dashboard/Widgets'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { useOrganizationStore } from '@/stores/organization.store'
import { useIsSuperAdmin } from '@/stores/auth.store'
import { PageHeader } from '@/components/design-system/PageHeader'
import { OrganizationSelectionEmptyState } from '@/components/organizations/OrganizationSelectionEmptyState'

export function DashboardPage() {
  const isSuperAdmin = useIsSuperAdmin()
  const organizationId = useOrganizationStore((state) => state.selectedOrganizationId)
  const alertsEnabled = !isSuperAdmin || !!organizationId

  if (isSuperAdmin && !organizationId) {
    return (
      <div className="flex flex-col gap-6 pb-20">
        <PageHeader
          title="Panel"
          description="Centro de operaciones del sistema"
        />
        <OrganizationSelectionEmptyState description="Elige una organización para consultar el panel general." />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      <PageHeader
        title="Panel"
        description="Revisa lo urgente y continúa con la gestión de tu organización."
      />

      <FinancialSummary organizationId={organizationId ?? undefined} enabled={alertsEnabled} />

      <section aria-labelledby="dashboard-priorities-title" className="space-y-4">
        <div>
          <h2 id="dashboard-priorities-title" className="text-lg font-semibold tracking-tight text-foreground">
            Requiere atención
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Atiende los cobros pendientes, prioriza a quienes tienen deuda y revisa los próximos vencimientos.
          </p>
        </div>

        <PendingPaymentsWidget organizationId={organizationId ?? undefined} enabled={alertsEnabled} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TopDebtorsWidget organizationId={organizationId ?? undefined} enabled={alertsEnabled} />
          <ExpiringSoonWidget organizationId={organizationId ?? undefined} enabled={alertsEnabled} />
        </div>
      </section>

      <section aria-labelledby="dashboard-quick-actions-title" className="space-y-3">
        <h2 id="dashboard-quick-actions-title" className="text-lg font-semibold tracking-tight text-foreground">
          Acciones rápidas
        </h2>
        <QuickActions />
      </section>

      <section aria-labelledby="dashboard-summary-title" className="space-y-3">
        <h2 id="dashboard-summary-title" className="text-lg font-semibold tracking-tight text-foreground">
          Resumen general
        </h2>
        <KPICards />
      </section>
    </div>
  )
}
