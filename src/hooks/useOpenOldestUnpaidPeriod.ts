import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/error-handler'
import { billingApi } from '@/api/billing.api'
import { qk } from '@/lib/query-keys'
import { useUIStore } from '@/stores/ui.store'

/** Abre el cobro rápido en el período sin pagar más antiguo de una suscripción. */
export function useOpenOldestUnpaidPeriod(organizationId?: string) {
  const queryClient = useQueryClient()
  const openQuickPay = useUIStore((state) => state.openQuickPay)
  const [loadingSubscriptionId, setLoadingSubscriptionId] = useState<string | null>(null)

  const openOldestUnpaidPeriod = async (subscriptionId: string) => {
    if (loadingSubscriptionId) return
    setLoadingSubscriptionId(subscriptionId)
    try {
      const result = await queryClient.fetchQuery({
        queryKey: [...qk.billing.lists, { subscriptionId, organizationId, limit: 200 }],
        queryFn: () => billingApi.list({ subscriptionId, organizationId, limit: 200 }),
        staleTime: 0,
      })
      const unpaid = result.periods
        .filter((p) => p.status !== 'PAID' && p.subscription != null)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0]

      if (unpaid) {
        openQuickPay({ period: unpaid })
      } else if (result.periods.some((p) => p.status !== 'PAID')) {
        toast.error('No se pudo abrir el cobro: datos incompletos del período')
      } else {
        toast.info('No hay períodos pendientes para esta suscripción')
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudieron consultar los períodos de la suscripción'))
    } finally {
      setLoadingSubscriptionId(null)
    }
  }

  return { openOldestUnpaidPeriod, loadingSubscriptionId }
}
