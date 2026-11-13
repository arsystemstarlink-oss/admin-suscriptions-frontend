import { useMemo } from 'react'
import { Outlet } from 'react-router-dom'
import { PageSubNav, type PageSubNavTab } from '@/components/layout/PageSubNav'
import { MessagesSquare, User, UserPlus, Building2 } from 'lucide-react'
import { useIsSuperAdmin } from '@/stores/auth.store'

// Etiquetas de una sola palabra: en móvil la barra no tiene sitio para dos.
export function SettingsLayout() {
  const isSuperAdmin = useIsSuperAdmin()

  const tabs = useMemo<PageSubNavTab[]>(() => {
    const profile: PageSubNavTab = {
      to: '/config/profile',
      icon: User,
      label: 'Perfil',
      title: 'Perfil',
      subtitle: 'Información de tu cuenta de administrador',
      end: false,
    }

    if (isSuperAdmin) {
      return [
        profile,
        {
          to: '/config/organization',
          icon: Building2,
          label: 'Organizaciones',
          title: 'Organizaciones',
          subtitle: 'Las organizaciones del sistema, sus avisos por WhatsApp y sus tareas automáticas',
          end: false,
        },
        {
          to: '/config/platform-whatsapp',
          icon: MessagesSquare,
          label: 'Plataforma',
          title: 'WhatsApp de la plataforma',
          subtitle: 'La cuenta que envía por las organizaciones sin número propio',
          end: false,
        },
      ]
    }

    return [
      profile,
      {
        to: '/config/organization',
        icon: Building2,
        label: 'Organización',
        title: 'Organización',
        subtitle: 'Avisos por WhatsApp y tareas automáticas de tu organización',
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
    ]
  }, [isSuperAdmin])

  return (
    <div className="space-y-2 sm:space-y-4 md:space-y-6">
      <PageSubNav tabs={tabs} />
      <Outlet />
    </div>
  )
}
