import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/api/dashboard.api'
import { qk } from '@/lib/query-keys'

interface UseDashboardParams {
  organizationId?: string
}

export function useDashboardSummary(params?: UseDashboardParams) {
  return useQuery({
    queryKey: [...qk.dashboard.summary, params],
    queryFn: () => dashboardApi.getSummary(params),
    staleTime: 10_000,
  })
}

export function useDashboardAlerts(params?: UseDashboardParams) {
  return useQuery({
    queryKey: [...qk.dashboard.alerts, params],
    queryFn: () => dashboardApi.getAlerts(params),
    staleTime: 10_000,
  })
}
