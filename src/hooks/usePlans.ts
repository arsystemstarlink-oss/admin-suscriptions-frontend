import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { plansApi } from '@/api/plans.api'
import { qk } from '@/lib/query-keys'
import type { CreatePlanRequest, Pagination, Plan, UpdatePlanRequest } from '@/types/api'

interface PlansListData {
  plans: Plan[]
  pagination: Pagination
}

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
    mutationFn: ({ id, data, organizationId }: { id: string; data: UpdatePlanRequest; organizationId?: string }) =>
      plansApi.update(id, data, organizationId),
    onMutate: async (variables) => {
      await qc.cancelQueries({ queryKey: qk.plans.lists })
      const previous = qc.getQueriesData<PlansListData>({ queryKey: qk.plans.lists })
      if (typeof variables.data.active === 'boolean') {
        previous.forEach(([queryKey, data]) => {
          if (!data) return
          qc.setQueryData<PlansListData>(queryKey, {
            ...data,
            plans: data.plans.map((plan) =>
              plan.id === variables.id ? { ...plan, active: variables.data.active! } : plan,
            ),
          })
        })
      }
      return { previous }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.plans.lists })
      qc.invalidateQueries({ queryKey: qk.plans.detail(variables.id) })
    },
    onError: (_error, _variables, context) => {
      context?.previous.forEach(([queryKey, data]) => qc.setQueryData(queryKey, data))
    },
    onSettled: (_data, _error, variables) => {
      qc.invalidateQueries({ queryKey: qk.plans.lists })
      qc.invalidateQueries({ queryKey: qk.plans.detail(variables.id) })
    },
  })
}

export function useDeletePlan() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => plansApi.remove(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.plans.lists })
      const previous = qc.getQueriesData<PlansListData>({ queryKey: qk.plans.lists })
      previous.forEach(([queryKey, data]) => {
        if (!data) return
        qc.setQueryData<PlansListData>(queryKey, {
          ...data,
          plans: data.plans.filter((plan) => plan.id !== id),
        })
      })
      return { previous }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.plans.lists })
    },
    onError: (_error, _id, context) => {
      context?.previous.forEach(([queryKey, data]) => qc.setQueryData(queryKey, data))
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.plans.lists })
    },
  })
}
