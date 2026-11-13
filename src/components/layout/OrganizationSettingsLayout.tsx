import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { OrganizationsPage } from '@/routes/lazy-pages'
import { useIsSuperAdmin } from '@/stores/auth.store'
import { cn } from '@/lib/utils'

const BASE_PATH = '/config/organization'

interface Section {
  to: string
  label: string
  end?: boolean
}

const ORGANIZATION_SECTIONS: Section[] = [
  { to: `${BASE_PATH}/whatsapp`, label: 'WhatsApp' },
  { to: `${BASE_PATH}/tasks`, label: 'Tareas' },
]

/** Todo lo que se configura por organización, en un solo lugar de Ajustes. */
export function OrganizationSettingsLayout() {
  const isSuperAdmin = useIsSuperAdmin()
  const sections = isSuperAdmin
    ? [{ to: BASE_PATH, label: 'Todas', end: true }, ...ORGANIZATION_SECTIONS]
    : ORGANIZATION_SECTIONS

  return (
    <div className="space-y-3 sm:space-y-4">
      <nav aria-label="Secciones de la organización" className="flex gap-2 overflow-x-auto no-scrollbar touch-pan-x">
        {sections.map((section) => (
          <NavLink
            key={section.to}
            to={section.to}
            end={section.end}
            className={({ isActive }) =>
              cn(
                'inline-flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-surface text-muted-foreground hover:bg-surface-hover',
              )
            }
          >
            {section.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}

/** El super-admin empieza por la lista; un administrador solo tiene su organización. */
export function OrganizationSettingsIndex() {
  const isSuperAdmin = useIsSuperAdmin()
  return isSuperAdmin ? <OrganizationsPage /> : <Navigate to={`${BASE_PATH}/whatsapp`} replace />
}
