import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Settings, Users, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect } from 'react'

const tabs = [
  { to: '/config', icon: Settings, label: 'Configuración General', end: true },
  { to: '/config/clients', icon: Users, label: 'Clientes', end: false },
  { to: '/config/plans', icon: Package, label: 'Planes', end: false },
]

export function SettingsLayout() {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="space-y-6">
      <div className="border-b border-border">
        <nav className="flex gap-1 overflow-x-auto md:overflow-visible scrollbar-hide">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                )
              }
            >
              <tab.icon className="h-4 w-4 shrink-0" />
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <Outlet />
    </div>
  )
}
