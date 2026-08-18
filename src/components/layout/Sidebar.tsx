import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Link2, Settings, LogOut, MessageSquare, ChevronRight, User } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { cn, getInitial } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

const navItems = [
  { to: '/subscriptions', icon: Link2, label: 'Suscripciones' },
  { to: '/', icon: LayoutDashboard, label: 'Panel' },
  { to: '/chats', icon: MessageSquare, label: 'Mensajes' },
  { to: '/config', icon: Settings, label: 'Configuración' },
]

function CollapsedAccountMenu({
  name,
  email,
  onLogout,
}: {
  name: string
  email: string
  onLogout: () => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative flex justify-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Menú de cuenta"
        title={name}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-800 text-white shadow-sm transition-colors hover:bg-primary-700 dark:bg-primary-700 dark:text-white dark:hover:bg-primary-600"
      >
        <span className="text-sm font-bold">{getInitial(name, 'U')}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute bottom-0 left-full z-50 ml-2 w-56 rounded-lg border border-primary-100 bg-white p-2 text-primary-800 shadow-lg dark:border-primary-800 dark:bg-primary-900 dark:text-primary-100"
        >
          <div className="border-b border-primary-100 px-2 py-2 dark:border-primary-800">
            <p className="truncate text-sm font-semibold">{name}</p>
            {email ? (
              <p className="truncate text-xs text-primary-600 dark:text-primary-300">{email}</p>
            ) : null}
          </div>
          <NavLink
            role="menuitem"
            to="/config/profile"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-2 rounded-md px-2 py-2 text-sm text-primary-800 hover:bg-primary-50 dark:text-primary-100 dark:hover:bg-primary-800"
          >
            <User className="h-4 w-4 shrink-0" />
            Ver perfil
          </NavLink>
          <button
            type="button"
            role="menuitem"
            onClick={onLogout}
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}

interface SidebarProps {
  collapsed: boolean
  isMobile: boolean
  mobileOpen: boolean
  onMobileClose: () => void
  onToggleSidebar: () => void
}

export function Sidebar({ collapsed, isMobile, mobileOpen, onMobileClose, onToggleSidebar }: SidebarProps) {
  const { user, logout } = useAuthStore()
  const location = useLocation()

  useEffect(() => {
    if (isMobile && mobileOpen) {
      onMobileClose()
    }
  }, [location.pathname])

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={isMobile ? onMobileClose : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center rounded-md text-sm font-medium transition-all',
                collapsed && !isMobile ? 'justify-center p-2' : 'gap-3 px-3 py-2.5',
                (isActive || (item.to === '/config' && location.pathname.startsWith('/config')))
                  ? 'bg-secondary text-secondary-foreground border border-secondary/40 shadow-sm hover:bg-secondary/90'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
            title={collapsed && !isMobile ? item.label : undefined}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {(!collapsed || isMobile) && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        {(!collapsed || isMobile) ? (
          <div className="group relative rounded-lg border border-border bg-muted/50 p-3 transition-colors hover:bg-muted/80">
            <div className="flex items-center gap-3">
              <NavLink
                to="/config/profile"
                onClick={isMobile ? onMobileClose : undefined}
                className="flex items-center gap-3 flex-1 min-w-0"
                title="Ver perfil"
              >
                <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-primary to-primary/60 shadow-sm">
                  <span className="text-sm font-bold text-primary-foreground">
                    {getInitial(user?.name, 'U')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{user?.name || 'Usuario'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email || ''}</p>
                </div>
              </NavLink>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className="h-10 w-10 shrink-0 text-muted-foreground opacity-100 transition-all hover:bg-destructive/10 hover:text-destructive md:h-8 md:w-8 md:opacity-0 md:group-hover:opacity-100"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <LogOut className="h-4 w-4 shrink-0 md:h-3.5 md:w-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <CollapsedAccountMenu
            name={user?.name || 'Usuario'}
            email={user?.email || ''}
            onLogout={logout}
          />
        )}
      </div>
    </div>
  )

  useEffect(() => {
    if (!isMobile || !mobileOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onMobileClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isMobile, mobileOpen, onMobileClose])

  if (isMobile) {
    return (
      <>
        {mobileOpen && (
          <div
            className="fixed top-16 left-0 right-0 bottom-0 bg-black/60 z-40 md:hidden"
            onClick={onMobileClose}
            aria-hidden="true"
          />
        )}
        <aside
          role="dialog"
          aria-modal={mobileOpen}
          aria-label="Menú de navegación"
          className={cn(
            'fixed top-16 left-0 bottom-0 z-50 w-[min(16rem,85vw)] bg-card border-r border-border shadow-lg transform transition-transform duration-300 overscroll-contain md:hidden',
            mobileOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
          )}
        >
          {sidebarContent}
        </aside>
      </>
    )
  }

  return (
    <aside
      className={cn(
        'hidden md:flex bg-card border-r border-border flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className={cn('flex items-center h-16 border-b border-border shrink-0 px-3 relative', collapsed ? 'justify-center' : '')}>
        {!collapsed && (
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold tracking-wider text-muted-foreground uppercase pointer-events-none">
            Menú Lateral
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className={cn('h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted z-10', !collapsed && 'ml-auto')}
          aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        >
          <ChevronRight
            className={cn('h-4 w-4 shrink-0 transition-transform', collapsed ? '' : 'rotate-180')}
          />
        </Button>
      </div>
      {sidebarContent}
    </aside>
  )
}
