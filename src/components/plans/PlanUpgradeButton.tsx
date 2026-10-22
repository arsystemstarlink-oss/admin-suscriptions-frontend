import { BUSINESS_PLANS } from '@/lib/constants'
import { getWhatsAppUrl } from '@/lib/business-plan'
import { Button } from '@/components/ui/button'
import type { Organization } from '@/types/api'

interface PlanUpgradeButtonProps {
  organization?: Organization
  className?: string
  label?: string
}

export function PlanUpgradeButton({
  organization,
  className,
  label = 'Subir de plan',
}: PlanUpgradeButtonProps) {
  const planName = organization?.plan ? BUSINESS_PLANS[organization.plan].label : 'actual'
  const url = getWhatsAppUrl(
    `Hola, tengo el plan ${planName} de A|R SYSTEM y quiero conocer las opciones para subir de plan.`,
  )

  if (!url) {
    return (
      <div className="space-y-1">
        <Button type="button" disabled className={className}>
          {label}
        </Button>
        <p className="text-xs text-muted-foreground">
          El contacto para subir de plan todavía no está disponible.
        </p>
      </div>
    )
  }

  return (
    <Button asChild className={className}>
      <a href={url} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    </Button>
  )
}
