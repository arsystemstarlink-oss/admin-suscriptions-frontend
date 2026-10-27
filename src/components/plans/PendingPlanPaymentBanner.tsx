import { Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useOrganizationPlanPaymentReports } from '@/hooks/useOrganizationPlanPaymentReports'
import { useAuthStore } from '@/stores/auth.store'

export function PendingPlanPaymentBanner() {
  const user = useAuthStore((state) => state.user)
  const enabled = user?.role === 'admin'
  const { data } = useOrganizationPlanPaymentReports(enabled)
  const pending = data?.reports.find((report) => report.status === 'PENDING')

  if (!pending) return null

  return (
    <section
      role="status"
      className="mb-4 flex flex-col gap-2 rounded-xl border border-info/20 bg-info/10 p-4 text-foreground sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-info" />
        <div>
          <h2 className="font-semibold">Tu pago de plan está en verificación</h2>
          <p className="text-sm text-muted-foreground">
            Mientras tanto tienes Básico de prueba. Te avisaremos cuando se active el plan.
          </p>
        </div>
      </div>
      <Link
        to="/config/profile"
        className="shrink-0 text-sm font-medium text-info underline underline-offset-4"
      >
        Ver mi plan
      </Link>
    </section>
  )
}
