import { useQuery } from '@tanstack/react-query'
import { badgesApi } from '@/api/badges.api'
import { qk } from '@/lib/query-keys'

export function badgesQueryOptions(organizationId?: string) {
  return {
    queryKey: [...qk.badges, organizationId] as const,
    queryFn: () => badgesApi.get(organizationId),
    staleTime: 60_000,
  }
}

export function useBadges(organizationId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    ...badgesQueryOptions(organizationId),
    enabled: options?.enabled ?? true,
  })
}
