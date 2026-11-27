import { useId, type ComponentProps } from 'react'
import { getWhatsAppUrl } from '@/lib/business-plan'
import { getPlanLabel } from '@/lib/business-plan-catalog'
import { useBusinessPlans } from '@/hooks/useOrganizationPlanPaymentReports'
import { Button } from '@/components/ui/button'
import type { Organization } from '@/types/api'

interface PlanUpgradeButtonProps {
  organization?: Organization
  className?: string
  label?: string
  variant?: ComponentProps<typeof Button>['variant']
  hideWhenUnavailable?: boolean
}

export function PlanUpgradeButton({
  organization,
  className,
  label = 'Subir de plan',
  variant,
  hideWhenUnavailable = false,
}: PlanUpgradeButtonProps) {
  const unavailableId = useId()
  const { data: catalogData } = useBusinessPlans()
  const planName = organization?.plan
    ? getPlanLabel(catalogData?.plans, organization.plan)
    : 'actual'
  const url = getWhatsAppUrl(
    `Hola, tengo el plan ${planName} de A|R SYSTEM y quiero conocer las opciones para subir de plan.`,
  )

  if (!url) {
    if (hideWhenUnavailable) {
      return (
        <p className="text-sm text-muted-foreground">Cambio de plan: próximamente.</p>
      )
    }
    return (
      <div className="space-y-1">
        <Button
          type="button"
          variant={variant}
          disabled
          aria-describedby={unavailableId}
          className={className}
        >
          {label}
        </Button>
        <p id={unavailableId} className="text-xs text-muted-foreground">
          El contacto para subir de plan todavía no está disponible.
        </p>
      </div>
    )
  }

  return (
    <Button asChild variant={variant} className={className}>
      <a href={url} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    </Button>
  )
}
