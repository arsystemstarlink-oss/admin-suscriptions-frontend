import { AlertTriangle } from 'lucide-react'
import { PlanUpgradeButton } from '@/components/plans/PlanUpgradeButton'
import { useAuthStore } from '@/stores/auth.store'
import { getOrganizationPlanAccess } from '@/lib/business-plan'

export function PlanStatusBanner() {
  const user = useAuthStore((state) => state.user)
  const organization = user?.role === 'admin' ? user.organization : undefined
  const { isReadOnly } = getOrganizationPlanAccess(organization)

  if (!organization || !isReadOnly) return null

  const isSuspended = organization.planStatus === 'suspendido'

  return (
    <section
      role="alert"
      className="mb-4 flex flex-col gap-3 rounded-xl border border-warning/20 bg-warning/10 p-4 text-foreground sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <div>
          <h2 className="font-semibold">
            {isSuspended ? 'La cuenta está suspendida' : 'El plan venció'}
          </h2>
          <p className="text-sm text-muted-foreground">
            Puedes consultar tus datos, pero no crear ni cambiar información. Tus datos siguen
            disponibles. El portal de consulta de tus clientes continúa funcionando.
          </p>
        </div>
      </div>
      <PlanUpgradeButton organization={organization} className="shrink-0" />
    </section>
  )
}
