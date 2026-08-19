import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { subscriptionsApi } from '@/api/subscriptions.api'
import { qk } from '@/lib/query-keys'
import type { CreateSubscriptionRequest, UpdateSubscriptionRequest } from '@/types/api'

interface UseSubscriptionsParams {
  clientId?: string
  status?: 'ACTIVE' | 'SUSPENDED'
  hasOverduePeriods?: boolean
  organizationId?: string
  limit?: number
  offset?: number
}

export function useSubscriptions(params?: UseSubscriptionsParams) {
  return useQuery({
    queryKey: [...qk.subscriptions.lists, params],
    queryFn: () => subscriptionsApi.list(params),
  })
}

export function useSubscriptionDetail(id: string) {
  return useQuery({
    queryKey: qk.subscriptions.detail(id),
    queryFn: () => subscriptionsApi.getById(id),
    enabled: !!id,
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
