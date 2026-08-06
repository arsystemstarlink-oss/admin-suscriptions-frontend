import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { billingApi } from '@/api/billing.api'
import { qk } from '@/lib/query-keys'
import type { PayRequest, UpdateBillingPeriodRequest, BillingPeriodWithDetails } from '@/types/api'
import { toast } from 'sonner'

interface UseBillingPeriodsParams {
  subscriptionId?: string
  clientId?: string
  status?: 'PENDING' | 'PAID' | 'OVERDUE'
  search?: string
  expiresBefore?: string
  periodLabel?: string
  limit?: number
  offset?: number
}

export function useBillingPeriods(params?: UseBillingPeriodsParams) {
  return useQuery({
    queryKey: [...qk.billing.lists, params],
    queryFn: () => billingApi.list(params),
  })
}

export function useBillingPeriodDetail(id: string) {
  return useQuery({
    queryKey: qk.billing.detail(id),
    queryFn: () => billingApi.getById(id),
    enabled: !!id,
  })
}

export function useRegisterPayment(periodId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: PayRequest) => billingApi.payPeriod(periodId, data),
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: qk.billing.lists })

      const previousData = new Map<string, unknown>()
      const queries = qc.getQueriesData({ queryKey: qk.billing.lists })
      for (const [key, val] of queries) {
        previousData.set(JSON.stringify(key), val)
      }

      qc.setQueriesData({ queryKey: qk.billing.lists }, (old: unknown) => {
        if (!old || typeof old !== 'object') return old
        const obj = old as { periods?: BillingPeriodWithDetails[] }
        if (!obj.periods) return old
        return {
          ...old,
          periods: obj.periods.map((p) =>
            p.id === periodId
              ? { ...p, status: 'PAID' as const, paidAt: data.paidAt, paymentMethod: data.paymentMethod, notes: data.notes }
              : p
          ),
        }
      })

      return { previousData }
    },
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: qk.billing.lists })
      qc.invalidateQueries({ queryKey: qk.billing.detail(periodId) })

      if (response.subscription.reactivated) {
        qc.invalidateQueries({ queryKey: qk.subscriptions.detail(response.subscription.id) })
        qc.invalidateQueries({ queryKey: qk.subscriptions.lists })
      }

      qc.invalidateQueries({ queryKey: qk.clients.lists })
      qc.invalidateQueries({ queryKey: qk.dashboard.summary })
      qc.invalidateQueries({ queryKey: qk.dashboard.alerts })

      if (response.subscription.reactivated) {
        toast.success('Pago registrado — Suscripción reactivada automáticamente')
      } else {
        toast.success('Pago registrado correctamente')
      }
    },
    onError: (error: unknown, _variables, context) => {
      if (context?.previousData) {
        for (const [keyStr, data] of context.previousData) {
          qc.setQueryData(JSON.parse(keyStr), data)
        }
      }

      const apiError = error as { code?: string }
      if (apiError.code === 'PERIOD_ALREADY_PAID') {
        toast.warning('Este período ya fue pagado')
        qc.invalidateQueries({ queryKey: qk.billing.detail(periodId) })
      } else if (apiError.code === 'INVALID_PAYMENT_AMOUNT') {
        toast.error('El monto no coincide con el período')
      } else if (apiError.code === 'INVALID_PERIOD_STATE') {
        toast.error('No se puede registrar pago en este estado')
        qc.invalidateQueries({ queryKey: qk.billing.detail(periodId) })
      } else {
        toast.error('Error al registrar el pago')
      }
    },
  })
}

export function useUpdateBillingPeriod() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ periodId, data }: { periodId: string; data: UpdateBillingPeriodRequest }) =>
      billingApi.updatePeriod(periodId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.billing.lists })
      qc.invalidateQueries({ queryKey: qk.billing.detail(variables.periodId) })
      qc.invalidateQueries({ queryKey: qk.subscriptions.lists })
      toast.success('Datos de pago actualizados')
    },
    onError: (error: unknown) => {
      const apiError = error as { code?: string }
      if (apiError.code === 'INVALID_PERIOD_STATE') {
        toast.error('Solo se pueden editar períodos pagados')
      } else if (apiError.code === 'INVALID_PAYMENT_DATE') {
        toast.error('La fecha de pago no es válida')
      } else {
        toast.error('Error al actualizar los datos de pago')
      }
    },
  })
}

export function useGenerateNextPeriod() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (subscriptionId: string) => billingApi.generateNext(subscriptionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.billing.lists })
      qc.invalidateQueries({ queryKey: qk.subscriptions.lists })
      toast.success('Período generado correctamente')
    },
    onError: () => {
      toast.error('No se puede generar el próximo período')
    },
  })
}
