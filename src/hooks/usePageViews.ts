import { useQuery } from '@tanstack/react-query'
import { pageViewsApi } from '@/api/page-views.api'
import { qk } from '@/lib/query-keys'

export function usePlanPageViews(days: 7 | 30 | 90) {
  return useQuery({
    queryKey: qk.pageViews(days),
    queryFn: () => pageViewsApi.get(days),
    staleTime: 60_000,
  })
}
