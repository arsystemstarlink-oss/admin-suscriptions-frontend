import { useEffect } from 'react'
import { usePendingCollectionsCount } from '@/hooks/usePendingCollectionsCount'
import { useUnreadChatsCount } from '@/hooks/useUnreadChatsCount'
import { useIsSuperAdmin } from '@/stores/auth.store'
import { useOrganizationStore } from '@/stores/organization.store'

/** Lleva los pendientes (chats sin leer y cobros) al ícono de la app instalada. */
export function useAppBadge(): void {
  const isSuperAdmin = useIsSuperAdmin()
  const organizationId = useOrganizationStore((state) => state.selectedOrganizationId)
  const unreadChats = useUnreadChatsCount(organizationId ?? undefined, {
    enabled: !isSuperAdmin || !!organizationId,
  })
  const { total: pendingCollections } = usePendingCollectionsCount()
  const count = unreadChats + pendingCollections

  useEffect(() => {
    if (!('setAppBadge' in navigator)) return
    const update = count > 0 ? navigator.setAppBadge(count) : navigator.clearAppBadge()
    update.catch(() => {})
  }, [count])
}
