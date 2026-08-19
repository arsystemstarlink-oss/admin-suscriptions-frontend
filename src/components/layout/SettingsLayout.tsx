import { useMemo } from 'react'
import { Outlet } from 'react-router-dom'
import { PageSubNav, type PageSubNavTab } from '@/components/layout/PageSubNav'
import { ClipboardList, User, UserPlus, Bell, Building2 } from 'lucide-react'
import { useIsSuperAdmin } from '@/stores/auth.store'

export function SettingsLayout() {
  const isSuperAdmin = useIsSuperAdmin()

  const tabs = useMemo<PageSubNavTab[]>(() => {
    const base: PageSubNavTab[] = [
      {
        to: '/config',
        icon: ClipboardList,
        label: 'Ejecutador',
        title: 'Ejecutador de Tareas',
        subtitle: 'Gestiona el sistema y tareas automáticas',
        end: true,
      },
      {
        to: '/config/admins',
        icon: UserPlus,
        label: 'Admins',
        title: 'Admins',
        subtitle: 'Creación de administradores adicionales',
        end: false,
      },
    ]

    if (isSuperAdmin) {
      base.push({
        to: '/config/organizations',
        icon: Building2,
        label: 'Organizaciones',
        title: 'Organizaciones',
        subtitle: 'Gestiona las organizaciones del sistema',
        end: false,
      })
    }

    base.push(
      {
        to: '/config/notifications',
        icon: Bell,
        label: 'Notificaciones',
        title: 'Notificaciones',
        subtitle: 'Recibe alertas en tu dispositivo',
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
    )

    return base
  }, [isSuperAdmin])

  return (
    <div className="space-y-4 md:space-y-6">
      <PageSubNav tabs={tabs} />
      <Outlet />
    </div>
  )
}
