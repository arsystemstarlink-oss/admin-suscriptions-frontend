import { useBadges } from '@/hooks/useBadges'

export function useUnreadChatsCount(organizationId?: string, options?: { enabled?: boolean }) {
  const { data } = useBadges(organizationId, options)
  return data?.unreadChats ?? 0
}
