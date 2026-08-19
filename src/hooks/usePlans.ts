import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { plansApi } from '@/api/plans.api'
import { qk } from '@/lib/query-keys'
import type { CreatePlanRequest, UpdatePlanRequest } from '@/types/api'

interface UsePlansParams {
  search?: string
  active?: boolean
  organizationId?: string
  limit?: number
  offset?: number
}

export function usePlans(params?: UsePlansParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...qk.plans.lists, params],
    queryFn: () => plansApi.list(params),
    ...options,
  })
}

export function usePlanDetail(id: string) {
  return useQuery({
    queryKey: qk.plans.detail(id),
    queryFn: () => plansApi.getById(id),
    enabled: !!id,
  })
}

export function useCreatePlan() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: CreatePlanRequest) => plansApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.plans.lists })
    },
  })
}

export function useUpdatePlan() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePlanRequest }) =>
      plansApi.update(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.plans.lists })
      qc.invalidateQueries({ queryKey: qk.plans.detail(variables.id) })
    },
  })
}

export function useDeletePlan() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => plansApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.plans.lists })
    },
  })
}
