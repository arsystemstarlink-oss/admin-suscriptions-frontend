import React from 'react';
import { Home, MessageSquare, CreditCard, Settings, Building2, ReceiptText } from 'lucide-react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { BrandMark } from '../brand/BrandMark';
import { useUnreadChatsCount } from '@/hooks/useUnreadChatsCount';
import { usePendingReportsCount } from '@/hooks/usePaymentReports';
import { ExchangeTicker } from '@/components/exchange/ExchangeTicker';
import { HeaderActions } from './HeaderActions';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Organization } from '@/types/api';

const ALL_ORGS_VALUE = '__all__'

interface MobileAppShellProps {
  children?: React.ReactNode
  onOpenSearch?: () => void
  isSuperAdmin?: boolean
  organizations?: Organization[]
  selectedOrganizationId?: string | null
  onOrganizationChange?: (organizationId: string | null) => void
}

export default function MobileAppShell({
  children,
  onOpenSearch,
  isSuperAdmin,
  organizations,
  selectedOrganizationId,
  onOrganizationChange,
}: MobileAppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const unreadChatsCount = useUnreadChatsCount();
  const { data: pendingReports } = usePendingReportsCount();
  const pendingReportsCount = pendingReports?.pending ?? 0;

  // Determinar la tab activa basada en la ruta
  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return 'home';
    if (path.startsWith('/subscriptions')) return 'subs';
    if (path.startsWith('/payment-reports')) return 'reports';
    if (path.startsWith('/chats')) return 'chats';
    if (path.startsWith('/config') || path.startsWith('/settings') || path.startsWith('/plans')) return 'settings';
    return 'home';
  };

  const activeTab = getActiveTab();
  const isChatsPage = location.pathname.startsWith('/chats');

  const navItems: Array<{
    id: string
    icon: typeof Home
    label: string
    path: string
    badge?: number
  }> = [
    { id: 'reports', icon: ReceiptText, label: 'Reportes', path: '/payment-reports', badge: pendingReportsCount },
    { id: 'subs', icon: CreditCard, label: 'Suscripciones', path: '/subscriptions' },
    { id: 'home', icon: Home, label: 'Inicio', path: '/' },
    { id: 'chats', icon: MessageSquare, label: 'Chats', path: '/chats', badge: unreadChatsCount },
    { id: 'settings', icon: Settings, label: 'Ajustes', path: '/config' },
  ];

  const showOrgSwitcher =
    isSuperAdmin && organizations && organizations.length > 0

  return (
    <div className="flex flex-col h-dvh w-full overflow-x-hidden bg-background text-foreground select-none antialiased [-webkit-tap-highlight-color:transparent] [--mobile-header-h:calc(max(env(safe-area-inset-top),0.75rem)+2.75rem)] [--mobile-nav-h:calc(4.25rem+env(safe-area-inset-bottom))]">
      {/* Header móvil en una sola fila: logo a la izquierda, acciones a la derecha */}
      <header className="sticky top-0 z-50 flex min-h-14 items-center gap-3 border-b border-border-subtle bg-header px-3 pb-2 pt-[max(env(safe-area-inset-top),12px)] text-header-foreground transition-colors">
        <BrandMark size="sm" className="min-w-0 flex-1 text-header-foreground [&_span]:truncate" />
        <div className="flex shrink-0 items-center gap-1.5">
          {showOrgSwitcher && (
            <Select
              value={selectedOrganizationId || ALL_ORGS_VALUE}
              onValueChange={(value) => onOrganizationChange?.(value === ALL_ORGS_VALUE ? null : value)}
            >
              <SelectTrigger
                aria-label="Organización activa"
                className="h-8 w-auto max-w-28 shrink-0 gap-1 px-2 text-xs border-border bg-surface-elevated text-surface-elevated-foreground hover:bg-surface-hover hover:text-surface-elevated-foreground [&>span]:truncate"
              >
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_ORGS_VALUE}>Todas</SelectItem>
                {organizations!.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="shrink-0">
            <HeaderActions
              showChatsButton={false}
              showSearchButton={false}
              unreadChatsCount={unreadChatsCount}
              onOpenSearch={onOpenSearch ?? (() => {})}
            />
          </div>
        </div>
      </header>
      <ExchangeTicker />

      {/* Contenedor Principal (Scroll) */}
      <main
        className={cn(
          'flex-1 min-h-0 touch-pan-y overscroll-y-contain pb-[calc(80px+env(safe-area-inset-bottom))]',
          isChatsPage ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'
        )}
      >
        <div
          className={cn(
            'px-4 py-6 flex flex-col gap-4',
            isChatsPage && 'flex-1 min-h-0 overflow-hidden'
          )}
        >
          {children || <Outlet />}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav aria-label="Navegación principal móvil" className="fixed bottom-0 left-0 right-0 z-50 bg-surface/95 border-t border-border backdrop-blur-xl pb-[env(safe-area-inset-bottom)] transition-colors">
        <ul role="tablist" className="flex items-center justify-around px-2 py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const badgeCount = item.badge ?? 0;
            
            return (
              <li key={item.id} className="flex-1 flex justify-center">
                <button
                  onClick={() => navigate(item.path)}
                  className="relative flex flex-col items-center justify-center w-full min-h-11 py-2 gap-1 active:scale-95 transition-transform touch-manipulation focus:outline-none"
                  aria-label={badgeCount > 0 ? `${item.label}, ${badgeCount} sin leer` : item.label}
                  aria-selected={isActive}
                  role="tab"
                >
                  <span className="relative">
                    <Icon
                      size={24}
                      strokeWidth={isActive ? 2.5 : 2}
                      className={`transition-colors ${
                        isActive
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      }`}
                    />
                    {badgeCount > 0 && (
                        <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-success px-1 text-[10px] font-semibold leading-none text-success-foreground">
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    )}
                  </span>
                  <span
                    className={`text-[10px] font-medium tracking-wide transition-colors ${
                      isActive
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
