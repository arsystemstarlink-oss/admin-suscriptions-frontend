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
        description="Centro de operaciones del sistema"
      />

      <QuickActions />

      <KPICards />

      <PendingPaymentsWidget organizationId={organizationId ?? undefined} enabled={alertsEnabled} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpiringSoonWidget organizationId={organizationId ?? undefined} enabled={alertsEnabled} />
        <TopDebtorsWidget organizationId={organizationId ?? undefined} enabled={alertsEnabled} />
      </div>
    </div>
  )
}
