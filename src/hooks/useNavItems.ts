import { Home, Link2, MessageSquare, ReceiptText, Settings, type LucideIcon } from 'lucide-react'
import { usePendingCollectionsCount } from '@/hooks/usePendingCollectionsCount'
import { useUnreadChatsCount } from '@/hooks/useUnreadChatsCount'
import { useIsSuperAdmin } from '@/stores/auth.store'
import { useOrganizationStore } from '@/stores/organization.store'

export interface NavItem {
  id: string
  icon: LucideIcon
  label: string
  path: string
  badge: number
  badgeClass: string
  accessibleLabel: string
}

const COLLECTIONS_BADGE_CLASS = 'bg-destructive text-destructive-foreground'
const CHATS_BADGE_CLASS = 'bg-success text-success-foreground'

/** Secciones principales: las mismas en la barra lateral y en la navegación móvil. */
export function useNavItems(): NavItem[] {
  const isSuperAdmin = useIsSuperAdmin()
  const organizationId = useOrganizationStore((state) => state.selectedOrganizationId)
  const unreadChats = useUnreadChatsCount(organizationId ?? undefined, {
    enabled: !isSuperAdmin || !!organizationId,
  })
  const { total: pendingCollections } = usePendingCollectionsCount()

  const item = (
    id: string,
    icon: LucideIcon,
    label: string,
    path: string,
    badge = 0,
    badgeClass = '',
    badgeDescription = '',
  ): NavItem => ({
    id,
    icon,
    label,
    path,
    badge,
    badgeClass,
    accessibleLabel: badge > 0 ? `${label}, ${badge} ${badgeDescription}` : label,
  })

  return [
    item('home', Home, 'Inicio', '/dashboard'),
    item('subs', Link2, 'Suscripciones', '/subscriptions'),
    item('reports', ReceiptText, 'Cobros', '/payment-reports', pendingCollections, COLLECTIONS_BADGE_CLASS, 'pendientes'),
    item('chats', MessageSquare, 'Chats', '/chats', unreadChats, CHATS_BADGE_CLASS, 'sin leer'),
    item('settings', Settings, 'Ajustes', '/config'),
  ]
}
