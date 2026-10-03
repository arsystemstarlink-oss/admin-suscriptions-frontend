import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { subscriptionsApi } from '@/api/subscriptions.api'
import { qk } from '@/lib/query-keys'
import type { CreateSubscriptionRequest, PayAdvanceRequest, UpdateSubscriptionRequest } from '@/types/api'
import { toast } from 'sonner'

interface UseSubscriptionsParams {
  clientId?: string
  status?: 'ACTIVE' | 'SUSPENDED'
  hasOverduePeriods?: boolean
  organizationId?: string
  limit?: number
  offset?: number
}

export function useSubscriptions(params?: UseSubscriptionsParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...qk.subscriptions.lists, params],
    queryFn: () => subscriptionsApi.list(params),
    ...options,
  })
}

export function useSubscriptionDetail(id: string, organizationId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...qk.subscriptions.detail(id), organizationId],
    queryFn: () => subscriptionsApi.getById(id, organizationId),
    enabled: !!id && (options?.enabled ?? true),
  })
}

export function useCreateSubscription() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateSubscriptionRequest) => subscriptionsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.subscriptions.lists })
      qc.invalidateQueries({ queryKey: qk.clients.lists })
    },
  })
}

export function useUpdateSubscription() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSubscriptionRequest }) =>
      subscriptionsApi.update(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.subscriptions.lists })
      qc.invalidateQueries({ queryKey: qk.subscriptions.detail(variables.id) })
      qc.invalidateQueries({ queryKey: qk.clients.lists })
    },
  })
}

export function useDeleteSubscription() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => subscriptionsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.subscriptions.lists })
      qc.invalidateQueries({ queryKey: qk.clients.lists })
    },
  })
}

export function usePayAdvance(subscriptionId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: PayAdvanceRequest) => subscriptionsApi.payAdvance(subscriptionId, data),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: qk.billing.lists })
      qc.invalidateQueries({ queryKey: qk.subscriptions.detail(response.subscription.id) })
      qc.invalidateQueries({ queryKey: qk.subscriptions.lists })
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.invalidateQueries({ queryKey: qk.dashboard.summary })
      qc.invalidateQueries({ queryKey: qk.dashboard.alerts })
      toast.success('Adelanto registrado — próximo ciclo pagado')
    },
    onError: (error: unknown) => {
      const apiError = error as { code?: string }
      if (apiError.code === 'HAS_UNPAID_PERIODS') {
        toast.error('Tiene períodos pendientes: cóbrelos primero')
      } else if (apiError.code === 'PERIOD_ALREADY_EXISTS') {
        toast.warning('El siguiente ciclo ya existe')
        qc.invalidateQueries({ queryKey: qk.billing.lists })
        qc.invalidateQueries({ queryKey: qk.subscriptions.detail(subscriptionId) })
      } else if (apiError.code === 'SUBSCRIPTION_SUSPENDED') {
        toast.error('Suscripción suspendida: cobre los vencidos primero')
      } else {
        toast.error('Error al registrar el adelanto')
      }
    },
  })
}
