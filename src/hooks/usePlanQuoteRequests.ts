import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { planQuoteRequestsApi } from '@/api/plan-quote-requests.api'
import { qk } from '@/lib/query-keys'
import { handleApiError } from '@/lib/error-handler'
import type { PlanQuoteRequestStatus, UpdatePlanQuoteRequestRequest } from '@/types/api'

export function usePlanQuoteRequests(
  status: PlanQuoteRequestStatus | 'ALL',
  enabled = true,
) {
  return useQuery({
    queryKey: [...qk.planQuoteRequests.lists, status],
    queryFn: () => planQuoteRequestsApi.list({ status, limit: 100 }),
    enabled,
  })
}

export function useUpdatePlanQuoteRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePlanQuoteRequestRequest }) =>
      planQuoteRequestsApi.update(id, data),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: qk.planQuoteRequests.lists })
      toast.success(
        result.request.status === 'CONTACTED'
          ? 'Solicitud marcada como contactada'
          : 'Solicitud cerrada',
      )
    },
    onError: (error) => handleApiError(error),
  })
}
