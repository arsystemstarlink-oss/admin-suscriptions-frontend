import { PlanStatusBanner } from '@/components/plans/PlanStatusBanner'
import { PendingPlanPaymentBanner } from '@/components/plans/PendingPlanPaymentBanner'
import { StaleDataBanner } from './StaleDataBanner'
import { PwaInstallBanner } from './PwaInstallBanner'
import { PushPromptBanner } from './PushPromptBanner'

/**
 * Avisos sobre el contenido, por prioridad. Los de estado se muestran siempre; de los
 * promocionales solo uno, y ninguno mientras haya un aviso de estado en pantalla.
 * La regla vive en CSS (.banner-group en index.css) porque cada aviso decide por sí
 * mismo si se renderiza.
 */
export function LayoutBanners() {
  return (
    <>
      <div className="banner-group banner-group--status">
        <StaleDataBanner />
        <PlanStatusBanner />
        <PendingPlanPaymentBanner />
      </div>
      <div className="banner-group banner-group--promo">
        <PwaInstallBanner />
        <PushPromptBanner />
      </div>
    </>
  )
}
