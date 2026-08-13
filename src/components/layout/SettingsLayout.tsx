import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ClipboardList, Users, Package, User, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'

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

  const activeTab = tabs.find((tab) =>
    tab.end ? location.pathname === tab.to : location.pathname.startsWith(tab.to)
  )

  return (
    <div className="space-y-4 md:space-y-6">
      {activeTab && (
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{activeTab.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">{activeTab.subtitle}</p>
        </div>
      )}

      <nav
        className="flex w-full gap-1 overflow-x-auto rounded-lg bg-muted p-1 text-muted-foreground scrollbar-hide sm:grid sm:grid-cols-5 sm:overflow-visible"
        aria-label="Secciones de configuración"
      >
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            title={tab.label}
            aria-label={tab.label}
            className={({ isActive }) =>
              cn(
                'inline-flex min-h-10 min-w-10 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all hover:bg-muted hover:text-foreground sm:min-w-0 sm:flex-row sm:gap-1.5 sm:px-2 sm:text-sm',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground'
              )
            }
          >
            <tab.icon className="h-4 w-4 shrink-0" />
            <span className="max-w-[4.5rem] truncate sm:max-w-none">{tab.label}</span>
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  )
}
