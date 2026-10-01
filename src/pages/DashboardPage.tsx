import { KPICards } from '@/components/dashboard/KPICards'
import { PendingPaymentsWidget, TopDebtorsWidget, ExpiringSoonWidget } from '@/components/dashboard/Widgets'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { useDashboardAlerts } from '@/hooks/useDashboard'
import { useOrganizationStore } from '@/stores/organization.store'
import { useIsSuperAdmin } from '@/stores/auth.store'
import { PageHeader } from '@/components/design-system/PageHeader'

export function DashboardPage() {
  const isSuperAdmin = useIsSuperAdmin()
  const organizationId = useOrganizationStore((state) => state.selectedOrganizationId)
  useDashboardAlerts(
    { organizationId: organizationId ?? undefined },
    { enabled: !isSuperAdmin || !!organizationId }
  )

  if (isSuperAdmin && !organizationId) {
    return (
      <div className="flex flex-col gap-6 pb-20">
        <PageHeader
          title="Panel"
          description="Centro de operaciones del sistema"
        />
        <div className="p-4 text-sm text-warning bg-warning/10 border border-warning/20 rounded-2xl flex items-start gap-3">
          <span className="shrink-0 mt-0.5">⚠️</span>
          <span>Selecciona una organización para ver el panel general.</span>
        </div>
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

      <PendingPaymentsWidget />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpiringSoonWidget />
        <TopDebtorsWidget />
      </div>
    </div>
  )
}
