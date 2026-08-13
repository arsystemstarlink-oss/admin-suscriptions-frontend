import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ClipboardList, Users, Package, User, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect } from 'react'

const tabs = [
  {
    to: '/config',
    icon: ClipboardList,
    label: 'Tarea Diaria',
    title: 'Tarea Diaria',
    subtitle: 'Gestiona el sistema y tareas automáticas',
    end: true,
  },
  {
    to: '/config/clients',
    icon: Users,
    label: 'Clientes',
    title: 'Clientes',
    subtitle: 'Gestión de clientes del sistema',
    end: false,
  },
  {
    to: '/config/plans',
    icon: Package,
    label: 'Planes',
    title: 'Planes',
    subtitle: 'Catálogo de planes de suscripción',
    end: false,
  },
  {
    to: '/config/admins',
    icon: UserPlus,
    label: 'Admins',
    title: 'Admins',
    subtitle: 'Creación de administradores adicionales',
    end: false,
  },
  {
    to: '/config/profile',
    icon: User,
    label: 'Perfil',
    title: 'Perfil',
    subtitle: 'Información de tu cuenta de administrador',
    end: false,
  },
]

export function SettingsLayout() {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  const activeTab = tabs.find((tab) => location.pathname === tab.to)

  return (
    <div className="space-y-4 md:space-y-6">
      {activeTab && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{activeTab.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">{activeTab.subtitle}</p>
        </div>
      )}

      <nav className="grid w-full grid-cols-5 h-10 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                'inline-flex items-center justify-center whitespace-nowrap rounded-md px-2 py-1.5 text-sm font-medium transition-all hover:bg-muted hover:text-foreground',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground'
              )
            }
          >
            <tab.icon className="h-4 w-4 mr-1.5 shrink-0" />
            <span className="hidden md:inline">{tab.label}</span>
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  )
}
