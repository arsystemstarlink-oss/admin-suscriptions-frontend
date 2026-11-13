import React, { useRef } from 'react';
import { Building2 } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { BrandMark } from '../brand/BrandMark';
import { useNavItems } from '@/hooks/useNavItems';
import { ExchangeRateBar } from '@/components/exchange/ExchangeRateBar';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
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

const NO_ORGANIZATION_VALUE = '__none__'

interface MobileAppShellProps {
  children?: React.ReactNode
  isSuperAdmin?: boolean
  organizations?: Organization[]
  organizationsLoading?: boolean
  organizationsError?: boolean
  onRetryOrganizations?: () => void
  selectedOrganizationId?: string | null
  onOrganizationChange?: (organizationId: string | null) => void
}

export default function MobileAppShell({
  children,
  isSuperAdmin,
  organizations,
  organizationsLoading,
  organizationsError,
  onRetryOrganizations,
  selectedOrganizationId,
  onOrganizationChange,
}: MobileAppShellProps) {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  useScrollRestoration(mainRef);

  const navItems = useNavItems();
  const isChatsPage = location.pathname.startsWith('/chats');

  const hasOrganizations = !!organizations && organizations.length > 0
  const effectiveValue =
    selectedOrganizationId && organizations?.some((org) => org.id === selectedOrganizationId)
      ? selectedOrganizationId
      : NO_ORGANIZATION_VALUE

  return (
    <div className="flex flex-col h-dvh w-full overflow-x-hidden bg-background text-foreground antialiased [-webkit-tap-highlight-color:transparent] [--mobile-header-h:calc(max(env(safe-area-inset-top),0.75rem)+2.75rem)] [--mobile-nav-h:calc(4.25rem+env(safe-area-inset-bottom))]">
      {/* Header móvil en una sola fila: logo a la izquierda, acciones a la derecha */}
      <header className="sticky top-0 z-50 select-none flex min-h-14 items-center gap-3 border-b border-border-subtle bg-header px-3 pb-2 pt-[max(env(safe-area-inset-top),12px)] text-header-foreground transition-colors">
        <BrandMark size="sm" variant="light" className="min-w-0 flex-1 [&_span]:truncate" />
        <div className="flex shrink-0 items-center gap-1.5">
          {isSuperAdmin && (
            <Select
              value={effectiveValue}
              onValueChange={(value) => onOrganizationChange?.(value === NO_ORGANIZATION_VALUE ? null : value)}
            >
              <SelectTrigger
                aria-label="Organización activa"
                className="h-8 w-auto max-w-28 shrink-0 gap-1 px-2 text-xs border-border bg-surface-elevated text-surface-elevated-foreground hover:bg-surface-hover hover:text-surface-elevated-foreground [&>span]:truncate"
                title={
                  organizationsLoading
                    ? 'Cargando organizaciones...'
                    : organizationsError
                      ? 'No se pudieron cargar las organizaciones'
                      : !hasOrganizations
                        ? 'No hay organizaciones disponibles'
                        : undefined
                }
              >
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <SelectValue placeholder={organizationsLoading ? 'Cargando...' : 'Org'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_ORGANIZATION_VALUE}>Ninguna organización</SelectItem>
                {organizations?.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
                {!organizationsLoading && !hasOrganizations && (
                  <div className="px-2 py-3 text-center">
                    <p className="text-sm text-muted-foreground">
                      {organizationsError ? 'No se pudieron cargar las organizaciones.' : 'No hay organizaciones disponibles.'}
                    </p>
                    {organizationsError && onRetryOrganizations && (
                      <button
                        type="button"
                        onClick={onRetryOrganizations}
                        className="mt-1 text-sm font-medium text-primary-text hover:underline"
                      >
                        Reintentar
                      </button>
                    )}
                  </div>
                )}
              </SelectContent>
            </Select>
          )}
          <div className="shrink-0">
            <HeaderActions />
          </div>
        </div>
      </header>
      <ExchangeRateBar />

      {/* Contenedor Principal (Scroll) */}
      <main
        ref={mainRef}
        className={cn(
          'flex-1 min-h-0 touch-pan-y overscroll-y-contain pb-[calc(80px+env(safe-area-inset-bottom))]',
          isChatsPage ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'
        )}
      >
        <div
          className={cn(
            'px-4 py-3 flex flex-col gap-4',
            isChatsPage && 'flex-1 min-h-0 overflow-hidden'
          )}
        >
          {children || <Outlet />}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav aria-label="Navegación principal móvil" className="fixed bottom-0 left-0 right-0 z-50 select-none bg-surface/95 border-t border-border backdrop-blur-xl pb-[env(safe-area-inset-bottom)] transition-colors">
        <ul className="flex items-center justify-around px-2 py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const badgeCount = item.badge;
            
            return (
              <li key={item.id} className="flex-1 flex justify-center">
                <NavLink
                  to={item.path}
                  end={item.path === '/dashboard'}
                  className="relative flex flex-col items-center justify-center w-full min-h-11 py-2 gap-1 rounded-lg active:scale-95 transition-transform touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={item.accessibleLabel}
                >
                  {({ isActive: active }) => {
                    return (
                      <>
                      <span className="relative">
                        <Icon
                          size={24}
                          strokeWidth={active ? 2.5 : 2}
                          className={`transition-colors ${
                            active
                              ? 'text-primary-text'
                              : 'text-muted-foreground'
                          }`}
                        />
                        {badgeCount > 0 && (
                        <span className={cn('absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none', item.badgeClass)}>
                          {badgeCount > 99 ? '99+' : badgeCount}
                        </span>
                        )}
                      </span>
                      <span
                        className={`text-[10px] font-medium tracking-wide transition-colors ${
                          active
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {item.label}
                      </span>
                      </>
                    );
                  }}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
