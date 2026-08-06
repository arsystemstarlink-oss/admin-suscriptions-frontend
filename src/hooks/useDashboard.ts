import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/api/dashboard.api'
import { qk } from '@/lib/query-keys'

export function useDashboardSummary() {
  return useQuery({
    queryKey: qk.dashboard.summary,
    queryFn: dashboardApi.getSummary,
    staleTime: 10_000,
  })
}

export function useDashboardAlerts() {
  return useQuery({
    queryKey: qk.dashboard.alerts,
    queryFn: dashboardApi.getAlerts,
    staleTime: 10_000,
  })
}
