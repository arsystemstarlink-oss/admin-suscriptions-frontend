import { useIsSuperAdmin } from '@/stores/auth.store'
import { useOrganizationStore } from '@/stores/organization.store'
import { usePendingReportsCount } from '@/hooks/usePaymentReports'
import { useAllOrganizationPlanPaymentReports } from '@/hooks/useOrganizationPlanPaymentReports'

/** Pendientes de la sección Cobros: reportes de clientes y, para super-admin, pagos de planes. */
export function usePendingCollectionsCount() {
  const isSuperAdmin = useIsSuperAdmin()
  const organizationId = useOrganizationStore((s) => s.selectedOrganizationId)
  const { data: pendingReports } = usePendingReportsCount(
    { organizationId: organizationId ?? undefined },
    { enabled: !isSuperAdmin || !!organizationId },
  )
  const { data: pendingPlanReports } = useAllOrganizationPlanPaymentReports('PENDING', isSuperAdmin)

  const clientReports = pendingReports?.pending ?? 0
  const planReports = isSuperAdmin ? (pendingPlanReports?.reports.length ?? 0) : 0

  return { clientReports, planReports, total: clientReports + planReports }
}
